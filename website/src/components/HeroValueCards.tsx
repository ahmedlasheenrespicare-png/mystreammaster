import { ServerLink } from "./ServerIcon";
import { IconArrow, IconChat, IconClock, IconPlay, IconShieldCheck, IconTv, IconZap } from "./Icons";
import { getWhatsAppUrl, LOWEST_PLAN_PRICE_USD } from "../data";
import { Reveal } from "./motion";

/* =========================================================================
   بطاقات القيمة الثلاث — كانت داخل الهيرو أسفل الماكيت
   -------------------------------------------------------------------------
   صارت قسمًا مستقلًا (إعادة هيكلة الهيرو): بقيت بنفس التصميم والنصوص
   وبنفس الترتيب بعد الهيرو مباشرة، على الخلفية الكريمية نفسها فلا يظهر
   أي قطع بصري بين الشاشتين وبين البطاقات.
========================================================================= */

interface HeroValueCardsProps {
  onOpenTrial: () => void;
}

export default function HeroValueCards({ onOpenTrial }: HeroValueCardsProps) {
  return (
    <section id="hero-values" className="relative bg-[#faf9f6] pb-14 md:pb-16">
      <div className="max-w-[1200px] mx-auto px-5">
        {/* بطاقات القيمة الثلاث — تتابع صعود */}
        <div className="grid md:grid-cols-3 gap-4 text-right">
          <Reveal variant="up" delay={0} className="h-full">
            <div className="h-full rounded-[28px] bg-[#ffe3c7] border border-black/10 p-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-black text-[20px] tracking-tight flex items-center gap-2">
                    <IconZap className="w-5 h-5" /> فحص تجريبي مجاني
                  </h3>
                  <span className="w-9 h-9 rounded-xl bg-[#0b0b0f] text-[#d8ff3e] grid place-items-center">
                    <IconTv className="w-4 h-4" />
                  </span>
                </div>
                <p className="text-[13.5px] leading-[1.8] text-black/70 font-medium">
                  اختبر توافق التطبيق على جهازك واستقرار اتصال سيرفر المزود لمدة 6 ساعات مجاناً
                  قبل الشراء — بدون أي التزام مسبق.
                </p>
              </div>
              <button
                onClick={onOpenTrial}
                className="btn-slide slide-royal mt-6 inline-flex items-center justify-center gap-2 bg-[#0b0b0f] text-white font-black text-[13.5px] px-5 py-3 rounded-full cursor-pointer"
              >
                طلب كود تجريبي <IconArrow className="w-4 h-4" />
              </button>
            </div>
          </Reveal>

          <Reveal variant="up" delay={130} className="h-full">
            <div className="h-full rounded-[28px] bg-gradient-to-br from-[#2b4eff] to-[#7c5cff] text-white p-7 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute -top-16 -end-16 w-48 h-48 bg-white/20 blur-[70px] rounded-full" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-black text-[20px] tracking-tight flex items-center gap-2">
                    <ServerLink
                      code="nova"
                      label="قنوات المباريات وسيرفر نوفا"
                      size={26}
                      className="hover:underline underline-offset-4"
                    />
                  </h3>
                  <span className="w-9 h-9 rounded-xl bg-white/15 grid place-items-center">
                    <IconPlay className="w-4 h-4" />
                  </span>
                </div>
                <p className="text-[13.5px] leading-[1.8] text-white/85 font-medium">
                  سيرفرات المزودين (نوفا وإيستار وموكا وX) بدعم تقني كامل وجودة بث تصل إلى 4K
                  وسيرفرات احتياطية لدى المزود وقت الذروة.
                </p>
              </div>
              <div className="relative mt-6 flex items-center justify-between gap-3">
                <span className="text-[13.5px] font-black text-[#ffe3c7]">
                  باقات تبدأ من {LOWEST_PLAN_PRICE_USD} دولار / سنة
                </span>
                <a
                  href="#pricing"
                  className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 px-4 py-2 text-[12.5px] font-black rounded-full hover:bg-white hover:text-[#2b4eff] transition"
                >
                  عرض الأسعار <IconArrow className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </Reveal>

          <Reveal variant="up" delay={260} className="h-full">
            <div className="h-full rounded-[28px] bg-[#0b0b0f] text-white p-7 flex flex-col justify-between relative overflow-hidden grain">
              <div className="absolute -top-16 -start-16 w-48 h-48 bg-[#2b4eff]/40 blur-[70px] rounded-full" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-black text-[20px] tracking-tight flex items-center gap-2">
                    <IconShieldCheck className="w-5 h-5 text-[#3effe0]" /> ضمان الثبات والدعم 24/7
                  </h3>
                  <span className="w-9 h-9 rounded-xl bg-white/15 grid place-items-center">
                    <IconClock className="w-4 h-4" />
                  </span>
                </div>
                <ul className="divide-y divide-white/10 text-[12.5px]">
                  <li className="flex items-center justify-between py-2">
                    <span className="text-white/70 font-medium">خدمة العملاء والواتساب</span>
                    <span className="font-black text-[#3effe0]">متاح 24 ساعة</span>
                  </li>
                  <li className="flex items-center justify-between py-2">
                    <span className="text-white/70 font-medium">سرعة الرد والتفعيل</span>
                    <span className="font-black text-white">أقل من 3 دقائق</span>
                  </li>
                  <li className="flex items-center justify-between py-2">
                    <span className="text-white/70 font-medium">ضمان الاسترجاع</span>
                    <span className="font-black text-[#d8ff3e]">ضمان كامل ومستمر</span>
                  </li>
                </ul>
              </div>
              <a
                href={getWhatsAppUrl("مرحبًا ستريم ماستر، أريد التحدث مع الدعم الفني لطلب التفعيل التقني لدى المزود")}
                target="_blank"
                rel="noopener noreferrer"
                className="relative mt-5 flex items-center justify-center gap-2 bg-[#16a34a] hover:bg-[#15803d] py-3 text-[13px] font-black rounded-full transition"
              >
                <IconChat className="w-4 h-4" /> محادثة مباشرة عبر واتساب
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
