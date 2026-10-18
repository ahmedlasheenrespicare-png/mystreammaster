import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  canShowKickoff,
  canShowScore,
  describeEvent,
  eventKey,
  eventMinuteLabel,
  eventSymbol,
  formatInZone,
  kickoffLabel,
  lineupPitchSides,
  pitchLanes,
  safeLogoUrl,
  type MatchDefinition,
  type MatchEvent,
  type MatchSnapshot,
  type MatchStatus,
  type PitchMarker,
  type PitchLineupPlayer,
} from '../lib/match-center.mjs';
import EventIcon from './MatchCenterSymbols';
import type { MatchCenterTools } from './useMatchCenterTools';

/* ==========================================================================
   لوحة الملعب: النتيجة والفريقان والحالة، ثم شريط أحداث المباراة.
   --------------------------------------------------------------------------
   الترتيب البصري مقصود: النتيجة في الوسط بين الفريقين، وفوقها المسابقة
   وحالتها ودقيقتها، وتحتها مباشرةً شريط الأحداث — لأن الشريط يُقرأ بدقائقه
   لا بوصفٍ مستقل. وتحت الملعب تُصفّ تفاصيل الملعب والموعد ووقت القراءة.

   لا يُرسم شيء من عندنا: الشعار من المصدر بحدّ `https://` وحده، والدقيقة كما
   وصلت، ومواضع الأحداث داخل الملعب غير مرسومة لأن المصدر لا يرسل إحداثيات.
========================================================================== */

function LineupPlayer({ player, matchId, tools, onHover }: {
  player: PitchLineupPlayer; matchId: string; tools?: MatchCenterTools;
  onHover: (event: MatchEvent | null) => void;
}) {
  return (
    <li className="mc-lineup-player" data-player-id={player.id}>
      <div className="mc-player-badges">
        {player.badges.map(badge => {
          const key = eventKey(matchId, badge.event);
          const selected = tools?.selectedEventKey === key;
          return (
            <button type="button" className="mc-player-badge" key={key} data-event-key={key}
              data-kind={badge.event.cancelled ? 'cancelled' : badge.event.type}
              data-minute={badge.event.minute} data-active={selected ? 'true' : 'false'}
              aria-label={`${badge.label}${badge.role ? ` · ${badge.role}` : ''}`}
              aria-pressed={selected} aria-controls="mc-lineup-event-detail"
              onMouseEnter={() => onHover(badge.event)} onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(badge.event)} onBlur={() => onHover(null)}
              onClick={() => tools?.selectEvent(key)}>
              <EventIcon symbol={eventSymbol(badge.event.type)} />
              <span>{badge.role ?? badge.typeLabel}</span>
              <bdi dir="ltr">{badge.minute}</bdi>
            </button>
          );
        })}
      </div>
      <span className="mc-player-shirt" aria-label={player.shirtNumber != null ? `رقم القميص ${player.shirtNumber}` : undefined}>
        {player.shirtNumber ?? '—'}
      </span>
      <span className="mc-player-name" dir="auto">{player.name}</span>
      <small dir="ltr">{player.positionCode}</small>
    </li>
  );
}

function PitchLineups({ match, snapshot, tools }: {
  match: MatchDefinition; snapshot: MatchSnapshot | null; tools?: MatchCenterTools;
}) {
  const sides = useMemo(() => lineupPitchSides({ match, snapshot }), [match, snapshot]);
  const [hovered, setHovered] = useState<MatchEvent | null>(null);
  useEffect(() => setHovered(null), [snapshot]);
  if (!sides.length) return null;
  return (
    <section className="mc-pitch-lineups" aria-label="التشكيلة الأساسية المؤكدة على الملعب">
      <h2>التشكيلة الأساسية المؤكدة</h2>
      <p className="mc-lineup-explainer">توزيع تخطيطي حسب مراكز المصدر، وليس إحداثيات أو حركة فعلية. تبقى التشكيلة الأساسية ثابتة؛ شارات التبديلات لا تغيّر مواقع اللاعبين.</p>
      <div className="mc-lineup-squads">
        {sides.map(squad => (
          <section className="mc-lineup-squad" key={squad.side} data-side={squad.side} aria-label={squad.teamName}>
            <h3>{squad.teamName}{squad.formation && <bdi dir="ltr"> · {squad.formation}</bdi>}</h3>
            <div className="mc-lineup-rows">
              {squad.rows.map(row => (
                <div className="mc-lineup-row" key={row.label}>
                  <h4>{row.label}</h4>
                  <ul>{row.players.map(player => <LineupPlayer key={player.id} player={player} matchId={match.id} tools={tools} onHover={setHovered} />)}</ul>
                </div>
              ))}
            </div>
            {squad.substitutes.length > 0 && (
              <div className="mc-lineup-bench">
                <h4>البدلاء المرتبطون بأحداث — خارج توزيع الأساسيين</h4>
                <ul>{squad.substitutes.map(player => <LineupPlayer key={player.id} player={player} matchId={match.id} tools={tools} onHover={setHovered} />)}</ul>
              </div>
            )}
          </section>
        ))}
      </div>
      <p className="mc-lineup-event-detail" id="mc-lineup-event-detail" aria-live="polite">
        {describeEvent(hovered ?? tools?.selectedEvent) ?? 'مرّر المؤشر أو ركّز على الشارة لقراءة تفاصيلها، واضغط لتثبيتها أو إلغاء تثبيتها.'}
      </p>
    </section>
  );
}

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

/* ─────────── رموز الملعب ───────────
   الأشكال في `MatchCenterSymbols` وحدها: الرمز نفسه يظهر على الشريط وفي قائمة
   التحليل، فرسمُه مرتين يعني رمزين مختلفين للحدث الواحد. */

function MarkerButton({ event, matchId, active, onHover, onPin }: {
  event: MatchEvent;
  matchId: string;
  active: boolean;
  onHover: (event: MatchEvent | null) => void;
  onPin: (key: string) => void;
}) {
  const description = describeEvent(event);
  if (!description) return null;
  return (
    <button
      type="button"
      className="mc-pitch-marker"
      data-event-key={eventKey(matchId, event)}
      data-kind={event.cancelled ? 'cancelled' : event.type}
      data-symbol={eventSymbol(event.type)}
      data-side={event.teamSide ?? 'unknown'}
      data-minute={typeof event.minute === 'number' ? event.minute : undefined}
      data-active={active ? 'true' : 'false'}
      aria-label={description}
      onMouseEnter={() => onHover(event)}
      onFocus={() => onHover(event)}
      onMouseLeave={() => onHover(null)}
      onBlur={() => onHover(null)}
      onClick={() => onPin(eventKey(matchId, event))}
    >
      <EventIcon symbol={eventSymbol(event.type)} />
      <span className="mc-pitch-marker-minute" aria-hidden="true">{eventMinuteLabel(event) ?? '—'}</span>
    </button>
  );
}

function PitchLane({ markers, side, label, selectedKey, matchId, onHover, onPin }: {
  markers: PitchMarker[];
  side: 'home' | 'away' | 'unknown';
  label: string;
  selectedKey: string | null;
  matchId: string;
  onHover: (event: MatchEvent | null) => void;
  onPin: (key: string) => void;
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
          <MarkerButton
            event={marker.event}
            matchId={matchId}
            active={selectedKey === eventKey(matchId, marker.event)}
            onHover={onHover}
            onPin={onPin}
          />
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
 * إحداثيات x/y)، والصف هو فريقه. التوقفات (`Start Delay`/`End Delay`) تُخفى في
 * طبقة العقد، ولا تدخل الشريط إطلاقاً.
 *
 * التحديد حالة مشتركة مع قسم التحليل: التمرير بالماوس معاينةٌ لحظية، والنقر
 * تثبيتٌ يبقى بعد أن تبرم الماوس — وهذا ما يجعل «الحدث المختار» مفهوماً واحداً
 * في الصفحة.
 */
function PitchEvents({ snapshot, matchId, tools }: {
  snapshot: MatchSnapshot | null;
  matchId: string;
  tools?: MatchCenterTools;
}) {
  const [hovered, setHovered] = useState<MatchEvent | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const lanes = useMemo(() => pitchLanes(Array.isArray(snapshot?.events) ? snapshot.events : []), [snapshot]);
  const allMarkers = useMemo(
    () => [...lanes.home, ...lanes.away, ...lanes.unknown, ...lanes.untimed.map(entry => ({ ...entry, position: 0, row: 0, minute: 0 }))],
    [lanes],
  );
  const count = allMarkers.length;

  const pinnedKey = tools?.selectedEventKey ?? null;
  const pinned = useMemo(() => {
    if (!pinnedKey) return null;
    const found = allMarkers.find(marker => eventKey(matchId, marker.event) === pinnedKey);
    return found ? found.event : null;
  }, [allMarkers, matchId, pinnedKey]);

  /* طلب «إظهار على الشريط» من التحليل: يمرّر التركيز إلى العلامة نفسها، فيقرأ
     الناطق وصفها وتظهر تفاصيلها كما لو حُدِّدت هنا. */
  const reveal = tools?.reveal ?? null;
  useEffect(() => {
    if (!reveal) return;
    const root = sectionRef.current;
    if (!root) return;
    const markers = Array.from(root.querySelectorAll<HTMLElement>('.mc-pitch-marker[data-event-key]'));
    const node = markers.find(marker => marker.getAttribute('data-event-key') === reveal.key) ?? null;
    if (!node) return;
    node.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'auto' });
    node.focus({ preventScroll: true });
  }, [reveal]);

  if (count === 0) return null;
  const detailEvent = hovered ?? pinned;
  const detail = detailEvent ? describeEvent(detailEvent) : null;

  return (
    <section className="mc-pitch-events" ref={sectionRef} aria-labelledby="mc-pitch-events-title">
      <h2 id="mc-pitch-events-title" className="mc-pitch-events-title">
        أحداث المباراة
        <span className="mc-pitch-events-count" aria-hidden="true">{new Intl.NumberFormat('ar-EG').format(count)}</span>
      </h2>
      <div className="mc-pitch-timeline">
        <PitchLane markers={lanes.home} side="home" label="أحداث المضيف" selectedKey={pinnedKey} matchId={matchId} onHover={setHovered} onPin={key => tools?.selectEvent(key)} />
        <TimelineAxis totalMinutes={lanes.totalMinutes} />
        <PitchLane markers={lanes.away} side="away" label="أحداث الضيف" selectedKey={pinnedKey} matchId={matchId} onHover={setHovered} onPin={key => tools?.selectEvent(key)} />
        <PitchLane markers={lanes.unknown} side="unknown" label="أحداث غير منسوبة" selectedKey={pinnedKey} matchId={matchId} onHover={setHovered} onPin={key => tools?.selectEvent(key)} />
        {lanes.untimed.length > 0 && (
          <ol className="mc-pitch-lane mc-pitch-lane--untimed" aria-label="أحداث بلا دقيقة">
            {lanes.untimed.map(({ event, key }) => (
              <li key={key} className="mc-pitch-marker-item mc-pitch-marker-item--untimed">
                <MarkerButton
                  event={event}
                  matchId={matchId}
                  active={pinnedKey === eventKey(matchId, event)}
                  onHover={setHovered}
                  onPin={pinKey => tools?.selectEvent(pinKey)}
                />
              </li>
            ))}
          </ol>
        )}
      </div>
      <p className="mc-pitch-event-detail" aria-live="polite">
        {detail ?? 'مرّر المؤشر فوق الرمز أو اضغط عليه لعرض تفاصيل الحدث.'}
        {pinned && !hovered && <span className="mc-pitch-event-pinned"> — مثبَّت</span>}
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
  tools?: MatchCenterTools;
}

/** ملعب تخطيطي: الفريقان والنتيجة، وأحداث المباراة كرموز على شريط زمني. */
export default function MatchCenterVisuals({ match, snapshot, status, flash = null, fresh = false, tools }: MatchCenterVisualsProps) {
  const homeName = cleanText(match.home.name) ?? cleanText(match.home.sourceName) ?? cleanText(match.home.shortName);
  const awayName = cleanText(match.away.name) ?? cleanText(match.away.sourceName) ?? cleanText(match.away.shortName);
  const score = snapshot?.score ?? null;
  const showScore = canShowScore(status, score);
  const competition = cleanText(match.competitionName);
  const season = cleanText(match.season);
  const round = typeof match.round === 'number' && Number.isFinite(match.round)
    ? String(match.round)
    : cleanText(match.round);
  /* عند وصول لقطة حديثة، لا نُبقي ملعباً قديماً إذا غاب عن القراءة. وقبل
     أول قراءة يستخدم HTML الثابت قيمة الملعب المؤكدة في تعريف المباراة. */
  const venue = snapshot ? cleanText(snapshot.venue) : cleanText(match.venue);
  const kickoff = canShowKickoff(status) && validDate(match.kickoffUtc) ? match.kickoffUtc : null;
  const statusLabel = cleanText(status?.label);
  const clock = cleanText(status?.clock);
  const title = homeName && awayName
    ? `مركز المباراة · ${homeName} ضد ${awayName}`
    : 'مركز المباراة';

  /* سطر المسابقة: اسم البطولة ثم الموسم ثم الجولة، بما وصل فقط. */
  const competitionLine = [competition, season ? `موسم ${season}` : null, round ? `الجولة ${round}` : null]
    .filter((part): part is string => Boolean(part))
    .join(' · ');

  let cairoKickoff: string | null = null;
  let cairoDay: string | null = null;
  let meccaKickoff: string | null = null;
  if (kickoff) {
    try {
      cairoKickoff = kickoffLabel(kickoff, 'Africa/Cairo');
      cairoDay = formatInZone(kickoff, 'Africa/Cairo', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      meccaKickoff = kickoffLabel(kickoff, 'Asia/Riyadh');
    } catch {
      /* التاريخ غير صالح: تُحذف معلومة الموعد بدلاً من إظهار قيمة بديلة. */
    }
  }

  const readAtLabel = validDate(snapshot?.readAt)
    ? formatInZone(snapshot.readAt, 'Africa/Cairo', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    : null;

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
          {competitionLine && <span className="mc-pitch-competition">{competitionLine}</span>}
          {(statusLabel || clock) && (
            <p className="mc-pitch-statusline">
              {statusLabel && <span className="mc-pitch-status" data-code={status?.code ?? 'unknown'} data-fresh={fresh ? 'true' : 'false'}>{statusLabel}</span>}
              {clock && <span className="mc-pitch-clock" dir="ltr">{clock}</span>}
            </p>
          )}
          {showScore && score ? (
            <p className="mc-pitch-score" aria-label={`نتيجة المضيف ${score.home}، ثم الضيف ${score.away}`}>
              <span className="mc-score-order">{score.home}<span aria-hidden="true">–</span>{score.away}</span>
            </p>
          ) : (
            <span className="mc-pitch-vs" aria-label="مواجهة بين الفريقين">VS</span>
          )}
          {cairoKickoff && (
            <span className="mc-pitch-kickoff">
              {cairoKickoff}{cairoDay ? ` · ${cairoDay}` : ''}
            </span>
          )}
        </div>

        <Team match={match} snapshot={snapshot} side="away" flash={flash === 'away'} />

        <PitchEvents snapshot={snapshot} matchId={match.id} tools={tools} />
        <PitchLineups match={match} snapshot={snapshot} tools={tools} />
      </div>

      {(venue || competitionLine || cairoKickoff || meccaKickoff || readAtLabel) && (
        <dl className="mc-match-facts">
          {venue && <div><dt>الملعب</dt><dd dir="auto">{venue}</dd></div>}
          {competition && <div><dt>المسابقة</dt><dd>{competition}</dd></div>}
          {season && <div><dt>الموسم</dt><dd dir="auto">{season}</dd></div>}
          {round && <div><dt>الجولة</dt><dd className="mc-num">{round}</dd></div>}
          {cairoKickoff && <div><dt>موعد القاهرة</dt><dd>{cairoKickoff}{cairoDay ? ` · ${cairoDay}` : ''}</dd></div>}
          {meccaKickoff && <div><dt>موعد مكة</dt><dd>{meccaKickoff}</dd></div>}
          {readAtLabel && <div><dt>وقت القراءة</dt><dd>{readAtLabel}</dd></div>}
        </dl>
      )}
      <p className="mc-pitch-disclaimer">الشريط الزمني أعلاه يعرض الدقيقة وجهة الفريق فقط؛ شارات اللاعبين، إن توفرت تشكيلة مؤكدة، تربط الحدث بصاحبه لا بموقع حدوثه. مرّر المؤشر أو اضغط على أي رمز لعرض تفاصيله، والنقر يثبّته.</p>
    </section>
  );
}
