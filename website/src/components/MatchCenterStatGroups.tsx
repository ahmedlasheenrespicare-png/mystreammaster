import { groupStatistics, type GroupIndex, type StatGroup } from '../lib/match-center.mjs';
import TeamCrest from './MatchCenterCrest';
import MatchCenterStatCard, { formatStatNumber } from './MatchCenterStatCard';

/* الست مجموعات ترتّبها طبقة العقد (`groupStatistics`). كل رقم في صف من
   المصدر يصير بطاقة واحدة؛ الاستحواذ يظل في أول الموضع البارز ولا يتكرر في
   مجموعته. ميزان كل مجموعة يحتفظ بشريطَي الحصة وعدّ الصفوف دون تغيير. */

const numberLabel = formatStatNumber;

function barWidth(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '0%';
  /* شريط الميزان وحده: متوسط الحصة موجود في 0–1، والحرس بصري فقط. */
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

/**
 * ميزان المجموعة: شريط متوسط الحصة (الرقمان المطبوعان مجموعهما ١٠٠) وشريط
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

/** اللوحة مشتقة من الميزان نفسه في التبويب والملعب، لا من طلب آخر.
    مجموعة بلا صف برقمين لا ميزان لها، فلا تُنشأ لها بطاقة مؤشر. */
function IndexBoard({ groups, linkPrefix, homeName, awayName, className }: {
  groups: StatGroup[]; linkPrefix: string | null;
  homeName: string; awayName: string; className?: string;
}) {
  const rows = groups.filter((group): group is StatGroup & { index: GroupIndex } => group.index !== null);
  if (rows.length === 0) return null;
  return (
    <section className={`mc-indexboard${className ? ` ${className}` : ''}`} aria-label="بطاقات المجموعات الإحصائية">
      <ul className="mc-indexboard-rows">
        {rows.map(({ id, label, index }) => (
          <MatchCenterStatCard key={id} className="mc-indexboard-row" label={label}
            homeName={homeName} awayName={awayName} home={index.pctHome} away={index.pctAway}
            unit="%" bar={{ home: index.meanHome, away: index.meanAway }}
            href={linkPrefix ? `#${linkPrefix}-statgroup-${id}` : undefined} />
        ))}
      </ul>
    </section>
  );
}

/** اللوحة نفسها لأي موضع: على الملعب أسفل بطاقتي الفريقين أو داخل لوحات
    المراحل — عقد واحد مشتق من `groupStatistics` فلا تتباعد نسختان. */
export function MatchCenterIndexBoard({ statistics, linkPrefix, homeName, awayName, className }: {
  statistics: unknown;
  linkPrefix: string | null;
  homeName: string; awayName: string;
  className?: string;
}) {
  return <IndexBoard groups={groupStatistics(statistics as never)} linkPrefix={linkPrefix}
    homeName={homeName} awayName={awayName} className={className} />;
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
  const possession = groups.flatMap(group => group.rows).find(row => row.key === 'possessionPct');

  return (
    <div className="mc-stat-groups">
      {/* بطاقة واحدة لكل صف: الاستحواذ أولاً، ولا نسخة أخرى داخل المجموعة. */}
      {possession && (
        <MatchCenterStatCard as="div" className="mc-possession" statKey={possession.key}
          label={possession.label} homeName={homeName} awayName={awayName}
          home={possession.home} away={possession.away} unit={possession.unit} bar={possession.bar} />
      )}
      <IndexBoard groups={groups} linkPrefix={idPrefix} homeName={homeName} awayName={awayName} />
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
            {group.rows.some(row => row !== possession) && (
              <ul className="mc-stat-compares">
                {group.rows.filter(row => row !== possession).map(row => (
                  <MatchCenterStatCard key={`${group.id}-${row.key}`} className="mc-stat-compare" statKey={row.key}
                    label={row.label} homeName={homeName} awayName={awayName}
                    home={row.home} away={row.away} unit={row.unit} bar={row.bar} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
