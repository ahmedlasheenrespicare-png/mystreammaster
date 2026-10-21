import LeagueIconBadge from "./LeagueIconBadge";
import { FEATURED_CLASHES, LeagueTicketCarousel, NovaTicketBrand, XtvTicketBrand, StreamMasterTicketWordmark, type FeaturedClash } from "./LeagueTicketCard";
import "./league-ticket.css";

/* ==========================================================================
   التذكرة الجامعة — كل أيقونات البطولات في صفحة «مواعيد المباريات»
   --------------------------------------------------------------------------
   • نفس تصميم كرت تذكرة البطولة (uiverse.io/Spacious74/moody-owl-18 —
     Spacious74 — MIT، التكييف موثَّق في league-ticket.css): الإطار المضيء
     الشعاعي، اللوح الداكن، نقطة الضوء، الشعاع المموّه، الخطوط المتقاطعة،
     والنص المعدني — بدل أيقونة بطولة واحدة، صفّ أيقونات البطولات الثماني
     (LeagueIconBadge نفسه: الشعار من المصدر الموثّق وبديل الكأس للمصري).
   • صارت منزلقة جامعة على منصة LeagueTicketCarousel نفسها: شريحة الأساس
     هي التذكرة الزخرفية الحالية بعينها، تليها خمس شرائح منزلقة بكل
     خصائصها الحيّة مأخوذة من إعدادات FEATURED_CLASHES نفسه (مصدر واحد
     يمنع أي انحراف بين نسختي الشريحة في التذكرتين):
       1) أبطال أوروبا «قمة الجولة» — باريس × برشلونة
       2) أبطال أوروبا «مباراة الليلة» — بايرن × أرسنال
       3) الإسباني «مواجهة الكلاسيكو» — ريال مدريد × برشلونة
       4) الإنجليزي «قمة الجولة» — تشيلسي × توتنهام
       5) الإنجليزي «قمة الجولة» — أرسنال × إيفرتون
     لكل مواجهة خانتها source على بطولتها، فيُجلَب نطاق مواعيد بطولتها
     منفصلاً (أسبوع للوراء + أسبوع للأمام عبر /scoreboard.php نفسه)،
     وتُرسَم أيقونة البطولة الصحيحة على الشريحة، ويبقى عرض النتيجة
     باتجاه كرت المواعيد، والعدّاد والمباشر والنهائي بتحديث كل دقيقة.
   ========================================================================== */

/* مواجهات التذكرة الجامعة — نفس عناصر FEATURED_CLASHES المعتمدة في
   تذاكر بطولاتها حرفاً مع تثبيت مصدر كل منها */
const INDEX_CLASHES: FeaturedClash[] = [
  { ...FEATURED_CLASHES["uefa.champions"][0], source: "uefa.champions" },
  { ...FEATURED_CLASHES["uefa.champions"][1], source: "uefa.champions" },
  { ...FEATURED_CLASHES["esp.1"][0], source: "esp.1" },
  { ...FEATURED_CLASHES["eng.1"][0], source: "eng.1" },
  { ...FEATURED_CLASHES["eng.1"][1], source: "eng.1" },
];

/* الشريحة الأساسية — تذكرة «كل البطولات الكبرى» الزخرفية كما كانت:
   اللوح الداكن، نقطة الضوء، صورة النجوم، وصف أيقونات البطولات الثماني */
const TICKET_LEAGUES = [
  'uefa.champions',
  'eng.1',
  'esp.1',
  'ita.1',
  'ger.1',
  'fra.1',
  'sau.1',
  'egy.1',
];

function AllLeaguesTicketBase() {
  return (
    <div className="league-ticket all-leagues-ticket league-ticket--in-track">
      {/* لوح التذكرة الداكن + الشعاع الضوئي والخطوط الزخرفية المتقاطعة */}
      <div className="league-ticket-bg league-ticket-holographic">
        <span className="league-ticket-ray" />
        <span className="league-ticket-line league-ticket-line--top" />
        <span className="league-ticket-line league-ticket-line--bottom" />
        <span className="league-ticket-line league-ticket-line--left" />
        <span className="league-ticket-line league-ticket-line--right" />
      </div>
      <span className="league-ticket-symbol" />
      {/* زوج الشعارات أعلى اليسار الفيزيائي: نوفا الكاملة على تذكرة
          جدول المواعيد الجامعة، وX بجانبها نفس الإثراء (تعميم موازٍ)
          — وظهورها في هيرو الرئيسية يتبع لهذه الوحدة ذاتها */}
      <NovaTicketBrand />
      <XtvTicketBrand />
      {/* الثلاثية المتوسّطة (تعميم المالك لتذكرة الجامعة كاملة): أيقونة
          محايدة بالكأس — «كل البطولات» لا شعار بطولة واحد لها — ثم
          الخط الرأسي فالمربع الدوّار واسم ستريم ماستر؛ وظهورها في
          هيرو الرئيسية يتبع لهذه الوحدة ذاتها */}
      <div className="league-ticket-header league-ticket-header--brand">
        <LeagueIconBadge leagueId="matches" size={60} eager />
        <StreamMasterTicketWordmark />
      </div>
      {/* نجوم البطولات (مولّدة من صورهم المعتمدة) خلف النص — عنقود
          الفريق في الوسط بغطاء معتم يحمي قراءة الاسم المعدني */}
      <img className="league-ticket-player all-leagues-ticket-players" src="/images/players/all-stars.png" alt="" aria-hidden="true" loading="eager" decoding="async" />
      <span className="all-leagues-ticket-veil" aria-hidden="true" />
      <div className="leagues-ticket-icons">
        {TICKET_LEAGUES.map((id) => (
          <LeagueIconBadge key={id} leagueId={id} size={46} eager />
        ))}
      </div>
      <div className="league-ticket-body">
        <em>كل البطولات الكبرى</em>
        مواعيد · نتائج · ترتيب
        <br />
        يُحدَّث كل دقيقة
      </div>
    </div>
  );
}

export default function AllLeaguesTicket() {
  return (
    <LeagueTicketCarousel
      leagueId="matches"
      name="كل البطولات الكبرى"
      clashes={INDEX_CLASHES}
      basePlayers={[]}
      base={<AllLeaguesTicketBase />}
      showNovaBrand
    />
  );
}
