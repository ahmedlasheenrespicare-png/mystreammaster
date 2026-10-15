import LiveMatchesBoard from '../components/LiveMatchesBoard';
import { BroadcastersSection, FaqSection, LandingBreadcrumb, ServiceStrip } from '../components/LandingSections';
import {
  BEIN,
  FIFA_PLUS,
  TEAM_BOARD_SCOPE,
  TOD,
  type TeamLanding,
} from '../content/competitions';
import './matches.css';
import './landing.css';

/* ==========================================================================
   صفحة هبوط منتخب عربي ثابتة قابلة للفهرسة
   --------------------------------------------------------------------------
   محتوى المجموعة من مقال «المنتخبات العربية في كأس العالم 2026» المنشور،
   والمباريات الحيّة من /scoreboard.php — بلا مواعيد أو نتائج مونديال مكتوبة.
   ========================================================================== */

/* المسابقات الدولية المغطاة بمصدر البيانات لصفحات المنتخبات */
const TEAM_LEAGUES = [
  { id: 'fifa.friendly', name: 'مباريات دولية ودية' },
  { id: 'fifa.worldq.caf', name: 'تصفيات كأس العالم — أفريقيا' },
  { id: 'fifa.worldq.uefa', name: 'تصفيات كأس العالم — أوروبا' },
];

export default function TeamLandingPage({ landing }: { landing: TeamLanding }) {
  return (
    <section className="matches-page" aria-labelledby="landing-title">
      <div className="matches-container">
        <LandingBreadcrumb
          items={[
            { name: 'الرئيسية', href: '/' },
            { name: 'كأس العالم 2026', href: '/world-cup-2026/' },
            { name: landing.h1, href: `/world-cup-2026/${landing.slug}/` },
          ]}
        />

        <header className="matches-hero">
          <p className="matches-eyebrow">دليل متابعة · كأس العالم 2026 والمسابقات الدولية</p>
          <h1 id="landing-title">{landing.h1}</h1>
          <div className="matches-intro">
            <p>
              شارك {landing.teamName} في نهائيات كأس العالم 2026 (الولايات المتحدة وكندا
              والمكسيك — 11 يونيو إلى 19 يوليو 2026) ضمن {landing.group} إلى جانب{' '}
              {landing.rivals.join(' و')}.
            </p>
            {landing.note && <p>{landing.note}</p>}
            <p>
              صفحة متابعة ضمن دليل المشاهدة الرسمية على ستريم ماستر برو — خدمات ربط تقني وإعداد مشغّلات البث
              ودليل المشاهدة الرسمية. الموقع لا يستضيف المحتوى ولا يبثّه ولا يعيد بثّه.
            </p>
          </div>
        </header>

        <section aria-labelledby="world-cup-group-title" className="landing-section">
          <h2 id="world-cup-group-title">المجموعة في كأس العالم 2026</h2>
          <div className="landing-cards">
            <article className="landing-card">
              <h3>{landing.group}</h3>
              <p>المنافسون في المجموعة: {landing.rivals.join('، ')}.</p>
            </article>
            <article className="landing-card">
              <h3>تفاصيل البطولة</h3>
              <p>
                نسخة 2026 أقيمت بمشاركة 48 منتخباً في 16 ملعباً بثلاث دول، وهي أعلى مشاركة عربية في تاريخ
                البطولة. تفاصيل المجموعات والمنتخبات في{' '}
                <a href="/blog/الدول-العربية-في-كأس-العالم-2026/">مقال المنتخبات العربية في كأس العالم 2026</a>.
              </p>
            </article>
          </div>
          <p className="landing-notice">
            معلومات المجموعة والمشاركين للتعريف؛ النتائج والتفاصيل الرسمية تُستقى من المصادر المختصة (FIFA).
          </p>
        </section>

        <LiveMatchesBoard
          leagues={TEAM_LEAGUES}
          teamFilter={landing.teamNames}
          heading="المباريات الدولية — جدول يتحدّث"
          note={TEAM_BOARD_SCOPE}
        />

        <BroadcastersSection
          broadcasters={[BEIN, TOD, FIFA_PLUS]}
          subject={`مباريات ${landing.teamName} في كأس العالم 2026`}
        />
        <FaqSection faq={landing.faq} />
        <ServiceStrip />
      </div>
    </section>
  );
}
