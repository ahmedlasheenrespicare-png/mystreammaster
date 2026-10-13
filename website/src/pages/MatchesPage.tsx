import { useEffect, useMemo, useRef, useState } from 'react';
import { LEAGUES, TIME_ZONES, dayInZone, dayLabel, kickoff, matchesForDay, parseScoreboard, scoreboardUrl, weekDays, type Match, type MatchTeam } from '../lib/matches.mjs';
import './matches.css';

const REFRESH_MS = 60_000;
type Board = { matches: Match[]; updated: string };

function FootballIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="m12 7 4.8 3.5-1.8 5.6H9l-1.8-5.6L12 7Zm0-5v5m4.8 3.5 4.7-1.7M15 16.1l3 4M9 16.1l-3 4m1.2-9.6L2.5 8.8" /></svg>;
}

function Team({ team }: { team: MatchTeam }) {
  return <div className="match-team">{team.logo ? <img src={team.logo} alt="" loading="lazy" width="40" height="40" onError={e => { e.currentTarget.style.visibility = 'hidden'; }} /> : <span className="team-placeholder" aria-hidden="true"><FootballIcon /></span>}<span dir="auto">{team.name}</span></div>;
}

export default function MatchesPage() {
  // Stable SSR markup: dates and persisted browser preferences initialize after hydration.
  const [zone, setZone] = useState('Asia/Riyadh');
  const [today, setToday] = useState('');
  const [day, setDay] = useState('');
  const [league, setLeague] = useState('all');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [boards, setBoards] = useState<Record<string, Board>>({});
  const [failed, setFailed] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [online, setOnline] = useState(true);
  const [auto, setAuto] = useState(true);
  const refreshNow = useRef<() => void>(() => {});
  const automatic = useRef(auto);
  automatic.current = auto;
  const [zones, setZones] = useState(TIME_ZONES);
  const selectedDate = useRef<HTMLButtonElement>(null);
  const calendarDay = useRef('');

  useEffect(() => {
    const intl = Intl as typeof Intl & { supportedValuesOf?: (key: 'timeZone') => string[] };
    const all = intl.supportedValuesOf?.('timeZone') || [];
    setZones([...TIME_ZONES, ...all.filter(id => !TIME_ZONES.some(z => z.id === id)).map(id => ({ id, name: id.replace(/_/g, ' ') }))]);
    try {
      const saved = localStorage.getItem('sm-matches-zone');
      if (saved) { new Intl.DateTimeFormat('en', { timeZone: saved }); setZone(saved); }
    } catch { /* Storage may be unavailable; default to Mecca. */ }
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
    try { localStorage.setItem('sm-matches-zone', zone); } catch { /* Optional preference. */ }
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
    let current: Record<string, Board> = {};
    setBoards({}); setFailed([]); setHasLoaded(false);
    const refresh = async () => {
      if (disposed || busy || document.hidden || !navigator.onLine) { if (!navigator.onLine) setLoading(false); return; }
      busy = true; setLoading(true);
      controller = new AbortController();
      const signal = controller.signal;
      const timeout = window.setTimeout(() => controller?.abort(), 15_000);
      const results = await Promise.allSettled(LEAGUES.map(async entry => {
        const response = await fetch(scoreboardUrl(entry.id, day), { signal, cache: 'no-store' });
        if (!response.ok) throw new Error(`Scoreboard HTTP ${response.status}`);
        return { id: entry.id, matches: parseScoreboard(await response.json(), entry), updated: new Date().toISOString() };
      }));
      window.clearTimeout(timeout);
      if (disposed) return;
      const failures: string[] = [];
      results.forEach((result, i) => {
        if (result.status === 'fulfilled') current[result.value.id] = result.value;
        else failures.push(LEAGUES[i].id);
      });
      setBoards({ ...current }); setFailed(failures); setLoading(false); setHasLoaded(true); busy = false;
    };
    void refresh();
    refreshNow.current = () => { void refresh(); };
    const timer = window.setInterval(() => { if (automatic.current) void refresh(); }, REFRESH_MS);
    const resume = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', resume);
    return () => { disposed = true; controller?.abort(); window.clearInterval(timer); document.removeEventListener('visibilitychange', resume); window.removeEventListener('online', resume); refreshNow.current = () => {}; };
  }, [day]);

  const dailyMatches = useMemo(() => day ? matchesForDay(Object.values(boards).flatMap(b => b.matches), day, zone) : [], [boards, day, zone]);
  const scopedMatches = dailyMatches.filter(m => league === 'all' || m.league === league);
  const visible = scopedMatches.filter(m => (filter === 'all' || m.state === filter) && `${m.home.name} ${m.away.name}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const groups = LEAGUES.map(entry => ({ ...entry, matches: visible.filter(m => m.league === entry.id) })).filter(entry => entry.matches.length);
  const updated = Object.values(boards).map(b => b.updated).sort().slice(-1)[0];
  const unavailable = failed.length === LEAGUES.length && !Object.keys(boards).length;
  const coverageMissing = league === 'all' ? failed.length > 0 : failed.includes(league);
  const selectedZoneName = zones.find(z => z.id === zone)?.name || zone;

  return <section className="matches-page" aria-labelledby="matches-title">
    <div className="matches-container">
      <header className="matches-hero">
        <div><p className="matches-eyebrow"><span aria-hidden="true"><FootballIcon /></span> كل مباراة، في وقتها</p><h1 id="matches-title">مواعيد <span>المباريات</span></h1><p className="matches-intro">تابع المواعيد والنتائج وحالة المباريات في البطولات المتاحة.<br />الأسبوع الماضي، اليوم، والأسبوع القادم — بتوقيتك.</p></div>
        <div className="matches-live-panel"><span className={`update-indicator ${auto && online ? 'active' : ''}`} /> <strong>{auto ? 'تحديث تلقائي كل دقيقة' : 'التحديث التلقائي متوقف'}</strong><small>{updated ? `آخر بيانات مستلمة: ${kickoff(updated, zone)} — ${selectedZoneName}` : 'في انتظار بيانات المصدر'}{loading && updated ? ' · جارٍ التحديث' : ''}</small><label><input type="checkbox" checked={auto} onChange={e => { setAuto(e.target.checked); if (e.target.checked) refreshNow.current(); }} /> تفعيل التحديث التلقائي</label></div>
      </header>

      <div className="matches-controls">
        <label>المنطقة الزمنية<select value={zone} onChange={e => setZone(e.target.value)}>{zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}</select></label>
        <label>البطولة<select value={league} onChange={e => setLeague(e.target.value)}><option value="all">كل البطولات المتاحة</option>{LEAGUES.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
        <label className="matches-search">ابحث عن فريق<input type="search" placeholder="اسم الفريق حسب المصدر…" value={query} onChange={e => setQuery(e.target.value)} /></label>
        <button className="matches-refresh" disabled={loading || !online} onClick={() => refreshNow.current()}>{loading ? 'جارٍ التحديث…' : '↻ تحديث الآن'}</button>
      </div>

      <div className="matches-calendar-heading"><h2>جدول المباريات</h2><button onClick={() => { setDay(today); setFilter('all'); setQuery(''); }}>العودة إلى اليوم</button></div>
      <div className="matches-calendar" role="group" aria-label="تواريخ الأسبوع الماضي والأسبوع القادم">{today ? weekDays(today).map(date => <button key={date} ref={date === day ? selectedDate : undefined} aria-pressed={date === day} onClick={() => setDay(date)} className={date === day ? 'selected' : ''} aria-label={dayLabel(date, { weekday: 'long', year: 'numeric' })}><span>{date === today ? 'اليوم' : dayLabel(date, { weekday: 'short', day: undefined, month: undefined })}</span><strong>{dayLabel(date, { month: undefined })}</strong><small>{dayLabel(date, { day: undefined, month: 'short' })}</small><small className="calendar-iso" dir="ltr">{date}</small></button>) : <p>جارٍ تجهيز التواريخ…</p>}</div>
      <div className="matches-day-heading"><div><h3>{day ? dayLabel(day, { weekday: 'long', year: 'numeric' }) : 'مباريات اليوم'}</h3><p>المواعيد والتواريخ حسب {selectedZoneName}</p></div><div className="matches-filters" role="group" aria-label="حالة المباريات">{[{ id: 'all', name: 'الكل' }, { id: 'live', name: 'مباشر' }, { id: 'scheduled', name: 'قادمة' }, { id: 'finished', name: 'انتهت' }, { id: 'other', name: 'مؤجلة / متوقفة' }].map(f => <button key={f.id} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.name}</button>)}</div></div>

      <div className="matches-messages" role="status" aria-live="polite">
        {!online && <p className="matches-warning">أنت غير متصل بالإنترنت. البيانات المعروضة، إن وُجدت، ليست محدثة.</p>}
        {unavailable ? <p className="matches-warning">تعذر الاتصال بمصدر المباريات. تحقق من اتصالك أو أعد المحاولة؛ لا تتوفر نتائج موثوقة الآن.</p> : failed.length > 0 && <p className="matches-warning">تعذر تحديث: {LEAGUES.filter(l => failed.includes(l.id)).map(l => l.name).join('، ')}. قد تكون بياناتها السابقة قديمة، والتغطية غير مكتملة.</p>}
        {!hasLoaded && loading && <p className="matches-loading">جارٍ تحميل المواعيد والنتائج من المصدر…</p>}
        {hasLoaded && !unavailable && !visible.length && <div className="matches-empty"><span aria-hidden="true"><FootballIcon /></span><h3>{coverageMissing ? 'لا توجد مباريات مؤكدة للعرض' : scopedMatches.length ? 'لا توجد مباريات تطابق البحث أو التصفية' : 'لا توجد مباريات في هذا اليوم ضمن التغطية المتاحة'}</h3><p>{coverageMissing ? 'بعض البطولات غير متاحة حاليًا. أعد المحاولة لاحقًا.' : 'جرّب تاريخًا آخر أو بطولة أخرى.'}</p></div>}
      </div>

      <div className="matches-results" aria-busy={loading}>{groups.map(group => <section key={group.id} className="match-league" aria-labelledby={`league-${group.id}`}><header><h3 id={`league-${group.id}`}>{group.name}</h3><span>{group.matches.length} مباراة{failed.includes(group.id) ? ' · بيانات قديمة' : ''}</span></header><div>{group.matches.map(match => <article key={match.id} className={`match-card ${match.state === 'live' ? 'is-live' : ''}`}>
        <div className="match-card-top"><span className={`match-status status-${match.state}`}>{match.state === 'live' ? `● مباشر · ${match.detail}` : match.detail}</span>{match.venue && <span className="match-venue" dir="auto">{match.venue}</span>}</div>
        <div className="match-contest"><Team team={match.home} /><div className="match-score">{match.state === 'live' || match.state === 'finished' ? <strong aria-label={`النتيجة: ${match.home.score ?? 'غير متاحة'} إلى ${match.away.score ?? 'غير متاحة'}`}>{match.home.score ?? '—'} <span>:</span> {match.away.score ?? '—'}</strong> : <><strong>{kickoff(match.date, zone)}</strong><small>موعد البداية</small></>}</div><Team team={match.away} /></div>
        <div className="match-times">{TIME_ZONES.slice(0, 3).concat(TIME_ZONES.slice(0, 3).some(z => z.id === zone) ? [] : [{ id: zone, name: selectedZoneName }]).map(z => <div key={z.id}><span>{z.id === 'Asia/Riyadh' ? 'مكة' : z.id === 'Africa/Cairo' ? 'مصر' : z.name}</span><time dateTime={match.date}>{kickoff(match.date, z.id)}</time><small>{dayLabel(dayInZone(new Date(match.date), z.id))}</small></div>)}</div>
      </article>)}</div></section>)}</div>
      <aside className="matches-note"><strong>عن البيانات والتوقيت</strong><p>المصدر: <a href="https://www.espn.com/soccer/scoreboard" target="_blank" rel="noopener noreferrer">ESPN</a>. تشمل الصفحة البطولات الموجودة في قائمة التصفية فقط، وتُعرض أسماء الفرق كما يرسلها المصدر. التحديث كل دقيقة أثناء ظهور الصفحة؛ قد تتأخر النتائج أو تتغير المواعيد حسب المصدر، وهذه ليست خدمة نتائج رسمية مضمونة. يُحسب التوقيت الصيفي تلقائيًا لمصر وبقية المناطق. قد يختلف تاريخ المباراة بين البلدان.</p></aside>
      <noscript><p>يرجى تفعيل JavaScript لتحميل مواعيد المباريات وتحديث النتائج تلقائيًا.</p></noscript>
    </div>
  </section>;
}
