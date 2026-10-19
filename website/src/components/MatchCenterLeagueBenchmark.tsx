import { useMemo } from 'react';
import leagueAveragesContent from '../content/league-averages.json';
import {
  benchmarkDirection,
  leagueBenchmark,
  type LeagueBenchmark as Benchmark,
  type LeagueBenchmarkRow,
  type LeagueBenchmarkSide,
} from '../lib/match-center.mjs';

/* «مقارنة بمتوسط الدوري»: أرقام المباراة الحالية مقابل أساس موثق من أرشيف
   المباريات المتحقَّق منها (لا مزوّد جديد). الوصف كمية مقابل أساس معلن:
   «أعلى/أقل من متوسط الدوري بـ…» لا «أفضل/أسوأ». العينة (عدد المباريات)
   معلنة دائماً، وبطولة بلا أساس موثق لا تُرسم لها مقارنة إطلاقاً.
   يُرسم في «مباشر» فيتحدّث مع كل قراءة، وفي «بعد المباراة» فيثبت أرشيفاً ختامياً. */

function numberLabel(value: number): string {
  return new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 1 }).format(value);
}

function valueText(row: LeagueBenchmarkRow, value: number): string {
  const digits = numberLabel(value);
  return row.unit === '%' ? `${digits}%` : digits;
}

/** اتجاه الطرف مقابل الأساس: عبارة كمية بالفارق المقرّب منزلة واحدة. */
function sidePhrase(row: LeagueBenchmarkRow, side: LeagueBenchmarkSide): string {
  const direction = benchmarkDirection(side.delta);
  const step = numberLabel(Math.abs(Math.round(side.delta * 10) / 10));
  if (direction === 'equal') return 'عند متوسط الدوري تقريباً';
  const unit = row.unit === '%' ? ' نقطة مئوية' : row.unit ? ` ${row.unit}` : '';
  return direction === 'above'
    ? `أعلى من متوسط الدوري بـ ${step}${unit}`
    : `أقل من متوسط الدوري بـ ${step}${unit}`;
}

function SideLine({ row, side, name, sideId }: { row: LeagueBenchmarkRow; side: LeagueBenchmarkSide | null; name: string; sideId: 'home' | 'away' }) {
  return (
    <span className="mc-bench-side" data-side={sideId}>
      <bdi className="mc-bench-side-name">{name}</bdi>
      {side === null
        ? <span className="mc-bench-none">غير متاح</span>
        : (
          <>
            <span className="mc-num mc-bench-value">{valueText(row, side.value)}</span>
            <span className="mc-bench-phrase" data-direction={benchmarkDirection(side.delta) ?? 'none'}>{sidePhrase(row, side)}</span>
          </>
        )}
    </span>
  );
}

export interface MatchCenterLeagueBenchmarkProps {
  statistics: unknown;
  homeName: string;
  awayName: string;
  /** معرّف بطولة المباراة (مثل `eng.1`) لاختيار الأساس الموثّق إن وُجد. */
  leagueId: string | null | undefined;
  competitionName?: string | null;
  headingLevel?: 'h3' | 'h4';
}

export default function MatchCenterLeagueBenchmark({
  statistics,
  homeName,
  awayName,
  leagueId,
  competitionName = null,
  headingLevel = 'h3',
}: MatchCenterLeagueBenchmarkProps) {
  const averages = leagueId ? (leagueAveragesContent.leagues as Record<string, { season: string; matches: number; possession: number; shots: number; passAccuracy: number }>)[leagueId] ?? null : null;
  const benchmark = useMemo(
    () => leagueBenchmark(statistics as never, averages as never),
    [statistics, averages],
  ) as Benchmark | null;
  if (!benchmark || !averages) return null;
  const Heading = headingLevel;
  const sample = [
    competitionName || null,
    `موسم ${averages.season}`,
    `${numberLabel(benchmark.matches)} مباراة موثقة`,
  ].filter(Boolean).join(' · ');

  return (
    <section className="mc-benchmark" aria-label="مقارنة أرقام المباراة بمتوسط الدوري">
      <Heading className="mc-benchmark-title">مقارنة بمتوسط الدوري</Heading>
      <p className="mc-benchmark-sample">{sample} — المتوسط لكل فريق في المباراة الواحدة.</p>
      <ul className="mc-benchmark-rows">
        {benchmark.rows.map(row => (
          <li className="mc-benchmark-row" key={row.key}>
            <p className="mc-benchmark-row-head">
              <span className="mc-benchmark-label">{row.label}</span>
              <span className="mc-benchmark-average">متوسط الدوري <span className="mc-num">{valueText(row, row.average)}</span></span>
            </p>
            <p className="mc-benchmark-sides">
              <SideLine row={row} side={row.home} name={homeName} sideId="home" />
              <SideLine row={row} side={row.away} name={awayName} sideId="away" />
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
