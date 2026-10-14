import { useState } from "react";
import { IconArrowUpRight, IconPlay } from "./Icons";
import { Reveal } from "./motion";
import { to } from "../config";

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
  category: "الجودة" | "الأجهزة" | "الأمان" | "القانون";
  desc: string;
  img: string;
  img480?: string;
  img768?: string;
  img1280?: string;
  href: string;
}

const ITEMS: ShowcaseItem[] = [
  {
    title: "دقة الصورة: HD وFHD و4K",
    category: "الجودة",
    desc: "متى يظهر فرق الدقة فعلياً، وأيها يناسب حجم شاشتك",
    img: "images/hero/slide-cinema.jpg",
    href: to("blog/video-resolution-hd-fhd-4k/"),
  },
  {
    title: "سرعة الإنترنت للفيديو",
    category: "الجودة",
    desc: "أرقام تقريبية لكل مستوى جودة، وكيف تقيس سرعتك في وقت الذروة",
    img: "images/articles/comparison.webp",
    img480: "images/articles/comparison-480w.webp",
    img768: "images/articles/comparison-768w.webp",
    img1280: "images/articles/comparison-1280w.webp",
    href: to("blog/internet-speed-for-video-streaming/"),
  },
  {
    title: "HDR وعدد الإطارات",
    category: "الجودة",
    desc: "ماذا يغيّران في الصورة، ومتى يكونان مفيدين فعلاً",
    img: "images/hero/slide-sports.jpg",
    href: to("blog/hdr-and-frame-rate-explained/"),
  },
  {
    title: "كيف تعرف دعم التلفاز للتطبيقات",
    category: "الأجهزة",
    desc: "خطوات التحقق من متجر التطبيقات الرسمي لشاشتك",
    img: "images/articles/samsung-tv.webp",
    img480: "images/articles/samsung-tv-480w.webp",
    img768: "images/articles/samsung-tv-768w.webp",
    img1280: "images/articles/samsung-tv-1280w.webp",
    href: "#live-player",
  },
  {
    title: "Android TV وصناديق البث",
    category: "الأجهزة",
    desc: "معايير اختيار جهاز موثوق، وعلامات تحذيرية يجب الانتباه لها",
    img: "images/hero/slide-devices.jpg",
    href: to("blog/android-tv-boxes-buying-guide/"),
  },
  {
    title: "الهاتف والكمبيوتر",
    category: "الأجهزة",
    desc: "إعدادات أساسية لمشاهدة أفضل وبطارية أطول",
    img: "images/articles/support.webp",
    img480: "images/articles/support-480w.webp",
    img768: "images/articles/support-768w.webp",
    img1280: "images/articles/support-1280w.webp",
    href: to("blog/phone-and-computer-viewing-setup/"),
  },
  {
    title: "Apple TV وآبل",
    category: "الأجهزة",
    desc: "متجر التطبيقات الرسمي للجهاز ومواصفاته",
    img: "images/articles/apple-tv.webp",
    img480: "images/articles/apple-tv-480w.webp",
    img768: "images/articles/apple-tv-768w.webp",
    img1280: "images/articles/apple-tv-1280w.webp",
    href: "#live-player",
  },
  {
    title: "علامات الاحتيال في العروض",
    category: "الأمان",
    desc: "كيف تكتشف العروض المجهولة أو المبالغ فيها قبل أي دفع",
    img: "images/articles/security.webp",
    img480: "images/articles/security-480w.webp",
    img768: "images/articles/security-768w.webp",
    img1280: "images/articles/security-1280w.webp",
    href: "#faq",
  },
  {
    title: "حماية الحساب وكلمات المرور",
    category: "الأمان",
    desc: "نصائح عامة لحماية بياناتك على أي خدمة إلكترونية",
    img: "images/articles/security.webp",
    img480: "images/articles/security-480w.webp",
    img768: "images/articles/security-768w.webp",
    img1280: "images/articles/security-1280w.webp",
    href: to("privacy/"),
  },
  {
    title: "التطبيقات غير الموثوقة",
    category: "الأمان",
    desc: "لماذا تشكّل بعض التطبيقات المجهولة خطراً على جهازك وبياناتك",
    img: "images/articles/support.webp",
    href: to("blog/risks-of-unverified-apps/"),
  },
  {
    title: "ما معنى بث محتوى بدون ترخيص؟",
    category: "القانون",
    desc: "شرح مبسّط لحقوق الملكية الفكرية للمحتوى التلفزيوني والرياضي",
    img: "images/articles/best-iptv-2026.webp",
    img480: "images/articles/best-iptv-2026-480w.webp",
    img768: "images/articles/best-iptv-2026-768w.webp",
    img1280: "images/articles/best-iptv-2026-1280w.webp",
    href: to("blog/what-is-unlicensed-streaming/"),
  },
  {
    title: "اقرأ الشروط قبل أي قرار",
    category: "القانون",
    desc: "كيف تفهم شروط الخدمة وسياسة الاسترجاع",
    img: "images/articles/netflix-vs.webp",
    img480: "images/articles/netflix-vs-480w.webp",
    img768: "images/articles/netflix-vs-768w.webp",
    img1280: "images/articles/netflix-vs-1280w.webp",
    href: to("terms/"),
  },
];

const CATEGORIES = ["الكل", "الجودة", "الأجهزة", "الأمان", "القانون"] as const;

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
              <span className="w-8 h-[2px] bg-[#2b4eff] inline-block" /> دليل معلوماتي
            </p>
            <h2 className="font-display font-black tracking-tight leading-[1.15] text-[38px] md:text-[58px]">
              قبل أن تقرر: <span className="font-serif italic font-normal">معلومات</span> تنفعك
            </h2>
            <p className="mt-5 text-black/60 text-[15.5px] md:text-[17px] leading-relaxed font-medium">
              أدلة مبسّطة عن الجودة والأجهزة والأمان والحقوق، لتختار بوعي.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-white border border-black/10 rounded-full px-4 py-2.5 text-[13px] font-bold">
              <IconPlay className="w-3.5 h-3.5 text-[#ff5c4d]" /> معلومات عامة فقط
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
                <span className="absolute top-4 end-4 glass-dark text-white/90 text-[11px] font-bold px-3 py-1.5 rounded-full">
                  {item.category}
                </span>
                {/* تراكب المرور */}
                <div className="absolute inset-x-4 bottom-4 flex gap-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                  <span className="flex-1 bg-white text-black font-black text-[13px] py-3 rounded-full flex items-center justify-center gap-1.5">
                    <IconPlay className="w-3.5 h-3.5" /> اقرأ المزيد
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
            href={to("blog/")}
            className="btn-slide slide-royal inline-flex items-center gap-2 bg-white border-2 border-black font-black text-[15px] px-8 py-4 rounded-full"
          >
            تصفّح كل الأدلة <IconArrowUpRight className="w-4 h-4" />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
