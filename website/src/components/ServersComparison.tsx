import { IconTrophy } from "./Icons";
import { ServerLink } from "./ServerIcon";
import { Reveal, useInViewOnce } from "./motion";

/* صفوف جدول المقارنة — كل صفّ بأربع قيم، وعلامة hidden تُخفي الصفّ من
   العرض مع إبقاء بياناته في المصدر (لا حذف: يكفي رفع العلامة لإعادته) */
type ComparisonRow = {
  feature: string;
  nova: string;
  istar: string;
  moka: string;
  x: string;
  hidden?: boolean;
};

export default function ServersComparison() {
  /* تتابع ظهور الصفوف — مثل جداول Salient */
  const { ref: tableRef, inView: tableIn } = useInViewOnce<HTMLDivElement>(0.1);
  const comparisonData: ComparisonRow[] = [
    {
      feature: "ثبات البث أثناء المباريات الكبرى",
      nova: "99.9% (الأعلى)",
      istar: "99.7%",
      moka: "99.9%",
      x: "99.9% (الأعلى)",
    },
    {
      feature: "البث الرياضي بدقة 4K & 50fps لدى المزود",
      nova: "✓ متاحة بكافة المصادر",
      istar: "✓ متاحة FHD & 4K",
      moka: "FHD & HD فقط",
      x: "✓ متاحة بكافة المصادر",
    },
    {
      feature: "تغطية البطولات العربية والخليجية لدى المزود",
      nova: "✓ متوفرة كاملة",
      istar: "✓ متوفرة",
      moka: "✓ متوفرة HD",
      x: "✓ متوفرة كاملة",
    },
    {
      /* بطلب المالك: إخفاء عدد الأجهزة/الشاشات من الجدول — كما أُخفي
         عدد الأجهزة من بطاقات السيرفرات في Pricing.tsx، والبيانات تبقى
         هنا في المصدر. للإرجاع: احذف hidden: true من هذا الصفّ. */
      hidden: true,
      feature: "عدد الشاشات في نفس الوقت",
      nova: "حتى 3 أجهزة",
      istar: "حتى جهازين",
      moka: "حتى جهازين",
      x: "حتى 3 أجهزة",
    },
    {
      feature: "مكتبة الأفلام والمسلسلات VOD",
      nova: "+50,000 فيلم ومسلسل",
      istar: "+50,000",
      moka: "+35,000",
      x: "+50,000 فيلم ومسلسل",
    },
    {
      feature: "أدنى سرعة إنترنت مطلوبة",
      nova: "10 - 15 ميجابت",
      istar: "8 - 12 ميجابت",
      moka: "4 - 8 ميجابت (اقتصادي)",
      x: "10 - 15 ميجابت",
    },
    {
      feature: "خاصية التايم شفت والترجمة",
      nova: "✓ مدعومة بالكامل",
      istar: "✓ مدعومة",
      moka: "مدعومة جزئياً",
      x: "✓ مدعومة بالكامل",
    },
    {
      feature: "سرعة التنقل بين القنوات",
      nova: "سريعة جداً (< 0.8s)",
      istar: "سريعة (< 1.2s)",
      moka: "عادية (< 1.5s)",
      x: "سريعة جداً (< 0.8s)",
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
          <table className="w-full text-right border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#0b0b0f] text-white">
                <th className="p-4 sm:p-5 text-[13.5px] sm:text-[14.5px] font-black">
                  الميزة / المواصفة
                </th>
                <th scope="col" className="p-4 sm:p-5 text-[13.5px] sm:text-[14.5px] font-black text-[#a5b4ff] bg-white/[0.04]">
                  <ServerLink code="nova" label="نوفا (Nova)" size={26} className="hover:underline underline-offset-4" />
                </th>
                <th scope="col" className="p-4 sm:p-5 text-[13.5px] sm:text-[14.5px] font-black text-[#c4b0ff] bg-white/[0.04]">
                  <ServerLink code="istar" label="إيستار (iStar)" size={26} className="hover:underline underline-offset-4" />
                </th>
                <th scope="col" className="p-4 sm:p-5 text-[13.5px] sm:text-[14.5px] font-black text-white/60">
                  <ServerLink code="moka" label="موكا (Moka)" size={26} className="hover:underline underline-offset-4" />
                </th>
                <th scope="col" className="p-4 sm:p-5 text-[13.5px] sm:text-[14.5px] font-black text-[#ff9296] bg-white/[0.04]">
                  <ServerLink code="x" label="سيرفر X (XTV)" size={26} className="hover:underline underline-offset-4" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.07] text-[13px]">
              {comparisonData.filter((row) => !row.hidden).map((row, idx) => (
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
                  <td className="p-4 sm:p-5 font-bold text-[#dc2626] bg-[#dc2626]/[0.04]">{row.x}</td>
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
