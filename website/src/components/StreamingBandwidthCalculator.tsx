import { useEffect, useState } from 'react';
import { calculateStreamingBandwidth, type StreamingProvider } from '../lib/streaming-bandwidth.mjs';

type Fields = { hd: string; fhd: string; uhd: string; other: string; measured: string };
const initialFields: Fields = { hd: '0', fhd: '1', uhd: '0', other: '0', measured: '' };
const numberOrNaN = (value: string) => value.trim() === '' ? NaN : Number(value);
const showNumber = (value: number) => new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(value);

const errors = {
  provider: 'اختر خدمة من القائمة.',
  screens: 'أدخل عدداً صحيحاً من 0 إلى 8 لكل جودة.',
  'no-screens': 'اختر شاشة واحدة على الأقل لحساب احتياج المشاهدة.',
  other: 'أدخل سرعة الأنشطة الأخرى بين 0 و10000 ميجابت/ث.',
  measured: 'أدخل سرعة مقاسة بين 0 و10000 ميجابت/ث، أو اترك الحقل فارغاً.',
} as const;

const comparisons = {
  'not-provided': 'للمقارنة، أدخل سرعة التنزيل التي قستها في مكان المشاهدة.',
  'below-baseline': 'السرعة المدخلة أقل من مجموع الاحتياج التقديري. جرّب تقليل الجودة أو عدد الشاشات.',
  'below-target': 'السرعة تغطي المجموع التقديري، لكن دون هامش الـ25% المقترح؛ قد تتأثر بالتذبذب.',
  enough: 'السرعة المدخلة تغطي التقدير والهامش المقترح، لكن ذلك لا يضمن ثبات المشاهدة.',
} as const;

export default function StreamingBandwidthCalculator() {
  const [provider, setProvider] = useState<StreamingProvider>('youtube');
  const [fields, setFields] = useState<Fields>(initialFields);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const setField = (field: keyof Fields, value: string) => setFields(current => ({ ...current, [field]: value }));
  const result = calculateStreamingBandwidth({
    provider,
    hd: numberOrNaN(fields.hd),
    fhd: numberOrNaN(fields.fhd),
    uhd: numberOrNaN(fields.uhd),
    otherMbps: numberOrNaN(fields.other),
    measuredMbps: fields.measured.trim() === '' ? null : numberOrNaN(fields.measured),
  });
  const inputClass = 'mt-2 w-full min-w-0 rounded-xl border border-black/20 bg-white px-3 py-3 text-[16px] font-bold text-black focus:outline-2 focus:outline-offset-2 focus:outline-[#2b4eff] disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <section id="bandwidth-calculator" aria-labelledby="bandwidth-title" className="mt-9 rounded-[24px] border border-[#2b4eff]/20 bg-[#f2f5ff] p-5 sm:p-7">
      <p className="text-[12px] font-black text-[#2b4eff]">أداة عملية · حساب داخل المتصفح</p>
      <h2 id="bandwidth-title" className="mt-2 font-display text-[23px] font-black leading-snug">حاسبة سرعة المشاهدة المنزلية</h2>
      <p className="mt-3 text-[14px] leading-[1.9] text-black/70">
        اختر خدمة وعدد الشاشات التي تعمل في الوقت نفسه. النتيجة تقدير مبني على توصيات الخدمة، وليست اختباراً لسرعة اتصالك.
      </p>

      <noscript><p className="mt-3 text-[13px] font-bold">لتغيير مدخلات الحاسبة يلزم تفعيل JavaScript؛ يظل المثال الافتراضي والشرح أدناه متاحين.</p></noscript>
      <fieldset disabled={!ready}>
        <legend className="sr-only">مدخلات الحاسبة</legend>
      <div className="mt-5">
        <label htmlFor="bandwidth-provider" className="block text-[13px] font-black">توصيات الخدمة المستخدمة للحساب</label>
        <select id="bandwidth-provider" value={provider} onChange={event => setProvider(event.target.value as StreamingProvider)} className={inputClass}>
          <option value="youtube">YouTube</option>
          <option value="netflix">Netflix</option>
        </select>
      </div>

      <fieldset className="mt-5">
        <legend className="text-[13px] font-black">عدد الشاشات المتزامنة لكل جودة</legend>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {([
            ['hd', 'HD · 720p'],
            ['fhd', 'Full HD · 1080p'],
            ['uhd', '4K · 2160p'],
          ] as const).map(([key, label]) => (
            <label key={key} className="block text-[13px] font-bold">
              <span dir="ltr">{label}</span>
              <input aria-label={`عدد شاشات ${label}`} type="number" min="0" max="8" step="1" inputMode="numeric" value={fields[key]} onChange={event => setField(key, event.target.value)} className={inputClass} />
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="block text-[13px] font-black">
          سرعة الأنشطة الأخرى التقديرية (Mbps)
          <input type="number" min="0" max="10000" step="any" inputMode="decimal" value={fields.other} onChange={event => setField('other', event.target.value)} className={inputClass} />
        </label>
        <label className="block text-[13px] font-black">
          سرعة التنزيل المقاسة (Mbps) · اختياري
          <input type="number" min="0" max="10000" step="any" inputMode="decimal" value={fields.measured} onChange={event => setField('measured', event.target.value)} className={inputClass} />
        </label>
      </div>
      <p className="mt-3 text-[12.5px] leading-[1.8] text-black/60">
        للمقارنة مع أنشطة أخرى، قِس السرعة عندما تكون الشبكة هادئة. إن كان القياس أثناء انشغالها، اترك الأنشطة الأخرى عند صفر كي لا تُحسب مرتين.
      </p>
      </fieldset>

      <div aria-live="polite" aria-atomic="true" className="mt-5 rounded-2xl bg-white p-5 text-[14px] leading-[1.9]">
        {result.ok ? (
          <>
            <p>مجموع متطلبات الفيديو والأنشطة الأخرى: <strong dir="ltr" className="inline-block whitespace-nowrap">{showNumber(result.baselineMbps)} Mbps</strong>.</p>
            <p className="mt-1 text-[17px] font-black">السرعة المقترحة مع هامش 25%: <span dir="ltr" className="inline-block whitespace-nowrap text-[#1e3bbf]">{showNumber(result.targetMbps)} Mbps</span></p>
            <p className="mt-2 text-black/70">{comparisons[result.comparison]}</p>
          </>
        ) : <p role="alert" className="font-bold text-[#9b1c1c]">{errors[result.error]}</p>}
      </div>
      <p className="mt-4 text-[12.5px] leading-[1.8] text-black/60">
        الهامش اختيار إرشادي من الموقع وليس توصية من الخدمتين. تختلف المتطلبات حسب المحتوى والترميز وجودة الشبكة؛ الحساب لا يرسل القيم إلى الخادم.
      </p>
    </section>
  );
}
