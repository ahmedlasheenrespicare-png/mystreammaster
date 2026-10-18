import type { ReactElement } from 'react';
import {
  type CountdownParts,
  comparisonFor,
  computeAvailableTabs,
  confirmedLineupSides,
  displayableComparisonAxes,
  displayablePlayers,
  displayableRatings,
  displayableStatistics,
  formatInZone,
  hasDisplayableForm,
  headToHeadFor,
  headToHeadSummary,
  isResultOfficial,
  isValidScore,
  lineupPitchSides,
  type LineupSide as LineupSideData,
  type MatchDefinition,
  type MatchSnapshot,
  type MatchStatus,
  previewFacts,
  previewPlacement,
  type ScoredPlayer,
  type TabId,
} from '../lib/match-center.mjs';
import type { MatchCenterTools } from './useMatchCenterTools';
import MatchCenterRadar from './MatchCenterRadar';
import FormSide from './MatchCenterForm';
import MatchCenterStatGroups from './MatchCenterStatGroups';
import MatchCenterAnalysis from './MatchCenterAnalysis';
import MatchCenterAnalysisTab from './MatchCenterAnalysisTab';

/* ==========================================================================
   لوحات مركز المباراة — عرضٌ فقط، وبلا طلبات
   --------------------------------------------------------------------------
   البند 11: طبقة بيانات واحدة لكل مباراة؛ لذلك لا تعرف أي لوحة `fetch` ولا
   تقرأ ساعةً لتقرير حالة. تدخلها اللقطة نفسها التي تُغذّي الملعب، وتخرج منها
   أمانةُ ما فيها: قسمٌ بلا بيانات لا يُرسم، وقيمةٌ ناقصة لا تُستكمل صفراً.

   «يُعرض أم لا» ليس قراراً هنا: كل فاحص توافر يعيش في `lib/match-center.mjs`
   (`displayable*` و`computeAvailableTabs`) لأن التبويبَ والتقريرَ والاختبارَ
   يجب أن يروا الجواب نفسه.
========================================================================== */

export interface PanelProps {
  match: MatchDefinition;
  snapshot: MatchSnapshot | null;
  status: MatchStatus | null;
  /** محفوظ للتوافق مع مستهلكي اللوحات؛ لا تُشتق حالة المباراة من الساعة. */
  now: number;
  countdown?: CountdownParts | null;
  /** حالة تفاعلية مشتركة مع شريط الملعب: التحديد والإظهار. */
  tools?: MatchCenterTools;
  /** نص حداثة القراءة كما تقرّره طبقة العقد — للعرض، لا للاستنتاج. */
  freshnessText?: string | null;
  /** وقت القراءة منسَّقاً بالعربية، أو `null` إن لم يصل وقت صالح. */
  readAtLabel?: string | null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numeric(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Date.parse(value));
}

function numberLabel(value: number): string {
  return new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(value);
}

/** تبويبات تُشتق من اللقطة ذاتها التي تغذي الملعب؛ لا طلب مستقل لكل قسم. */
export function availableMatchCenterTabs(
  match: MatchDefinition,
  snapshot: MatchSnapshot | null,
  status: MatchStatus | null,
): TabId[] {
  return computeAvailableTabs({ match, snapshot, status });
}

/* ─────────────────────────── 1) معاينة ─────────────────────────── */

/** الحقائق الست + مستوى الفريقين. تُرسم هنا فقط حين تكون المعاينة في بيتها
    الثاني (اللوحة) — أي بعد أن حلّت التشكيلة محلها على الملعب (`previewPlacement`). */
export function PreviewPanel({ match, snapshot, status }: PanelProps) {
  const axes = displayableComparisonAxes(comparisonFor(snapshot));
  const comparison = comparisonFor(snapshot);
  const homeFormCandidate = snapshot?.form?.home ?? null;
  const awayFormCandidate = snapshot?.form?.away ?? null;
  const homeForm = hasDisplayableForm(homeFormCandidate) ? homeFormCandidate : null;
  const awayForm = hasDisplayableForm(awayFormCandidate) ? awayFormCandidate : null;
  const facts = previewFacts(match, snapshot, status);
  if (facts.length === 0 && !homeForm && !awayForm && axes.length === 0) return null;

  return (
    <div>
      <h3>المعاينة</h3>
      {facts.length > 0 && (
        <dl className="mc-preview-facts">
          {facts.map(({ id, label, value }) => <div key={id}><dt>{label}</dt><dd dir="auto">{value}</dd></div>)}
        </dl>
      )}

      {(homeForm || awayForm) && (
        <section aria-labelledby="mc-form-title">
          <h3 id="mc-form-title">مستوى الفريقين — مباريات موثقة</h3>
          <div className="mc-form-grid">
            {homeForm && <FormSide variant="panel" side="home" name={text(match.home.name) ?? text(match.home.sourceName) ?? 'المضيف'} form={homeForm} />}
            {awayForm && <FormSide variant="panel" side="away" name={text(match.away.name) ?? text(match.away.sourceName) ?? 'الضيف'} form={awayForm} />}
          </div>
        </section>
      )}

      {axes.length > 0 && (
        <MatchCenterRadar comparison={comparison} homeName={text(match.home.name) ?? text(match.home.sourceName) ?? 'المضيف'} awayName={text(match.away.name) ?? text(match.away.sourceName) ?? 'الضيف'} />
      )}
    </div>
  );
}

/* ─────────────────────────── 2) المواجهات ─────────────────────────── */

export function HistoryPanel({ match, snapshot, status }: PanelProps) {
  /* نفس دالة التجميع التي يقرأ منها فاحص التوافر: القسم يعرض ما بُني عليه
     قرار إظهاره، لا حساباً ثانياً قد يختلف عنه. */
  const entries = headToHeadFor(match, snapshot, status);
  if (entries.length === 0) return null;
  const homeName = text(match.home.name) ?? text(match.home.sourceName) ?? 'المضيف';
  const awayName = text(match.away.name) ?? text(match.away.sourceName) ?? 'الضيف';
  /* سطر المجمل من الصفوف المعروضة نفسها؛ `null` ⇒ لا يُرسم شيء (لا تخمين). */
  const summary = headToHeadSummary(entries, match.home, match.away);

  return (
    <div>
      <h3>المواجهات</h3>
      <p>آخر <span className="mc-num">{numberLabel(entries.length)}</span> مواجهات عبر البطولات.</p>
      {summary && (
        <ul className="mc-h2h-agg" aria-label="مجمل المواجهات المعروضة">
          <li className="mc-h2h-cell" data-side="home"><b className="mc-num">{numberLabel(summary.homeWins)}</b><small>فوز {homeName}</small></li>
          <li className="mc-h2h-cell" data-side="draw"><b className="mc-num">{numberLabel(summary.draws)}</b><small>تعادل</small></li>
          <li className="mc-h2h-cell" data-side="away"><b className="mc-num">{numberLabel(summary.awayWins)}</b><small>فوز {awayName}</small></li>
        </ul>
      )}
      <ol className="mc-history-list">
        {entries.map((entry, index) => {
          const date = validDate(entry.date)
            ? formatInZone(entry.date, 'Africa/Cairo', { year: 'numeric', month: '2-digit', day: '2-digit' })
            : null;
          const competition = text(entry.competition);
          return (
            <li className="mc-history-item" key={entry.fixtureId ? `id-${entry.fixtureId}` : `${entry.date}-${index}`}>
              {date && <time className="mc-history-date" dateTime={entry.date}>{date}</time>}
              <strong className="mc-history-scoreline">
                {text(entry.home)}
                <span className="mc-num">{numberLabel(numeric(entry.homeGoals) ?? 0)}–{numberLabel(numeric(entry.awayGoals) ?? 0)}</span>
                {text(entry.away)}
              </strong>
              {(competition || entry.friendly === true) && (
                <small>{competition}{competition && entry.friendly === true ? ' · ' : ''}{entry.friendly === true ? 'ودية' : ''}</small>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ─────────────────────────── 3) التشكيلات ─────────────────────────── */

function ConfirmedLineupSide({ name, data }: { name: string; data: LineupSideData }) {
  const starters = displayablePlayers(data.starters);
  const substitutes = displayablePlayers(data.substitutes);
  const formation = text(data.formation);
  const coach = text(data.coach);
  return (
    <section className="mc-confirmed-lineup">
      <h3>{name}{formation && <span className="mc-team-tag"> · {formation}</span>}</h3>
      {coach && <p className="mc-note">المدرب: {coach}</p>}
      {starters.length > 0 && (
        <div>
          <h4>التشكيلة الأساسية المؤكدة</h4>
          <ol className="mc-events">
            {starters.map((player, index) => <li className="mc-event" key={player.id ?? `${player.name}-${index}`}><span className="mc-event-body">{text(player.name)}</span></li>)}
          </ol>
        </div>
      )}
      {substitutes.length > 0 && (
        <div>
          <h4>البدلاء</h4>
          <ul className="mc-events">
            {substitutes.map((player, index) => <li className="mc-event" key={player.id ?? `${player.name}-${index}`}><span className="mc-event-body">{text(player.name)}</span></li>)}
          </ul>
        </div>
      )}
    </section>
  );
}

/** احتياط فقط: تشكيلة مؤكدة تعذّر رسمها على الملعب (ناقصة أو برموز مراكز
    غير معروفة). حين يرسمها الملعب لا تُكرَّر هنا — للمحتوى بيت واحد. */
export function LineupsPanel({ match, snapshot }: PanelProps) {
  if (lineupPitchSides({ match, snapshot }).length > 0) return null;
  const sides = confirmedLineupSides(snapshot?.lineups ?? null);
  if (sides.length === 0) return null;

  return (
    <div>
      <h3>التشكيلات المؤكدة</h3>
      <div className="mc-lineup-grid">
        {sides.map(({ side, data }) => {
          const team = match[side];
          const name = text(team.name) ?? text(team.sourceName) ?? text(team.shortName);
          return name ? <ConfirmedLineupSide key={side} name={name} data={data} /> : null;
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────── 4) مباشر ─────────────────────────── */

export function LivePanel({ match, snapshot, status, countdown, freshnessText, readAtLabel }: PanelProps) {
  const statistics = displayableStatistics(snapshot?.statistics ?? null);

  const statusLabel = text(status?.label);
  const clock = text(status?.clock);
  const homeName = text(match.home.name) ?? text(match.home.sourceName) ?? 'المضيف';
  const awayName = text(match.away.name) ?? text(match.away.sourceName) ?? 'الضيف';
  return (
    <div>
      <h2>مباشر</h2>
      {status?.phase === 'pre' && countdown && !countdown.started && (
        <p aria-label="العد التنازلي لموعد المباراة">متبقي على الموعد: <bdi className="mc-num">{numberLabel(countdown.days)} يوم · {numberLabel(countdown.hours)} ساعة · {numberLabel(countdown.minutes)} دقيقة · {numberLabel(countdown.seconds)} ثانية</bdi></p>
      )}
      {freshnessText && <p>{freshnessText}{readAtLabel && <> · آخر قراءة: {readAtLabel}</>}</p>}
      {(statusLabel || clock) && <p>{statusLabel}{clock && <> · <span className="mc-num" dir="ltr">{clock}</span></>}</p>}
      <MatchCenterStatGroups statistics={statistics} homeName={homeName} awayName={awayName} logos={snapshot?.logos ?? null} idPrefix="live" />
    </div>
  );
}

/* ───────────────────────── 5) بعد المباراة ───────────────────────── */

function RatingList({ ratings }: { ratings: ScoredPlayer[] }) {
  if (ratings.length === 0) return null;
  return (
    <section>
      <h3>تقييمات المصدر</h3>
      <ul className="mc-events">
        {ratings.map((player, index) => (
          <li className="mc-event" key={player.id ?? `${player.name}-${index}`}>
            <span className="mc-event-body">
              {text(player.name)}
              <small>تقييم وارد من المصدر: <span className="mc-num">{numberLabel(numeric(player.rating) ?? 0)}</span>{player.provisional ? ' · أولي وقابل للتغير' : ''}</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ReportPanel({ snapshot, status }: PanelProps) {
  const official = isResultOfficial(status, snapshot?.score ?? null);
  const ratings = displayableRatings(snapshot?.ratings ?? null);
  const finalScore = snapshot?.score ?? null;
  if (!official || !finalScore || !isValidScore(finalScore)) return null;

  return (
    <div>
      <h3>تقرير ما بعد المباراة</h3>
      <p>النتيجة النهائية: <b className="mc-num">{numberLabel(finalScore.home as number)}–{numberLabel(finalScore.away as number)}</b></p>
      <RatingList ratings={ratings} />
    </div>
  );
}

/** التجميع فقط؛ تبقى بوابات البيانات في طبقة العقد واللوحات الأصلية.
    المعاينة لها بيت واحد: على الملعب حتى تصدر التشكيلة، ثم هنا. */
export function PrematchPanel(props: PanelProps) {
  const onPitch = previewPlacement({ match: props.match, snapshot: props.snapshot, status: props.status }) === 'pitch';
  return (
    <div>
      <h2>قبل المباراة</h2>
      {onPitch
        ? <p className="mc-prematch-pointer">المعاينة ومستوى الفريقين معروضان على الملعب أعلاه حتى صدور التشكيلة.</p>
        : <PreviewPanel {...props} />}
      <HistoryPanel {...props} />
      <LineupsPanel {...props} />
    </div>
  );
}

export function AnalysisPanel(props: PanelProps) {
  return <div><MatchCenterAnalysisTab {...props} /></div>;
}

export function PostmatchPanel(props: PanelProps) {
  return <div><h2>بعد المباراة</h2><MatchCenterAnalysis {...props} /><ReportPanel {...props} /></div>;
}

export const PANELS: Record<TabId, (props: PanelProps) => ReactElement | null> = {
  prematch: PrematchPanel,
  live: LivePanel,
  analysis: AnalysisPanel,
  postmatch: PostmatchPanel,
};
