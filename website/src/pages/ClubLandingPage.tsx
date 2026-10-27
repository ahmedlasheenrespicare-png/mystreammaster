import LiveMatchesBoard from '../components/LiveMatchesBoard';
import { FaqSection, LandingBreadcrumb, ServiceStrip } from '../components/LandingSections';
import { CLUB_BOARD_SCOPE, type ClubLanding } from '../content/competitions';
import './matches.css';
import './landing.css';

/* ==========================================================================
   صفحة هبوط نادٍ ثابتة قابلة للفهرسة
   --------------------------------------------------------------------------
   تجمع مباريات النادي وحده عبر كل مسابقاته المغطاة بمصدر البيانات، بلا
   مواعيد أو نتائج مكتوبة يدوياً: المحتوى التحريري ثابت، والجدول حيّ من
   /scoreboard.php مُصفّى باسم النادي.
   ========================================================================== */

export default function ClubLandingPage({ landing }: { landing: ClubLanding }) {
  return (
    <section className="matches-page" aria-labelledby="club-title">
      <div className="matches-container">
        <LandingBreadcrumb
          items={[
            { name: 'الرئيسية', href: '/' },
            { name: 'مواعيد المباريات', href: '/matches/' },
            { name: landing.h1, href: `/teams/${landing.slug}/` },
          ]}
        />

        <header className="matches-hero">
          <p className="matches-eyebrow">دليل متابعة · مباريات النادي في مسابقاته</p>
          <h1 id="club-title">{landing.h1}</h1>
          <div className="matches-intro">
            <p>
              صفحة واحدة تجمع مباريات {landing.teamName} في{' '}
              {landing.leagues.map((l) => l.name).join(' و')} — بلا حاجة إلى تتبّع كل بطولة
              على حدة، وبلا مواعيد منسوخة يدوياً تنقضي صلاحيتها.
            </p>
            {landing.note && <p>{landing.note}</p>}
            <p>
              صفحة متابعة ضمن دليل المشاهدة الرسمية على ستريم ماستر برو — خدمات ربط تقني وإعداد مشغّلات البث
              ودليل المشاهدة الرسمية. الموقع لا يستضيف المحتوى ولا يبثّه ولا يعيد بثّه.
            </p>
          </div>
        </header>

        <section aria-labelledby="club-comps-title" className="landing-section">
          <h2 id="club-comps-title">المسابقات المغطاة في هذه الصفحة</h2>
          <div className="landing-cards">
            {landing.leagues.map((league) => (
              <article key={league.id} className="landing-card">
                <h3>{league.name}</h3>
                <p>{league.note}</p>
              </article>
            ))}
          </div>
          <p className="landing-notice">
            التغطية تتبع ما يوفّره مصدر البيانات: مسابقة لا يغطّيها المصدر لا تظهر مبارياتها في
            الجدول أدناه، لا لأن النادي غائب عنها.
          </p>
        </section>

        <LiveMatchesBoard
          leagues={landing.leagues}
          teamFilter={landing.teamNames}
          heading="مباريات النادي — جدول يتحدّث"
          note={CLUB_BOARD_SCOPE}
        />

        <FaqSection faq={landing.faq} />
        <ServiceStrip />
      </div>
    </section>
  );
}
