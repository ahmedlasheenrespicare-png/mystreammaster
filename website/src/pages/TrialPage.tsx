import { useState } from "react";
import { TRIAL_FAQS } from "../data";
import { SERVER_PAGES } from "../navigation.mjs";
import { to, WHATSAPP_NUMBER } from "../config";
import {
  IconChat,
  IconCheck,
  IconClock,
  IconDevices,
  IconPlus,
  IconShieldCheck,
  IconZap,
} from "../components/Icons";
import { Reveal } from "../components/motion";

/* ==========================================================================
   صفحة هبوط التجربة المجانية — /trial
   • تستهدف نية «تجربة IPTV مجانية 6 ساعات»: فوائد وشروط وخطوات ظاهرة كلها
     في HTML المُرسَل من الخادم (لا نص يظهر بعد ضغطة أو خلف JavaScript).
   • حقائق الصفحة من نموذج طلب التجربة نفسه: كود فحص يصدره المزود الخارجي،
     استلام عبر واتساب خلال دقائق، بدون أي دفع قبل الفحص.
   • زر الطلب يفتح نموذج التجربة الحالي نفسه (App/TrialModal) — لا جمع
     بيانات جديداً: الجهاز والسيرفر يصلاننا برسالة واتساب يرسلها الزائر.
========================================================================== */

/* ماذا تفحص خلال ساعات التجربة — فوائد عملية قبل أي دفع */
const TRIAL_CHECKS = [
  {
    icon: IconDevices,
    title: "توافق جهازك والمشغّل",
    text: "شغّل بيانات التجربة على الشاشة أو الجهاز الذي ستعتمد عليه فعلياً، وتأكد أن تطبيق المشغّل يعمل عليه بسلاسة قبل أي اشتراك.",
  },
  {
    icon: IconZap,
    title: "ثبات البث وقت الذروة",
    text: "جرّب أثناء مباراة مهمة أو في أوقات الذروة المسائية، فهذا هو الاختبار الحقيقي لاستقرار سيرفر المزود على اتصالك.",
  },
  {
    icon: IconShieldCheck,
    title: "جودة الصورة على سرعتك",
    text: "افحص وضوح الصورة بجودات SD وHD وFHD و4K بحسب سرعة اتصالك الحالية، ولاحظ استهلاك البيانات على باقتك.",
  },
  {
    icon: IconClock,
    title: "سرعة التنقل وتنظيم القائمة",
    text: "تنقّل بين القنوات والتصنيفات ولاحظ سرعة الاستجابة وسهولة الوصول، سواء برابط M3U أو ببيانات Xtream Codes.",
  },
];

/* خطوات الحصول على كود التجربة — نفس مسار النموذج الحالي */
const TRIAL_STEPS = [
  {
    title: "اختر جهازك والسيرفر",
    text: "حدّد نوع جهازك، والسيرفر الأقرب لاحتياجك: نوفا للمباريات والرياضة، إيستار للأفلام والمسلسلات والترفيه، وموكا للسرعات المحدودة واستهلاك البيانات الاقتصادي.",
  },
  {
    title: "أرسل الطلب عبر واتساب",
    text: "زر واحد في هذه الصفحة يفتح نموذج الطلب القصير، وتصلنا رسالتك جاهزة بنوع الجهاز والسيرفر المطلوب — دون تسجيل حساب ودون أي دفع.",
  },
  {
    title: "استلم بيانات التجربة",
    text: "يُصدر المزود الخارجي كود التجربة، وتصلك بياناته (رابط M3U أو بيانات Xtream Codes) عبر واتساب خلال دقائق — عادة أقل من 5 دقائق — مع شرح إعداد المشغّل خطوة بخطوة.",
  },
  {
    title: "شغّل وافحص 6 ساعات",
    text: "فعّل البيانات على جهازك وافحص الجودة والثبات والتنقل بين القنوات، وفريق الدعم الفني جاهز لمساعدتك في ضبط الإعدادات أثناء التجربة.",
  },
  {
    title: "قرّر بلا أي ضغط",
    text: "إن رضيت عن الأداء، اطلب باقة التفعيل والربط التقني للسيرفر الذي جرّبته. وإن لم يناسبك، تنتهي التجربة من تلقاء نفسها دون خصم أو التزام.",
  },
];

/* شروط التجربة — كما تجري فعلياً، بلا وعود لا نملكها */
const TRIAL_CONDITIONS = [
  "المدة: 6 ساعات كاملة من إصدار كود التجربة، وتنتهي صلاحيته بعدها تلقائياً.",
  "الإصدار: كود التجربة وبياناته صادرة عن المزود الخارجي المستقل لكل سيرفر؛ دور ستريم ماستر برو هو الربط التقني ومساعدتك في إعداد المشغّل.",
  "الاستلام: عبر واتساب خلال دقائق من إرسال الطلب (عادة أقل من 5 دقائق)، مع إرشادات الإعداد المناسبة لجهازك.",
  "الدفع: لا يُطلب أي مبلغ ولا بطاقة ائتمانية قبل التجربة أو خلالها، ولا يوجد أي تجديد تلقائي بعد انتهائها.",
  "التوافق: جرّب على الجهاز الذي ستعتمد عليه فعلياً، وفي أوقات الذروة إن أمكن، لتصل إلى نتيجة واقعية عن الأداء على اتصالك.",
  "المحتوى المشفّر يُشاهد عبر اشتراكات الجهات الرسمية المالكة له فقط — راجع دليل المشاهدة الرسمية لخيارات الاشتراك الرسمي.",
];

export default function TrialPage({ onOpenTrial }: { onOpenTrial: () => void }) {
  const [openKey, setOpenKey] = useState<number | null>(0);
  const waTrialText = encodeURIComponent("مرحباً، أود طلب كود تجربة مجانية 6 ساعات لفحص التوافق على جهازي");

  return (
    <div className="pt-[140px]">
      <nav
        className="max-w-[860px] mx-auto px-5 text-[12.5px] font-bold text-black/40 pt-6"
        aria-label="مسار التصفح"
      >
        <a href={to("")} className="hover:text-black transition">الرئيسية</a>
        <span className="mx-2">/</span>
        <span className="text-black/70">التجربة المجانية</span>
      </nav>

      {/* ===== الترويسة ===== */}
      <section className="py-14 md:py-20 bg-[#faf9f6]">
        <div className="max-w-[860px] mx-auto px-5 text-center">
          <p className="text-[12px] font-black tracking-[0.25em] uppercase text-black/40 mb-4">
            تجربة مجانية — افحص قبل أن تشترك
          </p>
          <h1 className="font-display font-black tracking-tight leading-[1.15] text-[36px] md:text-[52px]">
            تجربة IPTV مجانية <span className="font-serif italic font-normal">6 ساعات</span>
          </h1>
          <p className="mt-4 text-[15px] md:text-[16px] text-black/55 font-medium leading-[1.9] max-w-[680px] mx-auto">
            يُصدر المزود الخارجي كود فحص وتجربة مجانياً لمدة 6 ساعات كاملة، يصلك عبر واتساب
            خلال دقائق من طلبك مع إرشادات إعداد المشغّل، لتفحص توافق جهازك وثبات البث وجودة
            الصورة على سرعة اتصالك — قبل دفع أي مبلغ ودون أي التزام. دورنا في ستريم ماستر برو
            هو الربط التقني ومساعدتك في الإعداد خطوة بخطوة.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              onClick={onOpenTrial}
              className="rounded-full bg-[#0b0b0f] text-white font-black px-7 py-3.5 text-[14.5px] hover:bg-[#2b4eff] transition flex items-center gap-2 cursor-pointer"
            >
              <IconZap className="w-5 h-5 text-[#d8ff3e]" />
              اطلب كود التجربة الآن
            </button>
            <a
              href="#trial-conditions"
              className="rounded-full border border-black/15 bg-white font-black px-7 py-3.5 text-[14.5px] hover:border-black transition"
            >
              اقرأ شروط التجربة أولاً
            </a>
          </div>

          {/* حقائق سريعة */}
          <dl className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 text-start">
            {[
              { k: "6 ساعات", v: "مدة التجربة كاملة من إصدار الكود" },
              { k: "أقل من 5 دقائق", v: "لاستلام الكود عبر واتساب عادة" },
              { k: "3 سيرفرات", v: "نوفا وإيستار وموكا — اختر واحداً للفحص" },
              { k: "0 دفع مقدم", v: "لا مبلغ ولا بطاقة قبل التجربة" },
            ].map((f) => (
              <div key={f.k} className="rounded-2xl bg-white border border-black/10 px-5 py-4">
                <dt className="font-display font-black text-[19px] tracking-tight">{f.k}</dt>
                <dd className="mt-1 text-[12.5px] font-bold text-black/45 leading-relaxed">{f.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ===== ماذا تفحص؟ ===== */}
      <section className="py-14 md:py-20 bg-white border-y border-black/[0.06]">
        <div className="max-w-[1100px] mx-auto px-5">
          <h2 className="font-display font-black tracking-tight text-[26px] md:text-[34px] leading-snug text-center">
            ماذا تفحص خلال الـ6 ساعات؟
          </h2>
          <p className="mt-3 mb-9 text-[14.5px] md:text-[15.5px] text-black/55 font-medium leading-[1.9] text-center max-w-[640px] mx-auto">
            ببيانات تجربة يصدرها المزود الخارجي نفسه، حتى يكون قرارك مبنياً على أداء
            حقيقي على جهازك واتصالك، لا على وعود تسويقية.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {TRIAL_CHECKS.map((c, i) => (
              <Reveal key={c.title} variant="up" delay={Math.min(i, 3) * 60}>
                <div className="h-full rounded-3xl bg-[#faf9f6] border border-black/10 p-6">
                  <span className="inline-flex items-center justify-center h-11 w-11 rounded-2xl bg-[#0b0b0f] text-[#d8ff3e] mb-4">
                    <c.icon className="w-5 h-5" />
                  </span>
                  <h3 className="font-black text-[16px] tracking-tight">{c.title}</h3>
                  <p className="mt-2 text-[13.5px] text-black/55 font-medium leading-[1.9]">{c.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== الخطوات ===== */}
      <section className="py-14 md:py-20 bg-[#faf9f6]">
        <div className="max-w-[860px] mx-auto px-5">
          <h2 className="font-display font-black tracking-tight text-[26px] md:text-[34px] leading-snug text-center">
            كيف تحصل على كود التجربة؟
          </h2>
          <p className="mt-3 mb-9 text-[14.5px] md:text-[15.5px] text-black/55 font-medium leading-[1.9] text-center max-w-[640px] mx-auto">
            خمس خطوات قصيرة، أغلبها عندنا: أنت تختار وترسل الطلب، ونحن نتابع مع المزود حتى
            تعمل التجربة على جهازك.
          </p>
          <ol className="space-y-3">
            {TRIAL_STEPS.map((s, i) => (
              <Reveal key={s.title} variant="up" delay={Math.min(i, 3) * 60}>
                <li className="flex gap-4 rounded-3xl bg-white border border-black/10 p-6">
                  <span className="shrink-0 w-10 h-10 rounded-full bg-[#0b0b0f] text-[#d8ff3e] grid place-items-center font-display font-black text-[16px]">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-black text-[15.5px] tracking-tight">{s.title}</h3>
                    <p className="mt-1.5 text-[13.5px] text-black/55 font-medium leading-[1.9]">{s.text}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ===== الشروط ===== */}
      <section id="trial-conditions" className="py-14 md:py-20 bg-white border-y border-black/[0.06] scroll-mt-[150px]">
        <div className="max-w-[860px] mx-auto px-5">
          <h2 className="font-display font-black tracking-tight text-[26px] md:text-[34px] leading-snug">
            شروط التجربة باختصار
          </h2>
          <p className="mt-3 mb-7 text-[14.5px] md:text-[15.5px] text-black/55 font-medium leading-[1.9]">
            بلا بنود مخفية: هذه هي الشروط الكاملة لكود الفحص والتجربة الصادر عن المزود
            الخارجي، ودورنا فيها تقني بحت.
          </p>
          <ul className="space-y-3">
            {TRIAL_CONDITIONS.map((c) => (
              <li key={c} className="flex gap-3 rounded-2xl bg-[#faf9f6] border border-black/10 px-5 py-4">
                <IconCheck className="w-5 h-5 shrink-0 text-[#2b4eff] mt-0.5" />
                <span className="text-[13.5px] md:text-[14px] font-bold text-black/70 leading-[1.9]">{c}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[13.5px] font-bold text-black/50 leading-[1.9]">
            قبل الاشتراك في أي باقة، راجع{" "}
            <a href={to("watch-legal.html")} className="text-[#2b4eff] underline underline-offset-4 hover:text-black transition">
              دليل المشاهدة الرسمية وخيارات الاشتراك الرسمي
            </a>{" "}
            للمحتوى المشفّر، واطّلع على{" "}
            <a href={to("terms/")} className="text-[#2b4eff] underline underline-offset-4 hover:text-black transition">
              شروط الاستخدام وإخلاء المسؤولية
            </a>{" "}
            الخاصة بخدمات الربط التقني.
          </p>
        </div>
      </section>

      {/* ===== أي سيرفر؟ ===== */}
      <section className="py-14 md:py-20 bg-[#faf9f6]">
        <div className="max-w-[1100px] mx-auto px-5">
          <h2 className="font-display font-black tracking-tight text-[26px] md:text-[34px] leading-snug text-center">
            أي سيرفر تجرّبه؟
          </h2>
          <p className="mt-3 mb-9 text-[14.5px] md:text-[15.5px] text-black/55 font-medium leading-[1.9] text-center max-w-[640px] mx-auto">
            اختر الأقرب لاستخدامك واطلب تجربته أولاً — يمكنك مراجعة مواصفات كل سيرفر كما
            يعلنها مزوده الخارجي في صفحة باقته قبل الطلب.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {SERVER_PAGES.map((s, i) => (
              <Reveal key={s.code} variant="up" delay={Math.min(i, 3) * 60}>
                <a
                  href={to(`${s.code}/`)}
                  className="block h-full rounded-3xl bg-white border border-black/10 p-6 hover:border-black transition group"
                >
                  <span className="text-[26px]" aria-hidden="true">{s.emoji}</span>
                  <h3 className="mt-3 font-display font-black text-[19px] tracking-tight">{s.label}</h3>
                  <p className="mt-1.5 text-[13.5px] text-black/55 font-medium leading-[1.9]">{s.desc}</p>
                  <span className="mt-4 inline-block text-[13px] font-black text-[#2b4eff] group-hover:text-black transition underline underline-offset-4">
                    مواصفات وباقة {s.label} قبل التجربة
                  </span>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== أسئلة التجربة ===== */}
      <section id="trial-faq" className="py-14 md:py-20 bg-white border-y border-black/[0.06] scroll-mt-[150px]">
        <div className="max-w-[860px] mx-auto px-5">
          <h2 className="font-display font-black tracking-tight text-[26px] md:text-[34px] leading-snug text-center">
            أسئلة شائعة عن التجربة المجانية
          </h2>
          <p className="mt-3 mb-9 text-[14.5px] md:text-[15.5px] text-black/55 font-medium leading-[1.9] text-center">
            إجابات مباشرة عن مدة التجربة وطريقة طلبها وما يحدث بعد انتهائها.
          </p>
          <div className="space-y-3">
            {TRIAL_FAQS.map((faq, idx) => {
              const isOpen = openKey === idx;
              return (
                <Reveal key={faq.q} variant="up" delay={Math.min(idx, 3) * 60}>
                  <div
                    className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                      isOpen
                        ? "bg-[#0b0b0f] text-white border-[#0b0b0f]"
                        : "bg-white border-black/10 hover:border-black"
                    }`}
                  >
                    <h3>
                      <button
                        onClick={() => setOpenKey(isOpen ? null : idx)}
                        className="w-full flex items-center justify-between gap-4 text-start px-6 py-5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                        aria-expanded={isOpen}
                      >
                        <span className="font-black text-[14.5px] md:text-[16.5px] tracking-tight leading-snug">
                          {faq.q}
                        </span>
                        <span
                          className={`w-9 h-9 rounded-full grid place-items-center shrink-0 transition-transform duration-300 ${
                            isOpen
                              ? "bg-[#d8ff3e] text-black rotate-45"
                              : "bg-black/[0.06] text-black"
                          }`}
                        >
                          <IconPlus className="w-[17px] h-[17px]" />
                        </span>
                      </button>
                    </h3>
                    {/* الإجابة موجودة دائماً في HTML (مخفية بصرياً عند الإغلاق)
                        حتى تطابق بيانات FAQPage المنظّمة في seo.ts سؤالاً سؤالاً */}
                    <div hidden={!isOpen} className="px-6 pb-6 animate-fade-in">
                      <p
                        className={`text-[14px] md:text-[15px] leading-[1.9] ${
                          isOpen ? "text-white/65" : "text-black/60"
                        }`}
                      >
                        {faq.a}
                      </p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== دعوة أخيرة ===== */}
      <section className="py-14 md:py-20 bg-[#faf9f6]">
        <div className="max-w-[860px] mx-auto px-5">
          <div className="rounded-3xl bg-[#0b0b0f] text-white px-7 py-10 md:px-12 text-center">
            <h2 className="font-display font-black tracking-tight text-[24px] md:text-[32px] leading-snug">
              ابدأ تجربتك المجانية الآن
            </h2>
            <p className="mt-4 text-white/60 text-[14.5px] md:text-[15.5px] leading-[1.9] max-w-[560px] mx-auto">
              ست ساعات كاملة على جهازك واتصالك، ببيانات صادرة عن المزود الخارجي ومساعدة
              فريقنا في إعداد المشغّل — ثم القرار لك وحدك.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button
                onClick={onOpenTrial}
                className="rounded-full bg-[#d8ff3e] text-black font-black px-7 py-3.5 text-[14.5px] hover:bg-white transition flex items-center gap-2 cursor-pointer"
              >
                <IconZap className="w-5 h-5" />
                اطلب كود التجربة عبر واتساب
              </button>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${waTrialText}`}
                className="rounded-full border border-white/25 text-white font-black px-7 py-3.5 text-[14.5px] hover:border-white transition flex items-center gap-2"
              >
                <IconChat className="w-5 h-5" />
                محادثة واتساب مع الدعم الفني
              </a>
              <a
                href={to("faq/")}
                className="rounded-full border border-white/25 text-white font-black px-7 py-3.5 text-[14.5px] hover:border-white transition"
              >
                الأسئلة الشائعة الكاملة
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
