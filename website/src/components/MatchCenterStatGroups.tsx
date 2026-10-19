import { groupStatistics, possessionSplit, type GroupIndex, type StatComparisonRow, type StatGroup } from '../lib/match-center.mjs';
import TeamCrest from './MatchCenterCrest';

/* مجموعات الأرقام «السهلة المسح» الست: الاستحواذ والتمرير، التسديد، بناء
   الهجمة، الدفاع، حراسة المرمى، الانضباط. التجميع في طبقة العقد
   (`groupStatistics`) لا هنا، حتى يبقى «أي رقم ينتمي إلى أي مجموعة» قراراً
   واحداً تُختبر في Node. شرح الشريط ومعنى «غير متاح» في «توثيق ومراجعة» آخر
   الصفحة، لا بين الأرقام.

   ميزان كل مجموعة (شريطا الحصة والصفوف) بلا عنوان ظاهر باسمه: اسم المجموعة
   في رأسها هو تسميته، كما اعتُمد في التصور. */

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

/** عرض شريحة من شريط مقسوم — النسبة إلى المجموع لا إلى ١٠٠ افتراضاً. */
function partWidth(count: number, total: number): string {
  if (total <= 0 || count <= 0) return '0%';
  return `${Math.round((count / total) * 1000) / 10}%`;
}

function rowsWord(count: number): string {
  if (count === 1) return 'صف واحد';
  if (count === 2) return 'صفّين';
  return `${numberLabel(count)} صفوف`;
}

/** النعت بعد المجرور: «من صفّين قابلين» لا «من صفّان قابلان». */
function rowsAdjective(count: number): string {
  if (count === 1) return 'قابل للمقارنة';
  if (count === 2) return 'قابلين للمقارنة';
  return 'قابلة للمقارنة';
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

/**
 * ميزان المجموعة: شريط متوسط الحصة (الرقمان المطبوعان مجموعهما ١٠) وشريط
 * عدّ الصفوف الأعلى رقمياً، وسطر أساس يعلن كم صفاً دخل الحساب وكم نقص وكم
 * صفر/صفر. بلا عنوان باسمه — اسم المجموعة في رأسها تسميته — وبلا كلمة
 * «أفضل»: «الأعلى رقمياً» وصف كمية لا حكم.
 */
function GroupIndex({ index, homeName, awayName }: { index: GroupIndex | null; homeName: string; awayName: string }) {
  if (!index) return null;
  const total = index.comparable + index.unavailable;
  const segments: { lead: 'home' | 'away' | 'equal' | 'none'; count: number }[] = [
    { lead: 'home', count: index.tally.home },
    { lead: 'away', count: index.tally.away },
    { lead: 'equal', count: index.tally.equal },
    { lead: 'none', count: index.unavailable },
  ];

  const note: string[] = [`متوسط حصة كل طرف من ${rowsWord(index.comparable)} ${rowsAdjective(index.comparable)}`];
  const higher: string[] = [];
  if (index.tally.home) higher.push(`${homeName} في ${rowsWord(index.tally.home)}`);
  if (index.tally.away) higher.push(`${awayName} في ${rowsWord(index.tally.away)}`);
  if (index.tally.equal) higher.push(`متساويان في ${rowsWord(index.tally.equal)}`);
  if (higher.length) note.push(`الأعلى رقمياً: ${higher.join(' · ')}`);
  /* الأساس أرقام قائمة بلا إعراب يعتمد على السياق: «بلا رقمين: ١» لا «صف غير متاح». */
  if (index.unavailable) note.push(`بلا رقمين: ${numberLabel(index.unavailable)}`);
  if (index.zeroZero) note.push(`منها ${numberLabel(index.zeroZero)} صفر/صفر (نصفان متساويان)`);

  return (
    <div className="mc-stat-index" data-basis={index.single ? 'single' : 'rows'}>
      <div className="mc-stat-index-head">
        <span className="mc-stat-index-pcts">
          <span className="mc-num mc-stat-index-pct" data-side="home">{numberLabel(index.pctHome)}%</span>
          <span className="mc-stat-index-sep">مقابل</span>
          <span className="mc-num mc-stat-index-pct" data-side="away">{numberLabel(index.pctAway)}%</span>
        </span>
      </div>
      <div className="mc-stat-index-bar" aria-hidden="true">
        <span className="mc-stat-index-fill" data-side="home" style={{ inlineSize: barWidth(index.meanHome) }} />
        <span className="mc-stat-index-fill" data-side="away" style={{ inlineSize: barWidth(index.meanAway) }} />
      </div>
      <div className="mc-stat-tally-bar" aria-hidden="true">
        {segments.filter(part => part.count > 0).map(part => (
          <span key={part.lead} className="mc-stat-tally-seg" data-lead={part.lead} style={{ inlineSize: partWidth(part.count, total) }} />
        ))}
      </div>
      <p className="mc-stat-index-note">{note.join(' · ')}</p>
    </div>
  );
}

/** لوحة «مؤشرات المجموعات»: نظرة المجموعات نفسها مجمّعة للمسح السريع، وكل
    سطر رابط إلى مجموعته حيثما رُسمت اللوحة (لوحة المرحلة أو الملعب). مجموعة
    بلا ميزان لا سطر لها — كالمجموعة الفارغة. */
function IndexBoard({ groups, Heading, linkPrefix, className }: { groups: StatGroup[]; Heading: 'h2' | 'h3' | 'h4'; linkPrefix: string | null; className?: string }) {
  const rows = groups.filter(group => group.index !== null);
  if (rows.length === 0) return null;
  return (
    <section className={`mc-indexboard${className ? ` ${className}` : ''}`} aria-label="مؤشرات المجموعات">
      <Heading className="mc-indexboard-head">مؤشرات المجموعات</Heading>
      <p className="mc-indexboard-sub">
        متوسط حصة كل طرف من صفوف كل مجموعة — النظرة نفسها التي في رأس كل مجموعة، مجمّعة للمسح السريع.
        {linkPrefix ? ' الضغط على اسم المجموعة ينقلك إليها.' : ''}
      </p>
      <ul className="mc-indexboard-rows">
        {rows.map(group => {
          const index = group.index as GroupIndex;
          return (
            <li className="mc-indexboard-row" key={group.id}>
              {linkPrefix
                ? <a href={`#${linkPrefix}-statgroup-${group.id}`}>{group.label}</a>
                : <span>{group.label}</span>}
              <span className="mc-indexboard-bar" aria-hidden="true">
                <span className="mc-indexboard-fill" data-side="home" style={{ inlineSize: barWidth(index.meanHome) }} />
                <span className="mc-indexboard-fill" data-side="away" style={{ inlineSize: barWidth(index.meanAway) }} />
              </span>
              <span className="mc-indexboard-pcts">
                <span className="mc-num" data-side="home">{numberLabel(index.pctHome)}%</span>
                <span className="mc-num" data-side="away">{numberLabel(index.pctAway)}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** اللوحة نفسها لأي موضع: على الملعب أسفل بطاقتي الفريقين أو داخل لوحات
    المراحل — عقد واحد مشتق من `groupStatistics` فلا تتباعد نسختان. */
export function MatchCenterIndexBoard({ statistics, Heading, linkPrefix, className }: {
  statistics: unknown;
  Heading: 'h2' | 'h3' | 'h4';
  linkPrefix: string | null;
  className?: string;
}) {
  return <IndexBoard groups={groupStatistics(statistics as never)} Heading={Heading} linkPrefix={linkPrefix} className={className} />;
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
      <IndexBoard groups={groups} Heading={Heading} linkPrefix={idPrefix} />
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
            <GroupIndex index={group.index} homeName={homeName} awayName={awayName} />
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
