import { groupStatistics, type StatComparisonRow } from '../lib/match-center.mjs';

/* مجموعات الأرقام «السهلة المسح»: الاستحواذ والتمرير، التسديد، الدفاع
   والانضباط. التجميع في طبقة العقد (`groupStatistics`) لا هنا، حتى يبقى
   «أي رقم ينتمي إلى أي مجموعة» قراراً واحداً تُختبر في Node. */

function numberLabel(value: number): string {
  return new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(value);
}

/** الرقم بوحدة المصدر: النسبة تُلحق بالرقم، وغيرها يُذكر بعدها كما ورد. */
function valueText(row: StatComparisonRow, value: number): string {
  const digits = numberLabel(value);
  if (row.unitIsPercent) return `${digits}%`;
  return row.unit ? `${digits} ${row.unit}` : digits;
}

function barWidth(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '0%';
  /* لا شريط أطول من الصف: النسبة محسوبة إلى الأعلى بين الطرفين، والتقييد
     حرس حسابي لا تعديل على الرقم المعروض. */
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function SideValue({ row, value, name, side }: { row: StatComparisonRow; value: number | null; name: string; side: 'home' | 'away' }) {
  return (
    <span className="mc-stat-side" data-side={side}>
      <bdi className="mc-stat-side-name">{name}</bdi>
      {value === null
        /* الغياب كلمة، لا صفر ولا شرطة تُقرأ رقمًا في نص مختصر. */
        ? <span className="mc-stat-side-none">لا رقم من المصدر</span>
        : <span className="mc-num mc-stat-side-value">{valueText(row, value)}</span>}
    </span>
  );
}

export interface MatchCenterStatGroupsProps {
  statistics: unknown;
  homeName: string;
  awayName: string;
  /** بادئة معرفات العناوين: اللوحة قد تُرسم في تبويبين في الصفحة نفسها. */
  idPrefix: string;
  headingLevel?: 'h3' | 'h4';
}

export default function MatchCenterStatGroups({
  statistics,
  homeName,
  awayName,
  idPrefix,
  headingLevel = 'h3',
}: MatchCenterStatGroupsProps) {
  const groups = groupStatistics(statistics as never);
  if (groups.length === 0) return null;
  const Heading = headingLevel;

  return (
    <div className="mc-stat-groups">
      {groups.map(group => {
        const headingId = `${idPrefix}-statgroup-${group.id}`;
        return (
          <section className="mc-stat-group" key={group.id} aria-labelledby={headingId}>
            <Heading id={headingId} className="mc-stat-group-title">{group.label}</Heading>
            <ul className="mc-stat-compares">
              {group.rows.map(row => (
                <li className="mc-stat-compare" key={`${group.id}-${row.key}`} data-difference={row.leadingSide ?? 'equal'}>
                  <p className="mc-stat-compare-label">{row.label}</p>
                  <p className="mc-stat-compare-values">
                    <SideValue row={row} value={row.home} name={homeName} side="home" />
                    <span className="mc-stat-compare-vs">مقابل</span>
                    <SideValue row={row} value={row.away} name={awayName} side="away" />
                  </p>
                  <div className="mc-stat-compare-bars" aria-hidden="true">
                    <span className="mc-stat-bar mc-stat-bar--home" style={{ inlineSize: barWidth(row.bar.home) }} />
                    <span className="mc-stat-bar mc-stat-bar--away" style={{ inlineSize: barWidth(row.bar.away) }} />
                  </div>
                  {/* الفارق كمية لا حكم: لا «أفضل»، ولا «يتفوق»، ولا «يفرض». */}
                  {row.difference !== null && (
                    <p className="mc-stat-compare-difference">
                      الفارق <span className="mc-num">{numberLabel(row.difference)}</span>
                      {row.unit && !row.unitIsPercent ? ` ${row.unit}` : row.unitIsPercent ? ' نقطة مئوية' : ''}
                      {/* «الأعلى رقميًا» وصفٌ للكمية لا حكم: الأخطاء والبطاقات ليست ميزة. */}
                      {row.leadingSide === 'home' ? ` — الأعلى رقمياً: ${homeName}` : row.leadingSide === 'away' ? ` — الأعلى رقمياً: ${awayName}` : ' — متساويان'}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <p className="mc-note">
        كل صف يعرض قيمتي الفريقين كما أرسلهما المصدر. الشريط نسبة إلى الأعلى بين الرقمين في الصف نفسه فقط — لا درجة من 100 ولا حكم جودة:
        زيادة الأخطاء أو البطاقات أو التسلل أرقام، ليست أفضلية.
      </p>
    </div>
  );
}
