import type { BlogPost } from "../content/posts";
import { AVAILABLE_DURATIONS, getWhatsAppUrl, PRICING_PLANS } from "../data";
import {
  EGYPT_PRICING,
  EGYPT_PRICING_UPDATED,
  EGYPT_TERMS,
  formatEgp,
  hasEgyptPricing,
  monthlyEquivalent,
} from "../content/egypt-pricing";
import type { DeckPrice } from "../components/ServerDeck";
import { to } from "../config";
import { ServerLink } from "../components/ServerIcon";
import ServerDeck from "../components/ServerDeck";
import { IconArrowUpRight, IconChat, IconClock } from "../components/Icons";

/* صفحة مقال — يُرسم نصها بالكامل وقت البناء ليقرأها محرك البحث كما يراها الزائر */
export default function BlogPostPage({ post }: { post: BlogPost }) {
  const plan = post.relatedPlan
    ? PRICING_PLANS.find((p) => p.serverCode === post.relatedPlan)
    : undefined;
  const duration = AVAILABLE_DURATIONS[0];
  const durationLabel = duration === "12" ? "12 شهراً" : `${duration} أشهر`;
  /* أقسام مرتبطة ببيانات لم تصل بعد لا تُرسم (ولا يظهر عنوانها فارغاً) */
  const sections = post.sections.filter((s) => !(s.egyptPricing && !hasEgyptPricing()));
  const toc = sections.filter((s) => Boolean(s.heading));

  /* شريط البطاقات: true = كل المتجر، أو كائن يحدد سيرفرات وسعراً ووجهة */
  const strip = post.serverStrip;
  const stripCodes = typeof strip === "object" ? strip.codes : undefined;
  const stripHref = typeof strip === "object" ? strip.href : undefined;
  /* سعر العرض المصري لبطاقات الشريط: 12 شهراً من مصدر الأسعار نفسه */
  const stripPrices: Partial<Record<string, DeckPrice>> | undefined =
    typeof strip === "object" && strip.price === "egp" && hasEgyptPricing()
      ? Object.fromEntries(
          EGYPT_PRICING.filter(
            (server) => !stripCodes || stripCodes.includes(server.code)
          ).flatMap((server) => {
            const amount = server.prices["12"];
            return typeof amount === "number"
              ? [[server.code, { amount, currency: "ج.م", termLabel: "12 شهراً" } satisfies DeckPrice]]
              : [];
          })
        )
      : undefined;

  return (
    <div className="bg-[#faf9f6] pt-[150px] md:pt-[168px] pb-20">
      <div className="max-w-[820px] mx-auto px-5">
        <nav className="text-[12.5px] font-bold text-black/40 mb-5" aria-label="مسار التصفح">
          <a href={to("")} className="hover:text-black transition">الرئيسية</a>
          <span className="mx-2">/</span>
          <a href={to("blog/")} className="hover:text-black transition">المدوّنة</a>
          <span className="mx-2">/</span>
          <span className="text-black/70">{post.title}</span>
        </nav>

        <article>
          <header>
            <div className="flex flex-wrap items-center gap-3 text-[11.5px] font-black text-black/45">
              <span className="bg-[#d8ff3e] text-black px-2.5 py-1 rounded-full">{post.category}</span>
              {!post.hideMeta && (
                <>
                  <span className="inline-flex items-center gap-1">
                    <IconClock className="w-3.5 h-3.5" /> {post.readingMinutes} دقائق قراءة
                  </span>
                  <time dateTime={post.date} className="font-latin">{post.date}</time>
                  {post.updated && post.updated !== post.date && (
                    <span className="text-black/40">
                      آخر تحديث: <time dateTime={post.updated} className="font-latin">{post.updated}</time>
                    </span>
                  )}
                </>
              )}
            </div>
            <h1 className="mt-4 font-display font-black tracking-tight leading-[1.2] text-[32px] md:text-[44px]">
              {post.title}
            </h1>
            <p className="mt-4 text-[15.5px] md:text-[17px] text-black/60 font-medium leading-[1.9]">
              {post.intro}
            </p>
            {/* مقال يحمل أسعار السوق المصري: تنبيه الحدود الجغرافية فوق الطية */}
            {post.sections.some((sec) => sec.egyptPricing) && (
              <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#2b4eff]/25 bg-[#2b4eff]/[0.06] px-4 py-2 text-[12.5px] font-black text-[#1e3bbf]">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" />
                  <circle cx="12" cy="10" r="2.6" />
                </svg>
                الأسعار والباقات في هذه الصفحة تعمل داخل مصر فقط
              </p>
            )}
          </header>

          {post.hero && (
            <div className="mt-8 overflow-hidden rounded-[28px] border border-black/10 bg-[#f4f3ef]">
              <picture>
                {post.hero.avif && <source srcSet={`/${post.hero.avif}`} type="image/avif" />}
                <img
                  src={`/${post.hero.src}`}
                  alt={post.hero.alt}
                  width={1280}
                  height={720}
                  loading="eager"
                  decoding="async"
                  className="w-full h-auto object-cover"
                />
              </picture>
            </div>
          )}

          {strip && (
            <ServerDeck
              label={
                stripCodes
                  ? `${stripCodes.length === 2 ? "السيرفران" : "السيرفرات"} في نظرة واحدة`
                  : "السيرفرات الأربعة في نظرة واحدة"
              }
              codes={stripCodes}
              prices={stripPrices}
              href={stripHref}
            />
          )}

          {toc.length >= 5 && (
            <nav
              aria-label="فهرس المقال"
              className="mt-8 rounded-2xl border border-black/10 bg-white p-5 sm:p-6"
            >
              <p className="text-[12px] font-black tracking-[0.18em] uppercase text-[#2b4eff]">
                في هذا الدليل
              </p>
              <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                {toc.map((t) => {
                  const index = sections.indexOf(t);
                  return (
                    <li key={t.heading}>
                      <a
                        href={`#${t.anchor ?? `s-${index}`}`}
                        className="text-[13.5px] font-bold text-black/65 hover:text-[#2b4eff] transition"
                      >
                        {t.heading}
                      </a>
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}

          <div className="mt-10 space-y-9">
            {sections.map((s, i) => (
              <section key={i}>
                {s.heading && (
                  <h2
                    id={s.anchor ?? `s-${i}`}
                    className="font-display font-black text-[22px] md:text-[26px] tracking-tight leading-snug scroll-mt-32"
                  >
                    {s.heading}
                  </h2>
                )}

                {s.paragraphs?.map((p, j) => (
                  <p key={j} className="mt-3.5 text-[15px] leading-[2] text-black/70">
                    {p}
                  </p>
                ))}

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

                {s.pricing && (
                  <div className="mt-5 overflow-x-auto rounded-2xl border border-black/10 bg-white">
                    <table className="w-full text-right border-collapse min-w-[760px]">
                      <caption className="p-4 text-right text-[12.5px] font-bold text-black/50">
                        مقارنة باقات اشتراك IPTV 2026 — الأسعار لمدة {durationLabel} كما هي في المتجر
                      </caption>
                      <thead>
                        <tr className="bg-[#0b0b0f] text-white">
                          <th scope="col" className="p-4 text-[13px] font-black">السيرفر</th>
                          <th scope="col" className="p-4 text-[13px] font-black">الأنسب لمن</th>
                          <th scope="col" className="p-4 text-[13px] font-black">الأجهزة</th>
                          <th scope="col" className="p-4 text-[13px] font-black">الجودة المعلنة</th>
                          <th scope="col" className="p-4 text-[13px] font-black">القنوات</th>
                          <th scope="col" className="p-4 text-[13px] font-black">سعر {durationLabel}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.07]">
                        {PRICING_PLANS.map((p) => {
                          const price = p.prices[duration] ?? p.prices["12"];
                          return (
                            <tr key={p.id} className="hover:bg-[#d8ff3e]/[0.12] transition-colors">
                              <th scope="row" className="p-4 text-[13px] font-black text-right bg-[#f4f3ef]">
                                <ServerLink
                                  code={p.serverCode}
                                  label={p.serverName.split("(")[0].trim()}
                                  size={26}
                                  textClassName="hover:text-[#2b4eff] underline underline-offset-4 decoration-black/20"
                                />
                                {p.isPopular && (
                                  <span className="mt-1 block text-[10.5px] font-black text-[#2b4eff]">الأكثر طلباً</span>
                                )}
                              </th>
                              <td className="p-4 text-[13px] font-medium text-black/70">{p.tag}</td>
                              <td className="p-4 text-[13px] font-medium text-black/70">{p.devices}</td>
                              <td className="p-4 text-[13px] font-medium text-black/70">{p.quality}</td>
                              <td className="p-4 text-[13px] font-medium text-black/70">{p.channelsCount}</td>
                              <td className="p-4 text-[13px] font-black whitespace-nowrap">
                                {price.SAR} ر.س
                                <span className="mt-0.5 block text-[11px] font-bold text-black/40 font-latin">
                                  ≈ {price.USD} USD
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {s.pricing && (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <a
                      href={to("store/")}
                      className="inline-flex items-center gap-2 bg-[#0b0b0f] text-white font-black text-[14px] px-6 py-3 rounded-full"
                    >
                      اختر باقتك من المتجر <IconArrowUpRight className="w-4 h-4" />
                    </a>
                    <a
                      href={getWhatsAppUrl("مرحبًا، أريد كود فحص تجريبي لأقارن الباقات قبل الشراء")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 border border-black/15 font-black text-[14px] px-6 py-3 rounded-full hover:bg-white transition"
                    >
                      <IconChat className="w-4 h-4" /> تجربة 6 ساعات قبل الدفع
                    </a>
                  </div>
                )}

                {/* نسخة الجوال: بطاقات تُظهر الأسعار كاملة بلا تمرير أفقي — تسبق الجدول
                    لأن أعمدة الأسعار تخرج من الشاشة في الجدول الضيق. */}
                {s.egyptPricing && hasEgyptPricing() && (
                  <div className="mt-5 grid gap-3 md:hidden">
                    {EGYPT_PRICING.map((server) => (
                      <div key={server.code} className="rounded-2xl border border-black/10 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <ServerLink
                            code={server.code}
                            label={server.name.split("(")[0].trim()}
                            size={26}
                            textClassName="font-black text-[15px]"
                          />
                          <span className="text-[11.5px] font-bold text-black/45">{server.devices}</span>
                        </div>
                        <p className="mt-1.5 text-[12.5px] font-medium text-black/55">{server.bestFor}</p>
                        <ul className="mt-3 divide-y divide-black/[0.07] border-t border-black/[0.07]">
                          {EGYPT_TERMS.map((term) => {
                            const price = server.prices[term];
                            const monthly = monthlyEquivalent(price, term);
                            return (
                              <li key={term} className="flex items-baseline justify-between gap-3 py-2.5">
                                <span className="text-[13px] font-bold text-black/60">
                                  {term} أشهر
                                  {monthly && (
                                    <span className="ms-1 text-[11px] font-bold text-black/35">
                                      ({Math.round(monthly)} ج.م شهرياً)
                                    </span>
                                  )}
                                </span>
                                <span className="text-[15px] font-black whitespace-nowrap">
                                  {typeof price === "number" ? (
                                    formatEgp(price)
                                  ) : (
                                    <span className="text-[13px] font-bold text-black/35">باتفاق</span>
                                  )}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                    <p className="text-[11.5px] font-bold text-black/40">
                      إجمالي كل مدة بالجنيه المصري · يعمل داخل مصر فقط
                      {EGYPT_PRICING_UPDATED ? ` · آخر تحديث ${EGYPT_PRICING_UPDATED}` : ""}
                    </p>
                  </div>
                )}

                {s.egyptPricing && hasEgyptPricing() && (
                  <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-black/10 bg-white md:block">
                    <table className="w-full text-right border-collapse min-w-[720px]">
                      <caption className="p-4 text-right text-[12.5px] font-bold text-black/50">
                        أسعار اشتراك IPTV في مصر بالجنيه المصري — إجمالي كل مدة · داخل مصر فقط
                        {EGYPT_PRICING_UPDATED ? ` · آخر تحديث ${EGYPT_PRICING_UPDATED}` : ""}
                      </caption>
                      <thead>
                        <tr className="bg-[#0b0b0f] text-white">
                          <th scope="col" className="p-4 text-[13px] font-black">السيرفر</th>
                          <th scope="col" className="p-4 text-[13px] font-black">الأنسب لـ</th>
                          <th scope="col" className="p-4 text-[13px] font-black">الأجهزة</th>
                          {EGYPT_TERMS.map((term) => (
                            <th key={term} scope="col" className="p-4 text-[13px] font-black whitespace-nowrap">
                              {term} أشهر
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.07]">
                        {EGYPT_PRICING.map((server) => (
                          <tr key={server.code} className="hover:bg-[#d8ff3e]/[0.12] transition-colors">
                            <th scope="row" className="p-4 text-[13px] font-black text-right bg-[#f4f3ef]">
                              <ServerLink
                                code={server.code}
                                label={server.name.split("(")[0].trim()}
                                size={26}
                                textClassName="hover:text-[#2b4eff] underline underline-offset-4 decoration-black/20"
                              />
                            </th>
                            <td className="p-4 text-[13px] font-medium text-black/70">{server.bestFor}</td>
                            <td className="p-4 text-[13px] font-medium text-black/70">{server.devices}</td>
                            {EGYPT_TERMS.map((term) => {
                              const price = server.prices[term];
                              const monthly = monthlyEquivalent(price, term);
                              return (
                                <td key={term} className="p-4 text-[13px] font-black whitespace-nowrap">
                                  {typeof price === "number" ? (
                                    <>
                                      {formatEgp(price)}
                                      {monthly && (
                                        <span className="mt-0.5 block text-[11px] font-bold text-black/40">
                                          ≈ {Math.round(monthly)} ج.م شهرياً
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <span className="font-bold text-black/35">باتفاق</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {s.egyptPricing && hasEgyptPricing() && (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <a
                      href={getWhatsAppUrl("مرحبًا، أريد الاشتراك في باقة IPTV داخل مصر ومعرفة السعر النهائي")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-[#0b0b0f] text-white font-black text-[14px] px-6 py-3 rounded-full"
                    >
                      <IconChat className="w-4 h-4" /> اطلب السعر النهائي على واتساب
                    </a>
                  </div>
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

                {s.note && (
                  <p className="mt-4 rounded-2xl border border-[#2b4eff]/25 bg-[#2b4eff]/[0.06] px-5 py-4 text-[14px] font-bold leading-[1.9] text-[#1e3bbf]">
                    ملاحظة عملية: {s.note}
                  </p>
                )}

                {s.links && s.links.length > 0 && (
                  <ul className="mt-5 flex flex-wrap gap-2.5">
                    {s.links.map((l) => (
                      <li key={l.href}>
                        <a
                          href={to(l.href)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#2b4eff]/25 bg-[#2b4eff]/[0.06] px-4 py-2 text-[12.5px] font-black text-[#1e3bbf] hover:bg-[#2b4eff]/[0.12] transition"
                        >
                          {l.label} <IconArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      </li>
                    ))}
                  </ul>
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
              {/* تنبيه قانوني للمقالات */}
              <div className="mt-10 rounded-2xl border border-black/10 bg-white px-5 py-4 text-[13px] leading-[1.85] text-black/60">
                <strong className="text-black/80">تنبيه تقني وقانوني:</strong> المقالات المنشورة في هذا القسم هي لأغراض الشرح التقني وإرشادات إعداد الأجهزة فقط. جميع السيرفرات المذكورة تُدار من قِبل مزوديها الخارجيين المستقلين، ولا يستضيف الموقع أو يبث أي محتوى مرئي على خوادمه الخاصة.
              </div>
        </article>

        {/* صندوق تحويل — للأدلة التعريفية صندوق محايد بدل صندوق البيع */}
        {post.kind === "guide" ? (
          <aside className="mt-12 rounded-[28px] bg-white border border-black/10 p-7 sm:p-9">
            <h2 className="font-display font-black text-[22px] md:text-[26px] tracking-tight leading-snug">
              تريد معرفة خيارات المشاهدة الرسمية؟
            </h2>
            <p className="mt-3 text-black/60 text-[14.5px] font-medium leading-relaxed max-w-[560px]">
              تعرّف على الجهات الرسمية التي تنقل المحتوى في منطقتك، وشروط المشاهدة لدى كل منها.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={to("watch-legal.html")}
                className="inline-flex items-center gap-2 bg-[#0b0b0f] text-white font-black text-[14.5px] px-7 py-3.5 rounded-full"
              >
                دليل المشاهدة الرسمية <IconArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </aside>
        ) : (
        <aside className="mt-12 rounded-[28px] bg-[#0b0b0f] text-white p-7 sm:p-9 grain relative overflow-hidden">
          <div className="absolute -top-24 -end-24 w-[300px] h-[300px] bg-[#2b4eff]/40 blur-[110px] rounded-full" />
          <div className="relative">
            <h2 className="font-display font-black text-[22px] md:text-[28px] tracking-tight leading-snug">
              {plan ? `جاهز لتجربة ${plan.serverName.split("(")[0].trim()}؟` : "جاهز لتجربة سيرفر المزود على جهازك؟"}
            </h2>
            <p className="mt-3 text-white/60 text-[14.5px] font-medium leading-relaxed max-w-[560px]">
              اطلب تجربة مجانية صادرة من المزود لاختبار استقرار الاتصال وتوافق التطبيق على جهازك قبل الاشتراك —
              التفعيل والدعم الفني فوري خلال دقائق.
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
        )}

        {/* التنقّل بين المقالات */}
        <nav className="mt-10 flex items-center justify-between gap-4 text-[13.5px] font-black">
          <a href={to("blog/")} className="text-[#2b4eff] hover:underline underline-offset-4">
            ← كل المقالات
          </a>
          {post.kind === "guide" ? (
            <a href={to("watch-legal.html")} className="text-[#2b4eff] hover:underline underline-offset-4">
              دليل المشاهدة الرسمية →
            </a>
          ) : (
            <a href={to("channels/")} className="text-[#2b4eff] hover:underline underline-offset-4">
              تصفّح قائمة القنوات →
            </a>
          )}
        </nav>
      </div>
    </div>
  );
}
