import { useState } from "react";
import { FAQ_SECTIONS, type FaqSection } from "../data";
import { to, WHATSAPP_NUMBER } from "../config";
import { IconPlus } from "../components/Icons";
import { Reveal } from "../components/motion";

/* نصوص واجهة صفحة الأسئلة — العربية هي الافتراضية، والإنجليزية تُمرَّر من
   EnFaqPage. البنية والكلاسات واحدة في اللغتين حتى يبقى الناتج العربي كما هو. */
export interface FaqCopy {
  navLabel: string;
  crumbHome: string;
  crumbCurrent: string;
  homeHref: string;
  eyebrow: string;
  titleLead: string;
  titleAccent: string;
  intro: string;
  alsoRead: string;
  ctaTitle: string;
  ctaText: string;
  waLabel: string;
  waText: string;
  compareLabel: string;
  compareHref: string;
}

const AR_COPY: FaqCopy = {
  navLabel: "مسار التصفح",
  crumbHome: "الرئيسية",
  crumbCurrent: "الأسئلة الشائعة",
  homeHref: "",
  eyebrow: "مركز المساعدة",
  titleLead: "الأسئلة",
  titleAccent: "الشائعة",
  intro:
    "إجابات مفصلة عن باقة التفعيل والربط التقني وإعداد مشغلات البث: كيف تصلك بيانات الاشتراك الصادرة عن المزود الخارجي، وطرق الدفع وحالات الاسترجاع، والأجهزة المدعومة، والتجديد والترقية بين السيرفرات. اختر قسماً من الأسفل أو تصفح الأسئلة كلها.",
  alsoRead: "اقرأ أيضاً:",
  ctaTitle: "لم تجد إجابتك في الأسئلة الشائعة؟",
  ctaText:
    "راسل فريق الدعم الفني عبر واتساب وسيساعدك في التفعيل والربط التقني وإعداد المشغّل على جهازك خطوة بخطوة، أو تصفح الباقات والسيرفرات وقارن بينها قبل أن تقرر.",
  waLabel: "محادثة واتساب مع الدعم الفني",
  waText: "مرحباً، لدي سؤال عن باقة التفعيل والربط التقني",
  compareLabel: "مقارنة السيرفرات والباقات",
  compareHref: "servers/",
};

/* صفحة الأسئلة الشائعة الكاملة: أقسام موضوعية بأسئلة ظاهرة كلها في HTML
   (الإجابات موجودة دائماً في الصفحة، مخفية بصرياً فقط عند إغلاق العنصر)
   حتى تطابق بيانات FAQPage المنظّمة في seo.ts سؤالاً سؤالاً. */
export default function FaqPage({
  sections = FAQ_SECTIONS,
  copy = AR_COPY,
}: {
  sections?: FaqSection[];
  copy?: FaqCopy;
}) {
  const [openKey, setOpenKey] = useState<string | null>("0-0");

  return (
    <div className="pt-[104px]">
      <nav
        className="max-w-[860px] mx-auto px-5 text-[12.5px] font-bold text-black/40 pt-6"
        aria-label={copy.navLabel}
      >
        <a href={to(copy.homeHref)} className="hover:text-black transition">{copy.crumbHome}</a>
        <span className="mx-2">/</span>
        <span className="text-black/70">{copy.crumbCurrent}</span>
      </nav>

      <section className="py-14 md:py-20 bg-[#faf9f6]">
        <div className="max-w-[860px] mx-auto px-5">
          {/* الترويسة */}
          <div className="text-center mb-10">
            <p className="text-[12px] font-black tracking-[0.25em] uppercase text-black/40 mb-4">
              {copy.eyebrow}
            </p>
            <h1 className="font-display font-black tracking-tight leading-[1.15] text-[36px] md:text-[52px]">
              {copy.titleLead} <span className="font-serif italic font-normal">{copy.titleAccent}</span>
            </h1>
            <p className="mt-4 text-[15px] md:text-[16px] text-black/55 font-medium leading-[1.9] max-w-[680px] mx-auto">
              {copy.intro}
            </p>
            {/* تنقل سريع بين الأقسام */}
            <div className="mt-7 flex flex-wrap justify-center gap-2.5">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#faq-${section.id}`}
                  className="rounded-full border border-black/15 bg-white px-4 py-2 text-[13px] font-black hover:border-black transition"
                >
                  {section.title}
                </a>
              ))}
            </div>
          </div>

          {/* الأقسام */}
          {sections.map((section, sIdx) => (
            <section key={section.id} id={`faq-${section.id}`} className="scroll-mt-[114px] mt-14 first:mt-4">
              <h2 className="font-display font-black tracking-tight text-[26px] md:text-[34px] leading-snug">
                {section.title}
              </h2>
              <p className="mt-3 mb-7 text-[14.5px] md:text-[15.5px] text-black/55 font-medium leading-[1.9]">
                {section.intro}
              </p>

              <div className="space-y-3">
                {section.faqs.map((faq, qIdx) => {
                  const key = `${sIdx}-${qIdx}`;
                  const isOpen = openKey === key;
                  return (
                    <Reveal key={key} variant="up" delay={Math.min(qIdx, 3) * 60}>
                      <div
                        className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                          isOpen
                            ? "bg-[#0b0b0f] text-white border-[#0b0b0f]"
                            : "bg-white border-black/10 hover:border-black"
                        }`}
                      >
                        <h3>
                          <button
                            onClick={() => setOpenKey(isOpen ? null : key)}
                            className="w-full flex items-center justify-between gap-4 text-start px-6 py-5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                            aria-expanded={isOpen}
                          >
                            <span className="font-black text-[14.5px] md:text-[16.5px] tracking-tight leading-snug">
                              {faq.q}
                            </span>
                            <span
                              className={`w-9 h-9 rounded-full grid place-items-center shrink-0 transition-transform duration-300 ${
                                isOpen
                                  ? "bg-[#d8ff3e] text-black rotate-45"
                                  : "bg-black/[0.06] text-black"
                              }`}
                            >
                              <IconPlus className="w-[17px] h-[17px]" />
                            </span>
                          </button>
                        </h3>

                        {/* الإجابة موجودة دائماً في HTML (مخفية بصرياً عند الإغلاق)
                            حتى يقرأها محرك البحث وتطابق بيانات FAQPage المنظّمة */}
                        <div hidden={!isOpen} className="px-6 pb-6 animate-fade-in">
                          <p
                            className={`text-[14px] md:text-[15px] leading-[1.9] ${
                              isOpen ? "text-white/65" : "text-black/60"
                            }`}
                          >
                            {faq.a}
                          </p>
                          {faq.links && faq.links.length > 0 && (
                            <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] font-bold">
                              <span className={isOpen ? "text-white/40" : "text-black/40"}>{copy.alsoRead}</span>
                              {faq.links.map((link) => (
                                <a
                                  key={link.href}
                                  href={to(link.href)}
                                  className={`underline underline-offset-4 transition ${
                                    isOpen ? "text-[#d8ff3e] hover:text-white" : "text-[#2b4eff] hover:text-black"
                                  }`}
                                >
                                  {link.label}
                                </a>
                              ))}
                            </p>
                          )}
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </section>
          ))}

          {/* لم تجد إجابتك؟ */}
          <div className="mt-16 rounded-3xl bg-[#0b0b0f] text-white px-7 py-10 md:px-12 text-center">
            <h2 className="font-display font-black tracking-tight text-[24px] md:text-[32px] leading-snug">
              {copy.ctaTitle}
            </h2>
            <p className="mt-4 text-white/60 text-[14.5px] md:text-[15.5px] leading-[1.9] max-w-[560px] mx-auto">
              {copy.ctaText}
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(copy.waText)}`}
                className="rounded-full bg-[#d8ff3e] text-black font-black px-7 py-3.5 text-[14.5px] hover:bg-white transition"
              >
                {copy.waLabel}
              </a>
              <a
                href={to(copy.compareHref)}
                className="rounded-full border border-white/25 text-white font-black px-7 py-3.5 text-[14.5px] hover:border-white transition"
              >
                {copy.compareLabel}
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
