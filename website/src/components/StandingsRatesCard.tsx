import {
  TACTIC_LABELS,
  archiveTeamStats,
  cleanTeamName,
  standingsRates,
  validateArchive,
} from '../lib/fixtures-archive.mjs';
import { STALE_BADGE_TEXT, formatStandingsTime, seasonText, type StandingsEntry } from '../lib/standings.mjs';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

/* الشعارات المحلية المعتمدة داخل المستودع فقط (src/assets/club-logos/manifest.json).
   لا يُطلب أي شعار من رابط خارجي؛ إن لم يتوفر شعار محلي معتمد يُعرض درع مونوغرام
   يحمل الأحرف الأولى للفريق مع مركزه في الجدول. */
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

/* عدد الكلمات العربية للمباريات: 1 مباراة، 2 مباراتين، 3–10 مباريات، 11+ مباراة */
function matchWord(n: number): string {
  if (n === 1) return 'مباراة';
  if (n === 2) return 'مباراتين';
  if (n >= 3 && n <= 10) return 'مباريات';
  return 'مباراة';
}

/* درع/مونوغرام أنيق: الأحرف الأولى لحدٍّ أقصى كلمتين + المركز في الجدول */
function teamInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const out = words.slice(0, 2).map((w) => (w[0] ?? '').toUpperCase()).join('');
  return out || '؟';
}

function TeamCrest({ team, accent, size = 'md' }: { team: { name?: string; logo?: string | null; rank?: number | null }; accent: string; size?: 'sm' | 'md' }) {
  const logo = resolveApprovedTeamLogo(team);
  if (logo) {
    return (
      <img
        src={logo}
        alt=""
        aria-hidden="true"
        width={size === 'sm' ? 18 : 22}
        height={size === 'sm' ? 18 : 22}
        loading="lazy"
        className={`ls-rate-team-logo${size === 'sm' ? ' ls-rate-team-logo--sm' : ''}`}
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

type SortKey = 'played' | 'goalsFor' | 'goalsAgainst' | 'goalDifference' | 'attack' | 'defence' | 'gdPerMatch' | 'ppm' | 'winPct';

const SORT_COLUMNS: { key: SortKey; label: string; gloss: string; defaultDir: 1 | -1; hint: string }[] = [
  { key: 'played', label: 'لعب', gloss: 'MP', defaultDir: -1, hint: 'المباريات الملعوبة' },
  { key: 'goalsFor', label: 'له', gloss: 'GF', defaultDir: -1, hint: 'الأهداف المسجلة' },
  { key: 'goalsAgainst', label: 'عليه', gloss: 'GA', defaultDir: -1, hint: 'الأهداف المستقبلة' },
  { key: 'goalDifference', label: 'الفارق', gloss: 'GD', defaultDir: -1, hint: 'فارق الأهداف كما ورد من المصدر' },
  { key: 'attack', label: 'هجوم/م', gloss: 'GF/M', defaultDir: -1, hint: 'أهداف مسجلة لكل مباراة' },
  { key: 'defence', label: 'دفاع/م', gloss: 'GA/M', defaultDir: 1, hint: 'أهداف مستقبلة لكل مباراة — الأدنى أقوى' },
  { key: 'gdPerMatch', label: 'صافي/م', gloss: 'GD/M', defaultDir: -1, hint: 'صافي الفارق لكل مباراة' },
  { key: 'ppm', label: 'نقاط/م', gloss: 'PPM', defaultDir: -1, hint: 'النقاط لكل مباراة' },
  { key: 'winPct', label: 'فوز', gloss: 'Win%', defaultDir: -1, hint: 'نسبة الفوز' },
];

export interface StandingsRatesCardProps {
  entries: Partial<StandingsEntry>[];
  league?: string;
  season?: number | string;
  provider?: string;
  fetchedAt?: string;
  stale?: boolean;
  idPrefix?: string;
}

export default function StandingsRatesCard({
  entries,
  league = 'league',
  season,
  provider,
  fetchedAt,
  stale = false,
  idPrefix,
}: StandingsRatesCardProps) {
  const rates = standingsRates(entries);
  const { league: leagueSummary } = rates;
  const baseId = idPrefix ?? `standings-${league.replace(/\./g, '-')}-rates`;
  const formattedSeason = typeof season === 'number' ? seasonText(season) : season;

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
      <div className="ls-rates-header">
        <div className="ls-rates-heading">
          <h3 id={`${baseId}-title`} className="ls-rates-title">الهجوم والدفاع — معدلات أهداف الموسم</h3>
          <p className="ls-rates-subtitle">
            محسوبة من جدول الترتيب الحالي فقط، بلا أي بيانات خارجية: المعدل = الأهداف ÷ المباريات الملعوبة،
            والتصنيف التكتيكي يقارن كل فريق بمتوسط المسابقة بالقيمة الدقيقة قبل التقريب.
          </p>
        </div>

        {(formattedSeason || provider || fetchedAt || stale) && (
          <p className="ls-rates-meta" data-rates-meta>
            {formattedSeason && (
              <span className="ls-rates-pill" data-rates-season>
                موسم <bdi dir="ltr">{formattedSeason}</bdi>
              </span>
            )}
            {provider && (
              <span className="ls-rates-pill" data-rates-provider>
                المصدر: <bdi dir="ltr">{provider}</bdi>
              </span>
            )}
            {fetchedAt && (
              <span className="ls-rates-pill" data-rates-fetched>
                آخر قراءة للترتيب: <bdi>{formatStandingsTime(fetchedAt)}</bdi> بتوقيت القاهرة
              </span>
            )}
            <span className="ls-badge ls-rates-stale-badge" data-rates-stale-badge hidden={!stale}>
              {STALE_BADGE_TEXT} — محسوبة من النسخة القديمة نفسها
            </span>
          </p>
        )}
      </div>

      <div className="ls-rates-kpis" data-rates-kpis role="list" aria-label="ملخص تحليلي للمسابقة">
        {kpis.map((kpi) => (
          <div key={kpi.id} className="ls-rates-kpi" role="listitem" data-rates-kpi={kpi.id}>
            <span className="ls-rates-kpi-label">{kpi.label}</span>
            <strong className="ls-rates-kpi-value">
              <bdi dir="ltr">{kpi.value}</bdi>
            </strong>
            <span className="ls-rates-kpi-sub" data-rates-kpi-sub>{kpi.sub}</span>
          </div>
        ))}
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
              <span className="ls-rate-accent" aria-hidden="true"></span>

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

              <div className="ls-rate-metric" data-rate-metric>
                <div className="ls-rate-hero">
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
                </div>

                <span className={`ls-rate-delta ls-rate-delta--${deltaState}`} data-rate-delta>
                  {delta !== null ? (
                    <>
                      <span className="ls-rate-delta-glyph" aria-hidden="true">{delta > 0 ? '▲' : delta < 0 ? '▼' : '◆'}</span>
                      <bdi dir="ltr">{fmtSigned2(delta)}</bdi> عن متوسط الدوري
                    </>
                  ) : (
                    <>متوسط الدوري: غير متاح</>
                  )}
                </span>

                {lead && leadGoals !== null && leadPlayed !== null && (
                  <span className="ls-rate-sample" data-rate-sample>
                    <bdi dir="ltr">{leadGoals}</bdi> {card.domain === 'attack' ? 'هدفاً' : 'هدفاً مستقبلاً'} في{' '}
                    <bdi dir="ltr">{leadPlayed}</bdi> {matchWord(leadPlayed)}
                  </span>
                )}
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
                        <TeamCrest team={team} accent={card.accent} />
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
        <div className="ls-scroll" role="region" aria-label="معدلات الهجوم والدفاع لكل الفرق" tabIndex={0}>
          <table className="ls-table ls-rates-analyst-table" data-rates-table>
            <caption>الأهداف ÷ المباريات الملعوبة · اضغط رأس أي عمود للفرز · القيم الناقصة تبقى في الأسفل</caption>
            <thead>
              <tr>
                <th scope="col" className="ls-an-team-col">
                  <span className="ls-an-head-text">
                    <span className="ls-an-head-gloss" dir="ltr">#</span> / الفريق
                  </span>
                </th>
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
                return (
                  <tr key={row.teamId ?? `${displayName}-${index}`} data-rate-row={row.teamId ?? displayName}>
                    <th scope="row" className="ls-an-team">
                      <span className="ls-an-cell">
                        <span className="ls-an-rank" data-rate-row-rank>
                          <bdi dir="ltr">{teamRank === null ? '—' : `#${teamRank}`}</bdi>
                        </span>
                        <TeamCrest team={row} accent="neutral" size="sm" />
                        <span className="ls-an-name">
                          <bdi dir="auto">{displayName}</bdi>
                        </span>
                      </span>
                    </th>
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
                      {numOrNull(row.attack) !== null && leagueSummary.maxAttack !== null && leagueSummary.maxAttack > 0 && (
                        <span className="ls-minibar" aria-hidden="true">
                          <span style={{ width: `${benchPct(numOrNull(row.attack)!, leagueSummary.maxAttack)}%` }} />
                        </span>
                      )}
                    </td>
                    <td className="ls-an-rate">
                      <bdi dir="ltr">{fmt2(numOrNull(row.defence))}</bdi>
                      {numOrNull(row.defence) !== null && leagueSummary.maxDefence !== null && leagueSummary.maxDefence > 0 && (
                        <span className="ls-minibar" aria-hidden="true">
                          <span style={{ width: `${benchPct(numOrNull(row.defence)!, leagueSummary.maxDefence)}%` }} />
                        </span>
                      )}
                    </td>
                    <td><bdi dir="ltr">{fmtSigned2(numOrNull(row.gdPerMatch))}</bdi></td>
                    <td><bdi dir="ltr">{fmt2(numOrNull(row.ppm))}</bdi></td>
                    <td><bdi dir="ltr">{fmtPct(numOrNull(row.winPct))}</bdi></td>
                    <td>
                      <span className={`ls-tactic${row.tactic ? ` ls-tactic--${row.tactic}` : ' ls-tactic--na'}`} data-rate-tactic={row.tactic ?? 'na'}>
                        {row.tactic ? TACTIC_LABELS[row.tactic] : 'غير متاح'}
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
          </table>
        </div>
        <p className="ls-hint">
          التصنيف التكتيكي: أعلى معدل هجوم من المتوسط = اندفاع، وأدنى معدل دفاع من المتوسط = صلابة؛
          الجمع بينهما «متوازن النخبة»، وزوالهما «يعاني هجومياً ودفاعياً».
          {archiveSeason && hasArchive && (
            <>
              {' '}عمودا الشباك النظيفة ودون تسجيل من الأرشيف المحلي لموسم <bdi dir="ltr">{archiveSeason.season}</bdi> (مباراتاه المنتهية ذات النتيجة المخزنة فقط، وليستا بإجمالي الموسم).
            </>
          )}
        </p>
      </details>
    </section>
  );
}
