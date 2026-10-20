import LeagueIconBadge from "./LeagueIconBadge";
import "./league-ticket.css";

/* ==========================================================================
   كرت «تذكرة المباراة» — رأس صفحات هبوط البطولات
   --------------------------------------------------------------------------
   • التصميم مقتبس من https://uiverse.io/Spacious74/moody-owl-18
     (المؤلف Spacious74 — رخصة MIT من Uiverse.io) بكل تفاصيله: إطار مضيء
     بتدرّج شعاعي من الزاوية العلوية (خارج بحشو 1px)، لوح داكن بتوهّج
     علوي، نقطة ضوء متوهّجة على الحافة، شعاع ضوئي مموّه مائل 40deg،
     خطوط زخرفية متقاطعة عند 10%، ونص معدني بتدرّج مقصوص.
   • التكييف للبطولة: أيقونة البطولة (LeagueIconBadge — المصدر الواحد
     للشعار وبديله) في الرأس، واسم البطولة (النص المعدني) والسطران
     التوضيحيان في المتن — كل المحتوى السابق محفوظ دون حذف. البطولة بلا
     شعار موثّق (كالمصري) تعرض كأس البديل المحايد، وتعذّر التحميل يُخفي
     الصورة ويبقى البديل.
   • الكرت زخرفي بالكامل (aria-hidden): اسم البطولة في h1 بجانبه، فلا
     يتكرر النص لقارئ الشاشة ولا تُخفى عنه معلومة.
   • الحلقة اللانهائية للنقطة في القالب (moveDot 6s infinite) أُلغيت
     وفق سياسة الموقع: النقطة ساكنة متوهّجة في السكون، وتقطع محيط الكرت
     دورة واحدة فقط عند التحويم/الضغط، وتُعطَّل الحركة كلياً لمن يفعّل
     تقليل الحركة. التفاصيل في league-ticket.css.
========================================================================== */

export default function LeagueTicketCard({ leagueId, name }: { leagueId: string; name: string }) {
  return (
    <div className="league-ticket" aria-hidden="true">
      {/* لوح التذكرة الداكن + الشعاع الضوئي والخطوط الزخرفية المتقاطعة */}
      <div className="league-ticket-bg league-ticket-holographic">
        <span className="league-ticket-ray" />
        <span className="league-ticket-line league-ticket-line--top" />
        <span className="league-ticket-line league-ticket-line--bottom" />
        <span className="league-ticket-line league-ticket-line--left" />
        <span className="league-ticket-line league-ticket-line--right" />
      </div>
      {/* نقطة الضوء — عنصر «مقصّ القصّ» سابقاً؛ صارت نقطة القالب المتوهّجة */}
      <span className="league-ticket-symbol" />
      {/* نموذج تجريبي (أبطال أوروبا فقط): نجم البطولة بلا خلفية —
          موضع الحافة المظلمة ويتلاشى في أسفل الكرت، خلف النص */}
      {leagueId === 'uefa.champions' && (
        <img className="league-ticket-player" src="/images/players/ucl-star.png" alt="" aria-hidden="true" loading="eager" decoding="async" />
      )}
      {/* الدوري الإنجليزي: هالاند بنفس طريقة أبطال أوروبا تماماً — نفس
          الموضع والتلاشٍ والهالة والصفة الزخرفية */}
      {leagueId === 'eng.1' && (
        <img className="league-ticket-player" src="/images/players/epl-star.png" alt="" aria-hidden="true" loading="eager" decoding="async" />
      )}
      {/* الدوري الإسباني: الكلاسيكو على تذكرة واحدة — مبابي يمين
          التذكرة ويامال يسارها، بنفس الصفة الزخرفية وطريقة الدمج */}
      {leagueId === 'esp.1' && (
        <>
          <img className="league-ticket-player league-ticket-player--right" src="/images/players/esp-mbappe.png" alt="" aria-hidden="true" loading="eager" decoding="async" />
          <img className="league-ticket-player league-ticket-player--left" src="/images/players/esp-yamal.png" alt="" aria-hidden="true" loading="eager" decoding="async" />
        </>
      )}
      {/* الدوري الفرنسي: ديمبلي يسار التذكرة (موضع فيزيائي صريح) —
          بنفس الصفة الزخرفية وطريقة الدمج */}
      {leagueId === 'fra.1' && (
        <img className="league-ticket-player league-ticket-player--left" src="/images/players/fra-dembele.png" alt="" aria-hidden="true" loading="eager" decoding="async" />
      )}
      <div className="league-ticket-header">
        <LeagueIconBadge leagueId={leagueId} size={60} eager />
      </div>
      <div className="league-ticket-body">
        <em>{name}</em>
        مواعيد · نتائج · ترتيب
        <br />
        يُحدَّث كل دقيقة
      </div>
    </div>
  );
}
