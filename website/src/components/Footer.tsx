import { useState } from "react";
import {
  IconArrowUpRight,
  IconArrowUp,
  IconChat,
  IconCheck,
  IconClock,
  IconPlay,
  IconShieldCheck,
  IconZap,
} from "./Icons";
import { getWhatsAppUrl, WHATSAPP_DISPLAY } from "../data";
import { to } from "../config";
import { LineReveal, Reveal } from "./motion";

interface FooterProps {
  onOpenTrial: () => void;
}

export default function Footer({ onOpenTrial }: FooterProps) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <>
      {/* نطاق الدعوة الأخيرة — بإطار متدرج على طريقة Salient */}
      <section className="pb-20 md:pb-28 px-4 sm:px-5 bg-[#faf9f6]">
        <Reveal variant="zoom" duration={900}>
        <div className="max-w-[1400px] mx-auto rounded-[32px] bg-gradient-to-l from-[#2b4eff] via-[#5b3df5] to-[#ff5c4d] p-[2px]">
          <div className="rounded-[30px] bg-[#0b0b0f] text-white px-6 py-16 md:p-20 text-center relative overflow-hidden grain">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 start-1/4 w-[500px] h-[300px] bg-[#2b4eff]/50 blur-[120px] rounded-full animate-blob" />
              <div className="absolute bottom-0 end-1/4 w-[500px] h-[300px] bg-[#ff5c4d]/40 blur-[120px] rounded-full" />
            </div>
            <div className="relative">
              <p className="inline-flex items-center gap-2 text-[12px] font-black tracking-[0.2em] uppercase bg-white/10 border border-white/15 rounded-full px-4 py-2 mb-6">
                <span className="w-2 h-2 rounded-full bg-[#d8ff3e] animate-pulse-soft" /> انضم
                لأكثر من 45,000 مشترك
              </p>
              <h2 className="font-display font-black tracking-tight leading-[1.15] text-[38px] md:text-[64px] max-w-4xl mx-auto">
                <LineReveal
                  threshold={0.3}
                  step={140}
                  lines={[
                    "ابدأ المشاهدة",
                    <span className="font-serif italic font-normal bg-gradient-to-l from-[#d8ff3e] to-[#3effe0] bg-clip-text text-transparent">
                      اليوم
                    </span>,
                  ]}
                />
              </h2>
              <p className="mt-6 text-white/55 text-[15.5px] md:text-[17px] max-w-xl mx-auto font-medium">
                فحص تجريبي مجاني 6 ساعات — تفعيل فوري خلال 5 دقائق — ضمان كامل طوال مدة الاشتراك.
              </p>
              <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={onOpenTrial}
                  className="btn-slide slide-white w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#d8ff3e] text-black font-black text-[15px] px-9 py-4 rounded-full cursor-pointer"
                >
                  <IconZap className="w-4 h-4" /> اطلب تجربتك المجانية
                </button>
                <a
                  href="#pricing"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/25 font-black text-[15px] px-9 py-4 rounded-full hover:bg-white hover:text-black transition-all"
                >
                  اختر باقتك الآن
                </a>
              </div>
              <p className="mt-6 text-[12.5px] text-white/40 font-medium">
                دعم 24/7 • ضمان استرجاع • بدون التزام مسبق
              </p>
            </div>
          </div>
        </div>
        </Reveal>
      </section>

      {/* التذييل */}
      <footer className="bg-[#0b0b0f] text-white pt-16 md:pt-20 pb-8 rounded-t-[32px] relative overflow-hidden grain">
        <div className="max-w-[1400px] mx-auto px-5">
          {/* الأعمدة */}
          <div className="grid lg:grid-cols-[1.2fr_2fr] gap-12 pb-14 border-b border-white/10">
            <div>
              <a href="#hero" className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-xl bg-[#d8ff3e] text-black grid place-items-center">
                  <IconPlay className="w-5 h-5 mr-0.5" />
                </span>
                <span className="font-display font-black text-[24px] tracking-tight">
                  ستريم ماستر
                </span>
              </a>
              <p className="mt-5 text-white/50 text-[14px] leading-[1.9] max-w-sm">
                المنصة التقنية الرائدة لخدمات الربط والدعم الفني لاشتراكات وسيرفرات المزودين في
                السعودية والخليج ومصر والعالم العربي. ثبات 99.9% مع دعم فني متواصل على مدار الساعة.
              </p>

              <a
                href={getWhatsAppUrl("مرحبًا ستريم ماستر، لدي استفسار")}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 bg-[#16a34a]/15 text-[#3effe0] border border-[#16a34a]/30 px-4 py-2.5 rounded-full text-[13px] font-black hover:bg-[#16a34a] hover:text-white transition-all"
              >
                <IconChat className="w-4 h-4" /> واتساب: {WHATSAPP_DISPLAY}
              </a>

              <div className="mt-6 flex flex-wrap gap-2 text-[11px] font-bold text-white/40">
                {["مدى", "فيزا", "ماستركارد", "Apple Pay", "STC Pay", "فودافون كاش"].map(
                  (p) => (
                    <span key={p} className="bg-white/[0.06] border border-white/10 px-2.5 py-1 rounded-full">
                      {p}
                    </span>
                  )
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-right">
              {[
                {
                  h: "روابط سريعة",
                  l: [
                    { t: "الرئيسية", href: "#hero" },
                    { t: "الباقات والأسعار", href: "#pricing" },
                    { t: "مساعد الاختيار", href: "#server-finder" },
                    { t: "مقارنة السيرفرات", href: "#servers-compare" },
                    { t: "مكتبة القنوات", href: "#channels" },
                    { t: "كل القنوات (صفحة)", href: to("channels/") },
                    { t: "دليل التشغيل", href: "#setup" },
                    { t: "مقالات ودلائل", href: to("blog/") },
                  ],
                },
                {
                  h: "السيرفرات",
                  l: [
                    { t: "سيرفر نوفا (Nova) ⚽", href: to("nova/") },
                    { t: "سيرفر إيستار (iStar) 🎬", href: to("istar/") },
                    { t: "سيرفر موكا (Moka) ⚡", href: to("moka/") },
                    { t: "البث المباشر", href: "#live-player" },
                  ],
                },
                { h: "عن الموقع", l: [
                  { t: "من نحن", href: to("about/") },
                  { t: "تواصل وحالة الخدمة", href: to("status/") },
                  { t: "سياسة الخصوصية", href: to("privacy/") },
                  { t: "شروط الاستخدام", href: to("terms/") },
                  { t: "سياسة الاسترجاع", href: to("refund/") },
                  { t: "المشاهدة القانونية", href: to("watch-legal.html") },
                  { t: "كأس العالم 2026", href: to("world-cup-2026/") },
                  { t: "التوقعات", href: to("predictions/") },
                  { t: "البحث", href: to("search/") },
                  { t: "البث المجاني", href: to("live-free.html") },
                ] },
              ].map((col) => (
                <div key={col.h}>
                  <p className="text-[12px] font-black uppercase tracking-[0.2em] text-white/35 mb-4">
                    {col.h}
                  </p>
                  <ul className="space-y-2.5">
                    {col.l.map((item) => (
                      <li key={item.t}>
                        <a
                          href={item.href}
                          className="text-[13.5px] font-medium text-white/65 hover:text-[#d8ff3e] transition inline-flex items-center gap-1 group"
                        >
                          {item.t}
                          <IconArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {/* عمود الضمان */}
              <div>
                <p className="text-[12px] font-black uppercase tracking-[0.2em] text-white/35 mb-4">
                  الضمان والدعم
                </p>
                <div className="space-y-3.5 text-[13px]">
                  <div className="flex items-center gap-2.5 text-white/65">
                    <IconShieldCheck className="w-5 h-5 text-[#3effe0] shrink-0" />
                    <span>ضمان ثبات كامل طوال المدة</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-white/65">
                    <IconZap className="w-5 h-5 text-[#d8ff3e] shrink-0" />
                    <span>تفعيل فوري خلال 5 دقائق</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-white/65">
                    <IconClock className="w-5 h-5 text-[#7c5cff] shrink-0" />
                    <span>دعم فني متواصل 24/7</span>
                  </div>
                  <button
                    onClick={onOpenTrial}
                    className="mt-2 text-[#d8ff3e] font-black hover:underline cursor-pointer text-[13px]"
                  >
                    طلب كود فحص تجريبي (6 ساعات)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* النشرة البريدية — على نمط Salient */}
          <div className="py-12 border-b border-white/10">
            <div className="max-w-md mx-auto text-center">
              <p className="font-display font-black text-[20px]">ابقَ على اطلاع</p>
              <p className="mt-2 text-[13.5px] text-white/45 font-medium leading-relaxed">
                أحدث العروض والقنوات الجديدة وأخبار كأس العالم 2026 — رسالة واحدة أسبوعياً، بلا
                إزعاج.
              </p>

              {done ? (
                <div className="mt-5 flex items-center justify-center gap-2 bg-[#d8ff3e] text-black rounded-full px-5 py-3.5 text-[14px] font-black w-fit mx-auto">
                  <IconCheck className="w-4 h-4" /> أكمل طلب التفعيل والدعم الفني عبر واتساب.
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (email) { window.open(getWhatsAppUrl(`أرغب بالاشتراك في تحديثات العروض. بريدي: ${email}`), "_blank", "noopener,noreferrer"); setDone(true); }
                  }}
                  className="mt-5 flex gap-2 bg-white/[0.07] border border-white/15 rounded-full p-1.5 ps-5 focus-within:border-[#d8ff3e] transition"
                >
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="بريدك الإلكتروني"
                    className="flex-1 bg-transparent outline-none text-[14px] font-medium placeholder:text-white/30 min-w-0 text-right"
                    aria-label="البريد الإلكتروني للنشرة"
                  />
                  <button
                    type="submit"
                    className="btn-slide slide-white shrink-0 bg-[#d8ff3e] text-black font-black text-[13.5px] px-6 py-2.5 rounded-full cursor-pointer"
                  >
                    انضم الآن
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* الكلمة العملاقة */}
          <div className="py-10 select-none overflow-hidden">
            <h3 className="font-display font-black tracking-tight leading-none text-[13vw] lg:text-[190px] text-center bg-gradient-to-b from-white/[0.14] to-white/[0.02] bg-clip-text text-transparent whitespace-nowrap">
              ستريم ماستر®
            </h3>
          </div>

          {/* إخلاء المسؤولية القانونية وسياسة DMCA */}
          <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-[12.5px] leading-[1.9] text-white/55 text-right">
            <p className="font-black text-[#d8ff3e] mb-1">
              ⚠️ إخلاء مسؤولية قانوني وسياسة الملكية الفكرية (DMCA):
            </p>
            <p>
              يعمل موقع <strong className="text-white/80">ستريم ماستر برو (Stream Master Pro)</strong> كوسيط تقني ودليل فهرسة فقط، ولا يقوم باستضافة أو تخزين أو رفع أو بث أي ملفات وسائط أو قنوات مرئية على خوادمه الخاصة. كافة العلامات التجارية المذكورة مملوكة لأصحابها الشرعيين، ويتحمل المستخدم وحده مسؤولية استخدامه للخدمة والامتثال للقوانين المحلية في بلده. للإبلاغ عن أي انتهاك لحقوق الطبع والنشر (DMCA) وطلب حذف الروابط خلال 24–72 ساعة، يرجى مراسلتنا عبر البريد الرسمي:{" "}
              <a
                href="mailto:support@streammasterstore.com"
                className="text-white/80 underline hover:text-[#d8ff3e]"
                dir="ltr"
              >
                support@streammasterstore.com
              </a>{" "}
              أو مراجعة{" "}
              <a href={to("terms/")} className="text-white/80 underline hover:text-[#d8ff3e]">
                وثيقة الشروط وسياسة DMCA
              </a>
              .
            </p>
          </div>

          {/* الشريط السفلي */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-white/10 text-[12.5px] font-medium text-white/40">
            <p suppressHydrationWarning>
              © {new Date().getFullYear()} ستريم ماستر برو (Stream Master Pro) — جميع الحقوق
              محفوظة.
            </p>
            <div className="flex items-center gap-5">
              <span>ثبات 99.9%</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">بث 4K بدون تقطيع</span>
              <a
                href="#hero"
                className="w-11 h-11 rounded-full bg-white text-black grid place-items-center hover:bg-[#d8ff3e] transition ml-2"
                aria-label="الرجوع للأعلى"
              >
                <IconArrowUp className="w-[18px] h-[18px]" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
