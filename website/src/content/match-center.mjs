/* ==========================================================================
   مركز المباراة — تعريف مباريات التجربة الثلاث (الدوري الإنجليزي)
   --------------------------------------------------------------------------
   لماذا .mjs وليس .ts أو .json؟
   لأن هذا الملف يستهلكه أربعة أطراف مختلفة: تطبيق React، و`seo.ts`، و
   سكربتات البناء (`prerender.mjs` عبر `entry-server.tsx`)، وسكربتات
   الاختبار في Node. صيغة .mjs مع .d.mts هي العرف القائم في المشروع لهذا
   الغرض بالضبط — انظر `lib/matches.mjs` و`navigation.mjs` و`site.mjs`.

   عرفا التسمية المتّبعان هنا (وليسا اختراعي):
   • `name` عربي + `sourceName` كما يرسله المصدر — نفس بنية
     `content/fixture-lineups-snapshot.json` التي تحمل
     `"name":"يان أوبلاك","sourceName":"Jan Oblak"` للاعب نفسه.
   • الـslug لاتيني باسمي الفريقين — نفس نمط صفحة المباراة الوحيدة القائمة
     في المشروع: `legacy/manchester-united-atletico/`.

   ✅ حالة التحقق: `verification: 'confirmed'`
   المعرّفات والمواعيد والملاعب أدناه **مطابَقة مع مصدر البيانات** في
   2026-10-16، والأصول في `MATCH_CENTER_VERIFICATION`. طابقتْ ما كان مخزّناً
   من موجز صاحب المشروع تطابقاً تاماً: نفس اللحظة الزمنية، ونفس نص الملعب
   حرفياً، ونفس اتجاه المضيف/الضيف.
========================================================================== */

/* منطق الربط والتحقق يعيش في طبقة العقد وحدها، وهذا الملف يستهلكه ولا يعيد
   كتابته — فلا ينشأ تعريفان للتحقق يتباعدان لاحقاً. */
import { isVerified, matchByFixtureId } from '../lib/match-center.mjs';

/* ───────────── أصل التحقق — من أين جاءت هذه الأرقام ───────────── */

/* البند 2: «استخراج معرف المباراة Fixture ID ومعرفات الفريقين من المصدر
   نفسه». لذلك يُسجَّل هنا أصل كل رقم حرفياً، على عرف `provenance` القائم في
   `fixture-lineups-snapshot.json`. أي رقم في هذا الملف إمّا وارد أدناه أو
   مشتق منه بقاعدة معلنة — ولا ثالث. */
export const MATCH_CENTER_VERIFICATION = {
  verifiedAt: '2026-10-16T00:00:00Z',
  provider: 'espn',
  endpoint: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=20261017&limit=500',
  method: 'استدعى صاحب المشروع نقطة النهاية بنفسه وأرسل المخرجات الخام؛ بيئة العمل تحجب ESPN فلا وصول مباشر لها.',
  /* كل أحداث eng.1 في ذلك اليوم كما وردت — تُستخدم في الاختبارات كحالة واقعية
     للربط الخاطئ: منها حدثان **ليسا** ضمن التجربة، وأحدهما عند نفس اللحظة. */
  receivedEvents: [
    { id: '401878771', date: '2026-10-17T11:30Z', name: 'Chelsea at Everton', venue: 'Hill Dickinson Stadium', inTrial: false },
    { id: '401879262', date: '2026-10-17T14:00Z', name: 'Liverpool at Brentford', venue: 'Gtech Community Stadium', inTrial: true },
    { id: '401878770', date: '2026-10-17T14:00Z', name: 'Hull City at Fulham', venue: 'Craven Cottage', inTrial: false },
    { id: '401879259', date: '2026-10-17T14:00Z', name: 'Ipswich Town at Manchester City', venue: 'Etihad Stadium', inTrial: true },
    { id: '401879258', date: '2026-10-17T16:30Z', name: "Aston Villa at Newcastle United", venue: "St. James' Park", inTrial: true },
  ],
  /* مخرجات P0 (2026-10-16، ثاني إرسال من صاحب المشروع لنفس نقطة النهاية):
     `competitors[].team.id` لكل فريق — أصل معرّفات الفرق الستة المخزّنة في
     `externalIds.espn` لكل فريق، وبها يُربط Form بالفريق لا باسمه. */
  receivedTeams: [
    { event: '401879259', side: 'home', id: '382', name: 'Manchester City' },
    { event: '401879259', side: 'away', id: '373', name: 'Ipswich Town' },
    { event: '401879262', side: 'home', id: '337', name: 'Brentford' },
    { event: '401879262', side: 'away', id: '364', name: 'Liverpool' },
    { event: '401879258', side: 'home', id: '361', name: 'Newcastle United' },
    { event: '401879258', side: 'away', id: '362', name: 'Aston Villa' },
  ],
  /* قاعدة اشتقاق `sourceName`: اسم الحدث لدى ESPN بصيغة «{الضيف} at {المضيف}».
     الاسم الحاسم وقت التشغيل هو `competitors[].team.displayName` الذي تقرأه
     `parseScoreboard` في `lib/matches.mjs` فعلاً؛ أما `sourceName` هنا فللقطة
     الثابتة التي تُرسم بلا JavaScript فقط، وأصلها موثّق لا مخمَّن. */
  sourceNameRule: 'event.name split on " at " → [away, home]',
  /* ما لم يتحقق بعد. نقطة `summary?event=` فُحصت فعلاً في 2026-10-16
     ونتيجتها في `MATCH_CENTER_SUMMARY_PROBE` أدناه؛ حسمتْ بعض هذه النقاط
     وأبقت أخرى معلّقة، فالقائمة هنا تشير إلى الفحص ولا تكرر كلامه.
     القاعدة الحاكمة: البند 2 — لا نَعِد بما لا يغطيه الربط الحالي. */
  unverified: [
    'الأحداث داخل المباراة (أهداف/بطاقات/تبديلات) — الحاوي `boxscore` فارغ قبل البداية بطبيعته، فلا يُستنتج توفرها إلا بفحص أثناء مباراة حيّة',
    'التشكيلات وموعد إعلانها — `lineups` ليست من مفاتيح الاستجابة أصلاً والفحص أعادها فارغة',
    'الإحصائيات داخل المباراة — لم تُرصد؛ الموجود أربعة مقاييس مجمّعة لم يُحسم مفتاحها الحاوي ولا فترة عينتها',
    'المواجهات السابقة — `h2h` فارغة، و`seasonseries` موجود ولم يُفحص محتواه، فتمييز الوديات غير محسوم',
    'تقييمات اللاعبين — ESPN لا يوفّرها إطلاقاً، فتبقى «غير متاح» بصفة نهائية لا معلّقة',
  ],
};

/* ==========================================================================
   فحص نقطة `summary?event=` — 2026-10-16
   --------------------------------------------------------------------------
   هذه هي النقطة التي تكشف ما إذا كانت الأحداث والتشكيلات والإحصائيات
   والمواجهات متوفرة فعلاً. فُحصت على `401879262` (برينتفورد × ليفربول)
   قبل البداية، والمخرجات أدناه حرفية.

   أهم ما فيها سلباً لا إيجاباً: الاستجابة تحمل 17 مفتاحاً، أكثرها
   **ممنوع الاستخدام** بحكم بنود الموجز لا بحكم التقنية — `odds`
   و`pickcenter` (البند 9: لا تُعرض توقعات المزوّد ولا احتمالات الفوز
   إحصائيات)، و`ticketsInfo` (البند 13: لا عروض تذاكر غير موجودة)،
   و`news` (البند 12: لا نسخ مقالات)، و`broadcasts` (البند 12: أسماء
   القنوات في «التوثيق والمراجعة» وحده). لذلك يُسجَّل هنا حكم لكل مفتاح،
   فلا يتحول «المصدر يوفّره» إلى «الموقع يعرضه» بغير قرار.
========================================================================== */
export const MATCH_CENTER_SUMMARY_PROBE = {
  probedAt: '2026-10-16T00:00:00Z',
  provider: 'espn',
  endpoint: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/summary?event=401879262',
  subjectEventId: '401879262',
  subjectSlug: 'brentford-liverpool',
  method: 'استدعى صاحب المشروع نقطة النهاية بنفسه وأرسل المخرجات الخام؛ بيئة العمل تحجب ESPN فلا وصول مباشر لها.',
  /* حالة المباراة وقت الفحص: قبل البداية. هذا يفسّر فراغ `lineups` و`h2h`
     ولا يُصلح دليلاً على أن `boxscore` سيبقى خالياً من أرقام المباراة. */
  matchStateAtProbe: 'pre-match',
  topLevelKeys: [
    'boxscore', 'broadcasts', 'format', 'gameInfo', 'hasOdds', 'header',
    'lastFiveGames', 'leaders', 'meta', 'news', 'odds', 'pickcenter',
    'rosters', 'seasonseries', 'standings', 'ticketsInfo', 'wallclockAvailable',
  ],
  observed: {
    /* `lineups` ليست من المفاتيح السبعة عشر، والفحص أعاد مصفوفة فارغة. */
    lineups: [],
    /* أربعة مقاييس لكل فريق، متطابقة الترتيب بين الطرفين — وهذا التجانس
       شرط البند 9. لكن مخرجات الفحص **لا تُسمّي المفتاح الحاوي**، فلا يجوز
       استعمالها قبل حسمه وحسم فترة العينة. */
    metricNamesBySide: [
      ['goalDifference', 'totalGoals', 'goalAssists', 'goalsConceded'],
      ['goalDifference', 'totalGoals', 'goalAssists', 'goalsConceded'],
    ],
    metricNamesContainingKey: null,
    headToHead: [],
    standingsKeys: ['fullViewLink', 'groups', 'header'],
    oddsCount: 2,
  },
  /* حكم كل مفتاح: `available` يُستعمل، `confined` يُستعمل في موضع مقيّد،
     `forbidden` لا يُستعمل وإن وُجد، `unresolved` لم يُحسم، و
     `available-not-used` متوفر لكن استعماله يخرق بنداً آخر. */
  usage: [
    { key: 'header', verdict: 'available', rule: 'البند 4 و7', note: 'الحالة والنتيجة والفريقان — وهو ما تقرأه `parseScoreboard` القائمة فعلاً.' },
    { key: 'gameInfo', verdict: 'available', rule: 'البند 4', note: 'تفاصيل الملعب؛ نص الملعب مطابَق حرفياً في `MATCH_CENTER_VERIFICATION`.' },
    { key: 'wallclockAvailable', verdict: 'available', rule: 'البند 7', note: 'سندٌ لقراءة وقت المباراة من المصدر بدل استنتاجه من مرور 90 دقيقة.' },
    { key: 'format', verdict: 'available', rule: 'البند 4', note: 'بيانات وصفية عن نظام المسابقة؛ قيمة تحريرية منخفضة.' },
    { key: 'meta', verdict: 'available', rule: 'البند 11', note: 'بيانات وصفية للاستجابة نفسها، تصلح لوقت القراءة.' },
    { key: 'standings', verdict: 'available-not-used', rule: 'البند 11', note: 'الترتيب متاح هنا، لكن `standings.php` القائمة تخدم `eng.1` بمخبأ مشترك؛ أخذ نسخة لكل مباراة يضاعف القراءات ثلاثاً ويخرق «ترتيب مشترك بين المباريات الثلاث».' },
    { key: 'boxscore', verdict: 'unresolved', rule: 'البند 7', note: 'حاوي أرقام المباراة والأحداث. فارغ قبل البداية بطبيعته، فلا يُستنتج شيء عن وقت المباراة إلا بفحص أثناء مباراة حيّة.' },
    { key: 'lastFiveGames', verdict: 'unresolved', rule: 'البند 9', note: 'مرشّح لحمل المقاييس الأربعة؛ لم يُحسم، وفترة العينة شرطٌ لرسم الرادار.' },
    { key: 'leaders', verdict: 'unresolved', rule: 'البند 9', note: 'مرشّح ثانٍ لحمل المقاييس الأربعة؛ الخلط بين المرشّحين يعني مقارنة أرقام فترتين مختلفتين.' },
    { key: 'seasonseries', verdict: 'unresolved', rule: 'البند 6 و8', note: 'المرشّح الوحيد للمواجهات السابقة بعد فراغ `h2h`؛ لم يُفحص محتواه ولا إمكانية تمييز الوديات.' },
    { key: 'rosters', verdict: 'confined', rule: 'البند 6', note: 'قوائم اللاعبين **ليست** تشكيلاً معلناً. عرضها على أنها تشكيل تخمينٌ لأسماء اللاعبين، وهو ممنوع؛ تبقى التشكيلات «لم يُعلن بعد».' },
    { key: 'broadcasts', verdict: 'confined', rule: 'البند 12', note: 'أسماء القنوات تُعرض في «التوثيق والمراجعة» وحده.' },
    { key: 'news', verdict: 'forbidden', rule: 'البند 12', note: 'لا نسخ مقالات كاملة ولا صور ولا وجوه؛ الروابط في «التوثيق والمراجعة» وحده.' },
    { key: 'odds', verdict: 'forbidden', rule: 'البند 9', note: 'وُجدت (طول 2) ومعها `hasOdds`، ولا تُعرض إحصائياتٍ ولا تُستعمل بديلاً عن الرادار.' },
    { key: 'hasOdds', verdict: 'forbidden', rule: 'البند 9', note: 'راية `odds` نفسها؛ تُسجَّل ولا تُعرض.' },
    { key: 'pickcenter', verdict: 'forbidden', rule: 'البند 9', note: 'توقعات المزوّد واحتمالاته — ممنوعة صراحةً.' },
    { key: 'ticketsInfo', verdict: 'forbidden', rule: 'البند 13', note: 'لا تُبنى منها `offers` في JSON-LD؛ الموقع لا يبيع تذاكر.' },
  ],
  /* ما يبقى معلّقاً ويحتاج فحصاً واحداً إضافياً قبل استعمال أيٍّ منه. */
  unresolved: [
    'أي مفتاح يحمل المقاييس الأربعة، وما قيمها، وما فترة العينة (موسم حتى الآن؟ آخر خمس مباريات؟)',
    'هل المقاييس الأربعة متجانسة الفترة بين الفريقين — شرط البند 9 لمقارنة ما قبل المباراة',
    'هل `seasonseries` يحمل مواجهات سابقة فعلاً، وهل يمكن تمييز الوديات فيها لاستبعادها',
    'ماذا يحمل `boxscore` أثناء المباراة: أحداث، `keyEvents`، إحصائيات، وهل يُتميَّز الهدف الملغى بقرار VAR',
    'هل تظهر `lineups` لاحقاً وبأي مهلة قبل البداية',
  ],
};

/* ==========================================================================
   فحص P1 — `summary` لمباراة منتهية (Fulham at Ipswich Town, 401879265)
   --------------------------------------------------------------------------
   أرسل صاحب المشروع المخرجات في 2026-10-16 (وصلت مقصوصة الرأس). المؤكد منها
   حرفياً أدناه؛ وما كان في الجزء المقصوص يبقى «غير مفحوص» ولا يُستنتج.
========================================================================== */
export const MATCH_CENTER_FINISHED_PROBE = {
  probedAt: '2026-10-16T00:00:00Z',
  provider: 'espn',
  endpoint: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/summary?event=401879265',
  subjectEventId: '401879265',
  matchStateAtProbe: 'finished (STATUS_FULL_TIME, 2026-10-10)',
  confirmed: {
    /* `seasonseries` مصفوفة بسلسلة «head-to-head» واحدة: عنوان، «Last 5
       Matchups»، وأحداث بكلٍّ من: id وتاريخ وحالة post مكتملة، ومتنافسان
       بمعرّف فريق ونتيجة، و`competitionName` (دوري/كأس رابطة/تشامبيونشيب).
       لا وسم وديات صريح ولا ملعب ولا وقت إضافي/ترجيح في العينة المرصودة. */
    seasonseries: 'present-head-to-head-last-5-all-competitions',
    /* `boxscore` مفتاحه الوحيد `teams`، ولكل فريق نفس 29 إحصائية ترتيباً
       وتسميةً (استحواذ، تسديدات كلية/على المرمى، ركنيات، أخطاء، تسلل،
       بطاقات، تمريرات ودقتها، تصديات، اعتراضات...). لا إحصائية خارج
       المرمى باسمها — لا تُشتق إلا بتعريف موثق. */
    teamStatistics: 'boxscore.teams-29-stats-identical-both-sides',
    /* أحداث موجودة (23 لهذه المباراة) بشكل: id، type{text,type}، period،
       clock{value,displayValue}، scoringPlay، wallclock، shootout. أنماط
       الهدف/التبديل/VAR التفصيلية لم تُرصد بعد — عينة [0] كانت Kickoff. */
    keyEvents: 'present-23-first-is-kickoff',
    /* `lastFiveGames` لكل فريق 5 أحداث، ببطولة مسماة «2026-27 English
       Premier League» في العينة (نطاق دوري هنا) ونتيجة نصية «5-2».
       حقول التاريخ/الخصم/الاتجاه في الحدث الواحد لم تُرصد بعد. */
    lastFiveGames: 'present-5-per-team-league-labelled',
    /* حتى بعد النهاية: مفتاح `lineups` غير موجود أصلاً، و`rosters` بطول 2. */
    lineupsKey: 'absent-even-after-full-time',
    rosters: 'present-length-2-structure-unprobed',
    /* `gameInfo` = ملعب (id واسم ومدينة/دولة فقط) + حضور. لا حكم في العينة. */
    gameInfo: 'venue+attendance-only-no-referee-in-sample',
    /* قادة إحصائيات لاعبين (تمريرات دقيقة، تدخلات دفاعية...) بلا أي تقييم. */
    leaders: 'player-stat-leaders-no-ratings',
  },
  stillUnprobed: [
    'أنماط `keyEvents` التفصيلية: هدف/بطاقة/تبديل/جزاء/VAR وبنية لاعبيها',
    'حدث `lastFiveGames` الواحد كاملاً: التاريخ والخصم واتجاه النتيجة',
    'بنية `rosters`: هل تحمل أساسيين/خطة لمباراة منتهية أم قوائم فقط',
    'سلوك `boxscore`/`keyEvents` أثناء اللعب (مسبار P2 يوم مباراة حية)',
  ],
};

/** حكم مفتاح في استجابة `summary` — `null` إن لم يُفحص المفتاح. */
export function summaryKeyVerdict(key) {
  const entry = MATCH_CENTER_SUMMARY_PROBE.usage.find(item => item.key === key);
  return entry ? entry.verdict : null;
}

/** المفاتيح الممنوعة منعاً صريحاً — تُستخدم في الاختبارات حارساً لا توثيقاً. */
export function forbiddenSummaryKeys() {
  return MATCH_CENTER_SUMMARY_PROBE.usage.filter(item => item.verdict === 'forbidden').map(item => item.key);
}

/* البطولة الأم — المسار المتداخل تحت صفحة البطولة القائمة (القرار المعتمد).
   `slug` و`leagueId` هما الموجودان فعلاً في `content/competitions.ts`
   (`LEAGUE_LANDINGS[0]`) وفي `ALLOWED_LEAGUES` داخل `scoreboard.php`. */
export const MATCH_CENTER_COMPETITION = {
  slug: 'الدوري-الإنجليزي',
  leagueId: 'eng.1',
  name: 'الدوري الإنجليزي الممتاز',
  season: '2026/27',
};

export const MATCH_CENTER_MATCHES = [
  {
    id: 'manchester-city-ipswich-town',
    slug: 'manchester-city-ipswich-town',
    competitionSlug: MATCH_CENTER_COMPETITION.slug,
    competitionName: MATCH_CENTER_COMPETITION.name,
    leagueId: MATCH_CENTER_COMPETITION.leagueId,
    season: MATCH_CENTER_COMPETITION.season,
    round: null, /* يُملأ من المصدر — لا يُخمَّن */
    /* البند 1: يُخزَّن UTC فقط. العرض عبر Intl بـAfrica/Cairo وAsia/Riyadh.
       المصدر أرسل `2026-10-17T14:00Z` وهي نفس اللحظة المخزّنة هنا؛ وتُكتب
       بالثواني لأن صيغتنا الكاملة أدق ولا يختلف عنها `Date.parse`.
       14:00Z = ١٧:٠٠ القاهرة = ١٧:٠٠ مكة = 15:00 لندن (BST). */
    kickoffUtc: '2026-10-17T14:00:00Z',
    venue: 'Etihad Stadium',
    /* نص الحدث كما ورد من المصدر حرفياً — أصل اشتقاق `sourceName`. */
    sourceEventName: 'Ipswich Town at Manchester City',
    verification: 'confirmed',
    externalIds: { espn: '401879259', apifootball: null },
    home: {
      name: 'مانشستر سيتي',
      shortName: 'سيتي',
      sourceName: 'Manchester City',
      /* البند 4: الشعار «عند توفر أصول مسموح باستخدامها». لا يُنزَّل ولا
         يُستضاف محلياً (البند 12)؛ طبقة البيانات الحية تملؤه من
         `team.logo` الذي ترسله ESPN، كما تفعل `MatchesPage` اليوم. */
      logo: null,
      /* معرّف فريق ESPN مؤكد من مخرجات P0 (2026-10-16، أرسلها صاحب المشروع):
         `competitors[].team.id` لحدث 401879259. به تُربط نتائج Form بالفريق لا باسمه. */
      externalIds: { espn: '382', apifootball: null },
    },
    away: {
      name: 'إيبسويتش تاون',
      shortName: 'إيبسويتش',
      sourceName: 'Ipswich Town',
      logo: null,
      /* معرّف فريق ESPN من P0 — انظر `MATCH_CENTER_VERIFICATION.receivedTeams`. */
      externalIds: { espn: '373', apifootball: null },
    },
  },
  {
    id: 'brentford-liverpool',
    slug: 'brentford-liverpool',
    competitionSlug: MATCH_CENTER_COMPETITION.slug,
    competitionName: MATCH_CENTER_COMPETITION.name,
    leagueId: MATCH_CENTER_COMPETITION.leagueId,
    season: MATCH_CENTER_COMPETITION.season,
    round: null,
    kickoffUtc: '2026-10-17T14:00:00Z',
    venue: 'Gtech Community Stadium',
    sourceEventName: 'Liverpool at Brentford',
    verification: 'confirmed',
    externalIds: { espn: '401879262', apifootball: null },
    home: {
      name: 'برينتفورد',
      shortName: 'برينتفورد',
      sourceName: 'Brentford',
      logo: null,
      externalIds: { espn: '337', apifootball: null },
    },
    away: {
      name: 'ليفربول',
      shortName: 'ليفربول',
      sourceName: 'Liverpool',
      logo: null,
      externalIds: { espn: '364', apifootball: null },
    },
  },
  {
    id: 'newcastle-united-aston-villa',
    slug: 'newcastle-united-aston-villa',
    competitionSlug: MATCH_CENTER_COMPETITION.slug,
    competitionName: MATCH_CENTER_COMPETITION.name,
    leagueId: MATCH_CENTER_COMPETITION.leagueId,
    season: MATCH_CENTER_COMPETITION.season,
    round: null,
    /* 16:30Z = ١٩:٣٠ القاهرة ومكة = 17:30 لندن. محسوب عبر Intl لا مضافاً يدوياً. */
    kickoffUtc: '2026-10-17T16:30:00Z',
    venue: "St. James' Park",
    sourceEventName: 'Aston Villa at Newcastle United',
    verification: 'confirmed',
    externalIds: { espn: '401879258', apifootball: null },
    home: {
      name: 'نيوكاسل يونايتد',
      shortName: 'نيوكاسل',
      sourceName: 'Newcastle United',
      logo: null,
      externalIds: { espn: '361', apifootball: null },
    },
    away: {
      name: 'أستون فيلا',
      shortName: 'فيلا',
      sourceName: 'Aston Villa',
      logo: null,
      externalIds: { espn: '362', apifootball: null },
    },
  },
];

/* البند 12: أسماء المزوّدين وروابط الاستشهاد تظهر في «التوثيق والمراجعة»
   فقط. هذه هي المادة الوحيدة المسموح لها بذلك، وتستثنيها الاختبارات من حظر
   أسماء المصادر — تماماً كما يفعل `test-fixture-sources.mjs` مع
   `#report-sources` في الصفحة القائمة. */
export const MATCH_CENTER_DOCUMENTATION = {
  /* الاستثناءان المعتمدان في البند 12 يبقى نصّهما كما هو. */
  rightsNote:
    'هذه الصفحة لا تعرض أي بث مباشر ولا تحتفظ بأي رابط بث؛ الموقع وسيط تقني ودليل للمشاهدة الرسمية. شعارات الأندية للتمييز بين الفريقين، والعلامات والشعارات ملك لأصحابها.',
  /* لا يُنشر أي اسم مزوّد خارج هذا القسم. القيم أدناه تُعرض هنا وحدها. */
  providers: [
    {
      id: 'scoreboard',
      label: 'النتائج والمواعيد والحالة',
      note: 'تصل عبر وسيط خادم الموقع، ولا تُطلب من المتصفح إلى أي نطاق خارجي.',
    },
    {
      id: 'standings',
      label: 'ترتيب الدوري',
      note: 'جدول واحد مشترك بين المباريات الثلاث، لا يُطلب لكل مباراة على حدة.',
    },
  ],
};

/* ───────────────── مسارات ومساعدات ───────────────── */

/** البند 3: رابط ثابت لكل مباراة، لا يحمل حالة ولا نتيجة. */
export function matchCenterPath(match) {
  return `/matches/${match.competitionSlug}/${match.slug}/`;
}

/** تُستخدم في `getAllRoutes()` و`APP_PATHS` — فلا تُكتب المسارات يدوياً في مكانين. */
export function matchCenterRoutes() {
  return MATCH_CENTER_MATCHES.map(matchCenterPath);
}

/* `matchCenterPath` تنتهي بشرطة مائلة لأنها شكل الرابط المنشور (canonical
   وhref). أما الموجّه و`getAllRoutes()` فيعملان بمسارات **مطبَّعة بلا شرطة
   أخيرة** — `normalizePath` في `router.tsx` يجرّدها، و`sitemap()` في
   `prerender.mjs` يضيفها بنفسه. فتمرير الشكل ذي الشرطة إلى هناك ينتج `//`
   في خريطة الموقع ولا يطابق أي مسار في `APP_PATHS`. شكلان مشتقان من مصدر
   واحد، لا مساران مكتوبان يدوياً. */
function stripTrailingSlash(route) {
  const out = String(route).replace(/\/+$/, '');
  return out || '/';
}

/** المسارات مطبَّعة للموجّه والبناء المسبق. */
export function matchCenterRouteIds() {
  return MATCH_CENTER_MATCHES.map(match => stripTrailingSlash(matchCenterPath(match)));
}

/** مطابقة مسار مُطبَّع بتعريف المباراة — يستخدمها `App.tsx` و`seo.ts`. */
export function matchByRoute(path) {
  const normalized = stripTrailingSlash(String(path ?? ''));
  return MATCH_CENTER_MATCHES.find(match => stripTrailingSlash(matchCenterPath(match)) === normalized) || null;
}

export function matchBySlug(slug) {
  return MATCH_CENTER_MATCHES.find(match => match.slug === slug) || null;
}

/**
 * البند 3: «ربط البيانات بالـFixture ID، وليس باسم الفريق أو توقيت البداية
 * وحده». الموجز افترض مباراتين متزامنتين، لكن المصدر أظهر **ثلاث** مباريات
 * عند 14:00Z في `eng.1` يوم 2026-10-17 (منها `Hull City at Fulham` وليست ضمن
 * التجربة). فالربط بالبطولة+التوقيت يُنتج تصادماً ثلاثياً لا ثنائياً — وهذا
 * هو السبب العملي، لا النظري، لأن الربط بالمعرّف إلزامي.
 *
 * تفوّض إلى `matchByFixtureId` في طبقة العقد بدل إعادة كتابتها: منطق الربط
 * واحد، فلا ينشأ نسختان تتباعدان لاحقاً (وهو ما يمنعه البند 3 أصلاً: قالب
 * مشترك لا نسخ متكررة من الشفرة).
 */
export function matchByExternalId(provider, externalId) {
  return matchByFixtureId(MATCH_CENTER_MATCHES, provider, externalId);
}

/**
 * البند 13 و8.5: بوابة الفهرسة وJSON-LD. المعرّفات الآن مؤكَّدة من المصدر
 * فالبوابة مفتوحة، ويُصدر `SportsEvent` ببيانات حقيقية كاملة: الاسم والموعد
 * والملعب والفريقان — **بلا** عروض تذاكر غير موجودة وبلا تقييمات وهمية.
 */
export function allMatchesVerified() {
  return MATCH_CENTER_MATCHES.every(match => isVerified(match));
}
