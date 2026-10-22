/* ==========================================================================
   أسعار السوق المصري (بالجنيه المصري) — مصدر واحد لجدول مقال مصر
   --------------------------------------------------------------------------
   • أسعار المتجر في data.ts محسوبة من الدولار، وهي المرجع لكل الصفحات.
     هذا الملف يحمل العرض المصري المستقل الذي يُعرض في مقال «أفضل سيرفر
     IPTV في مصر» فقط، ولا يغيّر أسعار المتجر.
   • كل رقم يُكتب هنا مرة واحدة؛ لا تُكتب الأسعار داخل نص المقال.
   • ترك أي مدة بقيمة null يعني أنها غير متاحة في العرض المصري، فلا تُعرض
     في الجدول — ولا يُعرض الجدول كله قبل وصول الأرقام (hasEgyptPricing).
   • سعر أي مدة = إجمالي المدة بالجنيه المصري كما يُؤكَّد للعميل عبر واتساب.
========================================================================== */

export type EgyptServerCode = "nova" | "istar" | "moka" | "x";
export type EgyptTerm = "3" | "6" | "12";

export interface EgyptServerPrice {
  code: EgyptServerCode;
  /** الاسم كما يظهر في الجدول */
  name: string;
  /** وصف قصير: الأنسب لمن */
  bestFor: string;
  /** عدد الأجهزة المتزامنة كما يعلنه مزوّد السيرفر */
  devices: string;
  /** إجمالي سعر المدة بالجنيه المصري، أو null إن لم تكن المدة متاحة */
  prices: Record<EgyptTerm, number | null>;
  /** سعر «شهرياً» المحسوب — null إن لم يوجد سعر سنوي */
  notes?: string;
}

/* تاريخ آخر تحديث للأسعار المصرية (يُعرض تحت الجدول للشفافية) */
export const EGYPT_PRICING_UPDATED: string | null = null;

export const EGYPT_PRICING: EgyptServerPrice[] = [
  {
    code: "nova",
    name: "نوفا (Nova)",
    bestFor: "المباريات وذروة المساء",
    devices: "حتى 3 أجهزة",
    prices: { "3": null, "6": null, "12": null },
  },
  {
    code: "istar",
    name: "إيستار برو (iStar Pro)",
    bestFor: "العائلة والأفلام والمسلسلات",
    devices: "حتى جهازين",
    prices: { "3": null, "6": null, "12": null },
  },
  {
    code: "moka",
    name: "موكا (Moka)",
    bestFor: "السرعات المحدودة والمشاهدة الطويلة",
    devices: "حتى جهازين",
    prices: { "3": null, "6": null, "12": null },
  },
  {
    code: "x",
    name: "X (XTV)",
    bestFor: "الميزانية والأجهزة المتعددة",
    devices: "حتى 3 أجهزة",
    prices: { "3": null, "6": null, "12": null },
  },
];

export const EGYPT_TERMS: EgyptTerm[] = ["3", "6", "12"];

/** هل وصلت أرقام العرض المصري؟ لا يُعرض جدول الأسعار قبل ذلك. */
export function hasEgyptPricing(): boolean {
  return EGYPT_PRICING.some((server) =>
    EGYPT_TERMS.some((term) => typeof server.prices[term] === "number")
  );
}

/** المتوسط الشهري لسعر مدة (للمقارنة بين المدد) — null إن غاب السعر */
export function monthlyEquivalent(price: number | null, term: EgyptTerm): number | null {
  if (typeof price !== "number") return null;
  const months = Number(term);
  return months > 0 ? price / months : null;
}

/** تنسيق سعر بالجنيه المصري بفواصل الآلاف */
export function formatEgp(value: number): string {
  return `${value.toLocaleString("en-US")} ج.م`;
}

/** صياغة موحّدة لملاحظة الأسعار تُعرض أسفل الجدول وفي الأسئلة الشائعة */
export const EGYPT_PRICING_NOTE =
  "الأسعار بالجنيه المصري إجمالي المدة المختارة، وتُؤكَّد كتابةً عبر واتساب قبل التفعيل. مقابلها تفعيل بيانات الاشتراك الصادرة من المزوّد الخارجي وربطها على أجهزتك وإعداد المشغّل والدعم الفني، وليست مقابل ملكية المحتوى أو بثّه.";
