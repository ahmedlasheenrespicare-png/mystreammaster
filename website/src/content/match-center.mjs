/* ==========================================================================
   مركز المباراة — تعريفات المباريات الإنجليزية والإسبانية المؤكدة
   --------------------------------------------------------------------------
   لماذا .mjs وليس .ts أو .json؟
   لأن هذا الملف يستهلكه أربعة أطراف مختلفة: تطبيق React، و`seo.ts`، و
   سكربتات البناء (`prerender.mjs` عبر `entry-server.tsx`)، وسكربتات
   الاختبار في Node. صيغة .mjs مع .d.mts هي العرف القائم في المشروع لهذا
   الغرض بالضبط — انظر `lib/matches.mjs` و`navigation.mjs` و`site.mjs`.

   عرفا التسمية المتّبعان هنا (وليسا اختراعي):
   • الاسم المعروض + `sourceName` كما يرسله المصدر. الإنجليزية لها أسماء
     عرض عربية؛ الإسبانية تحتفظ بالإنجليزية حرفياً كما وردت من المصدر.
     تبقى بيانات المصدر الخام لكل دفعة منفصلة عن أسماء العرض.
   • الـslug لاتيني باسمي الفريقين — نفس نمط صفحة المباراة الوحيدة القائمة
     في المشروع: `legacy/manchester-united-atletico/`.

   ✅ حالة التحقق: `verification: 'confirmed'`
   المعرّفات والمواعيد والملاعب الإنجليزية الأساسية أدناه **مطابَقة مع المصدر**
   في 2026-10-16، وأصلها في `MATCH_CENTER_VERIFICATION`. دفعات الدوري الإنجليزي
   اللاحقة محفوظة في `match-center-english-followup.mjs`، وخرج `esp.1` الخام في
   `match-center-spanish.mjs`؛ لا يدّعي الملف فحصاً مستقلاً لمخرجات المستخدم.
========================================================================== */

/* منطق الربط والتحقق يعيش في طبقة العقد وحدها، وهذا الملف يستهلكه ولا يعيد
   كتابته — فلا ينشأ تعريفان للتحقق يتباعدان لاحقاً. */
import { isVerified, matchByFixtureId } from '../lib/match-center.mjs';
import {
  MATCH_CENTER_ENGLISH_20261018_20261023_RANGES,
  MATCH_CENTER_ENGLISH_20261018_20261023_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261024_20261030_RANGES,
  MATCH_CENTER_ENGLISH_20261024_20261030_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261031_20261106_RANGES,
  MATCH_CENTER_ENGLISH_20261031_20261106_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261107_20261113_RANGES,
  MATCH_CENTER_ENGLISH_20261107_20261113_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261114_20261120_RANGES,
  MATCH_CENTER_ENGLISH_20261114_20261120_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261121_20261127_RANGES,
  MATCH_CENTER_ENGLISH_20261121_20261127_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261128_20261204_RANGES,
  MATCH_CENTER_ENGLISH_20261128_20261204_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261205_20261211_RANGES,
  MATCH_CENTER_ENGLISH_20261205_20261211_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261212_20261218_RANGES,
  MATCH_CENTER_ENGLISH_20261212_20261218_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261219_20261225_RANGES,
  MATCH_CENTER_ENGLISH_20261219_20261225_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261226_20270101_RANGES,
  MATCH_CENTER_ENGLISH_20261226_20270101_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270102_20270108_RANGES,
  MATCH_CENTER_ENGLISH_20270102_20270108_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270109_20270115_RANGES,
  MATCH_CENTER_ENGLISH_20270109_20270115_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270116_20270122_RANGES,
  MATCH_CENTER_ENGLISH_20270116_20270122_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270123_20270129_RANGES,
  MATCH_CENTER_ENGLISH_20270123_20270129_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270130_20270205_RANGES,
  MATCH_CENTER_ENGLISH_20270130_20270205_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270206_20270212_RANGES,
  MATCH_CENTER_ENGLISH_20270206_20270212_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270213_20270219_RANGES,
  MATCH_CENTER_ENGLISH_20270213_20270219_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270220_20270226_RANGES,
  MATCH_CENTER_ENGLISH_20270220_20270226_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270227_20270305_RANGES,
  MATCH_CENTER_ENGLISH_20270227_20270305_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270306_20270312_RANGES,
  MATCH_CENTER_ENGLISH_20270306_20270312_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270313_20270319_RANGES,
  MATCH_CENTER_ENGLISH_20270313_20270319_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270320_20270326_RANGES,
  MATCH_CENTER_ENGLISH_20270320_20270326_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270327_20270402_RANGES,
  MATCH_CENTER_ENGLISH_20270327_20270402_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270403_20270409_RANGES,
  MATCH_CENTER_ENGLISH_20270403_20270409_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270410_20270416_RANGES,
  MATCH_CENTER_ENGLISH_20270410_20270416_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270417_20270423_RANGES,
  MATCH_CENTER_ENGLISH_20270417_20270423_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270424_20270430_RANGES,
  MATCH_CENTER_ENGLISH_20270424_20270430_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270501_20270507_RANGES,
  MATCH_CENTER_ENGLISH_20270501_20270507_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270508_20270514_RANGES,
  MATCH_CENTER_ENGLISH_20270508_20270514_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270515_20270521_RANGES,
  MATCH_CENTER_ENGLISH_20270515_20270521_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270522_20270528_RANGES,
  MATCH_CENTER_ENGLISH_20270522_20270528_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270529_20270604_RANGES,
  MATCH_CENTER_ENGLISH_20270529_20270604_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270605_20270611_RANGES,
  MATCH_CENTER_ENGLISH_20270605_20270611_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261017_CROSS_REFERENCED_EVENTS,
  MATCH_CENTER_ENGLISH_20261017_CROSS_REFERENCE_VERIFICATION,
} from './match-center-english-followup.mjs';
import {
  MATCH_CENTER_SPANISH_COMPETITION,
  MATCH_CENTER_SPANISH_MATCHES,
  MATCH_CENTER_SPANISH_20261017_20261211_MATCHES,
  MATCH_CENTER_SPANISH_20261212_20270205_MATCHES,
  MATCH_CENTER_SPANISH_20270206_20270212_MATCHES,
  MATCH_CENTER_SPANISH_20270213_20270219_MATCHES,
  MATCH_CENTER_SPANISH_20270220_20270226_MATCHES,
  MATCH_CENTER_SPANISH_20270227_20270305_MATCHES,
  MATCH_CENTER_SPANISH_20270306_20270312_MATCHES,
  MATCH_CENTER_SPANISH_20270313_20270319_MATCHES,
  MATCH_CENTER_SPANISH_20270320_20270326_MATCHES,
  MATCH_CENTER_SPANISH_20270403_20270409_MATCHES,
  MATCH_CENTER_SPANISH_20270410_20270416_MATCHES,
  MATCH_CENTER_SPANISH_20270417_20270423_MATCHES,
  MATCH_CENTER_SPANISH_20270501_20270507_MATCHES,
  MATCH_CENTER_SPANISH_20270508_20270514_MATCHES,
  MATCH_CENTER_SPANISH_20270515_20270521_MATCHES,
  MATCH_CENTER_SPANISH_20270522_20270528_MATCHES,
  MATCH_CENTER_SPANISH_20270529_20270604_MATCHES,
  MATCH_CENTER_SPANISH_20261017_20261211_VERIFICATION,
  MATCH_CENTER_SPANISH_20261212_20270205_VERIFICATION,
  MATCH_CENTER_SPANISH_20270206_20270212_VERIFICATION,
  MATCH_CENTER_SPANISH_20270213_20270219_VERIFICATION,
  MATCH_CENTER_SPANISH_20270220_20270226_VERIFICATION,
  MATCH_CENTER_SPANISH_20270227_20270305_VERIFICATION,
  MATCH_CENTER_SPANISH_20270306_20270312_VERIFICATION,
  MATCH_CENTER_SPANISH_20270313_20270319_VERIFICATION,
  MATCH_CENTER_SPANISH_20270320_20270326_VERIFICATION,
  MATCH_CENTER_SPANISH_20270403_20270409_VERIFICATION,
  MATCH_CENTER_SPANISH_20270410_20270416_VERIFICATION,
  MATCH_CENTER_SPANISH_20270417_20270423_VERIFICATION,
  MATCH_CENTER_SPANISH_20270501_20270507_VERIFICATION,
  MATCH_CENTER_SPANISH_20270508_20270514_VERIFICATION,
  MATCH_CENTER_SPANISH_20270515_20270521_VERIFICATION,
  MATCH_CENTER_SPANISH_20270522_20270528_VERIFICATION,
  MATCH_CENTER_SPANISH_20270529_20270604_VERIFICATION,
} from './match-center-spanish.mjs';

export {
  MATCH_CENTER_ENGLISH_20261018_20261023_RANGES,
  MATCH_CENTER_ENGLISH_20261018_20261023_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261024_20261030_RANGES,
  MATCH_CENTER_ENGLISH_20261024_20261030_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261031_20261106_RANGES,
  MATCH_CENTER_ENGLISH_20261031_20261106_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261107_20261113_RANGES,
  MATCH_CENTER_ENGLISH_20261107_20261113_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261114_20261120_RANGES,
  MATCH_CENTER_ENGLISH_20261114_20261120_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261121_20261127_RANGES,
  MATCH_CENTER_ENGLISH_20261121_20261127_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261128_20261204_RANGES,
  MATCH_CENTER_ENGLISH_20261128_20261204_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261205_20261211_RANGES,
  MATCH_CENTER_ENGLISH_20261205_20261211_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261212_20261218_RANGES,
  MATCH_CENTER_ENGLISH_20261212_20261218_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261219_20261225_RANGES,
  MATCH_CENTER_ENGLISH_20261219_20261225_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261226_20270101_RANGES,
  MATCH_CENTER_ENGLISH_20261226_20270101_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270102_20270108_RANGES,
  MATCH_CENTER_ENGLISH_20270102_20270108_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270109_20270115_RANGES,
  MATCH_CENTER_ENGLISH_20270109_20270115_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270116_20270122_RANGES,
  MATCH_CENTER_ENGLISH_20270116_20270122_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270123_20270129_RANGES,
  MATCH_CENTER_ENGLISH_20270123_20270129_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270130_20270205_RANGES,
  MATCH_CENTER_ENGLISH_20270130_20270205_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270206_20270212_RANGES,
  MATCH_CENTER_ENGLISH_20270206_20270212_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270213_20270219_RANGES,
  MATCH_CENTER_ENGLISH_20270213_20270219_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270220_20270226_RANGES,
  MATCH_CENTER_ENGLISH_20270220_20270226_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270227_20270305_RANGES,
  MATCH_CENTER_ENGLISH_20270227_20270305_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270306_20270312_RANGES,
  MATCH_CENTER_ENGLISH_20270306_20270312_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270313_20270319_RANGES,
  MATCH_CENTER_ENGLISH_20270313_20270319_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270320_20270326_RANGES,
  MATCH_CENTER_ENGLISH_20270320_20270326_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270327_20270402_RANGES,
  MATCH_CENTER_ENGLISH_20270327_20270402_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270403_20270409_RANGES,
  MATCH_CENTER_ENGLISH_20270403_20270409_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270410_20270416_RANGES,
  MATCH_CENTER_ENGLISH_20270410_20270416_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270417_20270423_RANGES,
  MATCH_CENTER_ENGLISH_20270417_20270423_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270424_20270430_RANGES,
  MATCH_CENTER_ENGLISH_20270424_20270430_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270501_20270507_RANGES,
  MATCH_CENTER_ENGLISH_20270501_20270507_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270508_20270514_RANGES,
  MATCH_CENTER_ENGLISH_20270508_20270514_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270515_20270521_RANGES,
  MATCH_CENTER_ENGLISH_20270515_20270521_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270522_20270528_RANGES,
  MATCH_CENTER_ENGLISH_20270522_20270528_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270529_20270604_RANGES,
  MATCH_CENTER_ENGLISH_20270529_20270604_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270605_20270611_RANGES,
  MATCH_CENTER_ENGLISH_20270605_20270611_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261017_CROSS_REFERENCED_EVENTS,
  MATCH_CENTER_ENGLISH_20261017_CROSS_REFERENCE_VERIFICATION,
} from './match-center-english-followup.mjs';

export {
  MATCH_CENTER_SPANISH_COMPETITION,
  MATCH_CENTER_SPANISH_MATCHES,
  MATCH_CENTER_SPANISH_20261017_20261211_MATCHES,
  MATCH_CENTER_SPANISH_20261212_20270205_MATCHES,
  MATCH_CENTER_SPANISH_20270206_20270212_MATCHES,
  MATCH_CENTER_SPANISH_20270213_20270219_MATCHES,
  MATCH_CENTER_SPANISH_20270220_20270226_MATCHES,
  MATCH_CENTER_SPANISH_20270227_20270305_MATCHES,
  MATCH_CENTER_SPANISH_20270306_20270312_MATCHES,
  MATCH_CENTER_SPANISH_20270313_20270319_MATCHES,
  MATCH_CENTER_SPANISH_20270320_20270326_MATCHES,
  MATCH_CENTER_SPANISH_20270403_20270409_MATCHES,
  MATCH_CENTER_SPANISH_20270410_20270416_MATCHES,
  MATCH_CENTER_SPANISH_20270417_20270423_MATCHES,
  MATCH_CENTER_SPANISH_20270501_20270507_MATCHES,
  MATCH_CENTER_SPANISH_20270508_20270514_MATCHES,
  MATCH_CENTER_SPANISH_20270515_20270521_MATCHES,
  MATCH_CENTER_SPANISH_20270522_20270528_MATCHES,
  MATCH_CENTER_SPANISH_20270529_20270604_MATCHES,
  MATCH_CENTER_SPANISH_20261017_20261211_VERIFICATION,
  MATCH_CENTER_SPANISH_20261212_20270205_VERIFICATION,
  MATCH_CENTER_SPANISH_20270206_20270212_VERIFICATION,
  MATCH_CENTER_SPANISH_20270213_20270219_VERIFICATION,
  MATCH_CENTER_SPANISH_20270220_20270226_VERIFICATION,
  MATCH_CENTER_SPANISH_20270227_20270305_VERIFICATION,
  MATCH_CENTER_SPANISH_20270306_20270312_VERIFICATION,
  MATCH_CENTER_SPANISH_20270313_20270319_VERIFICATION,
  MATCH_CENTER_SPANISH_20270320_20270326_VERIFICATION,
  MATCH_CENTER_SPANISH_20270403_20270409_VERIFICATION,
  MATCH_CENTER_SPANISH_20270410_20270416_VERIFICATION,
  MATCH_CENTER_SPANISH_20270417_20270423_VERIFICATION,
  MATCH_CENTER_SPANISH_20270501_20270507_VERIFICATION,
  MATCH_CENTER_SPANISH_20270508_20270514_VERIFICATION,
  MATCH_CENTER_SPANISH_20270515_20270521_VERIFICATION,
  MATCH_CENTER_SPANISH_20270522_20270528_VERIFICATION,
  MATCH_CENTER_SPANISH_20270529_20270604_VERIFICATION,
};

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
/** نافذة أسبوعية فارغة كما أرسلها المستخدم؛ لا تُستنتج منها نهاية الموسم. */
const MATCH_CENTER_SPANISH_20270327_20270402_RANGES = [
  { dates: "20270327-20270402", events: [] },
];

export const MATCH_CENTER_SPANISH_20270327_20270402_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'esp.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة 20270327-20270402 وكانت events فارغة. لا تُستنتج نهاية الموسم من ذلك؛ لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر.',
  receivedRanges: MATCH_CENTER_SPANISH_20270327_20270402_RANGES.map(({ dates, events }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=esp.1&dates=${dates}`,
    eventCount: events.length,
  })),
  receivedEvents: MATCH_CENTER_SPANISH_20270327_20270402_RANGES.flatMap(({ events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED',
  }))),
  receivedTeams: MATCH_CENTER_SPANISH_20270327_20270402_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};

/** نافذة أسبوعية فارغة كما أرسلها المستخدم؛ لا تُستنتج منها نهاية الموسم. */
const MATCH_CENTER_SPANISH_20270424_20270430_RANGES = [
  { dates: "20270424-20270430", events: [] },
];

export const MATCH_CENTER_SPANISH_20270424_20270430_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'esp.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة 20270424-20270430 وكانت events فارغة. لا تُستنتج نهاية الموسم من ذلك؛ لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر.',
  receivedRanges: MATCH_CENTER_SPANISH_20270424_20270430_RANGES.map(({ dates, events }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=esp.1&dates=${dates}`,
    eventCount: events.length,
  })),
  receivedEvents: MATCH_CENTER_SPANISH_20270424_20270430_RANGES.flatMap(({ events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED',
  }))),
  receivedTeams: MATCH_CENTER_SPANISH_20270424_20270430_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};

/** نطاق استدراكي فارغ أرسله المستخدم؛ لا يُستنتج منه انتهاء الموسم. */
const MATCH_CENTER_SPANISH_20270605_20270607_RANGES = [
  { dates: "20270605-20270607", events: [] },
];

export const MATCH_CENTER_SPANISH_20270605_20270607_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'esp.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة القصيرة 20270605-20270607 وكانت events فارغة؛ لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً. لا تُستنتج نهاية الموسم.',
  receivedRanges: MATCH_CENTER_SPANISH_20270605_20270607_RANGES.map(({ dates, events }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=esp.1&dates=${dates}`,
    eventCount: events.length,
  })),
  receivedEvents: MATCH_CENTER_SPANISH_20270605_20270607_RANGES.flatMap(({ events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED',
  }))),
  receivedTeams: MATCH_CENTER_SPANISH_20270605_20270607_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};

/** ثماني نوافذ أسبوعية فارغة كما أرسلها المستخدم؛ لا تُستنتج منها نهاية الموسم. */
const MATCH_CENTER_SPANISH_20270608_20270802_RANGES = [
  { dates: "20270608-20270614", events: [] },
  { dates: "20270615-20270621", events: [] },
  { dates: "20270622-20270628", events: [] },
  { dates: "20270629-20270705", events: [] },
  { dates: "20270706-20270712", events: [] },
  { dates: "20270713-20270719", events: [] },
  { dates: "20270720-20270726", events: [] },
  { dates: "20270727-20270802", events: [] },
];

export const MATCH_CENTER_SPANISH_20270608_20270802_VERIFICATION = {
  receivedOn: '2026-10-16',
  provider: 'espn',
  leagueId: 'esp.1',
  method: 'أرسل المستخدم نتائج scoreboard.php لثماني نوافذ أسبوعية متصلة، وكانت events فارغة في كل منها؛ لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً.',
  receivedRanges: MATCH_CENTER_SPANISH_20270608_20270802_RANGES.map(({ dates, events }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=esp.1&dates=${dates}`,
    eventCount: events.length,
  })),
  receivedEvents: MATCH_CENTER_SPANISH_20270608_20270802_RANGES.flatMap(({ events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED',
  }))),
  receivedTeams: MATCH_CENTER_SPANISH_20270608_20270802_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};

/** متابعة متصلة بلا أحداث في النوافذ الثماني كلها؛ لا تُستنتج نهاية الموسم. */
const MATCH_CENTER_SPANISH_20270803_20270927_RANGES = [
  { dates: "20270803-20270809", events: [] },
  { dates: "20270810-20270816", events: [] },
  { dates: "20270817-20270823", events: [] },
  { dates: "20270824-20270830", events: [] },
  { dates: "20270831-20270906", events: [] },
  { dates: "20270907-20270913", events: [] },
  { dates: "20270914-20270920", events: [] },
  { dates: "20270921-20270927", events: [] },
];

export const MATCH_CENTER_SPANISH_20270803_20270927_VERIFICATION = {
  receivedOn: '2026-10-16',
  provider: 'espn',
  leagueId: 'esp.1',
  method: 'أرسل المستخدم نتائج scoreboard.php لثماني نوافذ أسبوعية متصلة، وكانت events فارغة في كل منها؛ لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً.',
  receivedRanges: MATCH_CENTER_SPANISH_20270803_20270927_RANGES.map(({ dates, events }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=esp.1&dates=${dates}`,
    eventCount: events.length,
  })),
  receivedEvents: MATCH_CENTER_SPANISH_20270803_20270927_RANGES.flatMap(({ events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED',
  }))),
  receivedTeams: MATCH_CENTER_SPANISH_20270803_20270927_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};

/** متابعة متصلة أخرى؛ أرسل المستخدم ثماني نوافذ فارغة حتى 22 نوفمبر 2027. */
const MATCH_CENTER_SPANISH_20270928_20271122_RANGES = [
  { dates: "20270928-20271004", events: [] },
  { dates: "20271005-20271011", events: [] },
  { dates: "20271012-20271018", events: [] },
  { dates: "20271019-20271025", events: [] },
  { dates: "20271026-20271101", events: [] },
  { dates: "20271102-20271108", events: [] },
  { dates: "20271109-20271115", events: [] },
  { dates: "20271116-20271122", events: [] },
];

export const MATCH_CENTER_SPANISH_20270928_20271122_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'esp.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php لثماني نوافذ أسبوعية متصلة؛ لم تظهر أحداث في أي نافذة. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من النتائج.',
  receivedRanges: MATCH_CENTER_SPANISH_20270928_20271122_RANGES.map(({ dates, events }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=esp.1&dates=${dates}`,
    eventCount: events.length,
  })),
  receivedEvents: MATCH_CENTER_SPANISH_20270928_20271122_RANGES.flatMap(({ events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED',
  }))),
  receivedTeams: MATCH_CENTER_SPANISH_20270928_20271122_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};

/** دفعة رابعة متصلة؛ النوافذ كلها فارغة كما أرسلها المستخدم. */
const MATCH_CENTER_SPANISH_20271123_20280117_RANGES = [
  { dates: "20271123-20271129", events: [] },
  { dates: "20271130-20271206", events: [] },
  { dates: "20271207-20271213", events: [] },
  { dates: "20271214-20271220", events: [] },
  { dates: "20271221-20271227", events: [] },
  { dates: "20271228-20280103", events: [] },
  { dates: "20280104-20280110", events: [] },
  { dates: "20280111-20280117", events: [] },
];

export const MATCH_CENTER_SPANISH_20271123_20280117_VERIFICATION = {
  receivedOn: '2026-10-17',
  scopeNote: 'أكد المستخدم أن الموسم ينتهي خلال 2027؛ النطاق 20271228-20280103 يعبر حدّ العام، والنافذتان التاليتان محفوظتان كمخرجات مستلمة لا كامتداد لنطاق الموسم.',
  provider: 'espn',
  leagueId: 'esp.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php لثماني نوافذ أسبوعية متصلة؛ لم تظهر أحداث في أي نافذة. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من النتائج.',
  receivedRanges: MATCH_CENTER_SPANISH_20271123_20280117_RANGES.map(({ dates, events }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=esp.1&dates=${dates}`,
    eventCount: events.length,
  })),
  receivedEvents: MATCH_CENTER_SPANISH_20271123_20280117_RANGES.flatMap(({ events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED',
  }))),
  receivedTeams: MATCH_CENTER_SPANISH_20271123_20280117_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};

/** مخرجات مستلمة بعد حد الموسم الذي أكده المستخدم (2027)؛ تُحفظ للتدقيق فقط ولا تُحسب ضمن التغطية الموسمية. */
const MATCH_CENTER_SPANISH_20280118_20280313_RANGES = [
  { dates: "20280118-20280124", events: [] },
  { dates: "20280125-20280131", events: [] },
  { dates: "20280201-20280207", events: [] },
  { dates: "20280208-20280214", events: [] },
  { dates: "20280215-20280221", events: [] },
  { dates: "20280222-20280228", events: [] },
  { dates: "20280229-20280306", events: [] },
  { dates: "20280307-20280313", events: [] },
];

export const MATCH_CENTER_SPANISH_20280118_20280313_VERIFICATION = {
  receivedOn: '2026-10-17',
  outOfSeason: true,
  scopeNote: 'أبقى المستخدم هذه المخرجات في سجل الاستعلامات؛ لكنها تخص 2028، خارج نطاق الموسم الذي أكد أن نهايته في 2027.',
  provider: 'espn',
  leagueId: 'esp.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php لثماني نوافذ أسبوعية متصلة؛ لم تظهر أحداث في أي نافذة. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من النتائج.',
  receivedRanges: MATCH_CENTER_SPANISH_20280118_20280313_RANGES.map(({ dates, events }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=esp.1&dates=${dates}`,
    eventCount: events.length,
  })),
  receivedEvents: MATCH_CENTER_SPANISH_20280118_20280313_RANGES.flatMap(({ events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED',
  }))),
  receivedTeams: MATCH_CENTER_SPANISH_20280118_20280313_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};

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
    { key: 'boxscore', verdict: 'available', rule: 'البند 7', note: 'مسبار P1 (مباراة منتهية): `teams` فقط، 29 إحصائية باسمها لكل فريق. تُستهلك في مباشر/بعد المباراة بمرحلتها المعتمدة.' },
    { key: 'lastFiveGames', verdict: 'available', rule: 'البند 9', note: 'مسبارا P1/P3: خمس مباريات لكل فريق بحدث كامل (تاريخ/خصم/نتيجة/W-D-L) — مصدر مستوى الفريقين. ليست حاملة «المقاييس الأربعة» المجهولة الحاوي.' },
    { key: 'leaders', verdict: 'unresolved', rule: 'البند 9', note: 'مرشّح ثانٍ لحمل المقاييس الأربعة؛ الخلط بين المرشّحين يعني مقارنة أرقام فترتين مختلفتين.' },
    { key: 'seasonseries', verdict: 'available', rule: 'البند 6 و8', note: 'مسبارا P1/P3: آخر خمس مواجهات بنتائج وبطولات مسماة؛ الودية تُشتق من اسم البطولة وحده، ولا ملعب في عناصرها.' },
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
    'أي مفتاح يحمل المقاييس الأربعة المجمّعة، وما قيمها، وما فترة العينة — مقارنة ما قبل اللقاء تفضل بلا رادار حتى تُحسم',
    'حدث ملغى/مؤكد بعد VAR وجزاء وطرد في `keyEvents` — تصنيفها وشكلها بلا عينة بعد',
    'تواتر تغيّر `boxscore`/`keyEvents` أثناء اللعب وتوقيت امتلاء `rosters` قبل البداية (مسبار P2)',
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
    /* أحداث ببنية كاملة: id، type{id,text,type} (Goal 70 وGoal - Header
       وبطاقة صفراء 94 وتبديل 76 وانطلاقة/استراحة/نهاية كأحداث إطارية)،
       period، clock{value بالثواني، displayValue «55'»}، scoringPlay،
       team{id}، participants[athlete] (مسجّل/مبدَّل/مُنذر)، wallclock.
       عينة هذه المباراة بلا جزاء ولا طرد ولا VAR — فئتا «ملغى/مؤكد بعد
       VAR» لم تُرصدا بعد وتبقيان غير معايرتين حتى عينة تحملها. */
    keyEvents: 'present-full-shape-goal-sub-card-confirmed-var-unseen',
    /* ⚠️ اكتشاف لا يُبنى عليه بعد: أحداث الأهداف تحمل `fieldPositionX/Y`
       و`fieldPosition2X/Y` و`goalPositionY` (نسب مئوية ظاهرياً). هذه
       مواقع **أهداف فقط** من `keyEvents`، لا كل التسديدات، ودلالة
       المحاور/الاتجاه غير موثقة — فلا تفتح باب Shot map (انظر التقرير). */
    goalCoordinates: 'present-on-goals-only-semantics-undocumented',
    /* حدث Form كامل: gameDate، home/awayTeamId ونتيجتاهما، gameResult
       (W/D/L من منظور الفريق صاحب القائمة)، competitionName، opponent.
       آخر 5 هنا كلها دوري — والنطاق يُقرأ من كل حدث لا يُفترض. */
    lastFiveGames: 'present-5-per-team-full-event-shape',
    /* `rosters` (لا `lineups`): لكل فريق formation («4-2-3-1» هنا) وقائمة
       20 وwinner. حقول العنصر الواحد (أساسي/بديل) لم تُرصد بعد، وتوقيت
       الظهور قبل البداية مجهول — فالتشكيل المؤكد مشروط لا مفتوح. */
    rosters: 'present-formation-and-20-per-team-entry-shape-unprobed',
    /* حتى بعد النهاية: مفتاح `lineups` غير موجود أصلاً. */
    lineupsKey: 'absent-even-after-full-time',
    /* `gameInfo` = ملعب (id واسم ومدينة/دولة فقط) + حضور. لا حكم في العينة. */
    gameInfo: 'venue+attendance-only-no-referee-in-sample',
    /* قادة إحصائيات لاعبين (تمريرات دقيقة، تدخلات دفاعية...) بلا أي تقييم. */
    leaders: 'player-stat-leaders-no-ratings',
  },
  stillUnprobed: [
    'حدث ملغى/مؤكد بعد VAR أو جزاء أو طرد — تصنيفها وشكلها (لا عينة بعد)',
    'محتوى ما قبل البداية لمبارياتنا: lastFiveGames/seasonseries/rosters (P3)',
    'سلوك أثناء اللعب وتوقيت إعلان التشكيلات قبل البداية (P2 يوم مباراة حية)',
    'دلالة محاور إحداثيات الأهداف واتجاه اللعب — توثيق لا عينة',
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

/* أسماء العرض العربية والـslugs تقابل أسماء المصدر حرفياً؛ لا تُستعمل
   هذه التسميات بديلاً عن هوية النادي من معرّف ESPN. */
const ENGLISH_TEAM_PRESENTATION = {
  'AFC Bournemouth': { slug: 'afc-bournemouth', name: 'بورنموث', shortName: 'بورنموث' },
  'Sunderland': { slug: 'sunderland', name: 'سندرلاند', shortName: 'سندرلاند' },
  'Brighton & Hove Albion': { slug: 'brighton-hove-albion', name: 'برايتون', shortName: 'برايتون' },
  'Crystal Palace': { slug: 'crystal-palace', name: 'كريستال بالاس', shortName: 'بالاس' },
  'Leeds United': { slug: 'leeds-united', name: 'ليدز يونايتد', shortName: 'ليدز' },
  'Manchester United': { slug: 'manchester-united', name: 'مانشستر يونايتد', shortName: 'مانشستر' },
  'Nottingham Forest': { slug: 'nottingham-forest', name: 'نوتنغهام فورست', shortName: 'نوتنغهام' },
  'Arsenal': { slug: 'arsenal', name: 'أرسنال', shortName: 'أرسنال' },
  'Tottenham Hotspur': { slug: 'tottenham-hotspur', name: 'توتنهام', shortName: 'توتنهام' },
  'Coventry City': { slug: 'coventry-city', name: 'كوفنتري سيتي', shortName: 'كوفنتري' },
  'Ipswich Town': { slug: 'ipswich-town', name: 'إيبسويتش تاون', shortName: 'إيبسويتش' },
  'Aston Villa': { slug: 'aston-villa', name: 'أستون فيلا', shortName: 'فيلا' },
  'Manchester City': { slug: 'manchester-city', name: 'مانشستر سيتي', shortName: 'سيتي' },
  'Everton': { slug: 'everton', name: 'إيفرتون', shortName: 'إيفرتون' },
  'Fulham': { slug: 'fulham', name: 'فولهام', shortName: 'فولهام' },
  'Chelsea': { slug: 'chelsea', name: 'تشيلسي', shortName: 'تشيلسي' },
  'Newcastle United': { slug: 'newcastle-united', name: 'نيوكاسل يونايتد', shortName: 'نيوكاسل' },
  'Hull City': { slug: 'hull-city', name: 'هال سيتي', shortName: 'هال' },
  'Liverpool': { slug: 'liverpool', name: 'ليفربول', shortName: 'ليفربول' },
  'Brentford': { slug: 'brentford', name: 'برينتفورد', shortName: 'برينتفورد' },
};

function englishTeamDefinition(sourceName, sourceId) {
  const presentation = ENGLISH_TEAM_PRESENTATION[sourceName];
  if (!presentation) throw new Error(`Missing reviewed English team presentation: ${sourceName}`);
  return {
    name: presentation.name,
    shortName: presentation.shortName,
    sourceName,
    logo: null,
    externalIds: { espn: String(sourceId), apifootball: null },
  };
}

function fixtureFromEnglishEvent([
  eventId, sourceDate, sourceEventName, venue, homeId, homeName, awayId, awayName,
]) {
  const home = englishTeamDefinition(homeName, homeId);
  const away = englishTeamDefinition(awayName, awayId);
  const slug = `epl-${ENGLISH_TEAM_PRESENTATION[homeName].slug}-vs-${ENGLISH_TEAM_PRESENTATION[awayName].slug}`;
  return {
    id: slug,
    slug,
    competitionSlug: MATCH_CENTER_COMPETITION.slug,
    competitionName: MATCH_CENTER_COMPETITION.name,
    leagueId: MATCH_CENTER_COMPETITION.leagueId,
    season: MATCH_CENTER_COMPETITION.season,
    round: null,
    kickoffUtc: `${sourceDate.slice(0, -1)}:00Z`,
    venue,
    sourceEventName,
    verification: 'confirmed',
    externalIds: { espn: String(eventId), apifootball: null },
    home,
    away,
  };
}

function fixturesFromEnglishRanges(ranges) {
  return ranges.flatMap(({ events }) => events.map(fixtureFromEnglishEvent));
}

export const MATCH_CENTER_ENGLISH_20261018_20261023_MATCHES = fixturesFromEnglishRanges(
  MATCH_CENTER_ENGLISH_20261018_20261023_RANGES,
);
export const MATCH_CENTER_ENGLISH_20261024_20261030_MATCHES = fixturesFromEnglishRanges(
  MATCH_CENTER_ENGLISH_20261024_20261030_RANGES,
);
export const MATCH_CENTER_ENGLISH_20261031_20261106_MATCHES = fixturesFromEnglishRanges(
  MATCH_CENTER_ENGLISH_20261031_20261106_RANGES,
);
export const MATCH_CENTER_ENGLISH_20261107_20261113_MATCHES = fixturesFromEnglishRanges(
  MATCH_CENTER_ENGLISH_20261107_20261113_RANGES,
);
export const MATCH_CENTER_ENGLISH_20261121_20261127_MATCHES = fixturesFromEnglishRanges(
  MATCH_CENTER_ENGLISH_20261121_20261127_RANGES,
);
export const MATCH_CENTER_ENGLISH_20261128_20261204_MATCHES = fixturesFromEnglishRanges(
  MATCH_CENTER_ENGLISH_20261128_20261204_RANGES,
);
export const MATCH_CENTER_ENGLISH_20261205_20261211_MATCHES = fixturesFromEnglishRanges(
  MATCH_CENTER_ENGLISH_20261205_20261211_RANGES,
);
export const MATCH_CENTER_ENGLISH_20261212_20261218_MATCHES = fixturesFromEnglishRanges(
  MATCH_CENTER_ENGLISH_20261212_20261218_RANGES,
);
export const MATCH_CENTER_ENGLISH_20261219_20261225_MATCHES = fixturesFromEnglishRanges(
  MATCH_CENTER_ENGLISH_20261219_20261225_RANGES,
);
export const MATCH_CENTER_ENGLISH_20261226_20270101_MATCHES = fixturesFromEnglishRanges(
  MATCH_CENTER_ENGLISH_20261226_20270101_RANGES,
);
export const MATCH_CENTER_ENGLISH_20270102_20270108_MATCHES = fixturesFromEnglishRanges(
  MATCH_CENTER_ENGLISH_20270102_20270108_RANGES,
);
export const MATCH_CENTER_ENGLISH_20270116_20270122_MATCHES = fixturesFromEnglishRanges(
  MATCH_CENTER_ENGLISH_20270116_20270122_RANGES,
);
export const MATCH_CENTER_ENGLISH_20270123_20270129_MATCHES = fixturesFromEnglishRanges(
  MATCH_CENTER_ENGLISH_20270123_20270129_RANGES,
);
export const MATCH_CENTER_ENGLISH_20270130_20270205_MATCHES = fixturesFromEnglishRanges(
  MATCH_CENTER_ENGLISH_20270130_20270205_RANGES,
);
export const MATCH_CENTER_ENGLISH_20270206_20270212_MATCHES = fixturesFromEnglishRanges(
  MATCH_CENTER_ENGLISH_20270206_20270212_RANGES,
);
export const MATCH_CENTER_ENGLISH_20270220_20270226_MATCHES = fixturesFromEnglishRanges(
  MATCH_CENTER_ENGLISH_20270220_20270226_RANGES,
);
export const MATCH_CENTER_ENGLISH_20270227_20270305_MATCHES = fixturesFromEnglishRanges(
  MATCH_CENTER_ENGLISH_20270227_20270305_RANGES,
);
export const MATCH_CENTER_ENGLISH_20270313_20270319_MATCHES = fixturesFromEnglishRanges(
  MATCH_CENTER_ENGLISH_20270313_20270319_RANGES,
);
export const MATCH_CENTER_ENGLISH_20270320_20270326_MATCHES = fixturesFromEnglishRanges(
  MATCH_CENTER_ENGLISH_20270320_20270326_RANGES,
);
export const MATCH_CENTER_ENGLISH_20270410_20270416_MATCHES = fixturesFromEnglishRanges(
  MATCH_CENTER_ENGLISH_20270410_20270416_RANGES,
);
export const MATCH_CENTER_ENGLISH_20270417_20270423_MATCHES = fixturesFromEnglishRanges(
  MATCH_CENTER_ENGLISH_20270417_20270423_RANGES,
);
export const MATCH_CENTER_ENGLISH_20270424_20270430_MATCHES = fixturesFromEnglishRanges(
  MATCH_CENTER_ENGLISH_20270424_20270430_RANGES,
);
export const MATCH_CENTER_ENGLISH_20270501_20270507_MATCHES = fixturesFromEnglishRanges(
  MATCH_CENTER_ENGLISH_20270501_20270507_RANGES,
);
export const MATCH_CENTER_ENGLISH_20270508_20270514_MATCHES = fixturesFromEnglishRanges(
  MATCH_CENTER_ENGLISH_20270508_20270514_RANGES,
);
export const MATCH_CENTER_ENGLISH_20270515_20270521_MATCHES = fixturesFromEnglishRanges(
  MATCH_CENTER_ENGLISH_20270515_20270521_RANGES,
);
export const MATCH_CENTER_ENGLISH_20270522_20270528_MATCHES = fixturesFromEnglishRanges(
  MATCH_CENTER_ENGLISH_20270522_20270528_RANGES,
);
export const MATCH_CENTER_ENGLISH_20270529_20270604_MATCHES = fixturesFromEnglishRanges(
  MATCH_CENTER_ENGLISH_20270529_20270604_RANGES,
);

/* These two Oct 17 source events had IDs/names/venues in the original output,
   but no competitor IDs. The later user output supplies exact team-ID witnesses;
   do not turn a team name alone into an identity. */
export const MATCH_CENTER_ENGLISH_20261017_CROSS_REFERENCED_MATCHES =
  MATCH_CENTER_ENGLISH_20261017_CROSS_REFERENCED_EVENTS.map(event => fixtureFromEnglishEvent([
    event.id,
    event.date,
    event.name,
    event.venue,
    event.home.id,
    event.home.name,
    event.away.id,
    event.away.name,
  ]));

export const MATCH_CENTER_ENGLISH_MATCHES = [
  ...MATCH_CENTER_MATCHES,
  ...MATCH_CENTER_ENGLISH_20261017_CROSS_REFERENCED_MATCHES,
  ...MATCH_CENTER_ENGLISH_20261018_20261023_MATCHES,
  ...MATCH_CENTER_ENGLISH_20261024_20261030_MATCHES,
  ...MATCH_CENTER_ENGLISH_20261031_20261106_MATCHES,
  ...MATCH_CENTER_ENGLISH_20261107_20261113_MATCHES,
  ...MATCH_CENTER_ENGLISH_20261121_20261127_MATCHES,
  ...MATCH_CENTER_ENGLISH_20261128_20261204_MATCHES,
  ...MATCH_CENTER_ENGLISH_20261205_20261211_MATCHES,
  ...MATCH_CENTER_ENGLISH_20261212_20261218_MATCHES,
  ...MATCH_CENTER_ENGLISH_20261219_20261225_MATCHES,
  ...MATCH_CENTER_ENGLISH_20261226_20270101_MATCHES,
  ...MATCH_CENTER_ENGLISH_20270102_20270108_MATCHES,
  ...MATCH_CENTER_ENGLISH_20270116_20270122_MATCHES,
  ...MATCH_CENTER_ENGLISH_20270123_20270129_MATCHES,
  ...MATCH_CENTER_ENGLISH_20270130_20270205_MATCHES,
  ...MATCH_CENTER_ENGLISH_20270206_20270212_MATCHES,
  ...MATCH_CENTER_ENGLISH_20270220_20270226_MATCHES,
  ...MATCH_CENTER_ENGLISH_20270227_20270305_MATCHES,
  ...MATCH_CENTER_ENGLISH_20270313_20270319_MATCHES,
  ...MATCH_CENTER_ENGLISH_20270320_20270326_MATCHES,
  ...MATCH_CENTER_ENGLISH_20270410_20270416_MATCHES,
  ...MATCH_CENTER_ENGLISH_20270417_20270423_MATCHES,
  ...MATCH_CENTER_ENGLISH_20270424_20270430_MATCHES,
  ...MATCH_CENTER_ENGLISH_20270501_20270507_MATCHES,
  ...MATCH_CENTER_ENGLISH_20270508_20270514_MATCHES,
  ...MATCH_CENTER_ENGLISH_20270515_20270521_MATCHES,
  ...MATCH_CENTER_ENGLISH_20270522_20270528_MATCHES,
  ...MATCH_CENTER_ENGLISH_20270529_20270604_MATCHES,
];

/** كل المباريات المسجلة للصفحات والفهرسة، مع إبقاء الثلاث الأولى مرجعاً لاختبارات النقل القديمة. */
export const MATCH_CENTER_ALL_MATCHES = [
  ...MATCH_CENTER_ENGLISH_MATCHES,
  ...MATCH_CENTER_SPANISH_MATCHES,
];

export const MATCH_CENTER_COMPETITIONS = [
  MATCH_CENTER_COMPETITION,
  MATCH_CENTER_SPANISH_COMPETITION,
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
      note: 'جدول واحد مشترك بحسب البطولة، لا يُطلب لكل مباراة على حدة.',
    },
  ],
};

/* فحص P3 — `summary?event=401879262` قبل البداية (أرسله صاحب المشروع
   2026-10-16): `lastFiveGames` بخمس مباريات لكل فريق و`seasonseries`
   بخمسة أحداث — متاحان قبل البداية فعلاً. `rosters` موجودة لكن فارغة
   (0 لاعب، بلا خطة) و`keyEvents` صفر — أي «لم يُعلن بعد» هو الوصف الصادق
   للتشكيلات الآن. وبذلك اكتملت مسابير P0/P1/P3؛ يبقى P2 الحي وحده. */
export const MATCH_CENTER_PREMATCH_PROBE = {
  probedAt: '2026-10-16T00:00:00Z',
  provider: 'espn',
  endpoint: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/summary?event=401879262',
  confirmed: {
    lastFiveGamesPreMatch: 'present-5-per-team',
    seasonseriesPreMatch: 'present-5-events',
    rostersPreMatch: 'present-but-empty-0-players-no-formation',
    keyEventsPreMatch: '0',
  },
};

/* ───────────────── مسارات ومساعدات ───────────────── */

/** البند 3: رابط ثابت لكل مباراة، لا يحمل حالة ولا نتيجة. */
export function matchCenterPath(match) {
  return `/matches/${match.competitionSlug}/${match.slug}/`;
}

/** تُستخدم في `getAllRoutes()` و`APP_PATHS` — فلا تُكتب المسارات يدوياً في مكانين. */
export function matchCenterRoutes() {
  return MATCH_CENTER_ALL_MATCHES.map(matchCenterPath);
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
  return MATCH_CENTER_ALL_MATCHES.map(match => stripTrailingSlash(matchCenterPath(match)));
}

/** مطابقة مسار مُطبَّع بتعريف المباراة — يستخدمها `App.tsx` و`seo.ts`. */
export function matchByRoute(path) {
  const normalized = stripTrailingSlash(String(path ?? ''));
  return MATCH_CENTER_ALL_MATCHES.find(match => stripTrailingSlash(matchCenterPath(match)) === normalized) || null;
}

export function matchBySlug(slug) {
  return MATCH_CENTER_ALL_MATCHES.find(match => match.slug === slug) || null;
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
  return matchByFixtureId(MATCH_CENTER_ALL_MATCHES, provider, externalId);
}

/**
 * البند 13 و8.5: بوابة الفهرسة وJSON-LD. المعرّفات الآن مؤكَّدة من المصدر
 * فالبوابة مفتوحة، ويُصدر `SportsEvent` ببيانات حقيقية كاملة: الاسم والموعد
 * والملعب والفريقان — **بلا** عروض تذاكر غير موجودة وبلا تقييمات وهمية.
 */
export function allMatchesVerified() {
  return MATCH_CENTER_ALL_MATCHES.every(match => isVerified(match));
}
