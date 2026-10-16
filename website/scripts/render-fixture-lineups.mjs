// Build-only rendering. No browser code, API request, tracking or PHP dependency.
const UEFA_URL = 'https://www.uefa.com/uefachampionsleague/match/2049573--atleti-vs-man-utd/lineups/';
const FOTMOB_URL = 'https://www.fotmob.com/matches/atletico-madrid-vs-manchester-united/3d2krr#6106267';
const TEAMS = { atletico: '50124', united: '52682' };
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const isId = value => typeof value === 'string' && /^[1-9]\d{0,11}$/.test(value);
const isText = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 160 && !/[\u0000-\u001f\u007f]/.test(value);
const isMinute = value => Number.isInteger(value) && value >= 1 && value <= 130;
const fail = () => { throw new Error('INVALID_FIXTURE_LINEUPS'); };

export function validateLineupSnapshot(data) {
  if (!data || data.version !== 1 || data.matchId !== '2049573' || data.matchDate !== '2026-10-13' || data.status !== 'confirmed-final'
    || typeof data.reviewedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(data.reviewedAt) || !Number.isFinite(Date.parse(data.reviewedAt))
    || data.sources?.lineups?.provider !== 'UEFA' || data.sources.lineups.url !== UEFA_URL
    || data.sources?.ratings?.provider !== 'FotMob' || data.sources.ratings.url !== FOTMOB_URL || data.sources.ratings.scale !== 10
    || data.sources?.formation?.provider !== 'FotMob' || !Array.isArray(data.teams) || data.teams.length !== 2) fail();
  const slugs = new Set(); const allIds = new Set(); const fotmobIds = new Set();
  for (const team of data.teams) {
    if (!team || TEAMS[team.slug] !== team.id || slugs.has(team.slug) || !isText(team.name) || !isText(team.coach)
      || typeof team.formation !== 'string' || !/^[1-5](?:-[1-5]){2,3}$/.test(team.formation)
      || !Array.isArray(team.starters) || team.starters.length !== 11
      || !Array.isArray(team.substitutes) || team.substitutes.length !== 5
      || !Array.isArray(team.unused) || team.unused.length !== 7
      || !Array.isArray(team.substitutions) || team.substitutions.length !== 5 || !Array.isArray(team.dismissals)) fail();
    slugs.add(team.slug);
    const shape = [1, ...team.formation.split('-').map(Number)];
    if (shape.reduce((sum, n) => sum + n, 0) !== 11 || !Array.isArray(team.lines) || team.lines.length !== shape.length) fail();
    const numbers = new Set();
    for (const [kind, players] of [['starters', team.starters], ['substitutes', team.substitutes], ['unused', team.unused]]) {
      for (const p of players) {
        if (!p || !isId(p.id) || allIds.has(p.id) || !isText(p.name) || !isText(p.sourceName)
          || !Number.isInteger(p.number) || p.number < 1 || p.number > 99 || numbers.has(p.number) || typeof p.captain !== 'boolean'
          || (p.rating !== null && (typeof p.rating !== 'number' || !Number.isFinite(p.rating) || p.rating < 0 || p.rating > 10 || Math.abs(p.rating * 10 - Math.round(p.rating * 10)) > 1e-9))) fail();
        if (kind === 'unused') { if (p.rating !== null || p.fotmobId !== null || p.captain) fail(); }
        else {
          if (!isId(p.fotmobId) || fotmobIds.has(p.fotmobId) || (kind !== 'starters' && p.captain)) fail();
          fotmobIds.add(p.fotmobId);
        }
        allIds.add(p.id); numbers.add(p.number);
      }
    }
    if (team.starters.filter(p => p.captain).length !== 1) fail();
    const starters = new Set(team.starters.map(p => p.id));
    const bench = new Set(team.substitutes.map(p => p.id));
    const formationIds = [];
    team.lines.forEach((line, i) => {
      if (!Array.isArray(line) || line.length !== shape[i] || line.some(id => !starters.has(id))) fail();
      formationIds.push(...line);
    });
    if (new Set(formationIds).size !== 11) fail();
    const off = new Set(); const on = new Set();
    for (const sub of team.substitutions) {
      if (!sub || !isMinute(sub.minute) || !starters.has(sub.off) || !bench.has(sub.on) || off.has(sub.off) || on.has(sub.on)) fail();
      off.add(sub.off); on.add(sub.on);
    }
    const dismissed = new Set();
    for (const event of team.dismissals) {
      if (!event || !starters.has(event.playerId) || !isMinute(event.minute) || off.has(event.playerId) || dismissed.has(event.playerId)) fail();
      dismissed.add(event.playerId);
    }
  }
  const starters = data.teams.flatMap(team => team.starters);
  if (!starters.some(p => p.id === data.recognition?.uefaPlayerOfMatchId) || !starters.some(p => p.id === data.recognition?.fotmobPlayerOfMatchId)) fail();
  return data;
}

export function renderPlayerRating(value) {
  if (value === null) return '<span class="fl-rating fl-rating--unavailable" data-rating-unavailable>غير متاح</span>';
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 10 || Math.abs(value * 10 - Math.round(value * 10)) > 1e-9) fail();
  // Formatting only: no rounding of a score with more precision, no inferred values.
  return `<span class="fl-rating" data-player-rating="${value.toFixed(1)}"><bdi dir="ltr">${value.toFixed(1)}<small>/10</small></bdi></span>`;
}

function renderStartingPlayer(player, team, featured) {
  const sub = team.substitutions.find(item => item.off === player.id);
  const red = team.dismissals.find(item => item.playerId === player.id);
  const event = red ? `<span class="fl-player-event fl-player-event--red">طرد <bdi dir="ltr">${red.minute}′</bdi></span>` : sub ? `<span class="fl-player-event">خرج <bdi dir="ltr">${sub.minute}′</bdi></span>` : '';
  return `<li class="fl-player${player.id === featured ? ' fl-player--featured' : ''}" data-starting-player="${player.id}" data-source-name="${esc(player.sourceName)}">
    <span class="fl-shirt"><bdi dir="ltr">${player.number}</bdi></span><span class="fl-player-name">${esc(player.name)}${player.captain ? '<small class="fl-captain">القائد</small>' : ''}</span>${renderPlayerRating(player.rating)}${event}
  </li>`;
}
function renderTeam(team, featured) {
  const prefix = `fl-${team.slug}`;
  const byId = new Map(team.starters.map(p => [p.id, p]));
  const lineLabel = index => index === 0 ? 'حراسة المرمى' : index === 1 ? 'خط الدفاع' : index === team.lines.length - 1 ? 'خط الهجوم' : 'خط الوسط';
  return `<article class="fl-team fl-team--${team.slug}" data-lineup-team="${team.slug}" aria-labelledby="${prefix}-title">
    <header class="fl-team-heading"><div><p class="fl-team-kicker">${team.slug === 'atletico' ? 'صاحب الأرض' : 'الفريق الضيف'} · تشكيل البداية</p><h3 id="${prefix}-title">${esc(team.name)}</h3><p class="fl-coach">المدرب: ${esc(team.coach)}</p></div><div class="fl-formation-badge"><span>خطة البداية</span><bdi dir="ltr" data-lineup-formation>${team.formation}</bdi></div></header>
    <h4 class="fl-group-heading" id="${prefix}-starters">التشكيل الأساسي <span>11 لاعباً</span></h4>
    <div class="fl-pitch" aria-labelledby="${prefix}-starters" aria-describedby="lineups-pitch-note"><span class="fl-pitch-centre" aria-hidden="true"></span><ol class="fl-formation">${team.lines.map((ids, i) => `<li class="fl-line" data-formation-line="${i}"><ol class="fl-line-players" data-players="${ids.length}" aria-label="${lineLabel(i)}">${ids.map(id => renderStartingPlayer(byId.get(id), team, featured)).join('')}</ol></li>`).join('')}</ol></div>
    <h4 class="fl-group-heading" id="${prefix}-substitutes">البدلاء الذين شاركوا</h4>
    <div class="fl-substitutes-wrap"><table class="fl-substitutes" aria-labelledby="${prefix}-substitutes"><caption>${esc(team.name)} · دقائق الدخول · التقييم على 10</caption><thead><tr><th scope="col" class="fl-number">رقم</th><th scope="col">اللاعب</th><th scope="col" class="fl-minute">دخول</th><th scope="col" class="fl-score">التقييم</th></tr></thead><tbody>${team.substitutes.map(p => {
      const sub = team.substitutions.find(item => item.on === p.id);
      return `<tr data-substitute-player="${p.id}" data-source-name="${esc(p.sourceName)}"><td><bdi dir="ltr">${p.number}</bdi></td><th scope="row">${esc(p.name)}</th><td><bdi dir="ltr">${sub.minute}′</bdi></td><td>${renderPlayerRating(p.rating)}</td></tr>`;
    }).join('')}</tbody></table></div>
    ${team.substitutes.some(p => p.rating === null) ? '<p class="fl-unavailable-note">«غير متاح» يعني غياب تقييم منشور لهذا اللاعب، رغم مشاركته؛ ليس صفراً أو تقييماً محسوباً محلياً.</p>' : ''}
    <h4 class="fl-group-heading" id="${prefix}-unused">بدلاء لم يشاركوا</h4><ul class="fl-unused" aria-labelledby="${prefix}-unused">${team.unused.map(p => `<li data-unused-player="${p.id}"><bdi dir="ltr">${p.number}</bdi><span>${esc(p.name)}</span></li>`).join('')}</ul>
  </article>`;
}

export function renderFixtureLineups(snapshot) {
  const data = validateLineupSnapshot(snapshot);
  const players = data.teams.flatMap(team => team.starters);
  const official = players.find(p => p.id === data.recognition.uefaPlayerOfMatchId);
  const rated = players.find(p => p.id === data.recognition.fotmobPlayerOfMatchId);
  const reviewed = new Intl.DateTimeFormat('ar-EG', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(data.reviewedAt));
  return `<header class="section-heading fl-heading"><span class="section-kicker">من بدأ المواجهة؟ · 13 أكتوبر 2026</span><h2 class="section-title" id="match-lineups-title">تشكيل الفريقين وتقييمات اللاعبين</h2><p>تشكيل البداية المؤكد، لا تشكيل متوقّع؛ الأساسيون والبدلاء والقادة ودقائق التبديلات، مع تقييمات اللاعبين على مقياس 10.</p></header>
    <p class="fl-context" data-lineups-reading>لقطة بعد انتهاء المباراة · مراجعة البيانات: <time datetime="${esc(data.reviewedAt)}">${esc(reviewed)}</time> بتوقيت القاهرة. التقييمات ليست لحظية ولا تُحدَّث آلياً، ولا تغيّر إحصائيات المباراة النهائية أو جداول الترتيب المتجددة.</p>
    <div class="fl-recognition"><p data-recognition="fotmob"><span>أعلى تقييم منشور</span><strong>${esc(rated.name)}</strong>${renderPlayerRating(rated.rating)}</p><p data-recognition="uefa"><span>الجائزة الرسمية لرجل المباراة</span><strong>${esc(official.name)}</strong><span class="fl-award-note">جائزة مستقلة عن التقييم الرقمي</span></p></div>
    <p class="fl-context" id="lineups-pitch-note">الرسم توضيحي لتشكيل البداية، والهجوم إلى أعلى؛ لا يمثّل مواقع اللاعبين أو تحرّكاتهم خلال اللقاء. الأسماء والأرقام والتقييمات ظاهرة حتى دون JavaScript.</p>
    <div class="fl-teams">${data.teams.map(team => renderTeam(team, rated.id)).join('')}</div>
    <p class="fl-context">التقييمات لقطة بعد المباراة؛ لا يُحسب متوسط للفريق محلياً، ولا تُقدَّر الدرجات الغائبة.</p>`;
}
