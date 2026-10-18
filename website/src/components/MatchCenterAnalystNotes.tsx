import { useEffect, useMemo, useRef, useState } from 'react';
import {
  describeEvent,
  eventKey,
  eventTypeName,
  formatInZone,
  renderableEvents,
} from '../lib/match-center.mjs';
import {
  ANALYST_NOTE_MAX_NOTES,
  ANALYST_NOTE_TAGS,
  ANALYST_NOTE_TEXT_LIMIT,
  analystExportFilename,
  analystNoteMinuteLabel,
  buildMatchExport,
  describeAnalystNoteAnchor,
  draftAnalystNote,
  exportToJsonText,
  readAnalystNotes,
  removeAnalystNote,
  sortAnalystNotes,
  upsertAnalystNote,
  writeAnalystNotes,
  type AnalystNote,
} from '../lib/analyst-notes.mjs';
import type { PanelProps } from './MatchCenterPanels';

/* ==========================================================================
   دفتر ملاحظات المحلل — بلا خدمة خلفية، وبلا مصدر بيانات جديد
   --------------------------------------------------------------------------
   • الملاحظات في `localStorage` مفتاحه معرّف المباراة: لا حساب ولا مزامنة ولا
     إرسال إلى أي مكان. تُقال هذه الحقيقة في الواجهة، لا في التوثيق وحده.
   • المحلل يكتب ويختار الربط: حدث من أحداث المصدر (فتُؤخذ الدقيقة منه لا من
     تقديرنا) أو دقيقة يكتبها. لا «حدث في الدقيقة 60» لم يرسله المصدر.
   • التصدير نسخةٌ مما يُعرض: ملاحظات + أرقام المصدر كما وصلت، مع سجلّ بما لم
     يصل. والطباعة/PDF من المتصفح نفسه — لا مكتبة تحويل ولا اعتمادية جديدة.
   • قبل أول قراءة من التخزين لا تُكتب القائمة: وإلا مَسحَ رسمُ الصفحة
     الابتدائي (قائمة فارغة) ملاحظاتٍ محفوظة على الجهاز.
========================================================================== */

type AnchorMode = 'none' | 'event' | 'minute';

function cleanText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function noteTimeLabel(iso: string | null): string | null {
  const value = cleanText(iso);
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  try {
    return formatInZone(value, 'Africa/Cairo', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    });
  } catch {
    return null;
  }
}

const STORAGE_MESSAGES: Record<string, string> = {
  ok: 'محفوظة في هذا المتصفح على هذا الجهاز فقط — لا تُرسل إلى أي خادم ولا تُشارك مع جهاز آخر.',
  unavailable: 'لا يتيح هذا المتصفح التخزين المحلي (تصفح خاص أو مساحة محظورة): الملاحظات تعمل في هذه الجلسة فقط ولن تُحفظ بعدها.',
  unreadable: 'وُجدت بيانات سابقة لا يمكن قراءتها في هذا المتصفح، فتُركت كما هي ولم تُمسح. الملاحظات الجديدة تُحفظ فوق قائمة جديدة.',
  unwritable: 'تعذّرت الكتابة — حصة التخزين ممتلئة أو الحفظ محظور. الملاحظات باقية في هذه الجلسة، نزّلها من زرّ التصدير قبل الإغلاق.',
};

export default function MatchCenterAnalystNotes({ match, snapshot, tools, freshnessText }: PanelProps) {
  const events = useMemo(() => renderableEvents(snapshot?.events ?? null), [snapshot]);
  const homeName = cleanText(match.home.name) ?? cleanText(match.home.sourceName) ?? 'المضيف';
  const awayName = cleanText(match.away.name) ?? cleanText(match.away.sourceName) ?? 'الضيف';

  const [notes, setNotes] = useState<AnalystNote[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storageStatus, setStorageStatus] = useState<keyof typeof STORAGE_MESSAGES>('ok');
  const [text, setText] = useState('');
  const [anchor, setAnchor] = useState<AnchorMode>('none');
  const [linkedEventKey, setLinkedEventKey] = useState('');
  const [minute, setMinute] = useState('');
  const [extraMinute, setExtraMinute] = useState('');
  const [teamSide, setTeamSide] = useState<'' | 'home' | 'away'>('');
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'minute'>('newest');
  const formRef = useRef<HTMLTextAreaElement>(null);

  /* ── الحِمل والحفظ لكل مباراة على حدة ── */
  useEffect(() => {
    const result = readAnalystNotes(match.id);
    setNotes(result.notes);
    setEditingId(null);
    setStorageStatus(result.status === 'unavailable' ? 'unavailable' : result.status === 'unreadable' ? 'unreadable' : 'ok');
    setLoaded(true);
  }, [match.id]);

  useEffect(() => {
    if (!loaded) return;
    const result = writeAnalystNotes(match.id, notes);
    if (!result.ok && storageStatus !== 'unavailable') setStorageStatus('unwritable');
    else if (result.ok && storageStatus === 'unwritable') setStorageStatus('ok');
  }, [loaded, match.id, notes, storageStatus]);

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(null), 9_000);
    return () => window.clearTimeout(timer);
  }, [status]);

  /* ── «ملاحظة بهذا الحدث» من قسم التحليل ── */
  const draft = tools?.noteDraft ?? null;
  useEffect(() => {
    if (!draft) return;
    const event = draft.event;
    if (event) {
      setAnchor('event');
      setLinkedEventKey(eventKey(match.id, event));
    }
    setEditingId(null);
    formRef.current?.focus();
    tools?.clearNoteDraft();
  }, [draft, match.id, tools]);

  const linkedEvent = useMemo(
    () => (anchor === 'event' ? events.find(event => eventKey(match.id, event) === linkedEventKey) ?? null : null),
    [anchor, events, linkedEventKey, match.id],
  );
  const usedTags = useMemo(() => {
    const seen = new Map<string, string>();
    for (const tag of [...ANALYST_NOTE_TAGS, ...notes.flatMap(note => note.tags)]) {
      if (!seen.has(tag.toLowerCase())) seen.set(tag.toLowerCase(), tag);
    }
    return [...seen.values()];
  }, [notes]);

  const ordered = useMemo(() => sortAnalystNotes(notes, sortBy), [notes, sortBy]);

  const resetForm = () => {
    setText('');
    setAnchor('none');
    setLinkedEventKey('');
    setMinute('');
    setExtraMinute('');
    setTeamSide('');
    setTags([]);
    setCustomTag('');
    setEditingId(null);
    setErrors({});
  };

  const save = () => {
    const editing = editingId ? notes.find(note => note.id === editingId) ?? null : null;
    const result = draftAnalystNote({
      matchId: match.id,
      text,
      tags,
      anchor,
      event: linkedEvent,
      /* ملاحظة كانت مرتبطة بحدث خرج من القراءة التالية: يُعاد استخدام ربطها
         المحفوظ بدل أن يتعذّر تعديل نصها. */
      previousAnchor: editing,
      minute: anchor === 'minute' ? minute : '',
      extraMinute: anchor === 'minute' ? extraMinute : '',
      teamSide: anchor === 'minute' && teamSide ? teamSide : null,
      id: editing?.id ?? null,
      createdAt: editing?.createdAt ?? null,
    }, { at: Date.now() });

    if (!result.ok || !result.note) {
      setErrors(result.errors);
      setStatus(null);
      return;
    }
    if (!editing && notes.length >= ANALYST_NOTE_MAX_NOTES) {
      setErrors({});
      setStatus(`بلغت الحد الأقصى (${ANALYST_NOTE_MAX_NOTES} ملاحظة لهذه المباراة) — احذف ملاحظة أو نزّلها ثم أعد المحاولة.`);
      return;
    }
    setNotes(current => upsertAnalystNote(current, result.note));
    setErrors({});
    setStatus(editing ? 'حُدِّثت الملاحظة في هذا المتصفح.' : 'حُفظت الملاحظة في هذا المتصفح على هذا الجهاز.');
    resetForm();
  };

  const edit = (note: AnalystNote) => {
    setEditingId(note.id);
    setText(note.text);
    setAnchor(note.anchor);
    setLinkedEventKey(note.eventKey ?? '');
    setMinute(note.minute === null ? '' : String(note.minute));
    setExtraMinute(note.extraMinute === null ? '' : String(note.extraMinute));
    setTeamSide(note.teamSide ?? '');
    setTags(note.tags);
    setErrors({});
    formRef.current?.focus();
  };

  const drop = (note: AnalystNote) => {
    setNotes(current => removeAnalystNote(current, note.id));
    if (editingId === note.id) resetForm();
    setStatus('حُذفت الملاحظة من هذا المتصفح.');
  };

  const download = () => {
    const payload = buildMatchExport({
      match,
      snapshot,
      notes,
      freshnessText: freshnessText ?? null,
      at: Date.now(),
    });
    try {
      const blob = new Blob([exportToJsonText(payload)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = analystExportFilename(match.id, Date.now());
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4_000);
      setStatus(`نُزِّل ملف التصدير (${notes.length} ملاحظة، ${payload.events.count} حدثاً من المصدر).`);
    } catch {
      /* متصفح بلا `URL.createObjectURL` أو تنزيل محظور: لا نُدّعي نجاحاً. */
      setStatus('تعذّر التنزيل في هذا المتصفح. استخدم الطباعة أو حفظ PDF لنسخة مقروءة.');
    }
  };

  const print = () => {
    try {
      window.print();
      setStatus('نسخة الطباعة تعرض أقسام مركز المباراة المتاحة، بما فيها هذه الملاحظات.');
    } catch {
      setStatus('تعذّر فتح نافذة الطباعة من هذا المتصفح — استخدم قائمة الطباعة لديه مباشرة.');
    }
  };

  return (
    <div className="mc-notebook">
      <h2>دفتر ملاحظات المحلل</h2>
      <p>
        ملاحظاتك أنت، لا تحليلًا مولَّدًا: اكتب واقعة أو ملاحظة تربطها بحدث من أحداث المباراة أو بدقيقة تختارها.
        {notes.length > 0
          ? <> عدد ما حفظته هنا: <span className="mc-num">{new Intl.NumberFormat('ar-EG').format(notes.length)}</span>.</>
          : <> لا ملاحظات محفوظة بعد في هذا المتصفح.</>}
      </p>

      <p className="mc-notebook-storage" data-status={storageStatus}>{STORAGE_MESSAGES[storageStatus]}</p>

      <form
        className="mc-note-form"
        noValidate
        onSubmit={event => { event.preventDefault(); save(); }}
      >
        <label className="mc-note-field">
          <span className="mc-note-field-label">{editingId ? 'تعديل الملاحظة' : 'نص الملاحظة'}</span>
          <textarea
            id="mc-note-text"
            ref={formRef}
            className="mc-note-textarea"
            rows={3}
            maxLength={ANALYST_NOTE_TEXT_LIMIT}
            value={text}
            onChange={event => setText(event.target.value)}
            placeholder="مثال: خروج الظهير الأيسر ترك مساحة على الجهة اليمنى للخصم."
          />
          <small className="mc-note-counter mc-num">
            {new Intl.NumberFormat('ar-EG').format(text.length)} / {new Intl.NumberFormat('ar-EG').format(ANALYST_NOTE_TEXT_LIMIT)}
          </small>
        </label>
        {errors.text && <p className="mc-note-error" role="alert">{errors.text}</p>}

        <fieldset className="mc-note-anchor">
          <legend>ربط الملاحظة</legend>
          <label><input type="radio" name="mc-note-anchor" value="none" checked={anchor === 'none'} onChange={() => setAnchor('none')} /> <span>بلا ربط</span></label>
          <label>
            <input
              type="radio" name="mc-note-anchor" value="event" checked={anchor === 'event'} disabled={events.length === 0}
              onChange={() => {
                setAnchor('event');
                setMinute('');
                setExtraMinute('');
                if (!linkedEventKey && events.length > 0) setLinkedEventKey(eventKey(match.id, events[events.length - 1]));
              }}
            />
            <span>حدث من المصدر{events.length === 0 ? ' (لم تصل أحداث بعد)' : ''}</span>
          </label>
          <label><input type="radio" name="mc-note-anchor" value="minute" checked={anchor === 'minute'} onChange={() => setAnchor('minute')} /> <span>دقيقة أختارها</span></label>
        </fieldset>

        {anchor === 'event' && (
          <label className="mc-note-field">
            <span className="mc-note-field-label">الحدث المرتبط</span>
            <select
              id="mc-note-event"
              className="mc-note-select"
              value={linkedEventKey}
              onChange={event => {
                setLinkedEventKey(event.target.value);
                const found = events.find(item => eventKey(match.id, item) === event.target.value) ?? null;
                const foundMinute = found && typeof found.minute === 'number' ? String(found.minute) : '';
                setMinute(foundMinute);
                setExtraMinute(found && typeof found.extraMinute === 'number' ? String(found.extraMinute) : '');
                setTeamSide(found?.teamSide === 'home' || found?.teamSide === 'away' ? found.teamSide : '');
              }}
            >
              <option value="">— اختر حدثاً —</option>
              {events.map((event, index) => (
                <option key={event.id ?? `option-${index}`} value={eventKey(match.id, event)}>
                  {describeEvent(event) ?? eventTypeName(event, 'حدث من المصدر')}
                </option>
              ))}
            </select>
            {linkedEvent && (
              <p className="mc-note-linked-hint">
                الدقيقة مأخوذة من الحدث نفسه:
                <span className="mc-num" dir="ltr"> {analystNoteMinuteLabel({ minute: linkedEvent.minute, extraMinute: linkedEvent.extraMinute }) ?? 'لا دقيقة لهذا الحدث'}</span>
              </p>
            )}
          </label>
        )}

        {anchor === 'minute' && (
          <div className="mc-note-minute-row">
            <label className="mc-note-field mc-note-field--narrow">
              <span className="mc-note-field-label">الدقيقة</span>
              <input id="mc-note-minute" className="mc-note-input mc-num" type="number" min={0} max={240} inputMode="numeric" value={minute} onChange={event => setMinute(event.target.value)} />
            </label>
            <label className="mc-note-field mc-note-field--narrow">
              <span className="mc-note-field-label">بدل ضائع</span>
              <input id="mc-note-extra" className="mc-note-input mc-num" type="number" min={0} max={15} inputMode="numeric" value={extraMinute} onChange={event => setExtraMinute(event.target.value)} />
            </label>
            <label className="mc-note-field mc-note-field--narrow">
              <span className="mc-note-field-label">الطرف</span>
              <select id="mc-note-side" className="mc-note-select" value={teamSide} onChange={event => setTeamSide(event.target.value as '' | 'home' | 'away')}>
                <option value="">بدون طرف</option>
                <option value="home">{homeName}</option>
                <option value="away">{awayName}</option>
              </select>
            </label>
          </div>
        )}
        {errors.minute && <p className="mc-note-error" role="alert">{errors.minute}</p>}
        {errors.anchor && <p className="mc-note-error" role="alert">{errors.anchor}</p>}

        <div className="mc-note-tags">
          <span className="mc-note-field-label">تصنيفات (اختيارية)</span>
          <div className="mc-note-tag-chips">
            {usedTags.map(tag => {
              const chosen = tags.some(item => item.toLowerCase() === tag.toLowerCase());
              return (
                <button
                  type="button"
                  key={tag}
                  className="mc-note-tag"
                  aria-pressed={chosen}
                  onClick={() => setTags(current => chosen ? current.filter(item => item.toLowerCase() !== tag.toLowerCase()) : current.length >= 6 ? current : [...current, tag])}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          <div className="mc-note-tag-add">
            <input
              className="mc-note-input"
              type="text"
              maxLength={24}
              value={customTag}
              onChange={event => setCustomTag(event.target.value)}
              placeholder="تصنيف من عندك"
              aria-label="تصنيف جديد يكتبه المحلل"
            />
            <button
              type="button"
              className="mc-inline-button"
              onClick={() => {
                const tag = cleanText(customTag);
                if (!tag) return;
                setTags(current => (current.some(item => item.toLowerCase() === tag.toLowerCase()) || current.length >= 6) ? current : [...current, tag]);
                setCustomTag('');
              }}
            >
              إضافة
            </button>
          </div>
          {tags.length > 0 && (
            <p className="mc-note-tag-selected">
              المختارة: {tags.join('، ')}
            </p>
          )}
        </div>

        <div className="mc-note-actions">
          <button type="submit" className="mc-note-submit">{editingId ? 'حفظ التعديل' : 'حفظ الملاحظة'}</button>
          {editingId && <button type="button" className="mc-inline-button" onClick={resetForm}>إلغاء التعديل</button>}
        </div>
      </form>

      <p className="mc-note-status" role="status">{status}</p>

      <div className="mc-note-toolbar">
        <div className="mc-note-sort" role="group" aria-label="ترتيب الملاحظات">
          <button type="button" className="mc-inline-button" aria-pressed={sortBy === 'newest'} onClick={() => setSortBy('newest')}>الأحدث أولاً</button>
          <button type="button" className="mc-inline-button" aria-pressed={sortBy === 'minute'} onClick={() => setSortBy('minute')}>حسب الدقيقة</button>
        </div>
        <div className="mc-note-export">
          <button type="button" className="mc-inline-button" onClick={download}>تصدير الملاحظات والبيانات (JSON)</button>
          <button type="button" className="mc-inline-button" onClick={print}>طباعة أو حفظ PDF</button>
        </div>
      </div>

      {ordered.length === 0 ? (
        <p className="mc-note-empty">
          لا ملاحظات في هذا المتصفح لهذه المباراة. تُحفظ الملاحظات لكل مباراة على حدة وتبقى بعده بعد إعادة الفتح إن أتاح المتصفح التخزين.
        </p>
      ) : (
        <ol className="mc-note-list">
          {ordered.map(note => {
            const anchorText = describeAnalystNoteAnchor(note, { homeName, awayName });
            const updated = noteTimeLabel(note.updatedAt ?? note.createdAt);
            const created = noteTimeLabel(note.createdAt);
            return (
              <li className="mc-note-item" key={note.id} data-editing={editingId === note.id ? 'true' : 'false'}>
                <p className="mc-note-item-text">{note.text}</p>
                <p className="mc-note-item-meta">
                  {anchorText && <span className="mc-note-item-anchor">{anchorText}</span>}
                  {note.tags.map(tag => <span className="mc-note-item-tag" key={tag}>{tag}</span>)}
                  <span className="mc-note-item-time">{updated ? `آخر تعديل ${updated} بتوقيت القاهرة` : 'بلا وقت محفوظ'}</span>
                  {created && created !== updated && <span className="mc-note-item-time">كُتبت {created} بتوقيت القاهرة</span>}
                </p>
                <span className="mc-note-item-controls">
                  <button type="button" className="mc-inline-button" onClick={() => edit(note)} aria-label={`تعديل الملاحظة: ${note.text.slice(0, 40)}`}>تعديل</button>
                  <button type="button" className="mc-inline-button mc-inline-button--danger" onClick={() => drop(note)} aria-label={`حذف الملاحظة: ${note.text.slice(0, 40)}`}>حذف</button>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <p className="mc-note">
        التصدير نسخةٌ من الملاحظات ومن أرقام المباراة التي وصلت فعلاً؛ القيم التي لا يرسلها المصدر تبقى معلومة الغياب في الملف ولا تُستكمل أصفاراً.
        الطباعة أو «حفظ PDF» تُخرجان من المتصفح نفسه بلا إضافة أي مكتبة.
      </p>
    </div>
  );
}
