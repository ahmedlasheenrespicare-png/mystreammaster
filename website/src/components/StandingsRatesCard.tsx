import {
  TACTIC_LABELS,
  archiveTeamStats,
  cleanTeamName,
  standingsRates,
  validateArchive,
} from '../lib/fixtures-archive.mjs';
import { STALE_BADGE_TEXT, formatStandingsTime, seasonText, type StandingsEntry } from '../lib/standings.mjs';
import { providerTeamLogo } from '../lib/leader-logo.mjs';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import LeagueIconBadge from './LeagueIconBadge';
import './league-carousel.css';
import './standings-rates-card.css';

/* الشعارات المحلية المعتمدة داخل المستودع (src/assets/club-logos/manifest.json)
   تظهر أولاً. ومن لا شعار محلي معتمد له تُجلب أيقونته من مضيف مزوّد الترتيب
   نفسه — المصدر ذاته الذي تُجلب منه مواعيد المباريات وبطاقاتها الحيّة:
   ESPN (https://a.espncdn.com/i/teamlogos/soccer/500/<teamId>.png) لبطولاته
   السبع، وHighlightly للدوري المصري — عبر الجسر الموحّد src/lib/leader-logo.mjs
   (providerTeamLogo) نفسه المستخدم في شعارات المتصدّرين. ودرع المونوغرام
   (الأحرف الأولى + المركز) يبقى بديلاً أخيراً عند غياب الشعارين أو فشل تحميل
   صورة المصدر (onError) كي لا تظهر شارة بلا علامة بصرية أبداً. */
const APPROVED_LOCAL_LOGOS: Record<string, string> = {
  'paris saint-germain': '/images/teams/paris-saint-germain-club-badge.webp',
  'barcelona': '/images/teams/barcelona-club-badge.webp',
  'real madrid': '/images/teams/real-madrid-club-badge.webp',
  'atlético madrid': '/images/teams/atletico-madrid-club-badge.webp',
  'atletico madrid': '/images/teams/atletico-madrid-club-badge.webp',
  'manchester city': '/images/teams/manchester-city-club-badge.webp',
  'manchester united': '/images/teams/manchester-united-club-badge.webp',
  'as roma': '/images/teams/as-roma-club-badge.webp',
  'galatasaray': '/images/teams/galatasaray-club-badge.webp',
  'as monaco': '/images/teams/as-monaco-club-badge.webp',
  'sc freiburg': '/images/teams/sc-freiburg-club-badge.webp',
  'internazionale': '/images/teams/internazionale-club-badge.webp',
  'al qadsiah': '/images/teams/al-qadsiah-club-badge.webp',
  /* بيانات المصدر ما زالت تحمل الاسم التاريخي «Al Assiouty Sport»، وهو النادي
     نفسه الذي صار Pyramids FC سنة 2018 (نفس الكيان، نُقل إلى القاهرة وغُيّر
     اسمه)؛ الشعار المعتمد في المكتبة المحلية لبيراميدز. */
  'al assiouty sport': '/images/teams/pyramids-fc-club-badge.webp',
  /* الاسم الحديث للنادي نفسه، كي لا يعود البديل الحرفي إن حدّث المزود التسمية. */
  'pyramids fc': '/images/teams/pyramids-fc-club-badge.webp',
};

export function resolveApprovedTeamLogo(team: { name?: string; logo?: string | null }): string | null {
  if (typeof team.logo === 'string' && /^\/images\/teams\/[a-z0-9-]+\.(?:webp|svg|png)$/.test(team.logo)) {
    return team.logo;
  }
  const key = cleanTeamName(team.name ?? '').toLowerCase();
  return APPROVED_LOCAL_LOGOS[key] ?? null;
}

/* الأرشيف المحلي فقط (JSON من الاستيراد البنائي) — لا طلب خارجي إطلاقاً. يُثري
   الجدول التحليلي بشباكات نظيفة ومباريات دون تسجيل عند توفره لهذه البطولة. */
const archiveModules = import.meta.glob('../content/fixtures-archive/*/*.json', { import: 'default' });

interface ArchiveSeasonStats {
  season: string;
  teams: { teamId: string; played: number; cleanSheets: number; scoreless: number }[];
}

function AttackIcon({ variant }: { variant: 'best' | 'worst' }) {
  return (
    <svg className="ls-rate-icon" width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.75" />
      {variant === 'best' ? (
        <path d="M10 1.5V5M10 15V18.5M1.5 10H5M15 10H18.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      ) : (
        <path d="M6.5 10H13.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      )}
    </svg>
  );
}

function DefenceIcon({ variant }: { variant: 'best' | 'worst' }) {
  return (
    <svg className="ls-rate-icon" width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2.2L3.5 5v4.6c0 4.2 2.8 7.5 6.5 8.6 3.7-1.1 6.5-4.4 6.5-8.6V5L10 2.2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      {variant === 'best' ? (
        <path d="M7.3 10.2l1.9 1.9 3.6-3.7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M10 6.8v4.2M10 13.6h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      )}
    </svg>
  );
}

/* أيقونات المؤشرات الأربعة للملخص التحليلي — أيقونية دلالية تكمّل النص
   (لا يُعتمد على اللون وحده)، تتلوّن في CSS بليموني التذكرة على حبرها */
function TotalGoalsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M10 6.4l3.3 2.4-1.3 3.9H8l-1.3-3.9L10 6.4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function AverageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5.5 10h9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="10" cy="5.4" r="1.35" fill="currentColor" />
      <circle cx="10" cy="14.6" r="1.35" fill="currentColor" />
    </svg>
  );
}

function GoalDiffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 14.2l4.6-4.6 3 3L16.4 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.4 6.6h4.2v4.2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PointsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2.8l2.3 4.6 5.1.75-3.7 3.6.9 5.05L10 14.4l-4.6 2.4.9-5.05-3.7-3.6 5.1-.75L10 2.8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const KPI_ICONS: Record<string, ReactNode> = {
  'total-goals': <TotalGoalsIcon />,
  'avg-per-team': <AverageIcon />,
  'top-gd-per-match': <GoalDiffIcon />,
  'top-ppm': <PointsIcon />,
};

/* قصاصات القالب الاحتفالية (18 قطعة) — ساكنة ومخفية افتراضياً؛ هندستها
   وأزمنتها كلها في standings-rates-card.css عبر nth-child، وتعمل مروراً
   واحداً عند التفاعل فقط. */
const CONFETTI_PIECES = Array.from({ length: 18 }, (_, i) => i);

/* حلقات المؤشر المركزي الزجاجية الخمس — هندستها وألوانها وحركتها الواحدة
   عند التفاعل كلها في standings-rates-card.css عبر nth-child (روح قالب
   uiverse.io/Smit-Prajapati/tricky-turtle-16 — MIT — في نفس مساحة
   الدائرة الحالية 148×148). زخرفية بالكامل؛ الرقم ووسمه هما المحتوى. */
const RIPPLE_RINGS = Array.from({ length: 5 }, (_, i) => i);

/* عدد الكلمات العربية للمباريات: 1 مباراة، 2 مباراتين، 3–10 مباريات، 11+ مباراة */
function matchWord(n: number): string {
  if (n === 1) return 'مباراة';
  if (n === 2) return 'مباراتين';
  if (n >= 3 && n <= 10) return 'مباريات';
  return 'مباراة';
}

/* درع/مونوغرام أنيق: الأحرف الأولى لحدٍّ أقصى كلمتين + المركز في الجدول */
export function teamInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const out = words.slice(0, 2).map((w) => (w[0] ?? '').toUpperCase()).join('');
  return out || '؟';
}

function TeamCrest({
  team,
  provider,
  accent,
  size = 'md',
}: {
  team: { name?: string; logo?: string | null; rank?: number | null; teamId?: string | null };
  provider?: string;
  accent: string;
  size?: 'sm' | 'md';
}) {
  /* التسلسل: شعار محلي معتمد ← شعار مزوّد الترتيب (ESPN/Highlightly من
     leader-logo.mjs — نفس مصدر بطاقات المباريات الحيّة) ← درع المونوغرام
     كاحتياط أخير عند غياب المصدرين أو فشل تحميل صورة المصدر. */
  const [remoteFailed, setRemoteFailed] = useState(false);
  const localLogo = resolveApprovedTeamLogo(team);
  const providerLogo =
    localLogo || remoteFailed
      ? null
      : providerTeamLogo({ teamId: team.teamId ?? undefined, provider, logo: team.logo });
  if (localLogo) {
    return (
      <img
        src={localLogo}
        alt=""
        aria-hidden="true"
        width={size === 'sm' ? 18 : 22}
        height={size === 'sm' ? 18 : 22}
        loading="lazy"
        className={`ls-rate-team-logo${size === 'sm' ? ' ls-rate-team-logo--sm' : ''}`}
      />
    );
  }
  if (providerLogo) {
    return (
      <img
        src={providerLogo}
        alt=""
        aria-hidden="true"
        width={size === 'sm' ? 18 : 22}
        height={size === 'sm' ? 18 : 22}
        loading="lazy"
        decoding="async"
        className={`ls-rate-team-logo${size === 'sm' ? ' ls-rate-team-logo--sm' : ''}`}
        data-crest-source={providerLogo.includes('highlightly.net') ? 'highlightly' : 'espn'}
        onError={() => setRemoteFailed(true)}
      />
    );
  }
  const rank = typeof team.rank === 'number' ? team.rank : null;
  return (
    <span className={`ls-rate-crest ls-rate-crest--${accent}${size === 'sm' ? ' ls-rate-crest--sm' : ''}`} data-rate-crest aria-hidden="true">
      <span className="ls-rate-crest-initials">{teamInitials(cleanTeamName(team.name ?? ''))}</span>
      {rank !== null && (
        <span className="ls-rate-crest-rank"><bdi dir="ltr">#{rank}</bdi></span>
      )}
    </span>
  );
}

const numOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const fmtInt = (v: number | null) => (v === null ? 'غير متاح' : String(Math.trunc(v)));
const fmt2 = (v: number | null) => (v === null ? 'غير متاح' : v.toFixed(2));
const fmtSigned2 = (v: number | null) => {
  if (v === null) return 'غير متاح';
  return `${v > 0 ? '+' : v < 0 ? '-' : ''}${Math.abs(v).toFixed(2)}`;
};
const fmtPct = (v: number | null) => (v === null ? 'غير متاح' : `${v.toFixed(1)}%`);
const benchPct = (value: number, max: number) => (max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0);

type SortKey = 'played' | 'goalsFor' | 'goalsAgainst' | 'goalDifference' | 'attack' | 'attackDelta' | 'defence' | 'defenceDelta' | 'gdPerMatch' | 'power' | 'ppm' | 'winPct';

const SORT_COLUMNS: { key: SortKey; label: string; gloss: string; defaultDir: 1 | -1; hint: string }[] = [
  { key: 'played', label: 'لعب', gloss: 'MP', defaultDir: -1, hint: 'المباريات الملعوبة' },
  { key: 'goalsFor', label: 'له', gloss: 'GF', defaultDir: -1, hint: 'الأهداف المسجلة' },
  { key: 'goalsAgainst', label: 'عليه', gloss: 'GA', defaultDir: 1, hint: 'الأهداف المستقبلة — الأدنى أقوى' },
  { key: 'goalDifference', label: 'الفارق', gloss: 'GD', defaultDir: -1, hint: 'فارق الأهداف كما ورد من المصدر' },
  { key: 'attack', label: 'هجوم/م', gloss: 'GF/M', defaultDir: -1, hint: 'أهداف مسجلة لكل مباراة' },
  { key: 'attackDelta', label: 'هجوم ±', gloss: 'ΔGF/M', defaultDir: -1, hint: 'فارق معدل التسجيل عن متوسط المسابقة' },
  { key: 'defence', label: 'دفاع/م', gloss: 'GA/M', defaultDir: 1, hint: 'أهداف مستقبلة لكل مباراة — الأدنى أقوى' },
  { key: 'defenceDelta', label: 'دفاع ±', gloss: 'ΔGA/M', defaultDir: 1, hint: 'فارق معدل الاستقبال عن متوسط المسابقة — الأدنى أقوى' },
  { key: 'gdPerMatch', label: 'صافي/م', gloss: 'GD/M', defaultDir: -1, hint: 'صافي الفارق لكل مباراة' },
  { key: 'power', label: 'القوة', gloss: 'PWR', defaultDir: -1, hint: 'مؤشر القوة المركّب: قوة الهجوم ناقص قوة الدفاع بالانحراف المعياري عن متوسط الفرق' },
  { key: 'ppm', label: 'نقاط/م', gloss: 'PPM', defaultDir: -1, hint: 'النقاط لكل مباراة' },
  { key: 'winPct', label: 'فوز', gloss: 'Win%', defaultDir: -1, hint: 'نسبة الفوز' },
];

/* تنسيق قيمة متصدّر كل مقياس في شريط «الأول في كل مقياس» — نفس تنسيق
   خلية عموده في الجدول حرفيًا كي يتطابق الرقمان عند المقارنة البصرية */
const leaderValueText = (key: SortKey, value: number): string => {
  switch (key) {
    case 'played':
    case 'goalsFor':
    case 'goalsAgainst':
      return fmtInt(value);
    case 'goalDifference':
      return `${value > 0 ? '+' : ''}${value}`;
    case 'attackDelta':
    case 'defenceDelta':
    case 'gdPerMatch':
    case 'power':
      return fmtSigned2(value);
    case 'winPct':
      return fmtPct(value);
    default:
      return fmt2(value);
  }
};

/* تنسيق صفَّي التوزيع (الوسيط والانحراف المعياري) في تذييل الجدول:
   الوسيط بإشارة المقاييس الموقّعة كصف المتوسط، والانحراف المعياري
   مقدار موجب دائماً فلا إشارة له (signed=false) */
const distributionValueText = (key: SortKey, value: number | null, signed: boolean): string => {
  if (value === null) return 'غير متاح';
  if (key === 'winPct') return fmtPct(value);
  if (signed && (key === 'goalDifference' || key === 'attackDelta' || key === 'defenceDelta' || key === 'gdPerMatch' || key === 'power')) {
    return fmtSigned2(value);
  }
  return fmt2(value);
};

export interface StandingsRatesCardProps {
  entries: Partial<StandingsEntry>[];
  league?: string;
  season?: number | string;
  provider?: string;
  fetchedAt?: string;
  stale?: boolean;
  idPrefix?: string;
  /**
   * اسم البطولة العربية المختصر — يظهر سطراً تمهيدياً صغيراً في لوح
   * «التذكرة» أعلى البطاقة كما في رأس تذكرة البطولة بصدر الصفحة.
   * غيابه يُخفي السطر فقط (الشارة تبقى).
   */
  leagueName?: string;
  /**
   * معرّف البطولة لدى مصدر المباريات لمفتاح الشعار — غيابه يعني اشتقاقه
   * من `league` (معرّف الترتيب) مع تحويل السعودي الموثّق ksa.1 ← sau.1.
   */
  iconLeagueId?: string;
}

export default function StandingsRatesCard({
  entries,
  league = 'league',
  season,
  provider,
  fetchedAt,
  stale = false,
  idPrefix,
  leagueName,
  iconLeagueId,
}: StandingsRatesCardProps) {
  const rates = standingsRates(entries);
  const { league: leagueSummary } = rates;
  const baseId = idPrefix ?? `standings-${league.replace(/\./g, '-')}-rates`;
  const formattedSeason = typeof season === 'number' ? seasonText(season) : season;
  /* شعار التذكرة مفتاحه معرّف المباريات لا الترتيب — السعودي ترتيبه ksa.1
     وشعاره تحت sau.1 (نفس التحويل الموثّق في LeagueLandingPage) */
  const ticketLeagueId = iconLeagueId ?? (league === 'ksa.1' ? 'sau.1' : league);

  /* الأرشيف المحلي يُحمَّل كسماً خاصاً (لا يُدمج في حزمة الصفحة) ويظهر أثره
     فقط بعد التحميل — الرسم الأولي بلا عمودي الأرشيف يتطابق بين الخادم
     والعميل فلا انحراف ترطيب. */
  const [archiveSeason, setArchiveSeason] = useState<ArchiveSeasonStats | null>(null);
  const [archiveReady, setArchiveReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const loaders = Object.entries(archiveModules).filter(([key]) => key.includes(`/fixtures-archive/${league}/`));
    if (!loaders.length) {
      setArchiveSeason(null);
      setArchiveReady(true);
      return;
    }
    void Promise.all(loaders.map(([, load]) => load().catch(() => null))).then((values) => {
      if (cancelled) return;
      const valid = values
        .flatMap((value) => {
          try { return [validateArchive(value)]; } catch { return []; }
        })
        .filter((a) => a.league === league)
        .sort((a, b) => b.season.localeCompare(a.season));
      const archive = valid[0];
      setArchiveSeason(
        archive
          ? {
              season: archive.season,
              teams: archiveTeamStats(archive.matches).map((t) => ({
                teamId: t.id,
                played: t.played,
                cleanSheets: t.cleanSheets,
                scoreless: t.scoreless,
              })),
            }
          : null,
      );
      setArchiveReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [league]);

  const archiveByTeam = useMemo(
    () => new Map((archiveSeason?.teams ?? []).map((t) => [t.teamId, t])),
    [archiveSeason],
  );
  const hasArchive = archiveReady && archiveByTeam.size > 0;

  /* فرز الجدول التحليلي: القيم الناقصة تبقى في الأسفل دائماً، والتعادل يُحسم
     بالمركز في الجدول ثم بالاسم. الاتجاه الافتراضي = «الأفضل أولاً» لكل عمود. */
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const toggleSort = (key: SortKey) => {
    setSort((prev) => {
      if (prev && prev.key === key) return { key, dir: prev.dir === -1 ? 1 : -1 };
      const def = SORT_COLUMNS.find((c) => c.key === key)?.defaultDir ?? -1;
      return { key, dir: def };
    });
  };
  /* فرز «الأفضل أولاً» مباشرة (لا تبديل اتجاه) — لشرائح «الأول في كل
     مقياس»: ضغطها يعلو بصاحبها الجدولَ دائماً بمركز مقياسه #1 */
  const sortBestFirst = (key: SortKey) => {
    setSort({ key, dir: SORT_COLUMNS.find((c) => c.key === key)?.defaultDir ?? -1 });
  };
  const sortedRows = useMemo(() => {
    const rows = [...rates.rows];
    if (!sort) return rows;
    const { key, dir } = sort;
    rows.sort((a, b) => {
      const av = numOrNull(a[key]);
      const bv = numOrNull(b[key]);
      if (av === null && bv === null) return (numOrNull(a.rank) ?? 0) - (numOrNull(b.rank) ?? 0);
      if (av === null) return 1;
      if (bv === null) return -1;
      const diff = av - bv;
      if (diff !== 0) return diff * dir;
      return (numOrNull(a.rank) ?? 0) - (numOrNull(b.rank) ?? 0);
    });
    return rows;
  }, [rates, sort]);

  /* مركز كل فريق في مقياس الفرز النشط — خاصية ثابتة للفريق لا لاتجاه
     العرض: الأفضل في المقياس #1 دائماً (باتجاه عموده «الأفضل أولاً»)،
     والمتساوون بالقيمة الدقيقة يتقاسمون المركز نفسه (المعدلات كسور
     مختصرة فيتساوى المتعادلون تماماً)، وذو القيمة الناقصة بلا مركز.
     يظهر عموده في الجدول أثناء الفرز فقط. */
  const metricRanks = useMemo(() => {
    const ranks = new Map<object, number>();
    if (!sort) return ranks;
    const bestFirst = SORT_COLUMNS.find((c) => c.key === sort.key)?.defaultDir ?? -1;
    const ordered = rates.rows
      .filter((t) => numOrNull(t[sort.key]) !== null)
      .sort((a, b) => {
        const diff = (numOrNull(a[sort.key])! - numOrNull(b[sort.key])!) * bestFirst;
        return diff !== 0 ? diff : (numOrNull(a.rank) ?? 0) - (numOrNull(b.rank) ?? 0);
      });
    let prevValue: number | null = null;
    let prevRank = 0;
    ordered.forEach((t, i) => {
      const v = numOrNull(t[sort.key])!;
      const rank = prevValue !== null && v === prevValue ? prevRank : i + 1;
      ranks.set(t, rank);
      prevValue = v;
      prevRank = rank;
    });
    return ranks;
  }, [rates, sort]);
  const activeSortColumn = sort ? SORT_COLUMNS.find((c) => c.key === sort.key) : undefined;

  /* إحصاءات عمودي الأرشيف لصفوف تذييل الجدول (متوسط/وسيط/انحراف) — من
     فرق الأرشيف وحدها وبعدد مبارياتها المخزّنة، لا من جدول الترتيب
     (عينة مختلفة صراحةً، كما في عمودي الأرشيف أنفسهما) */
  const archiveFooterStats = useMemo(() => {
    const statOf = (pick: (t: { cleanSheets: number; scoreless: number }) => number) => {
      const values = [...archiveByTeam.values()].map(pick);
      if (!values.length) return { mean: null as number | null, median: null as number | null, sd: null as number | null };
      const sorted = [...values].sort((a, b) => a - b);
      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
      return { mean, median, sd };
    };
    return { cleanSheets: statOf((t) => t.cleanSheets), scoreless: statOf((t) => t.scoreless) };
  }, [archiveByTeam]);
  const leagueAverages = leagueSummary.averages;
  const leagueDistributions = leagueSummary.distributions;

  const cards: {
    key: 'best-attack' | 'worst-attack' | 'best-defence' | 'worst-defence';
    teamsKey: 'bestAttack' | 'worstAttack' | 'bestDefence' | 'worstDefence';
    domain: 'attack' | 'defence';
    variant: 'best' | 'worst';
    badge: string;
    title: string;
    unit: string;
    accent: 'atk-best' | 'atk-worst' | 'def-best' | 'def-worst';
  }[] = [
    { key: 'best-attack', teamsKey: 'bestAttack', domain: 'attack', variant: 'best', badge: 'هجوم · الأعلى تسجيلاً', title: 'أقوى هجوم', unit: 'هدف مسجل/مباراة', accent: 'atk-best' },
    { key: 'worst-attack', teamsKey: 'worstAttack', domain: 'attack', variant: 'worst', badge: 'هجوم · الأقل تسجيلاً', title: 'أضعف هجوم', unit: 'هدف مسجل/مباراة', accent: 'atk-worst' },
    { key: 'best-defence', teamsKey: 'bestDefence', domain: 'defence', variant: 'best', badge: 'دفاع · الأقل استقبالاً', title: 'أقوى دفاع', unit: 'هدف مستقبَل/مباراة', accent: 'def-best' },
    { key: 'worst-defence', teamsKey: 'worstDefence', domain: 'defence', variant: 'worst', badge: 'دفاع · الأعلى استقبالاً', title: 'أضعف دفاع', unit: 'هدف مستقبَل/مباراة', accent: 'def-worst' },
  ];

  const topTeamSub = (top: { teams: { name?: string }[] } | null): ReactNode => {
    if (!top || !top.teams.length) return 'غير متاح';
    const first = cleanTeamName(top.teams[0].name ?? '');
    return (
      <>
        <bdi dir="auto">{first}</bdi>
        {top.teams.length > 1 && (
          <>
            {' '}· تعادل <bdi dir="ltr">{top.teams.length}</bdi> فرق
          </>
        )}
      </>
    );
  };
  const kpis: { id: string; label: string; value: string; sub: ReactNode }[] = [
    {
      id: 'total-goals',
      label: 'إجمالي أهداف المسابقة',
      value: numOrNull(leagueSummary.totalGoals) === null ? 'غير متاح' : fmtInt(leagueSummary.totalGoals),
      sub: leagueSummary.totalTeamMatches === null ? 'غير متاح' : (
        <>إجمالي مباريات الفرق <bdi dir="ltr">{leagueSummary.totalTeamMatches}</bdi></>
      ),
    },
    { id: 'avg-per-team', label: 'متوسط أهداف الفريق/مباراة', value: fmt2(leagueSummary.averagePerTeam), sub: 'إجمالي الأهداف ÷ إجمالي المباريات' },
    { id: 'top-gd-per-match', label: 'أعلى فارق أهداف/مباراة', value: fmtSigned2(leagueSummary.bestGdPerMatch?.value ?? null), sub: topTeamSub(leagueSummary.bestGdPerMatch) },
    { id: 'top-ppm', label: 'أعلى نقاط/مباراة', value: fmt2(leagueSummary.bestPpm?.value ?? null), sub: topTeamSub(leagueSummary.bestPpm) },
  ];

  return (
    <section
      className={`ls-rates-card${stale ? ' ls-rates-card--stale' : ''}`}
      aria-labelledby={`${baseId}-title`}
      data-standings-rates={league}
      data-rates-stale={stale ? 'true' : 'false'}
    >
      {/* أ) الجزء العلوي المزدوج — Split Summary Hero بهوية القالب المرجعي
          uiverse.io/sabbircoder07/spotty-firefox-94 (MIT): لوح رئيسي +
          لوح ملخص أبيض، بكل معلومات البطاقة الأصلية دون حذف. اللوح
          الرئيسي يرتدي قشرة «تذكرة البطولة» في صدر الصفحة نفسها
          (LeagueTicketCard — uiverse.io/Spacious74/moody-owl-18، MIT):
          إطار ليموني مضيء، شعاع مموّه، خطوط متقاطعة عند 10%، نقطة ضوء
          على الحافة، شارة البطولة واسمها، والعنوان بالنص المعدني —
          القشرة زخرفية بالكامل (aria-hidden) ولا تحمل معلومة وحدها. */}
      <div className="ls-rates-hero">
        {/* اللوح الرئيسي — هيكل .results-summary-container__result بقشرة التذكرة */}
        <div className="ls-rates-panel">
          {/* قشرة التذكرة الزخرفية — نفس عناصر TicketShell في التذكرة:
              الشعاع الضوئي المموّه + الخطوط الأربعة المتقاطعة عند 10% */}
          <div className="ls-rates-ticket-shell" aria-hidden="true">
            <span className="ls-rates-ticket-ray" />
            <span className="ls-rates-ticket-line ls-rates-ticket-line--top" />
            <span className="ls-rates-ticket-line ls-rates-ticket-line--bottom" />
            <span className="ls-rates-ticket-line ls-rates-ticket-line--left" />
            <span className="ls-rates-ticket-line ls-rates-ticket-line--right" />
          </div>
          {/* نقطة الضوء المتوهّجة على الحافة — ساكنة، وتدور دورة واحدة عند التفاعل */}
          <span className="ls-rates-ticket-dot" aria-hidden="true" />

          <div className="ls-rates-confetti" aria-hidden="true">
            {CONFETTI_PIECES.map((piece) => (
              <span key={piece} className="ls-rates-confetti-piece" />
            ))}
          </div>

          {/* رأس التذكرة: شارة البطولة نفسها في تذكرة صدر الصفحة
              (LeagueIconBadge — المصدر الواحد للشعار وبديله المحايد) */}
          <div className="ls-rates-ticket-badge" aria-hidden="true">
            <LeagueIconBadge leagueId={ticketLeagueId} size={52} />
          </div>
          {leagueName ? <p className="ls-rates-ticket-eyebrow">{leagueName}</p> : null}

          <h3 id={`${baseId}-title`} className="ls-rates-title">الهجوم والدفاع — معدلات أهداف الموسم</h3>

          {/* المؤشر المركزي للموسم (متوسط أهداف الفريق/مباراة) — خمس حلقات
              زجاجية متموجة بروح قالب tricky-turtle-16 في نفس مساحة الدائرة
              السابقة، والرقم ووسمه فوقها كما كانا حرفيًا */}
          <div className="ls-rates-result-box">
            {RIPPLE_RINGS.map((ring) => (
              <span key={ring} className="ls-rates-ring" aria-hidden="true" />
            ))}
            <strong className={`ls-rates-result-value${leagueSummary.averagePerTeam === null ? ' ls-rates-result-value--na' : ''}`}>
              <bdi dir="ltr">{fmt2(leagueSummary.averagePerTeam)}</bdi>
            </strong>
            <span className="ls-rates-result-label">متوسط أهداف الفريق/مباراة</span>
          </div>

          {/* سطر الحالة والفقرة التوضيحية وأقراص البيانات مخفية بصريًا
              بطلب صريح — تبقى نصوصها في المحتوى للفهرسة وقارئات الشاشة
              (.visually-hidden لا display:none)، ويُستثنى منها وسم
              «بيانات قديمة» أدناه فيبقى ظاهرًا عند التعذّر كما هو */}
          <p className="ls-rates-status visually-hidden">قراءة تحليلية من جدول الترتيب</p>

          <p className="ls-rates-subtitle visually-hidden">
            محسوبة من جدول الترتيب الحالي فقط، بلا أي بيانات خارجية: المعدل = الأهداف ÷ المباريات الملعوبة،
            والتصنيف التكتيكي يقارن كل فريق بمتوسط المسابقة بالقيمة الدقيقة قبل التقريب.
          </p>

          {(formattedSeason || provider || fetchedAt || stale) && (
            <p className="ls-rates-meta" data-rates-meta>
              {formattedSeason && (
                <span className="ls-rates-pill visually-hidden" data-rates-season>
                  موسم <bdi dir="ltr">{formattedSeason}</bdi>
                </span>
              )}
              {provider && (
                <span className="ls-rates-pill visually-hidden" data-rates-provider>
                  المصدر: <bdi dir="ltr">{provider}</bdi>
                </span>
              )}
              {fetchedAt && (
                <span className="ls-rates-pill visually-hidden" data-rates-fetched>
                  آخر قراءة للترتيب: <bdi>{formatStandingsTime(fetchedAt)}</bdi> بتوقيت القاهرة
                </span>
              )}
              <span className="ls-badge ls-rates-stale-badge" data-rates-stale-badge hidden={!stale}>
                {STALE_BADGE_TEXT} — محسوبة من النسخة القديمة نفسها
              </span>
            </p>
          )}
        </div>

        {/* لوح الملخص — روح .results-summary-container__options بعنوان Summary */}
        <div className="ls-rates-aside">
          <h4 className="ls-rates-aside-title">الملخص التحليلي للمسابقة</h4>
          <div className="ls-rates-kpis" data-rates-kpis role="list" aria-label="ملخص تحليلي للمسابقة">
            {kpis.map((kpi) => (
              <div key={kpi.id} className="ls-rates-kpi" role="listitem" data-rates-kpi={kpi.id}>
                <span className="ls-rates-kpi-icon" aria-hidden="true">{KPI_ICONS[kpi.id]}</span>
                <span className="ls-rates-kpi-label">{kpi.label}</span>
                <strong className="ls-rates-kpi-value">
                  <bdi dir="ltr">{kpi.value}</bdi>
                </strong>
                <span className="ls-rates-kpi-sub" data-rates-kpi-sub>{kpi.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ls-rates-grid" role="list" aria-label="تصنيفات الهجوم والدفاع">
        {cards.map((card) => {
          const teams = rates[card.teamsKey];
          const lead = teams[0];
          const rateValue = lead ? (card.domain === 'attack' ? numOrNull(lead.attack) : numOrNull(lead.defence)) : null;
          const delta = lead ? (card.domain === 'attack' ? numOrNull(lead.attackDelta) : numOrNull(lead.defenceDelta)) : null;
          const domainMax = card.domain === 'attack' ? leagueSummary.maxAttack : leagueSummary.maxDefence;
          const leagueAvg = leagueSummary.averagePerTeam;
          const deltaState = delta === null ? 'na' : delta === 0 ? 'neutral' : (card.domain === 'attack' ? delta > 0 : delta < 0) ? 'good' : 'bad';
          const leadGoals = lead ? (card.domain === 'attack' ? numOrNull(lead.goalsFor) : numOrNull(lead.goalsAgainst)) : null;
          const leadPlayed = lead ? numOrNull(lead.played) : null;
          return (
            <article
              key={card.key}
              role="listitem"
              className={`ls-rate-subcard ls-rate-subcard--${card.domain} ls-rate-subcard--${card.variant} ls-rate-subcard--${card.accent}`}
              data-rate-card={card.key}
              aria-labelledby={`${baseId}-${card.key}-title`}
            >
              {/* الرأس المتدرج — توهّج شعاعي من الزاوية بروح لوح التذكرة،
                  بألوان فئة البطاقة (هجوم/دفاع × أقوى/أضعف) */}
              <div className="ls-rate-card-head">
                {/* الدائرة اللونية خلف الزجاج — روح .cardContainer::before في
                    قالب grumpy-mule-23: ساكنة، ولا تتحرك إلا عند التفاعل */}
                <span className="ls-rate-blob" aria-hidden="true"></span>
                <div className="ls-rate-card-top">
                  <span className={`ls-rate-kind ls-rate-kind--${card.domain}`}>
                    {card.domain === 'attack' ? <AttackIcon variant={card.variant} /> : <DefenceIcon variant={card.variant} />}
                    <span>{card.badge}</span>
                  </span>
                  {teams.length > 1 && (
                    <span className="ls-rate-tie-count" data-rate-tie-count>
                      تعادل <bdi dir="ltr">{teams.length}</bdi> فرق
                    </span>
                  )}
                </div>

                <h4 id={`${baseId}-${card.key}-title`} className="ls-rate-card-title">
                  {card.title}
                </h4>

                {/* لوح الأرقام الزجاجي — بهوية قالب Uiverse
                    uiverse.io/vinodjangid07/grumpy-mule-23 (MIT): زجاج معتم
                    backdrop-filter بحدود شفافة، الرقم الرئيسي الكبير (.temp)،
                    وصف مقسوم بخط أبيض عمودي (.minmaxContainer): الفارق عن
                    متوسط الدوري / حجم العيّنة — وشريط المعيار داخل الزجاج */}
                <div className="ls-rate-metric" data-rate-metric>
                  {rateValue !== null ? (
                    <strong className="ls-rate-value" data-rate-value>
                      <bdi dir="ltr">{rateValue.toFixed(2)}</bdi>
                    </strong>
                  ) : (
                    <strong className="ls-rate-value ls-rate-value--na" data-rate-value>
                      غير متاح
                    </strong>
                  )}
                  <span className="ls-rate-unit" data-rate-unit>
                    {card.unit}
                  </span>

                  <div className="ls-rate-minmax">
                    <div className="ls-rate-mm">
                      <span className="ls-rate-mm-heading">عن متوسط الدوري</span>
                      <span className={`ls-rate-delta ls-rate-delta--${deltaState}`} data-rate-delta>
                        {delta !== null ? (
                          <>
                            <span className="ls-rate-delta-glyph" aria-hidden="true">{delta > 0 ? '▲' : delta < 0 ? '▼' : '◆'}</span>
                            <bdi dir="ltr">{fmtSigned2(delta)}</bdi>
                          </>
                        ) : (
                          <>غير متاح</>
                        )}
                      </span>
                    </div>
                    <div className="ls-rate-mm">
                      <span className="ls-rate-mm-heading">حجم العيّنة</span>
                      <span className="ls-rate-sample" data-rate-sample>
                        {lead && leadGoals !== null && leadPlayed !== null ? (
                          <>
                            <bdi dir="ltr">{leadGoals}</bdi> {card.domain === 'attack' ? 'هدفاً' : 'هدفاً مستقبلاً'} في{' '}
                            <bdi dir="ltr">{leadPlayed}</bdi> {matchWord(leadPlayed)}
                          </>
                        ) : (
                          <>غير متاح</>
                        )}
                      </span>
                    </div>
                  </div>

                  {rateValue !== null && domainMax !== null && domainMax > 0 && (
                    <div className="ls-rate-bench" data-rate-bench>
                      <div className="ls-rate-bench-track">
                        <span className="ls-rate-bench-fill" style={{ width: `${benchPct(rateValue, domainMax)}%` }} data-rate-bench-fill />
                        {leagueAvg !== null && leagueAvg <= domainMax && (
                          <span className="ls-rate-bench-avg" style={{ insetInlineStart: `${benchPct(leagueAvg, domainMax)}%` }} data-rate-bench-avg aria-hidden="true" />
                        )}
                      </div>
                      <div className="ls-rate-bench-legend">
                        <span><bdi dir="ltr">0</bdi></span>
                        {leagueAvg !== null && (
                          <span data-rate-bench-avg-label>المتوسط <bdi dir="ltr">{leagueAvg.toFixed(2)}</bdi></span>
                        )}
                        <span>أعلى المسابقة <bdi dir="ltr">{domainMax.toFixed(2)}</bdi></span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* المتن السفلي الأبيض — صفوف .result-option بورق التذكرة وأقراص مراكز حبرية */}
              <div className="ls-rate-card-body">
              {teams.length > 0 ? (
                <ul className="ls-rate-teams" data-rate-teams aria-label={`الفرق في تصنيف ${card.title}`}>
                  {teams.map((team, idx) => {
                    const displayName = cleanTeamName(team.name);
                    const teamRank = numOrNull(team.rank);
                    const teamGoals = card.domain === 'attack' ? numOrNull(team.goalsFor) : numOrNull(team.goalsAgainst);
                    const teamPlayed = numOrNull(team.played);
                    return (
                      <li
                        key={team.teamId ?? `${displayName}-${idx}`}
                        className="ls-rate-team"
                        data-rate-team={team.teamId ?? displayName}
                      >
                        <TeamCrest team={team} provider={provider} accent={card.accent} />
                        <span className="ls-rate-team-body">
                          <span className="ls-rate-team-name" data-rate-team-name>
                            <bdi dir="auto">{displayName}</bdi>
                          </span>
                          <span className="ls-rate-team-meta" data-rate-team-meta>
                            {teamRank !== null && (
                              <span className="ls-rate-team-rank" data-rate-team-rank>
                                <bdi dir="ltr">#{teamRank}</bdi>
                              </span>
                            )}
                            {teamGoals !== null && (
                              <span data-rate-team-goals>
                                <bdi dir="ltr">{teamGoals}</bdi> {card.domain === 'attack' ? 'هدفاً' : 'استقبالًا'}
                              </span>
                            )}
                            {teamPlayed !== null && (
                              <span data-rate-team-mp>
                                <bdi dir="ltr">{teamPlayed}</bdi> {matchWord(teamPlayed)}
                              </span>
                            )}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="ls-rate-empty" data-rate-teams data-rate-unavailable>
                  غير متاح
                </p>
              )}
              </div>
            </article>
          );
        })}
      </div>

      <p className="ls-rates-note" data-rates-note>
        يشمل التصنيف جميع الفرق المتعادلة (المركز أولاً ثم الاسم). الصافي/م = (له − عليه) ÷ لعب،
        نقاط/م = النقاط ÷ لعب، ونسبة الفوز = فوز ÷ لعب. لا يُحسم التصنيف إذا كانت بيانات أي فريق
        غير مكتملة، والقيمة الناقصة تُعرض «غير متاح» ولا تُعدّ صفراً.
      </p>

      <details className="ls-rates-details" data-rates-details>
        <summary className="ls-rates-summary">عرض معدلات جميع الفرق — جدول تحليلي قابل للفرز</summary>
        {/* شريط «الأول في كل مقياس» — متصدّر كل عمود من أعمدة الجدول
            الأحد عشر بترتيبها نفسه (حساب standingsRates بقاعدة اكتمال
            التصنيفات: مقياس ناقص أي فريق فيه بلا متصدّر)، وكل شريحة زر
            يفرز الجدول بمقياسها «الأفضل أولاً» فيعلو صاحبها الجدول
            بمركز مقياسه #1 — المتعادلون يُذكر أولهم بمركز الجدول وعددهم */}
        {rates.rows.length > 0 && (
          <div className="ls-an-leaders" data-rates-leaders>
            <p className="ls-an-leaders-title">الأول في كل مقياس — اضغط أي مقياس لفرز الجدول به</p>
            <div className="ls-an-leaders-row" role="group" aria-label="متصدّرو مقاييس الجدول التحليلي">
              {SORT_COLUMNS.map((col) => {
                const leader = leagueSummary.leaders[col.key];
                const leadTeam = leader?.teams[0];
                const leaderLabel = leader && leadTeam
                  ? `الأول: ${leadTeam.name}${leader.teams.length > 1 ? ` و${leader.teams.length - 1} فرق أخرى متعادلة` : ''} (${leaderValueText(col.key, leader.value)})`
                  : 'الأول غير متاح — بيانات المقياس غير مكتملة';
                return (
                  <button
                    key={col.key}
                    type="button"
                    className={`ls-an-leader${sort?.key === col.key ? ' ls-an-leader--active' : ''}`}
                    data-rate-leader={col.key}
                    aria-pressed={sort?.key === col.key}
                    aria-label={`فرز الجدول حسب ${col.hint}. ${leaderLabel}`}
                    onClick={() => sortBestFirst(col.key)}
                  >
                    <span className="ls-an-leader-metric">
                      {col.label} <span className="ls-an-leader-gloss" dir="ltr">{col.gloss}</span>
                    </span>
                    {leader && leadTeam ? (
                      <>
                        <span className="ls-an-leader-team">
                          <TeamCrest team={leadTeam} provider={provider} accent="neutral" size="sm" />
                          <bdi dir="auto">{leadTeam.name}</bdi>
                        </span>
                        <span className="ls-an-leader-meta">
                          <strong className="ls-an-leader-value"><bdi dir="ltr">{leaderValueText(col.key, leader.value)}</bdi></strong>
                          {leader.teams.length > 1 && (
                            <span className="ls-an-leader-tie">تعادل <bdi dir="ltr">{leader.teams.length}</bdi> فرق</span>
                          )}
                        </span>
                      </>
                    ) : (
                      <span className="ls-an-leader-na">غير متاح</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="ls-scroll" role="region" aria-label="معدلات الهجوم والدفاع لكل الفرق" tabIndex={0}>
          <table className="ls-table ls-rates-analyst-table" data-rates-table>
            <caption>الأهداف ÷ المباريات الملعوبة · اضغط رأس أي عمود للفرز · القيم الناقصة تبقى في الأسفل · صفوف التذييل: متوسط المسابقة ووسيطها وانحرافها المعياري</caption>
            <thead>
              <tr>
                <th scope="col" className="ls-an-team-col">
                  <span className="ls-an-head-text">
                    <span className="ls-an-head-gloss" dir="ltr">#</span> / الفريق
                  </span>
                </th>
                {/* عمود «مركز المقياس» — يظهر أثناء الفرز فقط: مركز كل فريق
                    في المقياس المفروز به (الأفضل #1 باتجاه العمود الافتراضي) */}
                {sort && activeSortColumn && (
                  <th scope="col" aria-label={`مركز كل فريق في ${activeSortColumn.hint}`}>
                    <span className="ls-an-head-text">
                      مركز <span className="ls-an-head-gloss" dir="ltr">{activeSortColumn.gloss}</span>
                    </span>
                  </th>
                )}
                {SORT_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={sort?.key === col.key ? (sort.dir === -1 ? 'descending' : 'ascending') : undefined}
                  >
                    <button
                      type="button"
                      className="ls-sort"
                      data-rate-sort={col.key}
                      onClick={() => toggleSort(col.key)}
                      aria-label={`فرز حسب ${col.hint}`}
                    >
                      <span>{col.label}</span>
                      <span className="ls-col-gloss" dir="ltr">{col.gloss}</span>
                      <span className="ls-sort-caret" aria-hidden="true">{sort?.key === col.key ? (sort.dir === -1 ? '↓' : '↑') : '↕'}</span>
                    </button>
                  </th>
                ))}
                <th scope="col">التصنيف التكتيكي</th>
                {hasArchive && <th scope="col">شباك نظيفة</th>}
                {hasArchive && <th scope="col">دون تسجيل</th>}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, index) => {
                const displayName = cleanTeamName(row.name);
                const arch = row.teamId ? archiveByTeam.get(row.teamId) : undefined;
                const teamRank = numOrNull(row.rank);
                /* فارقا المعدل عن متوسط المسابقة — نفس دلالة ألوان الكروت:
                   للهجوم الموجب أفضل، وللدفاع السالب أفضل (اللون يرافق الإشارة) */
                const attackDeltaVal = numOrNull(row.attackDelta);
                const defenceDeltaVal = numOrNull(row.defenceDelta);
                const attackDeltaState = attackDeltaVal === null ? 'na' : attackDeltaVal > 0 ? 'good' : attackDeltaVal < 0 ? 'bad' : 'neutral';
                const defenceDeltaState = defenceDeltaVal === null ? 'na' : defenceDeltaVal < 0 ? 'good' : defenceDeltaVal > 0 ? 'bad' : 'neutral';
                /* شذوذ إحصائي: معدل يبعد أكثر من انحرافين معياريين عن متوسط
                   معدلات الفرق (درجتا Z من حساب المكتبة) — علامة بصرية
                   ترافق الرقم ولا تغيّره */
                const attackZVal = numOrNull(row.attackZ);
                const defenceZVal = numOrNull(row.defenceZ);
                const attackOutlier = attackZVal !== null && Math.abs(attackZVal) >= 2;
                const defenceOutlier = defenceZVal !== null && Math.abs(defenceZVal) >= 2;
                return (
                  <tr key={row.teamId ?? `${displayName}-${index}`} data-rate-row={row.teamId ?? displayName}>
                    <th scope="row" className="ls-an-team">
                      <span className="ls-an-cell">
                        <span className="ls-an-rank" data-rate-row-rank>
                          <bdi dir="ltr">{teamRank === null ? '—' : `#${teamRank}`}</bdi>
                        </span>
                        <TeamCrest team={row} provider={provider} accent="neutral" size="sm" />
                        <span className="ls-an-name">
                          <bdi dir="auto">{displayName}</bdi>
                        </span>
                      </span>
                    </th>
                    {sort && (
                      <td data-rate-metric-rank>
                        {metricRanks.has(row) ? (
                          <span className="ls-an-metric-rank"><bdi dir="ltr">#{metricRanks.get(row)}</bdi></span>
                        ) : (
                          <bdi dir="ltr">—</bdi>
                        )}
                      </td>
                    )}
                    <td><bdi dir="ltr">{fmtInt(numOrNull(row.played))}</bdi></td>
                    <td><bdi dir="ltr">{fmtInt(numOrNull(row.goalsFor))}</bdi></td>
                    <td><bdi dir="ltr">{fmtInt(numOrNull(row.goalsAgainst))}</bdi></td>
                    <td>
                      <bdi dir="ltr">
                        {numOrNull(row.goalDifference) === null ? 'غير متاح' : `${numOrNull(row.goalDifference)! > 0 ? '+' : ''}${numOrNull(row.goalDifference)}`}
                      </bdi>
                    </td>
                    <td className="ls-an-rate">
                      <bdi dir="ltr">{fmt2(numOrNull(row.attack))}</bdi>
                      {attackOutlier && <span className="ls-an-outlier" data-rate-outlier="attack" aria-hidden="true" />}
                      {attackOutlier && <span className="visually-hidden"> (قيمة شاذة إحصائيًا)</span>}
                      {numOrNull(row.attack) !== null && leagueSummary.maxAttack !== null && leagueSummary.maxAttack > 0 && (
                        <span className="ls-minibar" aria-hidden="true">
                          <span style={{ width: `${benchPct(numOrNull(row.attack)!, leagueSummary.maxAttack)}%` }} />
                        </span>
                      )}
                    </td>
                    <td className="ls-an-rate">
                      <span className={`ls-an-delta ls-an-delta--${attackDeltaState}`} data-rate-attack-delta>
                        <bdi dir="ltr">{fmtSigned2(attackDeltaVal)}</bdi>
                      </span>
                    </td>
                    <td className="ls-an-rate">
                      <bdi dir="ltr">{fmt2(numOrNull(row.defence))}</bdi>
                      {defenceOutlier && <span className="ls-an-outlier" data-rate-outlier="defence" aria-hidden="true" />}
                      {defenceOutlier && <span className="visually-hidden"> (قيمة شاذة إحصائيًا)</span>}
                      {numOrNull(row.defence) !== null && leagueSummary.maxDefence !== null && leagueSummary.maxDefence > 0 && (
                        <span className="ls-minibar" aria-hidden="true">
                          <span style={{ width: `${benchPct(numOrNull(row.defence)!, leagueSummary.maxDefence)}%` }} />
                        </span>
                      )}
                    </td>
                    <td className="ls-an-rate">
                      <span className={`ls-an-delta ls-an-delta--${defenceDeltaState}`} data-rate-defence-delta>
                        <bdi dir="ltr">{fmtSigned2(defenceDeltaVal)}</bdi>
                      </span>
                    </td>
                    <td><bdi dir="ltr">{fmtSigned2(numOrNull(row.gdPerMatch))}</bdi></td>
                    <td className="ls-an-rate">
                      <span className="ls-an-power" data-rate-power>
                        <bdi dir="ltr">{fmtSigned2(numOrNull(row.power))}</bdi>
                      </span>
                    </td>
                    <td><bdi dir="ltr">{fmt2(numOrNull(row.ppm))}</bdi></td>
                    <td><bdi dir="ltr">{fmtPct(numOrNull(row.winPct))}</bdi></td>
                    <td>
                      {/* شارة الفئة الهولوغرامية: data-holo يحمل نص الفئة للطبقة
                          الخلفية الشفافة (زخرفية)، والنص الفعلي داخل الغلاف —
                          المحتوى نفسه دون أي تغيير */}
                      <span
                        className={`ls-tactic${row.tactic ? ` ls-tactic--${row.tactic}` : ' ls-tactic--na'}`}
                        data-rate-tactic={row.tactic ?? 'na'}
                        data-holo={row.tactic ? TACTIC_LABELS[row.tactic] : 'غير متاح'}
                      >
                        <i className="ls-tactic-label">{row.tactic ? TACTIC_LABELS[row.tactic] : 'غير متاح'}</i>
                      </span>
                    </td>
                    {hasArchive && (
                      <td data-rate-clean-sheets>
                        <bdi dir="ltr">{arch ? String(arch.cleanSheets) : 'غير متاح'}</bdi>
                      </td>
                    )}
                    {hasArchive && (
                      <td data-rate-scoreless>
                        <bdi dir="ltr">{arch ? String(arch.scoreless) : 'غير متاح'}</bdi>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            {/* صف «متوسط المسابقة» — من إجماليات كل عمود على فرقه ذات القيم
                فقط (حساب standingsRates في fixtures-archive.mjs): الأعداد
                بمتوسطها على الفرق والمعدلات من المجموع ÷ المجموع، ومتوسطا
                الأرشيف من فرق الأرشيف وحدها. غياب أي مساهم يبقى «غير متاح» */}
            <tfoot>
              <tr data-rates-averages>
                <th scope="row" className="ls-an-team ls-an-avg-label">متوسط المسابقة</th>
                {sort && <td>—</td>}
                <td data-rates-avg="played"><bdi dir="ltr">{fmt2(leagueAverages.played)}</bdi></td>
                <td data-rates-avg="goalsFor"><bdi dir="ltr">{fmt2(leagueAverages.goalsFor)}</bdi></td>
                <td data-rates-avg="goalsAgainst"><bdi dir="ltr">{fmt2(leagueAverages.goalsAgainst)}</bdi></td>
                <td data-rates-avg="goalDifference"><bdi dir="ltr">{fmtSigned2(leagueAverages.goalDifference)}</bdi></td>
                <td data-rates-avg="attack"><bdi dir="ltr">{fmt2(leagueAverages.attack)}</bdi></td>
                <td data-rates-avg="attackDelta"><bdi dir="ltr">{fmtSigned2(leagueAverages.attackDelta)}</bdi></td>
                <td data-rates-avg="defence"><bdi dir="ltr">{fmt2(leagueAverages.defence)}</bdi></td>
                <td data-rates-avg="defenceDelta"><bdi dir="ltr">{fmtSigned2(leagueAverages.defenceDelta)}</bdi></td>
                <td data-rates-avg="gdPerMatch"><bdi dir="ltr">{fmtSigned2(leagueAverages.gdPerMatch)}</bdi></td>
                <td data-rates-avg="power"><bdi dir="ltr">{fmtSigned2(leagueAverages.power)}</bdi></td>
                <td data-rates-avg="ppm"><bdi dir="ltr">{fmt2(leagueAverages.ppm)}</bdi></td>
                <td data-rates-avg="winPct"><bdi dir="ltr">{fmtPct(leagueAverages.winPct)}</bdi></td>
                <td>—</td>
                {hasArchive && (
                  <td data-rates-avg="cleanSheets"><bdi dir="ltr">{fmt2(archiveFooterStats.cleanSheets.mean)}</bdi></td>
                )}
                {hasArchive && (
                  <td data-rates-avg="scoreless"><bdi dir="ltr">{fmt2(archiveFooterStats.scoreless.mean)}</bdi></td>
                )}
              </tr>
              {/* صفّا التوزيع: وسيط كل عمود وانحرافه المعياري عبر الفرق
                  (حساب المكتبة — مرجع درجات Z ومؤشر القوة)، وعمودا
                  الأرشيف من فرقه وحدها كبقية صفوف التذييل */}
              <tr data-rates-medians>
                <th scope="row" className="ls-an-team ls-an-avg-label">وسيط المسابقة</th>
                {sort && <td>—</td>}
                {SORT_COLUMNS.map((col) => (
                  <td key={col.key} data-rates-median={col.key}>
                    <bdi dir="ltr">{distributionValueText(col.key, leagueDistributions[col.key]?.median ?? null, true)}</bdi>
                  </td>
                ))}
                <td>—</td>
                {hasArchive && (
                  <td data-rates-median="cleanSheets"><bdi dir="ltr">{fmt2(archiveFooterStats.cleanSheets.median)}</bdi></td>
                )}
                {hasArchive && (
                  <td data-rates-median="scoreless"><bdi dir="ltr">{fmt2(archiveFooterStats.scoreless.median)}</bdi></td>
                )}
              </tr>
              <tr data-rates-deviations>
                <th scope="row" className="ls-an-team ls-an-avg-label">الانحراف المعياري</th>
                {sort && <td>—</td>}
                {SORT_COLUMNS.map((col) => (
                  <td key={col.key} data-rates-sd={col.key}>
                    <bdi dir="ltr">{distributionValueText(col.key, leagueDistributions[col.key]?.sd ?? null, false)}</bdi>
                  </td>
                ))}
                <td>—</td>
                {hasArchive && (
                  <td data-rates-sd="cleanSheets"><bdi dir="ltr">{fmt2(archiveFooterStats.cleanSheets.sd)}</bdi></td>
                )}
                {hasArchive && (
                  <td data-rates-sd="scoreless"><bdi dir="ltr">{fmt2(archiveFooterStats.scoreless.sd)}</bdi></td>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="ls-hint">
          التصنيف التكتيكي: أعلى معدل هجوم من المتوسط = اندفاع، وأدنى معدل دفاع من المتوسط = صلابة؛
          الجمع بينهما «متوازن النخبة»، وزوالهما «يعاني هجومياً ودفاعياً».
          {' '}عمودا «هجوم ± / دفاع ±» فارق معدل الفريق عن متوسط المسابقة نفسه (مرجع التصنيف التكتيكي)،
          وعند الفرز بأي عمود يظهر مركز كل فريق في ذلك المقياس (الأفضل #1، والمتعادلون بالقيمة نفسها
          يتقاسمون المركز)، وشريط «الأول في كل مقياس» أعلى الجدول يلخّص متصدّر كل عمود باتجاهه
          «الأفضل أولاً» (ويفرز الجدول به عند الضغط، ولا يُحسم متصدّر مقياسٍ تنقص قيمة أي فريق فيه)،
          ومؤشر «القوة» مركّب حسابي مُعلن الصيغة: قوة الهجوم ناقص قوة الدفاع، كلٌّ بدرجات الانحراف
          المعياري عن متوسط معدلات الفرق — وتوزيع الفرق هذا (لا متوسط المسابقة الموزون بالمباريات)
          هو مرجع صفَّي الوسيط والانحراف المعياري في التذييل، والنقطة الذهبية بجانب أي معدل تعني
          قيمة شاذة إحصائيًا تبعد أكثر من انحرافين معياريين عن متوسط الفرق،
          وصف «متوسط المسابقة» أسفل الجدول من إجماليات كل عمود على فرقه ذات القيم
          فقط — المعدلات فيه من المجموع ÷ المجموع لا من متوسط المعدلات.
          {archiveSeason && hasArchive && (
            <>
              {' '}عمودا الشباك النظيفة ودون تسجيل من الأرشيف المحلي لموسم <bdi dir="ltr">{archiveSeason.season}</bdi> (مبارياته المنتهية ذات النتيجة المخزنة فقط، وليستا بإجمالي الموسم)، ومتوسطاهما في صف المتوسط من فرق الأرشيف وحدها.
            </>
          )}
        </p>
      </details>
    </section>
  );
}

