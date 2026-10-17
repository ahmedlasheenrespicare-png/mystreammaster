import { useEffect, useState } from 'react';
import {
  canShowKickoff,
  canShowScore,
  dayLabelInZone,
  formatInZone,
  kickoffLabel,
  safeLogoUrl,
  type MatchDefinition,
  type MatchEvent,
  type MatchSnapshot,
  type MatchStatus,
} from '../lib/match-center.mjs';

function cleanText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Date.parse(value));
}

function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

function Crest({ logo, name, side }: { logo: string | null; name: string; side: 'home' | 'away' }) {
  const [failed, setFailed] = useState(false);
  const safeLogo = safeLogoUrl(logo);
  useEffect(() => setFailed(false), [safeLogo]);

  if (safeLogo && !failed) {
    return (
      <img
        className={`mc-pitch-crest mc-pitch-crest--${side}`}
        src={safeLogo}
        alt=""
        width="56"
        height="56"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }

  return <span className={`mc-pitch-crest mc-pitch-crest--${side}`} aria-hidden="true">{monogram(name)}</span>;
}

const EVENT_LABELS: Partial<Record<MatchEvent['type'], string>> = {
  goal: 'هدف', penalty: 'هدف من ركلة جزاء', own_goal: 'هدف عكسي', missed_penalty: 'ركلة جزاء مهدرة',
  yellow_card: 'بطاقة صفراء', red_card: 'بطاقة حمراء', substitution: 'تبديل',
  var_cancelled: 'مراجعة فيديو — إلغاء', var_confirmed: 'مراجعة فيديو — تأكيد',
};
const EVENT_SYMBOLS: Partial<Record<MatchEvent['type'], string>> = {
  goal: '⚽', penalty: '⚽', own_goal: '↩', missed_penalty: '×',
  yellow_card: 'ص', red_card: 'ح', substitution: '⇄', var_cancelled: 'VAR', var_confirmed: 'VAR',
};

function orderedEvents(events: MatchEvent[]): MatchEvent[] {
  return events.map((event, index) => ({ event, index }))
    .sort((a, b) => {
      const aMinute = a.event.minute;
      const bMinute = b.event.minute;
      if (aMinute === null && bMinute !== null) return 1;
      if (aMinute !== null && bMinute === null) return -1;
      if (aMinute !== null && bMinute !== null && aMinute !== bMinute) return aMinute - bMinute;
      const aExtra = a.event.extraMinute ?? 0;
      const bExtra = b.event.extraMinute ?? 0;
      if (aExtra !== bExtra) return aExtra - bExtra;
      return a.index - b.index;
    })
    .map(({ event }) => event);
}

function eventDescription(event: MatchEvent): string | null {
  const kind = EVENT_LABELS[event.type] ?? event.sourceType;
  const minute = typeof event.minute === 'number' && Number.isFinite(event.minute) && event.minute >= 0
    ? `${event.minute}${typeof event.extraMinute === 'number' && Number.isFinite(event.extraMinute) && event.extraMinute >= 0 ? `+${event.extraMinute}` : ''}′`
    : null;
  const team = event.teamSide === 'home' || event.teamSide === 'away' ? event.team : null;
  const side = event.teamSide === 'home' ? 'المضيف' : event.teamSide === 'away' ? 'الضيف' : null;
  const player = event.player?.name ?? null;
  const related = event.type === 'substitution' && event.relatedPlayer?.name
    ? `لاعب مرتبط: ${event.relatedPlayer.name}`
    : null;
  return [minute, kind, side, team, player, related, event.cancelled ? 'ملغى من المصدر' : null, event.type === 'other' ? event.detail : null]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(' · ') || null;
}

function PitchEventRail({ snapshot }: { snapshot: MatchSnapshot | null }) {
  const events = orderedEvents(Array.isArray(snapshot?.events) ? snapshot.events : [])
    .filter(event => eventDescription(event) !== null);
  if (events.length === 0) return null;
  return (
    <section className="mc-event-rail" aria-labelledby="mc-event-rail-title">
      <h2 id="mc-event-rail-title">أحداث المباراة</h2>
      <p>مسار زمني مرتبط بجهة الفريق؛ مواضع الأحداث داخل الملعب غير محددة.</p>
      <ol className="mc-event-rail-list">
        {events.map((event, index) => {
          const side = event.teamSide === 'home' || event.teamSide === 'away' ? event.teamSide : 'unknown';
          const label = eventDescription(event);
          if (!label) return null;
          return (
            <li key={`${event.id ?? 'event'}-${index}`} className="mc-pitch-event" data-kind={event.cancelled ? 'cancelled' : event.type} data-side={side}>
              <span className="mc-pitch-event-symbol" aria-hidden="true">{EVENT_SYMBOLS[event.type] ?? '•'}</span>
              <span className="mc-pitch-event-text" aria-label={label}>{label}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Team({ match, snapshot, side, flash }: {
  match: MatchDefinition;
  snapshot: MatchSnapshot | null;
  side: 'home' | 'away';
  flash: boolean;
}) {
  const team = match[side];
  const name = cleanText(team.name) ?? cleanText(team.sourceName) ?? cleanText(team.shortName);
  if (!name) return null;

  const sourceName = cleanText(team.sourceName);
  const shortName = cleanText(team.shortName);
  const logo = snapshot?.logos?.[side] ?? team.logo;

  return (
    <div className={`mc-pitch-team mc-pitch-team--${side}${flash ? ' mc-pitch-team--flash' : ''}`}>
      <Crest logo={logo} name={sourceName ?? name} side={side} />
      <span className="mc-pitch-team-name">{name}</span>
      {shortName && shortName !== name && <span className="mc-pitch-team-short">{shortName}</span>}
      <span className="mc-pitch-team-role">{side === 'home' ? 'المضيف' : 'الضيف'}</span>
    </div>
  );
}

export interface MatchCenterVisualsProps {
  match: MatchDefinition;
  snapshot: MatchSnapshot | null;
  status: MatchStatus | null;
  flash?: 'home' | 'away' | null;
  fresh?: boolean;
}

/** ملعب تخطيطي زخرفي؛ لا يضع لاعبين أو أحداثاً في مواقع ولا ينشئ خرائط. */
export default function MatchCenterVisuals({ match, snapshot, status, flash = null, fresh = false }: MatchCenterVisualsProps) {
  const homeName = cleanText(match.home.name) ?? cleanText(match.home.sourceName) ?? cleanText(match.home.shortName);
  const awayName = cleanText(match.away.name) ?? cleanText(match.away.sourceName) ?? cleanText(match.away.shortName);
  const score = snapshot?.score ?? null;
  const showScore = canShowScore(status, score);
  const competition = cleanText(match.competitionName);
  /* عند وصول لقطة حديثة، لا نُبقي ملعباً قديماً إذا غاب عن القراءة. وقبل
     أول قراءة يستخدم HTML الثابت قيمة الملعب المؤكدة في تعريف المباراة. */
  const venue = snapshot ? cleanText(snapshot.venue) : cleanText(match.venue);
  const kickoff = canShowKickoff(status) && validDate(match.kickoffUtc) ? match.kickoffUtc : null;
  const statusLabel = cleanText(status?.label);
  const clock = cleanText(status?.clock);
  const title = homeName && awayName
    ? `مركز المباراة · ${homeName} ضد ${awayName}`
    : 'مركز المباراة';

  let cairoKickoff: string | null = null;
  let cairoDay: string | null = null;
  let meccaKickoff: string | null = null;
  if (kickoff) {
    try {
      cairoKickoff = kickoffLabel(kickoff, 'Africa/Cairo');
      cairoDay = dayLabelInZone(kickoff, 'Africa/Cairo');
      meccaKickoff = kickoffLabel(kickoff, 'Asia/Riyadh');
    } catch {
      /* التاريخ غير صالح: تُحذف معلومة الموعد بدلاً من إظهار قيمة بديلة. */
    }
  }

  return (
    <section className="mc-match-visual" aria-labelledby="mc-title">
      <h1 id="mc-title" className="mc-match-title">{title}</h1>

      <div className="mc-pitch-frame">
        <div className="mc-pitch-markings" aria-hidden="true">
          <span className="mc-pitch-halfway" />
          <span className="mc-pitch-center-circle" />
          <span className="mc-pitch-center-spot" />
          <span className="mc-pitch-box mc-pitch-box--home" />
          <span className="mc-pitch-box mc-pitch-box--away" />
          <span className="mc-pitch-goal mc-pitch-goal--home" />
          <span className="mc-pitch-goal mc-pitch-goal--away" />
        </div>

        <Team match={match} snapshot={snapshot} side="home" flash={flash === 'home'} />

        <div className="mc-pitch-scoreboard" aria-live="off">
          {competition && <span className="mc-pitch-competition">{competition}</span>}
          {statusLabel && <span className="mc-pitch-status" data-code={status?.code ?? 'unknown'} data-fresh={fresh ? 'true' : 'false'}>{statusLabel}</span>}
          {showScore && score ? (
            <p className="mc-pitch-score" aria-label={`نتيجة المضيف ${score.home}، ثم الضيف ${score.away}`}>
              <span className="mc-score-order">{score.home}<span aria-hidden="true">–</span>{score.away}</span>
            </p>
          ) : (
            <span className="mc-pitch-vs" aria-label="مواجهة بين الفريقين">VS</span>
          )}
          {clock && statusLabel && <span className="mc-pitch-clock" dir="ltr">{clock}</span>}
          {cairoKickoff && (
            <span className="mc-pitch-kickoff">
              {cairoKickoff}{cairoDay ? ` · ${cairoDay}` : ''}
            </span>
          )}
        </div>

        <Team match={match} snapshot={snapshot} side="away" flash={flash === 'away'} />
      </div>

      <PitchEventRail snapshot={snapshot} />

      {(competition || venue || cairoKickoff || meccaKickoff) && (
        <dl className="mc-match-facts">
          {venue && <div><dt>الملعب</dt><dd dir="auto">{venue}</dd></div>}
          {competition && <div><dt>المسابقة</dt><dd>{competition}</dd></div>}
          {cairoKickoff && <div><dt>موعد القاهرة</dt><dd>{cairoKickoff}{cairoDay ? ` · ${cairoDay}` : ''}</dd></div>}
          {meccaKickoff && <div><dt>موعد مكة</dt><dd>{meccaKickoff}</dd></div>}
          {validDate(snapshot?.readAt) && (
            <div>
              <dt>وقت القراءة</dt>
              <dd>{formatInZone(snapshot.readAt, 'Africa/Cairo', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}</dd>
            </div>
          )}
        </dl>
      )}
      <p className="mc-pitch-disclaimer">رسم توضيحي للملعب فقط؛ لا يعرض مواقع لاعبين أو أحداث من دون إحداثيات موثقة.</p>
    </section>
  );
}
