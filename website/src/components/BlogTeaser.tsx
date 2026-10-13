import { BLOG_POSTS } from "../content/posts";
import { to } from "../config";
import { IconArrowUpRight, IconClock } from "./Icons";
import { Reveal } from "./motion";

/* قسم «دلائل ومقالات» في الصفحة الرئيسية:
   يمنح الزائر محتوى مفيداً ويمنح محركات البحث روابط داخلية لصفحات المدوّنة وصفحة القنوات */
export default function BlogTeaser() {
  return (
    <section className="py-20 md:py-28 bg-white border-y border-black/10">
      <div className="max-w-[1370px] mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal variant="up" className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div className="max-w-xl">
            <p className="text-[12px] font-black tracking-[0.25em] uppercase text-[#2b4eff] mb-4 flex items-center gap-2">
              <span className="w-8 h-[2px] bg-[#2b4eff] inline-block" />
              دلائل ومقالات
            </p>
            <h2 className="font-display font-black tracking-tight leading-[1.15] text-[32px] md:text-[46px]">
              اعرف قبل أن تُشترك{" "}
              <span className="font-serif italic font-normal">وتوفّر وقتك</span>
            </h2>
            <p className="mt-4 text-[15px] text-black/60 font-medium leading-relaxed">
              أدلة عملية مبنية على أسئلة حقيقية من مشتركينا: كيف تختبر السيرفر، وكيف تثبّت
              الاشتراك على شاشتك، وكيف تختار الباقة المناسبة لسرعتك.
            </p>
          </div>
          <a
            href={to("blog/")}
            className="btn-slide slide-royal shrink-0 inline-flex items-center gap-2 bg-[#0b0b0f] text-white font-black text-[14px] px-7 py-3.5 rounded-full"
          >
            كل المقالات <IconArrowUpRight className="w-4 h-4" />
          </a>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-4">
          {BLOG_POSTS.map((post, i) => (
            <Reveal key={post.slug} variant="up" delay={i * 110}>
              <a
                href={to(`blog/${post.slug}/`)}
                className="group block h-full rounded-[24px] border border-black/10 bg-[#faf9f6] p-6 hover:border-black hover:bg-white transition-all duration-300"
              >
                <div className="flex items-center gap-2.5 text-[11.5px] font-black text-black/45">
                  <span className="bg-[#d8ff3e] text-black px-2.5 py-1 rounded-full">
                    {post.category}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <IconClock className="w-3.5 h-3.5" /> {post.readingMinutes} دقائق
                  </span>
                </div>
                <h3 className="mt-4 font-display font-black text-[18px] tracking-tight leading-snug group-hover:text-[#2b4eff] transition">
                  {post.title}
                </h3>
                <p className="mt-2.5 text-[13.5px] text-black/55 leading-relaxed font-medium">
                  {post.description}
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-black text-[#2b4eff]">
                  اقرأ المقال <IconArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
