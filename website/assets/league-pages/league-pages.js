// The copy of the world sends the same return message as the original.
const world = document.querySelector('.world-copy iframe');
window.addEventListener('message', event => {
  if (world && event.origin === location.origin && event.source === world.contentWindow && event.data?.type === 'kota-return') location.assign('/');
});

// An accessible text/table representation outside the iframe uses exactly the
// world's live proxy endpoints and validators. No snapshots or archives are read.
const live = document.querySelector('.league-readable');
if (live) {
  const { league, matchLeague, view, assets } = live.dataset;
  const status = live.querySelector('.league-data-status');
  const output = live.querySelector('.league-data');
  const retry = live.querySelector('.live-retry');
  let sequence = 0, hasData = Boolean(output.querySelector('[data-server-league-data="true"]'));
  const number = value => Number.isFinite(value) ? String(value) : 'غير متاح';
  const rate = value => Number.isFinite(value) ? value.toFixed(2) : 'غير متاح';
  function table(headings, rows) {
    const wrap = document.createElement('div');
    wrap.className = 'table-scroll'; wrap.tabIndex = 0;
    wrap.setAttribute('role', 'region'); wrap.setAttribute('aria-label', 'جدول البيانات، قابل للتمرير أفقيًا');
    const element = document.createElement('table'), head = document.createElement('thead'), header = document.createElement('tr'), body = document.createElement('tbody');
    for (const heading of headings) { const cell = document.createElement('th'); cell.scope = 'col'; cell.textContent = heading; header.append(cell); }
    head.append(header);
    for (const values of rows) { const row = document.createElement('tr'); for (const value of values) { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); } body.append(row); }
    element.append(head, body); wrap.append(element); return wrap;
  }
  async function standings(signal, run) {
    const mod = await import(`${assets}standings.js`);
    const response = await fetch(mod.standingsUrl(league), { signal, cache: 'no-store', credentials: 'omit', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('unavailable');
    const data = mod.validateStandings(await response.json(), league);
    if (run !== sequence) return;
    const stale = data.stale || response.headers.get('X-Standings-Cache') === 'STALE';
    status.textContent = `${stale ? 'تنبيه: بيانات المصدر قديمة · ' : ''}آخر قراءة: ${mod.formatStandingsTime(data.fetchedAt)} بتوقيت القاهرة · ${data.provider} · موسم ${data.season}.`;
    if (view === 'rates') {
      // This shared module calculates rates from standings; it does not fetch an archive.
      const { standingsRates } = await import(`${assets}fixtures-archive.js`);
      if (run !== sequence) return;
      const rows = standingsRates(data.entries).rows.map(team => [number(team.rank), team.name, number(team.played), rate(team.attack), rate(team.defence), rate(team.ppm)]);
      output.replaceChildren(table(['المركز', 'الفريق', 'لعب', 'هجوم / مباراة', 'دفاع / مباراة', 'نقاط / مباراة'], rows));
    } else {
      const entries = view === 'overview' ? data.entries.slice(0, 5) : data.entries;
      output.replaceChildren(table(['المركز', 'الفريق', 'لعب', 'فاز', 'تعادل', 'خسر', 'له', 'عليه', 'النقاط'], entries.map(team => [number(team.rank), team.name, number(team.played), number(team.wins), number(team.draws), number(team.losses), number(team.goalsFor), number(team.goalsAgainst), number(team.points)])));
    }
  }
  async function matches(signal, run) {
    const mod = await import(`${assets}matches.js`), zone = 'Africa/Cairo';
    const day = mod.dayInZone(new Date(), zone), info = mod.LEAGUES.find(item => item.id === matchLeague);
    if (!info) throw new Error('unknown league');
    const response = await fetch(mod.scoreboardUrl(matchLeague, day), { signal, cache: 'no-store' });
    const data = await mod.readScoreboardResponse(response, info);
    if (run !== sequence) return;
    const fixtures = mod.matchesForDay(data.matches, day, zone);
    status.textContent = `${mod.dayLabel(day, { weekday: 'long', year: 'numeric' })} · توقيت القاهرة${data.stale ? ' · تنبيه: بيانات المصدر قديمة' : ''}${fixtures.length ? '' : ' · لا توجد مباريات مؤكدة لهذا اليوم.'}`;
    const rows = fixtures.map(match => {
      const score = (match.state === 'live' || match.state === 'finished') && mod.hasCompleteScore(match.home.score, match.away.score) ? `${match.home.score} : ${match.away.score}` : match.state === 'scheduled' ? mod.kickoff(match.date, zone) : 'غير متاح';
      const state = match.state === 'scheduled' ? 'بتوقيت القاهرة' : match.state === 'live' ? `${match.detail} · مباشر` : match.state === 'finished' ? 'انتهت' : match.detail || 'غير متاح';
      return [match.home.name, score, match.away.name, state];
    });
    output.replaceChildren(...(rows.length ? [table(['صاحب الأرض', 'النتيجة / الموعد', 'الضيف', 'الحالة'], rows)] : []));
  }
  async function load() {
    const run = ++sequence, controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    status.hidden = false;
    status.textContent = 'جارٍ تحميل البيانات من المصدر…'; retry.hidden = true;
    try {
      if (view === 'matches') await matches(controller.signal, run); else await standings(controller.signal, run);
      if (run === sequence) hasData = true;
    }
    catch { if (run === sequence) {
      if (hasData) status.textContent = 'تعذّر تحديث البيانات؛ تُعرض آخر قراءة وقد تكون قديمة. حاول مجددًا.';
      else { status.textContent = 'تعذّر تحميل البيانات من المصدر حاليًا. حاول مجددًا.'; output.replaceChildren(); }
      retry.hidden = false;
    } }
    finally { clearTimeout(timeout); }
  }
  retry.addEventListener('click', load);
  setInterval(() => { if (!document.hidden) load(); }, view === 'matches' ? 60000 : 120000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
  load();
}
