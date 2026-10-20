import { useEffect, useRef, useState } from 'react';
import { matchByFixtureId } from '../lib/match-center.mjs';
import { matchCenterPath, MATCH_CENTER_ALL_MATCHES } from '../content/match-center.mjs';
import {
  TIME_ZONES,
  classifyFetchError,
  dayInZone,
  dayLabel,
  describeDiagnostic,
  hasCompleteScore,
  kickoff,
  matchesForDay,
  readScoreboardResponse,
  scoreboardUrl,
  weekDays,
  type Match,
  type MatchTeam,
} from '../lib/matches.mjs';

/* ==========================================================================
   لوحة المباريات الحيّة لصفحات هبوط البطولات والمنتخبات
   --------------------------------------------------------------------------
   نفس ميكانيزم /matches/: جلب من /scoreboard.php عبر وسيط الخادم، تحديث كل
   دقيقة، وتشخيص واضح عند الأعطال. لا نتائج ولا توقيتات تُحسب محلياً.
   layout="race" (صفحات البطولات): شبكة كروت أفقية تتحرك تلقائياً من الأقرب
   موعداً إلى الأبعد (matchesForDay ترتّب تصاعدياً) — تصميم الكرت من قالب
   uiverse.io/sofiapetushok/jolly-snail-62 مكيّفاً بهوية الموقع، بلا حذف أي
   محتوى أو نص. الحركة تتوقف عند التحويم/اللمس/التركيز/خروج الشريط من
   الشاشة، وتُعطَّل كلياً مع prefers-reduced-motion. لوحة /matches/ المركزية
   وصفحات المنتخبات تبقيان على القائمة الافتراضية layout="list".
   ========================================================================== */

const REFRESH_MS = 60_000;
type Board = { matches: Match[]; updated: string };

function FootballIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="m12 7 4.8 3.5-1.8 5.6H9l-1.8-5.6L12 7Zm0-5v5m4.8 3.5 4.7-1.7M15 16.1l3 4M9 16.1l-3 4m1.2-9.6L2.5 8.8" />
    </svg>
  );
}

function Team({ team }: { team: MatchTeam }) {
  return (
    <div className="match-team">
      {team.logo ? (
        <img src={team.logo} alt="" loading="lazy" width="40" height="40" onError={e => { e.currentTarget.style.visibility = 'hidden'; }} />
      ) : (
        <span className="team-placeholder" aria-hidden="true"><FootballIcon /></span>
      )}
      <span dir="auto">{team.name}</span>
    </div>
  );
}

/* كرت الشريط (jolly-snail-62): عند وجود مركز مباراة موثّق يطابق معرّف
   المصدر (espn event id عبر matchByFixtureId — الطريق الوحيد المقبول
   للربط) يصبح الكرت كله رابطاً إلى صفحة المركز، مع شارة إضافية لا بديل؛
   ولا رابط حين لا يوجد مركز فلا يُخمَّن مسار. */
function RaceCard({ match, groupName, zone, timeZones }: {
  match: Match;
  groupName: string;
  zone: string;
  timeZones: { id: string; name: string }[];
}) {
  /* معرّف المباراة الحيّ مركّب «league.id:eventId» — فالربط بمعرّف
     المصدر الخام بعد نزع البادئة، والفاصل نقطة واحدة لأن معرّفات
     الدورات لا تحوي نقطتين. */
  const sourceEventId = match.id.includes(':') ? match.id.slice(match.id.indexOf(':') + 1) : match.id;
  const center = matchByFixtureId(MATCH_CENTER_ALL_MATCHES, 'espn', sourceEventId);
  const cls = `match-card ${match.state === 'live' ? 'is-live' : ''}${center ? ' has-center' : ''}`;
  const body = (
    <>
      <div className="match-card-top">
        <span className={`match-status status-${match.state}`}>{match.state === 'live' ? `● مباشر · ${match.detail}` : match.detail}</span>
        {match.venue && <span className="match-venue" dir="auto">{match.venue}</span>}
      </div>
      {/* لوحا الفريقين المائلان + خطّ التقدّم النقطي بينهما (زخرفي) —
          النتيجة/الموعد تحتها كما هي */}
      <div className="match-contest">
        <Team team={match.home} />
        <span className="match-dots" aria-hidden="true"><i className="match-dots-load" /></span>
        <Team team={match.away} />
      </div>
      <div className="match-scoreboard">
        <div className="match-score">
          {match.state === 'live' || match.state === 'finished' ? (
            <strong aria-label={hasCompleteScore(match.home.score, match.away.score) ? `نتيجة المضيف ${match.home.score}، ثم الضيف ${match.away.score}` : 'النتيجة غير مكتملة'}>
              {hasCompleteScore(match.home.score, match.away.score) ? <>{match.home.score} <span>:</span> {match.away.score}</> : '—'}
            </strong>
          ) : (
            <><strong>{kickoff(match.date, zone)}</strong><small>موعد البداية</small></>
          )}
        </div>
      </div>
      <div className="match-times">
        {timeZones.map(z => (
          <div key={z.id}>
            <span>{z.id === 'Asia/Riyadh' ? 'مكة' : z.id === 'Africa/Cairo' ? 'مصر' : z.name}</span>
            <time dateTime={match.date}>{kickoff(match.date, z.id)}</time>
            <small>{dayLabel(dayInZone(new Date(match.date), z.id))}</small>
          </div>
        ))}
      </div>
      <span className="match-watermark" aria-hidden="true">{groupName}</span>
      {center && <span className="match-center-chip" aria-hidden="true">مركز المباراة</span>}
    </>
  );
  if (center) {
    return (
      <a
        className={cls}
        href={matchCenterPath(center)}
        aria-label={`${match.home.name} ضد ${match.away.name} — انتقل إلى مركز المباراة`}
      >{body}</a>
    );
  }
  return <article className={cls}>{body}</article>;
}

/** مطابقة اسم الفريق كما يرسله المصدر مع أسماء المنتخب المعتمدة */
export function matchesTeamFilter(match: Match, aliases: string[]): boolean {
  const names = [match.home.name, match.away.name].map(n => n.trim().toLocaleLowerCase());
  return names.some(name =>
    aliases.some(alias => {
      const a = alias.trim().toLocaleLowerCase();
      return a === name || name.includes(a) || a.includes(name);
    })
  );
}

export interface LiveMatchesBoardProps {
  /** البطولات المطلوب جلبها من مصدر البيانات */
  leagues: { id: string; name: string }[];
  /** إن وُجدت: تُعرض مباريات هذه الأسماء فقط (صفحات المنتخبات) */
  teamFilter?: string[];
  heading: string;
  note: string;
  /** بلوك «عن البيانات والتوقيت» — تُخفيه صفحات البطولات (نُقل
      نصه إلى قسم «البيانات والمصادر» أسفل الصفحة) وتُبقيه
      صفحات المنتخبات على القيمة الافتراضية */
  dataNote?: boolean;
  /** list (افتراضي): قائمة شبكية كما في /matches/ وصفحات المنتخبات.
      race: شريط كروت متحرك تلقائياً بتصميم jolly-snail-62 لصفحات البطولات */
  layout?: 'list' | 'race';
}

/* حركة الشريط التلقائية: تتقدّم من الأقرب موعداً إلى الأبعد (ترتيب DOM هو
   ترتيب matchesForDay التصاعدي) ثم تتوقف لحظة وتعود للبداية. تتوقف عند
   التحويم أو اللمس أو التركيز أو التمرير اليدوي أو خروج الشريط من الشاشة
   أو إخفاء التبويب، ولا تعمل إطلاقاً مع prefers-reduced-motion. */
function useRaceAutoScroll(enabled: boolean) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const elRef = useRef<HTMLDivElement | null>(null);
  const paused = useRef(false);
  const visible = useRef(true);
  const resumeTimer = useRef(0);

  /* إيقاف/استئناف مشترك بين الحركة التلقائية وأزرار السهمين */
  const stopAuto = () => { paused.current = true; window.clearTimeout(resumeTimer.current); };
  const resumeSoon = (delay: number) => {
    window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => { paused.current = false; }, delay);
  };

  /* خطوة سهم واحدة: كرت واحد في اتّجاه السهم، وعند الطرفين تلتفّ للطرف
     الآخر كما تفعل الحركة التلقائية. تقليل الحركة يجعل القفز فورياً. */
  const nudge = (dir: 1 | -1) => {
    const node = elRef.current;
    if (!node) return;
    const max = node.scrollWidth - node.clientWidth;
    if (max <= 1) return;
    const rtl = getComputedStyle(node).direction === 'rtl';
    const towardEnd = dir === -1;
    const atEnd = Math.abs(node.scrollLeft) >= max - 1;
    const atStart = Math.abs(node.scrollLeft) <= 1;
    stopAuto();
    if (towardEnd && atEnd) node.scrollTo({ left: 0, behavior: 'auto' });
    else if (!towardEnd && atStart) node.scrollTo({ left: rtl ? -max : max, behavior: 'auto' });
    else {
      const card = node.querySelector('.match-card');
      const step = (card ? card.getBoundingClientRect().width : 400) + 14;
      const sign = towardEnd ? (rtl ? -1 : 1) : (rtl ? 1 : -1);
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      node.scrollBy({ left: sign * step, behavior: reduced ? 'auto' : 'smooth' });
    }
    resumeSoon(4000);
  };

  const ref = (node: HTMLDivElement | null) => { elRef.current = node; setEl(node); };

  useEffect(() => {
    if (!el || !enabled) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const observer = new IntersectionObserver(entries => { visible.current = entries[0]?.isIntersecting ?? true; }, { threshold: 0.15 });
    observer.observe(el);
    let raf = 0;
    let holdUntil = 0;
    /* متراكم كسري: مواضع التمرير أعداد صحيحة، فـ +0.5 يُقرَّب إلى الصفر في
       RTL ولا يتحرك أبداً — نراكم ونخطو بكسور صحيحة (1px كل إطارين ≈ 30px/s) */
    let acc = 0;
    const onMouseLeave = () => resumeSoon(0);
    const onFocusIn = () => stop();
    const onFocusOut = () => resumeSoon(0);
    const onPointerDown = () => stopAuto();
    const onPointerUp = () => resumeSoon(4000);
    const onWheel = () => resumeSoon(4000);
    const onTouchMove = () => resumeSoon(4000);
    const onVisibility = () => { if (document.hidden) stop(); };
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (paused.current || media.matches || document.hidden || !visible.current) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 1) return;
      /* RTL: التمرير يتقدّم نحو القيم السالبة */
      const dir = getComputedStyle(el).direction === 'rtl' ? -1 : 1;
      if (Math.abs(el.scrollLeft) >= max - 1) {
        if (!holdUntil) { holdUntil = now + 1800; return; }
        if (now < holdUntil) return;
        el.scrollLeft = 0;
        holdUntil = 0;
        return;
      }
      holdUntil = 0;
      /* مواضع التمرير أعداد صحيحة: +0.5 يُقرَّب إلى الصفر في RTL فلا حركة —
         نراكم كسرياً ونخطو بكسور صحيحة (1px كل إطارين ≈ 30px/s) */
      acc += 0.5;
      const step = Math.floor(acc);
      if (step >= 1) {
        el.scrollLeft += dir * step;
        acc -= step;
      }
    };
    el.addEventListener('mouseenter', stopAuto);
    el.addEventListener('mouseleave', onMouseLeave);
    el.addEventListener('focusin', onFocusIn);
    el.addEventListener('focusout', onFocusOut);
    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    el.addEventListener('wheel', onWheel, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resumeTimer.current);
      observer.disconnect();
      el.removeEventListener('mouseenter', stopAuto);
      el.removeEventListener('mouseleave', onMouseLeave);
      el.removeEventListener('focusin', onFocusIn);
      el.removeEventListener('focusout', onFocusOut);
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [el, enabled]);

  return { ref, nudge };
}

export default function LiveMatchesBoard({ leagues, teamFilter, heading, note, dataNote = true, layout = 'list' }: LiveMatchesBoardProps) {
  const race = useRaceAutoScroll(layout === 'race');
  // SSR ثابت: التواريخ والتفضيلات تُملأ بعد الترطيب.
  const [zone, setZone] = useState('Asia/Riyadh');
  const [today, setToday] = useState('');
  const [day, setDay] = useState('');
  const [boards, setBoards] = useState<Record<string, Board>>({});
  const [failed, setFailed] = useState<string[]>([]);
  const [diagnostics, setDiagnostics] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [online, setOnline] = useState(true);
  const [zones, setZones] = useState(TIME_ZONES);
  const refreshNow = useRef<() => void>(() => {});
  const selectedDate = useRef<HTMLButtonElement>(null);
  const calendarDay = useRef('');

  useEffect(() => {
    const intl = Intl as typeof Intl & { supportedValuesOf?: (key: 'timeZone') => string[] };
    const all = intl.supportedValuesOf?.('timeZone') || [];
    setZones([...TIME_ZONES, ...all.filter(id => !TIME_ZONES.some(z => z.id === id)).map(id => ({ id, name: id.replace(/_/g, ' ') }))]);
    try {
      const saved = localStorage.getItem('sm-matches-zone');
      if (saved) { new Intl.DateTimeFormat('en', { timeZone: saved }); setZone(saved); }
    } catch { /* التخزين قد يتعذر — الافتراضي مكة */ }
    const updateOnline = () => setOnline(navigator.onLine);
    updateOnline();
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => { window.removeEventListener('online', updateOnline); window.removeEventListener('offline', updateOnline); };
  }, []);

  useEffect(() => {
    const updateDate = () => {
      const next = dayInZone(new Date(), zone);
      const previous = calendarDay.current;
      calendarDay.current = next;
      setToday(next);
      if (previous !== next) setDay(selected => !selected || selected === previous || !weekDays(next).includes(selected) ? next : selected);
    };
    updateDate();
    try { localStorage.setItem('sm-matches-zone', zone); } catch { /* تفضيل اختياري */ }
    const timer = window.setInterval(updateDate, 30_000);
    return () => window.clearInterval(timer);
  }, [zone]);

  useEffect(() => {
    selectedDate.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [day]);

  useEffect(() => {
    if (!day) return;
    let disposed = false;
    let busy = false;
    let controller: AbortController | undefined;
    const current: Record<string, Board> = {};
    setBoards({}); setFailed([]); setDiagnostics({}); setHasLoaded(false);
    const refresh = async () => {
      if (disposed || busy || document.hidden || !navigator.onLine) { if (!navigator.onLine) setLoading(false); return; }
      busy = true; setLoading(true);
      controller = new AbortController();
      const signal = controller.signal;
      const timeout = window.setTimeout(() => controller?.abort(), 15_000);
      const results = await Promise.allSettled(leagues.map(async entry => {
        const response = await fetch(scoreboardUrl(entry.id, day), { signal, cache: 'no-store' });
        return readScoreboardResponse(response, entry);
      }));
      window.clearTimeout(timeout);
      if (disposed) return;
      const failures: string[] = [];
      const nextDiagnostics: Record<string, string> = {};
      results.forEach((result, i) => {
        const id = leagues[i].id;
        if (result.status === 'fulfilled') {
          current[id] = { matches: result.value.matches, updated: result.value.updated };
          if (result.value.stale) {
            failures.push(id);
            nextDiagnostics[id] = result.value.diagnostic || 'STALE_CACHE';
          }
        } else {
          failures.push(id);
          nextDiagnostics[id] = classifyFetchError(result.reason);
        }
      });
      setBoards({ ...current }); setFailed(failures); setDiagnostics(nextDiagnostics); setLoading(false); setHasLoaded(true); busy = false;
    };
    void refresh();
    refreshNow.current = () => { void refresh(); };
    const timer = window.setInterval(() => { void refresh(); }, REFRESH_MS);
    const resume = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', resume);
    return () => { disposed = true; controller?.abort(); window.clearInterval(timer); document.removeEventListener('visibilitychange', resume); window.removeEventListener('online', resume); refreshNow.current = () => {}; };
    // leagues ثابتة لكل صفحة (من بيانات المحتوى) — لا حاجة لإعادة الجلب عند تغييرها.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  const dailyMatches = selectVisibleMatches(boards, day, zone, teamFilter);
  const groups = leagues.map(entry => ({ ...entry, matches: dailyMatches.filter(m => m.league === entry.id) })).filter(entry => entry.matches.length);
  const updated = Object.values(boards).map(b => b.updated).sort().slice(-1)[0];
  const unavailable = failed.length === leagues.length && !Object.keys(boards).length;
  const activeCodes = Array.from(new Set(failed.map(id => diagnostics[id]).filter(Boolean)));
  const selectedZoneName = zones.find(z => z.id === zone)?.name || zone;
  const timeZones = TIME_ZONES.slice(0, 3).concat(TIME_ZONES.slice(0, 3).some(z => z.id === zone) ? [] : [{ id: zone, name: selectedZoneName }]);

  return (
    <section className={`matches-board${layout === 'race' ? ' matches-board--race' : ''}`} aria-labelledby="board-title">
      <div className="matches-calendar-heading">
        <h2 id="board-title">{heading}</h2>
        <button onClick={() => { setDay(today); }}>العودة إلى اليوم</button>
      </div>

      <div className="matches-toolbar" aria-label="أدوات التحديث والمنطقة الزمنية">
        <div className="matches-status">
          <span className={`update-indicator ${online ? 'active' : ''}`} aria-hidden="true" />
          <div className="matches-status-text">
            <strong>{online ? 'تحديث تلقائي كل دقيقة' : 'التحديث التلقائي متوقف مؤقتًا — لا يوجد اتصال'}</strong>
            <small>{updated ? `آخر بيانات: ${kickoff(updated, zone)} — ${selectedZoneName}` : 'في انتظار بيانات المصدر'}{loading && updated ? ' · جارٍ التحديث' : ''}</small>
          </div>
        </div>
        <label className="matches-field">
          <span className="matches-field-label">المنطقة الزمنية</span>
          <select value={zone} onChange={e => setZone(e.target.value)}>
            {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </label>
        <button className="matches-refresh" disabled={loading || !online} onClick={() => refreshNow.current()}>
          {loading ? 'جارٍ التحديث…' : '↻ تحديث الآن'}
        </button>
      </div>

      <div className="matches-calendar" role="group" aria-label="تواريخ الأسبوع الماضي والأسبوع القادم">
        {today ? weekDays(today).map(date => (
          <button
            key={date}
            ref={date === day ? selectedDate : undefined}
            aria-pressed={date === day}
            onClick={() => setDay(date)}
            className={date === day ? 'selected' : ''}
            aria-label={dayLabel(date, { weekday: 'long', year: 'numeric' })}
          >
            <span>{date === today ? 'اليوم' : dayLabel(date, { weekday: 'short', day: undefined, month: undefined })}</span>
            <strong>{dayLabel(date, { month: undefined })}</strong>
            <small>{dayLabel(date, { day: undefined, month: 'short' })}</small>
            <small className="calendar-iso" dir="ltr">{date}</small>
          </button>
        )) : <p>جارٍ تجهيز التواريخ…</p>}
      </div>

      <div className="matches-day-heading">
        <div>
          <h3>{day ? dayLabel(day, { weekday: 'long', year: 'numeric' }) : 'مباريات اليوم'}</h3>
          <p>المواعيد والتواريخ حسب {selectedZoneName}</p>
        </div>
      </div>

      <div className="matches-messages" role="status" aria-live="polite">
        {!online && <p className="matches-warning">أنت غير متصل بالإنترنت. البيانات المعروضة، إن وُجدت، ليست محدثة.</p>}
        {unavailable ? (
          <p className="matches-warning">
            تعذر الاتصال بمصدر المباريات. تحقق من اتصالك أو أعد المحاولة؛ لا تتوفر نتائج موثوقة الآن.
            {activeCodes.length > 0 && <span className="matches-diagnostic">رمز التشخيص: <code dir="ltr">{activeCodes.join(', ')}</code> ({activeCodes.map(describeDiagnostic).join('، ')}).</span>}
          </p>
        ) : failed.length > 0 ? (
          <p className="matches-warning">
            تعذر تحديث بعض البيانات وقد تكون المعروضة قديمة.
            {activeCodes.length > 0 && <span className="matches-diagnostic">رمز التشخيص: <code dir="ltr">{activeCodes.join(', ')}</code> ({activeCodes.map(describeDiagnostic).join('، ')}).</span>}
          </p>
        ) : null}
        {!hasLoaded && loading && <p className="matches-loading">جارٍ تحميل المواعيد والنتائج من المصدر…</p>}
        {hasLoaded && !unavailable && !groups.length && (
          <div className="matches-empty">
            <span aria-hidden="true"><FootballIcon /></span>
            <h3>لا توجد مباريات في هذا اليوم ضمن التغطية المتاحة</h3>
            <p>جرّب تاريخًا آخر من التقويم أعلاه.</p>
          </div>
        )}
      </div>

      <div className="matches-results" aria-busy={loading}>
        {groups.map(group => (
          <section key={group.id} className="match-league" aria-labelledby={`board-league-${group.id}`}>
            <header>
              <h3 id={`board-league-${group.id}`}>{group.name}</h3>
              <div className="match-league-meta">
                <a href="/watch-legal.html" className="match-official-link" title="القنوات والمنصات الناقلة الرسمية">القنوات الناقلة الرسمية ↗</a>
                <span>{group.matches.length} مباراة{failed.includes(group.id) ? ' · بيانات قديمة' : ''}</span>
                {layout === 'race' && (
                  <div className="match-race-nav">
                    <button type="button" className="match-race-nav-btn" aria-label="انتقل إلى المباريات الأقرب موعداً" onClick={() => race.nudge(1)}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 6 15 12 9 18" /></svg>
                    </button>
                    <button type="button" className="match-race-nav-btn" aria-label="انتقل إلى المباريات الأبعد موعداً" onClick={() => race.nudge(-1)}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 6 9 12 15 18" /></svg>
                    </button>
                  </div>
                )}
              </div>
            </header>
            {layout === 'race' ? (
            <div className="match-race-shell">
              {/* تجميع الساعة (uiverse calm-bobcat-35 مُدار 90°): الهيكل
                  التيتانيومي فقط — والزجاج هو منطقة التمرير نفسها */}
              <div
                className="match-race"
                ref={race.ref}
                role="group"
                tabIndex={0}
                aria-label={`شريط مباريات ${group.name}: يتحرك تلقائياً من الأقرب موعداً إلى الأبعد، ويتوقف عند التحويم أو اللمس`}
              >
              <div className="match-race-track">
              {group.matches.map(match => (
                <RaceCard key={match.id} match={match} groupName={group.name} zone={zone} timeZones={timeZones} />
              ))}
              </div>
              </div>
            </div>
            ) : (
            <div>
              {group.matches.map(match => (
                <article key={match.id} className={`match-card ${match.state === 'live' ? 'is-live' : ''}`}>
                  <div className="match-card-top">
                    <span className={`match-status status-${match.state}`}>{match.state === 'live' ? `● مباشر · ${match.detail}` : match.detail}</span>
                    {match.venue && <span className="match-venue" dir="auto">{match.venue}</span>}
                  </div>
                  <div className="match-contest">
                    <Team team={match.home} />
                    <div className="match-score">
                      {match.state === 'live' || match.state === 'finished' ? (
                        <strong aria-label={hasCompleteScore(match.home.score, match.away.score) ? `نتيجة المضيف ${match.home.score}، ثم الضيف ${match.away.score}` : 'النتيجة غير مكتملة'}>
                          {hasCompleteScore(match.home.score, match.away.score) ? <>{match.home.score} <span>:</span> {match.away.score}</> : '—'}
                        </strong>
                      ) : (
                        <><strong>{kickoff(match.date, zone)}</strong><small>موعد البداية</small></>
                      )}
                    </div>
                    <Team team={match.away} />
                  </div>
                  <div className="match-times">
                    {timeZones.map(z => (
                      <div key={z.id}>
                        <span>{z.id === 'Asia/Riyadh' ? 'مكة' : z.id === 'Africa/Cairo' ? 'مصر' : z.name}</span>
                        <time dateTime={match.date}>{kickoff(match.date, z.id)}</time>
                        <small>{dayLabel(dayInZone(new Date(match.date), z.id))}</small>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            )}
          </section>
        ))}
      </div>

      {dataNote && (
      <aside className="matches-note">
        <strong>عن البيانات والتوقيت</strong>
        <p>{note} المصدر: <a href="https://www.espn.com/soccer/scoreboard" target="_blank" rel="noopener noreferrer">ESPN</a> عبر وسيط الخادم (<code>/scoreboard.php</code>) مع تخزين مؤقت قصير، وتُعرض أسماء الفرق كما يرسلها المصدر. التحديث كل دقيقة أثناء ظهور الصفحة؛ قد تتأخر النتائج أو تتغير المواعيد حسب المصدر.</p>
      </aside>
      )}
      <noscript><p>يرجى تفعيل JavaScript لتحميل مواعيد المباريات وتحديث النتائج تلقائياً.</p></noscript>
    </section>
  );
}

/* فصل التصفية عن الرسم — يبقي المكوّن مقروءاً */
function selectVisibleMatches(boards: Record<string, Board>, day: string, zone: string, teamFilter?: string[]): Match[] {
  const all = day ? matchesForDay(Object.values(boards).flatMap(b => b.matches), day, zone) : [];
  return teamFilter && teamFilter.length ? all.filter(m => matchesTeamFilter(m, teamFilter)) : all;
}
