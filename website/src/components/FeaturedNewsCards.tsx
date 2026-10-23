import { FEATURED_NEWS } from "../content/featured-news";
import { to } from "../config";
import { IconArrowUpRight, IconClock } from "./Icons";
import { Reveal } from "./motion";

/* =========================================================================
   «أخبار مميزة» — بطاقات روابط داخلية في الصفحة الرئيسية
   -------------------------------------------------------------------------
   • المحتوى من content/featured-news.ts (داخلي فقط، بلا صور خارجية).
   • البطاقة الأولى أوسع لتكون الواجهة الرئيسية للقسم.
   • تُرسم وقت البناء فتظهر كل البطاقات في HTML لمحركات البحث.
========================================================================= */
export default function FeaturedNewsCards() {
  return (
    <section
      id="featured-news"
      className="py-20 md:py-28 bg-[#faf9f6] border-b border-black/10"
      aria-labelledby="featured-news-title"
    >
      <div className="max-w-[1370px] mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal variant="up" className="mb-10 max-w-2xl">
          <p className="text-[12px] font-black tracking-[0.25em] uppercase text-[#2b4eff] mb-4 flex items-center gap-2">
            <span className="w-8 h-[2px] bg-[#2b4eff] inline-block" />
            أخبار مميزة
          </p>
          <h2
            id="featured-news-title"
            className="font-display font-black tracking-tight leading-[1.15] text-[32px] md:text-[46px]"
          >
            ابدأ من أهم الأدلة والمستجدات
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURED_NEWS.map((item, i) => (
            <Reveal
              key={item.href}
              variant="up"
              delay={i * 90}
              className={i === 0 ? "md:col-span-2 lg:col-span-2" : ""}
            >
              <a
                href={to(item.href)}
                className={`group flex h-full flex-col rounded-[24px] border border-black/10 p-6 transition-all duration-300 hover:border-black ${
                  i === 0
                    ? "bg-gradient-to-br from-[#2b4eff] to-[#7c5cff] text-white"
                    : "bg-white hover:bg-[#fffdf5]"
                }`}
              >
                <div
                  className={`flex items-center gap-2.5 text-[11.5px] font-black ${
                    i === 0 ? "text-white/75" : "text-black/45"
                  }`}
                >
                  <span
                    className="bg-[#d8ff3e] text-black px-2.5 py-1 rounded-full"
                  >
                    {item.category}
                  </span>
                  {item.readingMinutes ? (
                    <span className="inline-flex items-center gap-1">
                      <IconClock className="w-3.5 h-3.5" /> {item.readingMinutes} دقائق
                    </span>
                  ) : null}
                </div>
                <h3
                  className={`mt-4 font-display font-black leading-snug tracking-tight transition ${
                    i === 0 ? "text-[26px] md:text-[32px]" : "text-[18px]"
                  } ${i === 0 ? "" : "group-hover:text-[#2b4eff]"}`}
                >
                  {item.title}
                </h3>
                <p
                  className={`mt-2.5 text-[13.5px] leading-relaxed font-medium ${
                    i === 0 ? "text-white/80" : "text-black/55"
                  }`}
                >
                  {item.description}
                </p>
                <span
                  className={`mt-auto pt-5 inline-flex items-center gap-1.5 text-[13px] font-black ${
                    i === 0 ? "text-white" : "text-[#2b4eff]"
                  }`}
                >
                  اقرأ المزيد <IconArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
