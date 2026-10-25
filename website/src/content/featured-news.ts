/* ==========================================================================
   أخبار مميزة يدوية تظهر في الصفحة الرئيسية (قبل المباريات القادمة)
   --------------------------------------------------------------------------
   كل خبر صفحة داخلية من الموقع (في public/news/…)، ولا تُنسخ هنا عناوين أو
   صور من مواقع أخرى. أضف الخبر الأحدث أولاً.
========================================================================== */

export interface FeaturedNewsItem {
  category: string;
  /** تاريخ الخبر بصيغة عرض جاهزة */
  dateLabel: string;
  title: string;
  description: string;
  /** مسار داخلي بلا بادئة الموقع، يُمرَّر إلى to() */
  href: string;
  /** صور مقصوصة بخلفية شفافة تُعرض أعلى البطاقة (اختياري) */
  images?: { src: string; alt: string }[];
  /** صورة خلفية للبطاقة تعبّر عن المباراة (اختيارية، مسار داخلي) */
  backgroundImage?: string;
  /** لوحة المواجهة: صورة واحدة تجمع لاعبي المباراة مع النتيجة (تُعرض أعلى البطاقة) */
  matchupImage?: string;
  /** شعارا الفريقين (مسارات داخلية) يُعرضان بجانب شعار البطولة */
  teamBadges?: string[];
  /** نتيجة المباراة تُعرض تحت شعارَي الفريقين (اختيارية) */
  score?: string;
  /** شعار البطولة يُعرض كخلفية عميقة خافتة في البطاقة الكبيرة (رابط كامل) */
  backgroundLogo?: string;
  /** بطاقة كبيرة بتصميم الخبر المميز (عرض مزدوج وخلفية وصور) */
  featured?: boolean;
  /** شريحة التذكرة: تعرض الصورة كاملة داخل نصف الشريحة دون قصّ أو تصغير زائد */
  fullImage?: boolean;
}

export const FEATURED_NEWS: FeaturedNewsItem[] = [
  {
    category: "الدوري الإيطالي",
    dateLabel: "25 أكتوبر 2026",
    title: "إنتر يقلب على فيورنتينا 2-1 بهدفين في الوقت بدل الضائع",
    description: "تقدم فيورنتينا بهدف لخيمينيز، ثم عادل ثورام وحسم زيلينسكي بركلة جزاء في سان سيرو.",
    href: "news/inter-fiorentina-2-1/",
    teamBadges: ["images/teams/fiorentina-badge.webp", "images/teams/internazionale-club-badge.webp"],
    score: "2 - 1",
    fullImage: true,
    images: [
      { src: "images/players/ita-lautaro.webp", alt: "لاوتارو مارتينيز" },
    ],
  },
  {
    category: "الدوري الإنجليزي",
    dateLabel: "24 أكتوبر 2026",
    title: "توتنهام يهزم تشيلسي 2-0 بهدف عكسي وهدف لتيل",
    description: "طرد كول بالمر في الدقيقة 80، وتيل يحسم الفوز في ستامفورد بريدج.",
    href: "news/tottenham-chelsea-2-0/",
    teamBadges: ["images/teams/tottenham-badge.webp", "images/teams/chelsea-badge.webp"],
    score: "0 - 2",
    images: [
      { src: "images/players/eng-tel-trio-celebration-v2.webp", alt: "ماتيس تيل ولاعبو توتنهام يحتفلون" },
    ],
    fullImage: true,
  },
  {
    category: "الدوري الإنجليزي",
    dateLabel: "24 أكتوبر 2026",
    title: "أستون فيلا يهزم مانشستر سيتي 2-1 بثنائية جاكسون",
    description: "فوز في فيلا بارك ينهي بداية سيتي المثالية في الدوري، وجاكسون يسجل هدفين.",
    href: "news/man-city-aston-villa/",
    teamBadges: ["images/teams/aston-villa-badge.webp", "images/teams/manchester-city-badge.webp"],
    score: "2 - 1",
    images: [
      { src: "images/players/eng-jackson-celebration.webp", alt: "نيكولاس جاكسون يحتفل" },
    ],
  },
  {
    category: "دوري أبطال أوروبا",
    dateLabel: "21 أكتوبر 2026",
    title: "بايرن ميونخ وأرسنال يتعادلان 2-2 بهدف متأخر لرايس",
    description: "تقدم بايرن بركلة جزاء لكين، ثم عادل رايس قبل النهاية بعشر دقائق.",
    href: "news/bayern-arsenal-2-2/",
    featured: true,
    backgroundLogo: "images/brand/ucl-logo-white.png",
    teamBadges: ["images/teams/bayern-munich-badge.webp", "images/teams/arsenal-badge.webp"],
    score: "2 - 2",
    backgroundImage: "images/news/bayern-arsenal-2-2.jpg",
    images: [
      { src: "images/players/ger-kane.webp", alt: "هاري كين" },
      { src: "images/players/eng-rice.webp", alt: "ديكلان رايس" },
    ],
  },
  {
    category: "دوري أبطال أوروبا",
    dateLabel: "20 أكتوبر 2026",
    title: "باريس سان جيرمان يهزم برشلونة 4-2 ويكسر سجله المثالي",
    description: "ستة أهداف في ملعب الأمير، وأول خسارة لبرشلونة هذا الموسم في أي مسابقة.",
    href: "news/psg-barcelona-4-2/",
    featured: true,
    backgroundLogo: "images/brand/ucl-logo-white.png",
    teamBadges: ["images/teams/paris-saint-germain-badge.webp", "images/teams/barcelona-badge.webp"],
    score: "4 - 2",
    backgroundImage: "images/news/psg-barcelona-4-2.jpg",
    images: [
      { src: "images/players/esp-yamal-sad.webp", alt: "لامين جمال حزيناً" },
      { src: "images/players/esp-flick-angry.webp", alt: "هانز فليك غاضباً" },
      { src: "images/players/fra-dembele-celebration.webp", alt: "عثمان ديمبيلي يحتفل" },
      { src: "images/players/fra-enrique-triumph.png", alt: "لويس إنريكي يحتفل" },
    ],
  },
];
