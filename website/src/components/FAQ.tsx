import { useState } from "react";
import { FAQS } from "../data";
import { IconPlus } from "./Icons";
import { Reveal } from "./motion";

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 md:py-28 bg-[#faf9f6]">
      <div className="max-w-[860px] mx-auto px-5">
        {/* الترويسة */}
        <div className="text-center mb-10">
          <p className="text-[12px] font-black tracking-[0.25em] uppercase text-black/40 mb-4">
            مركز المساعدة
          </p>
          <h2 className="font-display font-black tracking-tight leading-[1.15] text-[36px] md:text-[52px]">
            الأسئلة <span className="font-serif italic font-normal">الشائعة</span>
          </h2>
          <p className="mt-4 text-[15px] md:text-[16px] text-black/55 font-medium">
            كل ما تود معرفته عن الاشتراك، التفعيل، سرعات الإنترنت، وطرق الدفع.
          </p>
        </div>

        {/* الأكورديون */}
        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <Reveal key={idx} variant="up" delay={idx * 70}>
              <div
                className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isOpen
                    ? "bg-[#0b0b0f] text-white border-[#0b0b0f]"
                    : "bg-white border-black/10 hover:border-black"
                }`}
              >
                <button
                  onClick={() => toggleFAQ(idx)}
                  className="w-full flex items-center justify-between gap-4 text-right px-6 py-5 cursor-pointer"
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

                {isOpen && (
                  <div className="px-6 pb-6 animate-fade-in">
                    <p className="text-[14px] md:text-[15px] leading-[1.9] text-white/65">
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
