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

export interface PricingPlan {
  id: string;
  serverName: string;
  serverCode: "nova" | "istar" | "moka" | "ultra";
  tag: string;
  isPopular?: boolean;
  isVip?: boolean;
  description: string;
  prices: {
    "3": { SAR: number; EGP: number; AED: number; KWD: number; USD: number; oldSar?: number };
    "6": { SAR: number; EGP: number; AED: number; KWD: number; USD: number; oldSar?: number };
    "12": { SAR: number; EGP: number; AED: number; KWD: number; USD: number; oldSar?: number };
    "24": { SAR: number; EGP: number; AED: number; KWD: number; USD: number; oldSar?: number };
  };
  features: string[];
  channelsCount: string;
  vodCount: string;
  quality: string;
  antiFreeze: string;
  devices: string;
}

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
  },
];

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
    q: "ما الفرق بين سيرفر نوفا وإيستار وموكا وماستر الترا؟",
    a: "سيرفر نوفا هو الأفضل على الإطلاق للمباريات والرياضة، سيرفر إيستار ممتاز للأفلام والمسلسلات والترفيه، سيرفر موكا اقتصادي جداً ويعمل على النت الضعيف، وسيرفر ماستر الترا VIP هو الأقوى ويدعم شاشتين بدقة 4K حقيقية.",
  },
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
   القنوات المميّزة المعروضة قبل تحميل الملف الكامل
   (كانت داخل LivePlayer — نُقلت هنا لأن صفحة /channels تحتاجها وقت البناء أيضاً)
========================================================================== */
export interface ChannelItem {
  name: string;
  logo: string;
  url: string;
  cat: string;
}

export const FEATURED_CHANNELS: ChannelItem[] = [
  // --- باقة قنوات MBC المؤكدة والمفحوصة بنجاح 100% ---
  {
    name: "MBC 1 HD (العامة والمسلسلات)",
    logo: "🟣",
    url: "https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-1/15cf99af5de54063fdabfefe66adc075/index.m3u8",
    cat: "قنوات MBC",
  },
  {
    name: "MBC Masr 1 HD (إم بي سي مصر الأولى)",
    logo: "🇪🇬",
    url: "https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-masr/956eac069c78a35d47245db6cdbb1575/index.m3u8",
    cat: "قنوات MBC",
  },
  {
    name: "MBC Masr 2 HD (مصر 2 والرياضة)",
    logo: "🇪🇬",
    url: "https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-masr-2/754931856515075b0aabf0e583495c68/index.m3u8",
    cat: "قنوات MBC",
  },
  {
    name: "MBC Masr Drama HD (دراما مصر)",
    logo: "🎭",
    url: "https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-masr-drama/567b703c19ede6598222de81b0e4508b/index.m3u8",
    cat: "قنوات MBC",
  },
  {
    name: "MBC Drama HD (المسلسلات والدراما العربية)",
    logo: "🎭",
    url: "https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-drama/2c28a458e2f3253e678b07ac7d13fe71/index.m3u8",
    cat: "قنوات MBC",
  },
  {
    name: "MBC 4 HD (البرامج والمنوعات)",
    logo: "📺",
    url: "https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-4/24f134f1cd63db9346439e96b86ca6ed/index.m3u8",
    cat: "قنوات MBC",
  },
  {
    name: "MBC 5 HD (إم بي سي 5 المغرب)",
    logo: "🇲🇦",
    url: "https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-5/ee6b000cee0629411b666ab26cb13e9b/index.m3u8",
    cat: "قنوات MBC",
  },
  {
    name: "MBC Bollywood HD (هندي مدبلج ومترجم)",
    logo: "💃",
    url: "https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-bollywood/546eb40d7dcf9a209255dd2496903764/index.m3u8",
    cat: "قنوات MBC",
  },
  {
    name: "MBC Persia HD (أفلام أجنبية وسينما)",
    logo: "🎬",
    url: "https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-persia/818ee8e4b592dc497608f066d825bfb4/index.m3u8",
    cat: "قنوات MBC",
  },
  {
    name: "العربية الحدث HD (أخبار MBC)",
    logo: "⚫",
    url: "https://live.alarabiya.net/alarabiapublish/alhadath.smil/playlist.m3u8",
    cat: "قنوات MBC",
  },
  {
    name: "العربية الإخبارية HD",
    logo: "🔴",
    url: "https://live.alarabiya.net/alarabiapublish/alarabiya.smil/playlist.m3u8",
    cat: "قنوات MBC",
  },
  {
    name: "العربية أسواق 💹",
    logo: "💹",
    url: "https://live.alarabiya.net/alarabiapublish/aswaaq.smil/playlist.m3u8",
    cat: "قنوات MBC",
  },
  {
    name: "MBC Loud FM",
    logo: "📻",
    url: "https://radio-loud-fm.mbc.net/radio-loud-fm_1.m3u8",
    cat: "قنوات MBC",
  },

  // --- القنوات الإخبارية والرياضية والعامة ---
  {
    name: "الجزيرة الإخبارية HD",
    logo: "🟡",
    url: "https://live-hls-web-aja.getaj.net/AJA/index.m3u8",
    cat: "إخبارية",
  },
  {
    name: "الجزيرة مباشر",
    logo: "🔴",
    url: "https://live-hls-web-ajm.getaj.net/AJM/index.m3u8",
    cat: "إخبارية",
  },
  {
    name: "العراقية سبورت HD",
    logo: "⚽",
    url: "https://imn-live.esite-lab.com/hls/iraqia-sports-1.m3u8",
    cat: "رياضية",
  },
  {
    name: "Oman Sport TV",
    logo: "⚽",
    url: "https://partneta.cdn.mgmlcdn.com/omsport/smil:omsport.stream.smil/chunklist.m3u8",
    cat: "رياضية",
  },
  {
    name: "France 24 عربي",
    logo: "🔵",
    url: "https://static.france24.com/live/F24_AR_HI_HLS/live_web.m3u8",
    cat: "إخبارية",
  },
  {
    name: "DW عربي HD",
    logo: "🔷",
    url: "https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8",
    cat: "إخبارية",
  },
  {
    name: "Watan TV وطن مصرية",
    logo: "🇪🇬",
    url: "https://rp.tactivemedia.com/watantv_source/live/playlist.m3u8",
    cat: "مصرية",
  },
  {
    name: "Mekameleen مكملين",
    logo: "📺",
    url: "https://mn-nl.mncdn.com/mekameleen/smil:mekameleentv.smil/playlist.m3u8",
    cat: "مصرية",
  },
  {
    name: "Koogi TV أطفال",
    logo: "🧒",
    url: "https://5d658d7e9f562.streamlock.net/koogi.tv/koogi.smil/playlist.m3u8",
    cat: "أطفال",
  },
  {
    name: "Qatar Quran القرآن الكريم",
    logo: "🕌",
    url: "https://qatartv.akamaized.net/hls/live/20000612/qtvquran/master1080p.m3u8",
    cat: "دينية",
  },
  {
    name: "Asharq Discovery وثائقية",
    logo: "🦁",
    url: "https://svs.itworkscdn.net/asharqdiscoverylive/asharqd.smil/playlist_dvr.m3u8",
    cat: "وثائقية",
  },
  {
    name: "Big Buck Bunny 4K Cinema Demo",
    logo: "🐰",
    url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    cat: "أفلام",
  },
];