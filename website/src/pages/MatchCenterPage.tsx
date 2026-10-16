import { useEffect, useMemo, useState } from 'react';
import { useMatchCenter } from '../components/useMatchCenter';
import MatchCenterTabs from '../components/MatchCenterTabs';
import { PANELS } from '../components/MatchCenterPanels';
import {
  MATCH_CENTER_COMPETITION,
  MATCH_CENTER_DOCUMENTATION,
  type MatchCenterFixture,
} from '../content/match-center.mjs';
import { dayLabelInZone, formatInZone, kickoffLabel, type Announcement } from '../lib/match-center.mjs';
import { to } from '../config';
import './match-center.css';

/* ==========================================================================
   مركز المباراة — قالب واحد مشترك للمباريات الثلاث (البند 3)
   --------------------------------------------------------------------------
   لا نسخة لكل مباراة: نفس المكوّن يستقبل تعريفاً مختلفاً، والرابط هو ما
   يختلف. فلو كُرّر الكود ثلاث مرات لتباعدت النسخ عند أول تعديل.

   الرابط ثابت من المعاينة إلى المباشر إلى التقرير النهائي — لا حالة ولا نتيجة
   في الرابط (البند 3)، فلا ينكسر رابط شاركه أحد قبل البداية.
========================================================================== */

/** الأحرف الأولى للاسم اللاتيني للشعار المؤقت — بلا تنزيل أصول ولا استضافة. */
function monogram(sourceName: string | null, fallback: string): string {
  const base = (sourceName || fallback || '').trim();
  if (!base) return '؟';
  const parts = base.split(/\s+/).slice(0, 2);
  /* اسم من كلمة واحدة يعطي حرفاً واحداً ('B' لبرينتفورد) فيبدو الشعار فارغاً
     بجانب 'MC' و'NU'. فحرفان من الكلمة الواحدة، وحرف أول من كل كلمة حين تكون
     الكلمات اثنتين — وكلاهما من الاسم اللاتيني الوارد من المصدر لا من تخمين. */
  return (parts.length >= 2 ? parts.map(part => part[0]).join('') : parts[0].slice(0, 2)).toUpperCase();
}

/* البند 4: شعارا الفريقين «عند توفر أصول مسموح باستخدامها». الرابط يصل مع
   القراءة الحية من المصدر ولا يُخزَّن في التعريفات، فالرابط غير المؤكد لا
   يُنشر في HTML ثابت. و`alt=""` لأن اسم الفريق نص مجاور — فالصورة زخرفية،
   وهو نفس عرف `Team` في `MatchesPage`.

   وعند فشل التحميل تعود الأحرف الأولى بدل فراغ غير مرئي: `visibility:hidden`
   الذي تستخدمه صفحة المواعيد يترك فجوة بحجم الصورة، والفريقان هنا عمودا
   ترويسة متناظران فالفجوة تُخلّ بالمحاذاة. */
function Crest({ logo, sourceName, shortName, side }: {
  logo: string | null;
  sourceName: string | null;
  shortName: string;
  side: 'home' | 'away';
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [logo]);
  if (logo && !failed) {
    return (
      <img
        className={`mc-logo mc-logo--${side}`}
        src={logo}
        alt=""
        width="64"
        height="64"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }
  return <span className="mc-crest" aria-hidden="true">{monogram(sourceName, shortName)}</span>;
}

export default function MatchCenterPage({ match }: { match: MatchCenterFixture }) {
  const state = useMatchCenter(match);
  const { status, snapshot, freshness, countdown, announcements, correction, activeTab } = state;

  /* البند 10: وميض الهدف على بطاقة الفريق وحدها، مرة واحدة، بلا وميض سريع
     ولا تغيير في كامل الشاشة. الهدف العكسي يضيء بطاقة الفريق المستفيد لا
     الفريق الذي سجّله في مرماه. */
  const [flash, setFlash] = useState<'home' | 'away' | null>(null);
  useEffect(() => {
    const goal = announcements.find((item: Announcement) => item.kind === 'goal');
    if (!goal) return;
    const side = goal.event.teamSide;
    if (side !== 'home' && side !== 'away') return;
    const beneficiary = goal.event.type === 'own_goal' ? (side === 'home' ? 'away' : 'home') : side;
    setFlash(beneficiary);
    const timer = window.setTimeout(() => setFlash(null), 1600);
    return () => window.clearTimeout(timer);
  }, [announcements]);

  /* الإعلانات تُقرأ مرة ثم تُنظَّف حتى لا تعيد قارئ الشاشة قراءتها. */
  useEffect(() => {
    if (!announcements.length && !correction) return;
    const timer = window.setTimeout(() => state.clearAnnouncements(), 15_000);
    return () => window.clearTimeout(timer);
  }, [announcements, correction, state]);

  /* البند 10: النبض الهادئ مربوط بحالة حيّة **وحديثة فعلاً**، لا بمجرد مرور
     وقت البداية. قراءة قديمة عن مباراة جارية لا تستحق نبضاً يوحي بالحيوية. */
  const livePulse = status?.code === 'live' && freshness.level === 'fresh';

  /* البند 13: «المعلومات الأساسية يجب أن تكون داخل HTML وتعمل بلا JavaScript».
     رسم التبويب النشط وحده كان يعني أن الزائر بلا JavaScript يرى «معاينة»
     فقط ولا سبيل له إلى الأربعة الباقية. لذلك تُرسم اللوحات الخمس كلها —
     وهو نمط ARIA القياسي أصلاً: كل اللوحات في DOM وغير النشطة `hidden` —
     وتُظهرها ورقة `noscript` أدناه حين لا يعمل JavaScript. */
  const tabIds = Object.keys(PANELS) as (keyof typeof PANELS)[];
  const score = snapshot?.score ?? null;
  const showScore = status ? ['live', 'halftime', 'finished', 'suspended', 'abandoned'].includes(status.code) && score !== null : false;

  const countdownText = useMemo(() => {
    if (!countdown || countdown.started) return '';
    const parts = [
      countdown.days ? `${countdown.days} يوم` : '',
      countdown.hours ? `${countdown.hours} ساعة` : '',
      `${countdown.minutes} دقيقة`,
      `${countdown.seconds} ثانية`,
    ].filter(Boolean);
    return `يتبقى ${parts.join(' و')}`;
  }, [countdown]);

  return (
    <section className="mc-page" dir="rtl" aria-labelledby="mc-title">
      <div className="mc-container">
        <nav className="mc-crumbs" aria-label="مسار التصفح">
          <a href={to('')}>الرئيسية</a>
          <span aria-hidden="true">/</span>
          <a href={to('matches/')}>مواعيد المباريات</a>
          <span aria-hidden="true">/</span>
          <a href={to(`matches/${MATCH_CENTER_COMPETITION.slug}/`)}>{MATCH_CENTER_COMPETITION.name}</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{match.home.shortName} × {match.away.shortName}</span>
        </nav>

        {/* ── الترويسة: الفريقان والمسابقة والملعب والموعد (البند 4) ── */}
        <header className="mc-hero">
          <div className={`mc-team mc-team--home${flash === 'home' ? ' mc-team--flash' : ''}`}>
            <Crest logo={snapshot?.logos?.home ?? null} sourceName={match.home.sourceName} shortName={match.home.shortName} side="home" />
            <span className="mc-team-name">{match.home.name}</span>
            <span className="mc-team-tag">المضيف</span>
          </div>

          <div className="mc-mid">
            <h1 id="mc-title" style={{ margin: 0, fontSize: 'clamp(.95rem,3.2vw,1.15rem)', fontWeight: 900, textAlign: 'center', lineHeight: 1.5 }}>
              مركز المباراة · {match.home.name} ضد {match.away.name}
            </h1>

            {showScore && score ? (
              <>
                <p className="mc-score" style={{ margin: 0 }}>
                  <span dir="ltr">{score.home}<span className="mc-score-sep">–</span>{score.away}</span>
                </p>
                {status?.clock && <span className="mc-clock" dir="ltr">{status.clock}</span>}
              </>
            ) : (
              <>
                {/* البند 6: لا تُعرض 0–0 نتيجة مؤكدة قبل البداية. */}
                <p className="mc-countdown" style={{ margin: 0 }} aria-label={countdownText || 'لم تبدأ المباراة'}>
                  {countdown && !countdown.started ? (
                    <>
                      <span className="mc-count-unit"><b className="mc-num">{countdown.days}</b><small>يوم</small></span>
                      <span className="mc-count-unit"><b className="mc-num">{countdown.hours}</b><small>ساعة</small></span>
                      <span className="mc-count-unit"><b className="mc-num">{countdown.minutes}</b><small>دقيقة</small></span>
                      <span className="mc-count-unit"><b className="mc-num">{countdown.seconds}</b><small>ثانية</small></span>
                    </>
                  ) : (
                    <span className="mc-count-unit"><b style={{ fontSize: '1rem' }}>لم تبدأ</b></span>
                  )}
                </p>
                <span className="mc-kickoff">
                  {kickoffLabel(match.kickoffUtc, 'Africa/Cairo')} {dayLabelInZone(match.kickoffUtc, 'Africa/Cairo')} · القاهرة
                </span>
              </>
            )}

            <span className="mc-state" data-code={status?.code ?? 'scheduled'} data-fresh={livePulse ? 'true' : 'false'}>
              <span className="mc-pulse" aria-hidden="true" />
              {status ? status.label : 'في انتظار أول قراءة من المصدر'}
            </span>
          </div>

          <div className={`mc-team mc-team--away${flash === 'away' ? ' mc-team--flash' : ''}`}>
            <Crest logo={snapshot?.logos?.away ?? null} sourceName={match.away.sourceName} shortName={match.away.shortName} side="away" />
            <span className="mc-team-name">{match.away.name}</span>
            <span className="mc-team-tag">الضيف</span>
          </div>
        </header>

        {/* ── شريط الحالة: آخر قراءة + الاتصال (البندان 4 و11) ── */}
        <div className="mc-meta">
          <div className="mc-meta-facts">
            <span>المسابقة: <b>{match.competitionName}</b></span>
            <span>الملعب: <b dir="auto">{match.venue ?? 'غير متاح'}</b></span>
            <span>توقيت مكة: <b className="mc-num">{kickoffLabel(match.kickoffUtc, 'Asia/Riyadh')}</b></span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="mc-read" data-level={freshness.level}>
              <span aria-hidden="true">●</span>
              {snapshot?.readAt
                ? `${freshness.text} — ${formatInZone(snapshot.readAt, 'Africa/Cairo', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })}`
                : freshness.text}
            </span>
            <button type="button" className="mc-refresh" onClick={state.refreshNow} disabled={state.loading || !state.online}>
              {state.loading ? 'جارٍ القراءة…' : '↻ تحديث الآن'}
            </button>
          </div>
        </div>

        {!state.online && (
          <p className="mc-warning">
            لا يوجد اتصال — التحديث التلقائي متوقف. المعروض أدناه آخر قراءة مؤكدة بوقتها، وليست قراءة حالية.
          </p>
        )}
        {state.online && state.failureText && (
          <p className="mc-warning">
            تعذّرت القراءة الأخيرة ({state.failureCode}). تُعرض آخر قراءة مؤكدة بوقتها ولا تُمحى بيانات المباراة.
            {state.failureText ? ` — ${state.failureText}` : ''}
          </p>
        )}
        {state.simulated && (
          <p className="mc-simulated">
            <b>وضع المحاكاة:</b> الأرقام المعروضة توليدها محلي للاختبار والمعاينة وليست من مصدر بيانات.
            في البناء المنشور تُقرأ البيانات من خادم الموقع وحده.
          </p>
        )}

        {/* ── التبويبات الخمسة (البندان 5 و10) ── */}
        <MatchCenterTabs activeTab={activeTab} onChoose={state.chooseTab} />

        {tabIds.map(tabId => {
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
              <Panel match={match} snapshot={snapshot} status={status} now={state.now} />
            </div>
          );
        })}

        {/* بلا JavaScript: التبويبات لا تعمل، فإظهارها يوحي بواجهة ميتة. تُخفى
            القائمة وتُعرض اللوحات الخمس متتابعة كصفحة واحدة. */}
        <noscript>
          <style>{`.mc-tabs{display:none !important}.mc-panel[hidden]{display:block !important}`}</style>
          <p className="mc-note">
            JavaScript معطّل، فهذه لقطة ثابتة مؤرخة من الصفحة وليست قراءة حية: لا عدّاد ولا تحديث
            تلقائي، والأقسام الخمسة معروضة متتابعة بدل التبويبات.
          </p>
        </noscript>

        {/* ── التوثيق والمراجعة: أسماء المصادر وروابطها هنا وحدها (البند 12) ── */}
        <section className="mc-docs" aria-labelledby="mc-docs-title">
          <h2 id="mc-docs-title">التوثيق والمراجعة</h2>
          <p>{MATCH_CENTER_DOCUMENTATION.rightsNote}</p>
          <ul>
            {MATCH_CENTER_DOCUMENTATION.providers.map(provider => (
              <li key={provider.id}><b>{provider.label}</b> — {provider.note}</li>
            ))}
          </ul>
          {match.sourcesNote && <p>{match.sourcesNote}</p>}
          <p>
            هذه الصفحة دليل متابعة ومشاهدة رسمية ومُعرِّف تقني وسيط، وليست منصة إعادة بث.
            لا تُنسخ مقالات كاملة، ولا تُستضاف ملخصات أو بثوث، ولا تُعرض صور أو وجوه بلا إذن.
          </p>
        </section>
      </div>

      {/* ── بطاقة النتيجة المصغّرة على الجوال (البند 4) ──
          ثابتة أسفل الشاشة ولا تحجب المحتوى: للصفحة حشو سفلي يعادل ارتفاعها. */}
      <div className="mc-mini">
        <span className="mc-mini-teams">{match.home.shortName} × {match.away.shortName}</span>
        <span className="mc-mini-score" dir="ltr">
          {showScore && score ? `${score.home}–${score.away}` : status?.label ?? kickoffLabel(match.kickoffUtc, 'Africa/Cairo')}
        </span>
        <a className="mc-mini-link" href={`#mc-panel-${activeTab}`}>أعلى</a>
      </div>

      {/* ── منطقة الإعلان الحيّ (البند 10) ──
          `aria-live="polite"` للأهداف والتصحيحات والتنبيهات المهمة وحدها —
          **وليس للعدّاد الذي يتغير كل ثانية**. ولا صوت ولا اهتزاز ولا فيديو
          يعمل تلقائياً. */}
      <div className="mc-live-region" aria-live="polite" aria-atomic="false" role="status">
        {announcements.map((item: Announcement) => <span key={`${item.kind}-${item.key}`}>{item.message}. </span>)}
        {correction && <span>{correction.message}. </span>}
      </div>
    </section>
  );
}
