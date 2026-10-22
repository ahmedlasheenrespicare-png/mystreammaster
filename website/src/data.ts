/* التواصل — مصدر واحد في src/config.ts
   (كان الرقم مكرَّراً هنا بصيغة عرض مختلفة، فظهر رقم ناقص في JSON-LD المنشور) */
import { WHATSAPP_NUMBER } from "./config";
export { WHATSAPP_DISPLAY, WHATSAPP_NUMBER } from "./config";

export function getWhatsAppUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export interface Currency {
  code: "SAR" | "EGP" | "AED" | "KWD" | "USD";
  symbol: string;
  name: string;
  rateToSar: number;
}

export const CURRENCIES: Record<string, Currency> = {
  SAR: { code: "SAR", symbol: "ر.س", name: "ريال سعودي", rateToSar: 1 },
  EGP: { code: "EGP", symbol: "ج.م", name: "جنيه مصري", rateToSar: 12.85 },
  AED: { code: "AED", symbol: "د.إ", name: "درهم إماراتي", rateToSar: 0.98 },
  KWD: { code: "KWD", symbol: "د.ك", name: "دينار كويتي", rateToSar: 0.082 },
  USD: { code: "USD", symbol: "$", name: "دولار أمريكي", rateToSar: 0.27 },
};

export type PlanDuration = "3" | "6" | "12" | "24";

export interface PlanPrice {
  SAR: number;
  EGP: number;
  AED: number;
  KWD: number;
  USD: number;
  oldSar?: number;
}

export interface PricingPlan {
  id: string;
  serverName: string;
  serverCode: "nova" | "istar" | "moka" | "x";
  tag: string;
  isPopular?: boolean;
  isFeatured?: boolean;
  isVip?: boolean;
  description: string;
  /** A missing duration means that this plan is not sold for that term. */
  prices: Partial<Record<PlanDuration, PlanPrice>> & { "12": PlanPrice };
  features: string[];
  channelsCount: string;
  vodCount: string;
  quality: string;
  antiFreeze: string;
  devices: string;
  /** محتوى الصفحة الإنجليزية (/en/{serverCode}) — الأسعار نفسها من prices */
  en: {
    name: string;
    tag: string;
    description: string;
    features: string[];
    channels: string;
    vod: string;
    devices: string;
    antiFreeze: string;
  };
}

/** مدد البيع المعروضة على مستوى المتجر؛ قد يستثني كل سيرفر مدة عبر غياب سعرها. */
export const AVAILABLE_DURATIONS = ["12"] as const;

/* ملاحظة صفة: الأسماء والمواصفات أدناه تصف سيرفرات يديرها مزوّدون خارجيون مستقلون.
   ما يقدّمه الموقع هو باقة التفعيل والربط التقني والدعم الفني على أجهزة المشترك،
   ولا يستضيف المحتوى ولا يبثّه. تُعرض المواصفات كما يعلنها المزود للتعريف والمقارنة. */
export const PROVIDER_SPECS_NOTE =
  "مواصفات السيرفر (عدد القنوات والمكتبة والجودة) لدى المزود الخارجي المستقل — تُعرض للتعريف والمقارنة فقط.";

export const OUR_SERVICE_NOTE =
  "ما يقدّمه الموقع: باقة التفعيل والربط التقني لقوائم التشغيل (M3U / Xtream Codes) الصادرة من المزود، وإعداد المشغّل على أجهزتك، ودعم فني بالعربية طوال مدة الباقة.";

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "plan-nova",
    serverName: "سيرفر نوفا (Nova Server)",
    serverCode: "nova",
    tag: "الأكثر طلباً للمباريات ⚽",
    isPopular: true,
    description:
      "يُعلن المزود الخارجي لهذا السيرفر ثباتاً مرتفعاً وقت ضغط المباريات وتعدداً في مصادر البث لكل قناة.",
    prices: Object.fromEntries(["3", "6", "12", "24"].map(duration => [duration, {
      USD: 25, SAR: 92.59, EGP: 1189.81, AED: 90.74, KWD: 7.59
    }])) as PricingPlan["prices"],
    features: [
      "تفعيل بيانات الاشتراك الصادرة من المزود وإرسالها خلال دقائق",
      "إعداد المشغّل على شاشتك أو جهازك خطوة بخطوة (Smart TV، أندرويد، Apple، كمبيوتر)",
      "ربط قوائم التشغيل M3U / Xtream Codes في التطبيق الذي تختاره",
      "اختبار الجودة والثبات على سرعة اتصالك قبل الالتزام بمدة أطول",
      "دعم فني بالعربية على مدار الساعة ومتابعة حتى حل المشكلة",
      "مساعدة في ضبط الترجمة والدبلجة وإعادة البث (TimeShift) متى دعمها سيرفر المزود",
      "دليل خيارات المشاهدة الرسمية للمحتوى المشفّر في صفحة المشاهدة القانونية",
    ],
    channelsCount: "+15,000 قناة حية",
    vodCount: "+50,000 فيلم ومسلسل",
    quality: "8K / 4K / FHD / HD",
    antiFreeze: "نظام مانع التقطيع H.265 v9.4",
    devices: "حتى 3 أجهزة",
    en: {
      name: "Nova Server",
      tag: "Most popular for live matches ⚽",
      description:
        "The external provider of this server announces high stability during match-time pressure and multiple broadcast sources per channel.",
      features: [
        "Activation of the provider-issued subscription data, sent to you within minutes",
        "Player setup on your TV or device, step by step (Smart TV, Android, Apple, computer)",
        "Linking M3U playlists / Xtream Codes in the player app you choose",
        "Quality and stability testing on your connection speed before you commit to a longer term",
        "Technical support in Arabic around the clock, following up until your issue is resolved",
        "Help with subtitles, audio tracks and catch-up (TimeShift) whenever the provider's server supports it",
        "A guide to official viewing options for encrypted content on the Legal Viewing page",
      ],
      channels: "+15,000 live channels",
      vod: "+50,000 movies & series",
      devices: "Up to 3 devices",
      antiFreeze: "H.265 anti-freeze system v9.4",
    },
  },
  {
    id: "plan-istar",
    serverName: "سيرفر إيستار برو (iStar Pro Server)",
    serverCode: "istar",
    tag: "باقة الترفيه الشاملة 🎬",
    description:
      "يُعلن المزود الخارجي لهذا السيرفر توازناً بين التصنيفات الرياضية والمكتبة الترفيهية مع سرعة تشغيل جيدة.",
    prices: Object.fromEntries(["3", "6", "12", "24"].map(duration => [duration, {
      USD: 35, SAR: 129.63, EGP: 1665.74, AED: 127.04, KWD: 10.63
    }])) as PricingPlan["prices"],
    features: [
      "تفعيل وربط تقني لباقات المزود الرياضية والترفيهية على أجهزتك",
      "إعداد المشغّل لأكثر من جهاز في المنزل (شاشة، جوال، تابلت)",
      "ضبط الجودة بما يناسب سرعة اتصالك لتقليل استهلاك البيانات",
      "اختبار التوافق مع مشغلات IPTV الشائعة قبل التفعيل النهائي",
      "دعم فني سريع ومساعدة في ضبط الإعدادات وتحديث القوائم",
      "دليل خيارات المشاهدة الرسمية للمنصات المدفوعة في صفحة المشاهدة القانونية",
    ],
    channelsCount: "+14,000 قناة حية",
    vodCount: "+50,000 فيلم ومسلسل",
    quality: "4K / FHD / HD",
    antiFreeze: "نظام الحماية من الانقطاع H.264/265",
    devices: "حتى جهازين",
    en: {
      name: "iStar Pro Server",
      tag: "The all-round entertainment package 🎬",
      description:
        "The external provider of this server announces a balance between sports categories and the entertainment library, with fast start-up speeds.",
      features: [
        "Technical activation and linking of the provider's sports and entertainment packages on your devices",
        "Player setup for more than one device at home (TV, phone, tablet)",
        "Quality tuned to your connection speed to reduce data usage",
        "Compatibility testing with popular IPTV players before final activation",
        "Fast technical support and help with settings and playlist updates",
        "A guide to official viewing options for paid platforms on the Legal Viewing page",
      ],
      channels: "+14,000 live channels",
      vod: "+50,000 movies & series",
      devices: "Up to 2 devices",
      antiFreeze: "H.264/265 anti-interruption protection system",
    },
  },
  {
    id: "plan-moka",
    serverName: "سيرفر موكا (Moka Server)",
    serverCode: "moka",
    tag: "للمشاهدة الثقيلة والمباريات ⚡",
    description:
      "يُعلن المزود الخارجي لهذا السيرفر تحمّلاً للمشاهدة الطويلة وقنوات بجودات متعددة تناسب السرعات المنخفضة.",
    prices: Object.fromEntries(["3", "6", "12", "24"].map(duration => [duration, {
      USD: 45, SAR: 166.67, EGP: 2141.67, AED: 163.33, KWD: 13.67
    }])) as PricingPlan["prices"],
    features: [
      "تفعيل فوري ودعم إعداد المشغّل على جهازك من أول مرة",
      "ضبط الجودات المنخفضة (SD / Low-Bitrate) لمن لديه سرعة إنترنت محدودة",
      "متابعة الثبات أثناء المشاهدة الطويلة وإبلاغك بالبدائل المتاحة لدى المزود",
      "دعم فني ذو أولوية ومتابعة حتى الحل",
      "شرح طريقة استخدام القوائم والمفضلة وإعادة البث داخل المشغّل",
      "دليل خيارات المشاهدة الرسمية للمباريات في صفحة المشاهدة القانونية",
    ],
    channelsCount: "+11,000 قناة حية",
    vodCount: "+35,000 فيلم ومسلسل",
    quality: "4K / FHD / HD",
    antiFreeze: "تقنية الضغط الذكي Smart Low-Buffer",
    devices: "حتى جهازين",
    en: {
      name: "Moka Server",
      tag: "For heavy viewing and matches ⚡",
      description:
        "The external provider of this server announces endurance for long viewing sessions and channels in multiple qualities suited to lower speeds.",
      features: [
        "Instant activation and first-time player setup support on your device",
        "Low-quality profiles (SD / low-bitrate) tuned for limited internet speeds",
        "Stability monitoring during long viewing, with the provider's available alternatives flagged to you",
        "Priority technical support that follows up until resolution",
        "A walkthrough of playlists, favourites and catch-up (TimeShift) inside your player",
        "A guide to official viewing options for matches on the Legal Viewing page",
      ],
      channels: "+11,000 live channels",
      vod: "+35,000 movies & series",
      devices: "Up to 2 devices",
      antiFreeze: "Smart Low-Buffer compression technology",
    },
  },
  {
    id: "plan-x",
    serverName: "سيرفر X (XTV Server)",
    serverCode: "x",
    tag: "اختيار جديد ⚡",
    isFeatured: true,
    description:
      "يُعلن المزود الخارجي لهذا السيرفر ثباتاً مرتفعاً وقت ضغط المباريات وتعدداً في مصادر البث لكل قناة.",
    prices: {
      "12": { USD: 20, SAR: 74.07, EGP: 951.85, AED: 72.59, KWD: 6.07 },
    },
    features: [
      "تفعيل بيانات الاشتراك الصادرة من المزود وإرسالها خلال دقائق",
      "إعداد المشغّل على شاشتك أو جهازك خطوة بخطوة (Smart TV، أندرويد، Apple، كمبيوتر)",
      "ربط قوائم التشغيل M3U / Xtream Codes في التطبيق الذي تختاره",
      "اختبار الجودة والثبات على سرعة اتصالك قبل الالتزام بمدة أطول",
      "دعم فني بالعربية على مدار الساعة ومتابعة حتى حل المشكلة",
      "مساعدة في ضبط الترجمة والدبلجة وإعادة البث (TimeShift) متى دعمها سيرفر المزود",
      "دليل خيارات المشاهدة الرسمية للمحتوى المشفّر في صفحة المشاهدة القانونية",
    ],
    channelsCount: "+15,000 قناة حية",
    vodCount: "+50,000 فيلم ومسلسل",
    quality: "8K / 4K / FHD / HD",
    antiFreeze: "نظام مانع التقطيع H.265 v9.4",
    devices: "حتى 3 أجهزة",
    en: {
      name: "X Server",
      tag: "A new server option ⚡",
      description:
        "The external provider of this server announces high stability during match-time pressure and multiple broadcast sources per channel.",
      features: [
        "Activation of the provider-issued subscription data, sent to you within minutes",
        "Player setup on your TV or device, step by step (Smart TV, Android, Apple, computer)",
        "Linking M3U playlists / Xtream Codes in the player app you choose",
        "Quality and stability testing on your connection speed before you commit to a longer term",
        "Technical support in Arabic around the clock, following up until your issue is resolved",
        "Help with subtitles, audio tracks and catch-up (TimeShift) whenever the provider's server supports it",
        "A guide to official viewing options for encrypted content on the Legal Viewing page",
      ],
      channels: "+15,000 live channels",
      vod: "+50,000 movies & series",
      devices: "Up to 3 devices",
      antiFreeze: "H.265 anti-freeze system v9.4",
    },
  },
];

/* ==========================================================================
   أقل سعر بين الباقات — يُشتق من PRICING_PLANS نفسه.
   الغرض: أي مكوّن يريد عرض «تبدأ من … دولار» يقرأ الرقم من هنا بدل كتابته
   يدوياً، فيبقى مصدر الأسعار واحداً (data.ts) ويتحدّث تلقائياً مع الكتالوج.
========================================================================== */

/** المدة المعروضة فعلاً في المتجر (مدة واحدة حالياً: 12 شهراً) */
const ACTIVE_DURATION = AVAILABLE_DURATIONS[0];

/** أقل سعر بالدولار بين كل الباقات للمدة المعروضة */
export const LOWEST_PLAN_PRICE_USD = Math.min(
  ...PRICING_PLANS.map((plan) => plan.prices[ACTIVE_DURATION].USD),
);

export const CHANNEL_CATEGORIES = [
  {
    id: "sports",
    name: "قنوات الرياضة ⚽",
    badge: "تغطية شاملة",
    channels: [
      "قنوات رياضية عربية وعالمية متنوعة",
      "بطولات ومحتوى رياضي متنوع بحسب التوفر",
      "قنوات رياضية إقليمية متنوعة",
      "تغطيات رياضية محلية وإقليمية",
      "برامج رياضية متنوعة",
      "بطولات رياضية عالمية متنوعة",
      "تغطيات لمختلف الرياضات",
      "تغطيات الدوريات والبطولات القارية والعالمية لدى المزود",
    ],
  },
  {
    id: "entertainment",
    name: "الأفلام والمسلسلات 🎬",
    badge: "مكتبة VOD ضخمة",
    channels: [
      "أفلام ومسلسلات عربية وعالمية متنوعة",
      "دراما وبرامج عربية متنوعة",
      "أفلام ومسلسلات عالمية متنوعة",
      "محتوى ترفيهي عائلي متنوع",
      "قنوات الأفلام والعروض السينمائية المتنوعة",
      "قنوات المسلسلات التركية والكورية المترجمة",
    ],
  },
  {
    id: "arab",
    name: "القنوات العربية 🌍",
    badge: "جميع الدول",
    channels: [
      "القنوات السعودية والخليجية الرسمية والخاصة",
      "القنوات المصرية والنايل سات وعربسات كاملة",
      "قنوات الشام (سوريا، لبنان، الأردن، العراق)",
      "قنوات المغرب العربي (المغرب، الجزائر، تونس)",
      "القنوات الإخبارية العربية والدولية 24/7",
    ],
  },
  {
    id: "kids",
    name: "الأطفال والوثائقيات 🦁",
    badge: "عائلي آمن",
    channels: [
      "برامج وثائقية عن الطبيعة والعلوم",
      "وثائقيات وبرامج عن الحياة البرية",
      "Spacetoon & MBC 3 & Majid TV",
      "برامج رسوم متحركة للأطفال",
      "قنوات إسلامية وقرآن كريم على مدار 24 ساعة",
    ],
  },
];

export const APPS_AND_DEVICES = [
  {
    device: "شاشات Smart TV (سامسونج وLG)",
    apps: ["IBO Player", "BOB Player", "Flix IPTV", "Smart IPTV", "Set IPTV", "Net IPTV"],
    desc: "يعمل بتطبيق مباشر من متجر الشاشة دون الحاجة لأي رسيفر إضافي.",
    icon: "tv",
  },
  {
    device: "أجهزة Android & TV Box & Firestick",
    apps: ["IPTV Smarters Pro", "XCIPTV Player", "TiviMate", "LED 4K Player"],
    desc: "أفضل تجربة وأسرع تنقل بين القنوات مع دعم خاصية التسجيل.",
    icon: "android",
  },
  {
    device: "أجهزة Apple (Apple TV, iPhone, iPad, Mac)",
    apps: ["S-Player Pro", "IPTVX", "GSE Smart IPTV", "Smarters Lite"],
    desc: "واجهة فائقة السلاسة ودعم AirPlay والمزامنة السحابية.",
    icon: "apple",
  },
  {
    device: "أجهزة الكمبيوتر واللابتوب (Windows / Mac)",
    apps: ["VLC Media Player", "IPTV Smarters Web/App", "MyTVOnline"],
    desc: "مشاهدة مباشرة برابط M3U أو بيانات Xtream Codes المباشرة.",
    icon: "computer",
  },
];

export const FAQS = [
  {
    q: "هل السيرفر مستقر وبدون تقطيع أثناء المباريات الكبيرة؟",
    a: "نعم، سيرفرات المزود مزودة بتقنية الحماية من الضغط (Anti-Freeze Tech) وشبكة خوادم CDN موزعة جغرافياً في السعودية والخليج وأوروبا لضمان ثبات 99.9% حتى مع ذروة المشاهدات في نهائيات دوري الأبطال وكأس العالم.",
  },
  {
    q: "كيف أستلم بيانات الاشتراك بعد الشراء؟",
    a: "التفعيل فوري وآلي بالكامل! بمجرد تأكيد الطلب، يتم إصدار وإرسال بيانات الاشتراك الصادرة من المزود (رابط M3U + بيانات Xtream: المستخدم وكلمة السر والسيرفر) عبر واتساب والبريد الإلكتروني خلال 5 دقائق مع شرح كامل لطريقة التشغيل.",
  },
  {
    q: "هل يمكنني طلب تجربة مجانية قبل الاشتراك؟",
    a: "نعم، بكل سرور! يوفر المزود تجربة مجانية لمدة 6 ساعات لتفحص القنوات الرياضية والترفيهية وجودة السيرفر على جهازك قبل دفع أي مبلغ.",
  },
  {
    q: "ما هي سرعة الإنترنت المطلوبة لتشغيل القنوات بدون تقطيع؟",
    a: "لتشغيل قنوات SD/HD تحتاج إلى 4-8 ميجابت. لقنوات FHD تحتاج 15-20 ميجابت. ولقنوات 4K الحقيقية يُفضل 25-30 ميجابت فما فوق.",
  },
  {
    q: "هل يعمل الاشتراك على أكثر من جهاز؟",
    a: "يمكنك تنزيل وتثبيت الاشتراك على كافة أجهزتك (الشاشة، الجوال، التابلت، اللابتوب)، ولكن الباقات القياسية تعمل على جهاز واحد في نفس اللحظة. إذا كنت ترغب بتشغيل جهازين معاً يُنصح باختيار باقة تدعم أكثر من جهاز لدى المزود في نفس الوقت.",
  },
  {
    q: "ما هي طرق الدفع المتاحة؟",
    a: "تتوفر عبر بوابات الدفع المعتمدة طرق دفع سهلة وآمنة تناسب جميع الدول: مدى، فيزا، ماستركارد، Apple Pay، STC Pay، فودافون كاش، إنستاباي، وتحويل بنكي.",
  },
  {
    q: "هل أحتاج إلى فني لتركيب الاشتراك؟",
    a: "لا تحتاج إلى أي فني على الإطلاق! العملية بسيطة جداً: تقوم بتحميل التطبيق على جهازك، وتدخل كود التفعيل الصادر من المزود، وتعمل القنوات فوراً. كما أن فريق الدعم الفني جاهز لمساعدتك خطوة بخطوة عبر واتساب.",
  },
  {
    q: "ما الفرق بين سيرفر نوفا وإيستار برو وموكا وX؟",
    a: "سيرفر نوفا هو الأنسب للمباريات والرياضة ويدعم حتى 3 أجهزة، وتُعرض باقة X حالياً بمواصفات ومزايا مماثلة لنوفا. سيرفر إيستار برو متوازن للأفلام والمسلسلات والترفيه العائلي، وسيرفر موكا اقتصادي في استهلاك البيانات ويعمل جيداً على السرعات المحدودة. المواصفات الفنية لكل سيرفر يعلنها المزود الخارجي، وتشمل خدمتنا التفعيل والربط التقني وإعداد المشغّل والدعم الفني.",
  },
];

/* ==========================================================================
   أسئلة صفحة التجربة المجانية (/trial) — مصدر واحد لعرض الصفحة وبيانات
   FAQPage المنظّمة معاً (القاعدة الذهبية). حقائقها من نموذج طلب التجربة
   نفسه: كود يصدره المزود الخارجي، 6 ساعات، استلام عبر واتساب خلال دقائق،
   وبدون أي دفع قبل التجربة. الأسئلة العامة تُعاد بالمرجع من FAQS.
========================================================================== */
export const TRIAL_FAQS: FaqItem[] = [
  {
    q: "كيف أطلب تجربة IPTV مجانية لمدة 6 ساعات؟",
    a: "اضغط زر طلب التجربة في هذه الصفحة، واختر جهازك والسيرفر الذي تريد فحصه (نوفا أو إيستار أو موكا)، ثم أرسل الطلب عبر واتساب. يُصدر المزود الخارجي كود التجربة وتصلك بياناته عبر واتساب خلال دقائق — عادة أقل من 5 دقائق — مع إرشادات إعداد المشغّل على جهازك خطوة بخطوة.",
  },
  FAQS[2],
  {
    q: "هل أحتاج إلى دفع أي مبلغ أو بطاقة ائتمانية لطلب التجربة؟",
    a: "لا. التجربة مجانية بالكامل لمدة 6 ساعات: لا يُطلب منك دفع أي مبلغ قبلها أو خلالها، ولا يوجد أي تجديد تلقائي بعدها. الهدف أن تفحص توافق جهازك واستقرار البث وجودة الصورة على سرعة اتصالك أولاً، ثم تقرر بنفسك إن كنت ستطلب باقة التفعيل والربط التقني.",
  },
  {
    q: "ما الذي يمكنني فحصه خلال ساعات التجربة الست؟",
    a: "كل ما يهمك قبل الاشتراك: توافق المشغّل مع جهازك، وثبات البث وقت الذروة والمباريات، وجودة الصورة على سرعة اتصالك الحالية، وسرعة التنقل بين القنوات، وملاءمة السيرفر الذي اخترته لاستخدامك. جرّب على الجهاز الذي ستعتمد عليه فعلياً وفي أوقات الذروة إن أمكن، فهكذا تكون النتيجة واقعية.",
  },
  FAQS[3],
  {
    q: "على أي الأجهزة تعمل التجربة المجانية؟",
    a: "تعمل بيانات التجربة الصادرة عن المزود على الأجهزة نفسها التي تدعمها باقات الاشتراك: شاشات سامسونج وLG الذكية، وأجهزة Android Box وFire TV Stick، وأجهزة Apple TV والآيفون والآيباد، والكمبيوتر واللابتوب، وجوالات أندرويد. اختر نوع جهازك عند إرسال الطلب لتصلك إرشادات الإعداد المناسبة له.",
  },
  {
    q: "ماذا يحدث بعد انتهاء الـ6 ساعات؟",
    a: "تنتهي صلاحية كود التجربة تلقائياً، ولا يُخصم منك أي مبلغ ولا يتجدد شيء من تلقاء نفسه. إذا رضيت عن الأداء، اطلب باقة التفعيل والربط التقني للسيرفر الذي جرّبته وستصلك بيانات اشتراك كاملة صادرة عن المزود الخارجي مع شرح إعداد المشغّل ومساعدة الدعم الفني.",
  },
];

/* ==========================================================================
   أقسام صفحة الأسئلة الشائعة (/faq) — مصدر واحد لعرض الصفحة وبيانات
   FAQPage المنظّمة معاً (القاعدة الذهبية: لا سؤال في المخطّط إلا وهو
   ظاهر فعلاً في الصفحة). الأسئلة العامة أعلاه (FAQS) تُعاد استخدامها
   هنا بالمرجع حتى لا تتكرر النصوص أو تنحرف، وتبقى كما هي في الرئيسية
   وصفحات الباقات.
========================================================================== */
export interface FaqItem {
  q: string;
  a: string;
  links?: { href: string; label: string }[];
}

export interface FaqSection {
  id: string;
  title: string;
  intro: string;
  faqs: FaqItem[];
}

export const FAQ_SECTIONS: FaqSection[] = [
  {
    id: "activation",
    title: "التفعيل والتشغيل",
    intro:
      "من لحظة تأكيد الطلب حتى أول تشغيل على جهازك: كيف تصلك بيانات الاشتراك، والفرق بين طرق الربط، وماذا تفعل عند أي توقف.",
    faqs: [
      FAQS[1],
      { ...FAQS[0], links: [{ href: "blog/test-iptv-server-stability/", label: "كيف تختبر ثبات السيرفر قبل أن تدفع؟" }] },
      {
        q: "ما الفرق بين رابط M3U وبيانات Xtream Codes؟ وأيهما أستخدم في التفعيل؟",
        a: "كلاهما وسيلة الربط التقني نفسها الصادرة عن المزود الخارجي، والفرق في طريقة الإدخال: رابط M3U هو رابط واحد تضعه في المشغّل فتُحمَّل القائمة كاملة، بينما تتكوّن بيانات Xtream Codes من عنوان السيرفر واسم المستخدم وكلمة السر، وتتيح للمشغّلات الداعمة تنظيم القائمة في تصنيفات وتحديثها بسهولة. عند استلامك البيانات يرسل لك فريقنا الطريقتين معاً، ويساعدك في اختيار الأنسب لتطبيقك وجهازك أثناء إعداد المشغّل.",
      },
      { ...FAQS[2], links: [{ href: "trial/", label: "صفحة التجربة المجانية 6 ساعات وشروطها" }] },
      FAQS[6],
      FAQS[3],
      {
        q: "توقفت القائمة عن العمل فجأة أو ظهرت شاشة سوداء، ماذا أفعل؟",
        a: "ابدأ بالخطوات التالية بالترتيب: أعد تشغيل تطبيق المشغّل، ثم أعد تشغيل الراوتر والجهاز، وتحقق أن سرعة الإنترنت واصلة فعلاً بإجراء اختبار سرعة، ثم حدّث القائمة أو أعد إدخال بيانات الاشتراك الصادرة من المزود كما هي دون تغيير أي حرف. إذا استمرت المشكلة فراجع صفحة حالة الخدمة لمعرفة ما إذا كان هناك عمل تقني معلن، ثم راسل الدعم الفني عبر واتساب مع صورة للرسالة الظاهرة واسم التطبيق والجهاز، وسيرشدك خطوة بخطوة حتى يعود التشغيل.",
        links: [{ href: "status/", label: "صفحة حالة الخدمة والأعمال التقنية المعلنة" }],
      },
      {
        q: "هل تشمل باقة التفعيل مشاهدة القنوات المشفّرة مجاناً؟",
        a: "لا. خدمتنا هي باقة تفعيل وربط تقني وإعداد لمشغلات البث فقط: نفعّل بيانات الاشتراك الصادرة عن مزود خارجي مستقل ونضبط المشغّل على جهازك، ولا نستضيف أي محتوى ولا نبثّه ولا نبيع قنوات أو بثاً. المحتوى المشفّر يبقى متاحاً عبر اشتراكات الجهات الرسمية المالكة له فقط، وقد جمعنا لك خيارات المشاهدة الرسمية في دليل مستقل.",
        links: [{ href: "watch-legal.html", label: "دليل المشاهدة الرسمية وخيارات الاشتراك الرسمي" }],
      },
    ],
  },
  {
    id: "payment",
    title: "الدفع والاسترجاع",
    intro:
      "طرق الدفع المتاحة وخطوات إتمام الطلب، ومتى يمكنك استرجاع المبلغ ومتى لا يكون ذلك متاحاً، وفق سياسة الاسترجاع المعلنة.",
    faqs: [
      FAQS[5],
      {
        q: "كيف أطلب باقة التفعيل وأكمل الدفع خطوة بخطوة؟",
        a: "اختر السيرفر والباقة المناسبة من صفحة الباقات، أضفها إلى السلة، ثم أكمل الطلب عبر واتساب حيث يؤكد لك فريقنا تفاصيل الباقة وطريقة الدفع المتاحة لبلدك. بعد تأكيد الدفع تُصدر بيانات الاشتراك من المزود الخارجي وتصلك عبر واتساب والبريد الإلكتروني خلال دقائق، مع شرح إعداد المشغّل على جهازك خطوة بخطوة.",
        links: [{ href: "store/", label: "صفحة الباقات والأسعار الحالية" }],
      },
      {
        q: "دفعت ولم تصلني بيانات التفعيل، هل أسترد المبلغ؟",
        a: "أولاً راجع محادثة واتساب وبريدك الإلكتروني بما فيه مجلد الرسائل غير المرغوبة، ثم راسل الدعم الفني مباشرة ببيانات طلبك. إذا لم تُسلَّم بيانات التفعيل خلال المدة المحددة بعد نجاح الدفع ولم يستجب الدعم بعد تواصلك معه، فهذا من الحالات المؤهلة لاسترداد مبلغك عند طلب ذلك خلال 72 ساعة من تاريخ الشراء، وفق سياسة الاسترجاع.",
        links: [{ href: "refund/", label: "سياسة إلغاء الاشتراك واسترداد الأموال" }],
      },
      {
        q: "في أي حالات يمكنني استرجاع المبلغ بعد الشراء؟",
        a: "يُتاح الاسترجاع خلال 72 ساعة كحد أقصى من تاريخ الشراء في حالات محددة: عدم استلام بيانات التفعيل رغم نجاح الدفع وعدم استجابة الدعم بعد التواصل معه، أو عدم تفعيل الكود أو استخدامه نهائياً مع طلب الإلغاء داخل المهلة، أو وجود عطل تقني كلي مثبت من طرفنا يمنع التشغيل تماماً منذ لحظة الشراء وتعذّرت معالجته أو توفير بديل مكافئ خلال 48 ساعة عمل من فتح تذكرة الدعم مع تعاونك الكامل في التشخيص. كما يُرد المبلغ الإضافي كاملاً وبشكل فوري إذا سُحب ثمن الطلب نفسه مرتين بالخطأ.",
        links: [{ href: "refund/", label: "سياسة إلغاء الاشتراك واسترداد الأموال" }],
      },
      {
        q: "في أي حالات لا يمكن استرجاع المبلغ؟",
        a: "لا يكون الاسترجاع متاحاً إذا فعّلت الكود وشغّلت الخدمة فعلياً ثم غيّرت رأيك، أو كانت المشكلة من طرفك كضعف أو تذبذب سرعة الإنترنت أو عدم توافق جهازك أو رفض اتباع تعليمات الدعم الفني، أو بسبب قيود أو حجب من شركة الاتصالات أو مزود الإنترنت في بلدك، أو توقف أو تحديث بعض مصادر الأطراف الثالثة المستقلة، أو مخالفة شروط الخدمة مثل تشغيل الحساب على أكثر من جهاز في نفس الوقت أو إعادة البث أو الاستخدام التجاري في الأماكن العامة، أو عند تقديم طلب الاسترجاع بعد مرور 72 ساعة من الشراء. لذلك ننصح دائماً بطلب التجربة المجانية أولاً للتأكد من توافق الخدمة مع جهازك واتصالك قبل الدفع.",
        links: [{ href: "refund/", label: "سياسة إلغاء الاشتراك واسترداد الأموال" }],
      },
      {
        q: "هل يتجدد اشتراكي تلقائياً ويُخصم المبلغ دون طلب مني؟",
        a: "لا. باقات التفعيل المدفوعة لمرة واحدة لا يتم تجديدها تلقائياً إلا بطلبك، فلن يُخصم أي مبلغ من وسيلة دفعك من تلقاء نفسه. وفي حال وجود باقة بتجديد دوري، يمكنك طلب إلغاء التجديد التلقائي في أي وقت قبل موعد استحقاق الفاتورة التالية بـ 48 ساعة على الأقل، ويوقف هذا الإلغاء عمليات الخصم المستقبلية فقط دون أن يترتب عليه استرداد مبالغ الفترة الجارية.",
      },
      {
        q: "سُحب مبلغ اشتراكي مرتين بالخطأ لنفس الطلب، ماذا أفعل؟",
        a: "راسل الدعم الفني عبر واتساب مع رقم العملية أو صورتها وتاريخها، وسنتحقق منها مباشرة. الدفع المكرر لنفس الطلب من الحالات المضمونة في سياسة الاسترجاع: يُرد إليك المبلغ الإضافي كاملاً وبشكل فوري بعد التحقق من العملية.",
      },
    ],
  },
  {
    id: "devices",
    title: "الأجهزة والتوافق",
    intro:
      "الشاشات الذكية والجوالات وأجهزة البث والكمبيوتر: ما الذي يعمل مع بيانات الاشتراك، وعدد الأجهزة في نفس الوقت، وحلول الشاشات القديمة.",
    faqs: [
      FAQS[4],
      {
        q: "هل يعمل التفعيل على شاشات سامسونج وLG الذكية؟ وماذا أحتاج؟",
        a: "نعم، تعمل بيانات الاشتراك الصادرة من المزود الخارجي على شاشات سامسونج بنظام Tizen وLG بنظام webOS عبر تطبيقات مشغلات متوفرة في متجر تطبيقات الشاشة. كل ما تحتاجه هو اتصال إنترنت ثابت، وتثبيت تطبيق مشغّل، ثم إدخال رابط M3U أو بيانات Xtream Codes التي تصلك بعد التفعيل. أعددنا دليلاً بالخطوات المفصلة، وفريق الدعم الفني يساعدك عبر واتساب إذا توقفت عند أي خطوة.",
        links: [{ href: "blog/iptv-samsung-lg-setup/", label: "دليل تشغيل الاشتراك على شاشات سامسونج وLG خطوة بخطوة" }],
      },
      {
        q: "هل يعمل التفعيل على هواتف آيفون وأندرويد وأجهزة التابلت؟",
        a: "نعم، يمكنك إعداد المشغّل على هاتفك أو التابلت بنظام iOS أو أندرويد باستخدام نفس بيانات الاشتراك الصادرة من المزود، وهي طريقة عملية لتجربة الخدمة أولاً قبل إعداد الشاشة. انتبه إلى أن الباقات القياسية تعمل على جهاز واحد في نفس اللحظة، فإذا أردت التشغيل المتزامن على الشاشة والجوال معاً اسأل الدعم عن باقات المزود التي تدعم أكثر من جهاز.",
      },
      {
        q: "هل يعمل التفعيل على Fire TV Stick وأجهزة Android TV والكمبيوتر؟",
        a: "نعم، تدعم أجهزة Fire TV Stick وAndroid TV وأجهزة الاستقبال العاملة بنظام أندرويد تطبيقات مشغلات تُدخل فيها بيانات الاشتراك الصادرة من المزود، ويعمل التفعيل أيضاً على الكمبيوتر عبر مشغلات سطح المكتب بحسب التطبيق الذي تختاره. وتعد أجهزة البث الصغيرة خياراً ممتازاً إذا كانت شاشتك قديمة، لأنها تضيف إليها نظاماً حديثاً يدعم المشغلات دون الحاجة إلى تغيير الشاشة نفسها.",
      },
      {
        q: "هل أحتاج إلى ريسيفر خاص أو طبق استقبال لتشغيل الباقة؟",
        a: "لا تحتاج أي ريسيفر أو طبق استقبال أو معدات إضافية. يتم التشغيل عبر الإنترنت بالكامل: جهاز متوافق كشاشة ذكية أو جوال أو جهاز بث، وتطبيق مشغّل، واتصال إنترنت بسرعة تناسب جودة العرض التي تختارها، ثم بيانات الاشتراك التي تصلك من المزود الخارجي بعد التفعيل.",
      },
      {
        q: "شاشتي قديمة ولا تدعم تثبيت التطبيقات، هل توجد طريقة للتشغيل؟",
        a: "نعم، الحل الأبسط هو جهاز بث خارجي صغير مثل Fire TV Stick أو أي جهاز Android TV يُوصل بمنفذ HDMI في الشاشة، فيحوّلها إلى شاشة ذكية تدعم تطبيقات المشغلات. والبديل هو التشغيل على الجوال أو التابلت أو الكمبيوتر بنفس بيانات الاشتراك. وقبل شراء أي باقة، اطلب التجربة المجانية وجرّبها على الجهاز الذي ستعتمد عليه فعلياً للتأكد من التوافق والأداء على سرعة اتصالك.",
      },
      {
        q: "هل يعمل التفعيل أثناء السفر أو خارج بلد إقامتي؟",
        a: "بيانات الاشتراك الصادرة من المزود الخارجي تعمل من أي مكان يتوفر فيه اتصال إنترنت، ويمكنك إعداد المشغّل على جوالك أو حاسوبك المحمول أثناء السفر بنفس البيانات. مع ذلك قد تفرض بعض الشبكات أو الدول قيوداً تقنية على بعض أنواع الاتصال لا نملك التحكم فيها، فإذا واجهت قيداً على شبكة وجهتك راسل الدعم الفني وسيرشدك إلى الإعدادات المناسبة لجهازك.",
      },
    ],
  },
  {
    id: "renewal",
    title: "التجديد والترقية بين السيرفرات",
    intro:
      "تجديد باقتك قبل انتهائها دون انقطاع، والانتقال بين سيرفرات المزودين الخارجيين، ونقل بيانات اشتراكك إلى جهاز جديد.",
    faqs: [
      { ...FAQS[7], links: [{ href: "servers/", label: "مقارنة السيرفرات والباقات في صفحة واحدة" }] },
      {
        q: "كيف أجدد باقة التفعيل قبل انتهائها حتى لا يتوقف التشغيل؟",
        a: "الأسهل أن تطلب التجديد قبل انتهاء مدة اشتراكك الحالية بيوم أو يومين: اختر نفس الباقة من صفحة الباقات وأكمل الطلب، أو راسل الدعم الفني عبر واتساب برقم جوالك المسجل واسم السيرفر وسيُرشدك خطوة بخطوة. تُمدَّد مدة حسابك لدى المزود الخارجي بعد تأكيد الدفع، وتذكّر أن باقاتنا لا تتجدد تلقائياً، فلن يُخصم أي مبلغ إلا عندما تطلب التجديد بنفسك.",
        links: [{ href: "store/", label: "صفحة الباقات والأسعار الحالية" }],
      },
      {
        q: "هل يمكنني الترقية أو الانتقال من سيرفر إلى آخر، مثلاً من موكا إلى نوفا؟",
        a: "نعم، يمكنك في أي وقت شراء باقة تفعيل وربط تقني خاصة بالسيرفر الآخر، وستصلك بيانات اشتراك مستقلة صادرة عن مزوده الخارجي. ولأن كل سيرفر يديره مزود خارجي مستقل بحسابات منفصلة عن غيره، راسل الدعم الفني قبل إتمام الشراء ليرشدك إلى طريقة الانتقال والتوقيت الأنسب بحسب حالة اشتراكك الحالي ومدته المتبقية.",
      },
      {
        q: "هل يمكنني نقل اشتراكي إلى جهاز جديد إذا غيّرت الشاشة أو الجوال؟",
        a: "نعم، بيانات الاشتراك الصادرة من المزود ليست مرتبطة بجهاز بعينه: ثبّت تطبيق المشغّل على جهازك الجديد وأدخل نفس البيانات، وسيساعدك فريقنا في الإعداد عند الحاجة. فقط تذكّر أن التشغيل المتزامن يخضع لعدد الأجهزة المسموح في باقتك، فأوقف التشغيل على الجهاز القديم قبل البدء على الجديد إذا كانت باقتك مخصصة لجهاز واحد في نفس الوقت.",
      },
      {
        q: "انتهت مدة اشتراكي منذ فترة، هل أستعيد نفس البيانات أم أحصل على بيانات جديدة؟",
        a: "عند طلب التجديد بعد الانتهاء، راسل الدعم الفني برقم جوالك المسجل، وسيتحقق من حالة حسابك لدى المزود الخارجي ويوضح لك قبل إتمام الطلب ما إذا كانت مدة حسابك ستُمدَّد بنفس البيانات أم ستُصدر لك بيانات اشتراك جديدة تُرسل عبر واتساب والبريد الإلكتروني. وفي الحالتين لا يستغرق إعداد المشغّل من جديد سوى دقائق بمساعدة الدعم.",
      },
      {
        q: "أي سيرفر أنسب لي: نوفا أم إيستار برو أم موكا أم X؟",
        a: "يعتمد الاختيار على استخدامك وسرعة اتصالك: يُعلن المزود الخارجي لسيرفر نوفا تركيزاً على المباريات والرياضة مع دعم حتى 3 أجهزة، وتُعرض باقة X حالياً بمواصفات ومزايا مماثلة لنوفا. يُعلن مزود إيستار برو توازناً بين الرياضة والأفلام والمسلسلات والترفيه العائلي مع دعم حتى جهازين، بينما يُعلن مزود موكا استهلاكاً اقتصادياً للبيانات وأداءً جيداً على السرعات المحدودة مع دعم حتى جهازين. قارن المواصفات المعلنة من المزودين في صفحة المقارنة، وإذا ترددت بين سيرفرين فاطلب التجربة المجانية على الأقرب لاحتياجك وقرر بعد أن ترى الأداء على جهازك واتصالك.",
        links: [
          { href: "servers/", label: "مقارنة السيرفرات والباقات في صفحة واحدة" },
          { href: "blog/choose-iptv-server/", label: "دليل اختيار السيرفر المناسب لاستخدامك" },
        ],
      },
    ],
  },
];

/* ==========================================================================
   English FAQ sections (/en/faq) — the single source for both the visible
   page and its FAQPage structured data (the golden rule: no question in
   the schema that is not actually visible on the page). Facts mirror the
   Arabic FAQ and the published refund policy; no prices are quoted here —
   prices live only in PRICING_PLANS above.
========================================================================== */
export const FAQ_SECTIONS_EN: FaqSection[] = [
  {
    id: "activation",
    title: "Activation & setup",
    intro:
      "From the moment your order is confirmed to the first playback on your device: how your subscription details arrive, the difference between linking methods, and what to do if playback stops.",
    faqs: [
      {
        q: "How do I receive my subscription details after ordering?",
        a: "Activation is instant and fully automated. Once your order is confirmed, the subscription data issued by the provider (an M3U link plus Xtream Codes credentials: server address, username and password) is sent to you via WhatsApp and email within 5 minutes, together with a full explanation of how to set everything up.",
      },
      {
        q: "Is the server stable during big matches, without freezing?",
        a: "Yes. The provider's servers are equipped with anti-freeze technology and a geographically distributed CDN network across Saudi Arabia, the Gulf and Europe, announcing 99.9% stability even at peak viewing times such as Champions League finals and the World Cup. You can verify this yourself with the free trial before paying anything.",
        links: [{ href: "blog/test-iptv-server-stability/", label: "How to test server stability before you pay" }],
      },
      {
        q: "What is the difference between an M3U link and Xtream Codes, and which should I use?",
        a: "Both are the same technical linking method issued by the external provider; they differ only in how you enter them. An M3U link is a single URL you paste into your player to load the whole playlist, while Xtream Codes credentials consist of a server address, username and password, and let supporting players organise the playlist into categories and update it more easily. When your details arrive we send you both methods, and our team helps you choose the right one for your app and device during player setup.",
      },
      {
        q: "Can I try the service for free before subscribing?",
        a: "Yes, gladly. The provider offers a free 6-hour trial so you can check the sports and entertainment channels and the server quality on your own device before paying anything.",
      },
      {
        q: "Do I need a technician to install the subscription?",
        a: "No technician needed at all. The process is very simple: install the app on your device, enter the activation code issued by the provider, and playback starts immediately. Our technical support team is also ready to help you step by step via WhatsApp.",
      },
      {
        q: "What internet speed do I need for channels to play without freezing?",
        a: "For SD/HD channels you need 4–8 Mbps. For FHD channels you need 15–20 Mbps. For true 4K channels, 25–30 Mbps or more is recommended.",
      },
      {
        q: "The playlist stopped working or I get a black screen — what should I do?",
        a: "Work through these steps in order: restart the player app, then restart your router and device, confirm your internet speed with a quick speed test, then refresh the playlist or re-enter the subscription details issued by the provider exactly as received, without changing a single character. If the problem continues, check the service status page for any announced technical work, then message technical support on WhatsApp with a screenshot of the error, your app name and your device, and they will guide you step by step until playback is back.",
        links: [{ href: "status/", label: "Service status and announced technical work" }],
      },
      {
        q: "Does the activation package include watching encrypted channels for free?",
        a: "No. Our service is a technical activation and linking package plus streaming player setup only: we activate the subscription data issued by an independent external provider and configure the player on your device. We do not host any content, stream it, or sell channels or broadcasts. Encrypted content remains available only through official subscriptions from the rights holders, and we have collected the official viewing options in a dedicated guide.",
        links: [{ href: "watch-legal.html", label: "Official viewing guide and official subscription options" }],
      },
    ],
  },
  {
    id: "payment",
    title: "Payment & refunds",
    intro:
      "Available payment methods and how to complete your order, and exactly when you can — and cannot — get a refund, under the published refund policy.",
    faqs: [
      {
        q: "What payment methods are available?",
        a: "Easy and secure payment methods are available through approved payment gateways to suit all countries: mada, Visa, Mastercard, Apple Pay, STC Pay, Vodafone Cash, InstaPay and bank transfer.",
      },
      {
        q: "How do I order an activation package and pay, step by step?",
        a: "Choose the right server and package, add it to the cart, then complete your order via WhatsApp, where our team confirms the package details and the payment method available in your country. Once payment is confirmed, the subscription data is issued by the external provider and reaches you via WhatsApp and email within minutes, with a step-by-step walkthrough of setting up the player on your device.",
        links: [{ href: "store/", label: "Current packages and prices" }],
      },
      {
        q: "I paid but never received my activation details — can I get a refund?",
        a: "First check your WhatsApp conversation and your email, including the spam folder, then message technical support directly with your order details. If the activation details were not delivered within the stated time after successful payment and support did not respond after you contacted them, this is one of the cases eligible for a refund when requested within 72 hours of purchase, under the refund policy.",
        links: [{ href: "refund/", label: "Subscription cancellation and refund policy" }],
      },
      {
        q: "In which cases can I get a refund after purchasing?",
        a: "Refunds are available within a maximum of 72 hours from the date of purchase in specific cases: the activation details were not delivered despite successful payment and support not responding after you contacted them; the code was never activated or used at all and you request cancellation within the deadline; or a proven total technical fault on our side prevents playback entirely from the moment of purchase and could not be fixed or replaced with an equivalent alternative within 48 working hours of opening a support ticket, with your full cooperation in diagnosis. Any amount charged twice for the same order by mistake is also refunded in full and immediately.",
        links: [{ href: "refund/", label: "Subscription cancellation and refund policy" }],
      },
      {
        q: "In which cases is a refund not available?",
        a: "A refund is not available if you activated the code and actually used the service and then simply changed your mind; if the problem is on your side, such as weak or unstable internet, an incompatible device, or not following the support team's instructions; due to restrictions or blocking by your telecom company or internet provider in your country; due to the suspension or updating of some independent third-party sources; if you violated the terms of service, such as running the account on more than one device at the same time, rebroadcasting, or commercial use in public places; or if you submit the refund request more than 72 hours after purchase. That is why we always recommend requesting the free trial first to confirm compatibility with your device and connection before paying.",
        links: [{ href: "refund/", label: "Subscription cancellation and refund policy" }],
      },
      {
        q: "Will my subscription renew automatically and charge me without asking?",
        a: "No. One-time activation packages are not renewed automatically except at your request, so no amount will ever be charged to your payment method on its own. If a package has recurring renewal, you can request cancellation of auto-renewal at any time at least 48 hours before the next bill is due; cancellation stops future charges only and does not refund the current active period.",
      },
      {
        q: "I was charged twice for the same order by mistake — what should I do?",
        a: "Message technical support on WhatsApp with the transaction number or a screenshot and its date, and we will verify it right away. A duplicate charge for the same order is a guaranteed case in the refund policy: the extra amount is refunded to you in full and immediately once the transaction is verified.",
      },
    ],
  },
  {
    id: "devices",
    title: "Devices & compatibility",
    intro:
      "Smart TVs, phones, streaming sticks and computers: what works with your subscription details, how many devices can play at once, and solutions for older TVs.",
    faqs: [
      {
        q: "Can I use the subscription on more than one device?",
        a: "You can download and install the subscription on all your devices (TV, phone, tablet, laptop), but standard packages play on one device at a time. If you want two devices playing together, ask about the provider packages that support more than one device at the same time.",
      },
      {
        q: "Does activation work on Samsung and LG smart TVs? What do I need?",
        a: "Yes. The subscription data issued by the external provider works on Samsung TVs (Tizen) and LG TVs (webOS) through player apps available in the TV's app store. All you need is a stable internet connection, a player app installed, and then your M3U link or Xtream Codes credentials, which you receive after activation. We have prepared a detailed step-by-step guide, and technical support will help you on WhatsApp if you get stuck at any step.",
        links: [{ href: "blog/iptv-samsung-lg-setup/", label: "Setting up your subscription on Samsung and LG TVs, step by step (Arabic guide)" }],
      },
      {
        q: "Does activation work on iPhone, Android phones and tablets?",
        a: "Yes. You can set up the player on your phone or tablet running iOS or Android using the same subscription data issued by the provider, which is a practical way to try the service first before setting up your TV. Note that standard packages play on one device at a time, so if you want the TV and phone playing simultaneously, ask support about the provider packages that support more than one device.",
      },
      {
        q: "Does activation work on Fire TV Stick, Android TV boxes and computers?",
        a: "Yes. Fire TV Stick, Android TV and Android-based receivers support player apps where you enter the subscription data issued by the provider, and activation also works on computers through desktop players, depending on the app you choose. Streaming sticks are an excellent option if your TV is old, because they give it a modern system that supports players without replacing the TV itself.",
      },
      {
        q: "Do I need a special receiver or a satellite dish to run the package?",
        a: "You do not need any receiver, dish or extra equipment. Playback runs entirely over the internet: a compatible device such as a smart TV, phone or streaming stick, a player app, an internet connection fast enough for the quality you choose, and then the subscription details you receive from the external provider after activation.",
      },
      {
        q: "My TV is old and cannot install apps — is there a way to watch?",
        a: "Yes. The simplest solution is a small external streaming device such as a Fire TV Stick or any Android TV box that connects to your TV's HDMI port and turns it into a smart TV that supports player apps. The alternative is playing on your phone, tablet or computer with the same subscription details. Before buying any package, request the free trial and test it on the device you will actually rely on, to confirm compatibility and performance on your connection speed.",
      },
      {
        q: "Does activation work while travelling or outside my country of residence?",
        a: "The subscription data issued by the external provider works from anywhere with an internet connection, and you can set up the player on your phone or laptop while travelling with the same details. However, some networks or countries impose technical restrictions on certain types of traffic that we cannot control, so if you hit a restriction on your destination network, message technical support and they will guide you to the right settings for your device.",
      },
    ],
  },
  {
    id: "renewal",
    title: "Renewals & switching servers",
    intro:
      "Renewing your package before it expires without interruption, switching between the external providers' servers, and moving your subscription details to a new device.",
    faqs: [
      {
        q: "What is the difference between the Nova, iStar Pro, Moka and X servers?",
        a: "The Nova server is best suited to matches and sports and supports up to 3 devices; the X package is currently presented with specifications and features matching Nova. iStar Pro is balanced for movies, series and family entertainment, while Moka is economical on data usage and works well on limited speeds. Each server's technical specifications are announced by its external provider, while our service covers technical activation and linking, player setup and technical support.",
      },
      {
        q: "How do I renew my activation package before it expires so playback does not stop?",
        a: "The easiest way is to request renewal a day or two before your current term ends: choose the same package and complete your order, or message technical support on WhatsApp with your registered phone number and server name and they will walk you through it. Your account term is extended with the external provider once payment is confirmed — and remember, our packages never renew automatically, so nothing is charged unless you request renewal yourself.",
      },
      {
        q: "Can I upgrade or switch from one server to another, for example from Moka to Nova?",
        a: "Yes. At any time you can buy a technical activation and linking package for the other server, and you will receive independent subscription data issued by that server's external provider. Because each server is run by an independent external provider with separate accounts, message technical support before completing your purchase and they will advise you on how to switch and the best timing based on your current subscription and its remaining term.",
      },
      {
        q: "Can I move my subscription to a new device if I change my TV or phone?",
        a: "Yes. The subscription data issued by the provider is not tied to a specific device: install the player app on your new device, enter the same details, and our team will help you with setup if needed. Just remember that simultaneous playback depends on the number of devices allowed in your package, so stop playback on the old device before starting on the new one if your package covers a single device at a time.",
      },
      {
        q: "My subscription expired a while ago — do I get the same details back or new ones?",
        a: "When you request renewal after expiry, message technical support with your registered phone number; they will check your account status with the external provider and explain, before you complete the order, whether your account term will be extended with the same details or new subscription data will be issued and sent to you via WhatsApp and email. Either way, setting up the player again takes only a few minutes with support's help.",
      },
      {
        q: "Which server suits me best: Nova, iStar Pro, Moka or X?",
        a: "It depends on your usage and connection speed: the external provider of the Nova server announces a focus on matches and sports with support for up to 3 devices; the X package is currently listed with specifications and features matching Nova. iStar Pro's provider announces a balance between sports, movies, series and family entertainment with up to 2 devices; Moka's provider announces economical data usage and good performance on limited speeds with up to 2 devices. Compare the providers' announced specifications, and if you are torn between two servers, request the free trial on the one closest to your needs and decide after seeing the performance on your device and connection.",
        links: [
          { href: "en/nova/", label: "Nova Server — activation & setup package" },
          { href: "en/x/", label: "X Server — activation & setup package" },
          { href: "en/istar/", label: "iStar Pro Server — activation & setup package" },
          { href: "en/moka/", label: "Moka Server — activation & setup package" },
        ],
      },
    ],
  },
];

/** أسئلة مختصرة للرئيسية الإنجليزية — مراجع من الأقسام الكاملة نفسها */
export const EN_HOME_FAQS: FaqItem[] = [
  FAQ_SECTIONS_EN[0].faqs[0],
  FAQ_SECTIONS_EN[0].faqs[3],
  FAQ_SECTIONS_EN[0].faqs[5],
  FAQ_SECTIONS_EN[1].faqs[0],
  FAQ_SECTIONS_EN[2].faqs[1],
  FAQ_SECTIONS_EN[3].faqs[5],
];

/** أسئلة صفحات السيرفرات الإنجليزية — ظاهرة في كل صفحة سيرفر إنجليزية */
export const EN_PLAN_FAQS: FaqItem[] = [
  FAQ_SECTIONS_EN[0].faqs[0],
  FAQ_SECTIONS_EN[0].faqs[3],
  FAQ_SECTIONS_EN[1].faqs[0],
  FAQ_SECTIONS_EN[3].faqs[2],
];

export const TESTIMONIALS = [
  {
    name: "سلطان القحطاني",
    city: "الرياض، السعودية",
    avatar: "🇸🇦",
    rating: 5,
    server: "سيرفر نوفا الأصلي (سنة)",
    review: "تجربة تعامل ممتازة، استلمت بيانات التفعيل من المزود في دقائق، وساعدني فريق الدعم الفني في ضبط التطبيق على الشاشة بخطوات واضحة وأداء مستقر جداً وقت الذروة.",
  },
  {
    name: "محمد العوضي",
    city: "دبي، الإمارات",
    avatar: "🇦🇪",
    rating: 5,
    server: "سيرفر موكا (سنة)",
    review: "جودة العرض 4K لدى المزود ممتازة والتنقل بين القوائم سريع جداً، وميزة دعم أكثر من جهاز في الباقة وفّرت علينا الكثير في البيت مع استجابة فورية من الدعم.",
  },
  {
    name: "د. هاني الشريف",
    city: "القاهرة، مصر",
    avatar: "🇪🇬",
    rating: 5,
    server: "سيرفر إيستار برو (سنة)",
    review: "كنت متردداً في البداية لكن التجربة المجانية قبل الشراء وضّحت لي استقرار السيرفر على جهازي، والتفعيل تم خلال 3 دقائق بالضبط وطريقة الدفع بفودافون كاش كانت سهلة جداً.",
  },
  {
    name: "بدر الشمري",
    city: "الكويت",
    avatar: "🇰🇼",
    rating: 5,
    server: "سيرفر نوفا الأصلي (سنة)",
    review: "للعام الثاني على التوالي أجدد اشتراكي عبر المنصة، مصداقية عالية في إصدار الأكواد ومتابعة مستمرة من الدعم الفني لتشغيل التطبيق بأفضل إعدادات على شاشة سامسونج سمارت.",
  },
];

/* ==========================================================================
   فهرس القنوات المميّزة المعروضة قبل تحميل القائمة
   --------------------------------------------------------------------------
   بيانات وصفية فقط: الاسم والشعار والتصنيف — بلا أي حقل رابط بث.
   لا تُخزَّن روابط .m3u8 أو عناوين سيرفرات بث في الكود المصدري إطلاقاً؛
   القوائم التي يشاهدها المشترك تُجلب من مزوّده داخل مشغّله في متصفحه فقط.
========================================================================== */
export interface ChannelItem {
  name: string;
  logo: string;
  cat: string;
}

export const FEATURED_CHANNELS: ChannelItem[] = [
  // --- باقة قنوات MBC ---
  {
    name: "MBC 1 HD (العامة والمسلسلات)",
    logo: "🟣",
    cat: "قنوات MBC",
  },
  {
    name: "MBC Masr 1 HD (إم بي سي مصر الأولى)",
    logo: "🇪🇬",
    cat: "قنوات MBC",
  },
  {
    name: "MBC Masr 2 HD (مصر 2 والرياضة)",
    logo: "🇪🇬",
    cat: "قنوات MBC",
  },
  {
    name: "MBC Masr Drama HD (دراما مصر)",
    logo: "🎭",
    cat: "قنوات MBC",
  },
  {
    name: "MBC Drama HD (المسلسلات والدراما العربية)",
    logo: "🎭",
    cat: "قنوات MBC",
  },
  {
    name: "MBC 4 HD (البرامج والمنوعات)",
    logo: "📺",
    cat: "قنوات MBC",
  },
  {
    name: "MBC 5 HD (إم بي سي 5 المغرب)",
    logo: "🇲🇦",
    cat: "قنوات MBC",
  },
  {
    name: "MBC Bollywood HD (هندي مدبلج ومترجم)",
    logo: "💃",
    cat: "قنوات MBC",
  },
  {
    name: "MBC Persia HD (أفلام أجنبية وسينما)",
    logo: "🎬",
    cat: "قنوات MBC",
  },
  {
    name: "العربية الحدث HD (أخبار MBC)",
    logo: "⚫",
    cat: "قنوات MBC",
  },
  {
    name: "العربية الإخبارية HD",
    logo: "🔴",
    cat: "قنوات MBC",
  },
  {
    name: "العربية أسواق 💹",
    logo: "💹",
    cat: "قنوات MBC",
  },
  {
    name: "MBC Loud FM",
    logo: "📻",
    cat: "قنوات MBC",
  },

  // --- القنوات الإخبارية والرياضية والعامة ---
  {
    name: "الجزيرة الإخبارية HD",
    logo: "🟡",
    cat: "إخبارية",
  },
  {
    name: "الجزيرة مباشر",
    logo: "🔴",
    cat: "إخبارية",
  },
  {
    name: "العراقية سبورت HD",
    logo: "⚽",
    cat: "رياضية",
  },
  {
    name: "Oman Sport TV",
    logo: "⚽",
    cat: "رياضية",
  },
  {
    name: "France 24 عربي",
    logo: "🔵",
    cat: "إخبارية",
  },
  {
    name: "DW عربي HD",
    logo: "🔷",
    cat: "إخبارية",
  },
  {
    name: "Watan TV وطن مصرية",
    logo: "🇪🇬",
    cat: "مصرية",
  },
  {
    name: "Mekameleen مكملين",
    logo: "📺",
    cat: "مصرية",
  },
  {
    name: "Koogi TV أطفال",
    logo: "🧒",
    cat: "أطفال",
  },
  {
    name: "Qatar Quran القرآن الكريم",
    logo: "🕌",
    cat: "دينية",
  },
  {
    name: "Asharq Discovery وثائقية",
    logo: "🦁",
    cat: "وثائقية",
  },
  {
    name: "Big Buck Bunny 4K Cinema Demo",
    logo: "🐰",
    cat: "أفلام",
  },
];