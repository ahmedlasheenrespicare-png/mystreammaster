import { to } from "../config";
import { IconArrowUpRight } from "./Icons";
import { Reveal } from "./motion";

const CHECKS = [
  {
    number: "01",
    title: "مصدر المحتوى وحقوقه",
    text: "تحقّق من الجهة التي توفّر المحتوى وحقها في توزيعه في بلدك، ومن شروط المشاهدة قبل الاشتراك.",
    href: "watch-legal.html",
    link: "دليل المشاهدة الرسمية",
  },
  {
    number: "02",
    title: "السعر وشروط الاسترجاع",
    text: "اطلب تأكيد السعر والعملة ومدة الاشتراك وطريقة التجديد كتابةً، واقرأ شروط الاسترجاع قبل الدفع.",
    href: "refund/",
    link: "سياسة الاسترجاع",
  },
  {
    number: "03",
    title: "الجهاز والشاشات المتزامنة",
    text: "تأكّد من توافق التطبيق مع جهازك، واسأل المزوّد عن عدد الشاشات التي يمكن تشغيلها في الوقت نفسه.",
    href: "faq/",
    link: "الأسئلة الشائعة",
  },
  {
    number: "04",
    title: "سرعة الاتصال وقت المشاهدة",
    text: "قِس سرعة التنزيل على الجهاز وفي الوقت الذي تشاهد فيه، مع مراعاة الأجهزة الأخرى التي تستخدم الشبكة.",
    href: "blog/internet-speed-for-video-streaming/",
    link: "دليل وحاسبة السرعة",
  },
];

/* يبقى المعرّف القديم reviews صالحاً للروابط المحفوظة، لكن لا تُعرض
   شهادات أو أرقام تقييمات حتى يتمكّن المالك من توثيقها. */
export default function BeforeSubscribe() {
  return (
    <section id="reviews" aria-labelledby="before-subscribe-title" className="py-20 md:py-28 bg-[#faf9f6] relative overflow-hidden">
      <div className="max-w-[1100px] mx-auto px-5">
        <Reveal variant="up" className="text-center mb-10">
          <p className="text-[12px] font-black tracking-[0.18em] text-[#2b4eff] mb-4">قبل الاشتراك</p>
          <h2 id="before-subscribe-title" className="font-display font-black tracking-tight leading-[1.15] text-[34px] md:text-[48px]">
            أربع خطوات تساعدك على الاختيار
          </h2>
          <p className="mt-4 text-black/60 text-[15px] md:text-[16px] leading-relaxed max-w-2xl mx-auto">
            قارن الخيارات التي تناسب جهازك واحتياجك، وتحقّق من الشروط والحقوق قبل الدفع.
          </p>
        </Reveal>
        <div className="grid sm:grid-cols-2 gap-4">
          {CHECKS.map((item, i) => (
            <Reveal key={item.number} variant="up" delay={i * 80}>
              <article className="h-full rounded-[24px] border border-black/10 bg-white p-6 sm:p-7">
                <span className="font-latin text-[12px] font-black text-[#2b4eff]">{item.number}</span>
                <h3 className="mt-3 text-[19px] font-black">{item.title}</h3>
                <p className="mt-2 text-[14px] leading-[1.9] text-black/65">{item.text}</p>
                <a href={to(item.href)} className="mt-4 inline-flex items-center gap-1 text-[13px] font-black text-[#1e3bbf] hover:underline">
                  {item.link} <IconArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
