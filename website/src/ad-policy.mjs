import { matchCenterRouteIds } from './content/match-center.mjs';

/*
 * صفحات تفاصيل المباريات تُبنى من قالب مشترك، وتتفاوت البيانات المتاحة فيها.
 * لا نضع مُحمِّل الإعلانات عليها إلى أن تُراجع قيمتها صفحةً صفحة. السلة صفحة
 * وظيفية بلا محتوى إعلاني. المسارات هنا مطبّعة (بلا شرطة أخيرة)، كما في الموجّه.
 * تُستخدم القائمة نفسها في البناء وفي التنقّل حتى لا تبقى إعلانات الصفحة
 * السابقة عند الانتقال إليها داخل تطبيق الصفحة الواحدة.
 */
const AD_FREE_ROUTES = new Set(['/cart', ...matchCenterRouteIds()]);

export function isAdFreeRoute(path) {
  return AD_FREE_ROUTES.has(path);
}

export function crossesAdBoundary(from, to) {
  return isAdFreeRoute(from) !== isAdFreeRoute(to);
}
