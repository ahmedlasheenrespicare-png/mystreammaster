import { ServerIcon } from "./ServerIcon";
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
import { SUPPORT_EMAIL, to } from "../config";
import { LineReveal, Reveal } from "./motion";
import { BrandNewtStage } from "./BrandNewtStage";

interface FooterProps {
  onOpenTrial: () => void;
}

export default function Footer({ onOpenTrial }: FooterProps) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <>
      {/* نطاق الدعوة الأخيرة — بإطار متدرج ومشهد ستريم ماستر السينمائي */}
      <section className="pb-20 md:pb-28 px-4 sm:px-5 bg-[#faf9f6]">
        <Reveal variant="zoom" duration={900}>
        <div className="max-w-[1400px] mx-auto rounded-[32px] bg-gradient-to-l from-[#162b12] via-[#3f7e2c] to-[#d8ff3e] p-[2px]">
          <div className="rounded-[30px] bg-[#040904] text-white px-5 py-12 sm:px-6 sm:py-14 md:p-18 text-center relative overflow-hidden grain">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 start-1/4 w-[420px] h-[260px] bg-[#3f7e2c]/35 blur-[110px] rounded-full animate-blob" />
              <div className="absolute bottom-0 end-1/4 w-[420px] h-[260px] bg-[#d8ff3e]/15 blur-[120px] rounded-full" />
            </div>
            <div className="relative">
              <p className="inline-flex items-center gap-2 text-[11.5px] sm:text-[12px] font-black tracking-[0.16em] uppercase bg-white/10 border border-[#d8ff3e]/30 rounded-full px-4 py-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#d8ff3e] animate-pulse-soft" /> تعرّف على خياراتك
              </p>
              <BrandNewtStage variant="cta" hold observeViewport />
              <h2 className="font-display font-black tracking-tight leading-[1.15] text-[30px] sm:text-[38px] md:text-[56px] max-w-4xl mx-auto">
                <LineReveal
                  threshold={0.3}
                  step={140}
                  lines={[
                    "ابدأ المشاهدة",
                    <span className="font-serif italic font-normal bg-gradient-to-l from-[#d8ff3e] to-[#4ade80] bg-clip-text text-transparent">
                      اليوم
                    </span>,
                  ]}
                />
              </h2>
              <p className="mt-6 text-white/55 text-[15.5px] md:text-[17px] max-w-xl mx-auto font-medium">
                قارن الباقات، وتحقّق من توافق جهازك وشروط الاسترجاع قبل الدفع.
              </p>
              <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={onOpenTrial}
                  className="btn-slide slide-white w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#d8ff3e] text-black font-black text-[15px] px-9 py-4 rounded-full cursor-pointer"
                >
                  <IconZap className="w-4 h-4" /> اطلب تجربتك المجانية
                </button>
                <a
                  href={to("#pricing")}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/25 font-black text-[15px] px-9 py-4 rounded-full hover:bg-white hover:text-black transition-all"
                >
                  اختر باقتك الآن
                </a>
              </div>
              <p className="mt-6 text-[12.5px] text-white/40 font-medium">
                راجع شروط الخدمة وسياسة الاسترجاع قبل الاشتراك.
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
              <a href={to("")} className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-xl bg-[#d8ff3e] text-black grid place-items-center">
                  <IconPlay className="w-5 h-5 mr-0.5" />
                </span>
                <span className="font-display font-black text-[24px] tracking-tight">
                  ستريم ماستر
                </span>
              </a>
              <p className="mt-5 text-white/50 text-[14px] leading-[1.9] max-w-sm">
                منصة لإرشادات إعداد الأجهزة وخدمات الربط التقني والدعم لاشتراكات مزودين خارجيين.
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

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 text-right">
              {[
                {
                  h: "روابط سريعة",
                  l: [
                    { t: "الرئيسية", href: to("") },
                    { t: "الباقات والأسعار", href: to("#pricing") },
                    { t: "مساعد الاختيار", href: to("#server-finder") },
                    { t: "مقارنة السيرفرات", href: to("#servers-compare") },
                    { t: "مكتبة القنوات", href: to("#channels") },
                    { t: "كل القنوات (صفحة)", href: to("channels/") },
                    { t: "دليل التشغيل", href: to("#setup") },
                    { t: "مقالات ودلائل", href: to("blog/") },
                  ],
                },
                {
                  h: "السيرفرات",
                  l: [
                    { t: "سيرفر نوفا (Nova)", href: to("nova/"), server: "nova" as const },
                    { t: "سيرفر إيستار (iStar)", href: to("istar/"), server: "istar" as const },
                    { t: "سيرفر موكا (Moka)", href: to("moka/"), server: "moka" as const },
                    { t: "سيرفر X (XTV)", href: to("x/"), server: "x" as const },
                    { t: "دليل المشاهدة الرسمية", href: to("#live-player") },
                  ],
                },
                { h: "عن الموقع", l: [
                  { t: "من نحن", href: to("about/") },
                  { t: "تواصل وحالة الخدمة", href: to("status/") },
                  { t: "سياسة الخصوصية", href: to("privacy/") },
                  { t: "شروط الاستخدام", href: to("terms/") },
                  { t: "سياسة الاسترجاع", href: to("refund/") },
                  { t: "المشاهدة القانونية", href: to("watch-legal.html") },
                  { t: "التوقعات", href: to("predictions/") },
                  { t: "البحث", href: to("search/") },
                ] },
                { h: "المباريات", l: [
                  { t: "مواعيد المباريات", href: to("matches/") },
                  { t: "دوري أبطال أوروبا", href: to("matches/دوري-أبطال-أوروبا/") },
                  { t: "الدوري الإنجليزي", href: to("matches/الدوري-الإنجليزي/") },
                  { t: "الدوري الإسباني", href: to("matches/الدوري-الإسباني/") },
                  { t: "الدوري الألماني", href: to("matches/الدوري-الألماني/") },
                  { t: "الدوري الإيطالي", href: to("matches/الدوري-الإيطالي/") },
                  { t: "الدوري السعودي", href: to("matches/الدوري-السعودي/") },
                  { t: "الدوري المصري", href: to("matches/الدوري-المصري/") },
                  { t: "كأس العالم 2026", href: to("world-cup-2026/") },
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
                          {"server" in item && item.server ? (
                            <ServerIcon code={item.server} size={22} className="me-1.5" />
                          ) : null}
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
                    <a href={to("refund/")} className="hover:underline">راجع سياسة الاسترجاع</a>
                  </div>
                  <div className="flex items-center gap-2.5 text-white/65">
                    <IconZap className="w-5 h-5 text-[#d8ff3e] shrink-0" />
                    <span>اسأل عن خطوات التفعيل</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-white/65">
                    <IconClock className="w-5 h-5 text-[#7c5cff] shrink-0" />
                    <span>تواصل مع الدعم الفني</span>
                  </div>
                  <button
                    onClick={onOpenTrial}
                    className="mt-2 text-[#d8ff3e] font-black hover:underline cursor-pointer text-[13px]"
                  >
                    طلب فحص تجريبي
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* النشرة البريدية — على نمط Salient */}
          <div className="py-12 border-b border-white/10">
            <div className="max-w-md mx-auto text-center">
              <p className="font-display font-black text-[20px]">استفسر عن العروض</p>
              <p className="mt-2 text-[13.5px] text-white/45 font-medium leading-relaxed">
                أرسل طلبك عبر واتساب؛ لا يضيف هذا النموذج بريدك تلقائياً إلى نشرة بريدية.
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
                    aria-label="بريد التواصل في طلب واتساب"
                  />
                  <button
                    type="submit"
                    className="btn-slide slide-white shrink-0 bg-[#d8ff3e] text-black font-black text-[13.5px] px-6 py-2.5 rounded-full cursor-pointer"
                  >
                    أرسل الطلب
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
              يضم موقع <strong className="text-white/80">ستريم ماستر برو (Stream Master Pro)</strong> أدوات وروابط قد تقود إلى خدمات ومحتوى من جهات أخرى. تحقّق من مصدر المحتوى وحقوق المشاهدة في بلدك وشروط الخدمة قبل الاشتراك؛ عرض الرابط لا يثبت وجود ترخيص. للإبلاغ عن محتوى أو رابط، يرجى مراسلتنا عبر البريد الرسمي:{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-white/80 underline hover:text-[#d8ff3e]"
                dir="ltr"
              >
                {SUPPORT_EMAIL}
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
              <span>تختلف الجودة بحسب الجهاز والاتصال</span>
              <a
                href="#main-content"
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
