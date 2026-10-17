import { useEffect, useState, type CSSProperties } from 'react';
import {
  canShowKickoff,
  canShowScore,
  dayLabelInZone,
  eventSymbol,
  formatInZone,
  kickoffLabel,
  pitchLanes,
  safeLogoUrl,
  type EventSymbol,
  type MatchDefinition,
  type MatchEvent,
  type MatchSnapshot,
  type MatchStatus,
  type PitchMarker,
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

/* أنواع الأحداث المعروفة تُعرَّب؛ وما لا تعرفه الخريطة يُعرض بنص المصدر
   (كما كان) بدل اختلاق اسم عربي له. */
const EVENT_LABELS: Partial<Record<MatchEvent['type'], string>> = {
  goal: 'هدف', penalty: 'هدف من ركلة جزاء', own_goal: 'هدف عكسي', missed_penalty: 'ركلة جزاء مهدرة',
  yellow_card: 'بطاقة صفراء', red_card: 'بطاقة حمراء', substitution: 'تبديل',
  var_cancelled: 'مراجعة فيديو — إلغاء', var_confirmed: 'مراجعة فيديو — تأكيد',
};

/** الدقيقة كما تصل: «55′» أو «45+2′» للبدل الضائع؛ وبلا دقيقة لا نخترع رقماً. */
function minuteText(event: MatchEvent): string | null {
  if (typeof event.minute !== 'number' || !Number.isFinite(event.minute) || event.minute < 0) return null;
  const extra = typeof event.extraMinute === 'number' && Number.isFinite(event.extraMinute) && event.extraMinute >= 0
    ? `+${event.extraMinute}`
    : '';
  return `${event.minute}${extra}′`;
}

/** وصف كامل للحدث: يُقرأ في `aria-label` ويُعرض في شريط التفاصيل عند التحديد. */
function eventDescription(event: MatchEvent): string | null {
  const kind = EVENT_LABELS[event.type] ?? event.sourceType;
  const team = event.teamSide === 'home' || event.teamSide === 'away' ? event.team : null;
  const side = event.teamSide === 'home' ? 'المضيف' : event.teamSide === 'away' ? 'الضيف' : null;
  const related = event.type === 'substitution' && event.relatedPlayer?.name
    ? `لاعب مرتبط: ${event.relatedPlayer.name}`
    : null;
  return [
    minuteText(event), kind, side, team, event.player?.name ?? null, related,
    event.cancelled ? 'ملغى من المصدر' : null,
    event.type === 'other' ? event.detail : null,
  ].filter((part): part is string => Boolean(part && part.trim())).join(' · ') || null;
}

/* ─────────── رموز الملعب ───────────
   أشكال مرسومة لا إيموجي: البطاقة مستطيل بلونها، والهدف كرة، والتبديل
   سهمان، وVAR شارة. الشكل نفسه يميّز الحدث حتى بلا لون (وضع التباين العالي
   أو عمى الألوان)، والنص الكامل يحمله `aria-label` وشريط التفاصيل. */
function BallShape() {
  return (
    <g>
      <circle cx="12" cy="12" r="8.2" fill="#f6faff" stroke="#0b0f16" strokeWidth="1.1" />
      <path d="M12 7.4 15.3 9.8l-1.3 3.8h-4L8.7 9.8 12 7.4Z" fill="#0b0f16" />
      <circle cx="9.1" cy="6" r="1.15" fill="#0b0f16" />
      <circle cx="14.9" cy="6" r="1.15" fill="#0b0f16" />
      <circle cx="6.6" cy="15.2" r="1.35" fill="#0b0f16" />
      <circle cx="17.4" cy="15.2" r="1.35" fill="#0b0f16" />
    </g>
  );
}

function EventIcon({ symbol }: { symbol: EventSymbol }) {
  if (symbol === 'yellow-card' || symbol === 'red-card') {
    return (
      <svg viewBox="0 0 24 24" className="mc-pitch-icon" aria-hidden="true" focusable="false">
        <rect
          x="8.4" y="3.2" width="7.6" height="17.6" rx="1.4"
          fill={symbol === 'yellow-card' ? '#ffd34d' : '#ff4d5e'}
          stroke="rgba(0,0,0,.35)" strokeWidth=".8" transform="rotate(8 12 12)"
        />
      </svg>
    );
  }

  if (symbol === 'substitution') {
    return (
      <svg viewBox="0 0 24 24" className="mc-pitch-icon" aria-hidden="true" focusable="false">
        <path
          d="M4 8.6h12.3l-2.7-2.7M20 15.4H7.7l2.7 2.7"
          fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (symbol === 'var') {
    return (
      <svg viewBox="0 0 24 24" className="mc-pitch-icon" aria-hidden="true" focusable="false">
        <rect x="2.2" y="7.2" width="19.6" height="9.6" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <text x="12" y="14.2" textAnchor="middle" fontSize="6.4" fontWeight="900" fontFamily="ui-sans-serif, system-ui" fill="currentColor">VAR</text>
      </svg>
    );
  }

  if (symbol === 'other') {
    return (
      <svg viewBox="0 0 24 24" className="mc-pitch-icon" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="3.4" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="mc-pitch-icon" aria-hidden="true" focusable="false">
      <BallShape />
      {symbol === 'penalty' && (
        <g>
          <circle cx="18.1" cy="18" r="4.2" fill="#0b0f16" stroke="currentColor" strokeWidth="1" />
          <text x="18.1" y="20.1" textAnchor="middle" fontSize="5.4" fontWeight="900" fill="currentColor">P</text>
        </g>
      )}
      {symbol === 'missed-penalty' && (
        <path d="m16.4 15.6 4.2 4.2m0-4.2-4.2 4.2" stroke="#ff6b75" strokeWidth="1.9" strokeLinecap="round" />
      )}
      {symbol === 'own-goal' && (
        <path
          d="M17.8 8.2a5.2 5.2 0 1 0 1.5 5.4m-1.5-5.4.5-3.1m-.5 3.1-3.1-.4"
          fill="none" stroke="#ffd34d" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

function MarkerButton({ event, active, onSelect }: {
  event: MatchEvent;
  active: boolean;
  onSelect: (event: MatchEvent | null) => void;
}) {
  const description = eventDescription(event);
  if (!description) return null;
  return (
    <button
      type="button"
      className="mc-pitch-marker"
      data-kind={event.cancelled ? 'cancelled' : event.type}
      data-symbol={eventSymbol(event.type)}
      data-side={event.teamSide ?? 'unknown'}
      data-minute={typeof event.minute === 'number' ? event.minute : undefined}
      data-active={active ? 'true' : 'false'}
      aria-label={description}
      onMouseEnter={() => onSelect(event)}
      onFocus={() => onSelect(event)}
      onMouseLeave={() => onSelect(null)}
      onBlur={() => onSelect(null)}
      onClick={() => onSelect(event)}
    >
      <EventIcon symbol={eventSymbol(event.type)} />
      <span className="mc-pitch-marker-minute" aria-hidden="true">{minuteText(event) ?? '—'}</span>
    </button>
  );
}

function PitchLane({ markers, side, label, selected, onSelect }: {
  markers: PitchMarker[];
  side: 'home' | 'away' | 'unknown';
  label: string;
  selected: MatchEvent | null;
  onSelect: (event: MatchEvent | null) => void;
}) {
  if (markers.length === 0) return null;
  const rows = Math.max(...markers.map(marker => marker.row + 1));
  /* الصفّان يلتصقان بخط الدقائق من الجهتين: المضيف تحته والضيف فوقه، فتُقرأ
     الأحداث قرب محورها الزمني بدل أن تطفو في فراغ الملعب. */
  return (
    <ol
      className={`mc-pitch-lane mc-pitch-lane--${side}`}
      aria-label={label}
      style={{ '--mc-lane-rows': String(rows) } as CSSProperties}
    >
      {markers.map(marker => (
        <li
          key={marker.key}
          className="mc-pitch-marker-item"
          style={{ insetInlineStart: `${marker.position}%`, '--mc-marker-row': String(marker.row) } as CSSProperties}
        >
          <MarkerButton event={marker.event} active={selected === marker.event} onSelect={onSelect} />
        </li>
      ))}
    </ol>
  );
}

/** خط الدقائق: 0 عند اليمين (اتجاه الصفحة) و90 عند اليسار. */
function TimelineAxis({ totalMinutes }: { totalMinutes: number }) {
  const ticks: number[] = [];
  for (let minute = 0; minute <= totalMinutes; minute += 15) ticks.push(minute);
  return (
    <div className="mc-pitch-axis" aria-hidden="true">
      {ticks.map(minute => {
        const edge = minute === 0 ? ' mc-pitch-tick--first' : minute === totalMinutes ? ' mc-pitch-tick--last' : '';
        /* على الشاشات الضيقة تبقى علامات 0/45/90 وحدها، فلا تتراكب الأرقام. */
        const major = minute === 0 || minute === totalMinutes || minute === 45 ? '' : ' mc-pitch-tick--minor';
        return (
          <span
            key={minute}
            className={`mc-pitch-tick${edge}${major}`}
            style={{ insetInlineStart: `${(minute / totalMinutes) * 100}%` }}
          >
            <i />
            <b>{minute}′</b>
          </span>
        );
      })}
    </div>
  );
}

/**
 * أحداث المباراة على الملعب: الموضع الأفقي هو الدقيقة وحدها (المصدر لا يرسل
 * إحداثيات x/y)، والصف هو الفريق. التوقفات (`Start Delay`/`End Delay`)
 * تُخفى في طبقة العقد، ولا تدخل الشريط إطلاقاً.
 */
function PitchEvents({ snapshot }: { snapshot: MatchSnapshot | null }) {
  const [selected, setSelected] = useState<MatchEvent | null>(null);
  const lanes = pitchLanes(Array.isArray(snapshot?.events) ? snapshot.events : []);
  const count = lanes.home.length + lanes.away.length + lanes.unknown.length + lanes.untimed.length;
  if (count === 0) return null;
  const detail = selected ? eventDescription(selected) : null;

  return (
    <section className="mc-pitch-events" aria-labelledby="mc-pitch-events-title">
      <h2 id="mc-pitch-events-title" className="mc-pitch-events-title">أحداث المباراة</h2>
      <div className="mc-pitch-timeline">
        <PitchLane markers={lanes.home} side="home" label="أحداث المضيف" selected={selected} onSelect={setSelected} />
        <TimelineAxis totalMinutes={lanes.totalMinutes} />
        <PitchLane markers={lanes.away} side="away" label="أحداث الضيف" selected={selected} onSelect={setSelected} />
        <PitchLane markers={lanes.unknown} side="unknown" label="أحداث غير منسوبة" selected={selected} onSelect={setSelected} />
        {lanes.untimed.length > 0 && (
          <ol className="mc-pitch-lane mc-pitch-lane--untimed" aria-label="أحداث بلا دقيقة">
            {lanes.untimed.map(({ event, key }) => (
              <li key={key} className="mc-pitch-marker-item mc-pitch-marker-item--untimed">
                <MarkerButton event={event} active={selected === event} onSelect={setSelected} />
              </li>
            ))}
          </ol>
        )}
      </div>
      <p className="mc-pitch-event-detail" aria-live="polite">
        {detail ?? 'مرّر المؤشر فوق الرمز أو اضغط عليه لعرض تفاصيل الحدث.'}
      </p>
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

/** ملعب تخطيطي: الفريقان والنتيجة، وأحداث المباراة كرموز على شريط زمني. */
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

        <PitchEvents snapshot={snapshot} />
      </div>

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
      <p className="mc-pitch-disclaimer">الشريط الزمني أعلاه يعرض الدقيقة وجهة الفريق فقط؛ مواضع الأحداث داخل الملعب غير مرسومة لأن المصدر لا يرسل إحداثياتها. مرّر المؤشر أو اضغط على أي رمز لعرض تفاصيله.</p>
    </section>
  );
}
