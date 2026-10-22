import { useState } from "react";
import { EN_PLAN_FAQS, type PricingPlan } from "../data";
import { to, WHATSAPP_NUMBER } from "../config";
import { SERVER_WATERMARKS, SERVER_WATERMARK_CLASS } from "../lib/server-branding";
import { IconPlus } from "../components/Icons";
import { Reveal } from "../components/motion";

const wa = (text: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

/* صفحة سيرفر إنجليزية (/en/nova و/en/istar و/en/moka و/en/x): السعر من بيانات
   الباقة نفسها، والمواصفات بصيغة «يُعلن المزود الخارجي»، بلا أي وعد بمحتوى. */
export default function EnPlanPage({ plan }: { plan: PricingPlan }) {
  const [openKey, setOpenKey] = useState<number | null>(0);
  const price = plan.prices["12"].USD;
  const en = plan.en;

  const specs: [string, string][] = [
    ["Live channels", en.channels],
    ["Movies & series library", en.vod],
    ["Stream quality", plan.quality],
    ["Streaming technology", en.antiFreeze],
  ];

  return (
    <div className="pt-[140px]">
      <nav
        className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 text-[12.5px] font-bold text-black/40 pt-6"
        aria-label="Breadcrumb"
      >
        <a href={to("en/")} className="hover:text-black transition">Home</a>
        <span className="mx-2">/</span>
        <span className="text-black/70">{en.name}</span>
      </nav>

      {/* البطل والسعر */}
      <section className="py-12 md:py-16">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 grid gap-10 lg:grid-cols-[1.2fr_1fr] items-start">
          <div>
            <p className="text-[13px] font-black text-[#2b4eff]">{en.tag}</p>
            <h1 className="mt-3 font-display font-black tracking-tight leading-[1.12] text-[32px] md:text-[48px]">
              {en.name} — technical activation &amp; player setup package
            </h1>
            <p className="mt-5 text-[15px] md:text-[16.5px] text-black/55 font-medium leading-[1.9]">
              {en.description} Our package covers the technical side end to end:
              activation of the provider-issued subscription data, player setup on
              your devices, quality tuning for your connection, and technical support.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={wa(`Hello, I would like to order the ${en.name} technical activation package ($${price}/year)`)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-[#0b0b0f] text-[#d8ff3e] font-black px-7 py-3.5 text-[14.5px] hover:opacity-85 transition"
              >
                Order on WhatsApp — ${price}/year
              </a>
              <a
                href={to("en/faq/")}
                className="rounded-full border border-black/20 font-black px-7 py-3.5 text-[14.5px] hover:border-black transition"
              >
                Questions? Read the FAQ
              </a>
            </div>
            <p className="mt-5 text-[13px] text-black/45 leading-relaxed">
              12-month package. Prices in USD; our team confirms the payment method
              available in your country when you order. No automatic renewal — ever.
            </p>
          </div>

          {/* مواصفات يعلنها المزود */}
          <Reveal variant="up">
            <article className="relative overflow-hidden rounded-3xl bg-[#0b0b0f] text-white p-7">
              <img
                src={SERVER_WATERMARKS[plan.serverCode].src}
                alt=""
                aria-hidden="true"
                width={SERVER_WATERMARKS[plan.serverCode].width}
                height={SERVER_WATERMARKS[plan.serverCode].height}
                loading="lazy"
                decoding="async"
                className={SERVER_WATERMARK_CLASS}
              />
              <div className="relative z-10">
                <h2 className="font-display font-black text-[20px]">
                  What the external provider announces
                </h2>
                <dl className="mt-5 divide-y divide-white/10">
                  {specs.map(([k, v]) => (
                    <div key={k} className="py-3.5 flex items-baseline justify-between gap-4">
                      <dt className="text-[13px] font-bold text-white/50">{k}</dt>
                      <dd className="text-[14.5px] font-black text-end">{v}</dd>
                    </div>
                  ))}
                  <div className="py-3.5 flex items-baseline justify-between gap-4">
                    <dt className="text-[13px] font-bold text-white/50">Package price</dt>
                    <dd className="font-display text-[22px] font-black text-[#d8ff3e]">${price} / year</dd>
                  </div>
                </dl>
                <p className="mt-4 text-[12.5px] leading-relaxed text-white/45">
                  These specifications are announced by the server's independent external
                  provider. Stream Master Pro does not host or stream content and does
                  not sell channels.
                </p>
              </div>
            </article>
          </Reveal>
        </div>
      </section>

      {/* ما تشمله الخدمة */}
      <section className="pb-14">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="font-display font-black tracking-tight text-[26px] md:text-[34px]">
              What our service includes
            </h2>
            <ul className="mt-6 space-y-3.5">
              {en.features.map((f) => (
                <li key={f} className="flex gap-3 text-[14.5px] leading-[1.85] text-black/70 font-medium">
                  <span className="mt-1 w-5 h-5 shrink-0 rounded-full bg-[#d8ff3e] text-black grid place-items-center text-[12px] font-black">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-display font-black tracking-tight text-[26px] md:text-[34px]">
              How activation works
            </h2>
            <ol className="mt-6 space-y-4">
              {[
                "Confirm your order on WhatsApp — we verify the package and your country's payment method.",
                "Receive the provider-issued subscription data (M3U link + Xtream Codes) via WhatsApp and email, within minutes.",
                "Set up the player on your TV, phone or box with our step-by-step help, and test the free trial first if you prefer.",
              ].map((s, i) => (
                <li key={s} className="flex gap-3.5">
                  <span className="w-8 h-8 shrink-0 rounded-full bg-[#0b0b0f] text-[#d8ff3e] grid place-items-center font-display font-black text-[14px]">
                    {i + 1}
                  </span>
                  <p className="text-[14.5px] leading-[1.85] text-black/70 font-medium pt-1">{s}</p>
                </li>
              ))}
            </ol>
            <p className="mt-6 rounded-2xl border border-black/10 bg-white p-5 text-[13.5px] leading-[1.9] text-black/60">
              Looking for encrypted channels or official broadcasters? Those are watched
              only through their official subscriptions — see the{" "}
              <a href={to("watch-legal.html")} className="font-bold text-[#2b4eff] underline underline-offset-4">
                official viewing guide
              </a>
              . Compare all four servers on the{" "}
              <a href={to("en/")} className="font-bold text-[#2b4eff] underline underline-offset-4">
                English homepage
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* أسئلة */}
      <section className="pb-20">
        <div className="max-w-[860px] mx-auto px-5">
          <h2 className="text-center font-display font-black tracking-tight text-[28px] md:text-[38px]">
            Questions about this package
          </h2>
          <div className="mt-9 space-y-3">
            {EN_PLAN_FAQS.map((faq, idx) => {
              const isOpen = openKey === idx;
              return (
                <div
                  key={faq.q}
                  className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                    isOpen ? "bg-[#0b0b0f] text-white border-[#0b0b0f]" : "bg-white border-black/10 hover:border-black"
                  }`}
                >
                  <h3>
                    <button
                      onClick={() => setOpenKey(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between gap-4 text-start px-6 py-5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                      aria-expanded={isOpen}
                    >
                      <span className="font-black text-[14.5px] md:text-[16px] leading-snug">{faq.q}</span>
                      <span
                        className={`w-9 h-9 rounded-full grid place-items-center shrink-0 transition-transform duration-300 ${
                          isOpen ? "bg-[#d8ff3e] text-black rotate-45" : "bg-black/[0.06] text-black"
                        }`}
                      >
                        <IconPlus className="w-[17px] h-[17px]" />
                      </span>
                    </button>
                  </h3>
                  <div hidden={!isOpen} className="px-6 pb-6 animate-fade-in">
                    <p className={`text-[14px] md:text-[15px] leading-[1.9] ${isOpen ? "text-white/65" : "text-black/60"}`}>
                      {faq.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-7 text-center">
            <a href={to("en/faq/")} className="font-black text-[#2b4eff] underline underline-offset-4">
              All questions — activation, payment &amp; refunds, devices, renewals
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
