import { groupStatistics, possessionSplit, type StatComparisonRow } from '../lib/match-center.mjs';
import TeamCrest from './MatchCenterCrest';

/* مجموعات الأرقام «السهلة المسح» الست: الاستحواذ والتمرير، التسديد، بناء
   الهجمة، الدفاع، حراسة المرمى، الانضباط. التجميع في طبقة العقد
   (`groupStatistics`) لا هنا، حتى يبقى «أي رقم ينتمي إلى أي مجموعة» قراراً
   واحداً تُختبر في Node. شرح الشريط ومعنى «غير متاح» في «توثيق ومراجعة» آخر
   الصفحة، لا بين الأرقام. */

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
        ? <span className="mc-stat-side-none">غير متاح</span>
        : <span className="mc-num mc-stat-side-value">{valueText(row, value)}</span>}
    </span>
  );
}

export interface MatchCenterStatGroupsProps {
  statistics: unknown;
  homeName: string;
  awayName: string;
  /** شعارا الفريقين من اللقطة (`https://` فقط)؛ غيابهما يعرض الحرفين الأولين. */
  logos?: { home: string | null; away: string | null } | null;
  /** بادئة معرفات العناوين: اللوحة قد تُرسم في تبويبين في الصفحة نفسها. */
  idPrefix: string;
  headingLevel?: 'h3' | 'h4';
}

/** شريط الاستحواذ البارز: يُرسم فقط إذا وصلت النسبتان رقميتين معاً. */
function PossessionBar({ statistics, homeName, awayName }: { statistics: unknown; homeName: string; awayName: string }) {
  const split = possessionSplit(statistics as never);
  if (!split) return null;
  return (
    <section className="mc-possession" aria-label="الاستحواذ">
      <div className="mc-possession-head">
        <span className="mc-possession-side" data-side="home">
          <bdi>{homeName}</bdi>
          <span className="mc-num mc-possession-pct">{numberLabel(split.home)}%</span>
        </span>
        <span className="mc-possession-title">الاستحواذ</span>
        <span className="mc-possession-side" data-side="away">
          <span className="mc-num mc-possession-pct">{numberLabel(split.away)}%</span>
          <bdi>{awayName}</bdi>
        </span>
      </div>
      <div className="mc-possession-bar" aria-hidden="true">
        <span className="mc-possession-fill" data-side="home" style={{ inlineSize: `${Math.round(split.homeShare * 1000) / 10}%` }} />
        <span className="mc-possession-fill" data-side="away" style={{ inlineSize: `${Math.round(split.awayShare * 1000) / 10}%` }} />
      </div>
    </section>
  );
}

export default function MatchCenterStatGroups({
  statistics,
  homeName,
  awayName,
  logos = null,
  idPrefix,
  headingLevel = 'h3',
}: MatchCenterStatGroupsProps) {
  const groups = groupStatistics(statistics as never);
  if (groups.length === 0) return null;
  const Heading = headingLevel;

  return (
    <div className="mc-stat-groups">
      <PossessionBar statistics={statistics} homeName={homeName} awayName={awayName} />
      {groups.map(group => {
        const headingId = `${idPrefix}-statgroup-${group.id}`;
        return (
          <section className="mc-stat-group" key={group.id} aria-labelledby={headingId}>
            {/* رأس المجموعة: شعار المضيف (يمين) · العنوان · شعار الضيف (يسار) فوق عمودي القيم. */}
            <div className="mc-stat-group-head">
              <TeamCrest logo={logos?.home} name={homeName} className="mc-mini-crest mc-mini-crest--home" size={34} />
              <Heading id={headingId} className="mc-stat-group-title">{group.label}</Heading>
              <TeamCrest logo={logos?.away} name={awayName} className="mc-mini-crest mc-mini-crest--away" size={34} />
            </div>
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
    </div>
  );
}
