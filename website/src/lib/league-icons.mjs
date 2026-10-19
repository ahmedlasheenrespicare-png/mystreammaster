/* ==========================================================================
   أيقونات البطولات (شعارات مصغّرة) — مصدر واحد لكل الواجهات
   --------------------------------------------------------------------------
   • الأيقونة تُحمَّل من مخزن ESPN العلني:
     https://a.espncdn.com/i/leaguelogos/soccer/500/<معرّف الشعار>.png
     وهو المخزن نفسه الذي ترد منه شعارات الفرق في بطاقات المباريات
     (`competitions[].competitors[].team.logo`) — لا مخزن صور مجهول.
   • الرقم في الرابط هو **معرّف الشعار لدى المصدر**، لا معرّف البطولة النصّي؛
     لذلك تُثبَّت القيم هنا نصّاً ولا تُبنى بالتخمين من معرّف البطولة.
   • المفتاح هو معرّف البطولة في مصدر المباريات (`leagueId`) كما في LEAGUES.
   • البطولة التي لا شعار لها موثّق لدى المصدر تُترك بلا مدخل هنا: يعرض
     المكوّن بديلاً محايداً (أيقونة كرة/كأس) بدل صورة مكسورة — ولا يُخترع شعار
     من مصدر غير موثّق، ولا يُستبدل بنسخة محفوظة بلا ترخيص.
     (الدوري المصري `egy.1`: المصدر لا يوفّر البطولة أصلاً — مبارياتها تأتي
     من TheSportsDB — فلا شعار موثّق لها لدى ESPN حتى الآن.)
   • شعار الدوري السعودي مفتاحه هنا `sau.1` (معرّف المباريات) بينما الشعار
     محفوظ لدى المصدر تحت معرّفه `ksa.1` لنفس البطولة (دوري روشن السعودي) —
     والترتيب يستخدم `ksa.1` كذلك، فالاختلاف مقصود وموثّق لا خطأ.

   ⚠️ هذا الملف JS خالص بلا استيرادات: يعمل في Node وقت البناء (هيدر الصفحات
   القديمة في scripts/legacy-shell.mjs) وفي Vite (React) معاً. لا تُكرِّر
   الخريطة في ملف آخر — src/content/competitions.ts يعيد تصديرها.
========================================================================== */

export const LEAGUE_ICONS = {
  "uefa.champions": "https://a.espncdn.com/i/leaguelogos/soccer/500/2.png",
  "uefa.europa": "https://a.espncdn.com/i/leaguelogos/soccer/500/2310.png",
  "eng.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/23.png",
  "esp.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/15.png",
  "ger.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/10.png",
  "ita.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/12.png",
  "fra.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/9.png",
  "sau.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/2488.png",
};

/** أيقونة بطولة بمعرّف المصدر — `undefined` لبطولة بلا شعار موثّق. */
export function leagueIcon(leagueId) {
  return Object.prototype.hasOwnProperty.call(LEAGUE_ICONS, leagueId) ? LEAGUE_ICONS[leagueId] : undefined;
}
