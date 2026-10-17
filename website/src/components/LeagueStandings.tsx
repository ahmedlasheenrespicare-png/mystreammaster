import { useEffect, useRef, useState } from 'react';
import snapshot from '../content/standings-snapshot.json';
import {
  STALE_BADGE_TEXT,
  STANDINGS_HEADINGS,
  STANDINGS_FIELDS,
  describeStandingsFailure,
  leagueStandingsByLeague,
  seasonText,
  standingsConfig,
  standingsInitialStatus,
  standingsNumber,
  standingsStaleStatus,
  standingsUpdatedStatus,
  standingsUrl,
  validateStandings,
} from '../lib/standings.mjs';
import type { StandingsTable } from '../lib/standings.mjs';

/* ==========================================================================
   قسم «جدول الترتيب» في صفحات هبوط البطولات
   --------------------------------------------------------------------------
   • القاعدة 3: الجدول كامل داخل HTML وقت البناء (من لقطة مراجَعة)، فلا يعتمد
     ظهوره على JavaScript. التحديث التلقائي طبقة فوقه لا بديل عنه.
   • لا رقم يُخترع: المركز والنقاط وفارق الأهداف تُؤخذ من المصدر كما هي، ولا
     يُعاد حساب معايير التعادل إطلاقاً. القيمة الناقصة تُعرض «غير متاح».
   • عند تعذّر قراءة أحدث: تبقى آخر قراءة مؤكدة مع وقتها ويظهر وسم
     «بيانات قديمة» — نفس قواعد مركز المباراة.
   ========================================================================== */

const REFRESH_MS = 60_000;
const ABORT_MS = 12_000;
const CACHE_STALE_HEADER = 'X-Standings-Cache';

function readCode(body: unknown, status: number): string {
  const code = (body as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && /^[A-Z0-9_]{3,40}$/.test(code)) return code;
  return `HTTP_${status}`;
}

export default function LeagueStandings({ league, title }: { league: string; title: string }) {
  const config = standingsConfig(league);
  const initial = (() => {
    try {
      return leagueStandingsByLeague(snapshot, league);
    } catch {
      return null;
    }
  })();

  const [data, setData] = useState<StandingsTable | null>(initial);
  const [state, setState] = useState<'snapshot' | 'updated' | 'stale'>('snapshot');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const latest = useRef<StandingsTable | null>(initial);
  const refreshNow = useRef<() => void>(() => {});

  useEffect(() => {
    latest.current = data;
  }, [data]);

  useEffect(() => {
    if (!config) return;
    let disposed = false;
    let working = false;
    let controller: AbortController | undefined;

    const mark = (code: string) => {
      if (disposed) return;
      setState('stale');
      setReason(code);
    };

    const refresh = async () => {
      if (disposed || working || document.hidden) return;
      if (!navigator.onLine) {
        mark('OFFLINE');
        return;
      }
      working = true;
      setBusy(true);
      controller = new AbortController();
      const signal = controller.signal;
      const timeout = window.setTimeout(() => controller?.abort(), ABORT_MS);
      try {
        const response = await fetch(standingsUrl(league), {
          signal,
          cache: 'no-store',
          credentials: 'omit',
          headers: { Accept: 'application/json' },
        });
        let body: unknown = null;
        try {
          body = await response.json();
        } catch {
          body = null;
        }
        if (!response.ok || (body as { ok?: unknown } | null)?.ok !== true) throw new Error(readCode(body, response.status));
        const next = validateStandings(body, league);
        if (!navigator.onLine) throw new Error('OFFLINE');
        const previous = latest.current;
        /* لا تُستبدل قراءة أحدث بقراءة أقدم — نفس حكم المُصيّر القائم */
        if (previous && (next.season < previous.season || Date.parse(next.fetchedAt) < Date.parse(previous.fetchedAt))) {
          throw new Error('OLDER_READING');
        }
        latest.current = next;
        if (disposed) return;
        setData(next);
        if (next.stale || response.headers.get(CACHE_STALE_HEADER) === 'STALE') {
          setState('stale');
          setReason('STALE');
        } else {
          setState('updated');
          setReason('');
        }
      } catch (error) {
        mark(typeof (error as Error)?.message === 'string' ? (error as Error).message : 'UNAVAILABLE');
      } finally {
        window.clearTimeout(timeout);
        working = false;
        if (!disposed) setBusy(false);
      }
    };

    const onResume = () => {
      if (!document.hidden) void refresh();
    };
    const onOnline = () => {
      setOnline(true);
      void refresh();
    };
    const onOffline = () => {
      setOnline(false);
      mark('OFFLINE');
    };

    void refresh();
    refreshNow.current = () => void refresh();
    const timer = window.setInterval(() => void refresh(), REFRESH_MS);
    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      disposed = true;
      controller?.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      refreshNow.current = () => {};
    };
    // البطولة ثابتة لكل صفحة (من بيانات المحتوى) — لا إعادة اشتراك عند كل رسم.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [league]);

  const id = `standings-${league.replace(/\./g, '-')}`;

  /* حالة دفاعية: بطولة أُعلن لها ترتيب بلا جدول في اللقطة — تُعرض «غير متاح»
     بصراحة بدل جدول وهمي أو فراغ صامت. */
  if (!config || !data) {
    return (
      <LeagueStandingsUnavailable
        title={title}
        text="جدول الترتيب لهذه البطولة غير متاح من مصدر موثّق بعد؛ لا يُستكمل من موقع آخر ولا يُخمَّن. يظهر الجدول هنا فور إثبات المصدر بمسبار موثّق."
      />
    );
  }

  const season = seasonText(data.season);
  const statusText = state === 'updated'
    ? standingsUpdatedStatus(data.fetchedAt)
    : state === 'stale'
      ? standingsStaleStatus(describeStandingsFailure(reason, online), data.fetchedAt)
      : standingsInitialStatus(data.fetchedAt);

  return (
    <section className="landing-section league-standings" aria-labelledby={`${id}-title`} data-league-standings={league}>
      <div className="ls-heading">
        <h2 id={`${id}-title`}>جدول الترتيب — {title}</h2>
        <p className="ls-meta">
          <span className="ls-phase">{config.phase}</span>
          <span className="ls-season">موسم <bdi dir="ltr">{season}</bdi></span>
          <span className="ls-badge" data-standings-badge hidden={state !== 'stale'}>{STALE_BADGE_TEXT}</span>
        </p>
      </div>

      <div className="ls-bar">
        <p className="ls-status" role="status" aria-live="polite" data-standings-status>{statusText}</p>
        <button type="button" className="ls-refresh" disabled={busy || !online} onClick={() => refreshNow.current()}>
          {busy ? 'جارٍ التحقق…' : '↻ تحديث الآن'}
        </button>
      </div>

      <div
        className="ls-scroll"
        role="region"
        tabIndex={0}
        aria-label={`جدول ${title}، قابل للتمرير`}
        aria-describedby={`${id}-hint`}
      >
        <table className="ls-table">
          <caption>{title} · موسم <bdi dir="ltr">{season}</bdi> · جدول الترتيب</caption>
          <thead>
            <tr>
              <th scope="col" className="ls-rank">المركز</th>
              <th scope="col" className="ls-team">الفريق</th>
              {STANDINGS_HEADINGS.map((heading, index) => (
                <th key={heading} scope="col" className={index === 0 ? 'ls-points' : undefined}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody data-standings-rows>
            {data.entries.map((row) => (
              <tr key={row.teamId}>
                <td className="ls-rank"><bdi dir="ltr">{row.rank}</bdi></td>
                <th scope="row" className="ls-team"><bdi dir="auto">{row.name}</bdi></th>
                {STANDINGS_FIELDS.map((field) => (
                  <td key={field} className={field === 'points' ? 'ls-points' : undefined}>
                    <bdi dir="ltr">{standingsNumber(row[field], field)}</bdi>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="ls-hint" id={`${id}-hint`}>
        جدول كامل من <bdi dir="ltr">{config.count}</bdi> فريقاً. مرّر داخل الجدول لرؤية بقية الصفوف والأعمدة، ويمكن تركيزه بلوحة المفاتيح.
      </p>
    </section>
  );
}

/** تُعرض حين لا يثبت المصدر — نص صريح بدل جدول مخمَّن */
export function LeagueStandingsUnavailable({ title, text }: { title: string; text: string }) {
  return (
    <section className="landing-section league-standings league-standings--unavailable" aria-labelledby="standings-unavailable-title">
      <h2 id="standings-unavailable-title">جدول الترتيب — {title}</h2>
      <p className="landing-notice">{text}</p>
    </section>
  );
}
