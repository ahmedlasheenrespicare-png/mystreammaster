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
  /* قاعدة اشتقاق `sourceName`: اسم الحدث لدى ESPN بصيغة «{الضيف} at {المضيف}».
     الاسم الحاسم وقت التشغيل هو `competitors[].team.displayName` الذي تقرأه
     `parseScoreboard` في `lib/matches.mjs` فعلاً؛ أما `sourceName` هنا فللقطة
     الثابتة التي تُرسم بلا JavaScript فقط، وأصلها موثّق لا مخمَّن. */
  sourceNameRule: 'event.name split on " at " → [away, home]',
  /* ما لم يتحقق بعد: نقطة `summary?event=` هي التي تكشف توفر الأحداث
     والتشكيلات والإحصائيات والمواجهات السابقة. لم تُفحص، فكل تبويب يعرض
     «غير متاح» حتى يؤكد المصدر خلاف ذلك — والبند 2 يمنع الوعد بما لا يغطيه
     الربط الحالي. تقييمات اللاعبين غير متوفرة من ESPN إطلاقاً. */
  unverified: [
    'توفر الأحداث (أهداف/بطاقات/تبديلات) من نقطة summary',
    'توفر التشكيلات وموعد إعلانها',
    'توفر الإحصائيات لكل فريق',
    'توفر المواجهات السابقة وتمييز الوديات فيها',
    'تقييمات اللاعبين — ESPN لا يوفّرها، فتبقى «غير متاح»',
  ],
};

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
      externalIds: { espn: null, apifootball: null },
    },
    away: {
      name: 'إيبسويتش تاون',
      shortName: 'إيبسويتش',
      sourceName: 'Ipswich Town',
      logo: null,
      externalIds: { espn: null, apifootball: null },
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
      externalIds: { espn: null, apifootball: null },
    },
    away: {
      name: 'ليفربول',
      shortName: 'ليفربول',
      sourceName: 'Liverpool',
      logo: null,
      externalIds: { espn: null, apifootball: null },
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
      externalIds: { espn: null, apifootball: null },
    },
    away: {
      name: 'أستون فيلا',
      shortName: 'فيلا',
      sourceName: 'Aston Villa',
      logo: null,
      externalIds: { espn: null, apifootball: null },
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
