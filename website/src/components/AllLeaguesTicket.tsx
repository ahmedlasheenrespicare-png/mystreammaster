import LeagueIconBadge from "./LeagueIconBadge";
import "./league-ticket.css";

/* ==========================================================================
   التذكرة الجامعة — كل أيقونات البطولات في صفحة «مواعيد المباريات»
   --------------------------------------------------------------------------
   • نفس تصميم كرت تذكرة البطولة (uiverse.io/Spacious74/moody-owl-18 —
     Spacious74 — MIT، التكييف موثَّق في league-ticket.css): الإطار المضيء
     الشعاعي، اللوح الداكن، نقطة الضوء، الشعاع المموّه، الخطوط المتقاطعة،
     والنص المعدني — بدل أيقونة بطولة واحدة، صفّ أيقونات البطولات الثماني
     (LeagueIconBadge نفسه: الشعار من المصدر الموثّق وبديل الكأس للمصري).
   • النص: «كل البطولات الكبرى» + السطران ذاتهما (مواعيد · نتائج · ترتيب /
     يُحدَّث كل دقيقة) انسجاماً مع عائلة التذاكر.
   • زخرفية بالكامل (aria-hidden): عنوان الصفحة h1 ظاهر بجانبها فلا تكرار.
   • بلا أي حلقة لانهائية: النقطة ساكنة وتقطع المحيط دورة واحدة عند
     التحويم/الضغط (القواعد المشتركة في league-ticket.css).
   ========================================================================== */

/* ترتيب البطولات ذات الصفحات — نفس قائمة صفحات الهبوط الثماني */
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

export default function AllLeaguesTicket() {
  return (
    <div className="league-ticket all-leagues-ticket" aria-hidden="true">
      {/* لوح التذكرة الداكن + الشعاع الضوئي والخطوط الزخرفية المتقاطعة */}
      <div className="league-ticket-bg league-ticket-holographic">
        <span className="league-ticket-ray" />
        <span className="league-ticket-line league-ticket-line--top" />
        <span className="league-ticket-line league-ticket-line--bottom" />
        <span className="league-ticket-line league-ticket-line--left" />
        <span className="league-ticket-line league-ticket-line--right" />
      </div>
      <span className="league-ticket-symbol" />
      {/* نجوم البطولات السبعة (مولّدة من صورهم المعتمدة) خلف النص —
          عنقود الفريق في الوسط بغطاء معتم يحمي قراءة الاسم المعدني */}
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
