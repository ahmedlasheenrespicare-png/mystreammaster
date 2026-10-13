import { useEffect, useMemo, useState } from "react";
import { FEATURED_CHANNELS, getWhatsAppUrl, type ChannelItem } from "../data";
import { to } from "../config";
import { IconArrowUpRight, IconChat, IconSearch, IconTv, IconZap } from "../components/Icons";

/* =========================================================================
   صفحة كل القنوات — /channels
   • تُرسم مسبقاً وقت البناء بالقنوات المميّزة (تظهر لمحركات البحث فوراً)
   • ثم تُحمَّل القائمة الكاملة (933 قناة) في المتصفح عند الطلب
   • البحث والتصنيف و«تحميل المزيد» بلا أي مكتبة خارجية
========================================================================== */

const PAGE_SIZE = 60;

const CATEGORY_ORDER = [
  "قنوات MBC",
  "رياضية",
  "إخبارية",
  "عربية",
  "مصرية",
  "أفلام",
  "منوعات",
  "عالمية",
  "وثائقية",
  "دينية",
  "أطفال",
  "موسيقى",
];

export default function ChannelsPage() {
  const [channels, setChannels] = useState<ChannelItem[]>(FEATURED_CHANNELS);
  const [fullLoaded, setFullLoaded] = useState(false);
  const [category, setCategory] = useState("الكل");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  /* تحميل القائمة الكاملة بعد أول رسم */
  useEffect(() => {
    let cancelled = false;
    fetch(to("channels.json"))
      .then((r) => r.json())
      .then((data: { channels?: ChannelItem[] }) => {
        if (cancelled) return;
        const list = Array.isArray(data.channels) ? data.channels : [];
        const clean = list.filter((c) => c?.name && c?.url);
        if (clean.length > 0) {
          setChannels(clean);
          setFullLoaded(true);
        }
      })
      .catch(() => {
        /* نبقى على القنوات المميّزة */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const found = new Set(channels.map((c) => c.cat));
    const preferred = CATEGORY_ORDER.filter((c) => found.has(c));
    const extra = [...found].filter((c) => !CATEGORY_ORDER.includes(c)).sort();
    return ["الكل", ...preferred, ...extra];
  }, [channels]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return channels.filter((c) => {
      const byCat = category === "الكل" || c.cat === category;
      const bySearch = q === "" || c.name.toLowerCase().includes(q);
      return byCat && bySearch;
    });
  }, [channels, category, query]);

  const visible = filtered.slice(0, limit);

  return (
    <div className="bg-[#faf9f6] pt-[150px] md:pt-[168px] pb-20">
      <div className="max-w-[1370px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* الترويسة */}
        <nav className="text-[12.5px] font-bold text-black/40 mb-5" aria-label="مسار التصفح">
          <a href={to("")} className="hover:text-black transition">
            الرئيسية
          </a>
          <span className="mx-2">/</span>
          <span className="text-black/70">القنوات</span>
        </nav>

        <div className="max-w-[820px]">
          <p className="text-[12px] font-black tracking-[0.25em] uppercase text-[#2b4eff] mb-4 flex items-center gap-2">
            <span className="w-8 h-[2px] bg-[#2b4eff] inline-block" />
            <IconTv className="w-4 h-4" /> مكتبة القنوات
          </p>
          <h1 className="font-display font-black tracking-tight leading-[1.15] text-[34px] md:text-[52px]">
            كل القنوات المتوفرة{" "}
            <span className="font-serif italic font-normal">داخل الاشتراك</span>
          </h1>
          <p className="mt-4 text-[15px] md:text-[16.5px] text-black/60 font-medium leading-relaxed">
            ابحث بين آلاف القنوات الرياضية والإخبارية والعربية وقنوات الأطفال والوثائقيات،
            واختر التصنيف الذي يهمك. القنوات المجانية أدناه تُشاهد مباشرة من الموقع، أما باقات
            beIN وSSC والمنصات المدفوعة فمتاحة داخل الاشتراك.
          </p>
        </div>

        {/* أدوات التصفية */}
        <div className="mt-8 rounded-[24px] border border-black/10 bg-white p-4 sm:p-5 shadow-sm">
          <div className="relative mb-4">
            <IconSearch className="w-4 h-4 absolute start-4 top-1/2 -translate-y-1/2 text-black/35" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(PAGE_SIZE);
              }}
              placeholder="ابحث باسم القناة… (مثال: MBC، رياضة، أطفال، قرآن)"
              className="w-full rounded-full bg-[#faf9f6] border border-black/10 ps-11 pe-4 py-3 text-[14px] font-medium focus:border-[#2b4eff] focus:bg-white focus:outline-none transition"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 text-[12px] font-bold">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCategory(c);
                  setLimit(PAGE_SIZE);
                }}
                className={`px-3.5 py-2 rounded-full whitespace-nowrap transition cursor-pointer ${
                  category === c
                    ? "bg-[#0b0b0f] text-white font-black"
                    : "bg-white text-black/55 border border-black/10 hover:border-black hover:text-black"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <p className="mt-4 text-[12.5px] font-bold text-black/45">
            {filtered.length.toLocaleString("en-US")} قناة مطابقة
            {!fullLoaded && " — جاري تحميل القائمة الكاملة…"}
          </p>
        </div>

        {/* الشبكة */}
        {visible.length === 0 ? (
          <p className="mt-10 text-center text-[14px] font-bold text-black/40">
            لا توجد قنوات مطابقة لبحثك — جرّب كلمة أخرى أو اختر «الكل».
          </p>
        ) : (
          <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visible.map((c, i) => (
              <li
                key={`${c.cat}-${c.name}-${i}`}
                className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 hover:border-black/30 transition"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4f3ef] border border-black/10 text-lg">
                  {c.logo || "📺"}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-bold truncate">{c.name}</span>
                  <span className="block text-[11.5px] font-bold text-black/40">{c.cat}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        {visible.length < filtered.length && (
          <div className="mt-8 text-center">
            <button
              onClick={() => setLimit((l) => l + PAGE_SIZE)}
              className="btn-slide slide-royal inline-flex items-center gap-2 bg-[#0b0b0f] text-white font-black text-[14px] px-8 py-3.5 rounded-full cursor-pointer"
            >
              عرض المزيد (
              {Math.min(PAGE_SIZE, filtered.length - visible.length).toLocaleString("en-US")} قناة)
            </button>
          </div>
        )}

        {/* دعوة للاشتراك */}
        <div className="mt-14 rounded-[28px] bg-[#0b0b0f] text-white p-7 sm:p-10 grain relative overflow-hidden">
          <div className="absolute -top-20 -end-20 w-[320px] h-[320px] bg-[#2b4eff]/40 blur-[110px] rounded-full" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-[620px]">
              <h2 className="font-display font-black text-[24px] md:text-[32px] tracking-tight">
                هذه مجرد قائمة… القنوات المدفوعة داخل الباقة
              </h2>
              <p className="mt-3 text-white/60 text-[14.5px] leading-relaxed font-medium">
                قنوات beIN Sports وSSC الرياضية وباقات الأفلام والمسلسلات متوفرة داخل باقاتنا مع
                ثبات عالٍ وقت المباريات — جرّبها مجاناً قبل الاشتراك.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <a
                href={to("#pricing")}
                className="btn-slide slide-white inline-flex items-center gap-2 bg-[#d8ff3e] text-black font-black text-[14.5px] px-7 py-3.5 rounded-full"
              >
                <IconZap className="w-4 h-4" /> اختر باقتك
              </a>
              <a
                href={getWhatsAppUrl("مرحبًا، أريد تجربة مجانية للقنوات الرياضية")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-white/25 font-black text-[14.5px] px-7 py-3.5 rounded-full hover:bg-white hover:text-black transition"
              >
                <IconChat className="w-4 h-4" /> تجربة مجانية
              </a>
            </div>
          </div>
        </div>

        {/* روابط داخلية مفيدة للزائر ولمحركات البحث */}
        <div className="mt-10 grid sm:grid-cols-2 gap-3">
          <a
            href={to("blog/choose-iptv-server/")}
            className="group rounded-2xl border border-black/10 bg-white p-5 hover:border-black transition"
          >
            <span className="block font-black text-[15px]">
              كيف تختار السيرفر المناسب لسرعتك؟
            </span>
            <span className="mt-1 block text-[12.5px] text-black/50 font-medium">
              مقارنة عملية بين السيرفرات الأربعة
            </span>
            <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-black text-[#2b4eff]">
              اقرأ الدليل <IconArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </a>
          <a
            href={to("#live-player")}
            className="group rounded-2xl border border-black/10 bg-white p-5 hover:border-black transition"
          >
            <span className="block font-black text-[15px]">جرّب البث المباشر الآن</span>
            <span className="mt-1 block text-[12.5px] text-black/50 font-medium">
              شاهد القنوات المجانية من داخل الموقع مباشرة
            </span>
            <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-black text-[#2b4eff]">
              افتح المشغل <IconArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
