import type { ReactElement } from "react";
import LeagueIconBadge from "./LeagueIconBadge";
import { TicketImage } from "./TicketImage";
import { leagueLandingById } from "../content/competitions";
import { trackHomeEvent } from "../lib/analytics";
import { FEATURED_CLASHES, LeagueTicketCarousel, NovaTicketBrand, XtvTicketBrand, IstarTicketBrand, MokaTicketBrand, StreamMasterTicketWordmark, type FeaturedClash } from "./LeagueTicketCard";
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
       2) أبطال أوروبا «قمة الجولة» — بايرن × أرسنال (وحّدها المالك —
          كانت «مباراة الليلة»)
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
export const INDEX_CLASHES: FeaturedClash[] = [
  { ...FEATURED_CLASHES["uefa.champions"][0], source: "uefa.champions" },
  { ...FEATURED_CLASHES["uefa.champions"][1], source: "uefa.champions" },
  { ...FEATURED_CLASHES["esp.1"][0], source: "esp.1" },
  { ...FEATURED_CLASHES["eng.1"][0], source: "eng.1" },
  { ...FEATURED_CLASHES["eng.1"][1], source: "eng.1" },
];

/* بطاقة مواجهة كأس الرابطة (ليفربول × تشيلسي) — بلا صور لاعبين، بالشعارين
   فقط؛ تُضاف إلى تذكرة الصفحة الرئيسية وحدها، ولا تغيّر INDEX_CLASHES
   المشترك مع صفحة المواعيد */
export const LIVERPOOL_CHELSEA_CUP_CLASH: FeaturedClash = {
  eyebrow: "كأس الرابطة",
  home: {
    name: "ليفربول",
    crest: "/images/teams/liverpool-badge.webp",
    mono: "ليفربول",
    tokens: ["liverpool", "ليفربول"],
  },
  away: {
    name: "تشيلسي",
    crest: "/images/teams/chelsea-badge.webp",
    mono: "تشيلسي",
    tokens: ["chelsea", "تشيلسي"],
  },
  source: "eng.league_cup",
};

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
      {/* رباعي الأعلام متوسّطًا أعلى التذكرة (الحاوية المرنة ذاتها بعد
          تعميم المالك نقلَها من اليسار إلى المركز على كل التذاكر): نوفا
          الكاملة على تذكرة جدول المواعيد الجامعة، وX بجانبها نفس
          الإثراء (تعميم موازٍ)، ثم ايستار فموكا بعد أن عمّمهما المالك
          على نطاق نوفا/X نفسه — وظهورها في هيرو الرئيسية يتبع لهذه
          الوحدة ذاتها */}
      <span className="league-ticket-brands">
        <NovaTicketBrand />
        <XtvTicketBrand />
        <IstarTicketBrand />
        <MokaTicketBrand />
      </span>
      {/* الثلاثية المتوسّطة (تعميم المالك لتذكرة الجامعة كاملة): شعار
          الاتحاد الدولي لكرة القدم «FIFA» بطلب المالك — النصّيّ الأزرق
          الملكي الشفاف من أصول العلامة المحلية — بديلاً عن الكأس المحايدة
          («كل البطولات» لا شعار بطولة واحد لها والفيفا جامعها الأعلى) —
          ثم الخط الرأسي فالمربع الدوّار واسم ستريم ماستر؛ وتنزاح مبطّطةً
          (--under-brands) تحت صف الأعلام المتوسّط فوقها كسائر التذاكر
          الحاملة بعد تعميم المركز؛ وظهورها في هيرو الرئيسية يتبع لهذه
          الوحدة ذاتها */}
      <div className="league-ticket-header league-ticket-header--brand league-ticket-header--under-brands">
        {/* وبطلب المالك صارت أيقونة الفيفا رابطاً لصفحة «مواعيد
            المباريات» /matches/ — نقرة فأرة بنفس قاعدة روابط الأعلام
            وأيقونات البطولات (حيّز زخرفي محفوظ بلا تغيير: tabIndex=-1
            وتلميح الاسم عند التحويم) */}
        <a
          className="league-ticket-badge-link"
          href="/matches/"
          title="مواعيد المباريات"
          tabIndex={-1}
          onClick={() => trackHomeEvent("hero_competition_open", { league_id: "matches", target_path: "/matches/" })}
        >
          <LeagueIconBadge leagueId="matches" iconSrc="/images/brand/fifa-ticket.png" size={60} eager />
        </a>
        <StreamMasterTicketWordmark />
      </div>
      {/* نجوم البطولات (مولّدة من صورهم المعتمدة) خلف النص — عنقود
          الفريق في الوسط بغطاء معتم يحمي قراءة الاسم المعدني */}
      <TicketImage className="league-ticket-player all-leagues-ticket-players" src="/images/players/all-stars.png" alt="" aria-hidden="true" loading="eager" decoding="async" />
      <span className="all-leagues-ticket-veil" aria-hidden="true" />
      {/* أيقونات البطولات الثماني — بطلب المالك صارت روابط لصفحاتها
          المخصصة /matches/{السلاج}/: نقرة الفأرة فوق أي أيقونة تفتح
          صفحة هبوط بطولتها، وتلميح التحويم يعرض اسمها المختصر — وتبقى
          في الحيّز الزخرفي للتذكرة (aria-hidden المحفوظ كما أقفلته
          حُرّاس المواصفات) فلا تدخل ترتيب لوحة المفاتيح (tabIndex=-1) */}
      <div className="leagues-ticket-icons">
        {TICKET_LEAGUES.map((id) => {
          /* الثمانية كلها موثّقة في LEAGUE_LANDINGS بلا استثناء */
          const landing = leagueLandingById(id)!;
          const targetPath = `/matches/${landing.slug}/`;
          return (
            <a
              key={id}
              className="leagues-ticket-icon-link"
              href={targetPath}
              title={landing.shortName}
              tabIndex={-1}
              onClick={() => trackHomeEvent("hero_competition_open", { league_id: id, target_path: targetPath })}
            >
              <LeagueIconBadge leagueId={id} size={46} eager />
            </a>
          );
        })}
      </div>
      {/* المتن: الاسم المعدني الكبير وحده بطلب المالك — سطرا «مواعيد ·
          نتائج · ترتيب / يُحدَّث كل دقيقة» أُخفيا من هنا فهما مكتوبان
          بوضوح في متن صفحة المواعيد تحت التذكرة مباشرةً؛ وتحمل التدرّج
          المعدني الآن لمعة ليمونية مسحوبة (فئة مخصصة — القاعدة بملف
          الأنماط) تتحرك على الجوال والمكتب سواءً */}
      <div className="league-ticket-body">
        <em className="all-leagues-ticket-name">كل البطولات الكبرى</em>
      </div>
    </div>
  );
}

export default function AllLeaguesTicket({ slideOverrides, clashes = INDEX_CLASHES }: { slideOverrides?: Partial<Record<number, ReactElement>>; clashes?: FeaturedClash[] } = {}) {
  return (
    <LeagueTicketCarousel
      leagueId="matches"
      name="كل البطولات الكبرى"
      clashes={clashes}
      slideOverrides={slideOverrides}
      basePlayers={[]}
      base={<AllLeaguesTicketBase />}
      showNovaBrand
      clashRibbon
    />
  );
}
