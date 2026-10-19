import { useEffect, useMemo, useRef, useState } from 'react';
import { LEAGUES, TIME_ZONES, classifyFetchError, dayInZone, dayLabel, describeDiagnostic, hasCompleteScore, kickoff, matchesForDay, readScoreboardResponse, scoreboardUrl, weekDays, type Match, type MatchTeam } from '../lib/matches.mjs';
import { matchByExternalId, matchCenterPath } from '../content/match-center.mjs';
import { leagueLandingsInPageOrder } from '../content/competitions';
import LeagueLinksCarousel from '../components/LeagueLinksCarousel';
import LeagueStatsCarousel from '../components/LeagueStatsCarousel';
import { to } from '../config';
import './matches.css';

/* البند 3: «إضافة رابط مركز المباراة إلى البطاقة في صفحة المواعيد القائمة —
   بلا صفحة مكررة». الربط **بمعرّف المباراة من المصدر**، لا باسم الفريق ولا
   بوقت البداية: ثلاثة أحداث في eng.1 تبدأ 14:00Z يوم 2026-10-17، فالربط
   بالاسم أو بالوقت يخطئ، والمعرّف وحده لا. */
function matchCenterLink(match: Match): string | null {
  /* `Match.id` في هذه الصفحة مركّب: `${league}:${eventId}`. */
  const separator = match.id.indexOf(':');
  const eventId = separator === -1 ? match.id : match.id.slice(separator + 1);
  if (!eventId) return null;
  const found = matchByExternalId('espn', eventId);
  /* ولا رابط إلا إن تطابقت المسابقة أيضاً — فلا يربط معرّفٌ صفحةً ببطولة أخرى. */
  return found && found.leagueId === match.league ? to(matchCenterPath(found).replace(/^\//, '')) : null;
}

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
  const [diagnostics, setDiagnostics] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [online, setOnline] = useState(true);
  const refreshNow = useRef<() => void>(() => {});
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
    const current: Record<string, Board> = {};
    setBoards({}); setFailed([]); setDiagnostics({}); setHasLoaded(false);
    const refresh = async () => {
      if (disposed || busy || document.hidden || !navigator.onLine) { if (!navigator.onLine) setLoading(false); return; }
      busy = true; setLoading(true);
      controller = new AbortController();
      const signal = controller.signal;
      const timeout = window.setTimeout(() => controller?.abort(), 15_000);
      const results = await Promise.allSettled(LEAGUES.map(async entry => {
        const response = await fetch(scoreboardUrl(entry.id, day), { signal, cache: 'no-store' });
        return readScoreboardResponse(response, entry);
      }));
      window.clearTimeout(timeout);
      if (disposed) return;
      const failures: string[] = [];
      const nextDiagnostics: Record<string, string> = {};
      results.forEach((result, i) => {
        const id = LEAGUES[i].id;
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
  }, [day]);

  const dailyMatches = useMemo(() => day ? matchesForDay(Object.values(boards).flatMap(b => b.matches), day, zone) : [], [boards, day, zone]);
  const scopedMatches = dailyMatches.filter(m => league === 'all' || m.league === league);
  const visible = scopedMatches.filter(m => (filter === 'all' || m.state === filter) && `${m.home.name} ${m.away.name}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const groups = LEAGUES.map(entry => ({ ...entry, matches: visible.filter(m => m.league === entry.id) })).filter(entry => entry.matches.length);
  const updated = Object.values(boards).map(b => b.updated).sort().slice(-1)[0];
  const unavailable = failed.length === LEAGUES.length && !Object.keys(boards).length;
  const coverageMissing = league === 'all' ? failed.length > 0 : failed.includes(league);
  const relevantFailures = league === 'all' ? failed : failed.filter(id => id === league);
  const activeCodes = Array.from(new Set((relevantFailures.length ? relevantFailures : failed).map(id => diagnostics[id]).filter(Boolean)));
  const selectedZoneName = zones.find(z => z.id === zone)?.name || zone;

  return <section className="matches-page" aria-labelledby="matches-title">
    <div className="matches-container">
      <nav className="text-[12.5px] font-bold text-black/40 mb-5" aria-label="مسار التصفح">
        <a href="/" className="hover:text-black transition">الرئيسية</a>
        <span className="mx-2">/</span>
        <span className="text-black/70">مواعيد المباريات</span>
      </nav>
      <header className="matches-hero">
        <div><p className="matches-eyebrow"><span aria-hidden="true"><FootballIcon /></span> كل مباراة، في وقتها</p><h1 id="matches-title">مواعيد <span>المباريات</span></h1><p className="matches-intro">الأسبوع الماضي، اليوم، والأسبوع القادم — بتوقيتك.</p></div>
      </header>

      {/* القائمة تُبنى من مصدر واحد (LEAGUE_PAGE_ORDER) فلا تنشأ قائمة ثانية
          تتباعد عنه؛ وبطولة جديدة تُدرج في موضعها بلا تعديل هنا. */}
      <LeagueLinksCarousel
        title="صفحات البطولات"
        items={leagueLandingsInPageOrder().map((landing) => ({
          href: `/matches/${landing.slug}/`,
          label: landing.shortName,
          leagueId: landing.leagueId,
        }))}
      />

      {/* كروت الإحصائيات بنفس نمط الشريط الذي يعلوها: كرت مختصر لكل بطولة
          (أقوى هجوم، أقوى دفاع، إجمالي الأهداف) من جدول الترتيب المتحقق منه
          نفسه الذي تقرأه صفحة البطولة — لا أرقام محسوبة محلياً بلا مصدر. */}
      <LeagueStatsCarousel
        items={leagueLandingsInPageOrder().map((landing) => ({
          href: `/matches/${landing.slug}/`,
          name: landing.shortName,
          leagueId: landing.leagueId,
          standingsLeagueId: landing.standings?.leagueId ?? null,
        }))}
      />

      <section className="matches-featured" aria-labelledby="featured-match-title">
        <div className="matches-featured-copy">
          <span className="matches-featured-kicker">تغطية خاصة · دوري أبطال أوروبا</span>
          <h2 id="featured-match-title">مانشستر يونايتد × أتلتيكو مدريد</h2>
          <p>الثلاثاء 13 أكتوبر 2026 · 10:00 مساءً بتوقيت القاهرة · مرحلة الدوري</p>
        </div>
        <a className="matches-featured-link" href="/manchester-united-atletico/">تفاصيل المباراة ورابط المشاهدة <span aria-hidden="true">↗</span></a>
      </section>

      <div className="matches-toolbar" aria-label="أدوات البحث والتحديث">
        <div className="matches-status">
          <span className={`update-indicator ${online ? 'active' : ''}`} aria-hidden="true" />
          <div className="matches-status-text"><strong>{online ? 'تحديث تلقائي كل دقيقة' : 'التحديث التلقائي متوقف مؤقتًا — لا يوجد اتصال'}</strong><small>{updated ? `آخر بيانات: ${kickoff(updated, zone)} — ${selectedZoneName}` : 'في انتظار بيانات المصدر'}{loading && updated ? ' · جارٍ التحديث' : ''}</small></div>
        </div>
        <label className="matches-field"><span className="matches-field-label">المنطقة الزمنية</span><select value={zone} onChange={e => setZone(e.target.value)}>{zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}</select></label>
        <label className="matches-field"><span className="matches-field-label">البطولة</span><select value={league} onChange={e => setLeague(e.target.value)}><option value="all">كل البطولات المتاحة</option>{LEAGUES.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
        <label className="matches-field matches-search"><span className="matches-field-label">ابحث عن فريق</span><input type="search" placeholder="اسم الفريق…" value={query} onChange={e => setQuery(e.target.value)} /></label>
        <button className="matches-refresh" disabled={loading || !online} onClick={() => refreshNow.current()}>{loading ? 'جارٍ التحديث…' : '↻ تحديث الآن'}</button>
      </div>

      <div className="matches-calendar-heading"><h2>جدول المباريات</h2><button onClick={() => { setDay(today); setFilter('all'); setQuery(''); }}>العودة إلى اليوم</button></div>
      <div className="matches-calendar" role="group" aria-label="تواريخ الأسبوع الماضي والأسبوع القادم">{today ? weekDays(today).map(date => <button key={date} ref={date === day ? selectedDate : undefined} aria-pressed={date === day} onClick={() => setDay(date)} className={date === day ? 'selected' : ''} aria-label={dayLabel(date, { weekday: 'long', year: 'numeric' })}><span>{date === today ? 'اليوم' : dayLabel(date, { weekday: 'short', day: undefined, month: undefined })}</span><strong>{dayLabel(date, { month: undefined })}</strong><small>{dayLabel(date, { day: undefined, month: 'short' })}</small><small className="calendar-iso" dir="ltr">{date}</small></button>) : <p>جارٍ تجهيز التواريخ…</p>}</div>
      <div className="matches-day-heading"><div><h3>{day ? dayLabel(day, { weekday: 'long', year: 'numeric' }) : 'مباريات اليوم'}</h3><p>المواعيد والتواريخ حسب {selectedZoneName}</p></div><div className="matches-filters" role="group" aria-label="حالة المباريات">{[{ id: 'all', name: 'الكل' }, { id: 'live', name: 'مباشر' }, { id: 'scheduled', name: 'قادمة' }, { id: 'finished', name: 'انتهت' }, { id: 'other', name: 'مؤجلة / متوقفة' }].map(f => <button key={f.id} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.name}</button>)}</div></div>

      <div className="matches-messages" role="status" aria-live="polite">
        {!online && <p className="matches-warning">أنت غير متصل بالإنترنت. البيانات المعروضة، إن وُجدت، ليست محدثة.</p>}
        {unavailable ? <p className="matches-warning">تعذر الاتصال بمصدر المباريات. تحقق من اتصالك أو أعد المحاولة؛ لا تتوفر نتائج موثوقة الآن.{activeCodes.length > 0 && <span className="matches-diagnostic">رمز التشخيص: <code dir="ltr">{activeCodes.join(', ')}</code> ({activeCodes.map(describeDiagnostic).join('، ')}).</span>}</p> : failed.length > 0 && <p className="matches-warning">تعذر تحديث: {LEAGUES.filter(l => failed.includes(l.id)).map(l => l.name).join('، ')}. قد تكون بياناتها السابقة قديمة، والتغطية غير مكتملة.{activeCodes.length > 0 && <span className="matches-diagnostic">رمز التشخيص: <code dir="ltr">{activeCodes.join(', ')}</code> ({activeCodes.map(describeDiagnostic).join('، ')}).</span>}</p>}
        {!hasLoaded && loading && <p className="matches-loading">جارٍ تحميل المواعيد والنتائج من المصدر…</p>}
        {hasLoaded && !unavailable && !visible.length && <div className="matches-empty"><span aria-hidden="true"><FootballIcon /></span><h3>{coverageMissing ? 'لا توجد مباريات مؤكدة للعرض' : scopedMatches.length ? 'لا توجد مباريات تطابق البحث أو التصفية' : 'لا توجد مباريات في هذا اليوم ضمن التغطية المتاحة'}</h3><p>{coverageMissing ? `بعض البطولات غير متاحة حاليًا${activeCodes.length ? ` (رمز التشخيص: ${activeCodes.join(', ')})` : ''}. أعد المحاولة لاحقًا.` : 'جرّب تاريخًا آخر أو بطولة أخرى.'}</p></div>}
      </div>

      <div className="matches-results" aria-busy={loading}>{groups.map(group => <section key={group.id} className="match-league" aria-labelledby={`league-${group.id}`}><header><h3 id={`league-${group.id}`}>{group.name}</h3><div className="match-league-meta"><a href="/watch-legal.html" className="match-official-link" title="القنوات والمنصات الناقلة الرسمية لهذه البطولة">القنوات الناقلة الرسمية ↗</a><span>{group.matches.length} مباراة{failed.includes(group.id) ? ' · بيانات قديمة' : ''}</span></div></header><div>{group.matches.map(match => <article key={match.id} className={`match-card ${match.state === 'live' ? 'is-live' : ''}`}>
        <div className="match-card-top"><span className={`match-status status-${match.state}`}>{match.state === 'live' ? `● مباشر · ${match.detail}` : match.detail}</span>{match.venue && <span className="match-venue" dir="auto">{match.venue}</span>}</div>
        <div className="match-contest"><Team team={match.home} /><div className="match-score">{match.state === 'live' || match.state === 'finished' ? <strong aria-label={hasCompleteScore(match.home.score, match.away.score) ? `نتيجة المضيف ${match.home.score}، ثم الضيف ${match.away.score}` : 'النتيجة غير مكتملة'}>{hasCompleteScore(match.home.score, match.away.score) ? <>{match.home.score} <span>:</span> {match.away.score}</> : '—'}</strong> : <><strong>{kickoff(match.date, zone)}</strong><small>موعد البداية</small></>}</div><Team team={match.away} /></div>
        <div className="match-times">{TIME_ZONES.slice(0, 3).concat(TIME_ZONES.slice(0, 3).some(z => z.id === zone) ? [] : [{ id: zone, name: selectedZoneName }]).map(z => <div key={z.id}><span>{z.id === 'Asia/Riyadh' ? 'مكة' : z.id === 'Africa/Cairo' ? 'مصر' : z.name}</span><time dateTime={match.date}>{kickoff(match.date, z.id)}</time><small>{dayLabel(dayInZone(new Date(match.date), z.id))}</small></div>)}</div>
        {(() => { const href = matchCenterLink(match); return href ? <a className="match-center-link" href={href}>مركز المباراة <span aria-hidden="true">↗</span></a> : null; })()}
      </article>)}</div></section>)}</div>
      <aside className="matches-note"><strong>عن البيانات والتوقيت</strong><p>المصدر: <a href="https://www.espn.com/soccer/scoreboard" target="_blank" rel="noopener noreferrer">ESPN</a> عبر وسيط الخادم (<code>/scoreboard.php</code>) مع تخزين مؤقت قصير. تشمل الصفحة البطولات الموجودة في قائمة التصفية فقط، وتُعرض أسماء الفرق كما يرسلها المصدر. التحديث كل دقيقة أثناء ظهور الصفحة؛ قد تتأخر النتائج أو تتغير المواعيد حسب المصدر، وهذه ليست خدمة نتائج رسمية مضمونة. يُحسب التوقيت الصيفي تلقائيًا لمصر وبقية المناطق. قد يختلف تاريخ المباراة بين البلدان.</p></aside>
      <noscript><p>يرجى تفعيل JavaScript لتحميل مواعيد المباريات وتحديث النتائج تلقائيًا.</p></noscript>
    </div>
  </section>;
}
