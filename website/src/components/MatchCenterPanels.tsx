import {
  buildComparison,
  canShowKickoff,
  dayLabelInZone,
  formatInZone,
  isResultOfficial,
  isValidScore,
  kickoffLabel,
  mergeH2h,
  type Comparison,
  type ComparisonAxis,
  type H2hEntry,
  type LineupSide as LineupSideData,
  type MatchDefinition,
  type MatchEvent,
  type MatchLineups,
  type MatchSnapshot,
  type MatchStatus,
  type ScoredPlayer,
  type StatPair,
  type TeamForm,
  type TabId,
} from '../lib/match-center.mjs';
import MatchCenterRadar from './MatchCenterRadar';

export interface PanelProps {
  match: MatchDefinition;
  snapshot: MatchSnapshot | null;
  status: MatchStatus | null;
  /** محفوظ للتوافق مع مستهلكي اللوحات؛ لا تُشتق حالة المباراة من الساعة. */
  now: number;
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

function matchVenue(match: MatchDefinition, snapshot: MatchSnapshot | null): string | null {
  return snapshot ? text(snapshot.venue) : text(match.venue);
}

function displayableStatistics(value: MatchSnapshot['statistics']): StatPair[] {
  if (!Array.isArray(value)) return [];
  return value.filter(stat => Boolean(text(stat?.label))
    && (numeric(stat?.home) !== null || numeric(stat?.away) !== null));
}

function displayableEvents(value: MatchSnapshot['events']): MatchEvent[] {
  if (!Array.isArray(value)) return [];
  return value.filter(event => Boolean(event && (
    (event.type && event.type !== 'other')
    || event.cancelled
    || text(event.team)
    || text(event.player?.name)
    || text(event.relatedPlayer?.name)
    || text(event.detail)
    || (typeof event.minute === 'number' && Number.isFinite(event.minute))
  )));
}

function displayablePlayers(value: unknown): ScoredPlayer[] {
  if (!Array.isArray(value)) return [];
  return value.filter((player): player is ScoredPlayer => Boolean(player && text(player.name)));
}

function confirmedSides(lineups: MatchLineups | null): { side: 'home' | 'away'; data: LineupSideData }[] {
  if (!lineups || typeof lineups !== 'object') return [];
  return (['home', 'away'] as const).flatMap(side => {
    const data = lineups[side];
    if (!data || data.confirmed !== true) return [];
    const starters = displayablePlayers(data.starters);
    const substitutes = displayablePlayers(data.substitutes);
    const hasVisibleContent = Boolean(text(data.formation) || text(data.coach) || starters.length || substitutes.length);
    return hasVisibleContent ? [{ side, data }] : [];
  });
}

function displayableHeadToHead(entries: H2hEntry[]): H2hEntry[] {
  return entries.filter(entry => Boolean(
    entry
      && text(entry.home)
      && text(entry.away)
      && validDate(entry.date)
      && isValidScore({ home: entry.homeGoals, away: entry.awayGoals }),
  ));
}

function displayableRatings(value: MatchSnapshot['ratings']): ScoredPlayer[] {
  if (!Array.isArray(value)) return [];
  return value.filter(player => Boolean(text(player?.name) && numeric(player?.rating) !== null));
}

function hasFormData(form: TeamForm | null | undefined): form is TeamForm {
  return Boolean(form && Array.isArray(form.matches) && form.matches.some(item =>
    item
      && numeric(item.goalsFor) !== null
      && numeric(item.goalsAgainst) !== null
      && (item.result === 'W' || item.result === 'D' || item.result === 'L'),
  ));
}

function comparisonFor(snapshot: MatchSnapshot | null): Comparison {
  return buildComparison(
    (snapshot?.seasonComparison ?? []).map(metric => ({ ...metric, mode: 'season' as const })),
    { mode: 'season', sample: snapshot?.seasonSample ?? null, provider: snapshot?.provider ?? null },
  );
}

function displayableAxes(comparison: Comparison): ComparisonAxis[] {
  return comparison.axes.filter(axis => text(axis.label)
    && (numeric(axis.home) !== null || numeric(axis.away) !== null));
}

function hasPreviewData(match: MatchDefinition, snapshot: MatchSnapshot | null, status: MatchStatus | null): boolean {
  const comparison = displayableAxes(comparisonFor(snapshot));
  const hasFixtureFacts = Boolean(
    text(match.competitionName)
      || text(matchVenue(match, snapshot))
      || (canShowKickoff(status) && validDate(match.kickoffUtc) && kickoffLabel(match.kickoffUtc, 'Africa/Cairo'))
      || text(match.season)
      || text(match.round),
  );
  return hasFixtureFacts
    || hasFormData(snapshot?.form?.home)
    || hasFormData(snapshot?.form?.away)
    || comparison.length > 0;
}

/** تبويبات تُشتق من اللقطة ذاتها التي تغذي الملعب؛ لا طلب مستقل لكل قسم. */
export function availableMatchCenterTabs(
  match: MatchDefinition,
  snapshot: MatchSnapshot | null,
  status: MatchStatus | null,
): TabId[] {
  const tabs: TabId[] = [];
  if (hasPreviewData(match, snapshot, status)) tabs.push('preview');

  const official = isResultOfficial(status, snapshot?.score ?? null);
  const h2h = displayableHeadToHead(mergeH2h(snapshot?.h2h ?? [], official && snapshot?.score
    ? {
      fixtureId: match.externalIds.espn ?? null,
      date: match.kickoffUtc,
      competition: text(match.competitionName),
      year: text(match.season),
      friendly: false,
      completed: true,
      home: text(match.home.name) ?? text(match.home.sourceName) ?? '',
      away: text(match.away.name) ?? text(match.away.sourceName) ?? '',
      homeGoals: snapshot.score.home,
      awayGoals: snapshot.score.away,
    }
    : null, 3));
  if (h2h.length > 0) tabs.push('history');

  if (confirmedSides(snapshot?.lineups ?? null).length > 0) tabs.push('lineups');

  const events = displayableEvents(snapshot?.events ?? []);
  const statistics = displayableStatistics(snapshot?.statistics ?? null);
  if (events.length > 0 || statistics.length > 0) tabs.push('live');

  const ratings = displayableRatings(snapshot?.ratings ?? null);
  if (official && (reportEvents(events).length > 0 || statistics.length > 0 || ratings.length > 0)) tabs.push('report');
  return tabs;
}

/* ─────────────────────────── 1) معاينة ─────────────────────────── */

const RESULT_WORD: Record<TeamForm['matches'][number]['result'], string> = { W: 'فوز', D: 'تعادل', L: 'خسارة' };

function FormSide({ name, form }: { name: string; form: TeamForm | null }) {
  if (!hasFormData(form)) return null;
  const matches = form.matches.filter(item => item
    && numeric(item.goalsFor) !== null
    && numeric(item.goalsAgainst) !== null
    && (item.result === 'W' || item.result === 'D' || item.result === 'L'));
  const totals = [
    ['مباريات موثقة', numeric(form.played)],
    ['فوز', numeric(form.wins)],
    ['تعادل', numeric(form.draws)],
    ['خسارة', numeric(form.losses)],
    ['أهداف مسجلة', numeric(form.goalsFor)],
    ['أهداف مستقبلة', numeric(form.goalsAgainst)],
    ['متوسط التسجيل', numeric(form.avgGoalsFor)],
    ['متوسط الاستقبال', numeric(form.avgGoalsAgainst)],
  ].filter((entry): entry is [string, number] => entry[1] !== null);
  const competitions = Array.isArray(form.competitions) ? form.competitions.map(text).filter((item): item is string => Boolean(item)) : [];

  return (
    <section className="mc-form-side">
      <h3>{name}</h3>
      {matches.length > 0 && (
        <ol className="mc-events" aria-label={`مباريات موثقة لـ ${name}`}>
          {matches.map((item, index) => {
            const opponent = text(item.opponent);
            const date = validDate(item.date)
              ? formatInZone(item.date, 'Africa/Cairo', { year: 'numeric', month: '2-digit', day: '2-digit' })
              : null;
            const competition = text(item.competition);
            return (
              <li className="mc-event" key={item.fixtureId ?? `${item.date}-${index}`}>
                <span className="mc-event-minute">{RESULT_WORD[item.result]}</span>
                <span className="mc-event-body">
                  {opponent && <span>{item.venue === 'home' ? 'ضد' : 'لدى'} {opponent}</span>}
                  <small>
                    <span className="mc-num">{numberLabel(item.goalsFor)}–{numberLabel(item.goalsAgainst)}</span>
                    {date && <> · {date}</>}
                    {competition && <> · {competition}</>}
                  </small>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {totals.length > 0 && (
        <dl className="mc-form-summary">
          {totals.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="mc-num">{numberLabel(value)}</dd></div>)}
        </dl>
      )}
      {competitions.length > 0 && <p className="mc-note">نطاق السجل: {competitions.join('، ')}.</p>}
    </section>
  );
}

export function PreviewPanel({ match, snapshot, status }: PanelProps) {
  const comparison = comparisonFor(snapshot);
  const axes = displayableAxes(comparison);
  const homeForm = hasFormData(snapshot?.form?.home) ? snapshot.form.home : null;
  const awayForm = hasFormData(snapshot?.form?.away) ? snapshot.form.away : null;
  const competition = text(match.competitionName);
  const venue = matchVenue(match, snapshot);
  const season = text(match.season);
  const round = typeof match.round === 'number' && Number.isFinite(match.round)
    ? String(match.round)
    : text(match.round);

  let cairoTime: string | null = null;
  let cairoDay: string | null = null;
  let meccaTime: string | null = null;
  if (canShowKickoff(status) && validDate(match.kickoffUtc)) {
    try {
      cairoTime = kickoffLabel(match.kickoffUtc, 'Africa/Cairo');
      cairoDay = dayLabelInZone(match.kickoffUtc, 'Africa/Cairo');
      meccaTime = kickoffLabel(match.kickoffUtc, 'Asia/Riyadh');
    } catch {
      /* حذف الموعد التالف بدلاً من تخمين قيمة. */
    }
  }

  const facts = [
    ...(competition ? [{ label: 'المسابقة', value: competition }] : []),
    ...(season ? [{ label: 'الموسم', value: season }] : []),
    ...(round ? [{ label: 'الجولة', value: round }] : []),
    ...(venue ? [{ label: 'الملعب', value: venue }] : []),
    ...(cairoTime ? [{ label: 'موعد القاهرة', value: `${cairoTime}${cairoDay ? ` · ${cairoDay}` : ''}` }] : []),
    ...(meccaTime ? [{ label: 'موعد مكة', value: meccaTime }] : []),
  ];

  return (
    <div>
      <h2>معاينة المباراة</h2>
      {facts.length > 0 && (
        <dl className="mc-preview-facts">
          {facts.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd dir="auto">{value}</dd></div>)}
        </dl>
      )}

      {(homeForm || awayForm) && (
        <section aria-labelledby="mc-form-title">
          <h3 id="mc-form-title">مستوى الفريقين — مباريات موثقة</h3>
          <div className="mc-form-grid">
            {homeForm && <FormSide name={text(match.home.name) ?? text(match.home.sourceName) ?? 'المضيف'} form={homeForm} />}
            {awayForm && <FormSide name={text(match.away.name) ?? text(match.away.sourceName) ?? 'الضيف'} form={awayForm} />}
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
  const official = isResultOfficial(status, snapshot?.score ?? null);
  const self = official && snapshot?.score
    ? {
      fixtureId: match.externalIds.espn ?? null,
      date: match.kickoffUtc,
      competition: text(match.competitionName),
      year: text(match.season),
      friendly: false,
      completed: true,
      home: text(match.home.name) ?? text(match.home.sourceName) ?? '',
      away: text(match.away.name) ?? text(match.away.sourceName) ?? '',
      homeGoals: snapshot.score.home,
      awayGoals: snapshot.score.away,
    }
    : null;
  const entries = displayableHeadToHead(mergeH2h(snapshot?.h2h ?? [], self, 3));

  if (entries.length === 0) return null;

  return (
    <div>
      <h2>المواجهات السابقة</h2>
      <p>المواجهات المكتملة التي أرسلها المصدر فقط.</p>
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
                <span className="mc-num">{numberLabel(entry.homeGoals as number)}–{numberLabel(entry.awayGoals as number)}</span>
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

export function LineupsPanel({ match, snapshot }: PanelProps) {
  const sides = confirmedSides(snapshot?.lineups ?? null);
  if (sides.length === 0) return null;

  return (
    <div>
      <h2>التشكيلات المؤكدة</h2>
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

const EVENT_TITLES: Record<string, string> = {
  goal: 'هدف', penalty: 'هدف من ركلة جزاء', own_goal: 'هدف عكسي', missed_penalty: 'ركلة جزاء مهدرة',
  yellow_card: 'بطاقة صفراء', red_card: 'بطاقة حمراء', substitution: 'تبديل',
  var_cancelled: 'مراجعة فيديو — إلغاء', var_confirmed: 'مراجعة فيديو — تأكيد',
};

function EventItem({ event }: { event: MatchEvent }) {
  const minute = typeof event.minute === 'number' && Number.isFinite(event.minute) && event.minute >= 0
    ? `${event.minute}${typeof event.extraMinute === 'number' && Number.isFinite(event.extraMinute) && event.extraMinute >= 0 ? `+${event.extraMinute}` : ''}`
    : null;
  const title = EVENT_TITLES[event.type] ?? null;
  const details = [
    text(event.team),
    text(event.player?.name),
    text(event.relatedPlayer?.name) ? `بدلاً من ${text(event.relatedPlayer?.name)}` : null,
    text(event.detail),
  ].filter((item): item is string => Boolean(item));
  return (
    <li className="mc-event" data-kind={event.cancelled ? 'cancelled' : event.type}>
      {minute && <span className="mc-event-minute">{minute}</span>}
      <span className="mc-event-body">
        {title && <b>{title}</b>}
        {event.cancelled && <b> — أُلغي بعد مراجعة المصدر</b>}
        {details.length > 0 && <small>{details.join(' · ')}</small>}
      </span>
    </li>
  );
}

function StatisticList({ statistics, match }: { statistics: StatPair[]; match: MatchDefinition }) {
  if (statistics.length === 0) return null;
  const homeName = text(match.home.name) ?? text(match.home.sourceName) ?? 'المضيف';
  const awayName = text(match.away.name) ?? text(match.away.sourceName) ?? 'الضيف';
  return (
    <section className="mc-statistics">
      <h3>إحصائيات المباراة</h3>
      <dl className="mc-stat-list">
        {statistics.map(stat => {
          const home = numeric(stat.home);
          const away = numeric(stat.away);
          const unit = text(stat.unit);
          return (
            <div className="mc-stat-row" key={stat.key}>
              <dt>{text(stat.label)}{unit ? ` (${unit})` : ''}</dt>
              <dd>
                {home !== null && <span data-side="home"><b>{homeName}</b><span className="mc-num">{numberLabel(home)}</span></span>}
                {away !== null && <span data-side="away"><b>{awayName}</b><span className="mc-num">{numberLabel(away)}</span></span>}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

export function LivePanel({ match, snapshot, status }: PanelProps) {
  const events = displayableEvents(snapshot?.events ?? []);
  const statistics = displayableStatistics(snapshot?.statistics ?? null);
  if (events.length === 0 && statistics.length === 0) return null;

  const statusLabel = text(status?.label);
  const clock = text(status?.clock);
  return (
    <div>
      <h2>بيانات المباراة</h2>
      {(statusLabel || clock) && <p>{statusLabel}{clock && <> · <span className="mc-num" dir="ltr">{clock}</span></>}</p>}
      {events.length > 0 && (
        <section>
          <h3>أحداث المباراة</h3>
          <ol className="mc-events">{events.map((event, index) => <EventItem key={event.id ?? `${event.type}-${event.minute}-${index}`} event={event} />)}</ol>
        </section>
      )}
      <StatisticList statistics={statistics} match={match} />
    </div>
  );
}

/* ───────────────────────── 5) بعد المباراة ───────────────────────── */

function reportEvents(events: MatchEvent[]): MatchEvent[] {
  return events.filter(event => ['goal', 'penalty', 'own_goal', 'yellow_card', 'red_card'].includes(event.type) || event.cancelled);
}

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
              <small>تقييم وارد من المصدر: <span className="mc-num">{numberLabel(player.rating as number)}</span>{player.provisional ? ' · أولي وقابل للتغير' : ''}</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ReportPanel({ match, snapshot, status }: PanelProps) {
  const official = isResultOfficial(status, snapshot?.score ?? null);
  const events = reportEvents(displayableEvents(snapshot?.events ?? []));
  const statistics = displayableStatistics(snapshot?.statistics ?? null);
  const ratings = displayableRatings(snapshot?.ratings ?? null);
  const finalScore = snapshot?.score ?? null;
  if (!official || !finalScore || !isValidScore(finalScore)
    || (events.length === 0 && statistics.length === 0 && ratings.length === 0)) return null;

  return (
    <div>
      <h2>بعد المباراة</h2>
      <p>النتيجة النهائية: <b className="mc-num">{numberLabel(finalScore.home as number)}–{numberLabel(finalScore.away as number)}</b></p>
      {events.length > 0 && (
        <section>
          <h3>أحداث موثقة</h3>
          <ol className="mc-events">{events.map((event, index) => <EventItem key={event.id ?? `report-${event.type}-${event.minute}-${index}`} event={event} />)}</ol>
        </section>
      )}
      <StatisticList statistics={statistics} match={match} />
      <RatingList ratings={ratings} />
    </div>
  );
}

export const PANELS = {
  preview: PreviewPanel,
  history: HistoryPanel,
  lineups: LineupsPanel,
  live: LivePanel,
  report: ReportPanel,
} as const;
