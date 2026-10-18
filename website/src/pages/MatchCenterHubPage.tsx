/* ==========================================================================
   صفحة مركز المباراة الرئيسية — تجمع كل المباريات المغطاة
   -------------------------------------------------------------------------- */
import { useMemo } from 'react';
import {
  MATCH_CENTER_ALL_MATCHES,
  MATCH_CENTER_COMPETITIONS,
  matchCenterPath,
  type MatchCenterFixture,
} from '../content/match-center.mjs';
import analysisCollection from '../content/match-analysis.json';
import { to } from '../config';
import { formatInZone } from '../lib/match-center.mjs';

/* فرز المباريات: الأحدث أولاً */
function sortByKickoff(a: MatchCenterFixture, b: MatchCenterFixture): number {
  const da = a.kickoffUtc ? Date.parse(a.kickoffUtc) : 0;
  const db = b.kickoffUtc ? Date.parse(b.kickoffUtc) : 0;
  return db - da;
}

function cleanText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function formatDate(utc: string | null): string {
  if (!utc) return '—';
  try {
    return formatInZone(utc, 'Africa/Cairo', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
  } catch {
    return '—';
  }
}

/* هل للمباراة تحليل مكتوب (من match-analysis.json)؟ */
function hasAnalysis(slug: string): boolean {
  return analysisCollection.reports.some(r => r.slug === slug);
}

export default function MatchCenterHubPage() {
  const sorted = useMemo(() => [...MATCH_CENTER_ALL_MATCHES].sort(sortByKickoff), []);

  /* تجميع حسب البطولة */
  const byCompetition = useMemo(() => {
    const map = new Map<string, MatchCenterFixture[]>();
    for (const m of sorted) {
      const key = m.competitionSlug;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return map;
  }, [sorted]);

  /* المباريات الأربعة ذات التحليلات (UCL) */
  const analysisSlugs = analysisCollection.reports.map(r => r.slug);
  const analysisFixtures = sorted.filter(m => analysisSlugs.includes(m.slug));

  return (
    <section className="pt-[160px] pb-24 px-4 sm:px-5" dir="rtl">
      <div className="max-w-[1200px] mx-auto">
        {/* مسار التصفح */}
        <nav className="text-[12.5px] font-bold text-black/40 mb-6" aria-label="مسار التصفح">
          <a href={to('')} className="hover:text-black transition">الرئيسية</a>
          <span className="mx-2">/</span>
          <span className="text-black/70">مركز المباراة</span>
        </nav>

        <h1 className="font-display text-4xl font-black mb-4">مركز المباراة</h1>
        <p className="text-[15px] text-black/60 max-w-2xl mb-10 leading-relaxed">
          المباريات التي يغطّيها الموقع: نتائج وتحديثات مباشرة، تشكيلات، أحداث، وإحصائيات.
          اختر مباراة للانتقال إلى مركزها التفصيلي.
        </p>

        {/* قسم تحليلات UCL */}
        {analysisFixtures.length > 0 && (
          <section className="mb-12">
            <h2 className="text-[18px] font-black mb-4 flex items-center gap-2">
              <span className="text-xl">🏆</span>
              تحليلات دوري أبطال أوروبا — الجولة الثانية
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {analysisFixtures.map(m => {
                const home = cleanText(m.home.name) ?? cleanText(m.home.sourceName) ?? '—';
                const away = cleanText(m.away.name) ?? cleanText(m.away.sourceName) ?? '—';
                return (
                  <a
                    key={m.id}
                    href={to(matchCenterPath(m).replace(/^\//, ''))}
                    className="flex items-center justify-between p-4 rounded-2xl border border-black/10 hover:border-[#2b4eff] hover:bg-[#f4f3ef] transition group"
                  >
                    <div>
                      <p className="text-[15px] font-black">{home} × {away}</p>
                      <p className="text-[12px] text-black/50 mt-1">{formatDate(m.kickoffUtc)}</p>
                    </div>
                    <span className="text-[12px] font-bold text-[#2b4eff] opacity-0 group-hover:opacity-100 transition">
                      مركز المباراة ←
                    </span>
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {/* كل المباريات حسب البطولة */}
        <section>
          <h2 className="text-[18px] font-black mb-4">كل المباريات المغطاة</h2>
          {[...byCompetition.entries()].map(([compSlug, matches]) => {
            const comp = MATCH_CENTER_COMPETITIONS.find(c => c.slug === compSlug);
            const compName = comp?.name ?? compSlug;
            return (
              <details key={compSlug} className="mb-4 rounded-2xl border border-black/10 overflow-hidden" open>
                <summary className="flex items-center justify-between px-5 py-3.5 font-black text-[15px] cursor-pointer hover:bg-[#f4f3ef] transition">
                  <span>{compName} ({matches.length})</span>
                </summary>
                <div className="border-t border-black/10">
                  <div className="divide-y divide-black/5">
                    {matches.map(m => {
                      const home = cleanText(m.home.name) ?? cleanText(m.home.sourceName) ?? '—';
                      const away = cleanText(m.away.name) ?? cleanText(m.away.sourceName) ?? '—';
                      const hasA = hasAnalysis(m.slug);
                      return (
                        <a
                          key={m.id}
                          href={to(matchCenterPath(m).replace(/^\//, ''))}
                          className="flex items-center justify-between px-5 py-3 hover:bg-[#f4f3ef] transition group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-[14px] font-black">{home} × {away}</span>
                            {hasA && (
                              <span className="text-[10px] font-black bg-[#2b4eff]/10 text-[#2b4eff] px-2 py-0.5 rounded-full">
                                تحليل
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[12px] text-black/50">{formatDate(m.kickoffUtc)}</span>
                            <span className="text-[12px] font-bold text-[#2b4eff] opacity-0 group-hover:opacity-100 transition">←</span>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              </details>
            );
          })}
        </section>
      </div>
    </section>
  );
}