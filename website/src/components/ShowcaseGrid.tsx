import { useState } from "react";
import { IconArrowUpRight, IconPlay } from "./Icons";
import { Reveal } from "./motion";

/* =========================================================================
   معرض المحتوى — على نمط قسم DEMOS في الأصل:
   حبوب فلترة + شبكة بطاقات صور بتكبير عند المرور وشريط معلومات
========================================================================== */

/* نسخة AVIF من نفس الصورة — الملفات موجودة بنفس الأسماء مع امتداد .avif */
function toAvif(path: string): string {
  return path.replace(/\.webp$/i, ".avif");
}

interface ShowcaseItem {
  title: string;
  category: "رياضة" | "سينما" | "أجهزة" | "سيرفرات";
  desc: string;
  img: string;
  img480?: string;
  img768?: string;
  img1280?: string;
  href: string;
  badge?: string;
}

const ITEMS: ShowcaseItem[] = [
  {
    title: "كأس العالم 2026",
    category: "رياضة",
    desc: "تغطية شاملة لكل المباريات بجودة 4K",
    img: "images/articles/world-cup.webp",
    img480: "images/articles/world-cup-480w.webp",
    img768: "images/articles/world-cup-768w.webp",
    img1280: "images/articles/world-cup-1280w.webp",
    href: "#live-player",
    badge: "الأبرز",
  },
  {
    title: "beIN Sports بث مباشر",
    category: "رياضة",
    desc: "قنوات beIN 1-9 وSSC بدقة 4K و50fps",
    img: "images/hero/slide-sports.jpg",
    href: "#live-player",
  },
  {
    title: "مكتبة نتفليكس وشاهد",
    category: "سينما",
    desc: "أحدث الأفلام والمسلسلات مترجمة فوراً",
    img: "images/articles/netflix-vs.webp",
    img480: "images/articles/netflix-vs-480w.webp",
    img768: "images/articles/netflix-vs-768w.webp",
    img1280: "images/articles/netflix-vs-1280w.webp",
    href: "#channels",
  },
  {
    title: "سينما 4K على الطلب",
    category: "سينما",
    desc: "VOD ضخم يتجدد يومياً بجودة True 4K",
    img: "images/hero/slide-cinema.jpg",
    href: "#channels",
    badge: "جديد",
  },
  {
    title: "شاشات Smart TV",
    category: "أجهزة",
    desc: "سامسونج وLG بتطبيق مباشر من المتجر",
    img: "images/articles/samsung-tv.webp",
    img480: "images/articles/samsung-tv-480w.webp",
    img768: "images/articles/samsung-tv-768w.webp",
    img1280: "images/articles/samsung-tv-1280w.webp",
    href: "#setup",
  },
  {
    title: "Apple TV وآبل",
    category: "أجهزة",
    desc: "S-Player وIPTVX بواجهة فائقة السلاسة",
    img: "images/articles/apple-tv.webp",
    img480: "images/articles/apple-tv-480w.webp",
    img768: "images/articles/apple-tv-768w.webp",
    img1280: "images/articles/apple-tv-1280w.webp",
    href: "#setup",
  },
  {
    title: "يعمل على كل الشاشات",
    category: "أجهزة",
    desc: "أندرويد، آبل، كمبيوتر — تفعيل في 5 دقائق",
    img: "images/hero/slide-devices.jpg",
    href: "#setup",
  },
  {
    title: "أفضل سيرفر IPTV 2026",
    category: "سيرفرات",
    desc: "نوفا الأعلى ثباتاً وقت المباريات",
    img: "images/articles/best-iptv-2026.webp",
    img480: "images/articles/best-iptv-2026-480w.webp",
    img768: "images/articles/best-iptv-2026-768w.webp",
    img1280: "images/articles/best-iptv-2026-1280w.webp",
    href: "#pricing",
    badge: "الأكثر طلباً",
  },
  {
    title: "مقارنة السيرفرات",
    category: "سيرفرات",
    desc: "نوفا × الترا × إيستار × موكا",
    img: "images/articles/comparison.webp",
    img480: "images/articles/comparison-480w.webp",
    img768: "images/articles/comparison-768w.webp",
    img1280: "images/articles/comparison-1280w.webp",
    href: "#servers-compare",
  },
  {
    title: "الحماية والثبات 99.9%",
    category: "سيرفرات",
    desc: "تقنية Anti-Freeze وشبكة CDN موزعة",
    img: "images/articles/security.webp",
    img480: "images/articles/security-480w.webp",
    img768: "images/articles/security-768w.webp",
    img1280: "images/articles/security-1280w.webp",
    href: "#servers-compare",
  },
  {
    title: "دعم فني 24/7",
    category: "سيرفرات",
    desc: "متوسط الرد أقل من 3 دقائق عبر واتساب",
    img: "images/articles/support.webp",
    img480: "images/articles/support-480w.webp",
    img768: "images/articles/support-768w.webp",
    img1280: "images/articles/support-1280w.webp",
    href: "#faq",
  },
];

const CATEGORIES = ["الكل", "رياضة", "سينما", "أجهزة", "سيرفرات"] as const;

const BADGE_STYLES: Record<string, string> = {
  "الأبرز": "bg-[#d8ff3e] text-black",
  "جديد": "bg-[#0b0b0f] text-[#d8ff3e]",
  "الأكثر طلباً": "bg-[#ff5c4d] text-white",
};

export default function ShowcaseGrid() {
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("الكل");
  const filtered = cat === "الكل" ? ITEMS : ITEMS.filter((i) => i.category === cat);

  return (
    <section id="showcase" className="py-20 md:py-28 bg-[#faf9f6] relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-5">
        {/* الترويسة */}
        <Reveal variant="up" className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-10">
          <div className="max-w-2xl">
            <p className="text-[12px] font-black tracking-[0.25em] uppercase text-[#2b4eff] mb-4 flex items-center gap-2">
              <span className="w-8 h-[2px] bg-[#2b4eff] inline-block" /> لقطات من داخل الاشتراك
            </p>
            <h2 className="font-display font-black tracking-tight leading-[1.15] text-[38px] md:text-[58px]">
              ابدأ من <span className="font-serif italic font-normal">شيء</span> يعجبك
            </h2>
            <p className="mt-5 text-black/60 text-[15.5px] md:text-[17px] leading-relaxed font-medium">
              رياضة كان أو سينما — تصفح ما ينتظرك داخل الاشتراك وجرّب الجودة بنفسك قبل الشراء.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-white border border-black/10 rounded-full px-4 py-2.5 text-[13px] font-bold">
              <IconPlay className="w-3.5 h-3.5 text-[#ff5c4d]" /> بث حي مجاني
            </div>
          </div>
        </Reveal>

        {/* حبوب الفلترة */}
        <Reveal variant="up" delay={100}>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-8">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`shrink-0 px-5 py-2.5 rounded-full text-[13.5px] font-black transition-all border cursor-pointer ${
                  cat === c
                    ? "bg-[#0b0b0f] text-white border-[#0b0b0f]"
                    : "bg-white text-black/60 border-black/10 hover:border-black hover:text-black"
                }`}
              >
                {c}
              </button>
            ))}
            <div className="shrink-0 ms-auto hidden md:flex items-center text-[12.5px] font-bold text-black/40">
              عرض {filtered.length} من {ITEMS.length}
            </div>
          </div>
        </Reveal>

        {/* الشبكة */}
        <div key={cat} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item, i) => (
            <a
              key={item.title}
              href={item.href}
              style={{ animationDelay: `${(i % 6) * 70}ms` }}
              className="animate-fade-up group relative rounded-[22px] overflow-hidden bg-white border border-black/10 hover:border-black/30 hover:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.3)] transition-all duration-500"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-[#efeee9]">
                <picture className="block w-full h-full">
                  {/* AVIF أولاً (أصغر حجماً بفارق كبير) ثم WebP كبديل */}
                  {item.img480 && item.img768 && item.img1280 && (
                    <source
                      type="image/avif"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      srcSet={`${toAvif(item.img480)} 480w, ${toAvif(item.img768)} 768w, ${toAvif(item.img1280)} 1280w`}
                    />
                  )}
                  <img
                    src={item.img}
                    srcSet={
                      item.img480 && item.img768 && item.img1280
                        ? `${item.img480} 480w, ${item.img768} 768w, ${item.img1280} 1280w`
                        : undefined
                    }
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1.2s] ease-out"
                  />
                </picture>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                {item.badge && (
                  <span
                    className={`absolute top-4 start-4 text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full ${BADGE_STYLES[item.badge]}`}
                  >
                    {item.badge}
                  </span>
                )}
                <span className="absolute top-4 end-4 glass-dark text-white/90 text-[11px] font-bold px-3 py-1.5 rounded-full">
                  {item.category}
                </span>
                {/* تراكب المرور */}
                <div className="absolute inset-x-4 bottom-4 flex gap-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                  <span className="flex-1 bg-white text-black font-black text-[13px] py-3 rounded-full flex items-center justify-center gap-1.5">
                    <IconPlay className="w-3.5 h-3.5" /> شاهد الآن
                  </span>
                  <span className="w-12 h-12 bg-[#d8ff3e] rounded-full grid place-items-center shrink-0">
                    <IconArrowUpRight className="w-[18px] h-[18px]" />
                  </span>
                </div>
              </div>
              <div className="p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-black text-[18px] tracking-tight leading-none">
                    {item.title}
                  </h3>
                  <p className="text-[12.5px] text-black/50 font-bold mt-1.5">{item.desc}</p>
                </div>
                <span className="w-10 h-10 rounded-full border border-black/10 grid place-items-center group-hover:bg-black group-hover:text-white group-hover:border-black transition-all shrink-0">
                  <IconArrowUpRight className="w-4 h-4" />
                </span>
              </div>
            </a>
          ))}
        </div>

        {/* زر عرض الكل */}
        <Reveal variant="up" delay={150} className="mt-10 text-center">
          <a
            href="#pricing"
            className="btn-slide slide-royal inline-flex items-center gap-2 bg-white border-2 border-black font-black text-[15px] px-8 py-4 rounded-full"
          >
            اطّلع على الباقات — من 25 دولار / سنة <IconArrowUpRight className="w-4 h-4" />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
