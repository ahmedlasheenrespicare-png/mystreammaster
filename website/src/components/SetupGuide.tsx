import { useState } from "react";
import { APPS_AND_DEVICES, getWhatsAppUrl } from "../data";
import {
  IconApple,
  IconChat,
  IconCheck,
  IconDevices,
  IconMonitor,
  IconPlay,
  IconQuote,
  IconTv,
} from "./Icons";
import { Reveal } from "./motion";
import { TESTIMONIALS } from "../data";

/* أيقونات الأجهزة */
const DEVICE_ICONS = [IconTv, IconDevices, IconApple, IconMonitor];
const DEVICE_LABELS = ["Smart TV", "Android Box", "Apple TV", "PC / Laptop"];

export default function SetupGuide() {
  const [activeDeviceIdx, setActiveDeviceIdx] = useState(0);

  const currentDevice = APPS_AND_DEVICES[activeDeviceIdx];

  return (
    <section
      id="setup"
      className="py-20 md:py-28 bg-white border-y border-black/10 relative overflow-hidden"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* النص والخطوات */}
        <div>
          <Reveal variant="start">
          <p className="text-[12px] font-black tracking-[0.25em] uppercase text-[#2b4eff] mb-4 flex items-center gap-2">
            <span className="w-8 h-[2px] bg-[#2b4eff] inline-block" /> سهولة التشغيل والضبط
          </p>
          <h2 className="font-display font-black tracking-tight leading-[1.15] text-[36px] md:text-[54px]">
            يعمل على <span className="font-serif italic font-normal">كل</span> شاشاتك
          </h2>
          <p className="mt-5 text-black/60 text-[15px] md:text-[16.5px] leading-relaxed font-medium max-w-lg">
            تثبيت سهل وخطوات واضحة في أقل من 3 دقائق، مع دعم فني خطوة بخطوة عبر واتساب على مدار
            الساعة.
          </p>
          </Reveal>

          {/* الخطوات الثلاث */}
          <ul className="mt-8 space-y-3.5">
            {[
              {
                t: "حمّل التطبيق المناسب",
                d: "من متجر تطبيقات جهازك (App Store / Google Play / LG Store).",
              },
              {
                t: "أدخل كود الاشتراك",
                d: "بيانات Xtream Codes (المستخدم وكلمة المرور والسيرفر) تصلك فوراً.",
              },
              {
                t: "استمتع بالبث المباشر",
                d: "القنوات والمكتبة تُحمّل فوراً — شاهد بجودة 4K مباشرة.",
              },
            ].map((s, i) => (
              <li key={s.t}>
                <Reveal variant="start" delay={i * 120} className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-[#d8ff3e] border border-black/10 grid place-items-center shrink-0 mt-0.5">
                  <IconCheck className="w-3.5 h-3.5" />
                </span>
                <div>
                  <p className="text-[15px] font-black">
                    <span className="font-latin text-black/35 ml-1">0{i + 1}</span> {s.t}
                  </p>
                  <p className="text-[13px] text-black/50 font-medium mt-0.5">{s.d}</p>
                </div>
                </Reveal>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={getWhatsAppUrl(
                `مرحبًا ستريم ماستر، أحتاج مساعدة في تشغيل الاشتراك على ${currentDevice.device}`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#0b0b0f] text-white font-black text-[14px] px-7 py-3.5 rounded-full hover:bg-[#2b4eff] transition"
            >
              <IconChat className="w-4 h-4" /> دعم التشغيل عبر واتساب
            </a>
            <a
              href="#server-finder"
              className="inline-flex items-center gap-2 bg-white border border-black/15 font-black text-[14px] px-7 py-3.5 rounded-full hover:border-black transition"
            >
              مساعد اختيار السيرفر
            </a>
          </div>
        </div>

        {/* معاينة الأجهزة التفاعلية */}
        <div className="relative">
          <div className="bg-[#0b0b0f] rounded-[28px] p-4 md:p-6 text-white overflow-hidden grain relative">
            <div className="absolute -top-20 -end-20 w-[320px] h-[320px] bg-[#7c5cff]/40 blur-[100px] rounded-full" />

            {/* مبدّل الأجهزة */}
            <div className="relative flex items-center justify-between mb-5 gap-3">
              <div className="flex gap-1 bg-white/10 rounded-full p-1">
                {APPS_AND_DEVICES.map((d, idx) => {
                  const Icon = DEVICE_ICONS[idx];
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveDeviceIdx(idx)}
                      aria-label={d.device}
                      className={`w-10 h-10 rounded-full grid place-items-center transition cursor-pointer ${
                        activeDeviceIdx === idx
                          ? "bg-[#d8ff3e] text-black"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      <Icon className="w-[17px] h-[17px]" />
                    </button>
                  );
                })}
              </div>
              <span className="text-[12px] font-latin text-white/50 hidden sm:block">
                {DEVICE_LABELS[activeDeviceIdx]}
              </span>
            </div>

            {/* بطاقة المعاينة */}
            <div className="relative flex justify-center min-h-[380px]">
              <div
                key={activeDeviceIdx}
                className={`animate-scale-in bg-white text-black rounded-2xl overflow-hidden w-full transition-all duration-500 ${
                  activeDeviceIdx === 0
                    ? "max-w-full"
                    : activeDeviceIdx === 1
                    ? "max-w-[420px]"
                    : activeDeviceIdx === 2
                    ? "max-w-[340px]"
                    : "max-w-[460px]"
                }`}
              >
                {/* شريط علوي */}
                <div className="h-9 bg-[#f4f3ef] border-b border-black/10 flex items-center px-4 gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-black/20" />
                    <span className="w-2 h-2 rounded-full bg-black/20" />
                    <span className="w-2 h-2 rounded-full bg-black/20" />
                  </div>
                  <span className="text-[10px] font-latin text-black/40 mx-auto">
                    {DEVICE_LABELS[activeDeviceIdx]}
                  </span>
                </div>

                <div className="p-5">
                  <div className="bg-[#d8ff3e] text-[9px] font-black px-2 py-1 rounded-full inline-block mb-3">
                    تفعيل فوري
                  </div>
                  <div className="font-display font-black leading-[1.2] tracking-tight text-2xl">
                    قنواتك على
                    <br />
                    كل شاشة.
                  </div>

                  {/* شبكة التطبيقات حسب الجهاز */}
                  <div
                    className={`grid gap-2 mt-4 ${
                      activeDeviceIdx === 2
                        ? "grid-cols-1"
                        : activeDeviceIdx === 1
                        ? "grid-cols-2"
                        : "grid-cols-3"
                    }`}
                  >
                    {currentDevice.apps.map((app) => (
                      <div
                        key={app}
                        className="rounded-xl border border-black/10 bg-[#faf9f6] px-2 py-2.5 text-center text-[10.5px] font-bold truncate"
                      >
                        ⭐ {app}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <div className="h-8 flex-1 bg-black rounded-full" />
                    <div className="h-8 flex-1 border border-black/15 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            <p className="relative mt-4 text-[12.5px] text-white/50 text-center font-medium">
              {currentDevice.desc}
            </p>
          </div>

          {/* شارة عائمة */}
          <div className="absolute -bottom-5 -start-5 bg-white border border-black/10 rounded-2xl shadow-xl px-4 py-3 flex items-center gap-2 rotate-[-4deg]">
            <IconPlay className="w-4 h-4 text-[#2b4eff]" />
            <p className="text-[13px] font-black">بدون فني — 3 دقائق فقط</p>
          </div>
        </div>
      </div>

      {/* اقتباس مدمج — على نمط اقتباسات الأصل داخل الأقسام */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <Reveal variant="up" className="max-w-[760px] mx-auto">
          <div className="flex items-start gap-4 bg-[#0b0b0f] text-white rounded-2xl p-5 text-right grain relative overflow-hidden">
            <IconQuote className="w-8 h-8 opacity-20 fill-white shrink-0 mt-1" />
            <div>
              <p className="text-[14.5px] font-bold leading-[1.8] text-white/80">
                "{TESTIMONIALS[3].review}"
              </p>
              <p className="mt-3 text-[13px] font-black">
                {TESTIMONIALS[3].name}
                <span className="text-white/45 font-bold"> — {TESTIMONIALS[3].city}</span>
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
