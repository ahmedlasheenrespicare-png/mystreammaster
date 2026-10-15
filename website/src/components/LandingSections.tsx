import type { Broadcaster, FaqItem } from '../content/competitions';
import { RIGHTS_NOTICE } from '../content/competitions';

/* ==========================================================================
   أقسام مشتركة لصفحات هبوط البطولات والمنتخبات
   --------------------------------------------------------------------------
   • مسار التصفح الظاهر يجب أن يطابق BreadcrumbList في seo.ts حرفياً (الأسماء).
   • قسم الناقلين بصيغة الإعلان والإحالة — بلا أي ادعاء ملكية أو بث.
   ========================================================================== */

export interface Crumb {
  name: string;
  href: string;
}

export function LandingBreadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="text-[12.5px] font-bold text-black/40 mb-5" aria-label="مسار التصفح">
      {items.map((item, i) => (
        <span key={item.href}>
          {i > 0 && <span className="mx-2">/</span>}
          {i < items.length - 1 ? (
            <a href={item.href} className="hover:text-black transition">{item.name}</a>
          ) : (
            <span className="text-black/70">{item.name}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function BroadcastersSection({ broadcasters, subject }: { broadcasters: Broadcaster[]; subject: string }) {
  return (
    <section aria-labelledby="broadcasters-title" className="landing-section">
      <h2 id="broadcasters-title">القنوات الناقلة رسمياً — {subject}</h2>
      <div className="landing-cards">
        {broadcasters.map((b) => (
          <article key={b.name} className="landing-card">
            <h3>{b.name}</h3>
            <p>{b.detail}</p>
            {b.url && (
              <a href={b.url} target="_blank" rel="noopener noreferrer">
                الموقع الرسمي للجهة <span aria-hidden="true">↗</span>
              </a>
            )}
          </article>
        ))}
      </div>
      <p className="landing-notice">{RIGHTS_NOTICE}</p>
      <p>
        اشتراكات القنوات والمنصات المشفّرة تُشترى مباشرة من الجهة الناقلة؛ روابط الخيارات الرسمية مجمّعة في{' '}
        <a href="/watch-legal.html">دليل المشاهدة الرسمية</a>. لا يبيع ستريم ماستر برو اشتراكات القنوات ولا يبثّ أي محتوى.
      </p>
    </section>
  );
}

export function FaqSection({ faq }: { faq: FaqItem[] }) {
  return (
    <section aria-labelledby="landing-faq-title" className="landing-section">
      <h2 id="landing-faq-title">أسئلة شائعة</h2>
      <div className="landing-faq">
        {faq.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function ServiceStrip() {
  return (
    <aside className="landing-service" aria-label="خدمات ستريم ماستر برو">
      <p>
        تحتاج إلى تشغيل اشتراكك على شاشتك أو جهازك؟ خدمات ربط تقني وإعداد مشغّلات البث ودعم فني بالعربية —
        والموقع لا يستضيف المحتوى ولا يبثّه.
      </p>
      <div className="landing-service-links">
        <a href="/store/" className="landing-service-cta">عرض الباقات والتفعيل التقني</a>
        <a href="/matches/" className="landing-service-link">كل مواعيد المباريات</a>
      </div>
    </aside>
  );
}
