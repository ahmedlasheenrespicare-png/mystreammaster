import {
  MAX_AXES,
  radarAxisLabels,
  radarPoints,
  type Comparison,
} from '../lib/match-center.mjs';

const CX = 100;
const CY = 100;
const R = 74;
const LABEL_R = 95;
const RINGS = [0.25, 0.5, 0.75, 1];

function ringPoints(count: number, fraction: number): string {
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const radius = R * fraction;
    return `${(CX + radius * Math.cos(angle)).toFixed(2)},${(CY + radius * Math.sin(angle)).toFixed(2)}`;
  }).join(' ');
}

function axisLines(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    return { x2: CX + R * Math.cos(angle), y2: CY + R * Math.sin(angle), key: index };
  });
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function rawValue(value: number, unit: string): string {
  const formatted = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

export interface MatchCenterRadarProps {
  comparison: Comparison;
  homeName: string;
  awayName: string;
}

export default function MatchCenterRadar({ comparison, homeName, awayName }: MatchCenterRadarProps) {
  const rows = comparison.axes.filter(axis => hasText(axis.label) && (axis.home !== null || axis.away !== null));
  if (rows.length === 0) return null;

  const usable = rows.filter(axis => axis.comparable && axis.home !== null && axis.away !== null);
  const showPolygon = comparison.polygon && usable.length >= 3;
  const labels = showPolygon ? radarAxisLabels(usable, { cx: CX, cy: CY, r: LABEL_R }) : [];
  const sample = comparison.sample;
  const sampleDescription = sample
    && hasText(sample.competition)
    && hasText(sample.period)
    && Number.isFinite(sample.matches)
    && sample.matches > 0
    ? `${sample.competition} — ${sample.period}، ${new Intl.NumberFormat('ar-EG').format(sample.matches)} مباراة`
    : null;

  return (
    <section aria-labelledby="mc-compare-title">
      <h3 id="mc-compare-title">مقارنة الفريقين</h3>
      {showPolygon && (
        <div className="mc-radar">
          <figure className="mc-radar-figure">
            <svg
              viewBox="0 0 200 200"
              role="img"
              aria-label={`مخطط مقارنة بين ${homeName} و${awayName} على ${usable.length} محاور: ${usable.map(axis => axis.label).join('، ')}`}
            >
              {RINGS.map(fraction => <polygon key={fraction} className="mc-radar-grid" points={ringPoints(usable.length, fraction)} />)}
              {axisLines(usable.length).map(line => <line key={line.key} className="mc-radar-axis" x1={CX} y1={CY} x2={line.x2} y2={line.y2} />)}
              <polygon className="mc-radar-away" points={radarPoints(usable, { cx: CX, cy: CY, r: R, side: 'away' })} />
              <polygon className="mc-radar-home" points={radarPoints(usable, { cx: CX, cy: CY, r: R, side: 'home' })} />
              {labels.map(label => (
                <text
                  key={label.key}
                  className="mc-radar-label"
                  x={label.x}
                  y={label.y}
                  textAnchor={Math.abs(label.x - CX) < 6 ? 'middle' : label.x > CX ? 'start' : 'end'}
                  dominantBaseline="middle"
                >
                  {label.label}
                </text>
              ))}
            </svg>
            <figcaption className="mc-radar-legend">
              <span><i className="mc-radar-key mc-radar-key--home" />{homeName}</span>
              <span><i className="mc-radar-key mc-radar-key--away" />{awayName}</span>
            </figcaption>
          </figure>
        </div>
      )}

      {!showPolygon && usable.length < 3 && (
        <p className="mc-note">لا تكفي القيم الواردة من المصدر لمضلع مقارنة؛ تُعرض القيم الموجودة فقط.</p>
      )}

      <dl className="mc-comparison-values">
        {rows.map(axis => (
          <div className="mc-comparison-row" key={axis.key}>
            <dt>{axis.label}{axis.unit ? ` (${axis.unit})` : ''}</dt>
            <dd>
              {axis.home !== null && <span data-side="home"><b>{homeName}</b><span className="mc-num">{rawValue(axis.home, axis.unit)}</span></span>}
              {axis.away !== null && <span data-side="away"><b>{awayName}</b><span className="mc-num">{rawValue(axis.away, axis.unit)}</span></span>}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mc-note">
        عند رسم المضلع، كل محور نسبة إلى القيمة الأعلى بين الفريقين في المحور نفسه؛ ليست درجة من 100 ولا مقياس قوة، ولا تُجمع المحاور في رقم واحد.
        {sampleDescription && <> العينة: {sampleDescription}.</>}
        {' '}حدّ المحاور: <span className="mc-num">{MAX_AXES}</span>.
      </p>
    </section>
  );
}
