import { cleanTeamName, standingsRates } from '../lib/fixtures-archive.mjs';
import { STALE_BADGE_TEXT, formatStandingsTime, seasonText, type StandingsEntry } from '../lib/standings.mjs';

/* الشعارات المحلية المعتمدة داخل المستودع فقط (src/assets/club-logos/manifest.json).
   لا يُطلب أي شعار من رابط خارجي؛ إن لم يتوفر شعار محلي معتمد يُكتفى بالاسم. */
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
  const baseId = idPrefix ?? `standings-${league.replace(/\./g, '-')}-rates`;
  const formattedSeason = typeof season === 'number' ? seasonText(season) : season;

  const cards = [
    {
      key: 'best-attack',
      domain: 'attack' as const,
      variant: 'best' as const,
      badge: 'هجوم · الأعلى تسجيلاً',
      title: 'أقوى هجوم',
      unit: 'هدف مسجل/مباراة',
      teams: rates.bestAttack,
      rate: rates.bestAttack.length && rates.bestAttack[0].attack !== null ? rates.bestAttack[0].attack.toFixed(2) : null,
    },
    {
      key: 'worst-attack',
      domain: 'attack' as const,
      variant: 'worst' as const,
      badge: 'هجوم · الأقل تسجيلاً',
      title: 'أضعف هجوم',
      unit: 'هدف مسجل/مباراة',
      teams: rates.worstAttack,
      rate: rates.worstAttack.length && rates.worstAttack[0].attack !== null ? rates.worstAttack[0].attack.toFixed(2) : null,
    },
    {
      key: 'best-defence',
      domain: 'defence' as const,
      variant: 'best' as const,
      badge: 'دفاع · الأقل استقبالاً',
      title: 'أقوى دفاع',
      unit: 'هدف مستقبَل/مباراة',
      teams: rates.bestDefence,
      rate: rates.bestDefence.length && rates.bestDefence[0].defence !== null ? rates.bestDefence[0].defence.toFixed(2) : null,
    },
    {
      key: 'worst-defence',
      domain: 'defence' as const,
      variant: 'worst' as const,
      badge: 'دفاع · الأعلى استقبالاً',
      title: 'أضعف دفاع',
      unit: 'هدف مستقبَل/مباراة',
      teams: rates.worstDefence,
      rate: rates.worstDefence.length && rates.worstDefence[0].defence !== null ? rates.worstDefence[0].defence.toFixed(2) : null,
    },
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
            محسوبة من جدول الترتيب الحالي: الأهداف المسجلة أو المستقبلة ÷ المباريات الملعوبة.
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

      <div className="ls-rates-grid" role="list" aria-label="تصنيفات الهجوم والدفاع">
        {cards.map((card) => (
          <article
            key={card.key}
            role="listitem"
            className={`ls-rate-subcard ls-rate-subcard--${card.domain} ls-rate-subcard--${card.variant}`}
            data-rate-card={card.key}
            aria-labelledby={`${baseId}-${card.key}-title`}
          >
            <div className="ls-rate-card-top">
              <span className={`ls-rate-kind ls-rate-kind--${card.domain}`}>
                {card.domain === 'attack' ? <AttackIcon variant={card.variant} /> : <DefenceIcon variant={card.variant} />}
                <span>{card.badge}</span>
              </span>
            </div>

            <div className="ls-rate-title-row">
              <h4 id={`${baseId}-${card.key}-title`} className="ls-rate-card-title">
                {card.title}
              </h4>
              {card.teams.length > 1 && (
                <span className="ls-rate-tie-count" data-rate-tie-count>
                  تعادل <bdi dir="ltr">{card.teams.length}</bdi> فرق
                </span>
              )}
            </div>

            <div className="ls-rate-metric">
              {card.rate !== null ? (
                <strong className="ls-rate-value" data-rate-value>
                  <bdi dir="ltr">{card.rate}</bdi>
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

            {card.teams.length > 0 ? (
              <ul className="ls-rate-teams" data-rate-teams aria-label={`الفرق في تصنيف ${card.title}`}>
                {card.teams.map((team, idx) => {
                  const logo = resolveApprovedTeamLogo(team);
                  const displayName = cleanTeamName(team.name);
                  return (
                    <li
                      key={team.teamId ?? `${displayName}-${idx}`}
                      className="ls-rate-team"
                      data-rate-team={team.teamId ?? displayName}
                    >
                      {logo && (
                        <img
                          src={logo}
                          alt=""
                          aria-hidden="true"
                          width="20"
                          height="20"
                          loading="lazy"
                          className="ls-rate-team-logo"
                        />
                      )}
                      <span className="ls-rate-team-name" data-rate-team-name>
                        <bdi dir="auto">{displayName}</bdi>
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
        ))}
      </div>

      <p className="ls-rates-note" data-rates-note>
        يشمل التصنيف جميع الفرق المتعادلة. لا يُحسم التصنيف إذا كانت البيانات اللازمة لأي فريق غير مكتملة.
      </p>

      <details className="ls-rates-details" data-rates-details>
        <summary className="ls-rates-summary">عرض معدلات جميع الفرق</summary>
        <div className="ls-scroll" role="region" aria-label="معدلات الهجوم والدفاع" tabIndex={0}>
          <table className="ls-table" data-rates-table>
            <caption>الأهداف المسجلة والمستقبلة ÷ المباريات الملعوبة</caption>
            <thead>
              <tr>
                <th scope="col" className="ls-team">الفريق</th>
                <th scope="col">أهداف مسجلة / مباراة</th>
                <th scope="col">أهداف مستقبلة / مباراة</th>
              </tr>
            </thead>
            <tbody>
              {rates.rows.map((row, index) => (
                <tr key={row.teamId ?? `${row.name}-${index}`}>
                  <th scope="row" className="ls-team">
                    <bdi dir="auto">{cleanTeamName(row.name)}</bdi>
                  </th>
                  <td>
                    <bdi dir="ltr">{row.attack === null ? 'غير متاح' : row.attack.toFixed(2)}</bdi>
                  </td>
                  <td>
                    <bdi dir="ltr">{row.defence === null ? 'غير متاح' : row.defence.toFixed(2)}</bdi>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
