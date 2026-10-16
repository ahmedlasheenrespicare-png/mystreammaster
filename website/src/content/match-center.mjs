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

   ⚠️ حالة التحقق: `verification: 'pending'`
   المواعيد والملاعب أدناه **مبدئية من موجز صاحب المشروع**، ولم تُطابَق مع
   مصدر البيانات بعد، لأن بيئة العمل تحجب ESPN وAPI-Football كلياً (موثّق في
   `website/docs/match-center-source-report.md` القسم 3). لذلك:
   • `externalIds` كلها `null` — لا معرّفات مخمّنة، لأن البند 3 يربط البيانات
     بمعرّف المباراة، فتخمينه يُفسد الأساس كله.
   • `sourceName` كلها `null` — تُملأ من استجابة المصدر لحظة التحقق.
   • البند 13 يمنع «كيانات أحداث ناقصة»، فطالما الحالة `pending` تُرسم
     الصفحات بـ`noindex, follow` ولا يُصدر لها JSON-LD من نوع SportsEvent.
   تُقلب `verification` إلى `'confirmed'` وتُملأ المعرّفات في تعديل واحد بعد
   المطابقة — عندها يُرفع noindex ويُصدر JSON-LD كاملاً وحقيقياً.
========================================================================== */

/* منطق الربط والتحقق يعيش في طبقة العقد وحدها، وهذا الملف يستهلكه ولا يعيد
   كتابته — فلا ينشأ تعريفان للتحقق يتباعدان لاحقاً. */
import { isVerified, matchByFixtureId } from '../lib/match-center.mjs';

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
       تم التحقق حسابياً: 14:00Z = ١٧:٠٠ القاهرة = ١٧:٠٠ مكة = 15:00 لندن. */
    kickoffUtc: '2026-10-17T14:00:00Z',
    venue: 'Etihad Stadium',
    verification: 'pending',
    externalIds: { espn: null, apifootball: null },
    home: {
      name: 'مانشستر سيتي',
      shortName: 'سيتي',
      sourceName: null,
      /* البند 4: الشعار «عند توفر أصول مسموح باستخدامها». لا يُنزَّل ولا
         يُستضاف محلياً (البند 12)؛ طبقة البيانات الحية تملؤه من المصدر. */
      logo: null,
      externalIds: { espn: null, apifootball: null },
    },
    away: {
      name: 'إيبسويتش تاون',
      shortName: 'إيبسويتش',
      sourceName: null,
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
    /* ⚠️ تبدأ في نفس لحظة المباراة الأولى تماماً (14:00Z). هذا مقصود في
       البند 3: «المباراتان الأوليان تبدأان معاً؛ لذلك يجب اختبار عدم انتقال
       نتيجة أو حدث أو تشكيل من مباراة إلى أخرى». الاختبار مبني على هذا التطابق. */
    kickoffUtc: '2026-10-17T14:00:00Z',
    venue: 'Gtech Community Stadium',
    verification: 'pending',
    externalIds: { espn: null, apifootball: null },
    home: {
      name: 'برينتفورد',
      shortName: 'برينتفورد',
      sourceName: null,
      logo: null,
      externalIds: { espn: null, apifootball: null },
    },
    away: {
      name: 'ليفربول',
      shortName: 'ليفربول',
      sourceName: null,
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
    /* 16:30Z = ١٩:٣٠ القاهرة ومكة = 17:30 لندن. محسوب لا مُضاف يدوياً. */
    kickoffUtc: '2026-10-17T16:30:00Z',
    venue: "St. James' Park",
    verification: 'pending',
    externalIds: { espn: null, apifootball: null },
    home: {
      name: 'نيوكاسل يونايتد',
      shortName: 'نيوكاسل',
      sourceName: null,
      logo: null,
      externalIds: { espn: null, apifootball: null },
    },
    away: {
      name: 'أستون فيلا',
      shortName: 'فيلا',
      sourceName: null,
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
 * وحده». المباراتان الأوليان تتشاركان البطولة والتوقيت معاً، فأي ربط
 * بالاسم أو بالوقت وحده يُنتج التباساً — لذلك الربط بالمعرّف إلزامي، وهذه
 * الدالة ترفض صراحةً السقوط إلى الاسم حين يكون المعرّف غائباً.
 *
 * تفوّض إلى `matchByFixtureId` في طبقة العقد بدل إعادة كتابتها: منطق الربط
 * واحد، فلا ينشأ نسختان تتباعدان لاحقاً (وهو ما يمنعه البند 3 أصلاً: قالب
 * مشترك لا نسخ متكررة من الشفرة).
 */
export function matchByExternalId(provider, externalId) {
  return matchByFixtureId(MATCH_CENTER_MATCHES, provider, externalId);
}

/**
 * البند 13 و8.5: ما دامت أي مباراة غير مطابَقة مع المصدر، تبقى خارج الفهرسة
 * وبلا JSON-LD. تُقلَب تلقائياً عند تأكيد المعرّفات.
 */
export function allMatchesVerified() {
  return MATCH_CENTER_MATCHES.every(match => isVerified(match));
}
