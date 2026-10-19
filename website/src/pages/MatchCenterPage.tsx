import { useEffect, useMemo, useState } from 'react';
import { useMatchCenter } from '../components/useMatchCenter';
import MatchCenterVisuals from '../components/MatchCenterVisuals';
import MatchCenterTabs from '../components/MatchCenterTabs';
import { availableMatchCenterTabs, PANELS } from '../components/MatchCenterPanels';
import { useMatchCenterTools } from '../components/useMatchCenterTools';
import MatchCenterDocs from '../components/MatchCenterDocs';
import {
  MATCH_CENTER_DOCUMENTATION,
  type MatchCenterFixture,
} from '../content/match-center.mjs';
import {
  canShowKickoff,
  canShowScore,
  defaultTab,
  formatInZone,
  kickoffLabel,
  type Announcement,
} from '../lib/match-center.mjs';
import { to } from '../config';
import './match-center.css';

function cleanText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Date.parse(value));
}

/* سطر واحد لكل تبويب: يُقرأ في `title` وفي `aria-describedby` الضمني، فيعرف
   الزائر ما في القسم قبل أن يفتحه — ووصفٌ لا يُطابق ما يُعرض أسوأ من لا شيء،
   لذلك تُركت النصوص عامة بلا أرقام: الأرقام تتغيّر مع كل قراءة. */
const TAB_HINTS: Partial<Record<import('../lib/match-center.mjs').TabId, string>> = {
  prematch: 'المواجهات السابقة، والمعاينة ومستوى الفريقين بعد أن تحل التشكيلة محلها على الملعب',
  live: 'العد التنازلي وأرقام الفريقين من المصدر',
  analysis: 'تحليل المباراة المكتوب — الأحداث والإحصائيات والمصادر',
  postmatch: 'إحصائيات الفريقين أولاً، ثم فلاتر الأحداث وتقرير ما بعد المباراة',
};
function readTimeLabel(value: unknown): string | null {
  if (!validDate(value)) return null;
  try {
    return formatInZone(value, 'Africa/Cairo', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    });
  } catch {
    return null;
  }
}

export default function MatchCenterPage({ match }: { match: MatchCenterFixture }) {
  const state = useMatchCenter(match);
  const {
    status,
    snapshot,
    freshness,
    announcements,
    correction,
    chooseTab,
    clearAnnouncements,
  } = state;

  /* حالة الاختار المشتركة بين شريط الملعب وقسم التحليل. */
  const tools = useMatchCenterTools({
    events: snapshot?.events ?? null,
    matchId: match.id,
  });

  const [flash, setFlash] = useState<'home' | 'away' | null>(null);
  useEffect(() => {
    const goal = announcements.find((item: Announcement) => item.kind === 'goal');
    if (!goal) return;
    const side = goal.event.teamSide;
    if (side !== 'home' && side !== 'away') return;
    setFlash(goal.event.type === 'own_goal' ? (side === 'home' ? 'away' : 'home') : side);
    const timer = window.setTimeout(() => setFlash(null), 1600);
    return () => window.clearTimeout(timer);
  }, [announcements]);

  useEffect(() => {
    if (!announcements.length && !correction) return;
    const timer = window.setTimeout(() => clearAnnouncements(), 15_000);
    return () => window.clearTimeout(timer);
  }, [announcements, correction, clearAnnouncements]);

  const availableTabs = useMemo(
    () => availableMatchCenterTabs(match, snapshot, status),
    [match, snapshot, status],
  );
  const activeTab = availableTabs.includes(state.activeTab)
    ? state.activeTab
    : availableTabs.includes(defaultTab(status))
      ? defaultTab(status)
      : availableTabs[0] ?? 'prematch';
  const score = snapshot?.score ?? null;
  const showScore = canShowScore(status, score);
  const livePulse = status?.code === 'live' && freshness.level === 'fresh';

  const homeLabel = cleanText(match.home.shortName) ?? cleanText(match.home.name) ?? cleanText(match.home.sourceName);
  const awayLabel = cleanText(match.away.shortName) ?? cleanText(match.away.name) ?? cleanText(match.away.sourceName);
  const competition = cleanText(match.competitionName);
  const readAtLabel = readTimeLabel(snapshot?.readAt);
  let miniKickoff: string | null = null;
  if (canShowKickoff(status) && validDate(match.kickoffUtc)) {
    try { miniKickoff = kickoffLabel(match.kickoffUtc, 'Africa/Cairo'); } catch { miniKickoff = null; }
  }
  const miniFallback = cleanText(status?.label) ?? miniKickoff;

  return (
    <section className="mc-page" dir="rtl">
      <div className="mc-container">
        <nav className="mc-crumbs" aria-label="مسار التصفح">
          <a href={to('')}>الرئيسية</a>
          <span aria-hidden="true">/</span>
          <a href={to('match-center/')}>مركز المباراة</a>
          {competition && <>
            <span aria-hidden="true">/</span>
            {match.leagueId === 'eng.1'
              ? <a href={to(`matches/${match.competitionSlug}/`)}>{competition}</a>
              : <span>{competition}</span>}
          </>}
          {(homeLabel || awayLabel) && <>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{[homeLabel, awayLabel].filter(Boolean).join(' × ')}</span>
          </>}
        </nav>

        <MatchCenterVisuals
          match={match}
          snapshot={snapshot}
          status={status}
          flash={flash}
          fresh={livePulse}
          tools={tools}
        />

        {!state.online && (
          <p className="mc-warning" role="status">
            لا يوجد اتصال — التحديث التلقائي متوقف. تبقى آخر قراءة مؤكدة بوقتها إن وُجدت، ولا تُعرض على أنها قراءة حالية.
          </p>
        )}
        {state.online && state.failureText && (
          <p className="mc-warning" role="status">
            تعذّرت القراءة الأخيرة ({state.failureCode}). تبقى آخر قراءة مؤكدة بوقتها إن وُجدت ولا تُستبدل ببيانات ناقصة.
            {state.failureText ? ` — ${state.failureText}` : ''}
          </p>
        )}
        {state.simulated && (
          <p className="mc-simulated" role="note">
            <b>وضع المحاكاة:</b> هذه بيانات مولّدة محلياً للاختبار والمعاينة وليست بيانات إنتاجية.
          </p>
        )}

        {availableTabs.length > 0 && (
          <>
            <MatchCenterTabs
              activeTab={activeTab}
              onChoose={chooseTab}
              tabs={availableTabs}
              describeTab={tab => TAB_HINTS[tab] ?? null}
            />
            {availableTabs.map(tabId => {
              const Panel = PANELS[tabId];
              const selected = tabId === activeTab;
              return (
                <div
                  key={tabId}
                  className="mc-panel"
                  role="tabpanel"
                  id={`mc-panel-${tabId}`}
                  aria-labelledby={`mc-tab-${tabId}`}
                  tabIndex={selected ? 0 : -1}
                  hidden={!selected}
                >
                  <Panel
                    match={match}
                    snapshot={snapshot}
                    status={status}
                    now={state.now}
                    countdown={state.countdown}
                    tools={tools}
                  />
                </div>
              );
            })}
          </>
        )}

        <noscript>
          <style>{`.mc-tabs{display:none !important}.mc-panel[hidden]{display:block !important}`}</style>
          <p className="mc-note">
            JavaScript معطّل؛ معلومات الملعب أعلاه لقطة ثابتة، ولا يعمل التحديث التلقائي. لا تظهر هنا أقسام بلا بيانات.
          </p>
        </noscript>

        <section className="mc-docs" aria-labelledby="mc-docs-title">
          <h2 id="mc-docs-title">التوثيق والمراجعة</h2>
          {/* البيت الوحيد لنصوص المصدر وطريقة قراءة الأرقام؛ أعلى الصفحة للأرقام فقط. */}
          <MatchCenterDocs match={match} readAtLabel={readAtLabel} />
          <p>{MATCH_CENTER_DOCUMENTATION.rightsNote}</p>
          <ul>
            {MATCH_CENTER_DOCUMENTATION.providers.map(provider => (
              <li key={provider.id}><b>{provider.label}</b> — {provider.note}</li>
            ))}
          </ul>
          {cleanText(match.sourcesNote) && <p>{cleanText(match.sourcesNote)}</p>}
          <p>
            هذه الصفحة دليل متابعة ومشاهدة رسمية ومُعرِّف تقني وسيط، وليست منصة إعادة بث.
            لا تُنسخ مقالات كاملة، ولا تُستضاف ملخصات أو بثوث، ولا تُعرض صور أو وجوه بلا إذن.
          </p>
        </section>
      </div>

      {(homeLabel || awayLabel || showScore || miniFallback) && (
        <div className="mc-mini">
          {(homeLabel || awayLabel) && <span className="mc-mini-teams">{[homeLabel, awayLabel].filter(Boolean).join(' × ')}</span>}
          {showScore && score
            ? <span className="mc-mini-score">{score.home}–{score.away}</span>
            : miniFallback && <span className="mc-mini-status">{miniFallback}</span>}
          <a className="mc-mini-link" href={availableTabs.length ? `#mc-panel-${activeTab}` : '#mc-title'}>أعلى</a>
        </div>
      )}

      <div className="mc-live-region" aria-live="polite" aria-atomic="false" role="status">
        {announcements.map((item: Announcement) => <span key={`${item.kind}-${item.key}`}>{item.message}. </span>)}
        {correction && <span>{correction.message}. </span>}
      </div>
    </section>
  );
}
