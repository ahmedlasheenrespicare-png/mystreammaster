/* The same possession-style card renders a source row AND a group index, on the
   pitch and in either phase tab. Numbers are the authority; the split is purely
   decorative and is never drawn when either side is missing. */

const numberFormatter = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 });

export function formatStatNumber(value: number): string {
  return numberFormatter.format(value);
}

function valueText(value: number, unit: string | null): string {
  const digits = formatStatNumber(value);
  return unit === '%' ? `${digits}%` : unit ? `${digits} ${unit}` : digits;
}

function partWidth(share: number): string {
  return `${Math.round(Math.max(0, Math.min(1, share)) * 1000) / 10}%`;
}

export interface MatchCenterStatCardProps {
  label: string;
  homeName: string;
  awayName: string;
  home: number | null;
  away: number | null;
  unit: string | null;
  /** Source-row shares, or the existing mean shares of a group index. */
  bar: { home: number | null; away: number | null };
  /** Only group names on the index board are links. */
  href?: string;
  /** List rows are `li`; the featured possession card stands on its own. */
  as?: 'li' | 'div';
  className?: string;
  statKey?: string;
}

export default function MatchCenterStatCard({
  label, homeName, awayName, home, away, unit, bar,
  href, as: Element = 'li', className, statKey,
}: MatchCenterStatCardProps) {
  if (home === null && away === null) return null;
  const split = home !== null && away !== null && bar.home !== null && bar.away !== null;
  const difference = home !== null && away !== null ? Math.abs(home - away) : null;
  const higher = home !== null && away !== null
    ? home > away ? homeName : away > home ? awayName : null
    : null;

  return (
    <Element className={`mc-stat-card${className ? ` ${className}` : ''}`}
      data-stat-key={statKey} data-difference={difference === null ? 'unavailable' : higher ? 'higher' : 'equal'}>
      <div className="mc-stat-card-head">
        <span className="mc-stat-card-side" data-side="home">
          <bdi className="mc-stat-card-name" dir="auto">{homeName}</bdi>
          {home === null
            ? <span className="mc-stat-card-none">غير متاح</span>
            : <bdi className="mc-num mc-stat-card-number" dir="auto">{valueText(home, unit)}</bdi>}
        </span>
        <span className="mc-stat-card-title">
          {href ? <a href={href}>{label}</a> : label}
        </span>
        <span className="mc-stat-card-side" data-side="away">
          {away === null
            ? <span className="mc-stat-card-none">غير متاح</span>
            : <bdi className="mc-num mc-stat-card-number" dir="auto">{valueText(away, unit)}</bdi>}
          <bdi className="mc-stat-card-name" dir="auto">{awayName}</bdi>
        </span>
      </div>
      {split && (
        <div className="mc-stat-card-bar" aria-hidden="true">
          <span className="mc-stat-card-fill" data-side="home" style={{ inlineSize: partWidth(bar.home as number) }} />
          <span className="mc-stat-card-fill" data-side="away" style={{ inlineSize: partWidth(bar.away as number) }} />
        </div>
      )}
      {difference !== null && (
        <p className="mc-stat-card-difference">
          {higher
            ? <>الفارق <span className="mc-num">{formatStatNumber(difference)}</span>
                {unit === '%' ? ' نقطة مئوية' : unit ? ` ${unit}` : ''} — الأعلى رقمياً: {higher}</>
            : 'متساويان'}
        </p>
      )}
    </Element>
  );
}
