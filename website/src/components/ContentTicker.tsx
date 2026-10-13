
/* =========================================================================
   جدارية الشعارات المائلة — على طريقة شريط القوالب في Salient
   صفان متعاكسان بحركة مستمرة وتوقف عند المرور
========================================================================= */

interface Brand {
  name: string;
  file: string;
  dark: boolean; // true = اللوجو فاتح → كارت غامق
}

/* الصف الأول: عربي ورياضة */
const ROW_ARABIC: Brand[] = [
  { name: "beIN Sports", file: "images/logos/bein.png", dark: false },
  { name: "SSC 1", file: "images/logos/ssc.png", dark: false },
  { name: "Alkass", file: "images/logos/alkass.png", dark: false },
  { name: "Abu Dhabi Sports", file: "images/logos/adsports.png", dark: true },
  { name: "MBC", file: "images/logos/mbc.png", dark: false },
  { name: "شاهد VIP", file: "images/logos/shahid.png", dark: false },
  { name: "Rotana", file: "images/logos/rotana.png", dark: true },
  { name: "OSN", file: "images/logos/osn.png", dark: false },
];

/* الصف الثاني: منصات عالمية */
const ROW_GLOBAL: Brand[] = [
  { name: "Netflix", file: "images/logos/netflix.png", dark: false },
  { name: "Apple TV+", file: "images/logos/appletv.png", dark: false },
  { name: "Paramount+", file: "images/logos/paramount.png", dark: false },
  { name: "HBO", file: "images/logos/hbo.png", dark: false },
  { name: "National Geographic", file: "images/logos/natgeo.png", dark: false },
  { name: "Discovery", file: "images/logos/discovery.png", dark: false },
  { name: "Cartoon Network", file: "images/logos/cartoon.png", dark: false },
];

/* تُستخدم في شريط الشعارات داخل الهيرو */
export const ALL_BRANDS: Brand[] = [...ROW_ARABIC, ...ROW_GLOBAL];

function LogoCard({ b }: { b: Brand }) {
  return (
    <div
      className={`group flex h-[78px] w-[210px] shrink-0 items-center justify-center rounded-2xl border px-6 transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.04] ${
        b.dark
          ? "border-white/10 bg-[#0b0b0f] hover:border-white/30"
          : "border-black/[0.08] bg-white hover:border-black/25 shadow-sm"
      }`}
    >
      <img
        src={b.file}
        alt={b.name}
        title={b.name}
        className="max-h-11 w-auto max-w-[124px] object-contain transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
    </div>
  );
}

export default function ContentTicker() {
  return (
    <section
      className="relative overflow-hidden bg-[#faf9f6] py-16 md:py-24"
      aria-label="القنوات والمنصات المتوفرة داخل الاشتراك"
    >
      <div className="mx-auto mb-10 max-w-[1370px] px-5">
        <div className="flex items-center justify-center gap-4">
          <span className="h-[2px] w-10 md:w-16 rounded-full bg-[#2b4eff]" />
          <p className="text-[12.5px] font-black tracking-[0.2em] uppercase text-[#2b4eff]">
            الترفيه بلا حدود
          </p>
          <span className="h-[2px] w-10 md:w-16 rounded-full bg-[#2b4eff]" />
        </div>

        <h2 className="mt-5 text-center font-display font-black tracking-tight leading-[1.2] text-[34px] md:text-[54px]">
          قنوات ومنصات <span className="font-serif italic font-normal">يعرفها العالم كله</span>
          <br />
          في اشتراك واحد
        </h2>

        <p className="mt-4 text-center text-[14px] font-bold text-black/50 md:text-[15px]">
          الرياضة والسينما والأطفال — كل العلامات الأشهر بين يديك
          <span className="mr-2 text-[11.5px] font-medium text-black/35">
            (مرّر على أي شريط للإيقاف المؤقت)
          </span>
        </p>
      </div>

      {/* الصفان المائلان بحركة متعاكسة */}
      <div className="relative py-4" dir="ltr">
        <div className="scale-[1.03] rotate-[1.2deg]">
          <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
            {[...ROW_ARABIC, ...ROW_ARABIC].map((b, i) => (
              <div key={`a-${i}`} className="pe-4">
                <LogoCard b={b} />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 scale-[1.03] -rotate-[1.1deg]">
          <div className="flex w-max animate-marquee-reverse hover:[animation-play-state:paused]">
            {[...ROW_GLOBAL, ...ROW_GLOBAL].map((b, i) => (
              <div key={`g-${i}`} className="pe-4">
                <LogoCard b={b} />
              </div>
            ))}
          </div>
        </div>

        {/* تلاشي ناعم عند الطرفين */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-[#faf9f6] to-transparent sm:w-24" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-[#faf9f6] to-transparent sm:w-24" />
      </div>

      <p className="relative mx-auto mt-8 max-w-[1370px] px-5 text-center text-[11.5px] leading-relaxed text-black/35">
        شعارات القنوات والمنصات علامات تجارية مسجلة مملوكة لأصحابها — وتُعرض هنا للدلالة على
        المحتوى المتوفر في الاشتراكات فقط
      </p>
    </section>
  );
}
