import { useId, type CSSProperties } from "react";
import LeagueIconBadge from "./LeagueIconBadge";

/* ==========================================================================
   مجسّمات كؤوس ودروع البطولات المخصّصة — 8 بطولات + بديل عام
   --------------------------------------------------------------------------
   يدعم 4 أنماط للمعاينة والمقارنة والاعتماد:
   1) "authentic"    — المجسّم الأيقوني الحقيقي لكل بطولة بمعدنه وهويته الأصلية:
                       • دوري أبطال أوروبا: كأس «ذات الأذنين» الفضية البلاتينية
                       • الدوري الإنجليزي: الكأس الفضية بالتاج الذهبي وقاعدة الملاكيت الخضراء
                       • الدوري الفرنسي: درع السداسي المضلّع الذهبي (Hexagoal)
                       • الدوري الإسباني: الكأس الفضية التوليبية المضلّعة بطوق المرجان
                       • الدوري الألماني: درع «المايسترز» الفضي المستدير (Meisterschale)
                       • الدوري الإيطالي: الكأس المخروطية الذهبية وحلقة اللازورد الأزرق
                       • الدوري السعودي: كأس روشن الحلزونية المعمارية بالبلاتين والذهب والزمرد
                       • الدوري المصري: درع الدوري المصري المستدير بجناحَي الصقر الذهبيين
   2) "unified-gold" — نفس المجسّمات الأيقونية الـ 8 مسبوكة جميعاً بذهب الهوية الموحّد.
   3) "themed-cup"   — كأس القالب الكلاسيكية مطوّرة بمعدن وتاج/نجوم وأشرطة كل بطولة.
   4) "classic"      — الكأس الذهبية الموحّدة السابقة (للمقارنة المرجعية).
========================================================================== */

export type TrophyVariant =
  | "authentic"
  | "authentic-engraved"
  | "unified-gold"
  | "themed-cup"
  | "classic";

export interface LeagueTrophyTheme {
  /** اسم الكأس/الدرع بالعربية للتوضيح في لوحة المعاينة */
  trophyName: string;
  /** وصف قصير للتفصيلة المميزة */
  trophyDetail: string;
  /** لون الهالة الخلفية في الصدر الداكن */
  stageGlow: string;
  /** تدرّج الخط الفاصل المضيء (.lc-split-line) */
  splitGradient: string;
  /** ألوان أشرطة الميدالية في الدرج السفلي */
  ribbons: [string, string, string];
  /** لون شريط القاعدة أو الأشرطة الجانبية في نمط الكأس المطوّرة */
  accentPrimary: string;
  accentSecondary: string;
  /** المعدن الأصلي للبطولة */
  nativeMetal: "silver" | "gold" | "bimetal";
  /** الموضع الرأسي الدقيق لميدالية شعار البطولة على المجسّم (%) */
  emblemTopPct: number;
}

export const LEAGUE_TROPHY_THEMES: Record<string, LeagueTrophyTheme> = {
  "uefa.champions": {
    trophyName: "كأس «ذات الأذنين»",
    trophyDetail: "الأمفورا الفضية البلاتينية بمقبضَي الأذنين المقوّسين عالياً",
    stageGlow: "rgba(56, 189, 248, 0.22)",
    splitGradient: "linear-gradient(90deg, #38bdf8 0%, #e2e8f0 50%, #3b82f6 100%)",
    ribbons: ["#1d4ed8", "#38bdf8", "#e2e8f0"],
    accentPrimary: "#2563eb",
    accentSecondary: "#38bdf8",
    nativeMetal: "silver",
    emblemTopPct: 41.5,
  },
  "eng.1": {
    trophyName: "كأس التاج الملكي",
    trophyDetail: "فضية ممشوقة يعلوها التاج الذهبي وقاعدة الملاكيت الخضراء",
    stageGlow: "rgba(16, 185, 129, 0.2)",
    splitGradient: "linear-gradient(90deg, #10b981 0%, #fbbf24 52%, #7c3aed 100%)",
    ribbons: ["#6d28d9", "#10b981", "#22d3ee"],
    accentPrimary: "#059669",
    accentSecondary: "#7c3aed",
    nativeMetal: "silver",
    emblemTopPct: 41,
  },
  "fra.1": {
    trophyName: "درع السداسي (Hexagoal)",
    trophyDetail: "جوهرة سداسية الأوجه من الذهب المصقول على قاعدة معمارية",
    stageGlow: "rgba(216, 255, 62, 0.2)",
    splitGradient: "linear-gradient(90deg, #d8ff3e 0%, #facc15 52%, #2563eb 100%)",
    ribbons: ["#2563eb", "#d8ff3e", "#facc15"],
    accentPrimary: "#2563eb",
    accentSecondary: "#d8ff3e",
    nativeMetal: "gold",
    emblemTopPct: 40,
  },
  "esp.1": {
    trophyName: "كأس الليغا المضلّعة",
    trophyDetail: "كأس توليبية فضية بأضلاع طولية مصقولة وطوق مرجاني أحمر",
    stageGlow: "rgba(255, 75, 68, 0.2)",
    splitGradient: "linear-gradient(90deg, #ff4b44 0%, #e2e8f0 52%, #f59e0b 100%)",
    ribbons: ["#ff4b44", "#f59e0b", "#e2e8f0"],
    accentPrimary: "#ff4b44",
    accentSecondary: "#f59e0b",
    nativeMetal: "silver",
    emblemTopPct: 39,
  },
  "ger.1": {
    trophyName: "درع «المايسترز» (Meisterschale)",
    trophyDetail: "الدرع الفضي المستدير المنقوش والمرصّع بفصوص التورمالين",
    stageGlow: "rgba(239, 68, 68, 0.19)",
    splitGradient: "linear-gradient(90deg, #ef4444 0%, #e2e8f0 50%, #f59e0b 100%)",
    ribbons: ["#dc2626", "#1f2937", "#f59e0b"],
    accentPrimary: "#dc2626",
    accentSecondary: "#f59e0b",
    nativeMetal: "silver",
    emblemTopPct: 41,
  },
  "ita.1": {
    trophyName: "الكأس المخروطية (Coppa)",
    trophyDetail: "مخروط الذهب الإيطالي الصاعد فوق حلقة اللازورد الأزرق",
    stageGlow: "rgba(59, 130, 246, 0.22)",
    splitGradient: "linear-gradient(90deg, #16a34a 0%, #fbbf24 50%, #2563eb 100%)",
    ribbons: ["#2563eb", "#16a34a", "#dc2626"],
    accentPrimary: "#2563eb",
    accentSecondary: "#16a34a",
    nativeMetal: "gold",
    emblemTopPct: 37,
  },
  "sau.1": {
    trophyName: "كأس روشن الحلزونية",
    trophyDetail: "شفرات معمارية متصاعدة من البلاتين والذهب بقلب زمردي",
    stageGlow: "rgba(16, 185, 129, 0.24)",
    splitGradient: "linear-gradient(90deg, #10b981 0%, #fbbf24 55%, #d8ff3e 100%)",
    ribbons: ["#059669", "#fbbf24", "#34d399"],
    accentPrimary: "#10b981",
    accentSecondary: "#fbbf24",
    nativeMetal: "bimetal",
    emblemTopPct: 39,
  },
  "egy.1": {
    trophyName: "درع الدوري المصري الجديد",
    trophyDetail: "الدرع الفضي الذهبي المستدير بجناحَي الصقر الفرعوني المنقوشين",
    stageGlow: "rgba(245, 158, 11, 0.22)",
    splitGradient: "linear-gradient(90deg, #dc2626 0%, #fbbf24 52%, #f8fafc 100%)",
    ribbons: ["#dc2626", "#fbbf24", "#1e293b"],
    accentPrimary: "#dc2626",
    accentSecondary: "#fbbf24",
    nativeMetal: "bimetal",
    emblemTopPct: 41,
  },
};

const DEFAULT_THEME: LeagueTrophyTheme = {
  trophyName: "الكأس الذهبية",
  trophyDetail: "الكأس الذهبية الكلاسيكية بشعار البطولة",
  stageGlow: "rgba(216, 255, 62, 0.16)",
  splitGradient: "linear-gradient(90deg, #d8ff3e 0%, #f2be45 55%, #7c5cff 100%)",
  ribbons: ["#2b4eff", "#7c5cff", "#d8ff3e"],
  accentPrimary: "#2b4eff",
  accentSecondary: "#d8ff3e",
  nativeMetal: "gold",
  emblemTopPct: 36.5,
};

export function getLeagueTrophyTheme(leagueId: string): LeagueTrophyTheme {
  return LEAGUE_TROPHY_THEMES[leagueId] ?? DEFAULT_THEME;
}

/** تعريفات التدرّجات المعدنية المشتركة داخل كل SVG بمعرّف فريد آمن للـ SSR */
function MetalDefs({ id, forceGold }: { id: string; forceGold: boolean }) {
  return (
    <defs>
      {/* سبيكة الذهب الملكي 24 قيراط */}
      <linearGradient id={`${id}-gold`} x1="15%" y1="8%" x2="85%" y2="92%">
        <stop offset="0%" stopColor="#fff7c2" />
        <stop offset="28%" stopColor="#facc15" />
        <stop offset="65%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#a16207" />
      </linearGradient>
      <linearGradient id={`${id}-gold-deep`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="55%" stopColor="#ca8a04" />
        <stop offset="100%" stopColor="#78350f" />
      </linearGradient>

      {/* سبيكة الفضة البلاتينية (تتحوّل لذهب ملكي في المقترح الموحّد ب) */}
      {forceGold ? (
        <>
          <linearGradient id={`${id}-silver`} x1="15%" y1="8%" x2="85%" y2="92%">
            <stop offset="0%" stopColor="#fff9db" />
            <stop offset="30%" stopColor="#fde047" />
            <stop offset="68%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#9a5b08" />
          </linearGradient>
          <linearGradient id={`${id}-silver-deep`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#facc15" />
            <stop offset="55%" stopColor="#ca8a04" />
            <stop offset="100%" stopColor="#713f12" />
          </linearGradient>
        </>
      ) : (
        <>
          <linearGradient id={`${id}-silver`} x1="14%" y1="6%" x2="86%" y2="94%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="28%" stopColor="#e2e8f0" />
            <stop offset="65%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          <linearGradient id={`${id}-silver-deep`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="55%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
        </>
      )}

      {/* قاعدة الأوبسيديان الداكنة */}
      <linearGradient id={`${id}-obsidian`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#334155" />
        <stop offset="50%" stopColor="#1e293b" />
        <stop offset="100%" stopColor="#090d16" />
      </linearGradient>

      {/* الملاكيت والزمرد الأخضر */}
      <linearGradient id={`${id}-emerald`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#065f46" />
        <stop offset="45%" stopColor="#10b981" />
        <stop offset="70%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#047857" />
      </linearGradient>

      {/* اللازورد الأزرق */}
      <linearGradient id={`${id}-azure`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#1e3a8a" />
        <stop offset="48%" stopColor="#3b82f6" />
        <stop offset="72%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>

      {/* القرمزي/المرجاني */}
      <linearGradient id={`${id}-crimson`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#991b1b" />
        <stop offset="50%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#b91c1c" />
      </linearGradient>
    </defs>
  );
}

/** 1) دوري أبطال أوروبا — «ذات الأذنين» (Big Ears Amphora) */
function ChampionsLeagueSvg({ id, forceGold }: { id: string; forceGold: boolean }) {
  return (
    <svg className="lc-trophy-svg" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <MetalDefs id={id} forceGold={forceGold} />
      {/* مقبضا «ذات الأذنين» الشهيران يرتفعان أعلى الفوهة */}
      <path
        d="M68 44 C48 26, 28 14, 22 36 C16 58, 28 92, 56 108"
        fill="none"
        stroke={`url(#${id}-silver-deep)`}
        strokeWidth="11"
        strokeLinecap="round"
      />
      <path
        d="M68 44 C48 26, 28 14, 22 36 C16 58, 28 92, 56 108"
        fill="none"
        stroke={`url(#${id}-silver)`}
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <path
        d="M132 44 C152 26, 172 14, 178 36 C184 58, 172 92, 144 108"
        fill="none"
        stroke={`url(#${id}-silver-deep)`}
        strokeWidth="11"
        strokeLinecap="round"
      />
      <path
        d="M132 44 C152 26, 172 14, 178 36 C184 58, 172 92, 144 108"
        fill="none"
        stroke={`url(#${id}-silver)`}
        strokeWidth="6.5"
        strokeLinecap="round"
      />

      {/* ساق وقاعدة البلاتين المدرّجة */}
      <path d="M85 130 H115 L120 158 H80 Z" fill={`url(#${id}-silver-deep)`} />
      <rect x="66" y="156" width="68" height="9" rx="4.5" fill={`url(#${id}-silver)`} />
      <rect x="56" y="164" width="88" height="10" rx="5" fill={`url(#${id}-obsidian)`} />
      <rect x="52" y="172" width="96" height="10" rx="5" fill={`url(#${id}-silver)`} />

      {/* بدن الأمفورا العريض */}
      <path
        d="M62 24 H138 C134 36, 131 43, 133 49 C149 63, 152 83, 147 102 C142 118, 126 128, 114 133 H86 C74 128, 58 118, 53 102 C48 83, 51 63, 67 49 C69 43, 66 36, 62 24 Z"
        fill={`url(#${id}-silver)`}
      />
      {/* لمعة طولية تعطي استدارة المعدن المصقول */}
      <path
        d="M72 28 H87 C85 40, 84 46, 85 52 C74 65, 72 84, 76 102 C79 114, 85 123, 92 129 H84 C73 123, 62 113, 58 99 C54 82, 57 64, 70 50 C72 44, 73 37, 72 28 Z"
        fill="rgba(255,255,255,0.42)"
      />
      {/* طوق العنق وفوهة الأمفورا */}
      <rect x="66" y="46" width="68" height="4.5" rx="2.2" fill={`url(#${id}-silver-deep)`} />
      <ellipse cx="100" cy="24" rx="39" ry="7" fill={`url(#${id}-silver)`} />
      <ellipse cx="100" cy="24" rx="32" ry="4.5" fill={`url(#${id}-obsidian)`} />
    </svg>
  );
}

/** 2) الدوري الإنجليزي الممتاز — الكأس الفضية بالتاج الذهبي وقاعدة الملاكيت */
function PremierLeagueSvg({ id, forceGold }: { id: string; forceGold: boolean }) {
  const ribbonPurple = forceGold ? "#ca8a04" : "#6d28d9";
  const ribbonCyan = forceGold ? "#fde047" : "#22d3ee";
  return (
    <svg className="lc-trophy-svg" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <MetalDefs id={id} forceGold={forceGold} />
      {/* أشرطة البطولة الجانبية المتطايرة تحت المقابض */}
      <path d="M44 54 L20 76 L29 82 L47 62 Z" fill={ribbonPurple} opacity="0.92" />
      <path d="M46 60 L24 92 L33 95 L49 68 Z" fill={ribbonCyan} opacity="0.88" />
      <path d="M156 54 L180 76 L171 82 L153 62 Z" fill={ribbonPurple} opacity="0.92" />
      <path d="M154 60 L176 92 L167 95 L151 68 Z" fill={ribbonCyan} opacity="0.88" />

      {/* مقبضا الأسدين الذهبيان */}
      <path
        d="M54 46 C31 44, 26 66, 34 84 C39 95, 48 102, 58 106"
        fill="none"
        stroke={`url(#${id}-gold)`}
        strokeWidth="7.5"
        strokeLinecap="round"
      />
      <circle cx="38" cy="44" r="5" fill={`url(#${id}-gold)`} />
      <path
        d="M146 46 C169 44, 174 66, 166 84 C161 95, 152 102, 142 106"
        fill="none"
        stroke={`url(#${id}-gold)`}
        strokeWidth="7.5"
        strokeLinecap="round"
      />
      <circle cx="162" cy="44" r="5" fill={`url(#${id}-gold)`} />

      {/* الساق وقاعدة الملاكيت الخضراء الملكية */}
      <path d="M82 132 H118 L124 150 H76 Z" fill={`url(#${id}-silver-deep)`} />
      <rect x="62" y="148" width="76" height="8" rx="4" fill={`url(#${id}-silver)`} />
      <rect x="58" y="155" width="84" height="14" rx="4" fill={forceGold ? `url(#${id}-gold-deep)` : `url(#${id}-emerald)`} />
      <rect x="54" y="168" width="92" height="8" rx="4" fill={`url(#${id}-obsidian)`} />
      <rect x="50" y="175" width="100" height="8" rx="4" fill={`url(#${id}-silver)`} />

      {/* البدن الفضي الممشوق */}
      <path
        d="M50 36 H150 C148 72, 142 104, 122 134 H78 C58 104, 52 72, 50 36 Z"
        fill={`url(#${id}-silver)`}
      />
      <path
        d="M60 40 H78 C77 72, 79 102, 89 131 H80 C64 103, 59 72, 60 40 Z"
        fill="rgba(255,255,255,0.44)"
      />

      {/* التاج الذهبي الملكي أعلى الكأس */}
      <path
        d="M60 35 L56 17 L76 26 L84 12 L100 24 L116 12 L124 26 L144 17 L140 35 Z"
        fill={`url(#${id}-gold)`}
      />
      <circle cx="56" cy="15" r="3" fill="#fffbeb" />
      <circle cx="84" cy="10" r="3.2" fill="#fffbeb" />
      <circle cx="100" cy="8.5" r="3.6" fill="#fffbeb" />
      <circle cx="116" cy="10" r="3.2" fill="#fffbeb" />
      <circle cx="144" cy="15" r="3" fill="#fffbeb" />
      <rect x="56" y="31" width="88" height="6.5" rx="3.2" fill={`url(#${id}-gold-deep)`} />
      <circle cx="76" cy="34.2" r="1.8" fill="#ef4444" />
      <circle cx="100" cy="34.2" r="2" fill="#10b981" />
      <circle cx="124" cy="34.2" r="1.8" fill="#3b82f6" />
    </svg>
  );
}

/** 3) الدوري الفرنسي — درع السداسي المضلّع الذهبي (Hexagoal) */
function Ligue1HexagoalSvg({ id, forceGold }: { id: string; forceGold: boolean }) {
  return (
    <svg className="lc-trophy-svg" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <MetalDefs id={id} forceGold={forceGold} />
      {/* القاعدة المعمارية المائلة */}
      <polygon points="82,138 118,138 128,154 72,154" fill={`url(#${id}-gold-deep)`} />
      <polygon points="64,154 136,154 146,180 54,180" fill={`url(#${id}-obsidian)`} />
      <rect x="68" y="166" width="64" height="4.5" rx="2.2" fill={forceGold ? "#d8ff3e" : "#3b82f6"} />
      <rect x="52" y="177" width="96" height="6" rx="3" fill={`url(#${id}-gold)`} />

      {/* الأوجه الـ 6 المشطوفة لدرع السداسي (Hexagoal) حول المركز (100, 80) */}
      {/* الوجه العلوي الأيمن */}
      <polygon points="100,15 156,47.5 135,60 100,40" fill="#fef08a" />
      {/* الوجه الأيمن */}
      <polygon points="156,47.5 156,112.5 135,100 135,60" fill={`url(#${id}-gold)`} />
      {/* الوجه السفلي الأيمن */}
      <polygon points="156,112.5 100,145 100,120 135,100" fill={`url(#${id}-gold-deep)`} />
      {/* الوجه السفلي الأيسر */}
      <polygon points="100,145 44,112.5 65,100 100,120" fill="#a16207" />
      {/* الوجه الأيسر */}
      <polygon points="44,112.5 44,47.5 65,60 65,100" fill={`url(#${id}-gold)`} />
      {/* الوجه العلوي الأيسر */}
      <polygon points="44,47.5 100,15 100,40 65,60" fill="#fde047" />

      {/* القلب السداسي الداخلي وإطار الترصيع المعدني */}
      <polygon
        points="100,40 135,60 135,100 100,120 65,100 65,60"
        fill={`url(#${id}-gold)`}
        stroke="rgba(120,53,15,0.38)"
        strokeWidth="1.6"
      />
      {/* خطوط إشعاعية هندسية محفورة */}
      <g stroke="rgba(255,255,255,0.55)" strokeWidth="1.4">
        <line x1="100" y1="15" x2="100" y2="40" />
        <line x1="156" y1="47.5" x2="135" y2="60" />
        <line x1="156" y1="112.5" x2="135" y2="100" />
        <line x1="100" y1="145" x2="100" y2="120" />
        <line x1="44" y1="112.5" x2="65" y2="100" />
        <line x1="44" y1="47.5" x2="65" y2="60" />
      </g>
    </svg>
  );
}

/** 4) الدوري الإسباني — الكأس التوليبية الفضية المضلّعة (LaLiga) */
function LaLigaSvg({ id, forceGold }: { id: string; forceGold: boolean }) {
  return (
    <svg className="lc-trophy-svg" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <MetalDefs id={id} forceGold={forceGold} />
      {/* القاعدة الأسطوانية وطوق الليغا المرجاني */}
      <rect x="74" y="136" width="52" height="10" rx="4" fill={`url(#${id}-silver-deep)`} />
      <rect x="62" y="145" width="76" height="29" rx="6" fill={`url(#${id}-obsidian)`} />
      <rect
        x="60"
        y="154"
        width="80"
        height="8"
        rx="4"
        fill={forceGold ? `url(#${id}-gold)` : `url(#${id}-crimson)`}
      />
      <rect x="54" y="172" width="92" height="10" rx="5" fill={`url(#${id}-silver)`} />

      {/* البدن التوليبي العريض المضلّع (5 أضلاع طولية منحوتة) */}
      <path
        d="M40 24 H160 C156 64, 144 104, 120 138 H80 C56 104, 44 64, 40 24 Z"
        fill={`url(#${id}-silver)`}
      />
      {/* الأضلاع الطولية المصقولة التي تميّز كأس الليغا */}
      <path
        d="M56 26 H76 C75 64, 79 102, 88 136 H81 C63 102, 56 64, 56 26 Z"
        fill="rgba(255,255,255,0.48)"
      />
      <path
        d="M90 26 H110 C109 64, 106 102, 103 136 H97 C94 102, 91 64, 90 26 Z"
        fill="rgba(255,255,255,0.25)"
      />
      <path
        d="M124 26 H144 C144 64, 137 102, 119 136 H112 C121 102, 125 64, 124 26 Z"
        fill={`url(#${id}-silver-deep)`}
        opacity="0.45"
      />

      {/* فوهة الكأس البيضاوية العريضة */}
      <ellipse cx="100" cy="24" rx="60" ry="9" fill={`url(#${id}-silver)`} />
      <ellipse cx="100" cy="24" rx="52" ry="5.8" fill={`url(#${id}-obsidian)`} />
    </svg>
  );
}

/** 5) الدوري الألماني — درع «المايسترز» الفضي المستدير (Meisterschale) */
function BundesligaShieldSvg({ id, forceGold }: { id: string; forceGold: boolean }) {
  const gems: [number, number][] = [
    [100, 33],
    [142.4, 57.5],
    [142.4, 106.5],
    [100, 131],
    [57.6, 106.5],
    [57.6, 57.5],
  ];
  return (
    <svg className="lc-trophy-svg" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <MetalDefs id={id} forceGold={forceGold} />
      {/* حامل العرض السفلي بطوق البوندسليغا القرمزي */}
      <path d="M68 144 H132 L142 176 H58 Z" fill={`url(#${id}-obsidian)`} />
      <rect
        x="62"
        y="158"
        width="76"
        height="7"
        rx="3.5"
        fill={forceGold ? `url(#${id}-gold)` : `url(#${id}-crimson)`}
      />
      <rect x="52" y="174" width="96" height="8" rx="4" fill={`url(#${id}-silver)`} />

      {/* القرص الفضي المنقوش لدرع المايسترز */}
      <circle cx="100" cy="82" r="66" fill={`url(#${id}-silver-deep)`} />
      <circle cx="100" cy="82" r="62.5" fill={`url(#${id}-silver)`} />
      <circle cx="100" cy="82" r="57.5" fill="none" stroke={`url(#${id}-obsidian)`} strokeWidth="2" opacity="0.45" />

      {/* التقسيمات الشعاعية المنقوشة لأسماء الأبطال */}
      <g stroke="rgba(30,41,59,0.32)" strokeWidth="1.4">
        <line x1="100" y1="24" x2="100" y2="140" />
        <line x1="42" y1="82" x2="158" y2="82" />
        <line x1="59" y1="41" x2="141" y2="123" />
        <line x1="141" y1="41" x2="59" y2="123" />
      </g>
      <circle cx="100" cy="82" r="49" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.6" />

      {/* فصوص التورمالين الكهرمانية المرصّعة حول الحلقة */}
      {gems.map(([gx, gy], idx) => (
        <g key={idx}>
          <circle cx={gx} cy={gy} r="5.5" fill={`url(#${id}-obsidian)`} />
          <circle cx={gx} cy={gy} r="4.1" fill={`url(#${id}-gold)`} />
          <circle cx={gx - 1.2} cy={gy - 1.2} r="1.3" fill="#ffffff" />
        </g>
      ))}

      {/* الطوق المركزي المعدني المحيط بشعار البطولة + مخالب التثبيت السفلية */}
      <circle cx="100" cy="82" r="38" fill={`url(#${id}-silver)`} stroke="rgba(30,41,59,0.32)" strokeWidth="1.5" />
      <rect x="70" y="141" width="8" height="11" rx="3" fill={`url(#${id}-silver)`} />
      <rect x="122" y="141" width="8" height="11" rx="3" fill={`url(#${id}-silver)`} />
    </svg>
  );
}

/** 6) الدوري الإيطالي — الكأس المخروطية الذهبية وحلقة اللازورد (Coppa Campioni d'Italia) */
function SerieACoppaSvg({ id, forceGold }: { id: string; forceGold: boolean }) {
  return (
    <svg className="lc-trophy-svg" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <MetalDefs id={id} forceGold={forceGold} />
      {/* قاعدة الرخام والذهب */}
      <path d="M66 149 H134 L140 176 H60 Z" fill={`url(#${id}-obsidian)`} />
      <rect x="54" y="174" width="92" height="9" rx="4.5" fill={`url(#${id}-gold)`} />

      {/* طوق ألوان إيطاليا الثلاثة (Tricolore) */}
      {!forceGold ? (
        <g>
          <rect x="70" y="143" width="20" height="6" rx="1" fill="#16a34a" />
          <rect x="90" y="143" width="20" height="6" fill="#f8fafc" />
          <rect x="110" y="143" width="20" height="6" rx="1" fill="#dc2626" />
        </g>
      ) : (
        <rect x="70" y="143" width="60" height="6" rx="2" fill={`url(#${id}-gold-deep)`} />
      )}

      {/* حلقة اللازورد الأزرق الشهيرة (Blue Sodalite Ring) */}
      <rect
        x="72"
        y="128"
        width="56"
        height="15"
        rx="7.5"
        fill={forceGold ? `url(#${id}-gold-deep)` : `url(#${id}-azure)`}
        stroke={`url(#${id}-gold)`}
        strokeWidth="2"
      />

      {/* البدن المخروطي الذهبي الصاعد */}
      <path
        d="M38 22 H162 L119 128 H81 Z"
        fill={`url(#${id}-gold)`}
      />
      {/* لمعة ذهبية مائلة */}
      <path
        d="M52 24 H74 L92 126 H83 Z"
        fill="rgba(255,255,255,0.42)"
      />
      {/* طوقان ذهبيان بارزان أسفل الفوهة */}
      <line x1="43" y1="33" x2="157" y2="33" stroke="#fffbeb" strokeWidth="2.2" opacity="0.75" />
      <line x1="46" y1="39" x2="154" y2="39" stroke="#a16207" strokeWidth="1.8" opacity="0.55" />

      {/* الفوهة الذهبية العريضة */}
      <ellipse cx="100" cy="22" rx="62" ry="8.5" fill={`url(#${id}-gold)`} />
      <ellipse cx="100" cy="22" rx="54" ry="5.2" fill="#78350f" />
    </svg>
  );
}

/** 7) الدوري السعودي — كأس دوري روشن الحلزونية المعمارية */
function SaudiRoshnCupSvg({ id, forceGold }: { id: string; forceGold: boolean }) {
  return (
    <svg className="lc-trophy-svg" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <MetalDefs id={id} forceGold={forceGold} />
      {/* قاعدة الأوبسيديان بطوق الزمرد السعودي */}
      <path d="M74 136 H126 L136 174 H64 Z" fill={`url(#${id}-obsidian)`} />
      <rect
        x="64"
        y="154"
        width="72"
        height="8.5"
        rx="4"
        fill={forceGold ? `url(#${id}-gold)` : `url(#${id}-emerald)`}
      />
      <rect x="72" y="135" width="56" height="6" rx="3" fill={`url(#${id}-gold)`} />
      <rect x="54" y="173" width="92" height="9" rx="4.5" fill={`url(#${id}-gold)`} />

      {/* القلب الزمردي المضيء بين قمم الشفرات */}
      <ellipse
        cx="100"
        cy="34"
        rx="34"
        ry="14"
        fill={forceGold ? "#fde047" : "#10b981"}
        opacity="0.85"
      />

      {/* الشفرات الحلزونية الـ 5 المتصاعدة (بلاتين + ذهب) */}
      <path
        d="M44 26 L68 18 L86 136 H76 C58 104, 48 66, 44 26 Z"
        fill={`url(#${id}-silver)`}
      />
      <path
        d="M156 26 L132 18 L114 136 H124 C142 104, 152 66, 156 26 Z"
        fill={`url(#${id}-gold-deep)`}
      />
      <path
        d="M66 19 L92 13 L98 136 H84 C74 98, 69 58, 66 19 Z"
        fill={`url(#${id}-gold)`}
      />
      <path
        d="M134 19 L108 13 L102 136 H116 C126 98, 131 58, 134 19 Z"
        fill={`url(#${id}-silver)`}
      />
      {/* الشفرة المركزية الأمامية العريضة الحاضنة للشعار */}
      <path
        d="M84 16 L100 11 L116 16 C126 56, 122 98, 112 136 H88 C78 98, 74 56, 84 16 Z"
        fill={`url(#${id}-gold)`}
      />
      <path
        d="M88 18 L100 13 L102 136 H91 C83 98, 81 56, 88 18 Z"
        fill="rgba(255,255,255,0.36)"
      />
    </svg>
  );
}

/** 8) الدوري المصري الممتاز — درع الدوري المصري الجديد المجنّح */
function EgyptianShieldSvg({ id, forceGold }: { id: string; forceGold: boolean }) {
  return (
    <svg className="lc-trophy-svg" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <MetalDefs id={id} forceGold={forceGold} />
      {/* قاعدة الجرانيت الأسود واللوح الذهبي الملكي */}
      <path d="M64 144 H136 L144 176 H56 Z" fill={`url(#${id}-obsidian)`} />
      <rect x="72" y="157" width="56" height="10" rx="3" fill={`url(#${id}-gold)`} />
      <rect x="50" y="174" width="100" height="8.5" rx="4.2" fill={`url(#${id}-gold)`} />

      {/* الإطار الفضي الخارجي للدرع المستدير */}
      <circle cx="100" cy="82" r="66" fill={`url(#${id}-silver)`} />
      <circle cx="100" cy="82" r="59.5" fill={`url(#${id}-obsidian)`} />
      <circle
        cx="100"
        cy="82"
        r="56.5"
        fill="none"
        stroke={forceGold ? "#fde047" : "#ef4444"}
        strokeWidth="2.2"
      />

      {/* جناحا الصقر الفرعوني الذهبيان المنقوشان حول القلب */}
      {/* الجناح الأيسر */}
      <path
        d="M92 30 C64 34, 45 56, 46 84 C47 110, 65 130, 92 134 L94 122 C74 118, 60 102, 60 83 C60 63, 74 46, 94 42 Z"
        fill={`url(#${id}-gold)`}
      />
      {/* الجناح الأيمن */}
      <path
        d="M108 30 C136 34, 155 56, 154 84 C153 110, 135 130, 108 134 L106 122 C126 118, 140 102, 140 83 C140 63, 126 46, 106 42 Z"
        fill={`url(#${id}-gold)`}
      />
      {/* خطوط ريش الجناحين المحفورة */}
      <g stroke="#78350f" strokeWidth="1.5" opacity="0.65">
        <line x1="48" y1="68" x2="64" y2="72" />
        <line x1="47" y1="84" x2="63" y2="84" />
        <line x1="50" y1="100" x2="65" y2="95" />
        <line x1="152" y1="68" x2="136" y2="72" />
        <line x1="153" y1="84" x2="137" y2="84" />
        <line x1="150" y1="100" x2="135" y2="95" />
      </g>

      {/* قرص الشمس الذهبي العلوي وزهرة اللوتس السفلية */}
      <circle cx="100" cy="29" r="6.5" fill={`url(#${id}-gold)`} stroke="#fffbeb" strokeWidth="1.4" />
      <polygon points="100,140 91,128 109,128" fill={`url(#${id}-gold)`} />

      {/* الطوق الذهبي المركزي الحاضن للشعار */}
      <circle cx="100" cy="82" r="37.5" fill={`url(#${id}-gold)`} stroke="rgba(120,53,15,0.45)" strokeWidth="1.6" />
    </svg>
  );
}

/** المقترح (ج): كأس القالب الكلاسيكية المطوّرة بمعدن وتيجان وأشرطة كل بطولة */
function ThemedTemplateCupSvg({ id, leagueId }: { id: string; leagueId: string }) {
  const theme = getLeagueTrophyTheme(leagueId);
  const useSilver = theme.nativeMetal === "silver";
  const cupFill = useSilver ? `url(#${id}-silver)` : `url(#${id}-gold)`;
  const handleFill =
    leagueId === "eng.1" || !useSilver ? `url(#${id}-gold)` : `url(#${id}-silver-deep)`;

  return (
    <svg className="lc-trophy-svg" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <MetalDefs id={id} forceGold={false} />
      {/* أشرطة البطولة الملوّنة على الجانبين */}
      <path d="M44 50 L18 74 L27 81 L48 59 Z" fill={theme.accentPrimary} opacity="0.92" />
      <path d="M46 58 L24 90 L33 94 L50 65 Z" fill={theme.accentSecondary} opacity="0.88" />
      <path d="M156 50 L182 74 L173 81 L152 59 Z" fill={theme.accentPrimary} opacity="0.92" />
      <path d="M154 58 L176 90 L167 94 L150 65 Z" fill={theme.accentSecondary} opacity="0.88" />

      {/* تفصيلة علوية مخصّصة لكل بطولة فوق الكأس */}
      {leagueId === "eng.1" && (
        <path
          d="M68 25 L65 11 L82 18 L100 8 L118 18 L135 11 L132 25 Z"
          fill={`url(#${id}-gold)`}
        />
      )}
      {leagueId === "uefa.champions" && (
        <g fill="#38bdf8">
          <circle cx="80" cy="14" r="3" />
          <circle cx="100" cy="10" r="4" />
          <circle cx="120" cy="14" r="3" />
        </g>
      )}
      {(leagueId === "sau.1" || leagueId === "egy.1") && (
        <polygon points="100,8 86,24 114,24" fill={`url(#${id}-gold)`} />
      )}

      {/* الساق والقاعدة المطعّمة بلون البطولة */}
      <rect x="90" y="132" width="20" height="24" fill={handleFill} />
      <rect x="76" y="154" width="48" height="8" rx="3" fill={cupFill} />
      <rect x="64" y="161" width="72" height="17" rx="6" fill={`url(#${id}-obsidian)`} />
      <rect x="68" y="165" width="64" height="6" rx="3" fill={theme.accentPrimary} />

      {/* المقبضان الكلاسيكيان من قالب ugly-horse-87 */}
      <path
        d="M56 44 H34 V72 C34 88, 46 98, 60 98 V86 C51 86, 45 80, 45 71 V55 H56 Z"
        fill={handleFill}
      />
      <path
        d="M144 44 H166 V72 C166 88, 154 98, 140 98 V86 C149 86, 155 80, 155 71 V55 H144 Z"
        fill={handleFill}
      />

      {/* بدن الكأس الكلاسيكي */}
      <path
        d="M58 24 H142 C147 24, 150 27, 150 32 V86 C150 114, 128 136, 100 136 C72 136, 50 114, 50 86 V32 C50 27, 53 24, 58 24 Z"
        fill={cupFill}
      />
      <path
        d="M64 30 H82 V84 C82 103, 89 118, 99 128 C78 124, 64 106, 64 84 Z"
        fill="rgba(255,255,255,0.34)"
      />
    </svg>
  );
}

/** الكأس الذهبية الموحّدة الأصلية من القالب (للمقارنة المرجعية) */
function ClassicTemplateCupSvg() {
  return (
    <svg className="lc-trophy-svg" viewBox="0 0 1024 1024" aria-hidden="true" focusable="false">
      <path
        className="lc-trophy-stem"
        d="M469.333333 682.666667h85.333334v128h-85.333334zM435.2 810.666667h153.6c4.693333 0 8.533333 3.84 8.533333 8.533333v34.133333h-170.666666v-34.133333c0-4.693333 3.84-8.533333 8.533333-8.533333z"
      />
      <path
        className="lc-trophy-base"
        d="M384 853.333333h256a42.666667 42.666667 0 0 1 42.666667 42.666667v42.666667H341.333333v-42.666667a42.666667 42.666667 0 0 1 42.666667-42.666667z"
      />
      <path
        className="lc-trophy-handles"
        d="M213.333333 256v85.333333a42.666667 42.666667 0 0 0 85.333334 0V256H213.333333zM170.666667 213.333333h170.666666v128a85.333333 85.333333 0 1 1-170.666666 0V213.333333zM725.333333 256v85.333333a42.666667 42.666667 0 0 0 85.333334 0V256h-85.333334z m-42.666666-42.666667h170.666666v128a85.333333 85.333333 0 1 1-170.666666 0V213.333333z"
      />
      <path
        className="lc-trophy-cup"
        d="M298.666667 85.333333h426.666666a42.666667 42.666667 0 0 1 42.666667 42.666667v341.333333a256 256 0 1 1-512 0V128a42.666667 42.666667 0 0 1 42.666667-42.666667z"
      />
      <path
        className="lc-trophy-sheen"
        d="M332 132h92v300c0 88 32 162 84 212-104-18-176-108-176-216V132z"
      />
    </svg>
  );
}

/** يرسم الكأس أو الدرع المناسب للبطولة مع توسيط شعارها في موضعه الهندسي */
export default function LeagueTrophyWithEmblem({
  leagueId,
  variant = "authentic",
}: {
  leagueId: string;
  variant?: TrophyVariant;
}) {
  const rawId = useId();
  const safeId = `lt-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const theme = getLeagueTrophyTheme(leagueId);
  const forceGold = variant === "unified-gold";

  const topPct =
    variant === "classic"
      ? 36.5
      : variant === "themed-cup"
        ? 39
        : theme.emblemTopPct;

  let svg;
  if (variant === "classic") {
    svg = <ClassicTemplateCupSvg />;
  } else if (variant === "themed-cup") {
    svg = <ThemedTemplateCupSvg id={safeId} leagueId={leagueId} />;
  } else {
    switch (leagueId) {
      case "uefa.champions":
        svg = <ChampionsLeagueSvg id={safeId} forceGold={forceGold} />;
        break;
      case "eng.1":
        svg = <PremierLeagueSvg id={safeId} forceGold={forceGold} />;
        break;
      case "fra.1":
        svg = <Ligue1HexagoalSvg id={safeId} forceGold={forceGold} />;
        break;
      case "esp.1":
        svg = <LaLigaSvg id={safeId} forceGold={forceGold} />;
        break;
      case "ger.1":
        svg = <BundesligaShieldSvg id={safeId} forceGold={forceGold} />;
        break;
      case "ita.1":
        svg = <SerieACoppaSvg id={safeId} forceGold={forceGold} />;
        break;
      case "sau.1":
        svg = <SaudiRoshnCupSvg id={safeId} forceGold={forceGold} />;
        break;
      case "egy.1":
        svg = <EgyptianShieldSvg id={safeId} forceGold={forceGold} />;
        break;
      default:
        svg = <ClassicTemplateCupSvg />;
        break;
    }
  }

  const emblemStyle = variant === "authentic-engraved" ? "engraved" : "bare";

  return (
    <span
      className="lc-trophy-wrap"
      data-trophy-league={leagueId}
      data-trophy-variant={variant}
      data-trophy-metal={theme.nativeMetal}
      aria-hidden="true"
    >
      {svg}
      <span
        className="lc-trophy-emblem"
        data-emblem-style={emblemStyle}
        style={{ "--lc-emblem-top": `${topPct}%` } as CSSProperties}
      >
        <LeagueIconBadge leagueId={leagueId} />
      </span>
    </span>
  );
}
