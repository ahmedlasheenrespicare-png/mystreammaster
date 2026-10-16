/* Dependency-free, shared static renderer + progressive same-origin standings updates. */
export const STANDINGS_LEAGUES = [
  { id: 'uefa.champions', title: 'دوري أبطال أوروبا', count: 36, focus: ['1068', '360'], phase: 'مرحلة الدوري الموحّدة' },
  { id: 'eng.1', title: 'الدوري الإنجليزي الممتاز', count: 20, focus: ['360'], phase: 'ترتيب الدوري المحلي لمانشستر يونايتد' },
  { id: 'esp.1', title: 'الدوري الإسباني', count: 20, focus: ['1068'], phase: 'ترتيب الدوري المحلي لأتلتيكو مدريد' },
];
export const STANDINGS_FIELDS = ['points', 'played', 'wins', 'draws', 'losses', 'goalsFor', 'goalsAgainst', 'goalDifference'];
const HEADINGS = ['النقاط', 'لعب', 'فاز', 'تعادل', 'خسر', 'له', 'عليه', 'الفارق'];
const TEAM_NAMES = { '1068': 'أتلتيكو مدريد', '360': 'مانشستر يونايتد' };
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const slug = league => league.replace(/\./g, '-');
const seasonText = season => `${season}/${String(season + 1).slice(-2)}`;
const teamName = row => TEAM_NAMES[row.teamId] || row.name;
const formatTime = value => new Intl.DateTimeFormat('ar-EG', { timeZone: 'Africa/Cairo', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));
const numText = (value, field) => value === null ? 'غير متاح' : `${field === 'goalDifference' && value > 0 ? '+' : ''}${value}`;

export function validateStandings(data, league) {
  const config = STANDINGS_LEAGUES.find(item => item.id === league);
  if (!config || !data || data.ok !== true || data.provider !== 'ESPN' || data.league !== league || data.phase !== 'league'
      || !Number.isInteger(data.season) || data.season < 2000 || data.season > 2100
      || typeof data.fetchedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(data.fetchedAt) || !Number.isFinite(Date.parse(data.fetchedAt))
      || typeof data.stale !== 'boolean' || !Array.isArray(data.entries) || data.entries.length !== config.count) throw new Error('INVALID_STANDINGS');
  const ids = new Set(); const ranks = new Set();
  const entries = data.entries.map(row => {
    if (!row || typeof row.teamId !== 'string' || !/^[1-9]\d{0,11}$/.test(row.teamId) || ids.has(row.teamId)
        || typeof row.name !== 'string' || !row.name.trim() || row.name.length > 240 || /[\u0000-\u001f\u007f]/.test(row.name)
        || !Number.isInteger(row.rank) || row.rank < 1 || row.rank > config.count || ranks.has(row.rank)) throw new Error('INVALID_STANDINGS');
    const result = { teamId: row.teamId, name: row.name.trim(), rank: row.rank };
    for (const field of STANDINGS_FIELDS) {
      const value = row[field] ?? null;
      if (value !== null && (!Number.isSafeInteger(value) || (!['points', 'goalDifference'].includes(field) && value < 0))) throw new Error('INVALID_STANDINGS');
      result[field] = value;
    }
    ids.add(row.teamId); ranks.add(row.rank);
    return result;
  });
  if (!entries.some(row => STANDINGS_FIELDS.some(field => row[field] !== null))) throw new Error('INVALID_STANDINGS');
  // Use the supplied rank; never recalculate points, goal difference or tie-breakers.
  entries.sort((a, b) => a.rank - b.rank);
  return { ok: true, provider: 'ESPN', league, phase: 'league', season: data.season, fetchedAt: new Date(data.fetchedAt).toISOString(), stale: data.stale, entries };
}

export function renderStandingsRows(data) {
  return data.entries.map(row => `<tr data-standing-team="${row.teamId}" data-rank="${row.rank}" data-team-name="${esc(row.name)}"${TEAM_NAMES[row.teamId] ? ` data-focus-team="${row.teamId}"` : ''}>
    <td class="fs-rank"><bdi dir="ltr">${row.rank}</bdi></td><th class="fs-team" scope="row"><bdi dir="auto">${esc(teamName(row))}</bdi>${TEAM_NAMES[row.teamId] ? '<span class="fs-team-marker">فريق المواجهة</span>' : ''}</th>
    ${STANDINGS_FIELDS.map(field => `<td data-standing-field="${field}" data-value="${row[field] === null ? '' : row[field]}"${field === 'points' ? ' class="fs-points"' : ''}><bdi dir="ltr">${esc(numText(row[field], field))}</bdi></td>`).join('')}
  </tr>`).join('\n');
}

export function renderStandingsSummary(data) {
  const config = STANDINGS_LEAGUES.find(item => item.id === data.league);
  return config.focus.map(id => {
    const row = data.entries.find(entry => entry.teamId === id);
    return `<div class="fs-position" data-summary-team="${id}"><span class="fs-position-team">${TEAM_NAMES[id]}</span>${row ? `<span class="fs-position-rank">المركز <bdi dir="ltr" data-summary-rank>${row.rank}</bdi></span><span class="fs-position-detail"><bdi dir="ltr" data-summary-points>${esc(numText(row.points))}</bdi> نقطة · <bdi dir="ltr">${esc(numText(row.played))}</bdi> مباراة</span>` : '<span class="fs-position-detail">لم يرد الفريق في جدول هذا الموسم لدى المصدر؛ لا يُقدَّر ترتيبه.</span>'}</div>`;
  }).join('');
}

export function renderStandingsCard(data) {
  const config = STANDINGS_LEAGUES.find(item => item.id === data.league);
  const id = slug(config.id);
  return `<article class="fs-card${config.id === 'uefa.champions' ? ' fs-card--europe' : ''}" data-standing-league="${config.id}" data-season="${data.season}" data-fetched-at="${esc(data.fetchedAt)}" data-feed-state="snapshot" aria-labelledby="fs-${id}-title">
    <header class="fs-card-heading"><div><p class="fs-kicker">${config.phase}</p><h3 id="fs-${id}-title">${config.title}</h3></div><span class="fs-season" data-standing-season>موسم <bdi dir="ltr">${seasonText(data.season)}</bdi></span></header>
    <div class="fs-positions" data-standing-summary>${renderStandingsSummary(data)}</div>
    <p class="fs-reading" data-standing-status role="status" aria-live="polite">لقطة مراجعة · آخر قراءة: ${formatTime(data.fetchedAt)} بتوقيت القاهرة.</p>
    <p class="fs-scroll-hint" id="fs-${id}-hint">جدول كامل من ${config.count} فريقاً. مرّر داخل الجدول لرؤية بقية الصفوف والأعمدة؛ يمكن تركيزه بلوحة المفاتيح.</p>
    <div class="fs-table-scroll" role="region" tabindex="0" aria-label="جدول ${config.title}، قابل للتمرير" aria-describedby="fs-${id}-hint">
      <table class="fs-table"><caption>${config.title} · موسم ${seasonText(data.season)} · جدول الترتيب</caption><thead><tr><th scope="col" class="fs-rank">المركز</th><th scope="col" class="fs-team">الفريق</th>${HEADINGS.map((label, i) => `<th scope="col"${i === 0 ? ' class="fs-points"' : ''}>${label}</th>`).join('')}</tr></thead><tbody data-standing-rows>${renderStandingsRows(data)}</tbody></table>
    </div>
    <p class="fs-source">الأرقام الناقصة «غير متاح»؛ لا يُستنتج الترتيب من نتيجة مباراة واحدة.</p>
  </article>`;
}

export function renderFixtureStandings(snapshot) {
  if (snapshot?.version !== 1 || !Array.isArray(snapshot.tables) || snapshot.tables.length !== STANDINGS_LEAGUES.length) throw new Error('MISSING_STANDINGS_SNAPSHOT');
  const tables = STANDINGS_LEAGUES.map(config => {
    const matches = snapshot.tables.filter(table => table.league === config.id);
    if (matches.length !== 1) throw new Error('INVALID_STANDINGS_SNAPSHOT');
    return validateStandings(matches[0], config.id);
  });
  return `<header class="section-heading fs-heading"><span class="section-kicker">الصورة الأوسع · ترتيب البطولات</span><h2 class="section-title" id="competition-standings-title">ترتيب الفريقين أوروبياً ومحلياً</h2><p>دوري أبطال أوروبا بنظام جدول دوري موحّد، وليس مجموعات منفصلة. هنا الجدول الكامل، ثم الدوري الإنجليزي لمانشستر يونايتد والدوري الإسباني لأتلتيكو مدريد.</p></header>
    <div class="fs-auto-note"><span class="fs-auto-dot" aria-hidden="true"></span><p>تحديث تلقائي كل خمس دقائق أثناء ظهور الصفحة واتصالها، عبر وسيط الترتيب المستقل. وقت القراءة والموسم واضحان لكل جدول؛ قد يتأخر المصدر.</p></div>
    <p class="fs-context">هذه جداول الموسم المبيّن مع كل بطولة، وليست ترتيباً تاريخياً عند صافرة نهاية المباراة، ولا تغيّر إحصائيات المباراة النهائية أو نص التحليل.</p>
    <p class="fs-global-status" data-standings-global-status role="status">المعروض لقطة مراجعة موثّقة؛ يبدأ التحقق التلقائي عند تحميل الواجهة.</p>
    <div class="fs-grid">${tables.map(renderStandingsCard).join('\n')}</div>
    <p class="fs-context" data-standings-static-note>الجداول والأرقام موجودة في HTML حتى دون JavaScript. التحديث الآلي يحتاج JavaScript وخادماً يشغّل وسيط PHP؛ عند تعذّره تبقى آخر قراءة مع تاريخها وتحذير واضح.</p>`;
}

function readInitialCard(card, league) {
  const entries = [...card.querySelectorAll('tbody [data-standing-team]')].map(row => {
    const entry = { teamId: row.dataset.standingTeam, name: row.dataset.teamName, rank: Number(row.dataset.rank) };
    row.querySelectorAll('[data-standing-field]').forEach(cell => { entry[cell.dataset.standingField] = cell.dataset.value === '' ? null : Number(cell.dataset.value); });
    return entry;
  });
  return validateStandings({ ok: true, provider: 'ESPN', league, phase: 'league', season: Number(card.dataset.season), fetchedAt: card.dataset.fetchedAt, stale: true, entries }, league);
}

export function initFixtureStandings() {
  const root = document.querySelector('[data-fixture-standings]');
  if (!root || root.dataset.enhanced === 'true') return;
  const globalStatus = root.querySelector('[data-standings-global-status]');
  const states = new Map();
  for (const config of STANDINGS_LEAGUES) {
    const card = root.querySelector(`[data-standing-league="${config.id}"]`);
    if (!card) return;
    try { states.set(config.id, { card, data: readInitialCard(card, config.id), busy: false, attemptedAt: 0, failed: false }); }
    catch { return; } // Leave the complete static table visible if enhancement cannot initialize.
  }
  root.dataset.enhanced = 'true';
  const note = root.querySelector('[data-standings-static-note]');
  if (note) note.hidden = true;
  const reportGlobal = () => {
    const list = [...states.values()];
    if (list.some(state => state.busy)) { globalStatus.textContent = 'جارٍ التحقق تلقائياً من جداول البطولات الثلاث…'; return; }
    const current = list.filter(state => state.card.dataset.feedState === 'updated').length;
    globalStatus.textContent = current === list.length ? 'التحديث التلقائي يعمل · تمت قراءة جداول البطولات الثلاث.' : `اكتمل التحقق: ${current} من 3 جداول بقراءة ناجحة حديثة؛ بقية الجداول تحتفظ بآخر قراءة ووقتها مع التحذير.`;
  };
  const stale = (state, message, code = '') => {
    state.failed = true;
    state.card.dataset.feedState = 'stale';
    state.card.dataset.diagnostic = code;
    state.card.querySelector('[data-standing-status]').textContent = `${message} · المعروض آخر ترتيب مؤكّد وقد يكون قديماً · آخر قراءة: ${formatTime(state.data.fetchedAt)} بتوقيت القاهرة.`;
  };
  const update = async (config, force) => {
    const state = states.get(config.id);
    // A reconnect while hidden must recover on return, even before the next poll.
    const reconnecting = state.card.dataset.diagnostic === 'OFFLINE';
    if (state.busy || (!force && !reconnecting && Date.now() - state.attemptedAt < 300_000)) return;
    state.attemptedAt = Date.now();
    state.busy = true; state.card.setAttribute('aria-busy', 'true');
    reportGlobal();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(`/standings.php?league=${encodeURIComponent(config.id)}`, { signal: controller.signal, cache: 'no-store', credentials: 'omit', headers: { Accept: 'application/json' } });
      let body; try { body = await response.json(); } catch { body = null; }
      if (!response.ok || body?.ok !== true) {
        const code = typeof body?.code === 'string' && /^[A-Z0-9_]+$/.test(body.code) ? body.code : `HTTP_${response.status}`;
        throw new Error(code);
      }
      const data = validateStandings(body, config.id);
      if (!navigator.onLine) throw new Error('OFFLINE');
      if (data.season < state.data.season || Date.parse(data.fetchedAt) < Date.parse(state.data.fetchedAt)) throw new Error('OLDER_READING');
      state.data = data;
      state.card.querySelector('[data-standing-rows]').innerHTML = renderStandingsRows(data);
      state.card.querySelector('[data-standing-summary]').innerHTML = renderStandingsSummary(data);
      state.card.querySelector('[data-standing-season]').textContent = `موسم ${seasonText(data.season)}`;
      state.card.querySelector('caption').textContent = `${config.title} · موسم ${seasonText(data.season)} · جدول الترتيب`;
      state.card.dataset.fetchedAt = data.fetchedAt; state.card.dataset.season = String(data.season);
      if (data.stale || response.headers.get('X-Standings-Cache') === 'STALE') stale(state, 'تعذرت قراءة أحدث من المصدر؛ استُخدمت نسخة الوسيط المخزّنة', body.code || 'STALE');
      else {
        state.failed = false; state.card.dataset.feedState = 'updated'; state.card.dataset.diagnostic = '';
        state.card.querySelector('[data-standing-status]').textContent = `آخر قراءة ناجحة: ${formatTime(data.fetchedAt)} بتوقيت القاهرة · تحديث تلقائي كل خمس دقائق.`;
      }
    } catch (error) {
      const code = typeof error?.message === 'string' ? error.message : 'UNAVAILABLE';
      const message = !navigator.onLine || code === 'OFFLINE' ? 'لا يوجد اتصال لتحديث الترتيب' : code === 'PHP_PREVIEW_UNAVAILABLE' ? 'المعاينة الحالية لا تشغّل PHP؛ لا يمكنها التحقق من ترتيب أحدث' : code === 'OLDER_READING' ? 'وردت قراءة أقدم؛ لم تُستبدل بها القراءة الأحدث' : code === 'CURL_UNAVAILABLE' ? 'إضافة cURL غير مفعّلة على خادم الترتيب' : 'تعذر تحديث جدول الترتيب من المصدر';
      stale(state, message, /^[A-Z0-9_]+$/.test(code) ? code : 'UNAVAILABLE');
    } finally {
      window.clearTimeout(timeout); state.busy = false; state.card.removeAttribute('aria-busy'); reportGlobal();
    }
  };
  const refresh = (force = false) => {
    if (document.hidden) return;
    if (!navigator.onLine) {
      states.forEach(state => stale(state, 'لا يوجد اتصال لتحديث الترتيب', 'OFFLINE'));
      reportGlobal(); return;
    }
    STANDINGS_LEAGUES.forEach(config => { void update(config, force); });
  };
  refresh(true);
  window.setInterval(() => refresh(true), 300_000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.addEventListener('online', () => refresh(true));
  window.addEventListener('offline', () => {
    states.forEach(state => stale(state, 'لا يوجد اتصال لتحديث الترتيب', 'OFFLINE'));
    reportGlobal();
  });
}

if (typeof document !== 'undefined') initFixtureStandings();
