import { IconTrophy } from "./Icons";
import { Reveal, useInViewOnce } from "./motion";

export default function ServersComparison() {
  /* تتابع ظهور الصفوف — مثل جداول Salient */
  const { ref: tableRef, inView: tableIn } = useInViewOnce<HTMLDivElement>(0.1);
  const comparisonData = [
    {
      feature: "ثبات البث أثناء المباريات الكبرى",
      nova: "99.9% (الأعلى)",
      ultra: "99.9% (VIP مخصص)",
      istar: "99.7%",
      moka: "99.9%",
    },
    {
      feature: "قنوات beIN Sports 4K & 50fps",
      nova: "✓ متاحة بكافة المصادر",
      ultra: "✓ 4K أصلية فائقة Bitrate",
      istar: "✓ متاحة FHD & 4K",
      moka: "FHD & HD فقط",
    },
    {
      feature: "قنوات SSC الرياضية السعودية",
      nova: "✓ متوفرة كاملة",
      ultra: "✓ متوفرة 4K",
      istar: "✓ متوفرة",
      moka: "✓ متوفرة HD",
    },
    {
      feature: "عدد الشاشات في نفس الوقت",
      nova: "حتى 3 أجهزة",
      ultra: "شاشتان معاً (Dual)",
      istar: "حتى جهازين",
      moka: "حتى جهازين",
    },
    {
      feature: "مكتبة الأفلام والمسلسلات VOD",
      nova: "+50,000 فيلم ومسلسل",
      ultra: "+85,000 (طلب خاص)",
      istar: "+50,000",
      moka: "+35,000",
    },
    {
      feature: "أدنى سرعة إنترنت مطلوبة",
      nova: "10 - 15 ميجابت",
      ultra: "20 - 30 ميجابت",
      istar: "8 - 12 ميجابت",
      moka: "4 - 8 ميجابت (اقتصادي)",
    },
    {
      feature: "خاصية التايم شفت والترجمة",
      nova: "✓ مدعومة بالكامل",
      ultra: "✓ مدعومة فائقة السرعة",
      istar: "✓ مدعومة",
      moka: "مدعومة جزئياً",
    },
    {
      feature: "سرعة التنقل بين القنوات",
      nova: "سريعة جداً (< 0.8s)",
      ultra: "فائقة السرعة (< 0.4s)",
      istar: "سريعة (< 1.2s)",
      moka: "عادية (< 1.5s)",
    },
  ];

  return (
    <section id="servers-compare" className="py-20 md:py-28 bg-[#faf9f6] relative">
      <div className="max-w-[1370px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* الترويسة */}
        <Reveal variant="up" className="text-center max-w-[700px] mx-auto mb-12 md:mb-16">
          <p className="text-[12px] font-black tracking-[0.25em] uppercase text-[#7c5cff] mb-4 flex items-center justify-center gap-2">
            <span className="w-8 h-[2px] bg-[#7c5cff] inline-block" />
            <IconTrophy className="w-4 h-4" /> جدول المقارنة الشامل
          </p>
          <h2 className="font-display font-black tracking-tight leading-[1.15] text-[34px] md:text-[52px]">
            مقارنة <span className="font-serif italic font-normal">دقيقة</span> بين السيرفرات
          </h2>
          <p className="mt-4 text-[15px] md:text-[16px] text-black/60 font-medium leading-relaxed">
            اطلع على الفروقات الفنية والتقنية لاختيار السيرفر الأنسب لاحتياجاتك بدقة.
          </p>
        </Reveal>

        {/* الجدول */}
        <Reveal variant="up" delay={120} duration={800}>
        <div
          ref={tableRef}
          className="rounded-[28px] border border-black/10 bg-white overflow-hidden shadow-[0_40px_90px_-40px_rgba(0,0,0,0.3)] overflow-x-auto"
        >
          <table className="w-full text-right border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-[#0b0b0f] text-white">
                <th className="p-4 sm:p-5 text-[13.5px] sm:text-[14.5px] font-black">
                  الميزة / المواصفة
                </th>
                <th className="p-4 sm:p-5 text-[13.5px] sm:text-[14.5px] font-black text-[#a5b4ff] bg-white/[0.04]">
                  نوفا (Nova) ⚽
                </th>
                <th className="p-4 sm:p-5 text-[13.5px] sm:text-[14.5px] font-black text-[#c4b0ff] bg-white/[0.04]">
                  إيستار (iStar) 🎬
                </th>
                <th className="p-4 sm:p-5 text-[13.5px] sm:text-[14.5px] font-black text-white/60">
                  موكا (Moka) ⚡
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.07] text-[13px]">
              {comparisonData.map((row, idx) => (
                <tr
                  key={idx}
                  style={{ transitionDelay: `${idx * 70}ms` }}
                  className={`tr-rv ${tableIn ? "tr-rv-in" : ""} hover:bg-[#d8ff3e]/[0.15] transition-colors`}
                >
                  <td className="p-4 sm:p-5 font-black bg-[#f4f3ef]">{row.feature}</td>
                  <td className="p-4 sm:p-5 font-black text-[#2b4eff] bg-[#2b4eff]/[0.04]">
                    {row.nova}
                  </td>
                  <td className="p-4 sm:p-5 font-bold text-[#6d28d9] bg-[#7c5cff]/[0.04]">
                    {row.istar}
                  </td>
                  <td className="p-4 sm:p-5 font-bold text-black/60">{row.moka}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </Reveal>

        {/* ملاحظة أسفل الجدول */}
        <p className="mt-6 text-center text-[12.5px] text-black/40 font-medium">
          محتار من أين تبدأ؟ جرّب مساعد الاختيار الذكي أعلاه أو اطلب تجربة مجانية وقرر بنفسك.
        </p>
      </div>
    </section>
  );
}
