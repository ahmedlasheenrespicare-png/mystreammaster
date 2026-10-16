import {
  MAX_AXES,
  radarAxisLabels,
  radarPoints,
  type Comparison,
} from '../lib/match-center.mjs';

/* ==========================================================================
   الرادار وجدول الأرقام الخام — البند 9
   --------------------------------------------------------------------------
   SVG أصلي بلا مكتبة جديدة (القرار: «لا مكتبة جديدة قبل الموافقة»)، على نفس
   عرف `public/_assets/fixture-charts.js` القائم في المشروع.

   أربع قواعد لا تُكسر:
   1) **طريقة التسوية معلنة**: نسبة كل قيمة إلى الأعلى بين الفريقين في المحور
      نفسه. ليست درجة من 100 ولا مقياس قوة، ويُقال ذلك نصاً بجانب الرسم.
   2) **الأرقام الخام بوحداتها معروضة دائماً** في جدول بجانب الرسم، فلا يبقى
      المضلع هو المعلومة الوحيدة.
   3) **لا تصفير للمحاور الناقصة**: `buildComparison` تحذف غير القابل
      للمقارنة، والرسم هنا يرسم ما وصله فقط.
   4) **بيانات غير كافية ⇒ جدول ورسالة واضحة بدل مضلع مضلِّل**: `polygon`
      تصل `false` من طبقة العقد، وهنا لا يُرسم مضلع إطلاقاً.

   العينة معلنة في وضع `season` (البند 9: «مع ذكر حجم العينة»).
========================================================================== */

const CX = 100;
const CY = 100;
const R = 74;
const LABEL_R = 95;
const RINGS = [0.25, 0.5, 0.75, 1];

/** حلقة شبكية بنفس هندسة `radarPoints` تماماً، فلا ينزلق المضلع عن الشبكة. */
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

/** قيمة خام للعرض: `null` يبقى «غير متاح» ولا يصير صفراً. */
function rawValue(value: number | null, unit: string): string {
  if (value === null) return 'غير متاح';
  const formatted = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

export interface MatchCenterRadarProps {
  comparison: Comparison;
  homeName: string;
  awayName: string;
}

export default function MatchCenterRadar({ comparison, homeName, awayName }: MatchCenterRadarProps) {
  const usable = comparison.axes.filter(axis => axis.comparable);
  const labels = usable.length >= 3 ? radarAxisLabels(comparison.axes, { cx: CX, cy: CY, r: LABEL_R }) : [];

  return (
    <section aria-labelledby="mc-compare-title">
      <h3 id="mc-compare-title">مقارنة الفريقين</h3>

      {/* رسالة الرفض تُعرض قبل أي رسم: لا مضلع بلا بيانات كافية. */}
      {!comparison.polygon && (
        <p className="mc-unavailable" role="note">
          <strong>{comparison.message || 'لا توجد أرقام كافية لرسم مقارنة'}</strong>
          {comparison.tableOk
            ? 'الأرقام المتوفرة معروضة في الجدول أدناه كما هي، ولا يُرسم مضلع ناقص يوحي باكتمال لا وجود له.'
            : 'لا يُعرض مضلع ولا تُختلق أرقام؛ تُترك الخانة «غير متاح» حتى يرسل المصدر ما يكفي.'}
        </p>
      )}

      {comparison.polygon && usable.length >= 3 && (
        <div className="mc-radar">
          <figure style={{ margin: 0 }}>
            <svg
              viewBox="0 0 200 200"
              role="img"
              aria-label={`مخطط مقارنة بين ${homeName} و${awayName} على ${usable.length} محاور: ${usable.map(axis => axis.label).join('، ')}`}
            >
              {RINGS.map(fraction => (
                <polygon key={fraction} className="mc-radar-grid" points={ringPoints(usable.length, fraction)} />
              ))}
              {axisLines(usable.length).map(line => (
                <line key={line.key} className="mc-radar-axis" x1={CX} y1={CY} x2={line.x2} y2={line.y2} />
              ))}
              <polygon className="mc-radar-away" points={radarPoints(comparison.axes, { cx: CX, cy: CY, r: R, side: 'away' })} />
              <polygon className="mc-radar-home" points={radarPoints(comparison.axes, { cx: CX, cy: CY, r: R, side: 'home' })} />
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
              <span><i style={{ background: 'rgba(124,92,255,.55)', border: '1px solid #7c5cff' }} />{homeName}</span>
              <span><i style={{ background: 'rgba(216,255,62,.4)', border: '1px solid #d8ff3e' }} />{awayName}</span>
            </figcaption>
          </figure>

          {/* البند 9: الجدول بالأرقام الخام ووحداتها بجانب الرسم، لا بدله. */}
          <div className="mc-table-wrap">
            <table className="mc-table">
              <caption>الأرقام الخام لكل محور — الشكل أعلاه نسبة بينها لا قيمة مطلقة</caption>
              <thead>
                <tr><th scope="col">المحور</th><th scope="col">{homeName}</th><th scope="col">{awayName}</th></tr>
              </thead>
              <tbody>
                {comparison.axes.map(axis => (
                  <tr key={axis.key}>
                    <th scope="row">{axis.label}</th>
                    <td data-side="home">{rawValue(axis.home, axis.unit)}</td>
                    <td data-side="away">{rawValue(axis.away, axis.unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* الجدول يُعرض حتى بلا مضلع، إن كانت هناك أرقام صالحة للعرض. */}
      {!comparison.polygon && comparison.tableOk && comparison.axes.length > 0 && (
        <div className="mc-table-wrap">
          <table className="mc-table">
            <caption>الأرقام المتوفرة كما وردت من المصدر</caption>
            <thead>
              <tr><th scope="col">المحور</th><th scope="col">{homeName}</th><th scope="col">{awayName}</th></tr>
            </thead>
            <tbody>
              {comparison.axes.map(axis => (
                <tr key={axis.key}>
                  <th scope="row">{axis.label}</th>
                  <td data-side="home">{axis.comparable ? rawValue(axis.home, axis.unit) : 'غير متاح'}</td>
                  <td data-side="away">{axis.comparable ? rawValue(axis.away, axis.unit) : 'غير متاح'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mc-note">
        <b>طريقة التسوية:</b> كل محور يُحسب نسبةً إلى الأعلى بين الفريقين في المحور نفسه
        (الأعلى = 1). <b>ليست درجة من 100 ولا مقياساً للقوة ولا تقييماً</b>، ولا تُجمع
        المحاور في رقم واحد.
        {comparison.mode === 'season' && comparison.sample && (
          <>
            {' '}<b>العينة:</b> {comparison.sample.competition} — {comparison.sample.period}،
            عدد المباريات <span className="mc-num">{new Intl.NumberFormat('ar-EG').format(comparison.sample.matches)}</span>.
          </>
        )}
        {comparison.mode === 'match' && <> <b>الوضع:</b> أرقام هذه المباراة نفسها.</>}
        {' '}<b>حدّ المحاور:</b> حتى <span className="mc-num">{MAX_AXES}</span> محاور، والرسم الحالي
        على <span className="mc-num">{usable.length}</span>.
        {comparison.provider && <> <b>المصدر:</b> {comparison.provider} — لا تُخلط أرقام مصدرين في مقارنة واحدة.</>}
      </p>
    </section>
  );
}
