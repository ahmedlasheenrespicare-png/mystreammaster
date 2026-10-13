import type { BlogPost } from "../content/posts";
import { getWhatsAppUrl, PRICING_PLANS } from "../data";
import { to } from "../config";
import { IconArrowUpRight, IconChat, IconClock } from "../components/Icons";

/* صفحة مقال — يُرسم نصها بالكامل وقت البناء ليقرأها محرك البحث كما يراها الزائر */
export default function BlogPostPage({ post }: { post: BlogPost }) {
  const plan = post.relatedPlan
    ? PRICING_PLANS.find((p) => p.serverCode === post.relatedPlan)
    : undefined;

  return (
    <div className="bg-[#faf9f6] pt-[150px] md:pt-[168px] pb-20">
      <div className="max-w-[820px] mx-auto px-5">
        <nav className="text-[12.5px] font-bold text-black/40 mb-5" aria-label="مسار التصفح">
          <a href={to("")} className="hover:text-black transition">الرئيسية</a>
          <span className="mx-2">/</span>
          <a href={to("blog/")} className="hover:text-black transition">المدوّنة</a>
          <span className="mx-2">/</span>
          <span className="text-black/70">{post.category}</span>
        </nav>

        <article>
          <header>
            <div className="flex items-center gap-3 text-[11.5px] font-black text-black/45">
              <span className="bg-[#d8ff3e] text-black px-2.5 py-1 rounded-full">{post.category}</span>
              <span className="inline-flex items-center gap-1">
                <IconClock className="w-3.5 h-3.5" /> {post.readingMinutes} دقائق قراءة
              </span>
              <time dateTime={post.date} className="font-latin">{post.date}</time>
            </div>
            <h1 className="mt-4 font-display font-black tracking-tight leading-[1.2] text-[32px] md:text-[44px]">
              {post.title}
            </h1>
            <p className="mt-4 text-[15.5px] md:text-[17px] text-black/60 font-medium leading-[1.9]">
              {post.intro}
            </p>
          </header>

          <div className="mt-10 space-y-9">
            {post.sections.map((s, i) => (
              <section key={i}>
                {s.heading && (
                  <h2 className="font-display font-black text-[22px] md:text-[26px] tracking-tight leading-snug">
                    {s.heading}
                  </h2>
                )}

                {s.paragraphs?.map((p, j) => (
                  <p key={j} className="mt-3.5 text-[15px] leading-[2] text-black/70">
                    {p}
                  </p>
                ))}

                {s.note && (
                  <p className="mt-4 rounded-2xl border border-[#2b4eff]/25 bg-[#2b4eff]/[0.06] px-5 py-4 text-[14px] font-bold leading-[1.9] text-[#1e3bbf]">
                    ملاحظة عملية: {s.note}
                  </p>
                )}

                {s.bullets && (
                  <ul className="mt-4 space-y-2.5">
                    {s.bullets.map((b, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-[14.5px] leading-[1.9] text-black/70">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#0b0b0f] shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {s.steps && (
                  <ol className="mt-4 space-y-2.5">
                    {s.steps.map((st, j) => (
                      <li key={j} className="flex items-start gap-3 text-[14.5px] leading-[1.9] text-black/70">
                        <span className="mt-0.5 w-6 h-6 shrink-0 rounded-full bg-[#0b0b0f] text-[#d8ff3e] grid place-items-center text-[12px] font-black font-latin">
                          {j + 1}
                        </span>
                        <span>{st}</span>
                      </li>
                    ))}
                  </ol>
                )}

                {s.table && (
                  <div className="mt-5 overflow-x-auto rounded-2xl border border-black/10 bg-white">
                    <table className="w-full text-right border-collapse min-w-[560px]">
                      <thead>
                        <tr className="bg-[#0b0b0f] text-white">
                          {s.table.head.map((h) => (
                            <th key={h} className="p-4 text-[13px] font-black">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.07]">
                        {s.table.rows.map((row, r) => (
                          <tr key={r} className="hover:bg-[#d8ff3e]/[0.12] transition-colors">
                            {row.map((cell, c) => (
                              <td
                                key={c}
                                className={`p-4 text-[13px] ${c === 0 ? "font-black bg-[#f4f3ef]" : "font-medium text-black/70"}`}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}
          </div>

          {/* أسئلة المقال */}
          {post.faq && post.faq.length > 0 && (
            <section className="mt-12">
              <h2 className="font-display font-black text-[24px] tracking-tight">أسئلة شائعة حول الموضوع</h2>
              <div className="mt-5 space-y-3">
                {post.faq.map((f) => (
                  <details key={f.q} className="group rounded-2xl border border-black/10 bg-white p-5">
                    <summary className="cursor-pointer list-none font-black text-[15px] flex items-center justify-between gap-3">
                      {f.q}
                      <span className="text-[#2b4eff] transition group-open:rotate-45">＋</span>
                    </summary>
                    <p className="mt-3 text-[14px] leading-[1.95] text-black/65">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          )}
        </article>

        {/* صندوق تحويل */}
        <aside className="mt-12 rounded-[28px] bg-[#0b0b0f] text-white p-7 sm:p-9 grain relative overflow-hidden">
          <div className="absolute -top-24 -end-24 w-[300px] h-[300px] bg-[#2b4eff]/40 blur-[110px] rounded-full" />
          <div className="relative">
            <h2 className="font-display font-black text-[22px] md:text-[28px] tracking-tight leading-snug">
              {plan ? `جاهز لتجربة ${plan.serverName.split("(")[0].trim()}؟` : "جاهز لتجربة السيرفر على جهازك؟"}
            </h2>
            <p className="mt-3 text-white/60 text-[14.5px] font-medium leading-relaxed max-w-[560px]">
              اطلب تجربة مجانية وشاهد القنوات الرياضية والترفيهية بجودة السيرفر الحقيقية قبل أن تدفع —
              التفعيل فوري خلال دقائق.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={getWhatsAppUrl(`مرحبًا، قرأت مقال «${post.title}» وأريد تجربة مجانية`)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-slide slide-white inline-flex items-center gap-2 bg-[#d8ff3e] text-black font-black text-[14.5px] px-7 py-3.5 rounded-full"
              >
                <IconChat className="w-4 h-4" /> اطلب تجربة مجانية
              </a>
              <a
                href={to(plan ? `${plan.serverCode}/` : "#pricing")}
                className="inline-flex items-center gap-2 border border-white/25 font-black text-[14.5px] px-7 py-3.5 rounded-full hover:bg-white hover:text-black transition"
              >
                {plan ? `تفاصيل ${plan.serverName.split("(")[0].trim()}` : "تصفّح الباقات"}
                <IconArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </aside>

        {/* التنقّل بين المقالات */}
        <nav className="mt-10 flex items-center justify-between gap-4 text-[13.5px] font-black">
          <a href={to("blog/")} className="text-[#2b4eff] hover:underline underline-offset-4">
            ← كل المقالات
          </a>
          <a href={to("channels/")} className="text-[#2b4eff] hover:underline underline-offset-4">
            تصفّح قائمة القنوات →
          </a>
        </nav>
      </div>
    </div>
  );
}
