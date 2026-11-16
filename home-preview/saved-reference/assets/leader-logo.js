/* ==========================================================================
   جسر مؤقت: شعار متصدّري البطولات من مزوّد الترتيب نفسه
   --------------------------------------------------------------------------
   بطلب المالك: شعار كل متصدّر يُؤخذ من مصدر بيانات بطولته كما يوفّره المزوّد،
   بلا طلب بيانات جديد (اللقطة تحمل معرّف الفريق أصلاً) وبلا تخزين صور إضافية:

   • ESPN (بطولات أوروبا والسعودية): نفس مضيف شعارات بطاقات المباريات الحيّة
       https://a.espncdn.com/i/teamlogos/soccer/500/<teamId>.png
   • Highlightly (الدوري المصري egy.1): مضيف صور الفرق الرسمي للمزوّد
       https://highlightly.net/soccer/images/teams/<teamId>.png
     — الصور لا تحتاج مفتاح API حسب توثيق المزوّد، والمسار هو نفسه الوارد في
       أمثلته المنشورة، وقد تحقّقنا من وجود شعار الفريق 882420 (الأسيوطي/
       بيراميدز) على هذا المضيف بطلبه مباشرةً (تمييز 404 لمعرّف غير موجود).

   الحدود المتعمَّدة:
   • لا يُركَّب عنوان إلا لمعرّف رقمي صحيح ومن المزوّد المتوقّع؛ ولا يُقبل أي
     مضيف آخر. عنوان غير صالح = لا صورة، فيبقى الشعار المحلي ثم الأحرف.
   • إن أرسل المصدر لاحقاً حقلاً صريحاً للشعار (ESPN `logo`) يُستخدم كما هو
     متى كان على أحد المضيفين المعتمدين، قبل أي تركيب.
   • هذه القيمة مؤقتة بطلب المالك، ويُرجَع عنها بتغيير `LEADER_CREST_SOURCE`
     إلى 'local' — فيعود البانر إلى المكتبة المحلية وحدها بلا أي تغيير آخر.
   ========================================================================== */

/** 'live-cards' = مضيف شعارات مزوّد الترتيب (مؤقت) · 'local' = المكتبة المحلية فقط */
export const LEADER_CREST_SOURCE = 'live-cards';

const ESPN_TEAM_LOGO = /^https:\/\/a\.espncdn\.com\/i\/teamlogos\/soccer\/500\/[1-9]\d{0,11}\.png$/;
const HIGHLIGHTLY_TEAM_LOGO = /^https:\/\/highlightly\.net\/soccer\/images\/teams\/[1-9]\d{0,11}\.png$/;

/** معرّف رقمي كما يرسله المزوّد (نص أو رقم) بلا أي تطبيع مخمَّن */
function numericId(value) {
  if (typeof value === 'number' && Number.isSafeInteger(value)) value = String(value);
  if (typeof value !== 'string') return null;
  const id = value.trim();
  return /^[1-9]\d{0,11}$/.test(id) ? id : null;
}

/**
 * شعار الفريق على مضيف بطاقات المباريات الحيّة (ESPN)، أو null.
 * @param {{ teamId?: string, provider?: string }} team
 * @returns {string | null}
 */
export function liveCardsTeamLogo(team) {
  if (LEADER_CREST_SOURCE !== 'live-cards') return null;
  if (team?.provider !== 'ESPN') return null;
  const id = numericId(team?.teamId);
  if (!id) return null;
  const url = `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`;
  return ESPN_TEAM_LOGO.test(url) ? url : null;
}

/**
 * شعار الفريق على مضيف صور Highlightly، أو null.
 * @param {{ teamId?: string, provider?: string }} team
 * @returns {string | null}
 */
export function highlightlyTeamLogo(team) {
  if (LEADER_CREST_SOURCE !== 'live-cards') return null;
  if (team?.provider !== 'Highlightly') return null;
  const id = numericId(team?.teamId);
  if (!id) return null;
  const url = `https://highlightly.net/soccer/images/teams/${id}.png`;
  return HIGHLIGHTLY_TEAM_LOGO.test(url) ? url : null;
}

/**
 * شعار المتصدّر من مزوّد بطولته: حقل صريح معتمد إن وُجد، وإلا المضيف المعتمد
 * لمزوّد الترتيب. `null` يعني: استخدم الشعار المحلي ثم بديل الأحرف.
 * @param {{ teamId?: string, provider?: string, logo?: string | null }} team
 * @returns {string | null}
 */
export function providerTeamLogo(team) {
  if (LEADER_CREST_SOURCE !== 'live-cards') return null;
  const explicit = typeof team?.logo === 'string' ? team.logo.trim() : '';
  if (isApprovedCrestUrl(explicit)) return explicit;
  return liveCardsTeamLogo(team) ?? highlightlyTeamLogo(team);
}

/**
 * هل العنوان من أحد مضيفي الشعارات المعتمدين (ESPN أو Highlightly)؟
 * @param {unknown} url
 */
export function isApprovedCrestUrl(url) {
  return typeof url === 'string' && (ESPN_TEAM_LOGO.test(url) || HIGHLIGHTLY_TEAM_LOGO.test(url));
}

/**
 * هل العنوان من مضيف شعارات بطاقات المباريات الحيّة المعتمد؟
 * @param {unknown} url
 */
export function isLiveCardsTeamLogo(url) {
  return typeof url === 'string' && ESPN_TEAM_LOGO.test(url);
}
