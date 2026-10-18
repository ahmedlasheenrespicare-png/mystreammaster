/* ==========================================================================
   تبويب «التحليل» داخل مركز المباراة — يعرض ملخص تحليل المباراة المكتوب
   ---------------------------------------------------------------------------
   هذا التبويب يظهر فقط للمباريات التي لها `analysisSlug` (حالياً: مباريات
   دوري أبطال أوروبا — الجولة الثانية). يعرض ملخص التقرير والإحصائيات
   والمصادر، مع رابط للتحليل الكامل إن كان متاحاً.
========================================================================== */
import { useMemo } from 'react';
import analysisCollection from '../content/match-analysis.json';
import {
  hasMatchAnalysis,
} from '../lib/match-center.mjs';
import type { PanelProps } from './MatchCenterPanels';
import { to } from '../config';

/* بيانات التقارير الكاملة — تُحمَّل كسياق واحد */
const reportModules = import.meta.glob('../content/*-report.json', { eager: true, import: 'default' }) as Record<string, Record<string, unknown>>;

function getReport(analysisSlug: string): Record<string, unknown> | null {
  for (const [path, mod] of Object.entries(reportModules)) {
    if (path.includes(analysisSlug)) return mod as Record<string, unknown>;
  }
  return null;
}

function cleanText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export default function MatchCenterAnalysisTab({ match }: PanelProps) {
  const slug = match?.analysisSlug;
  if (!slug || !hasMatchAnalysis(match)) return null;

  const report = useMemo(() => analysisCollection.reports.find(r => r.slug === slug) ?? null, [slug]);
  const fullReport = useMemo(() => getReport(slug), [slug]);

  if (!report) return null;

  const homeName = cleanText(match.home.name) ?? cleanText(match.home.sourceName) ?? report.home;
  const awayName = cleanText(match.away.name) ?? cleanText(match.away.sourceName) ?? report.away;

  /* مصادر التقرير (إن وُجدت في ملف التقرير الكامل) */
  const sources = Array.isArray(fullReport?.sources) ? fullReport.sources as Array<[string, string, string, string]> : [];
  /* إحصائيات المباراة (إن وُجدت) */
  const stats = Array.isArray(fullReport?.stats) ? fullReport.stats as Array<{ label: string; home: string | number; away: string | number }> : [];
  /* أحداث المباراة (إن وُجدت) */
  const events = Array.isArray(fullReport?.events) ? fullReport.events as Array<Record<string, unknown>> : [];

  return (
    <div className="mc-analysis-tab">
      <h3>تحليل المباراة</h3>

      {/* بطاقة الملخص */}
      <div className="mc-analysis-summary" style={{ borderRight: `4px solid var(--mc-accent, #2b4eff)` }}>
        <div className="mc-analysis-score">
          <span>{homeName}</span>
          <strong className="mc-num">{report.homeScore}–{report.awayScore}</strong>
          <span>{awayName}</span>
        </div>
        {report.tag && <span className="mc-analysis-tag">{report.tag}</span>}
        {report.headline && <p className="mc-analysis-headline">{report.headline}</p>}
        {report.summary && <p className="mc-analysis-desc">{report.summary}</p>}
        {report.dateLabel && <p className="mc-note">{report.dateLabel}</p>}
      </div>

      {/* أحداث المباراة */}
      {events.length > 0 && (
        <section>
          <h3>أحداث المباراة</h3>
          <ul className="mc-events">
            {events.map((event, i) => {
              const minute = cleanText(event.minute ?? event.time ?? event.clock);
              const desc = cleanText(event.description ?? event.text ?? event.label);
              const type = cleanText(event.type ?? event.kind);
              return (
                <li className="mc-event" key={i}>
                  <span className="mc-event-minute mc-num" dir="ltr">{minute ?? '—'}</span>
                  <span className="mc-event-body">
                    <bdi>{desc ?? type ?? 'حدث'}</bdi>
                    {type && desc && <small>{type}</small>}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* إحصائيات المباراة */}
      {stats.length > 0 && (
        <section>
          <h3>إحصائيات المباراة</h3>
          <ul className="mc-stats-list">
            {stats.map((stat, i) => (
              <li key={i} className="mc-stat-row">
                <span className="mc-num">{String(stat.home)}</span>
                <span className="mc-stat-label">{stat.label}</span>
                <span className="mc-num">{String(stat.away)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* المصادر */}
      {sources.length > 0 && (
        <section>
          <h3>المصادر والمراجع</h3>
          <ul className="mc-sources-list">
            {sources.map(([id, label, url, note], i) => (
              <li key={id ?? i}>
                <a href={url} target="_blank" rel="noopener noreferrer">{label}</a>
                {note && <small>{note}</small>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* رابط للتحليل الكامل */}
      <div className="mc-analysis-link">
        <a
          href={to(`${slug}/`)}
          className="mc-analysis-full-link"
        >
          عرض التحليل الكامل ←
        </a>
      </div>

      <p className="mc-note" style={{ marginTop: '1rem' }}>
        هذا التحليل محتوى تحريري مكتوب — لا يعتمد على بيانات حية من ESPN.
        جميع الأرقام والمصادر موثقة في صفحة التحليل الكامل.
      </p>
    </div>
  );
}