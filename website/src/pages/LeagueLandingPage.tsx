import LiveMatchesBoard from '../components/LiveMatchesBoard';
import { BroadcastersSection, FaqSection, LandingBreadcrumb, ServiceStrip } from '../components/LandingSections';
import { type LeagueLanding } from '../content/competitions';
import './matches.css';
import './landing.css';

/* ==========================================================================
   صفحة هبوط بطولة ثابتة قابلة للفهرسة — شرح + جدول يتحدّث + الناقل الرسمي
   ========================================================================== */

export default function LeagueLandingPage({ landing }: { landing: LeagueLanding }) {
  return (
    <section className="matches-page" aria-labelledby="landing-title">
      <div className="matches-container">
        <LandingBreadcrumb
          items={[
            { name: 'الرئيسية', href: '/' },
            { name: 'مواعيد المباريات', href: '/matches/' },
            { name: landing.h1, href: `/matches/${landing.slug}/` },
          ]}
        />

        <header className="matches-hero">
          <p className="matches-eyebrow">صفحة متابعة ثابتة · تُحدَّث البيانات تلقائياً</p>
          <h1 id="landing-title">{landing.h1}</h1>
          <div className="matches-intro">
            {landing.intro.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </header>

        <LiveMatchesBoard
          leagues={[{ id: landing.leagueId, name: landing.shortName }]}
          heading="جدول المباريات والنتائج"
          note="تغطّي هذه الصفحة مباريات هذه البطولة فقط ضمن التواريخ المختارة من التقويم."
        />

        <BroadcastersSection broadcasters={landing.broadcasters} subject={landing.shortName} />
        <FaqSection faq={landing.faq} />
        <ServiceStrip />
      </div>
    </section>
  );
}
