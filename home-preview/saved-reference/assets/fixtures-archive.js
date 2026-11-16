/** Archive contract, shared by collector, publisher and static renderer. No network. */
export const ARCHIVE_LEAGUES = ['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1', 'sau.1', 'egy.1', 'uefa.champions', 'uefa.europa', 'fifa.worldq.caf', 'fifa.worldq.uefa', 'fifa.friendly'];
export const BIG_FIVE = ARCHIVE_LEAGUES.slice(0, 5);
const integer = value => Number.isInteger(value) && value >= 0;
const text = value => typeof value === 'string' && value.trim().length > 0;
const utc = value => text(value) && /Z$/.test(value) && Number.isFinite(Date.parse(value));
const requireValue = (ok, code) => { if (!ok) throw new Error(code); };
export function validateArchive(data, league = data?.league, season = data?.season) {
  requireValue(ARCHIVE_LEAGUES.includes(league) && data?.league === league && data?.schemaVersion === 1, 'INVALID_LEAGUE_OR_SCHEMA');
  requireValue(/^\d{4}$/.test(String(season)) && data.season === String(season), 'INVALID_SEASON');
  requireValue(Array.isArray(data.matches) && data.matches.length > 0 && data.matches.length <= 10000, 'INVALID_COUNT');
  const ids = new Set();
  for (const m of data.matches) {
    requireValue(text(m.id) && !ids.has(m.id), 'INVALID_OR_DUPLICATE_ID'); ids.add(m.id);
    requireValue(utc(m.date) && utc(m.fetchedAt), 'INVALID_DATE');
    requireValue(['scheduled', 'live', 'finished', 'postponed', 'cancelled', 'suspended', 'unknown'].includes(m.status), 'INVALID_STATUS');
    for (const side of ['home', 'away']) {
      requireValue(text(m[side]?.id) && text(m[side]?.name), 'INVALID_TEAM');
      requireValue(m.score?.[side] === null || integer(m.score?.[side]), 'INVALID_SCORE');
    }
    requireValue(m.home.id !== m.away.id, 'SAME_TEAM');
    requireValue(m.attendance === null || integer(m.attendance), 'INVALID_ATTENDANCE');
    requireValue(m.source?.provider === (league === 'egy.1' ? 'Highlightly' : 'ESPN') && m.source.leagueId === (league === 'egy.1' ? '199067' : league), 'SOURCE_ID_MISMATCH');
    requireValue(typeof m.source.url === 'string' && m.source.url.startsWith(league === 'egy.1' ? 'https://soccer.highlightly.net/matches?' : `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?`) && !/[\s]|key|token/i.test(m.source.url), 'INVALID_SOURCE_URL');
    if (m.statistics !== undefined && m.statistics !== null) {
      for (const side of ['home', 'away']) for (const key of ['possession', 'shots', 'passAccuracy']) {
        const v = m.statistics[side]?.[key];
        requireValue(v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0 && (key === 'shots' ? integer(v) : v <= 100)), 'INVALID_STATISTIC');
      }
    }
  }
  return data;
}
export function mergeArchive(previous, incoming) {
  validateArchive(incoming);
  if (previous) validateArchive(previous, incoming.league, incoming.season);
  const records = new Map((previous?.matches ?? []).map(m => [m.id, m]));
  for (const match of incoming.matches) {
    const old = records.get(match.id);
    const effective = { ...match, statistics: match.statistics ?? old?.statistics ?? null };
    // Fetch timestamps record the last semantic change, not every daily check.
    const semantic = m => JSON.stringify({ ...m, fetchedAt: undefined });
    records.set(match.id, old && semantic(old) === semantic(effective) ? old : effective);
  }
  return validateArchive({ schemaVersion: 1, league: incoming.league, season: incoming.season, matches: [...records.values()].sort((a,b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)) });
}
export function archiveTeamStats(matches) {
  const teams = new Map();
  const valid = matches.filter(m => m.status === 'finished' && integer(m.score.home) && integer(m.score.away)).sort((a,b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  for (const m of valid) for (const side of ['home', 'away']) {
    const team = m[side]; const other = side === 'home' ? 'away' : 'home';
    if (!teams.has(team.id)) teams.set(team.id, { id: team.id, name: team.name, played: 0, cleanSheets: 0, scoreless: 0, winningStreak: 0, unbeatenStreak: 0, home: { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 }, away: { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 } });
    const t = teams.get(team.id), bucket = t[side], gf = m.score[side], ga = m.score[other];
    t.played++; bucket.played++; bucket.goalsFor += gf; bucket.goalsAgainst += ga;
    bucket[gf > ga ? 'wins' : gf === ga ? 'draws' : 'losses']++;
    if (ga === 0) t.cleanSheets++;
    if (gf === 0) t.scoreless++;
    t.winningStreak = gf > ga ? t.winningStreak + 1 : 0;
    t.unbeatenStreak = gf >= ga ? t.unbeatenStreak + 1 : 0;
  }
  // A stored finished match with a missing result is a real gap, not permission
  // to join two winning runs. Keep the streak unknown until a known break.
  const finished = matches.filter(m => m.status === 'finished').sort((a,b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  for (const t of teams.values()) {
    t.winningStreak = 0; t.unbeatenStreak = 0;
    for (const m of finished) {
      const side = m.home.id === t.id ? 'home' : m.away.id === t.id ? 'away' : null;
      if (!side) continue;
      const gf = m.score[side], ga = m.score[side === 'home' ? 'away' : 'home'];
      if (!integer(gf) || !integer(ga)) { t.winningStreak = null; t.unbeatenStreak = null; continue; }
      t.winningStreak = gf > ga ? (t.winningStreak === null ? null : t.winningStreak + 1) : 0;
      t.unbeatenStreak = gf >= ga ? (t.unbeatenStreak === null ? null : t.unbeatenStreak + 1) : 0;
    }
  }
  return [...teams.values()];
}
const gcd = (a, b) => {
  let x = Math.abs(a), y = Math.abs(b);
  while (y) { const t = y; y = x % y; x = t; }
  return x || 1;
};
export function cleanTeamName(name) {
  if (typeof name !== 'string') return '';
  let out = name.trim();
  let prev;
  do {
    prev = out;
    out = out.replace(/&(?:amp|#0*38|#x0*26);/gi, '&');
  } while (out !== prev);
  return out;
}
/* تصنيف تكتيكي تلقائي: مقارنة كل فريق بمتوسط الدوري **بالقيمة الدقيقة
   غير المقربة** قبل التقريب للعرض — الضعف/القوة صارمان (المساواة لا تُحسب
   قوةً). لا يُصنَّف فريق ناقص أي من معدلَيه أو إذا تعذّر حساب المتوسط. */
export const TACTIC_LABELS = {
  'elite-balanced': 'متوازن النخبة',
  offensive: 'اندفاع هجومي',
  defensive: 'تكتل دفاعي',
  struggling: 'يعاني هجومياً ودفاعياً',
};

export function standingsRates(entries) {
  const validGoals = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
  const validPlayed = v => typeof v === 'number' && Number.isFinite(v) && v > 0;
  /* الكسر الدقيق: يُبسَّط (أهداف، لعب) بقاسمهما المشترك الأكبر قبل القسمة،
     فيبقى التقارب بين معدلات مختلفي العينة قابلاً للمقارنة بالمساواة التامة
     قبل أي تقريب للعرض. */
  const rate = (goals, played) => {
    if (!validGoals(goals) || !validPlayed(played)) return null;
    if (Number.isInteger(goals) && Number.isInteger(played)) {
      const g = gcd(goals, played);
      return (goals / g) / (played / g);
    }
    return goals / played;
  };
  /* نفس الكسر الدقيق لكن بسالب مسموح (فارق الأهداف قد يكون سالباً، والنقاط
     قد تحمل خصماً) — لا تُعدّ قيمة ناقصة، لكنها لا تُولّد معدلاً بلا لعب. */
  const signedRate = (numerator, played) => {
    if (typeof numerator !== 'number' || !Number.isFinite(numerator) || !validPlayed(played)) return null;
    if (Number.isInteger(numerator) && Number.isInteger(played)) {
      const g = gcd(numerator, played);
      return (numerator / g) / (played / g);
    }
    return numerator / played;
  };
  const rows = (Array.isArray(entries) ? entries : []).map(t => {
    const winRate = signedRate(t?.wins, t?.played);
    return {
      ...t,
      name: typeof t?.name === 'string' ? cleanTeamName(t.name) : '',
      attack: rate(t?.goalsFor, t?.played),
      defence: rate(t?.goalsAgainst, t?.played),
      gdPerMatch: validGoals(t?.goalsFor) && validGoals(t?.goalsAgainst) ? signedRate(t.goalsFor - t.goalsAgainst, t?.played) : null,
      ppm: signedRate(t?.points, t?.played),
      winPct: winRate === null ? null : winRate * 100,
    };
  });
  /* ملخص المسابقة من القيم المتوفرة فقط — لا تخمين للقيم الناقصة: */
  const contributing = rows.filter(t => validGoals(t.goalsFor) && validPlayed(t.played));
  const totalGoals = contributing.length ? contributing.reduce((s, t) => s + t.goalsFor, 0) : null;
  const totalTeamMatches = contributing.length ? contributing.reduce((s, t) => s + t.played, 0) : null;
  const averagePerTeam = totalGoals !== null && totalTeamMatches ? totalGoals / totalTeamMatches : null;
  const maxOf = (field) => {
    const values = rows.map(t => t[field]).filter(v => v !== null);
    return values.length ? Math.max(...values) : null;
  };
  const maxAttack = maxOf('attack');
  const maxDefence = maxOf('defence');
  /* الفرق المتعادلة تُعرض بأولوية متناسقة: المركز الأعلى في الجدول أولاً،
     ثم الاسم — كي تبقى شارات التعادل مستقرة بين الرسم والفرز. */
  const byStandingPriority = (a, b) => ((a.rank ?? Infinity) - (b.rank ?? Infinity)) || a.name.localeCompare(b.name);
  const extreme = (field, direction) => {
    // A partial table cannot establish league-wide strongest/weakest.
    if (!rows.length || rows.some(t => t[field] === null)) return [];
    const value = Math[direction](...rows.map(t => t[field]));
    return rows.filter(t => t[field] === value).sort(byStandingPriority);
  };
  const bestAttack = extreme('attack', 'max');
  const worstAttack = extreme('attack', 'min');
  const bestDefence = extreme('defence', 'min');
  const worstDefence = extreme('defence', 'max');
  const topBy = (field, direction) => {
    const candidates = rows.filter(t => t[field] !== null);
    if (!candidates.length) return null;
    const value = Math[direction](...candidates.map(t => t[field]));
    return { value, teams: candidates.filter(t => t[field] === value).sort(byStandingPriority) };
  };
  for (const t of rows) {
    t.attackDelta = t.attack !== null && averagePerTeam !== null ? t.attack - averagePerTeam : null;
    t.defenceDelta = t.defence !== null && averagePerTeam !== null ? t.defence - averagePerTeam : null;
    t.tactic = t.attack === null || t.defence === null || averagePerTeam === null
      ? null
      : (t.attack > averagePerTeam && t.defence < averagePerTeam)
        ? 'elite-balanced'
        : t.attack > averagePerTeam
          ? 'offensive'
          : t.defence < averagePerTeam
            ? 'defensive'
            : 'struggling';
  }
  /* توزيع كل مقياس عبر الفرق (متوسط بسيط لقيم العمود ووسيطها وانحرافها
     المعياري على مجتمع الفرق كله — مرجع درجات Z ومؤشر القوة) — وهو مرجع مختلف
     صراحةً عن متوسط المسابقة الموزون بالمباريات (averagePerTeam)
     المستعمل في الفوارق والتصنيف التكتيكي: هنا وحدة القياس «الفريق»
     وهناك «المباراة». التوزيع من ذوي القيم فقط، وغيابهم يعني null،
     وانحراف صفري (كل القيم متساوية أو قيمة واحدة) يترك الدرجات null
     فلا قسمة على صفر ولا «قوة» مختلقة من توزيع مسطّح. */
  const distributionOf = (field) => {
    const values = rows.map((t) => t[field]).filter((v) => typeof v === 'number' && Number.isFinite(v));
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
    return { mean, median, sd, n: values.length };
  };
  const metricFields = ['played', 'goalsFor', 'goalsAgainst', 'goalDifference', 'attack', 'attackDelta', 'defence', 'defenceDelta', 'gdPerMatch', 'ppm', 'winPct'];
  const distributions = {};
  for (const field of metricFields) distributions[field] = distributionOf(field);
  /* درجات Z للهجوم والدفاع ومؤشر القوة المركّب = فرقهما: كم يتفوق
     هجوم الفريق على متوسط الفرق (بانحرافات معيارية) فوق ما يتفوق به
     «استقباله» — مؤشر مشتق مُعلن الصيغة، لا قياس مصدر. غياب أي ركن
     (معدل أو توزيع أو انحراف غير صفري) يترك الكل null لذلك الفريق. */
  const zOf = (value, dist) => (value !== null && dist && dist.sd > 0 ? (value - dist.mean) / dist.sd : null);
  for (const t of rows) {
    t.attackZ = zOf(t.attack, distributions.attack);
    t.defenceZ = zOf(t.defence, distributions.defence);
    t.power = t.attackZ !== null && t.defenceZ !== null ? t.attackZ - t.defenceZ : null;
  }
  distributions.power = distributionOf('power');
  /* متصدّر كل مقياس من مقاييس الجدول التحليلي الاثني عشر — «الأفضل» في
     اتجاه المقياس الدلالي (الأدنى للمستقبَل ومعدله وفارقه، والأعلى
     لسواه)، وبكل المتعادلين بأولوية الترتيب نفسها. بقاعدة صرامة
     التصنيفات الرئيسة: أي فريق ناقص القيمة في مقياس يمنع حسم متصدّره
     (null) فلا يُعلن أولٌ قد يتجاوزه غائب. القيم الخام قد تكون undefined
     في المدخلات الجزئية فتُطبَّع هنا لرقم أو null قبل أي مقارنة. */
  const leaderOf = (field, direction) => {
    if (!rows.length) return null;
    const valueOf = (t) => (typeof t[field] === 'number' && Number.isFinite(t[field]) ? t[field] : null);
    if (rows.some((t) => valueOf(t) === null)) return null;
    const value = Math[direction](...rows.map(valueOf));
    return { value, teams: rows.filter((t) => valueOf(t) === value).sort(byStandingPriority) };
  };
  const leaders = {
    played: leaderOf('played', 'max'),
    goalsFor: leaderOf('goalsFor', 'max'),
    goalsAgainst: leaderOf('goalsAgainst', 'min'),
    goalDifference: leaderOf('goalDifference', 'max'),
    attack: leaderOf('attack', 'max'),
    attackDelta: leaderOf('attackDelta', 'max'),
    defence: leaderOf('defence', 'min'),
    defenceDelta: leaderOf('defenceDelta', 'min'),
    gdPerMatch: leaderOf('gdPerMatch', 'max'),
    power: leaderOf('power', 'max'),
    ppm: leaderOf('ppm', 'max'),
    winPct: leaderOf('winPct', 'max'),
  };
  /* صف «متوسط المسابقة» للجدول التحليلي: متوسط لكل عمود من مساهميه ذوي
     القيم فقط — الأعداد الخام بمتوسطها على الفرق، والمعدلات من إجماليات
     المسابقة (مجموع ÷ مجموع) لا من متوسط معدلات الفرق، فيتسق الصف
     داخلياً كأنه «فريق متوسط» واحد (هجومه = إجمالي أهدافه ÷ مبارياته)،
     ومتوسطا الفارق عن المتوسط موزونان بالمباريات فيؤولان لصفر بالتعريف.
     ناقص أي مدخل يبقى خارج حساب عموده وحده، وغياب المساهمين يعني null. */
  const finite = (v) => typeof v === 'number' && Number.isFinite(v);
  const meanOf = (list, pick) => {
    const values = list.map(pick).filter(finite);
    return values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
  };
  const ratioOf = (list, num, den) => {
    const usable = list.filter((t) => finite(num(t)) && validPlayed(den(t)));
    if (!usable.length) return null;
    const d = usable.reduce((s, t) => s + den(t), 0);
    return d > 0 ? usable.reduce((s, t) => s + num(t), 0) / d : null;
  };
  const deltaWeighted = (field) => {
    const usable = rows.filter((t) => t[field] !== null && validPlayed(t.played));
    if (!usable.length) return null;
    const v = usable.reduce((s, t) => s + t[field] * t.played, 0) / usable.reduce((s, t) => s + t.played, 0);
    return Math.abs(v) < 1e-9 ? 0 : v;
  };
  const winRateAverage = ratioOf(rows, (t) => t.wins, (t) => t.played);
  const averages = {
    played: meanOf(rows.filter((t) => validPlayed(t.played)), (t) => t.played),
    goalsFor: meanOf(rows.filter((t) => validGoals(t.goalsFor)), (t) => t.goalsFor),
    goalsAgainst: meanOf(rows.filter((t) => validGoals(t.goalsAgainst)), (t) => t.goalsAgainst),
    goalDifference: meanOf(rows, (t) => t.goalDifference),
    attack: averagePerTeam,
    defence: ratioOf(rows.filter((t) => validGoals(t.goalsAgainst)), (t) => t.goalsAgainst, (t) => t.played),
    gdPerMatch: ratioOf(
      rows.filter((t) => validGoals(t.goalsFor) && validGoals(t.goalsAgainst)),
      (t) => t.goalsFor - t.goalsAgainst,
      (t) => t.played,
    ),
    ppm: ratioOf(rows, (t) => t.points, (t) => t.played),
    winPct: winRateAverage === null ? null : winRateAverage * 100,
    attackDelta: deltaWeighted('attackDelta'),
    defenceDelta: deltaWeighted('defenceDelta'),
    /* متوسط «القوة» على مكتملَي المعدلين صفر بنيوياً (متوسطا الدرجتين
       صفران) — تُصفَّر بقايا الفاصلة العائمة كي لا يظهر «-0.00» */
    power: (() => { const m = meanOf(rows, (t) => t.power); return m !== null && Math.abs(m) < 1e-9 ? 0 : m; })(),
  };
  return {
    rows,
    bestAttack,
    worstAttack,
    bestDefence,
    worstDefence,
    attackComplete: bestAttack.length > 0,
    defenceComplete: bestDefence.length > 0,
    league: {
      totalGoals,
      totalTeamMatches,
      averagePerTeam,
      maxAttack,
      maxDefence,
      bestGdPerMatch: topBy('gdPerMatch', 'max'),
      bestPpm: topBy('ppm', 'max'),
      averages,
      leaders,
      distributions,
    },
  };
}

/* ==========================================================================
   متوسطات الدوري من الأرشيف المتحقَّق منه — أساس «مقارنة بمتوسط الدوري»
   --------------------------------------------------------------------------
   تُحسب من مباريات منتهية حملت أرقام الطرفين معاً (possession/shots/passAccuracy)،
   بمتوسط لكل **فريق في المباراة** (كل مباراة تسهم بطرفين). مقياس النسب يُوحَّد
   كما في مركز المباراة: الكسر في (0, 1] نقاط مئوية، وما خرج عن [0, 100] يُسقط
   الصف كله — لا تُقصّ قيمة ولا تُصحَّح. عينة أصغر من `minMatches` ⇒ `null`:
   لا متوسط موثقاً يُعلن إلا بعينة تُذكر معها.
========================================================================== */
const statNumber = value => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const percentScale = value => {
  const n = statNumber(value);
  if (n === null || n < 0 || n > 100) return null;
  return n > 0 && n <= 1 ? Math.round(n * 1000) / 10 : n;
};
const round1 = value => Math.round(value * 10) / 10;

export function computeLeagueAverages(matches, { minMatches = 10 } = {}) {
  const list = Array.isArray(matches) ? matches : [];
  const sums = { possession: 0, shots: 0, passAccuracy: 0 };
  let sides = 0;
  let counted = 0;
  for (const match of list) {
    if (match?.status !== 'finished') continue;
    const stats = match?.statistics;
    if (!stats || typeof stats !== 'object') continue;
    const values = {};
    let complete = true;
    for (const key of Object.keys(sums)) {
      const pair = [percentScale(stats.home?.[key]), percentScale(stats.away?.[key])];
      if (key === 'shots') {
        pair[0] = statNumber(stats.home?.shots);
        pair[1] = statNumber(stats.away?.shots);
      }
      if (pair.some(v => v === null)) { complete = false; break; }
      values[key] = pair;
    }
    if (!complete) continue;
    counted += 1;
    sides += 2;
    for (const key of Object.keys(sums)) sums[key] += values[key][0] + values[key][1];
  }
  if (counted < minMatches || sides === 0) return null;
  return {
    matches: counted,
    possession: round1(sums.possession / sides),
    shots: round1(sums.shots / sides),
    passAccuracy: round1(sums.passAccuracy / sides),
  };
}
