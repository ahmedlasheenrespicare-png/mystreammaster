import LeagueIconBadge from "./LeagueIconBadge";
import "./league-ticket.css";

/* ==========================================================================
   كرت «تذكرة المباراة» — أيقونة البطولة داخل تذكرة هولوغرافية
   --------------------------------------------------------------------------
   • التصميم مقتبس من https://uiverse.io/dexter-st/slippery-bird-76
     (المؤلف dexter-st — رخصة MIT من Uiverse.io)، ومکیّف لكرة القدم
     ومصغَّر عن مقاسه الأصلي: أيقونة البطولة مكان عنوان TICKET، واسم
     البطولة ووصف الصفحة في المتن — بلا نوتات موسيقى ولا نصوص حفلات ولا
     باركود ولا رموز تقنية (leagueId يُستخدم داخلياً لحلّ الشعار فقط).
     التفاصيل في league-ticket.css.
   • الأيقونة هي مكوّن LeagueIconBadge نفسه (المصدر الواحد للشعار وبديله):
     البطولة بلا شعار موثّق — كالدوري المصري — يعرض كأس البديل المحايد،
     وتعذّر التحميل يُخفي الصورة ويبقى البديل. ولا تُنسخ الشارة ولا تُثنّى.
   • الكرت كله زخرفي (aria-hidden): اسم البطولة في h1 بجانبه، فلا يتكرر
     النص لقارئ الشاشة، ولا تُخفى عنه معلومة — كل محتوى الكرت شكلي.
========================================================================== */

export default function LeagueTicketCard({ leagueId, name }: { leagueId: string; name: string }) {
  return (
    <div className="league-ticket" aria-hidden="true">
      <div className="league-ticket-header">
        <LeagueIconBadge leagueId={leagueId} size={60} eager />
        <div className="league-ticket-symbol">✁</div>
      </div>
      <div className="league-ticket-body">
        <em>{name}</em>
        مواعيد · نتائج · ترتيب
        <br />
        يُحدَّث كل دقيقة
      </div>
      <div className="league-ticket-bg league-ticket-holographic" />
      {/* مرشّح النتوءات الأصلي (feTurbulence + إضاءة مرآة) — بمعرّف مسمّى
          باسم الكرت حتى لا يصطدم بأي مرشّح SVG آخر في الصفحة */}
      <svg className="league-ticket-filter" focusable="false">
        <filter id="league-ticket-bump">
          <feTurbulence result="noise" numOctaves={3} baseFrequency={0.7} type="fractalNoise" />
          <feSpecularLighting
            in="noise"
            result="specular"
            lightingColor="#fffffc"
            specularExponent={25}
            specularConstant={0.8}
            surfaceScale={0.15}
          >
            <fePointLight z={210} y={100} x={100} />
          </feSpecularLighting>
          <feComposite result="noise2" operator="in" in="specular" in2="SourceGraphic" />
          <feBlend mode="screen" in2="noise2" in="SourceGraphic" />
        </filter>
      </svg>
    </div>
  );
}
