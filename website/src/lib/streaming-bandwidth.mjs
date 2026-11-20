/* توصيات السرعة المستمرة لكل شاشة من صفحات المساعدة المرتبطة في الدليل.
   تُستخدم كمدخلات تقديرية لا كمعدّل البت الفعلي أو ضمان للأداء. */
export const STREAMING_RATES = Object.freeze({
  youtube: Object.freeze({ hd: 2.5, fhd: 5, uhd: 20 }),
  netflix: Object.freeze({ hd: 3, fhd: 5, uhd: 15 }),
});

export const HEADROOM = 0.25;

/**
 * اجمع متطلبات الشاشات والأنشطة الأخرى، ثم أضف هامشاً إرشادياً 25%.
 * السرعة المقاسة اختيارية. الأرقام بالمِجابت/ث، وليس بالميغابايت/ث.
 */
export function calculateStreamingBandwidth({ provider, hd, fhd, uhd, otherMbps = 0, measuredMbps = null }) {
  const rates = STREAMING_RATES[provider];
  if (!rates) return { ok: false, error: 'provider' };
  if (![hd, fhd, uhd].every(n => Number.isInteger(n) && n >= 0 && n <= 8)) {
    return { ok: false, error: 'screens' };
  }
  if (hd + fhd + uhd === 0) return { ok: false, error: 'no-screens' };
  if (!Number.isFinite(otherMbps) || otherMbps < 0 || otherMbps > 10000) {
    return { ok: false, error: 'other' };
  }
  if (measuredMbps !== null && (!Number.isFinite(measuredMbps) || measuredMbps < 0 || measuredMbps > 10000)) {
    return { ok: false, error: 'measured' };
  }

  const videoMbps = hd * rates.hd + fhd * rates.fhd + uhd * rates.uhd;
  const baselineMbps = videoMbps + otherMbps;
  // التقريب للأعلى يمنع عرض هدف أقل من القيمة المحسوبة بسبب التقريب.
  const targetMbps = Math.ceil((baselineMbps * (1 + HEADROOM) - 1e-9) * 10) / 10;
  const comparison = measuredMbps === null ? 'not-provided'
    : measuredMbps < baselineMbps ? 'below-baseline'
      : measuredMbps < targetMbps ? 'below-target' : 'enough';
  return { ok: true, videoMbps, baselineMbps, targetMbps, comparison };
}
