/* ==========================================================================
   دفتر ملاحظات المحلل — منطق خالص بلا خدمة خلفية
   --------------------------------------------------------------------------
   قرار التصميم الأول: **لا طلب شبكة ولا مصدر بيانات جديد**. الملاحظات ملك
   المحلل وحده، فتُحفظ في `localStorage` لهذا الجهاز ومتصفحه، ومفتاحها معرّف
   المباراة فلا تُخلط بين مباراتين. لا حساب، ولا مزامنة، ولا ادعاء بأنها
   وصلت إلى أحد.

   قرار التصميم الثاني: **الملاحظة لا تخترع مرسلاً إليه**. تُربط بحدث من أحداث
   المصدر (فيأخذ وقتَه من الحدث نفسه) أو بدقيقة يكتبها المحلل. لا دقيقة مُقدَّرة
   لحدث بلا دقيقة، ولا «مرتبطة بلقطة» لا وجود لها في البيانات.

   قرار التصميم الثالث: **الفهرس المُصدَّر أمين مثل العرض**. القيم التي لا
   يرسلها وسيط الموقع تبقى `null` صراحةً في الملف — لا تُحذف فيُظنّ أنها صفر،
   ولا تُختلق ليُظنّ أنها قياس.
   --------------------------------------------------------------------------
   كل دالة هنا نقية ما لم تعلن صراحةً أنها تلمس التخزين؛ فتُختبر في Node على
   مخزن وهمي بنفس العقد، بلا jsdom ولا اعتمادية جديدة.
========================================================================== */

/** بادئة المفتاح: تُبقي ملاحظات كل مباراة في حيزها الخاص. */
export const ANALYST_NOTE_STORAGE_PREFIX = 'sm-analyst-notes:';

/** تصنيفات مقترحة، لا مُلزمة: يختار المحلل منها أو يكتب ما يشاء. */
export const ANALYST_NOTE_TAGS = ['تحول سريع', 'كرة ثابتة', 'ضغط'];

export const ANALYST_NOTE_TEXT_LIMIT = 1200;
export const ANALYST_NOTE_TAG_CHAR_LIMIT = 24;
export const ANALYST_NOTE_MAX_TAGS = 6;
export const ANALYST_NOTE_MAX_NOTES = 200;
/** سقف معقول للدقيقة: الوقت الإضافي وركلات الترجيح لا تتجاوز 240′. */
export const ANALYST_NOTE_MINUTE_MAX = 240;
export const ANALYST_NOTE_EXTRA_MAX = 15;

export const ANALYST_NOTE_ANCHORS = { event: 'حدث من المصدر', minute: 'دقيقة مختارة', none: 'بلا ربط' };

/** أقصى عدد يُصدَّر من الأحداث في الملف — لا بتر عشوائي: الأحدث أولاً. */
export const ANALYST_EXPORT_EVENT_LIMIT = 400;

function filledText(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function wholeNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

function isoNow(at) {
  const millis = Number.isFinite(at) ? at : Date.now();
  return new Date(millis).toISOString();
}

/* ───────────────────────── بصمة الملاحظة وربطها ───────────────────────── */

/**
 * معرّف ثابت لملاحظة جديدة.
 *
 * لا `crypto.randomUUID()` مباشرة: بيئة النص (Node القديم، متصفح بلا سياق
 * آمن) قد لا تملكه، والسقوط إلى بصمة زمنية أفضل من إهدار ملاحظة كتبها المحلل.
 */
export function analystNoteId(seed = null, at = null) {
  const random = globalThis.crypto?.randomUUID?.();
  if (typeof random === 'string' && random.trim() !== '') return `n-${random}`;
  const stamp = Number.isFinite(at) ? at : Date.now();
  const entropy = Math.random().toString(36).slice(2, 8);
  return `n-${stamp.toString(36)}-${entropy}${seed ? `-${String(seed).slice(0, 8)}` : ''}`;
}

/**
 * حدث المصدر في صيغة قابلة للحفظ: تُخزَّن بصمة الحدث ومعرّفه ووصفه، ولا تُخزَّن
 * نسخة كاملة منه — فتبقى الملاحظة مرتبطة بما رآه المحلل فعلاً حتى لو تغيّرت
 * القراءة التالية.
 */
export function noteAnchorFromEvent(event, matchId = '') {
  if (!event || typeof event !== 'object') return null;
  const minute = typeof event.minute === 'number' && Number.isFinite(event.minute) && event.minute >= 0 ? event.minute : null;
  const extraMinute = typeof event.extraMinute === 'number' && Number.isFinite(event.extraMinute) && event.extraMinute >= 0 ? event.extraMinute : null;
  const side = event.teamSide === 'home' || event.teamSide === 'away' ? event.teamSide : null;
  const type = filledText(event.type) ?? 'other';
  const sourceType = filledText(event.sourceType);
  const label = [
    minute === null ? null : `${minute}${extraMinute === null ? '' : `+${extraMinute}`}′`,
    EVENT_LABEL_HINTS[type] ?? sourceType ?? null,
    filledText(event.player?.name),
    side === 'home' ? 'المضيف' : side === 'away' ? 'الضيف' : null,
  ].filter(Boolean).join(' · ') || (sourceType ? `حدث: ${sourceType}` : 'حدث من المصدر');
  const id = filledText(event.id);
  const fingerprint = [type, minute ?? '-', extraMinute ?? '-', filledText(event.player?.id) ?? filledText(event.player?.name) ?? '-'].join(':');
  return {
    eventId: id,
    eventKey: id !== null ? `${matchId}:${id}` : `${matchId}:${fingerprint}`,
    eventLabel: label,
    minute,
    extraMinute,
    teamSide: side,
  };
}

/* تسمية سريعة تُخزَّن مع الملاحظة، منفصلة عن تسميات الواجهة حتى تبقى
   الم القراءة صحيحة بعد أعوام لو تغيّرت نصوص المركز. */
const EVENT_LABEL_HINTS = {
  goal: 'هدف',
  penalty: 'ركلة جزاء',
  own_goal: 'هدف عكسي',
  missed_penalty: 'ركلة جزاء مهدرة',
  yellow_card: 'بطاقة صفراء',
  red_card: 'بطاقة حمراء',
  substitution: 'تبديل',
  var_cancelled: 'إلغاء بعد الفيديو',
  var_confirmed: 'تأكيد بعد الفيديو',
};

/** ربط محفوظ من ملاحظة سابقة أو من التخزين — بنفس شكل `noteAnchorFromEvent`. */
export function noteAnchorFromStored(source) {
  if (!source || typeof source !== 'object') return null;
  const eventKey = filledText(source.eventKey);
  const eventLabel = filledText(source.eventLabel);
  if (!eventKey && !eventLabel) return null;
  const minute = wholeNumber(source.minute);
  const extraMinute = wholeNumber(source.extraMinute);
  return {
    eventId: filledText(source.eventId),
    eventKey: eventKey ?? '',
    eventLabel: eventLabel ?? 'حدث من المصدر',
    minute: minute !== null && minute >= 0 ? minute : null,
    extraMinute: extraMinute !== null && extraMinute >= 0 ? extraMinute : null,
    teamSide: source.teamSide === 'home' || source.teamSide === 'away' ? source.teamSide : null,
  };
}

/* ───────────────────────────────── إنشاء الملاحظة ───────────────────────── */

/**
 * نص التصنيفات: مصفوفة نصوص نظيفة، فريدة، بلا تكرار وبقدر محدود.
 * تُقبل كتابتها حرةً — الاقتراحات في الواجهة تسهيلات لا قائمة مغلقة.
 */
export function normalizeAnalystTags(value) {
  const list = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[,،;؛]/) : [];
  const seen = [];
  for (const item of list) {
    const tag = filledText(item);
    if (!tag) continue;
    const clipped = tag.length > ANALYST_NOTE_TAG_CHAR_LIMIT ? tag.slice(0, ANALYST_NOTE_TAG_CHAR_LIMIT) : tag;
    if (!seen.some(existing => existing.toLowerCase() === clipped.toLowerCase())) seen.push(clipped);
    if (seen.length >= ANALYST_NOTE_MAX_TAGS) break;
  }
  return seen;
}

/** هل النص قابل للحفظ؟ الطول الزائد خطأ يُقال للمحلل، لا بتر صامت لفكرة كتبها. */
export function validateAnalystNote(input = {}) {
  const errors = {};
  const text = filledText(input.text);
  if (!text) errors.text = 'اكتب نص الملاحظة أولاً.';
  else if (text.length > ANALYST_NOTE_TEXT_LIMIT) {
    errors.text = `الملاحظة أطول من ${ANALYST_NOTE_TEXT_LIMIT} حرفاً؛ اختصرها لتُحفظ كاملة.`;
  }

  if (input.anchor === 'minute') {
    const minute = wholeNumber(input.minute);
    if (minute === null) errors.minute = 'أدخل رقم الدقيقة، أو اختر ربطاً بحدث من المصدر.';
    else if (minute < 0 || minute > ANALYST_NOTE_MINUTE_MAX) errors.minute = `الدقيقة بين 0 و${ANALYST_NOTE_MINUTE_MAX}.`;
    const extra = input.extraMinute === undefined || input.extraMinute === null || input.extraMinute === '' ? null : wholeNumber(input.extraMinute);
    if (extra !== null && (extra < 0 || extra > ANALYST_NOTE_EXTRA_MAX)) errors.minute = `الدقيقة الإضافية بين 0 و${ANALYST_NOTE_EXTRA_MAX}.`;
  }

  return { ok: Object.keys(errors).length === 0, errors, text, minute: null };
}

/**
 * ملاحظة نظيفة من مُدخلات المحلل. تُرجع `{ ok, errors, note }` — لا ترمي
 * استثناءً ولا تُصلح الخطأ بصمت: من يكتب دقيقة 400 يجب أن يُسأل عنها، لا أن
 * تُخزَّن 240 أو تُحذف.
 */
export function draftAnalystNote(input = {}, { id = null, at = null } = {}) {
  const check = validateAnalystNote(input);
  if (!check.ok) return { ok: false, errors: check.errors, note: null };

  const anchor = input.anchor === 'event' ? 'event' : input.anchor === 'minute' ? 'minute' : 'none';
  /* الربط من الحدث الحيّ أولاً؛ وإن خرج الحدث من القراءة الحالية يُعاد الربط
     المحفوظ للملاحظة نفسها — لا يُترَك المحلل عاجزاً عن تصحيح نص ملاحظته،
     ولا يُخمَّن حدثٌ لم يعد موجوداً. */
  const event = anchor === 'event' ? (noteAnchorFromEvent(input.event, input.matchId ?? '') ?? noteAnchorFromStored(input.previousAnchor)) : null;
  if (anchor === 'event' && !event) {
    return { ok: false, errors: { anchor: 'اختر حدثاً من الأحداث الواردة، أو بدّل الربط إلى دقيقة.' }, note: null };
  }

  const minute = anchor === 'event'
    ? event.minute
    : anchor === 'minute' ? wholeNumber(input.minute) : null;
  const extraMinute = anchor === 'event'
    ? event.extraMinute
    : anchor === 'minute'
      ? (input.extraMinute === undefined || input.extraMinute === null || input.extraMinute === '' ? null : wholeNumber(input.extraMinute))
      : null;
  const teamSide = anchor === 'event'
    ? event.teamSide
    : (input.teamSide === 'home' || input.teamSide === 'away' ? input.teamSide : null);

  const stamp = isoNow(at);
  return {
    ok: true,
    errors: {},
    note: {
      id: filledText(id) ?? filledText(input.id) ?? analystNoteId(check.text, at),
      matchId: filledText(input.matchId) ?? '',
      text: check.text,
      tags: normalizeAnalystTags(input.tags),
      anchor: anchor === 'event' ? 'event' : anchor === 'minute' ? 'minute' : 'none',
      eventId: anchor === 'event' ? event.eventId : null,
      eventKey: anchor === 'event' ? event.eventKey : null,
      eventLabel: anchor === 'event' ? event.eventLabel : null,
      minute,
      extraMinute,
      teamSide,
      createdAt: filledText(input.createdAt) ?? stamp,
      updatedAt: stamp,
    },
  };
}

/** ملاحظة محفوظة تُقرأ من التخزين — تُقبل فقط ما مرّ بنفس الفحص. */
export function normalizeAnalystNote(raw, matchId = '') {
  if (!raw || typeof raw !== 'object') return null;
  const text = filledText(raw.text);
  if (!text || text.length > ANALYST_NOTE_TEXT_LIMIT) return null;
  const anchor = raw.anchor === 'event' || raw.anchor === 'minute' ? raw.anchor : 'none';
  const minute = wholeNumber(raw.minute);
  const extraMinute = wholeNumber(raw.extraMinute);
  return {
    id: filledText(raw.id) ?? analystNoteId(text, null),
    matchId: filledText(raw.matchId) ?? filledText(matchId) ?? '',
    text,
    tags: normalizeAnalystTags(raw.tags),
    anchor,
    eventId: filledText(raw.eventId),
    eventKey: filledText(raw.eventKey),
    eventLabel: filledText(raw.eventLabel),
    minute: minute !== null && minute >= 0 && minute <= ANALYST_NOTE_MINUTE_MAX ? minute : null,
    extraMinute: extraMinute !== null && extraMinute >= 0 && extraMinute <= ANALYST_NOTE_EXTRA_MAX ? extraMinute : null,
    teamSide: raw.teamSide === 'home' || raw.teamSide === 'away' ? raw.teamSide : null,
    createdAt: filledText(raw.createdAt) ?? null,
    updatedAt: filledText(raw.updatedAt) ?? null,
  };
}

/* ────────────────────────── عمليات على القائمة ────────────────────────── */

export function upsertAnalystNote(notes, note) {
  const list = Array.isArray(notes) ? notes : [];
  if (!note) return list;
  const index = list.findIndex(item => item?.id === note.id);
  if (index === -1) return [note, ...list].slice(0, ANALYST_NOTE_MAX_NOTES);
  const next = list.slice();
  next[index] = note;
  return next;
}

export function removeAnalystNote(notes, id) {
  const list = Array.isArray(notes) ? notes : [];
  return list.filter(item => item?.id !== id);
}

/** أحدث المعدَّلة أولاً — وهو الترتيب الذي يريد المحلل أن يراه عند العودة. */
export function sortAnalystNotes(notes, mode = 'newest') {
  const list = (Array.isArray(notes) ? notes : []).slice();
  const stamp = note => Date.parse(note?.updatedAt ?? note?.createdAt ?? '') || 0;
  if (mode === 'minute') {
    return list.sort((a, b) => {
      const aMinute = typeof a?.minute === 'number' ? a.minute : Number.POSITIVE_INFINITY;
      const bMinute = typeof b?.minute === 'number' ? b.minute : Number.POSITIVE_INFINITY;
      if (aMinute !== bMinute) return aMinute - bMinute;
      return stamp(b) - stamp(a);
    });
  }
  return list.sort((a, b) => stamp(b) - stamp(a));
}

/** ملاحظات مرتبطة بدقيقة أو حدث داخل نافذة دقيقة واحدة — للسياق حول الشريط. */
export function analystNotesNearMinute(notes, minute, window = 5) {
  const list = Array.isArray(notes) ? notes : [];
  const wanted = wholeNumber(minute);
  if (wanted === null) return [];
  return list.filter(note => typeof note?.minute === 'number' && Math.abs(note.minute - wanted) <= Math.abs(window));
}

export function countAnalystNotes(notes) {
  return Array.isArray(notes) ? notes.length : 0;
}

/** الدقيقة المعروضة للملاحظة أو للحدث: لا «0′» لملاحظة بلا دقيقة. */
export function analystNoteMinuteLabel(note) {
  const minute = typeof note?.minute === 'number' && Number.isFinite(note.minute) && note.minute >= 0 ? note.minute : null;
  if (minute === null) return null;
  const extra = typeof note?.extraMinute === 'number' && Number.isFinite(note.extraMinute) && note.extraMinute >= 0 ? `+${note.extraMinute}` : '';
  return `${minute}${extra}′`;
}

/** وصف موضع الملاحظة كما يُعرض ويُطبع. */
export function describeAnalystNoteAnchor(note, { homeName = null, awayName = null } = {}) {
  const side = note?.teamSide === 'home'
    ? homeName || 'المضيف'
    : note?.teamSide === 'away' ? awayName || 'الضيف' : null;
  const minute = analystNoteMinuteLabel(note);
  if (note?.anchor === 'event') {
    const label = filledText(note.eventLabel);
    /* الوصف المخزَّن مع الملاحظة أصلٌ يُقرأ؛ وإن بلي تبقى الدقيقة المرسلة. */
    return [label ? `حدث: ${label}` : minute ? `الدقيقة ${minute}` : null, side].filter(Boolean).join(' · ') || 'حدث من المصدر';
  }
  if (note?.anchor === 'minute') return [minute && `الدقيقة ${minute}`, side].filter(Boolean).join(' · ') || 'دقيقة غير محددة';
  return null;
}

/* ─────────────────────────── التخزين المحلي ─────────────────────────── */

function defaultStorage() {
  try {
    return typeof globalThis !== 'undefined' && globalThis.localStorage ? globalThis.localStorage : null;
  } catch {
    /* متصفح خاص أو كتل sides storage: الوصول نفسه يرمي، وهذا «لا تخزين» لا عطل. */
    return null;
  }
}

export function analystNoteStorageKey(matchId) {
  const id = filledText(matchId);
  return id ? `${ANALYST_NOTE_STORAGE_PREFIX}${id}` : null;
}

/**
 * قراءة ملاحظات مباراة.
 *
 * الحالات أربع لأن الردّ عليها مختلف: `ok` تُعرض، `empty` نموذج فارغ،
 * `unreadable` محتوى تالف لا يُمحى فوراً (قد يكون نصف كتابة) بل يُترك ويُعلَم،
 * و`unavailable` لا حفظ في هذا المتصفح فتبقى الملاحظات في الذاكرة للجلسة.
 */
export function readAnalystNotes(matchId, storage = defaultStorage()) {
  const key = analystNoteStorageKey(matchId);
  if (!key || !storage || typeof storage.getItem !== 'function') return { notes: [], status: 'unavailable' };
  let raw;
  try {
    raw = storage.getItem(key);
  } catch {
    return { notes: [], status: 'unavailable' };
  }
  if (raw === null || raw === undefined || raw === '') return { notes: [], status: 'empty' };
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { notes: [], status: 'unreadable' };
  }
  const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.notes) ? parsed.notes : null;
  if (!list) return { notes: [], status: 'unreadable' };
  const notes = [];
  const seen = new Set();
  for (const item of list) {
    const note = normalizeAnalystNote(item, matchId);
    if (!note || seen.has(note.id)) continue;
    seen.add(note.id);
    notes.push(note);
    if (notes.length >= ANALYST_NOTE_MAX_NOTES) break;
  }
  return { notes, status: 'ok' };
}

export function writeAnalystNotes(matchId, notes, storage = defaultStorage()) {
  const key = analystNoteStorageKey(matchId);
  if (!key || !storage || typeof storage.setItem !== 'function') return { ok: false, status: 'unavailable' };
  const list = (Array.isArray(notes) ? notes : []).filter(item => normalizeAnalystNote(item, matchId));
  try {
    /* القائمة الفارغة تُمحى لا تُكتب «[]»: مفتاح بلا ملاحظات يبقّى نظيفاً. */
    if (list.length === 0) {
      if (typeof storage.removeItem === 'function') storage.removeItem(key);
      else storage.setItem(key, '');
      return { ok: true, status: 'empty' };
    }
    storage.setItem(key, JSON.stringify(list));
    return { ok: true, status: 'ok' };
  } catch {
    /* الحصة ممتلئة أو الكتابة محظورة: لا تُفقد الملاحظات من الجلسة، تُوسم. */
    return { ok: false, status: 'unwritable' };
  }
}

/* ──────────────────────────── تصدير للفحص والطباعة ──────────────────────────── */

function snapshotFacts(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const score = snapshot.score ?? null;
  return {
    provider: filledText(snapshot.provider),
    readAt: snapshot.readAt ?? null,
    status: snapshot.status ? {
      code: snapshot.status.code ?? null,
      label: snapshot.status.label ?? null,
      clock: snapshot.status.clock ?? null,
      period: snapshot.status.period ?? null,
      completed: snapshot.status.completed === true,
    } : null,
    score: score ? { home: score.home ?? null, away: score.away ?? null } : null,
    venue: snapshot.venue ?? null,
    statistics: Array.isArray(snapshot.statistics) ? snapshot.statistics : null,
    /** ما لا يصل يبقى `null` معلنًا: الملف نفسه يقول «لا يوجد» بدل أن يصمت. */
    lineups: snapshot.lineups ?? null,
    ratings: snapshot.ratings ?? null,
    seasonComparison: snapshot.seasonComparison ?? null,
    seasonSample: snapshot.seasonSample ?? null,
    h2h: Array.isArray(snapshot.h2h) ? snapshot.h2h : [],
  };
}

/** الحدث كما في العقد، بلا حقل مُختلَق وبلا إحداثيات ليست موجودة. */
function exportEvent(event) {
  return {
    id: event.id ?? null,
    type: event.type ?? 'other',
    sourceType: event.sourceType ?? null,
    minute: typeof event.minute === 'number' ? event.minute : null,
    extraMinute: typeof event.extraMinute === 'number' ? event.extraMinute : null,
    period: event.period ?? null,
    team: event.team ?? null,
    teamSide: event.teamSide ?? null,
    player: event.player ? { id: event.player.id ?? null, name: event.player.name ?? null } : null,
    relatedPlayer: event.relatedPlayer ? { id: event.relatedPlayer.id ?? null, name: event.relatedPlayer.name ?? null } : null,
    cancelled: event.cancelled === true,
    detail: event.detail ?? null,
  };
}

/**
 * حزمة التصدير: ملاحظات المحلل + ما هو متاح فعلاً من بيانات المباراة.
 *
 * تُكتب الأرقام كما وصلت (المصدر يرسل `possessionPct` فلا يُعاد حساب شيء)،
 * ويُرفق سجلّ بالغياب حتى لا يُقرأ الملف كأنه موسوعة مكتملة.
 */
export function buildMatchExport({ match = null, snapshot = null, notes = [], freshnessText = null, events = null, at = null } = {}) {
  const exportedAt = isoNow(at);
  const sourceEvents = (Array.isArray(events) ? events : (Array.isArray(snapshot?.events) ? snapshot.events : []))
    .filter(event => event && typeof event === 'object' && event.silent !== true)
    .slice(0, ANALYST_EXPORT_EVENT_LIMIT);
  const sideName = side => {
    const team = side === 'home' ? match?.home : match?.away;
    return filledText(team?.name) ?? filledText(team?.sourceName) ?? null;
  };
  return {
    kind: 'stream-master.match-center.analyst-export',
    version: 1,
    exportedAt,
    privacyNote: 'ملاحظات المحلل محفوظة على هذا الجهاز ومتصفحه فقط؛ هذا الملف نُسخة خرج منها لهذا التصدير.',
    match: {
      id: filledText(match?.id),
      slug: filledText(match?.slug),
      competition: filledText(match?.competitionName),
      season: filledText(match?.season),
      round: match?.round ?? null,
      venue: filledText(match?.venue),
      kickoffUtc: filledText(match?.kickoffUtc),
      home: { name: sideName('home'), sourceName: filledText(match?.home?.sourceName) },
      away: { name: sideName('away'), sourceName: filledText(match?.away?.sourceName) },
    },
    read: snapshotFacts(snapshot),
    freshness: filledText(freshnessText),
    events: {
      /** الترتيب كما يصل من المصدر؛ لا يُعاد ترتيبه فيُقرأ تصديرٌ بغير بيانات. */
      count: sourceEvents.length,
      limit: ANALYST_EXPORT_EVENT_LIMIT,
      items: sourceEvents.map(exportEvent),
    },
    notes: (Array.isArray(notes) ? notes : []).map(note => ({
      id: note?.id ?? null,
      createdAt: note?.createdAt ?? null,
      updatedAt: note?.updatedAt ?? null,
      text: note?.text ?? '',
      tags: Array.isArray(note?.tags) ? note.tags : [],
      anchor: note?.anchor ?? 'none',
      eventId: note?.eventId ?? null,
      eventKey: note?.eventKey ?? null,
      minute: typeof note?.minute === 'number' ? note.minute : null,
      extraMinute: typeof note?.extraMinute === 'number' ? note.extraMinute : null,
      teamSide: note?.teamSide ?? null,
    })),
    notAvailableFromProvider: {
      lineups: snapshot?.lineups ? undefined : null,
      playerRatings: snapshot?.ratings ? undefined : null,
      seasonComparison: snapshot?.seasonComparison ? undefined : null,
      expectedGoals: null,
      shotCoordinates: null,
      passCoordinates: null,
      pressingZones: null,
    },
  };
}

export function exportToJsonText(payload) {
  return JSON.stringify(payload, null, 2);
}

/** اسم ملف لا يحمل حالة المباراة ولا نتيجتها — نفس عرف الروابط الثابتة. */
export function analystExportFilename(matchId, at = null) {
  const id = (filledText(matchId) ?? 'match').replaceAll(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'match';
  const stamp = new Date(Number.isFinite(at) ? at : Date.now());
  const digits = value => String(value).padStart(2, '0');
  const safe = Number.isFinite(stamp.getTime())
    ? `${stamp.getUTCFullYear()}${digits(stamp.getUTCMonth() + 1)}${digits(stamp.getUTCDate())}-${digits(stamp.getUTCHours())}${digits(stamp.getUTCMinutes())}`
    : 'unknown-time';
  return `analyst-notes-${id}-${safe}.json`;
}
