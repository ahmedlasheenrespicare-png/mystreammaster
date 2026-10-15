import { getDestinationUrl } from "../lib/affiliate";
import { to } from "../config";
import { CHANNEL_CATEGORY_PAGES, type ChannelCategoryPage as Category } from "../content/channel-categories";

export default function ChannelCategoryPage({ category }: { category: Category }) {
  return (
    <div className="bg-[#faf9f6] pt-[150px] md:pt-[168px] pb-20">
      <div className="max-w-[1370px] mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="text-[12.5px] font-bold text-black/40 mb-5" aria-label="مسار التصفح">
          <a href={to("")} className="hover:text-black transition">الرئيسية</a>
          <span className="mx-2" aria-hidden="true">/</span>
          <a href={to("channels/")} className="hover:text-black transition">القنوات</a>
          <span className="mx-2" aria-hidden="true">/</span>
          <span className="text-black/70">{category.label}</span>
        </nav>

        <header className="max-w-[850px]">
          <p className="text-[12px] font-black tracking-[0.2em] text-[#2b4eff] mb-4 flex items-center gap-2">
            <span aria-hidden="true">{category.icon}</span>
            دليل المشاهدة الرسمية · {category.sourceCategory}
          </p>
          <h1 className="font-display font-black tracking-tight leading-[1.15] text-[34px] md:text-[52px]">
            {category.h1}
          </h1>
          <div className="mt-4 space-y-3 text-[15px] md:text-[16.5px] text-black/60 font-medium leading-relaxed">
            {category.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </header>

        <section className="mt-7 rounded-2xl border border-[#2b4eff]/15 bg-white p-5 sm:p-6" aria-labelledby={`category-guidance-${category.slug}`}>
          <h2 id={`category-guidance-${category.slug}`} className="font-display font-black text-[18px] md:text-[21px]">
            {category.guidanceTitle}
          </h2>
          <ul className="mt-3 grid grid-cols-1 gap-2 text-[13px] leading-relaxed text-black/60 md:grid-cols-3">
            {category.guidance.map((tip) => (
              <li key={tip} className="rounded-xl bg-[#faf9f6] p-4">{tip}</li>
            ))}
          </ul>
        </section>

        <section className="mt-9" aria-labelledby="official-destinations-heading">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-black/10 pb-4">
            <div>
              <p className="text-[11px] font-black tracking-[0.18em] text-black/40">قائمة الجهات</p>
              <h2 id="official-destinations-heading" className="mt-1 font-display font-black text-[22px] md:text-[28px]">
                {category.label} في دليل المشاهدة الرسمية
              </h2>
            </div>
            <p className="text-[13px] font-bold text-black/50">
              {category.items.length.toLocaleString("ar-EG")} جهة مدرجة
            </p>
          </div>

          <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {category.items.map((item) => (
              <li key={item.name} className="flex min-w-0 flex-col rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-[#f4f3ef] text-[15px] font-black">
                    {item.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-black text-[17px] leading-snug">{item.name}</h3>
                    <p className="mt-1 text-[12px] font-bold text-black/45" dir="auto">{item.english}</p>
                  </div>
                </div>

                <p className="mt-4 flex-1 text-[13px] leading-relaxed text-black/60">{item.description}</p>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/5 pt-3">
                  <span className="text-[11px] font-bold text-black/45">
                    {item.cat} · {item.paid ? "خدمة مدفوعة" : item.destination}
                  </span>
                  <a
                    href={getDestinationUrl(item.url, "watch-guide")}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`انتقل إلى الموقع الرسمي: ${item.name} (يفتح في تبويب جديد)`}
                    className="inline-flex min-h-10 items-center gap-1 rounded-full bg-[#0b0b0f] px-4 py-2 text-[12px] font-black text-white transition hover:bg-[#2b4eff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b4eff]"
                  >
                    الموقع الرسمي <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <aside className="mt-9 rounded-2xl border border-black/10 bg-white p-5 text-[13px] leading-relaxed text-black/55" aria-label="تنبيه عن دليل الروابط">
          <strong className="text-black">دليل روابط فقط:</strong>{" "}
          الأسماء والروابط للتعريف بالجهات ومواقعها الرسمية. لا يستضيف الموقع محتوى هذه الجهات ولا يبثّه أو يعيد بثّه، ولا يدل الإدراج على شراكة معها. راجع الجهة نفسها لمعرفة الحقوق والشروط والتوفر في منطقتك.
        </aside>

        <nav className="mt-9" aria-label="تصنيفات دليل المشاهدة الرسمية">
          <h2 className="font-display font-black text-[19px]">تصفّح تصنيفات أخرى</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {CHANNEL_CATEGORY_PAGES.map((item) => (
              <li key={item.slug}>
                <a
                  href={to(`channels/${item.slug}/`)}
                  aria-current={item.slug === category.slug ? "page" : undefined}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-[12px] font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b4eff] ${item.slug === category.slug ? "border-[#0b0b0f] bg-[#0b0b0f] text-white" : "border-black/10 bg-white text-black/60 hover:border-black hover:text-black"}`}
                >
                  <span aria-hidden="true">{item.icon}</span>{item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
