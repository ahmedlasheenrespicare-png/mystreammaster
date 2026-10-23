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
  /** بطاقة كبيرة بتصميم الخبر المميز (عرض مزدوج وخلفية وصور) */
  featured?: boolean;
}

export const FEATURED_NEWS: FeaturedNewsItem[] = [
  {
    category: "دوري أبطال أوروبا",
    dateLabel: "21 أكتوبر 2026",
    title: "بايرن ميونخ وأرسنال يتعادلان 2-2 بهدف متأخر لرايس",
    description: "تقدم بايرن بركلة جزاء لكين، ثم عادل رايس قبل النهاية بعشر دقائق.",
    href: "news/bayern-arsenal-2-2/",
    featured: true,
    backgroundImage: "images/news/bayern-arsenal-2-2.jpg",
    matchupImage: "images/news/bayern-arsenal-2-2-match.jpg",
  },
  {
    category: "دوري أبطال أوروبا",
    dateLabel: "20 أكتوبر 2026",
    title: "باريس سان جيرمان يهزم برشلونة 4-2 ويكسر سجله المثالي",
    description: "ستة أهداف في ملعب الأمير، وأول خسارة لبرشلونة هذا الموسم في أي مسابقة.",
    href: "news/psg-barcelona-4-2/",
    featured: true,
    backgroundImage: "images/news/psg-barcelona-4-2.jpg",
    images: [
      { src: "images/players/fra-dembele-celebration.webp", alt: "عثمان ديمبيلي يحتفل" },
    ],
  },
];
