import LiveMatchesBoard from '../components/LiveMatchesBoard';
import LeagueStandings, { LeagueStandingsUnavailable } from '../components/LeagueStandings';
import { BroadcastersSection, FaqSection, LandingBreadcrumb, ServiceStrip } from '../components/LandingSections';
import { RIGHTS_NOTICE, type LeagueLanding } from '../content/competitions';
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

        {/* قسم جدول الترتيب — مباشرة بعد لوحة المباريات كما اتُّفق. بطولة لم
            يثبت مصدر ترتيبها بعد تعرض «غير متاح» بصراحة بدل جدول مخمَّن. */}
        {landing.standings ? (
          <LeagueStandings league={landing.standings.leagueId} title={landing.shortName} />
        ) : landing.standingsUnavailable ? (
          <LeagueStandingsUnavailable title={landing.shortName} text={landing.standingsUnavailable} />
        ) : null}

        {/* قسم الناقلين — مؤجَّل لبطولة لم يُوثَّق ناقلها من مصدر
            أوّلي رسمي بعد: يظهر نص الحالة بصراحة بدل بطاقات جهات
            لم تُثبت، ولا يُختَرع ناقل من الذاكرة. */}
        {landing.broadcasterNotice ? (
          <section className="landing-section" aria-labelledby="broadcasters-title">
            <h2 id="broadcasters-title">القنوات الناقلة رسمياً — {landing.shortName}</h2>
            <p className="landing-notice">{landing.broadcasterNotice}</p>
            <p className="landing-notice">{RIGHTS_NOTICE}</p>
          </section>
        ) : (
          <BroadcastersSection broadcasters={landing.broadcasters} subject={landing.shortName} />
        )}
        <FaqSection faq={landing.faq} />
        <ServiceStrip />
      </div>
    </section>
  );
}
