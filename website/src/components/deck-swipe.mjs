/* ==========================================================================
   منطق التقليب باللمس — دوال خالصة بلا DOM ولا React
   --------------------------------------------------------------------------
   لماذا ملف .mjs منفصل؟ لأن المكوّن (ServerDeck.tsx) وسكربت الاختبار في Node
   يحتاجان الحساب نفسه بالحرف. نفس العرف المتّبع في المشروع:
   `lib/matches.mjs` و`navigation.mjs` و`content/match-center.mjs` مع ملف
   تعريف `.d.mts` مجاور.

   القواعد:
   • قفل المحور عند 8px: أفقي = تقليب، رأسي = تمرير الصفحة (لا نتدخّل).
   • أثناء السحب يتحرّك الشريط مع الإصبع بنسبة 1:1 حتى حدّ 160px، وبعدها
     مقاومة مطّاطية بمعامل 0.25 حتى لا يهرب الشكل خارج الشاشة.
   • عتبة التقليب 42px: سحب لليسار = الكارت التالي، ولليمين = السابق.
   ========================================================================== */

/** أقل حركة بالبكسل قبل الحكم على اتجاه السحب */
export const AXIS_LOCK = 8;

/** المسافة التي بعدها يُعتبر السحب تقليباً */
export const SWIPE_THRESHOLD = 42;

/** أقصى إزاحة يتبع فيها الشريط الإصبع بلا مقاومة */
export const MAX_DRAG = 160;

/** معامل المقاومة بعد الحدّ الأقصى (كلما صغُر كان الشدّ أصلب) */
export const RUBBER_BAND = 0.25;

/**
 * يحدّد محور السحب بعد أول 8px.
 * @param {number} dx
 * @param {number} dy
 * @returns {"x" | "y" | null} null = لم يُحسم المحور بعد
 */
export function pickAxis(dx, dy) {
  if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) return null;
  return Math.abs(dx) > Math.abs(dy) ? "x" : "y";
}

/**
 * إزاحة الشريط بالبكسل مقابل حركة الإصبع: 1:1 حتى الحدّ، ثم مقاومة مطّاطية.
 * @param {number} dx
 * @returns {number}
 */
export function dragOffset(dx) {
  const abs = Math.abs(dx);
  if (abs <= MAX_DRAG) return dx;
  return Math.sign(dx) * (MAX_DRAG + (abs - MAX_DRAG) * RUBBER_BAND);
}

/**
 * قرار نهاية السحب.
 * @param {number} dx
 * @returns {"next" | "prev" | null} null = السحب أقصر من العتبة (ارتداد)
 */
export function swipeDirection(dx) {
  if (dx <= -SWIPE_THRESHOLD) return "next";
  if (dx >= SWIPE_THRESHOLD) return "prev";
  return null;
}

/**
 * مؤشر الكارت بعد خطوة، بلفّ دائري.
 * @param {number} index
 * @param {number} delta
 * @param {number} count
 * @returns {number}
 */
export function stepIndex(index, delta, count) {
  if (count <= 0) return 0;
  return (((index + delta) % count) + count) % count;
}
