import { useMemo, useState } from 'react';
import {
  EVENT_FILTER_ALL,
  EVENT_FILTER_DEFAULTS,
  activeEventFilterCount,
  analysisFacts,
  analysisIsAvailable,
  describeEvent,
  displayableStatistics,
  eventFilterOptions,
  eventKey,
  eventMinuteLabel,
  eventOnTimeline,
  eventPeriodLabel,
  eventSymbol,
  eventTypeName,
  filterEvents,
  renderableEvents,
  summarizeSourceEvents,
  unavailableDataNotes,
  type MatchEvent,
} from '../lib/match-center.mjs';
import EventIcon from './MatchCenterSymbols';
import MatchCenterStatGroups from './MatchCenterStatGroups';
import type { PanelProps } from './MatchCenterPanels';

/* ==========================================================================
   قسم «تحليل المباراة»
   --------------------------------------------------------------------------
   • لا يُفتَح إلا إذا وصلت أحداث أو أرقام فعلية (`analysisIsAvailable`)؛
     القسم الذي لا بيانات له لا يُعرض أصلاً لا في التبويب ولا هنا.
   • كل رقم بوحدة المصدر وكل حدث بوصف المصدر. لا سيطرة، ولا أفضلية، ولا جودة
     فرص: هذه استنتاجات لا تُثبتها أرقام `keyEvents` و`boxscore` وحدها.
   • الفلاتر تُشتق من الأحداث الموجودة، فتطابق المصدر دائماً؛ ولا خيار ميت.
   • الحدث المختار يُحدَّد هنا وفي شريط الملعب معاً بنفس المفتاح — موضع واحد
     للحالة، فلا تتباعد اللوحتان عن بعضهما.
========================================================================== */

function cleanText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numberLabel(value: number): string {
  return new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(value);
}

function FilterSelect({ id, label, value, onChange, options, allLabel }: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  allLabel: string;
  options: { value: string; label: string; count: number }[];
}) {
  return (
    <label className="mc-filter" htmlFor={id}>
      <span className="mc-filter-label">{label}</span>
      <select id={id} className="mc-filter-select" value={value} onChange={event => onChange(event.target.value)}>
        <option value={EVENT_FILTER_ALL}>{allLabel}</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label} ({numberLabel(option.count)})
          </option>
        ))}
      </select>
    </label>
  );
}

export default function MatchCenterAnalysis({ match, snapshot, status, tools }: PanelProps) {
  const [filters, setFilters] = useState(EVENT_FILTER_DEFAULTS);
  const events = useMemo(() => renderableEvents(snapshot?.events ?? null), [snapshot]);
  const statistics = useMemo(() => displayableStatistics(snapshot?.statistics ?? null), [snapshot]);
  const homeName = cleanText(match.home.name) ?? cleanText(match.home.sourceName) ?? 'المضيف';
  const awayName = cleanText(match.away.name) ?? cleanText(match.away.sourceName) ?? 'الضيف';
  const summary = useMemo(() => summarizeSourceEvents(events), [events]);
  const choices = useMemo(() => eventFilterOptions(events, { homeName, awayName }), [events, homeName, awayName]);
  const facts = useMemo(() => analysisFacts(statistics), [statistics]);
  const visible = useMemo(() => filterEvents(events, filters), [events, filters]);
  const activeCount = activeEventFilterCount(filters);

  if (!analysisIsAvailable(snapshot)) return null;

  /* الحدث المختار تُقرّره حالة الصفحة المشتركة، فلا يختلف الوصف بين اللوحتين. */
  const selected = tools?.selectedEvent ?? null;
  const setFilter = (key: 'team' | 'period' | 'type') => (next: string) =>
    setFilters(current => ({ ...current, [key]: next }));
  const clock = cleanText(status?.clock);
  const statusLabel = cleanText(status?.label);

  return (
    <div className="mc-analysis">
      <h3>ملخص الوقائع</h3>
      <p>
        الوقائع الواردة من المصدر فقط: {numberLabel(summary.total)} حدثاً
        {statistics.length > 0 ? ` و${numberLabel(statistics.length)} رقماً للفريقين` : ''}
        {statusLabel ? ` — ${statusLabel}` : ''}
        {clock ? <> · <span className="mc-num" dir="ltr">{clock}</span></> : null}
      </p>

      {facts.length > 0 && (
        <section aria-labelledby="mc-analysis-facts-title">
          <h3 id="mc-analysis-facts-title">ملخص الأرقام</h3>
          <ul className="mc-analysis-facts">
            {facts.map(row => (
              <li className="mc-analysis-fact" key={row.key || row.label}>
                <span className="mc-analysis-fact-label">{row.label}</span>
                <span className="mc-analysis-fact-values">
                  <bdi className="mc-num">{numberLabel(row.home as number)}{row.unitIsPercent ? '%' : row.unit ? ` ${row.unit}` : ''}</bdi>
                  <span className="mc-analysis-fact-vs">مقابل</span>
                  <bdi className="mc-num">{numberLabel(row.away as number)}{row.unitIsPercent ? '%' : row.unit ? ` ${row.unit}` : ''}</bdi>
                </span>
              </li>
            ))}
          </ul>
          <p className="mc-note">لا يُشتق من هذه الأرقام حكم: لا «سيطرة»، ولا «فرصة أخطر»، ولا وصف تكتيكي.</p>
        </section>
      )}

      {events.length > 0 && (
        <section aria-labelledby="mc-analysis-events-title">
          <h3 id="mc-analysis-events-title">أحداث المباراة</h3>

          <div className="mc-analysis-tally" aria-label="عدد الأحداث كما وردت من المصدر">
            <span><b className="mc-num">{numberLabel(summary.onTimeline)}</b> على الشريط الزمني</span>
            {summary.untimed > 0 && <span><b className="mc-num">{numberLabel(summary.untimed)}</b> بلا دقيقة</span>}
            {summary.cancelled > 0 && <span><b className="mc-num">{numberLabel(summary.cancelled)}</b> ملغى من المصدر</span>}
            <span>
              {/* الدقيقة بصيغة ساعة المصدر نفسها — كما على الشريط وفي الصفوف، لا رقمًا مُوَطَّنًا يُقرأ ساعة. */}
              {summary.firstMinute === null
                ? 'لا دقيقة واردة'
                : <>من <bdi className="mc-num" dir="ltr">{summary.firstMinute}′</bdi> إلى <bdi className="mc-num" dir="ltr">{summary.lastMinute as number}′</bdi></>}
            </span>
          </div>

          <div className="mc-analysis-filters">
            <FilterSelect
              id="mc-filter-team"
              label="الفريق"
              allLabel="كل الأحداث"
              value={filters.team ?? EVENT_FILTER_ALL}
              onChange={setFilter('team')}
              options={choices.team}
            />
            <FilterSelect
              id="mc-filter-period"
              label="الشوط"
              allLabel="كل الأشواط"
              value={filters.period ?? EVENT_FILTER_ALL}
              onChange={setFilter('period')}
              options={choices.period}
            />
            <FilterSelect
              id="mc-filter-type"
              label="نوع الحدث"
              allLabel="كل الأنواع"
              value={filters.type ?? EVENT_FILTER_ALL}
              onChange={setFilter('type')}
              options={choices.type}
            />
            <button
              type="button"
              className="mc-filter-reset"
              onClick={() => setFilters(EVENT_FILTER_DEFAULTS)}
              disabled={activeCount === 0}
            >
              عرض الكل
            </button>
          </div>

          <p className="mc-analysis-count" role="status">
            {activeCount === 0
              ? <>كل الأحداث: <span className="mc-num">{numberLabel(visible.length)}</span></>
              : <><span className="mc-num">{numberLabel(visible.length)}</span> من <span className="mc-num">{numberLabel(events.length)}</span> حدثاً بعد الفلتر — <span className="mc-num">{numberLabel(activeCount)}</span> فلتر نشط</>}
          </p>

          {visible.length === 0 ? (
            <p className="mc-analysis-empty">لا حدث يطابق هذا الفلتر في أحداث المصدر لهذه المباراة.</p>
          ) : (
            <ul className="mc-analysis-events">
              {visible.map((event, index) => (
                <AnalysisEventRow
                  key={event.id ?? `row-${index}`}
                  matchId={match.id}
                  event={event}
                  selected={selected === event}
                  onSelect={key => tools?.selectEvent(key)}
                  onReveal={key => tools?.revealEvent(key)}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {statistics.length > 0 && (
        <section aria-labelledby="mc-analysis-stats-title">
          <h3 id="mc-analysis-stats-title">إحصائيات الفريقين</h3>
          <MatchCenterStatGroups
            statistics={statistics}
            homeName={homeName}
            awayName={awayName}
            idPrefix="analysis"
            headingLevel="h4"
          />
        </section>
      )}

      {selected && (
        <section className="mc-analysis-detail" aria-labelledby="mc-analysis-detail-title">
          <h3 id="mc-analysis-detail-title">تفاصيل الحدث المختار</h3>
          <EventDetail event={selected} homeName={homeName} awayName={awayName} />
        </section>
      )}

      <section aria-labelledby="mc-analysis-absent-title">
        <h3 id="mc-analysis-absent-title">ما لا يصل إلى هذا القسم</h3>
        <ul className="mc-analysis-absent">
          {unavailableDataNotes(snapshot).map(note => <li key={note.id}>{note.text}</li>)}
        </ul>
      </section>
    </div>
  );
}

/* صف حدث واحد: زرّ يحدّث الاختيار في اللوحتين، وتفاصيل مُعرَجة عليه.
   الوصول باللمس ولوحة المفاتيح من نفس الزرّ، والتفاصيل تُقرأ في `aria-live`
   للتحديث لا للقراءة الآلية — فلا يُقاطع الناطقُ مستخدماً يتنقل بالأسهم. */
function AnalysisEventRow({ event, matchId, selected, onSelect, onReveal }: {
  event: MatchEvent;
  matchId: string;
  selected: boolean;
  onSelect: (key: string) => void;
  onReveal: (key: string) => void;
}) {
  const key = eventKey(matchId, event);
  const description = describeEvent(event);
  const minute = eventMinuteLabel(event);
  const kind = eventTypeName(event, 'حدث من المصدر');
  const onStrip = eventOnTimeline(event);

  return (
    <li className="mc-analysis-event" data-selected={selected ? 'true' : 'false'} data-kind={event.cancelled ? 'cancelled' : event.type}>
      <button
        type="button"
        className="mc-analysis-event-button"
        aria-pressed={selected}
        aria-label={`${description ?? kind} — ${selected ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}`}
        onClick={() => onSelect(key)}
      >
        <span className="mc-analysis-event-symbol" data-side={event.teamSide ?? 'unknown'}>
          <EventIcon symbol={eventSymbol(event.type)} className="mc-analysis-icon" />
        </span>
        <span className="mc-analysis-event-minute mc-num" dir="ltr">{minute ?? '—'}</span>
        <span className="mc-analysis-event-text">
          <bdi>{kind}</bdi>
          {cleanText(event.player?.name) && <small>{cleanText(event.player?.name)}</small>}
          {event.cancelled && <small>ملغى من المصدر — لا يُحتسب في النتيجة</small>}
        </span>
      </button>

      {selected && (
        <div className="mc-analysis-event-detail">
          <EventDetail event={event} homeName={null} awayName={null} compact />
          <div className="mc-analysis-event-actions">
            {onStrip && (
              <button type="button" className="mc-inline-button" onClick={() => onReveal(key)}>
                إظهار على الشريط الزمني
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

/** تفاصيل الحدث: كل سطر حقل أرسله المصدر، وسطر الغياب لا يُخترع له رقم. */
function EventDetail({ event, homeName, awayName, compact = false }: {
  event: MatchEvent;
  homeName: string | null;
  awayName: string | null;
  compact?: boolean;
}) {
  const teamSide = event.teamSide === 'home' ? homeName ?? 'المضيف' : event.teamSide === 'away' ? awayName ?? 'الضيف' : null;
  const teamName = cleanText(event.team);
  const rows = [
    ['النوع', eventTypeName(event, 'نوع من المصدر')],
    ['الدقيقة', eventMinuteLabel(event)],
    ['الشوط', eventPeriodLabel(event)],
    ['الفريق', teamSide ?? teamName],
    ['اللاعب', cleanText(event.player?.name)],
    ['لاعب مرتبط', event.type === 'substitution' ? cleanText(event.relatedPlayer?.name) : null],
    ['تفاصيل المصدر', cleanText(event.detail)],
    ['معرّف الحدث', cleanText(event.id)],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <dl className={compact ? 'mc-analysis-detail-values mc-analysis-detail-values--compact' : 'mc-analysis-detail-values'}>
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd dir="auto">{value}</dd>
        </div>
      ))}
      {event.cancelled && (
        <div>
          <dt>الحالة</dt>
          <dd>ملغى بقرار من المصدر — لا يُحتسب في النتيجة</dd>
        </div>
      )}
      {!eventOnTimeline(event) && (
        <div>
          <dt>على الشريط الزمني</dt>
          <dd>لا يرسل المصدر دقيقة لهذا الحدث، فيبقى خارجه بلا موضع مخترع</dd>
        </div>
      )}
    </dl>
  );
}
