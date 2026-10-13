/* =========================================================================
   شريط الكلمة العملاقة — على نمط شريط DEMOS في الأصل
   صفوف متكررة بكلمة ضخمة مائلة بحركة مستمرة متعاكسة
========================================================================== */

export default function WordBand() {
  return (
    <section
      className="relative overflow-hidden bg-[#0b0b0f] py-10 md:py-14 -rotate-[1deg] scale-[1.02] my-2"
      aria-hidden="true"
    >
      {/* الصف الأول — نص مفرّغ يتحرك يميناً */}
      <div className="overflow-hidden" dir="ltr">
        <div className="flex w-max animate-marquee-slow items-baseline">
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="font-display font-black italic text-[72px] md:text-[110px] leading-none tracking-tight text-stroke-white whitespace-nowrap px-6"
            >
              شاهد • شاهد
            </span>
          ))}
        </div>
      </div>

      {/* الصف الثاني — كلمة مصمتة ليمونية تتحرك يساراً */}
      <div className="mt-3 overflow-hidden" dir="ltr">
        <div className="flex w-max animate-marquee-reverse items-baseline">
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="font-display font-black italic text-[72px] md:text-[110px] leading-none tracking-tight text-[#d8ff3e] whitespace-nowrap px-6"
            >
              قنوات • أفلام
            </span>
          ))}
        </div>
      </div>

      {/* توهج جانبي */}
      <div className="pointer-events-none absolute inset-y-0 start-0 w-24 bg-gradient-to-r from-[#0b0b0f] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 end-0 w-24 bg-gradient-to-l from-[#0b0b0f] to-transparent" />
    </section>
  );
}
