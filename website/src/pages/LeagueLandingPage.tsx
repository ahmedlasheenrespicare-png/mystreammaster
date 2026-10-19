import LeagueArchive from '../components/LeagueArchive';
import LeagueIconBadge from '../components/LeagueIconBadge';
import LiveMatchesBoard from '../components/LiveMatchesBoard';
import LeagueStandings, { LeagueStandingsUnavailable } from '../components/LeagueStandings';
import { BroadcastersSection, FaqSection, LandingBreadcrumb, ServiceStrip } from '../components/LandingSections';
import { dataSourcesNote, RIGHTS_NOTICE, type LeagueLanding } from '../content/competitions';
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
          <div className="matches-hero-title">
            {/* شارة البطولة لصفحة بطولة فقط (leagueId موجود) — الدوري المصري
                بلا شعار موثّق لدى المصدر فيعرض المكوّن بديل الكأس المحايد،
                وصفحات المنتخبات مكوّن آخر (TeamLandingPage) بلا شارة إطلاقاً:
                الكأس على صفحة منتخب خطأ في المعنى. الحلّ يعتمد
                `landing.leagueId` (معرّف المباريات) لا `standings.leagueId` —
                السعودي شعاره تحت sau.1 بينما ترتيبه ksa.1. والأيقونة فوق
                الطية فتُحمَّل eagerly بلا تأخير ولا قفز تخطيط. */}
            {landing.leagueId ? <LeagueIconBadge leagueId={landing.leagueId} size={52} eager /> : null}
            <h1 id="landing-title">{landing.h1}</h1>
          </div>
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
          dataNote={false}
        />

        {/* قسم جدول الترتيب — مباشرة بعد لوحة المباريات كما اتُّفق. بطولة لم
            يثبت مصدر ترتيبها بعد تعرض «غير متاح» بصراحة بدل جدول مخمَّن. */}
        {landing.standings ? (
          <LeagueStandings league={landing.standings.leagueId} title={landing.shortName} />
        ) : landing.standingsUnavailable ? (
          <LeagueStandingsUnavailable title={landing.shortName} text={landing.standingsUnavailable} />
        ) : null}

        <LeagueArchive league={landing.leagueId} />

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

        {/* قسم «البيانات والمصادر» — يجمع تنبيهَي المصدر
            والتوقيت في مكان واحد أسفل الصفحة (نص واحد من
            competitions.ts باسم المصدر الفعلي لكل بطولة)،
            ويُصَيَّر ثابتاً وقت البناء بلا JavaScript. */}
        <section className="ls-data-sources" aria-labelledby="data-sources-title">
          <h2 id="data-sources-title">البيانات والمصادر</h2>
          <p>{dataSourcesNote(landing.leagueId, landing.standings?.provider)}</p>
        </section>
      </div>
    </section>
  );
}
