import { useState } from "react";
import { EN_HOME_FAQS, PRICING_PLANS } from "../data";
import { to, WHATSAPP_NUMBER } from "../config";
import { IconPlus } from "../components/Icons";
import { Reveal } from "../components/motion";

const wa = (text: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

/* الرئيسية الإنجليزية (/en): صفحة تجارية موجّهة للباحثين بالإنجليزية في
   الخليج — هوية الوسيط التقني نفسها، والأسعار من PRICING_PLANS فقط. */
export default function EnHomePage() {
  const [openKey, setOpenKey] = useState<number | null>(0);

  return (
    <div className="pt-[140px]">
      <nav
        className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 text-[12.5px] font-bold text-black/40 pt-6"
        aria-label="Breadcrumb"
      >
        <span className="text-black/70">Home</span>
      </nav>

      {/* البطل */}
      <section className="py-14 md:py-20">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[12px] font-black tracking-[0.25em] uppercase text-black/40 mb-4">
            Stream Master Pro — in English
          </p>
          <h1 className="font-display font-black tracking-tight leading-[1.12] text-[34px] md:text-[54px] max-w-[820px] mx-auto">
            Technical activation &amp; streaming player setup,{" "}
            <span className="font-serif italic font-normal">done for you</span>
          </h1>
          <p className="mt-6 text-[15px] md:text-[17px] text-black/55 font-medium leading-[1.9] max-w-[720px] mx-auto">
            We activate and link the subscription issued by your external provider
            (M3U / Xtream Codes) and set up the player on your TV, phone or streaming
            box — with an official viewing guide and technical support. Stream Master
            Pro is a technical intermediary only: we do not host, stream or sell any
            content or channels.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="#servers"
              className="rounded-full bg-[#0b0b0f] text-[#d8ff3e] font-black px-7 py-3.5 text-[14.5px] hover:opacity-85 transition"
            >
              See the servers &amp; prices
            </a>
            <a
              href={wa("Hello, I would like to know more about the technical activation packages")}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-black/20 font-black px-7 py-3.5 text-[14.5px] hover:border-black transition"
            >
              Ask us on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* الهوية */}
      <section className="pb-6">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 grid gap-4 md:grid-cols-3">
          {[
            {
              t: "A technical intermediary only",
              d: "Our service is a technical activation and linking package plus streaming player setup and an official viewing guide — nothing more, and we say so plainly.",
            },
            {
              t: "Provider-issued subscription data",
              d: "Your M3U / Xtream Codes details are issued by an independent external provider. Every server specification on this site is announced by that provider, not by us.",
            },
            {
              t: "Encrypted content stays official",
              d: "Encrypted channels and platforms are watched only through their official subscriptions. We never promise free access to paid content — we point you to the official options.",
            },
          ].map((c) => (
            <Reveal key={c.t} variant="up">
              <article className="h-full rounded-3xl border border-black/10 bg-white p-6">
                <h2 className="font-display font-black text-[19px] leading-snug">{c.t}</h2>
                <p className="mt-3 text-[14px] leading-[1.9] text-black/60">{c.d}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* السيرفرات */}
      <section id="servers" className="py-14 md:py-20 scroll-mt-[120px]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="font-display font-black tracking-tight text-[30px] md:text-[44px]">
              Choose your <span className="font-serif italic font-normal">server</span>
            </h2>
            <p className="mt-4 text-[15px] text-black/55 font-medium max-w-[640px] mx-auto leading-[1.9]">
              Three external providers, three activation packages. Specifications below
              are announced by each provider; our package covers activation, linking,
              player setup and support.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {PRICING_PLANS.map((plan, i) => (
              <Reveal key={plan.id} variant="up" delay={i * 70}>
                <article className="h-full rounded-3xl border border-black/10 bg-white p-7 flex flex-col">
                  <p className="text-[13px] font-black text-[#2b4eff]">{plan.en.tag}</p>
                  <h3 className="mt-2 font-display font-black text-[24px]">{plan.en.name}</h3>
                  <p className="mt-3 text-[14px] leading-[1.9] text-black/60">{plan.en.description}</p>
                  <ul className="mt-5 space-y-2 text-[13.5px] font-bold text-black/70">
                    <li>{plan.en.channels} · {plan.en.vod}</li>
                    <li>{plan.quality} quality · {plan.en.devices}</li>
                    <li>{plan.en.antiFreeze}</li>
                  </ul>
                  <p className="mt-6 font-display text-[30px] font-black">
                    ${plan.prices["12"].USD}
                    <span className="text-[14px] font-bold text-black/45"> / year</span>
                  </p>
                  <a
                    href={to(`en/${plan.serverCode}/`)}
                    className="mt-5 inline-block rounded-full bg-[#0b0b0f] text-white text-center font-black px-6 py-3 text-[14px] hover:opacity-85 transition"
                  >
                    {plan.en.name} — details &amp; activation
                  </a>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* كيف يعمل */}
      <section className="pb-14 md:pb-20">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-display font-black tracking-tight text-[30px] md:text-[44px]">
            How activation <span className="font-serif italic font-normal">works</span>
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                n: "1",
                t: "Pick a package & confirm on WhatsApp",
                d: "Choose the server that fits your usage, then complete your order via WhatsApp. Our team confirms the package and the payment method available in your country (mada, Visa, Apple Pay, STC Pay and more).",
              },
              {
                n: "2",
                t: "Receive your provider-issued details",
                d: "Within minutes you receive the subscription data issued by the external provider — an M3U link and Xtream Codes credentials — via WhatsApp and email, with setup guidance.",
              },
              {
                n: "3",
                t: "We set up your player together",
                d: "Install a player on your Samsung, LG, Android, Apple TV, Fire TV Stick or computer, enter your details, and we tune the quality to your connection speed, step by step.",
              },
            ].map((s) => (
              <Reveal key={s.n} variant="up">
                <article className="h-full rounded-3xl bg-[#0b0b0f] text-white p-7">
                  <span className="w-10 h-10 rounded-full bg-[#d8ff3e] text-black grid place-items-center font-display font-black">
                    {s.n}
                  </span>
                  <h3 className="mt-4 font-display font-black text-[19px] leading-snug">{s.t}</h3>
                  <p className="mt-3 text-[14px] leading-[1.9] text-white/65">{s.d}</p>
                </article>
              </Reveal>
            ))}
          </div>
          <p className="mt-8 text-center text-[14.5px] text-black/60 leading-[1.9] max-w-[760px] mx-auto">
            Not sure which server fits you? Request the provider's free 6-hour trial
            first, test it on your own device and connection, then decide. For official
            broadcasters of matches and encrypted platforms, see the{" "}
            <a href={to("watch-legal.html")} className="font-bold text-[#2b4eff] underline underline-offset-4">
              official viewing guide
            </a>{" "}
            and the{" "}
            <a href={to("en/faq/")} className="font-bold text-[#2b4eff] underline underline-offset-4">
              English FAQ — devices, payment and refunds
            </a>
            .
          </p>
        </div>
      </section>

      {/* أسئلة مختصرة */}
      <section className="pb-20">
        <div className="max-w-[860px] mx-auto px-5">
          <h2 className="text-center font-display font-black tracking-tight text-[30px] md:text-[40px]">
            Frequently asked <span className="font-serif italic font-normal">questions</span>
          </h2>
          <div className="mt-9 space-y-3">
            {EN_HOME_FAQS.map((faq, idx) => {
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
                  {/* الإجابة موجودة دائماً في HTML لتطابق FAQPage المنظّمة */}
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
              Read the full English FAQ — 28 questions on activation, payment, devices and renewals
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
