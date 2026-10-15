import { useEffect, useRef, useState, type ReactNode } from "react";
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
import { CURRENCIES, getWhatsAppUrl } from "../data";
import { to } from "../config";
import { counterpartPath } from "../i18n";
import { useRouter } from "../router";
import {
  HOME_SECTIONS,
  NAV_GROUPS,
  SERVER_PAGES,
  activeGroupKey,
  type NavGroup,
  type NavLink,
} from "../navigation.mjs";

interface HeaderProps {
  currentCurrency: string;
  onCurrencyChange: (code: string) => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenTrial: () => void;
}

/* =========================================================================
   الهيدر: شريط إعلان علوي + كبسولة عائمة بخمس قوائم منسدلة
   --------------------------------------------------------------------------
   الروابط كلها من src/navigation.mjs — نفس المصدر الذي يبني هيدر الصفحات
   القديمة، فتظهر كل صفحات الموقع في الهيدر أينما كان الزائر.
   • الرئيسية ▾          — كل أقسام الصفحة الرئيسية
   • السيرفرات والباقات ▾ — بطاقات السيرفرات + المتجر والسلة
   • القنوات والبث ▾      — القنوات، مشغّل الويب الذكي، كأس العالم، التوقعات…
   • المقالات ▾           — المدونة وأهم الدلائل
   • المساعدة ▾           — الأسئلة، حالة الخدمة، البحث، من نحن، السياسات
========================================================================= */

type GroupKey = NavGroup["key"];

/* أقسام الرئيسية روابط "/#pricing" — تعمل من أي صفحة (الموجّه ينقل ثم يمرّر)
   وتعمل أيضاً بلا JavaScript لأنها روابط حقيقية */
const sectionHref = (id: string) => to(`#${id}`);
const pageHref = (link: NavLink) => to(link.href);

export default function Header({
  currentCurrency,
  onCurrencyChange,
  cartCount,
  onOpenCart,
  onOpenTrial,
}: HeaderProps) {
  const { path } = useRouter();
  const activeKey = activeGroupKey(path) as GroupKey | "";
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openKey, setOpenKey] = useState<GroupKey | null>(null);
  const [mobileGroup, setMobileGroup] = useState<GroupKey | null>(activeKey || "home");
  const navRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const lastPointer = useRef("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Escape يغلق أي قائمة ويعيد التركيز لزر القائمة المفتوحة */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMobileOpen(false);
      setOpenKey((current) => {
        if (current) document.getElementById(`nav-trigger-${current}`)?.focus();
        return null;
      });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* الضغط خارج الهيدر يغلق القائمة المنسدلة */
  useEffect(() => {
    if (!openKey) return;
    const onDown = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setOpenKey(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openKey]);

  /* أي تنقّل يغلق القوائم ويفتح مجموعة الصفحة الحالية في قائمة الجوال */
  useEffect(() => {
    setOpenKey(null);
    setMobileOpen(false);
    setMobileGroup((activeGroupKey(path) as GroupKey) || "home");
  }, [path]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  /* الفتح بالتمرير للفأرة فقط — اللمس يعتمد على الضغط (onClick) */
  const hoverOpen = (key: GroupKey) => (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    window.clearTimeout(closeTimer.current);
    setOpenKey(key);
  };
  const hoverClose = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenKey(null), 140);
  };
  const close = () => setOpenKey(null);

  /* إغلاق القائمة عند خروج التركيز منها بلوحة المفاتيح (Tab) */
  const onBlurGroup = (e: React.FocusEvent<HTMLDivElement>) => {
    const group = e.currentTarget.dataset.group;
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setOpenKey((k) => (k && group === k ? null : k));
    }
  };

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
            <span className="text-[#d8ff3e] font-bold">خصومات على باقات التفعيل التقني</span> + فحص تجريبي مجاني
          </p>
          <button
            onClick={onOpenTrial}
            className="hidden md:inline-flex items-center gap-1 underline underline-offset-4 decoration-[#d8ff3e] hover:text-[#d8ff3e] transition cursor-pointer"
          >
            طلب كود تجريبي <IconArrowUpRight className="w-3.5 h-3.5" />
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
            aria-label="القائمة الرئيسية"
            className={`flex items-center justify-between gap-3 rounded-2xl px-4 sm:px-6 transition-all duration-500 border ${
              scrolled
                ? "bg-white/85 backdrop-blur-xl border-black/10 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)] h-[62px]"
                : "bg-white/60 backdrop-blur-md border-white/60 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] h-[68px]"
            }`}
          >
            {/* الشعار */}
            <a href={to("")} className="flex items-center gap-2.5 shrink-0 group" aria-label="ستريم ماستر — الصفحة الرئيسية">
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

            {/* القوائم المنسدلة — سطح المكتب */}
            <div
              ref={navRef}
              className="desktop-nav hidden xl:flex items-center gap-0.5 text-[14px] font-bold tracking-tight"
            >
              {NAV_GROUPS.map((group) => {
                const isOpen = openKey === group.key;
                const isActive = activeKey === group.key;
                return (
                  <div
                    key={group.key}
                    data-group={group.key}
                    className="relative"
                    onPointerEnter={hoverOpen(group.key)}
                    onPointerLeave={hoverClose}
                    onBlur={onBlurGroup}
                  >
                    <button
                      id={`nav-trigger-${group.key}`}
                      type="button"
                      onPointerDown={(e) => {
                        lastPointer.current = e.pointerType;
                      }}
                      onClick={(e) => {
                        /* الفأرة فتحت القائمة بالتمرير أصلاً → الضغط يُبقيها مفتوحة؛
                           اللمس ولوحة المفاتيح يبدّلان الحالة */
                        const viaMouse = e.detail > 0 && lastPointer.current === "mouse";
                        lastPointer.current = "";
                        setOpenKey((k) => (viaMouse || k !== group.key ? group.key : null));
                      }}
                      aria-expanded={isOpen}
                      aria-controls={`nav-panel-${group.key}`}
                      className={`relative flex items-center gap-1 px-3.5 py-2.5 rounded-full transition cursor-pointer ${
                        isOpen ? "bg-black/[0.07]" : "hover:bg-black/[0.06]"
                      }`}
                    >
                      {group.label}
                      <IconChevronDown
                        className={`w-3.5 h-3.5 opacity-60 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#2b4eff]"
                        />
                      )}
                    </button>

                    {isOpen && (
                      <div
                        id={`nav-panel-${group.key}`}
                        className={`absolute top-full pt-3 animate-fade-in ${
                          group.key === "home" || group.key === "servers" ? "start-0" : "start-1/2 translate-x-1/2"
                        }`}
                      >
                        <div className="bg-white rounded-3xl border border-black/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.3)] p-3">
                          <DesktopPanel group={group} onNavigate={close} onOpenTrial={onOpenTrial} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* الإجراءات */}
            <div className="flex items-center gap-2">
              {/* مبدّل اللغة — للصفحات التجارية الإنجليزية */}
              <a
                href={to(counterpartPath(path).replace(/^\//, ""))}
                hrefLang="en"
                aria-label="English version"
                className="h-10 inline-flex items-center rounded-full border border-black/10 bg-white px-3 text-[12px] font-black tracking-wide transition hover:border-black"
              >
                EN
              </a>

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
                href={getWhatsAppUrl("مرحبًا ستريم ماستر، أود الاستفسار عن باقات التفعيل التقني لدى المزود")}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-slide slide-royal hidden sm:inline-flex items-center gap-2 bg-[#0b0b0f] text-white text-[13.5px] font-black px-5 py-2.5 rounded-full"
              >
                اطلب التفعيل — من $25 <IconArrow className="w-4 h-4" />
              </a>

              {/* زر قائمة الجوال */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="xl:hidden w-10 h-10 rounded-full bg-[#0b0b0f] text-white grid place-items-center cursor-pointer"
                aria-label="القائمة"
                aria-expanded={mobileOpen}
                aria-controls="storefront-mobile-nav"
              >
                {mobileOpen ? <IconClose className="w-[18px] h-[18px]" /> : <IconMenu className="w-[18px] h-[18px]" />}
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* قائمة الجوال — مجموعات قابلة للطي (مجموعة الصفحة الحالية مفتوحة) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[54] bg-[#0b0b0f]/60 backdrop-blur-sm xl:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        >
          <div
            id="storefront-mobile-nav"
            className="absolute right-3 top-[125px] bottom-3 w-[88%] max-w-sm bg-[#faf9f6] rounded-3xl p-5 flex flex-col overflow-y-auto overscroll-contain animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[11px] font-black tracking-[0.2em] uppercase text-black/40 mb-2 px-1">
              القائمة
            </p>
            {NAV_GROUPS.map((group) => {
              const expanded = mobileGroup === group.key;
              return (
                <div key={group.key} className="border-b border-black/10">
                  <button
                    type="button"
                    onClick={() => setMobileGroup(expanded ? null : group.key)}
                    aria-expanded={expanded}
                    aria-controls={`mobile-group-${group.key}`}
                    className="w-full flex items-center justify-between py-3.5 px-1 font-display font-black text-[19px] tracking-tight cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      {group.label}
                      {activeKey === group.key && (
                        <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[#2b4eff]" />
                      )}
                    </span>
                    <IconChevronDown
                      className={`w-4 h-4 opacity-50 transition-transform ${expanded ? "rotate-180" : ""}`}
                    />
                  </button>
                  {expanded && (
                    <div id={`mobile-group-${group.key}`} className="pb-3 grid gap-0.5">
                      {mobileLinks(group).map((l) => (
                        <a
                          key={l.href}
                          href={l.href}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-bold hover:bg-black/[0.05] transition"
                        >
                          {l.icon && <span aria-hidden="true" className="w-6 text-center">{l.icon}</span>}
                          <span>{l.label}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <button
              onClick={() => {
                setMobileOpen(false);
                onOpenTrial();
              }}
              className="mt-5 bg-[#0b0b0f] text-white text-center font-black py-4 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <IconZap className="w-4 h-4 text-[#d8ff3e]" /> طلب كود تجريبي
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

/* روابط مجموعة واحدة بصيغة مسطّحة — لقائمة الجوال */
function mobileLinks(group: NavGroup): { href: string; label: string; icon?: string }[] {
  if (group.key === "home") {
    return [
      { href: to(""), label: "الصفحة الرئيسية", icon: "🏠" },
      ...HOME_SECTIONS.map((s) => ({ href: sectionHref(s.id), label: s.label, icon: s.icon })),
    ];
  }
  if (group.key === "servers") {
    return [
      ...group.links.slice(0, 1).map((l) => ({ href: pageHref(l), label: l.label, icon: "🗂️" })),
      ...SERVER_PAGES.map((s) => ({ href: to(`${s.code}/`), label: s.label, icon: s.emoji })),
      ...group.links.slice(1).map((l) => ({ href: pageHref(l), label: l.label, icon: l.href === "cart/" ? "🛒" : "🏬" })),
    ];
  }
  return [...group.links, ...(group.legal ?? [])].map((l) => ({ href: pageHref(l), label: l.label }));
}

/* محتوى القائمة المنسدلة لكل مجموعة على سطح المكتب */
function DesktopPanel({
  group,
  onNavigate,
  onOpenTrial,
}: {
  group: NavGroup;
  onNavigate: () => void;
  onOpenTrial: () => void;
}) {
  if (group.key === "home") {
    return (
      <div className="w-[640px]">
        <div className="grid grid-cols-3 gap-1">
          {HOME_SECTIONS.map((s) => (
            <PanelLink key={s.id} href={sectionHref(s.id)} label={s.label} desc={s.desc} icon={s.icon} onNavigate={onNavigate} />
          ))}
        </div>
        <PanelFooter>
          <a href={to("")} onClick={onNavigate} className="text-[13px] font-bold hover:text-[#d8ff3e] transition">
            الصفحة الرئيسية — العودة للأعلى
          </a>
          <button
            type="button"
            onClick={() => {
              onNavigate();
              onOpenTrial();
            }}
            className="text-[12.5px] font-black bg-[#d8ff3e] text-black px-4 py-2 rounded-full hover:bg-white transition flex items-center gap-1 cursor-pointer"
          >
            <IconZap className="w-3.5 h-3.5" /> طلب كود تجريبي
          </button>
        </PanelFooter>
      </div>
    );
  }

  if (group.key === "servers") {
    return (
      <div className="w-[560px]">
        <div className="grid grid-cols-3 gap-2.5">
          {SERVER_PAGES.map((s) => (
            <a
              key={s.code}
              href={to(`${s.code}/`)}
              onClick={onNavigate}
              className="group/m rounded-2xl overflow-hidden border border-black/10 hover:border-black transition"
            >
              <div
                className={`h-[88px] bg-gradient-to-br ${s.grad} grid place-items-center text-3xl overflow-hidden`}
              >
                <span className="group-hover/m:scale-125 transition duration-500">{s.emoji}</span>
              </div>
              <div className="p-2.5 bg-white">
                <p className="text-[13px] font-black leading-tight">{s.label}</p>
                <p className="text-[11px] text-black/50 font-bold mt-0.5 truncate">{s.desc}</p>
              </div>
            </a>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1 mt-2">
          {group.links.map((l) => (
            <PanelLink key={l.href} href={pageHref(l)} label={l.label} desc={l.desc} onNavigate={onNavigate} />
          ))}
        </div>
        <PanelFooter>
          <p className="text-[13px] font-bold">سيرفرات مزودين عالية الثبات — تفعيل ودعم فوري خلال 5 دقائق</p>
          <a
            href={sectionHref("pricing")}
            onClick={onNavigate}
            className="text-[12.5px] font-black bg-[#d8ff3e] text-black px-4 py-2 rounded-full hover:bg-white transition flex items-center gap-1"
          >
            عرض الأسعار <IconArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </PanelFooter>
      </div>
    );
  }

  if (group.key === "tournaments") {
    /* شبكة ثلاثية بعرض لوحة الرئيسية — 11 صفحة بطولة ومنتخب في صفوف مرتّبة */
    return (
      <div className="w-[640px]">
        <div className="grid grid-cols-3 gap-1">
          {group.links.map((l) => (
            <PanelLink key={l.href} href={pageHref(l)} label={l.label} desc={l.desc} icon={l.icon} onNavigate={onNavigate} />
          ))}
        </div>
        <PanelFooter>
          <a href={to("matches/")} onClick={onNavigate} className="text-[13px] font-bold hover:text-[#d8ff3e] transition">
            كل مواعيد المباريات — التقويم الكامل
          </a>
          <a
            href={to("world-cup-2026/")}
            onClick={onNavigate}
            className="text-[12.5px] font-black bg-[#d8ff3e] text-black px-4 py-2 rounded-full hover:bg-white transition"
          >
            كأس العالم 2026 <IconArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </PanelFooter>
      </div>
    );
  }

  return (
    <div className="w-[300px]">
      <div className="grid gap-0.5">
        {group.links.map((l) => (
          <PanelLink key={l.href} href={pageHref(l)} label={l.label} desc={l.desc} onNavigate={onNavigate} />
        ))}
      </div>
      {group.legal && (
        <div className="mt-2 pt-2.5 px-3 border-t border-black/10 flex items-center gap-3 text-[12px] font-bold text-black/50">
          {group.legal.map((l) => (
            <a key={l.href} href={pageHref(l)} onClick={onNavigate} className="hover:text-black transition">
              {l.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function PanelLink({
  href,
  label,
  desc,
  icon,
  onNavigate,
}: {
  href: string;
  label: string;
  desc?: string;
  icon?: string;
  onNavigate: () => void;
}) {
  return (
    <a
      href={href}
      onClick={onNavigate}
      className="group/l flex items-start gap-2.5 rounded-2xl px-3 py-2.5 hover:bg-[#f4f3ef] transition"
    >
      {icon && (
        <span
          aria-hidden="true"
          className="w-8 h-8 shrink-0 rounded-xl bg-[#f4f3ef] group-hover/l:bg-white grid place-items-center text-[15px] transition"
        >
          {icon}
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-[13.5px] font-black leading-snug">{label}</span>
        {desc && <span className="block text-[11.5px] font-medium text-black/50 leading-snug mt-0.5">{desc}</span>}
      </span>
    </a>
  );
}

function PanelFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-[#0b0b0f] text-white rounded-2xl px-5 py-3 mt-2">
      {children}
    </div>
  );
}
