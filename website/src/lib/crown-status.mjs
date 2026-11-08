/* ==========================================================================
   حالة المواجهة كما يقررها شريط التاج المتحرك — منطق منعزل قابل للاختبار
   --------------------------------------------------------------------------
   السبب: الشارة وسطر التفصيل كانا يُحسبان داخل JSX (لا يُختبران في Node)،
   فوقع انحرافان صامتان:
     • فيد يرجّع `state: "other"` (تأجيل/إلغاء/إيقاف — انظر matches.mjs) وكان
   الشريط يصفه بـ«لم تبدأ»، وهو وصف كذب لموعد لم يُلغَ بل تحرّك.
     • قبل المباراة وبعدها كان `detail` من الفيڈ يوازي نص الشارة حرفيًا
   («لم تبدأ»/«انتهت»)، فالدرج العلوي يعيد جملة واحدة مرتين.
   صيغة .mjs مع .d.mts هي عرف المشروع لمن يشاركه TSX وnode --test معًا.
   لا نختلق هنا نصًا: كل لفظ إما من المصدر أو ثابت في المصدر نفسه.
   ========================================================================== */

/** ما يُعرض في الدرج حين لا مدخل للوحة المواعيد إطلاقًا (نفس نص التذكرة القديمة). */
export const CROWN_NO_BOARD_LINE = "نتائج الأسبوع المنقضي ومواعيد الأسبوع القادم تظهر هنا من لوحة المواعيد فوراً";

/** لفظ حالة عام — مطابق للفظ الذي يستخدمه المصدر لنفس الحالة في matches.mjs. */
const CROWN_OTHER_FALLBACK = "تغيّر موعد المباراة";

/**
 * الشارة القصيرة في الدرج العلوي. `other` يرث صيغة المصدر الخاصة («مؤجلة»،
 * «ملغاة»، «متوقفة»…) بدل أن تُلقَّم في فرع «لم تبدأ».
 */
export function crownStateLabel(match) {
  if (!match) return "بانتظار لوحة المواعيد";
  switch (match.state) {
    case "live":
      return "مباشر الآن";
    case "finished":
      return "انتهت";
    case "other":
      return String(match.detail ?? "").trim() || CROWN_OTHER_FALLBACK;
    default:
      return "لم تبدأ";
  }
}

/**
 * سطر التفصيل داخل الدرج العلوي — **لا يعيد الشارة**.
 *  • لا موعد في اللوحة → الجملة التعريفية كما هي.
 *  • `detail` مختلف عن الشارة (المباشر يرسل الساعة، مثلًا) → يُعرض كما هو.
 *  • `detail` يوازي الشارة → الملعب من المصدر إن أرسله، وإلا لا سطر إطلاقًا.
 * رجوع السلسلة الفارغة يعني «لا تُعرض»، لا «اعرض شرطة بديلة».
 */
export function crownBandDetail(match) {
  if (!match) return CROWN_NO_BOARD_LINE;
  const detail = String(match.detail ?? "").trim();
  if (detail && detail !== crownStateLabel(match)) return detail;
  return String(match.venue ?? "").trim();
}

/**
 * دقائق المباراة الجارية وثوانيها — للعرض داخل الدرج العلوي بطلب المالك.
 *
 * الأمانة هي التصميم نفسه: المصدر لا يرسل الثواني في الغالب، فالقاعدة:
 *  • الدقيقة **من الفيڈ وحده** (`status.displayClock`)، لا من ساعة الجهاز.
 *  • لو أرسل المصدر `mm:ss` (بعض المزوّدين يرسلونها) تُستخدم الرقمتان حرفيًا.
 *  • وإلا فالثواني تُستكمل داخل الدقيقة المعلَنة فقط؛ ولو تأخّر التحديث
 *    (الفيد يُسحب كل 60 ثانية) تبقى على 59 — لا دقيقة تُختلَق لم يعلنها المصدر.
 *  • توقيت غير رقمي («HT»، «FO»، «مباشر») = لا ساعة تُعرض إطلاقًا، لا صفر مُوهِم.
 * `elapsedMs` = الآن ناقص صافرة البداية؛ السالب أو غير الرقمي يُثبّت الثواني على 0.
 */
export function crownLiveClock(detail, elapsedMs) {
  const text = String(detail ?? "").trim();
  const withSeconds = /(\d{1,3})\s*[:'′’]\s*(\d{1,2})/.exec(text);
  if (withSeconds) {
    const seconds = Number(withSeconds[2]);
    return { minutes: Number(withSeconds[1]), seconds: seconds > 59 ? 59 : seconds };
  }
  const minuteOnly = /(\d{1,3})/.exec(text);
  if (!minuteOnly) return null;
  const minutes = Number(minuteOnly[1]);
  const elapsed = Number(elapsedMs);
  if (!Number.isFinite(elapsed) || elapsed < 0) return { minutes, seconds: 0 };
  return { minutes, seconds: Math.max(0, Math.min(59, Math.floor(elapsed / 1000) - minutes * 60)) };
}
