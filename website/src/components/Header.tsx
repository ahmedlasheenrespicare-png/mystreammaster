import { useEffect, useState } from "react";
import {
  IconArrow,
  IconArrowUpRight,
  IconCart,
  IconChevronDown,
  IconClose,
  IconMenu,
  IconPlay,
  IconStar,
  IconZap,
} from "./Icons";
import { CURRENCIES, PRICING_PLANS, getWhatsAppUrl } from "../data";
import { to } from "../config";

interface HeaderProps {
  currentCurrency: string;
  onCurrencyChange: (code: string) => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenTrial: () => void;
}

/* =========================================================================
   شريط التنقل على طراز Salient: شريط إعلان علوي + كبسولة عائمة + قائمة ضخمة
========================================================================= */
/* الروابط:

   • أقسام الصفحة الرئيسية تُكتب كمرساة "#pricing" — والموجّه يعرف كيف يوصل
     الزائر إليها من أي صفحة أخرى (ينتقل للرئيسية ثم يمرّر للقسم)
   • الصفحات المستقلة (/channels و /blog) روابط حقيقية تُفهرس وتُشارَك */
const NAV_LINKS = [
  { name: "الباقات", href: "#pricing" },
  { name: "القنوات", href: to("channels/") },
  { name: "البث المباشر", href: "#live-player" },
  { name: "مقارنة السيرفرات", href: "#servers-compare" },
  { name: "مقالات ودلائل", href: to("blog/") },
];

/* ألوان مصغّرات السيرفرات داخل القائمة الضخمة */
const SERVER_STYLES: Record<string, { grad: string; emoji: string }> = {
  nova: { grad: "from-[#2b4eff] to-[#7c5cff]", emoji: "⚽" },
  ultra: { grad: "from-[#ffe3c7] to-[#ff9a3d]", emoji: "👑" },
  istar: { grad: "from-[#7c5cff] to-[#3effe0]", emoji: "🎬" },
  moka: { grad: "from-[#d8ff3e] to-[#3effe0]", emoji: "⚡" },
};

export default function Header({
  currentCurrency,
  onCurrencyChange,
  cartCount,
  onOpenCart,
  onOpenTrial,
}: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [mega, setMega] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); setMega(false); } };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);

  return (
    <>
      {/* الشريط الإعلاني العلوي */}
      <div className="fixed top-0 inset-x-0 z-[60] bg-[#0b0b0f] text-white text-[12.5px] font-medium">
        <div className="max-w-[1400px] mx-auto px-5 h-9 flex items-center justify-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 bg-[#d8ff3e] text-black text-[11px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
            <IconZap className="w-3 h-3" /> عرض 2026
          </span>
          <p className="tracking-tight opacity-90 truncate">
            تغطية كأس العالم 2026 والدوريات الكبرى —{" "}
            <span className="text-[#d8ff3e] font-bold">خصومات على جميع الباقات</span> + تجربة مجانية
          </p>
          <button
            onClick={onOpenTrial}
            className="hidden md:inline-flex items-center gap-1 underline underline-offset-4 decoration-[#d8ff3e] hover:text-[#d8ff3e] transition cursor-pointer"
          >
            اطلب التجربة الآن <IconArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* شريط التنقل الرئيسي — كبسولة عائمة */}
      <header
        className={`storefront-header fixed top-9 inset-x-0 z-[55] transition-all duration-500 ${
          scrolled ? "py-2" : "py-4"
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <nav
            className={`flex items-center justify-between gap-3 rounded-2xl px-4 sm:px-6 transition-all duration-500 border ${
              scrolled
                ? "bg-white/85 backdrop-blur-xl border-black/10 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)] h-[62px]"
                : "bg-white/60 backdrop-blur-md border-white/60 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] h-[68px]"
            }`}
          >
            {/* الشعار */}
            <a href="#hero" className="flex items-center gap-2.5 shrink-0 group">
              <span className="w-9 h-9 rounded-xl bg-[#0b0b0f] text-[#d8ff3e] grid place-items-center group-hover:rotate-[10deg] transition-transform">
                <IconPlay className="w-4 h-4 mr-0.5" />
              </span>
              <span className="font-display font-black text-[21px] tracking-tight leading-none">
                ستريم ماستر
                <span className="block text-[9.5px] font-sans font-bold tracking-[0.22em] uppercase text-black/50">
                  Stream Master Pro
                </span>
              </span>
            </a>

            {/* روابط سطح المكتب */}
            <div className="desktop-nav hidden xl:flex items-center gap-1 text-[14px] font-bold tracking-tight">
              {/* القائمة الضخمة — السيرفرات */}
              <div
                className="relative"
                onMouseEnter={() => setMega(true)}
                onMouseLeave={() => setMega(false)}
              >
                <button
                  onClick={() => setMega((m) => !m)}
                  aria-haspopup="menu"
                  aria-expanded={mega}
                  className="flex items-center gap-1 px-4 py-2.5 rounded-full hover:bg-black/[0.06] transition cursor-pointer"
                >
                  السيرفرات{" "}
                  <IconChevronDown
                    className={`w-4 h-4 transition-transform ${mega ? "rotate-180" : ""}`}
                  />
                  <span className="ml-1 text-[10px] bg-[#ff5c4d] text-white px-1.5 py-0.5 rounded-md font-black">
                    {PRICING_PLANS.length}
                  </span>
                </button>

                {mega && (
                  <div className="absolute top-full start-0 pt-4 w-[560px] animate-fade-in">
                    <div className="bg-white rounded-3xl border border-black/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.3)] p-4 grid grid-cols-4 gap-3">
                      {PRICING_PLANS.map((p) => {
                        const st = SERVER_STYLES[p.serverCode] || SERVER_STYLES.nova;
                        return (
                          <a
                            key={p.id}
                            href={to(`${p.serverCode}/`)}
                            onClick={() => setMega(false)}
                            className="group/m rounded-2xl overflow-hidden border border-black/10 hover:border-black transition"
                          >
                            <div
                              className={`aspect-[3/4] bg-gradient-to-br ${st.grad} grid place-items-center text-3xl group-hover/m:scale-110 transition duration-700`}
                            >
                              {st.emoji}
                            </div>
                            <div className="p-2.5 bg-white">
                              <p className="text-[12.5px] font-black leading-tight">
                                {p.serverName.split("(")[0].trim()}
                              </p>
                              <p className="text-[10.5px] text-black/50 font-bold mt-0.5 truncate">
                                {p.channelsCount}
                              </p>
                            </div>
                          </a>
                        );
                      })}
                      <div className="col-span-4 flex items-center justify-between bg-[#0b0b0f] text-white rounded-2xl px-5 py-3.5 mt-1">
                        <p className="text-[13px] font-bold">
                          سيرفرات أصلية — تفعيل فوري خلال 5 دقائق
                        </p>
                        <a
                          href="#pricing"
                          onClick={() => setMega(false)}
                          className="text-[12.5px] font-black bg-[#d8ff3e] text-black px-4 py-2 rounded-full hover:bg-white transition flex items-center gap-1"
                        >
                          عرض الباقات <IconArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {NAV_LINKS.map((l) => (
                <a
                  key={l.name}
                  href={l.href}
                  className="px-4 py-2.5 rounded-full hover:bg-black/[0.06] transition"
                >
                  {l.name}
                </a>
              ))}
            </div>

            {/* الإجراءات */}
            <div className="flex items-center gap-2">
              {/* محول العملة */}
              <select
                aria-label="اختر العملة"
                value={currentCurrency}
                onChange={(e) => onCurrencyChange(e.target.value)}
                className="h-10 cursor-pointer rounded-full border border-black/10 bg-white px-2.5 text-[12px] font-black text-black transition hover:border-black focus:outline-none focus:border-[#2b4eff]"
              >
                {Object.values(CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code}
                  </option>
                ))}
              </select>

              {/* السلة */}
              <button
                onClick={onOpenCart}
                aria-label="سلة المشتريات"
                className="relative w-10 h-10 rounded-full border border-black/10 grid place-items-center hover:bg-black hover:text-white transition cursor-pointer"
              >
                <IconCart className="w-[17px] h-[17px]" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -end-1 w-5 h-5 bg-[#ff5c4d] text-white text-[10px] font-black rounded-full grid place-items-center">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* زر الإعلان الأساسي */}
              <a
                href={getWhatsAppUrl("مرحبًا ستريم ماستر، أود الاستفسار عن باقات واشتراكات الـ IPTV")}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-slide slide-royal hidden sm:inline-flex items-center gap-2 bg-[#0b0b0f] text-white text-[13.5px] font-black px-5 py-2.5 rounded-full"
              >
                اشترك — من $25 <IconArrow className="w-4 h-4" />
              </a>

              {/* زر قائمة الموبايل */}
              <button
                onClick={() => setOpen(!open)}
                className="xl:hidden w-10 h-10 rounded-full bg-[#0b0b0f] text-white grid place-items-center cursor-pointer"
                aria-label="القائمة"
                aria-expanded={open}
                aria-controls="storefront-mobile-nav"
              >
                {open ? <IconClose className="w-[18px] h-[18px]" /> : <IconMenu className="w-[18px] h-[18px]" />}
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* قائمة الموبايل المنسدلة */}
      {open && (
        <div
          className="fixed inset-0 z-[54] bg-[#0b0b0f]/60 backdrop-blur-sm xl:hidden animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <div
            id="storefront-mobile-nav"
            className="absolute right-3 top-[125px] bottom-3 w-[86%] max-w-sm bg-[#faf9f6] rounded-3xl p-6 flex flex-col overflow-y-auto animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[11px] font-black tracking-[0.2em] uppercase text-black/40 mb-4">
              القائمة
            </p>
            {[
              { name: "الباقات", href: "#pricing" },
              { name: "البث المباشر", href: "#live-player" },
              { name: "القنوات", href: "#channels" },
              { name: "مقارنة السيرفرات", href: "#servers-compare" },
              { name: "مساعد الاختيار", href: "#server-finder" },
              { name: "الأسئلة الشائعة", href: "#faq" },
            ].map((l, i) => (
              <a
                key={l.name}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between py-4 border-b border-black/10 font-display font-black text-2xl tracking-tight hover:pr-2 transition-all"
              >
                {l.name}
                <span className="text-xs font-sans text-black/30 font-latin">
                  0{i + 1}
                </span>
              </a>
            ))}
            <button
              onClick={() => {
                setOpen(false);
                onOpenTrial();
              }}
              className="mt-6 bg-[#0b0b0f] text-white text-center font-black py-4 rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <IconZap className="w-4 h-4 text-[#d8ff3e]" /> اطلب تجربة مجانية
            </button>
            <div className="mt-4 flex items-center justify-center gap-1 text-[13px] text-black/60 font-bold">
              <IconStar className="w-3.5 h-3.5 fill-[#0b0b0f] text-[#0b0b0f]" /> 4.95/5 من
              4,820+ تقييم موثق
            </div>
          </div>
        </div>
      )}
    </>
  );
}
