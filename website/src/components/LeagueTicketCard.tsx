import { useMotionReduced } from "./useMotionReduced";
import { motionReduced } from "../lib/motion-preference";
import { LEAGUE_TICKET_PLAYERS } from "../content/league-ticket-players";
import { useTicketSwipe } from "./useTicketSwipe";
import { TicketImage } from "./TicketImage";
import { useEffect, useRef, useState, type ReactElement } from "react";
import LeagueIconBadge from "./LeagueIconBadge";
import { IconPlay } from "./Icons";
import { trackHomeEvent } from "../lib/analytics";
import { FEATURED_NEWS } from "../content/featured-news";
import { FeaturedNewsTicketSlide } from "./FeaturedNewsCards";
import {
  dayInZone,
  hasCompleteScore,
  kickoff,
  readScoreboardResponse,
  shiftDay,
  dayLabel,
  type Match,
} from "../lib/matches.mjs";
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
     التوضيحيان في المتن.
   • المنصّات المنزلقة — تذكرتان بتصميم واحد بتبديل تلقائي 5 ثوانٍ:
     الشريحة الأساسية للبطولة، وشريحة «قمة الجولة» بأيقونتي فريقَي
     القمة واللاعبين بقاعدة التذكرة نفسها، بأرقامٍ لا تُحاكى محلياً
     أبداً: نتيجة ESPN الفعلية ودقيقة المباراة أثناء اللعب، والنهائية
     بعدها، وعداد ثانيةٍ ثانية لموعدها الحقيقي قبلها، وصيغة الانتظار
     الصريحة إن لم تكن مُدرجة على جدول اليوم. الإيقاف بتحويم المؤشر
     الحقيقي فطحف (ليف يخسر الجوال المكلمة أولمبيا من تأثير)، وبالتركيز،
     والنقاط، وخفاء الصفحة، وتقليل الحركة.
========================================================================== */

const REFRESH_MS = 60_000;
const ROTATE_MS = 5_000;
const MANUAL_PAUSE_MS = 15_000;
const CLASH_ZONE = "Africa/Cairo";

interface ClashTeamSide {
  name: string;
  crest: string;
  mono: string;
  tokens: string[];
}

export interface FeaturedClash {
  eyebrow: string;
  home: ClashTeamSide;
  away: ClashTeamSide;
  /* صور اللاعبين اختيارية: بطاقة المواجهة بلا صور تُعرض بالشعارين فقط */
  homePlayer?: string;
  awayPlayer?: string;
  /* تسلسل احتفال متحرك (فليب-بوك 8 إطارات ثابتة بلا خلفية، محاذاة
     موحّدة 1280×1600): إن حُدِّد لجهةٍ عُرض بدل الصورة الساكنة كطبقات
     تتبدّل بشفافية CSS — تشبه الفيديو بثماني صور، وتتجمد على إطار
     «التلفون» مع تفضيل تقليل الحركة */
  homePlayerSequence?: string[];
  awayPlayerSequence?: string[];
  /* ترقية «كأنه فيديو» الحقيقية: مقطع WebM شفاف (VP9 بطبقة ألفا
     BlockAdditional، 15 وضعية فريدة مولّدة/بينية مستوفاة حركياً إلى
     57 إطاراً بدورة 4.3 ثانية) يعلو الفليب-بوك حيث دُعم — كروم/
     فايرفوكس/إيدج يقرؤون ألفا فيرون الفيديو، وسفاري/آي أو إس يبقون
     على الفليب-بوك بلا انكسار. التفعيل عميلاً بعد canplay فعلية */
  homePlayerSequenceVideo?: string;
  awayPlayerSequenceVideo?: string;
  /* مصدر البطولة المغذِّية لهذه المواجهة (مفتاح ESPN نفسه): في تذكرة
     البطولة يُورَّث من التذكرة نفسها ولا يُذكر، وفي التذكرة الجامعة
     بصفحة «مواعيد المباريات» يُثبَّت صراحةً على بطولة المواجهة فيُرسَم
     أيقونتها الصحيحة وتُجلَب مواعيدها من نافذتها هي دون سواها */
  source?: string;
}

/* ── المواجهات المميّزة — شرائح القمم لكل بطولة بترتيب عرضها بعد
     الشريحة الأساسية: مقاتلو الأبطال «قمة الجولة» (باريس × برشلونة)
     و«قمة الجولة» ثانية (بايرن × أرسنال — كانت «مباراة الليلة» قبل أن
     يوحّدها المالك)، والكلاسيكو للإسباني، وقمتان للإنجليزي (تشيلسي ×
     توتنهام ثم أرسنال × إيفرتون). شعارات
     بايرن/أرسنال/تشيلسي/توتنهام/إيفرتون من مصدر أيقونات الموقع نفسه
     (ESPN CDN كما في بطاقات المباريات) مع بديل الحرفين المحلي
     إن تعذّر التحميل */
/* نسخ الاحتفال المخزّنة (‎-celebration / ‎-phone / ‎-playstation بحسب قاعدة
   التسمية في images/players/README.md) تحمل صفّ التحريك الحيّ — نبضة زوم
   خفيفة تبقى القدم مثبته وتتجمد مع تفضيل تقليل الحركة. التحديد باسم الملف
   لا باسم اللاعب يُعمّم على كل احتفالات المستقبل بالقاعدة نفسها */
const celebrationClass = (src: string): string =>
  /-(celebration|phone|playstation)\.png$/.test(src) ? " league-ticket-player--celebrate" : "";

/* حاوية التسلسل — فليب-بوك CSS، يعلوه مقطع WebM الشفاف حين يتاح فعلاً.
   التفعيل عميلاً فقط وتحت أربعة شروط مجتمعة: لا تفضيلَ لتقليل الحركة،
   لا آي أو إس (كل متصفحاته WebKit بلا ألفا VP9)، لا سفاري ماك (يقرأ
   WebM لكن ألفاه غير مضمونة فنبقى على الأضمن)، والمتصفح يقرّ بقدرة
   vp9/webm. ثم لا يظهر المقطع إلا بعد canplay وتشغيل ناجحَين — وإن
   خان الملف أو الترميز (خطأ تحميل) أخفيناه وعاد الفليب-بوك تحته بلا
   وميض؛ وعند الظهور تُخفى إطارات CSS خلفه حتى لا تشفّ مناطقه الشفافة
   عن إطارٍ متخالف يتحرك في العمق */
const TicketSeqPlayer = ({ cssClass, frames, video }: { cssClass: string; frames: string[]; video?: string }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoOn, setVideoOn] = useState(false);
  const reducedMotion = useMotionReduced();
  useEffect(() => {
    if (!video) return;
    const v = videoRef.current;
    if (!v) return;
    if (reducedMotion) { v.pause(); setVideoOn(false); return; }
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return;
    if (/safari/i.test(ua) && !/chrome|chromium|edg|opr/i.test(ua)) return;
    if (v.canPlayType('video/webm; codecs="vp9"') === "") return;
    v.muted = true;
    /* وبملاحظتيه «سريع لا يبدو فيديو» ثم «أبطأ أكثر»: يتباطأ التشغيل
       ×0.47 فيتمدد إحساس الدورة من 4.3 إلى ~9.1 ثانية بسلو موشن
       سينمائي — نفس هدوء ذوبان الفليب-بوك الجديد بالمللي الثانية */
    v.defaultPlaybackRate = 0.47;
    v.playbackRate = 0.47;
    const show = () => {
      v.play().then(() => setVideoOn(true)).catch(() => setVideoOn(false));
    };
    if (v.readyState >= 3) show();
    else v.addEventListener("canplay", show, { once: true });
    return () => { v.removeEventListener("canplay", show); v.pause(); };
  }, [video, reducedMotion]);
  return (
    <span className={`${cssClass}${videoOn ? " league-ticket-player--video-on" : ""}`} data-player-src={frames[frames.length - 1]} aria-hidden="true">
      {frames.map((src, i) => (
        <img key={src} className={`league-ticket-player__seq-frame league-ticket-player__seq-frame--${i + 1}`} src={src} alt="" loading="eager" decoding="async" />
      ))}
      {video ? (
        <video
          ref={videoRef}
          className="league-ticket-player__seq-video"
          src={video}
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setVideoOn(false)}
        />
      ) : null}
    </span>
  );
};

export const FEATURED_CLASHES: Record<string, FeaturedClash[]> = {
  "uefa.champions": [
    {
      eyebrow: "قمة الجولة",
      home: {
        name: "باريس سان جيرمان",
        crest: "/images/teams/paris-saint-germain-badge.webp",
        mono: "باريس",
        tokens: ["paris", "psg", "باريس"],
      },
      away: {
        name: "برشلونة",
        crest: "/images/teams/barcelona-badge.webp",
        mono: "برم",
        tokens: ["barcelona", "برشلونة", "بارسلونة"],
      },
      /* بطلب المالك: إطارات التسلسل الأربعة لديمبيلي صارت كاملة الجسم
         (رأس إلى الأحذية) بخلفيات مزالة لونياً — وبسؤاله «هل تصير
         كأنها فيديو؟» زُرعت أربع وضعيات بينية مولّدة من التوأمين
         المجاورين (خفض→رفع→نزول للصدغ→ضغط) فأصبح التتابع ثمانياً
         بقوام 1480px الموحّد نفسه فيقترب الإقبال بسلاسة مقطع حقيقي */
      homePlayer: "/images/players/fra-dembele-phone.png",
      awayPlayer: "/images/players/esp-yamal.png",
      homePlayerSequence: [
        "/images/players/fra-dembele-phone-stage-1.png",
        "/images/players/fra-dembele-phone-seq-rising.png",
        "/images/players/fra-dembele-phone-stage-2.png",
        "/images/players/fra-dembele-phone-seq-landing.png",
        "/images/players/fra-dembele-phone-stage-3.png",
        "/images/players/fra-dembele-phone-seq-press.png",
        "/images/players/fra-dembele-phone-stage-4.png",
        "/images/players/fra-dembele-phone-seq-peak.png",
      ],
      /* وبأمره «١» (فيديو حقيقي بلا خلفية): سبع وضعيات بينية جديدة
         من التوأمين زادت الوضعيات الفريدة إلى 15، واستيفاء حركي
         (minterpolate على RGB وألفا منفصلين) ضاعفها إلى 57 إطاراً
         بدورة 4.3 ثانية ≈ 13.3fps في WebM شفاف 512×640 بحجم 495KB —
         والفليب-بوك أعلاه هو الاحتياطي التلقائي حيث لا يُدعم ألفا */
      homePlayerSequenceVideo: "/images/players/fra-dembele-phone-seq.webm",
    },
    {
      /* بطلب المالك: كانت العبارة التصنيفية «مباراة الليلة» وصارت
         «قمة الجولة» أسوةً بشقيقتها (الشريحة الثالثة في المنزلقة الجامعة) */
      eyebrow: "قمة الجولة",
      home: {
        name: "بايرن ميونخ",
        crest: "https://a.espncdn.com/i/teamlogos/soccer/500/132.png",
        mono: "باي",
        tokens: ["bayern", "bayern munich", "bayern münchen", "munchen", "münchen", "بايرن", "ميونخ", "ميونيخ"],
      },
      away: {
        name: "أرسنال",
        crest: "https://a.espncdn.com/i/teamlogos/soccer/500/359.png",
        mono: "أرس",
        tokens: ["arsenal", "ارسنال", "أرسنال", "الأرسنال"],
      },
      homePlayer: "/images/players/ger-kane.png",
      awayPlayer: "/images/players/eng-saka.png",
    },
  ],
  "esp.1": [
    {
      eyebrow: "مواجهة الكلاسيكو",
      home: {
        name: "ريال مدريد",
        crest: "/images/teams/real-madrid-badge.webp",
        mono: "ريم",
        tokens: ["real madrid", "realmadrid", "r madrid", "ريال مدريد", "مادريد"],
      },
      away: {
        name: "برشلونة",
        crest: "/images/teams/barcelona-badge.webp",
        mono: "برم",
        tokens: ["barcelona", "برشلونة", "بارسلونة"],
      },
      homePlayer: "/images/players/esp-mbappe.png",
      awayPlayer: "/images/players/esp-yamal.png",
    },
  ],
  "eng.1": [
    {
      /* الشريحة الثانية لتذكرة الدوري الإنجليزي — بياناتها حيّة من النافذة
         نفسها (أسبوع للوراء + أسبوع للأمام): نهائية الأمس تبقى ظاهرة
         وموعد القادمة يَظهر له عدّاد ثم تتحول الحالة وحدها */
      eyebrow: "قمة الجولة",
      home: {
        name: "تشيلسي",
        crest: "https://a.espncdn.com/i/teamlogos/soccer/500/363.png",
        mono: "تشي",
        tokens: ["chelsea", "تشيلسي", "تشلسي"],
      },
      away: {
        name: "توتنهام هوتسبير",
        crest: "https://a.espncdn.com/i/teamlogos/soccer/500/367.png",
        mono: "توت",
        tokens: ["tottenham", "spurs", "توتنهام", "توتينهام"],
      },
      homePlayer: "/images/players/chelsea-palmer.png",
      awayPlayer: "/images/players/eng-marmoush.png",
    },
    {
      /* الشريحة الثالثة لتذكرة الدوري الإنجليزي — قمة الجولة الثانية:
         أرسنال × إيفرتون بصورتَي رايس وغريليش من مكتبة اللاعبين
         بقمصان 25-26؛ الشعاران من مصدر أيقونات بطاقات المباريات نفسه */
      eyebrow: "قمة الجولة",
      home: {
        name: "أرسنال",
        crest: "https://a.espncdn.com/i/teamlogos/soccer/500/359.png",
        mono: "أرس",
        tokens: ["arsenal", "ارسنال", "أرسنال", "الأرسنال"],
      },
      away: {
        name: "إيفرتون",
        crest: "https://a.espncdn.com/i/teamlogos/soccer/500/368.png",
        mono: "إيف",
        tokens: ["everton", "إيفرتون", "الإيفرتون"],
      },
      homePlayer: "/images/players/eng-rice.png",
      awayPlayer: "/images/players/eng-grealish.png",
    },
  ],
};

function isClash(match: Match | null | undefined, clash: FeaturedClash): match is Match {
  if (!match) return false;
  const text = `${match.home.name} ${match.away.name}`.toLowerCase();
  const hasHome = clash.home.tokens.some(t => text.includes(t));
  const hasAway = clash.away.tokens.some(t => text.includes(t));
  return hasHome && hasAway;
}

/* ── جلب المواجهة من لوحة البطولة عبر وسيط الموقع نفسه — نفس مسار
     صفحة «مواعيد المباريات» حرفاً (/scoreboard.php ← ESPN) وبنفس نطاقها
     الزمني: أسبوعٌ إلى الوراء وأسبوعٌ إلى الأمام (MAX_SPAN_DAYS=7 لكل
     طلب، فيُجمَع طلبان) — فتبقى نتيجة الأمس المنتهية ظاهرة، ويُثبَّت
     موعد القادمة ويُعَدُّ لها ثانيةً ثانية، ثم تتحوّل الحالة وحدها:
     عدّاد قبل البداية ← نتيجة ودقيقة مباشرة ← نهائية، بتحديث كل دقيقة ── */
const WINDOW_DAYS = 7;

function selectClash(list: Match[], clash: FeaturedClash): Match | null {
  const clashes = list
    .filter(m => isClash(m, clash))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  /* مباشرة أولاً، فآخر منتهية داخل النطاق (نتيجة الأمس تبقى ظاهرة)،
     فأقرب قادمة مثبّتة */
  const live = clashes.find(m => m.state === "live");
  if (live) return live;
  const finished = [...clashes].reverse().find(m => m.state === "finished");
  if (finished) return finished;
  return clashes.find(m => m.state === "scheduled" || m.state === "other") ?? null;
}

/* جلب نطاقات المصادر المطلوبة — طلب واحد بنطاق المواعيد لكل بطولة
   مغذِّية (نافذتان: أسبوع للوراء + أسبوع للأمام)، ولكل مواجهة
   اختيارها الخاص من قائمة بطولتها هي دون سواها: تغذية واحدة كما كان
   في تذاكر البطولات، وعدّة تغذيات في التذكرة الجامعة بصفحة المواعيد */
function useClashes(leagueId: string, clashes: FeaturedClash[]) {
  const [matches, setMatches] = useState<(Match | null)[]>(() => clashes.map(() => null));
  const clashesKey = clashes.map(c => `${c.source ?? leagueId}:${c.eyebrow}:${c.home.name}:${c.away.name}`).join("|");
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const load = async () => {
      try {
        const day = dayInZone(new Date(), CLASH_ZONE);
        const compact = (iso: string) => iso.replace(/-/g, "");
        /* المصادر المطلوبة لهذه الشرائح حصراً — تذكرة البطولة تعطي
           مصدراً واحداً، والتذكرة الجامعة تعطي بطولات مواجهاتها */
        const sources = Array.from(new Set(clashes.map(c => c.source ?? leagueId)));
        /* نطاق صفحة المواعيد نفسه: [اليوم−7 … اليوم] و[اليوم … +7] —
           MAX_SPAN_DAYS=7 لكل طلب عبر الوسيط */
        const dayCompact = compact(day);
        const fromCompact = compact(shiftDay(day, -WINDOW_DAYS));
        const toCompact = compact(shiftDay(day, WINDOW_DAYS));
        const feeds = await Promise.all(sources.map(async source => {
          const urls = [
            `/scoreboard.php?league=${encodeURIComponent(source)}&dates=${fromCompact}-${dayCompact}`,
            `/scoreboard.php?league=${encodeURIComponent(source)}&dates=${dayCompact}-${toCompact}`,
          ];
          const responses = await Promise.all(urls.map(url => fetch(url, { signal: controller.signal, cache: "no-store" })));
          const list: Match[] = [];
          for (const response of responses) {
            const result = await readScoreboardResponse(response, { id: source, name: source });
            list.push(...(result.matches as Match[]));
          }
          /* اليوم مشترك بين النافذتين — إزالة التكرار */
          const seen = new Set<string>();
          return list.filter(m => (seen.has(m.id) ? false : (seen.add(m.id), true)));
        }));
        if (!alive) return;
        const bySource = new Map(sources.map((source, i) => [source, feeds[i]]));
        setMatches(clashes.map(clash => selectClash(bySource.get(clash.source ?? leagueId) ?? [], clash)));
      } catch {
        /* الصمت مقصود: بطاقة الانتظار هي حالة الفشل المصمّمة */
      }
    };
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      controller.abort();
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId, clashesKey]);
  return matches;
}

/* ── نبضة ثانية واحدة لعداد البداية فقط (لا تكلفة عند عدم الحاجة) ── */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  return now;
}

/* بطلب المالك: خانات العدّاد تُعرض بالأرقام العربية المشرقية
   (٠١٢٣٤٥٦٧٨٩) — تحويل شكلي محض يُطبَّق على النص المهيّأ بعد الحساب،
   فلا يمسّ أي قيمة زمنية، وكل محرف عربي هنا نقطة شيفرة واحدة فينقسم
   بحروفه بأمان عند إسقاطه على بطاقات الفليب */
const AR_DIGITS: Readonly<Record<string, string>> = { "0": "٠", "1": "١", "2": "٢", "3": "٣", "4": "٤", "5": "٥", "6": "٦", "7": "٧", "8": "٨", "9": "٩" };
const toArabicDigits = (western: string) => western.replace(/\d/g, (d) => AR_DIGITS[d]);

function splitCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const two = (n: number) => toArabicDigits(String(n).padStart(2, "0"));
  return { days, hours: two(hours), minutes: two(minutes), seconds: two(seconds) };
}

/* ── أيقونة فريق ثابتة من مكتبة الموقع مع بديل حرفين عند تعذّرها ── */
function TeamCrest({ src, monogram }: { src: string; monogram: string }) {
  const [failed, setFailed] = useState(false);
  if (!failed) {
    return (
      <img
        className="league-ticket-crest"
        src={src}
        alt=""
        width="42"
        height="42"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }
  return <span className="league-ticket-crest league-ticket-crest--mono" aria-hidden="true">{monogram}</span>;
}

/* شعار «نوفا» المقصوص (بدون شريط IPTV) — زخرفة زاوية التذاكر:
   تذاكر fra/ger/ita/egy/sau كلها + أول شريحة من تذاكر eng/esp/uefa
   + تذكرة مواعيد المباريات الجامعة بالكامل (leagueId="matches"، وكذلك
   ظهورها في هيرو الرئيسية باعتبارها الوحدة نفسها) — أعلى اليسار
   الفيزيائي، صغير ومرئي */
const NOVA_BRAND_WHOLE = new Set(["fra.1", "ger.1", "ita.1", "egy.1", "sau.1"]);
const NOVA_BRAND_BASE = new Set(["eng.1", "esp.1", "uefa.champions"]);
export function NovaTicketBrand() {
  /* بطلب المالك صار العلم رابطاً لصفحة سيرفره المخصصة — نقرة فأرة فوق
     التذكرة تصل /nova/؛ ويبقى بحيّز التذكرة الزخرفي (aria-hidden بلا
     تغيير) فلا يدخل ترتيب لوحة المفاتيح (tabIndex=-1) ويسمّي title
     الوجهة عند التحويم */
  return (
    <a className="league-ticket-brand-link" href="/nova/" title="سيرفر نوفا" tabIndex={-1}>
      <img className="league-ticket-brand-nova" src="/images/brand/nova-ticket.png" alt="" aria-hidden="true" loading="eager" decoding="async" />
    </a>
  );
}

/* لوجو «X» المقصوص من نصّه IPTV (اختيار المالك للأيقونة الداكنة) — يجلس
   بجانب نوفا مباشرة أينما ظهرت بعد التعميم في #163 وبمساحتها نفسها */
export function XtvTicketBrand() {
  /* رابط «سيرفر X» /x/ — نفس قاعدة النقرة الزخرفية الموثّقة عند نوفا */
  return (
    <a className="league-ticket-brand-link" href="/x/" title="سيرفر X" tabIndex={-1}>
      <img className="league-ticket-brand-xtv" src="/images/brand/xtv-ticket.png" alt="" aria-hidden="true" loading="eager" decoding="async" />
    </a>
  );
}

/* لوجو سيرفر «ايستار» — اللافتة الرسمية لهيدر istar-tv.com (نجمة
   ذهبية + iSTAR INTERNATIONAL) بعد فتح خلفيتها السوداء إلى شفافية —
   دخل أولاً فرنسياً بطلب المالك ثم عمّمه المالك مع موكا على نطاق
   نوفا/X نفسه حرفياً، وبمساحة X نفسها */
export function IstarTicketBrand() {
  /* رابط «سيرفر إيستار» /istar/ — نفس قاعدة النقرة الزخرفية الموثّقة عند نوفا */
  return (
    <a className="league-ticket-brand-link" href="/istar/" title="سيرفر إيستار" tabIndex={-1}>
      <img className="league-ticket-brand-istar" src="/images/brand/istar-ticket.png" alt="" aria-hidden="true" loading="eager" decoding="async" />
    </a>
  );
}

/* لوجو سيرفر «موكا» — القرص الأبيض MOKA IPTV من الصفحة الرسمية
   mokatv.online بعد قصّه قناعاً دائرياً شفاف الحواف — كشقيقه ايستار:
   فرنسي أولاً ثم معمّم على نطاق نوفا/X نفسه، يلاصقه يساراً وبمساحة
   X نفسها */
export function MokaTicketBrand() {
  /* رابط «سيرفر موكا» /moka/ — نفس قاعدة النقرة الزخرفية الموثّقة عند نوفا */
  return (
    <a className="league-ticket-brand-link" href="/moka/" title="سيرفر موكا" tabIndex={-1}>
      <img className="league-ticket-brand-moka" src="/images/brand/moka-ticket.png" alt="" aria-hidden="true" loading="eager" decoding="async" />
    </a>
  );
}

/* قاعدة ظهور صف الأعلام — مشتق واحد يطابق أصله في TicketBrandPair
   وتستعمله الترويسات لتعرف متى تنزاح مبطّطة (--under-brands) تحت الصف:
   حزمة «الكل» على كل النطاقات، «الأساس» على الساكن والقاعدة، وعلم
   الجامعة (showNovaBrand) يجبر الظهور أينما مُرِّر */
function hasTicketBrands(leagueId: string, scope: "static" | "base" | "clash", showNovaBrand = false): boolean {
  return scope === "clash"
    ? NOVA_BRAND_WHOLE.has(leagueId) || showNovaBrand
    : NOVA_BRAND_WHOLE.has(leagueId) || NOVA_BRAND_BASE.has(leagueId) || showNovaBrand;
}

/* صف الأعلام الزخرفية في حاوية مرنة تتمدد مع عدد الشعارات (فجوة 7px
   ورؤوس متساوية): نوفا وفق حزمة التوزيع وX يجاورها أينما ظهرت بمساحتها
   نفسها، وبقرار المالك الثالث يلتصق بهما شريكتا الخدمة ايستار فموكا
   على **النطاق نفسه حرفاً** (الجامعة كاملةً + الخمسة الساكنة + أول
   شريحة من eng/esp/uefa) — وبقراره الثاني عمّ المركز: الصف **متوسّط
   أعلى كل تذكرة تحمله** فوق الثلاثية المركّزة في سطرين متوسّطين
   متتابعين — التوسيط مدموجٌ في قاعدة CSS نفسها */
function TicketBrandPair({ leagueId, scope, showNovaBrand = false }: {
  leagueId: string;
  scope: "static" | "base" | "clash";
  showNovaBrand?: boolean;
}) {
  if (!hasTicketBrands(leagueId, scope, showNovaBrand)) return null;
  return (
    <span className="league-ticket-brands">
      <NovaTicketBrand />
      <XtvTicketBrand />
      <IstarTicketBrand />
      <MokaTicketBrand />
    </span>
  );
}

/* علامة «ستريم ماستر» النصية بتوسّط رأس التذاكر — مصغّرٌ وفيٌّ لشعار
   الفوتر حرفياً (مربّع ليموني مستدير بمثلث تشغيل دوّار كل ثانية بنفس
   إيقاع loader «nice-panda-34» + الاسم بخط العناوين الأبيض الثقيل)
   يجلس يميناً بجانب أيقونة البطولة ويفصل بينهما خط رأسي ليموني متدرج.
   وتوزيعها مطابقٌ لتوزيع أعلام نوفا/X حرفياً بطلب المالك المثبّت:
   تذاكر fra/ger/ita/egy/sau **كاملة** (وهي ثابتة بلا شرائح) + تذكرة
   مواعيد المباريات الجامعة **كاملة** (الجامع أساساً وقمماً، وإن حملت
   قمتها أيقونة بطولةٍ وردت) + **الشريحة الأولى فقط** من eng/esp/uefa
   فتبقى قممهم نقيةً — وبمقاسات تلائم ارتفاع التذكرة */
const WORDMARK_WHOLE = new Set(["fra.1", "ger.1", "ita.1", "egy.1", "sau.1"]);
const WORDMARK_BASE = new Set(["eng.1", "esp.1", "uefa.champions"]);
function ticketWordmark(leagueId: string, scope: "static" | "base" | "clash"): boolean {
  if (leagueId === "matches") return true;
  if (scope === "clash") return WORDMARK_WHOLE.has(leagueId);
  return WORDMARK_WHOLE.has(leagueId) || WORDMARK_BASE.has(leagueId);
}
export function StreamMasterTicketWordmark() {
  return (
    <span className="league-ticket-wordmark" aria-hidden="true">
      <span className="league-ticket-wordmark-line" />
      <span className="league-ticket-wordmark-badge"><IconPlay /></span>
      <span className="league-ticket-wordmark-text">ستريم ماستر</span>
    </span>
  );
}

/* الإطار الزخرفي المشترك بين منزلقتَي البطولة: خلفية نقطة قالب وخطوط */
function TicketShell() {
  return (
    <>
      <div className="league-ticket-bg league-ticket-holographic">
        <span className="league-ticket-ray" />
        <span className="league-ticket-line league-ticket-line--top" />
        <span className="league-ticket-line league-ticket-line--bottom" />
        <span className="league-ticket-line league-ticket-line--left" />
        <span className="league-ticket-line league-ticket-line--right" />
      </div>
      <span className="league-ticket-symbol" />
    </>
  );
}

/* ── عدّاد الفليب — بطاقات أرقام منقلبة بروح تذاكر البطولات ──────────────
   الإلهام التصميمي: ساعة split-flap الكلاسيكية (البطاقة مقسومة نصفين
   ورفرف ساقط عند كل تبديل) كما في uiverse.io/whoisyourdeadie/friendly-dingo-90
   المتفرّعة أصلاً عن Carlos-vargs/pink-bat-84 — تنفيذ أصلي معاد تصميمه
   لهذه التذاكر: القيم تصل من نبضة React كل ثانية، فتُعرض الجديدة في
   النصفين ساكنةً ورفرف يحمل الخانة القديمة في نصفه العلوي يدور ساقطاً
   180 درجة خلال 480ms ثم يُزال، فتُقرأ القفزة بلا قطع ولا طبقات مزمنة */
function FlipDigit({ value }: { value: string }) {
  const [prev, setPrev] = useState(value);
  const flipping = prev !== value;
  useEffect(() => {
    if (!flipping) return;
    const timer = window.setTimeout(() => setPrev(value), 480);
    return () => window.clearTimeout(timer);
  }, [flipping, value]);
  return (
    <span className="ticket-flip__digit">
      <span className="ticket-flip__half ticket-flip__half--top"><span className="ticket-flip__txt">{value}</span></span>
      <span className="ticket-flip__half ticket-flip__half--bottom"><span className="ticket-flip__txt">{flipping ? prev : value}</span></span>
      {flipping ? <span className="ticket-flip__flap"><span className="ticket-flip__txt">{prev}</span></span> : null}
    </span>
  );
}

export function FlipCountdown({ countdown }: { countdown: ReturnType<typeof splitCountdown> }) {
  /* خلايا العدّاد بصيغة الجمع كما صاغها المالك حرفياً:
     أيام ← ساعات ← دقائق ← ثوانٍ، والأرقام تحتها مشرقية (انظر أعلاه) */
  const cells: { label: string; value: string }[] = [
    ...(countdown.days > 0 ? [{ label: "أيام", value: toArabicDigits(String(countdown.days).padStart(2, "0")) }] : []),
    { label: "ساعات", value: countdown.hours },
    { label: "دقائق", value: countdown.minutes },
    { label: "ثوانٍ", value: countdown.seconds },
  ];
  return (
    <div className="league-ticket-countdown ticket-flip" role="presentation">
      {cells.map((cell) => (
        <span key={cell.label} className="ticket-flip__group">
          <span className="ticket-flip__pair">
            {cell.value.split("").map((digit, i) => (
              <FlipDigit key={i} value={digit} />
            ))}
          </span>
          <small className="ticket-flip__label">{cell.label}</small>
        </span>
      ))}
    </div>
  );
}

/* منزلقة «قمة الجولة/الكلاسيكو» — النصوص بنوعية كرت لوحة المباريات نفسها */
function ClashSlide({ match, clash, leagueId, showWordmark = false, underBrands = false, ribbon = false }: { match: Match | null; clash: FeaturedClash; leagueId: string; showWordmark?: boolean; underBrands?: boolean; ribbon?: boolean }) {
  const pre = match ? match.state === "scheduled" : false;
  const live = match ? match.state === "live" : false;
  const finished = match ? match.state === "finished" : false;
  const now = useNow(pre);
  const kick = match ? kickoff(match.date, CLASH_ZONE) : null;
  /* موعد المواجهة كما يظهر في صفحة المواعيد: وقت القاهرة دائماً، ويُسبَق
     بتاريخ اليوم العربي حين تكون المثبَّتة في يومٍ قادم لا اليوم نفسه */
  const matchDay = match ? dayInZone(new Date(match.date), CLASH_ZONE) : null;
  const isToday = matchDay != null && matchDay === dayInZone(new Date(), CLASH_ZONE);
  const kickLabel = kick && !isToday ? `${dayLabel(matchDay!, { weekday: "long" })} · ${kick}` : kick;
  const countdown = match && pre ? splitCountdown(new Date(match.date).getTime() - now) : null;
  const withScore = match && match.home.score != null && match.away.score != null
    ? hasCompleteScore(match.home.score, match.away.score)
    : false;

  /* اتجاه عرض الفريقين/النتيجة يطابق كرت صفحة المواعيد حرفاً: المضيف
     الفعلي عند ESPN يميناً (RTL أولاً) والضيف يساراً، لا الترتيب الثابت
     للإعداد — فيلتصق رقم كل فريق بجانبه الصحيح مهما دار الضيافة */
  const homeIsConfigHome = !match || clash.home.tokens.some(t => match.home.name.toLowerCase().includes(t));
  const rightSide = homeIsConfigHome ? clash.home : clash.away;
  const leftSide = homeIsConfigHome ? clash.away : clash.home;
  const rightPlayer = homeIsConfigHome ? clash.homePlayer : clash.awayPlayer;
  const leftPlayer = homeIsConfigHome ? clash.awayPlayer : clash.homePlayer;
  /* تسلسل الاحتفال يتبع انعكاس الضيافة نفسه — الجهة تحمل إطاراتها مهما دار الترتيب */
  const rightSequence = homeIsConfigHome ? clash.homePlayerSequence : clash.awayPlayerSequence;
  const leftSequence = homeIsConfigHome ? clash.awayPlayerSequence : clash.homePlayerSequence;
  const rightSequenceVideo = homeIsConfigHome ? clash.homePlayerSequenceVideo : clash.awayPlayerSequenceVideo;
  const leftSequenceVideo = homeIsConfigHome ? clash.awayPlayerSequenceVideo : clash.homePlayerSequenceVideo;

  return (
    <>
      {ribbon ? (
        <span className="league-ticket-ribbon" aria-hidden="true">
          <span className="league-ticket-ribbon-band">{clash.eyebrow}</span>
        </span>
      ) : null}
      <TicketShell />
      {/* اللاعبان بقاعدة التذكرة نفسها — كل لاعب يلتصق بجانب فريقه حين
          ينعكس ترتيب الضيافة عن الترتيب الافتراضي للإعداد. جهةٌ ذات
          تسلسل احتفال تُرسَم حاويةً طبقية (4 إطارات تتبدّل بشفافية
          CSS كفليب-بوك) بدل الصورة الساكنة */}
      {leftSequence ? (
        <TicketSeqPlayer cssClass="league-ticket-player league-ticket-player--left league-ticket-player--celebrate league-ticket-player--seq" frames={leftSequence} video={leftSequenceVideo} />
      ) : (
        leftPlayer ? <TicketImage className={`league-ticket-player league-ticket-player--left${celebrationClass(leftPlayer)}`} src={leftPlayer} alt="" aria-hidden="true" loading="eager" decoding="async" /> : null
      )}
      {rightSequence ? (
        <TicketSeqPlayer cssClass="league-ticket-player league-ticket-player--right league-ticket-player--celebrate league-ticket-player--seq" frames={rightSequence} video={rightSequenceVideo} />
      ) : (
        rightPlayer ? <TicketImage className={`league-ticket-player league-ticket-player--right${celebrationClass(rightPlayer)}`} src={rightPlayer} alt="" aria-hidden="true" loading="eager" decoding="async" /> : null
      )}
      {/* قمم التذاكر الجامعة (matches) تحمل الثلاثية المتوسّطة أيضاً —
          بحزمة «الكل» للتذكرة الأم لا ببطولة المواجهة الواردة التي
          تُبدي أيقونتها هنا — وقمم eng/esp/uefa تبقى نقيةً بطلبه.
          وحيثما جاور الصفُّ المتوسّطُ الثلاثيةَ على الشريحة (الجامعة
          كاملةً) تنزاح مبطّطةً تحته (--under-brands) كقاعدة عامة لكل
          حالات التوسيط المعمّم */}
      <div className={`league-ticket-header${showWordmark ? " league-ticket-header--brand" : ""}${underBrands ? " league-ticket-header--under-brands" : ""}`}>
        <LeagueIconBadge leagueId={leagueId} size={60} eager />
        {showWordmark ? <StreamMasterTicketWordmark /> : null}
      </div>
      <div className="league-ticket-body league-ticket-body--clash">
        {ribbon ? null : <span className="league-ticket-eyebrow">{clash.eyebrow}</span>}
        <div className="league-ticket-clash">
          <div className="league-ticket-clash-team">
            <TeamCrest src={rightSide.crest} monogram={rightSide.mono} />
            <strong dir="auto">{rightSide.name}</strong>
          </div>
          <div className="league-ticket-clash-score">
            {match && (live || finished) && withScore ? (
              <strong className="league-ticket-goals">
                {match.home.score} <span>:</span> {match.away.score}
              </strong>
            ) : match && pre ? (
              <strong className="league-ticket-kickoff">{kickLabel}</strong>
            ) : match ? (
              <strong className="league-ticket-kickoff">{isToday ? "اليوم" : dayLabel(matchDay!, { weekday: "long" })}</strong>
            ) : (
              <strong className="league-ticket-kickoff">قريباً</strong>
            )}
            <small className={`league-ticket-state${live ? " is-live" : ""}`}>
              {match
                ? finished && !isToday
                  ? `${match.detail} · ${dayLabel(matchDay!, { weekday: "long" })}`
                  : match.detail
                : "نتائج الأسبوع المنقضي ومواعيد الأسبوع القادم تظهر هنا من لوحة المواعيد فوراً"}
            </small>
          </div>
          <div className="league-ticket-clash-team">
            <TeamCrest src={leftSide.crest} monogram={leftSide.mono} />
            <strong dir="auto">{leftSide.name}</strong>
          </div>
        </div>
        {countdown ? <FlipCountdown countdown={countdown} /> : null}
      </div>
    </>
  );
}

/* نص مقروء لقارئ الشاشة يلخّص حالة المواجهة — التذكرة نفسها زخرفية */
function clashSummary(match: Match | null, clash: FeaturedClash): string {
  const pairing = `${clash.home.name} و${clash.away.name}`;
  if (!match) return `بطاقة ${clash.eyebrow} بين ${pairing}: تُعرض نتائج الأسبوع المنقضي ومواعيد الأسبوع القادم من لوحة المواعيد نفسها بمجرد توفّرها.`;
  if (match.state === "scheduled") {
    const day = dayInZone(new Date(match.date), CLASH_ZONE);
    const today = dayInZone(new Date(), CLASH_ZONE);
    const when = day === today ? `اليوم ${kickoff(match.date, CLASH_ZONE)}` : `${dayLabel(day, { weekday: "long" })} ${kickoff(match.date, CLASH_ZONE)}`;
    return `${clash.eyebrow} بين ${pairing} لم تبدأ بعد — موعد البداية ${when} بتوقيت القاهرة.`;
  }
  if (match.state === "finished") {
    const day = dayInZone(new Date(match.date), CLASH_ZONE);
    const today = dayInZone(new Date(), CLASH_ZONE);
    const when = day === today ? "اليوم" : `يوم ${dayLabel(day, { weekday: "long" })}`;
    return `انتهت ${clash.eyebrow} بين ${pairing} ${when} بالنتيجة ${match.home.score} إلى ${match.away.score}.`;
  }
  if (match.state === "live") return `${clash.eyebrow} بين ${pairing} مباشرة الآن — ${match.detail}${hasCompleteScore(match.home.score, match.away.score) ? `، النتيجة ${match.home.score} إلى ${match.away.score}` : ""}.`;
  return `${clash.eyebrow} بين ${pairing} — ${match.detail}.`;
}

/* منصة الشرائح — شريحة أساسية + شريحة لكل مواجهة مميّزة، تبديل تلقائي
   5 ثوانٍ مع وقفة إنسانية كاملة. الشريحة الأساسية تصميمها الافتراضي
   تصميم تذكرة البطولة، وتستطيع التذكرة الجامعة في صفحة «مواعيد
   المباريات» تمرير أساسها الخاص (صف أيقونات البطولات وصورة النجوم) */
export function LeagueTicketCarousel({ leagueId, name, clashes, basePlayers, base, showNovaBrand = false, slideOverrides, clashRibbon = false, extraSlides = [] }: {
  leagueId: string;
  name: string;
  clashes: FeaturedClash[];
  basePlayers: ReactElement[];
  base?: ReactElement;
  /* شرائح إضافية تُركَّب بعد الأساسية وبعد شرائح القمم — تستقبل صفحة
     البطولة بطاقات الأخبار التي تخصّها من تذكرة الصفحة الرئيسية، لكل
     شريحة مفتاحها ونصّها المقروء في نقطة التنقّل وعقدة العرض نفسها.
     الترتيب المطلوب: الأساسية أولاً ثم هذه (بطلب المالك 2026-10-28). */
  extraSlides?: { key: string; label: string; node: ReactElement }[];
  /* محتوى بديل لشريحة قمة بفهرسها (0 = أول قمة بعد الأساس) — يبقى داخل
     المنزلقة نفسها بالحركة والنقاط والإيقاف دون تغيير شيء آخر */
  slideOverrides?: Partial<Record<number, ReactElement>>;
  /* تذكرة مواعيد المباريات الجامعة: اللوجو على كل شرائحها (الأساس
     الجامع + شرائح القمم) بتوجيه المالك */
  showNovaBrand?: boolean;
  /* شريط الزاوية باسم المواجهة بدل السطر التوضيحي (تذكرة الصفحة الرئيسية) */
  clashRibbon?: boolean;
}) {
  const matches = useClashes(leagueId, clashes);
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(false);
  const pauseUntil = useRef(0);
  const count = 1 + clashes.length + extraSlides.length;

  /* التبديل التلقائي كل 5 ثوانٍ — يعمل دائماً (جوالاً وسطح مكتب) ولا
     يُوقفه تفضيل تقليل الحركة: ذلك التفضيل يُسقط حركة الانزلاق وحدها
     عبر CSS (@media prefers-reduced-motion) فتصبح الشريحة فورية بلا
     انتقال، بينما تبقى المعلومة الحيّة تتناوب. إيقاف الدورة يدوياً
     متاح دوماً بالمؤشر والتركيز والنقاط، وأي إيقاف يتراجع بعد 15 ثانية */
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden || motionReduced()) return;
      if (Date.now() < pauseUntil.current) return;
      if (!auto) return;
      setActive(prev => (prev + 1) % count);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [auto, count]);

  /* بدء الحركة بعد أول إطار كامل (تهيئة ضوء القالب والشريط) */
  useEffect(() => {
    const starter = window.setTimeout(() => setAuto(true), 1200);
    return () => window.clearTimeout(starter);
  }, []);

  const go = (index: number) => {
    trackHomeEvent("hero_ticket_slide_select", {
      slide_index: index,
      slide_kind: index === 0
        ? "overview"
        : index > clashes.length
          ? "news"
          : slideOverrides?.[index - 1] ? "news" : "match",
    });
    pauseUntil.current = Date.now() + MANUAL_PAUSE_MS;
    setActive(index);
  };

  const swipe = useTicketSwipe(delta => go((active + delta + count) % count));

  /* مفتاح الشريحة يجمع الحاجب بأسماء الفريقين — قد تتقاسم قمّتان
     الحاجب نفسه («قمة الجولة») في البطولة الواحدة */
  const clashKey = (clash: FeaturedClash, i: number) => `clash-${i}-${clash.eyebrow}-${clash.home.name}-${clash.away.name}`;
  const slides = [
    { key: "base", label: `تذكرة ${name}` },
    ...clashes.map((clash, i) => ({
      key: clashKey(clash, i),
      label: `بطاقة ${clash.eyebrow} — ${clash.home.name} × ${clash.away.name}`,
    })),
    /* الشرائح المأخوذة من تذكرة الرئيسية: نصّ النقطة يصف الخبر نفسه */
    ...extraSlides.map(slide => ({ key: slide.key, label: slide.label })),
  ];

  return (
    /* data-slide-count: عدد الشرائح الفعلي — تقرؤه الأنماط لإخفاء نقاط
       التنقّل حين تكون الشريحة واحدة (لا تنقّل لتدلّ عليه)، مع إبقاء
       النقاط في DOM لقارئ الشاشة وحرّاس الواجهة */
    <div
      className="league-ticket-carousel"
      data-slide-count={count}
      onPointerEnter={event => {
        /* الإيقاف بالتحويم للمؤشر فقط — لمسة الجوال لا توقف الدورة */
        if (event.pointerType === "mouse") pauseUntil.current = Date.now() + MANUAL_PAUSE_MS;
      }}
      onFocusCapture={() => { pauseUntil.current = Date.now() + MANUAL_PAUSE_MS; }}
    >
      {clashes.map((clash, i) => (
        <p key={clashKey(clash, i)} className="visually-hidden">{clashSummary(matches[i] ?? null, clash)}</p>
      ))}
      <div className="league-ticket-track" aria-hidden="true" {...swipe} style={{ touchAction: "pan-y pinch-zoom" }}>
        <div className={`league-ticket-slide${active === 0 ? " is-active" : ""}`}>
          {base ?? (
            <div className="league-ticket league-ticket--in-track">
              <TicketShell />
              <TicketBrandPair leagueId={leagueId} scope="base" showNovaBrand={showNovaBrand} />
              {basePlayers}
              {/* الشريحة الأولى — الثلاثية المتوسّطة هنا في حِزم «الكل»
                  و«الأساس» معاً (فرنسا ورفاقها + eng/esp/uefa)، وحيثما
                  جاورها الصف المتوسّط على الشريحة نفسها تنزاح مبطّطةً
                  تحته (--under-brands) فينعم انطباق السطرين المركزيين */}
              <div className={`league-ticket-header${ticketWordmark(leagueId, "base") ? " league-ticket-header--brand" : ""}${ticketWordmark(leagueId, "base") && hasTicketBrands(leagueId, "base", showNovaBrand) ? " league-ticket-header--under-brands" : ""}`}>
                <LeagueIconBadge leagueId={leagueId} size={60} eager />
                {ticketWordmark(leagueId, "base") ? <StreamMasterTicketWordmark /> : null}
              </div>
              <div className="league-ticket-body">
                <em>{name}</em>
                مواعيد · نتائج · ترتيب
                <br />
                يُحدَّث كل دقيقة
              </div>
            </div>
          )}
        </div>
        {clashes.map((clash, i) => (
          <div key={clashKey(clash, i)} className={`league-ticket-slide${active === i + 1 ? " is-active" : ""}`}>
            {slideOverrides?.[i] ?? (
            <div className="league-ticket league-ticket--match league-ticket--in-track">
              <TicketBrandPair leagueId={leagueId} scope="clash" showNovaBrand={showNovaBrand} />
              <ClashSlide match={matches[i] ?? null} clash={clash} leagueId={clash.source ?? leagueId} showWordmark={ticketWordmark(leagueId, "clash")} underBrands={ticketWordmark(leagueId, "clash") && hasTicketBrands(leagueId, "clash", showNovaBrand)} ribbon={clashRibbon} />
            </div>
            )}
          </div>
        ))}
        {extraSlides.map((slide, i) => (
          <div
            key={slide.key}
            className={`league-ticket-slide${active === 1 + clashes.length + i ? " is-active" : ""}`}
          >
            {slide.node}
          </div>
        ))}
      </div>
      <div className="league-ticket-dots">
        {slides.map((slide, i) => (
          <button
            key={slide.key}
            type="button"
            className={`league-ticket-dot${active === i ? " is-active" : ""}`}
            aria-label={slide.label}
            aria-pressed={active === i}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </div>
  );
}

/* اللاعبون لبقية البطولات — مواضعهم الفيزيائية كما وُثّقت أول مرة */
const PLAYER_MAP: Record<string, ReactElement | ReactElement[]> = {
  "eng.1": [
    <TicketImage key="a" className="league-ticket-player" src={LEAGUE_TICKET_PLAYERS["eng.1"][0]} alt="" aria-hidden="true" loading="eager" decoding="async" />,
    <TicketImage key="b" className="league-ticket-player league-ticket-player--right" src={LEAGUE_TICKET_PLAYERS["eng.1"][1]} alt="" aria-hidden="true" loading="eager" decoding="async" />,
  ],
  "esp.1": [
    <TicketImage key="a" className="league-ticket-player league-ticket-player--right" src={LEAGUE_TICKET_PLAYERS["esp.1"][0]} alt="" aria-hidden="true" loading="eager" decoding="async" />,
    <TicketImage key="b" className="league-ticket-player league-ticket-player--left" src={LEAGUE_TICKET_PLAYERS["esp.1"][1]} alt="" aria-hidden="true" loading="eager" decoding="async" />,
  ],
  "fra.1": [
    <TicketImage key="a" className="league-ticket-player league-ticket-player--left" src={LEAGUE_TICKET_PLAYERS["fra.1"][0]} alt="" aria-hidden="true" loading="eager" decoding="async" />,
    <TicketImage key="b" className="league-ticket-player league-ticket-player--right" src={LEAGUE_TICKET_PLAYERS["fra.1"][1]} alt="" aria-hidden="true" loading="eager" decoding="async" />,
  ],
  "ger.1": [
    <TicketImage key="a" className="league-ticket-player league-ticket-player--left" src={LEAGUE_TICKET_PLAYERS["ger.1"][0]} alt="" aria-hidden="true" loading="eager" decoding="async" />,
    <TicketImage key="b" className="league-ticket-player league-ticket-player--right" src={LEAGUE_TICKET_PLAYERS["ger.1"][1]} alt="" aria-hidden="true" loading="eager" decoding="async" />,
  ],
  "ita.1": [
    <TicketImage key="a" className="league-ticket-player league-ticket-player--left" src={LEAGUE_TICKET_PLAYERS["ita.1"][0]} alt="" aria-hidden="true" loading="eager" decoding="async" />,
    <TicketImage key="b" className="league-ticket-player league-ticket-player--right" src={LEAGUE_TICKET_PLAYERS["ita.1"][1]} alt="" aria-hidden="true" loading="eager" decoding="async" />,
  ],
  "egy.1": [
    <TicketImage key="a" className="league-ticket-player league-ticket-player--left" src={LEAGUE_TICKET_PLAYERS["egy.1"][0]} alt="" aria-hidden="true" loading="eager" decoding="async" />,
    <TicketImage key="b" className="league-ticket-player league-ticket-player--right" src={LEAGUE_TICKET_PLAYERS["egy.1"][1]} alt="" aria-hidden="true" loading="eager" decoding="async" />,
  ],
  "sau.1": [
    /* فيليكس يساراً + الدوسري يميناً — الثنائي الثامن الذي يُكمل خريطة
       نجوم البطولات الثماني كاملة، بنفس الصفة الزخرفية والمواضع
       الفيزيائية الصريحة */
    <TicketImage key="a" className="league-ticket-player league-ticket-player--left" src={LEAGUE_TICKET_PLAYERS["sau.1"][0]} alt="" aria-hidden="true" loading="eager" decoding="async" />,
    <TicketImage key="b" className="league-ticket-player league-ticket-player--right" src={LEAGUE_TICKET_PLAYERS["sau.1"][1]} alt="" aria-hidden="true" loading="eager" decoding="async" />,
  ],
};

/* أبطال أوروبا: ميسي في خلفية التكوين خلف رونالدو أعلى يسار التذكرة — يُرسَم
   قبل رونالدو فيتراكب الثاني فوقه (نفس ز-index والأحدث ضمن DOM يعلو) */
const UCL_BASE_PLAYERS = [
  <TicketImage key="back" className="league-ticket-player league-ticket-player--back" src={LEAGUE_TICKET_PLAYERS["uefa.champions"][0]} alt="" aria-hidden="true" loading="eager" decoding="async" />,
  <TicketImage key="star" className="league-ticket-player" src={LEAGUE_TICKET_PLAYERS["uefa.champions"][1]} alt="" aria-hidden="true" loading="eager" decoding="async" />,
];

/* ── بطولات أُخفيت شرائح قممها بطلب المالك (2026-10-28) ─────────────────
   تبقى الشريحة الأولى (تذكرة البطولة) وحدها، وتُسقَط شرائح «قمة الجولة»
   عند الرسم — بلا حذف: المواجهات وتصاميمها ومنطقها الحيّ في
   FEATURED_CLASHES باقٍ كما هو، والتذكرة الجامعة في هيرو الرئيسية تقرأ
   قممها من INDEX_CLASHES فلا تتأثر. ولإرجاع شرائح بطولةٍ يكفي حذف
   معرّفها من هذه القائمة. */
export const HIDDEN_CLASH_LEAGUES = new Set<string>(["eng.1", "esp.1", "uefa.champions"]);

/* ── بطاقات أخبار تذكرة الصفحة الرئيسية موزَّعةً على صفحات بطولاتها ──────
   بطلب المالك (2026-10-28): «خُذ من تذكرة الرئيسية الشرائح التي تناسب كل
   صفحة بطولة». المصدر الواحد هو FEATURED_NEWS في content/featured-news.ts
   (لا نسخة ثانية من النصوص)، والتصنيف هو ما يحدّد البطولة. الترتيب هنا
   هو ترتيب ظهورها في تذكرة الرئيسية نفسه فلا يتبدّل ترتيب الصفحة عن
   الرئيسية. واستكمالاً بنطلب المالك (2026-10-30): نسخ الشرائح الباقية
   ذات التصنيف القابل للتوزيع فأصبحت روشن والمصري منزلقتين ببطاقتهما.
   الشرائح التي لا صفحة بطولة لها (كأس الرابطة، التركي، الكرة الذهبية،
   دوري أبطال آسيا) تبقى في الرئيسية وحدها. */
const LEAGUE_NEWS_HREFS: Record<string, string[]> = {
  /* دوري روشن — بطاقة واحدة (السعودي: أيقونة المباريات sau.1 لا الترتيب ksa.1) */
  "sau.1": [
    "news/saudi-league-round-12-2026/",
  ],
  /* الدوري المصري — بطاقة واحدة */
  "egy.1": [
    "news/egyptian-league-matchday-8-2026/",
  ],
  /* الدوري الإنجليزي — 5 بطاقات */
  "eng.1": [
    "news/carrick-fernandes-talks-2026/",
    "news/liverpool-brighton-live/",
    "news/man-utd-bournemouth-live/",
    "news/tottenham-chelsea-2-0/",
    "news/man-city-aston-villa/",
  ],
  /* الدوري الإسباني — 5 بطاقات */
  "esp.1": [
    "news/mbappe-china-sponsors-2026/",
    "news/barcelona-alvarez-fine-2026/",
    "news/clasico-post-match-reactions-2026/",
    "news/clasico-first-half-2026/",
    "news/clasico-preview-absences-predictions/",
  ],
  /* الدوري الألماني — 3 بطاقات */
  "ger.1": [
    "news/bundesliga-bayern-freiburg-2026/",
    "news/bundesliga-dortmund-frankfurt-2026/",
    "news/bundesliga-kompany-hospitalized-2026/",
  ],
  /* الدوري الفرنسي — بطاقتان */
  "fra.1": ["news/psg-lyon-2-0/", "news/psg-lyon-tonight/"],
  /* دوري أبطال أوروبا — بطاقتان */
  "uefa.champions": ["news/bayern-arsenal-2-2/", "news/psg-barcelona-4-2/"],
  /* الدوري الإيطالي — بطاقة واحدة */
  "ita.1": ["news/inter-fiorentina-2-1/"],
};

/* شرائح الأخبار لعقدة المنزلقة: مفتاح ثابت لكل شريحة، ونصّ النقطة من
   تصنيف الخبر وعنوانه — يُقرأ في قارئ الشاشة بلا اسم فريق مُخترع */
function leagueNewsSlides(leagueId: string): { key: string; label: string; node: ReactElement }[] {
  const hrefs = LEAGUE_NEWS_HREFS[leagueId] ?? [];
  return hrefs.flatMap(href => {
    const item = FEATURED_NEWS.find(news => news.href === href);
    if (!item) return [];
    return [{
      key: `news-${href}`,
      label: `${item.category} — ${item.title}`,
      node: <FeaturedNewsTicketSlide href={href} />,
    }];
  });
}

export default function LeagueTicketCard({ leagueId, name }: { leagueId: string; name: string }) {
  const clashes = FEATURED_CLASHES[leagueId] ?? [];
  /* القمم المخفية تبقى في FEATURED_CLASHES ولا تُرسَم، والأخبار تُضاف
     بعدها — فصفحة البطولة تحمل: الأساسية أولاً ثم بطاقات أخبارها */
  const visibleClashes = HIDDEN_CLASH_LEAGUES.has(leagueId) ? [] : clashes;
  const newsSlides = leagueNewsSlides(leagueId);
  const basePlayers = leagueId === "uefa.champions"
    ? UCL_BASE_PLAYERS
    : (PLAYER_MAP[leagueId] ?? []);
  /* منزلقة متى وُجد ما يتنقّل إليه: قمم ظاهرة أو شرائح أخبار. البطولة
     التي لا أخبار لها ولا قمم (السعودي والمصري اليوم) تبقى تذكرتها
     الساكنة كما هي بلا تغيير. */
  if (visibleClashes.length > 0 || newsSlides.length > 0) {
    return (
      <LeagueTicketCarousel
        leagueId={leagueId}
        name={name}
        clashes={visibleClashes}
        extraSlides={newsSlides}
        basePlayers={Array.isArray(basePlayers) ? basePlayers : [basePlayers]}
      />
    );
  }
  return (
    <div className="league-ticket" aria-hidden="true">
      <div className="league-ticket-bg league-ticket-holographic">
        <span className="league-ticket-ray" />
        <span className="league-ticket-line league-ticket-line--top" />
        <span className="league-ticket-line league-ticket-line--bottom" />
        <span className="league-ticket-line league-ticket-line--left" />
        <span className="league-ticket-line league-ticket-line--right" />
      </div>
      {/* نقطة الضوء — عنصر «مقصّ القصّ» سابقاً؛ صارت نقطة القالب المتوهّجة */}
      <span className="league-ticket-symbol" />
      <TicketBrandPair leagueId={leagueId} scope="static" />
      {PLAYER_MAP[leagueId]}
      {/* الثلاثية المتوسّطة (أيقونة البطولة فالخط فعلامة ستريم ماستر)
          تجلس في رأس كل التذاكر الثابتة حاملةِ حزمة «الكل» — وبعد تعميم
          المالك نقلَ الصف إلى منتصف الأعلى تنزاح مبطّطةً (--under-brands)
          تحته في كل حامل (فرنسا وألمانيا وإيطاليا ومصر والسعودية) فلا
          يصطدم السطران المركزيان المتتابعان */}
      <div className={`league-ticket-header${ticketWordmark(leagueId, "static") ? " league-ticket-header--brand" : ""}${ticketWordmark(leagueId, "static") && hasTicketBrands(leagueId, "static") ? " league-ticket-header--under-brands" : ""}`}>
        <LeagueIconBadge leagueId={leagueId} size={60} eager />
        {ticketWordmark(leagueId, "static") ? <StreamMasterTicketWordmark /> : null}
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
