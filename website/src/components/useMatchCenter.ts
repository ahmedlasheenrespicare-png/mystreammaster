import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MATCH_CENTER_DIAGNOSTICS,
  countdownParts,
  defaultTab,
  detectScoreCorrection,
  freshnessLabel,
  mergeReads,
  nextTabId,
  planAnnouncements,
  pollIntervalFor,
  pollingAllowed,
  resolveTab,
  shouldStopPolling,
  stampCompletion,
  type Announcement,
  type CountdownParts,
  type Freshness,
  type MatchDefinition,
  type MatchRead,
  type MatchSnapshot,
  type MatchStatus,
  type ReadStore,
  type ScoreCorrection,
  type SettledResult,
  type TabId,
} from '../lib/match-center.mjs';
import {
  MOCK_PROVIDER_ID,
  SERVER_PROVIDER_ID,
  describeTransportCode,
  resolveScenario,
  fetchMatchSnapshot,
  settle,
  type SettledSnapshot,
} from '../lib/match-center-transport.mjs';

/* ==========================================================================
   طبقة البيانات المشتركة لمركز المباراة
   --------------------------------------------------------------------------
   البند 11: «طبقة بيانات واحدة مشتركة لكل مباراة، لا طلب لكل تبويب». لذلك
   هذه الخطّاف يجلب **مرة واحدة في الدورة** ويوزّع اللقطة على التبويبات
   الخمسة كلها؛ والتبويبات مكوّنات عرض لا تعرف `fetch`.

   ما لا تفعله هذه الطبقة عمداً:
   • لا تقرّر حداثة ولا تدمج قراءات — `mergeReads` في طبقة العقد، وتعريف
     الحداثة واحد في المشروع كله.
   • لا تشتق الحالة من مرور الوقت — البند 6: وصول العدّاد إلى الصفر لا يقلب
     المباراة إلى «مباشر». الحالة تأتي من `status` وحده.
   • لا تعلن هدفاً بنفسها — `planAnnouncements` تقرّر، وهنا تُحفظ البصمات.
========================================================================== */

/** لا بيانات بعد: القيمة التي تُرسم في HTML الثابت قبل الترطيب. */
const FALLBACK_POLL_MS = 300_000;

/* البند 7(ب): منع تكرار الإشعار عند إعادة تحميل الصفحة. تُحفظ بصمات الأحداث
   المعلَنة في sessionStorage فتعود بعد إعادة التحميل، ولا يُعاد إعلان هدف. */
function storageKey(matchId: string): string {
  return `sm-match-center-keys:${matchId}`;
}

function restoreKnownKeys(matchId: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(storageKey(matchId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    /* التخزين قد يتعذر (تصفح خاص، حصة ممتلئة) — نبدأ ببصمات فارغة */
    return [];
  }
}

function persistKnownKeys(matchId: string, keys: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    /* تُحفظ آخر 200 بصمة فقط: مباراة فيها مئات الأحداث لا تملأ الحصة. */
    window.sessionStorage.setItem(storageKey(matchId), JSON.stringify(keys.slice(-200)));
  } catch {
    /* الفشل هنا يعني احتمال إعادة إعلان هدف بعد تحديث الصفحة — وهو أخف من
       كسر الصفحة كلها بخطأ. */
  }
}

/** جسر نتيجة النقل إلى الشكل الذي تقرأه `mergeReads` (الرمز في `code`). */
function toSettledResult(settled: SettledSnapshot): SettledResult {
  return settled.status === 'fulfilled'
    ? { status: 'fulfilled', value: { data: settled.value.data, cache: settled.value.cache } }
    : { status: 'rejected', code: settled.code };
}

export interface UseMatchCenterOptions {
  /**
   * المزوّد. الافتراضي خادمنا، وفي بيئة التطوير وحدها تعمل المحاكاة لأن
   * `match-center.php` لا يعمل على خادم vite. الحارس `allowMock` صريح ولا
   * يعتمد على متغيّر البناء وحده.
   */
  provider?: string;
  allowMock?: boolean;
}

export interface MatchCenterState {
  match: MatchDefinition;
  /** آخر قراءة مؤكدة + فشلها الخاص (البند 11). */
  read: MatchRead | null;
  snapshot: MatchSnapshot | null;
  status: MatchStatus | null;
  /** البند 11: `fresh` وحدها تُعرض قراءةً حالية. */
  freshness: Freshness;
  countdown: CountdownParts | null;
  now: number;
  online: boolean;
  hidden: boolean;
  loading: boolean;
  hasLoaded: boolean;
  /** المحاكاة موسومة دائماً حتى لا تُقرأ أرقامها نتائج حقيقية. */
  simulated: boolean;
  /** نص التحذير العربي، أو `null` حين لا عطل (وقراءة أقدم ليست عطلاً). */
  failureText: string | null;
  /** رمز العطل الخام — للتفاصيل والاختبارات. */
  failureCode: string | null;
  announcements: Announcement[];
  correction: ScoreCorrection | null;
  activeTab: TabId;
  chooseTab: (tab: TabId) => void;
  moveTab: (direction: 'next' | 'previous') => void;
  refreshNow: () => void;
  clearAnnouncements: () => void;
}

/* أداة معاينة واختبار يدوي **لبيئة التطوير وحدها**: `?mockScenario=finished`.

   لماذا تُقيَّد: المباريات الثلاث غداً، فبلا هذا المفتاح لا تُظهر المعاينة إلا
   «لم تبدأ»، ولا سبيل إلى فحص الحالات الأخرى التي يطلبها البند 14 بصرياً.
   ولماذا هي آمنة: تُحترم فقط حين `allowMock` صحيح (وهو `import.meta.env.DEV`)،
   وتُطابَق ضد السيناريوهات المسجّلة فاسمٌ مجهول يُتجاهل، وفي البناء المنشور
   يُحذف هذا الفرع مع المزوّد المحاكي كله — فلا يستطيع زائر أن يفرض حالة
   مختلَقة على صفحة حقيقية. */
function devScenario(allowMock: boolean): string | undefined {
  if (!allowMock || typeof window === 'undefined') return undefined;
  const wanted = new URLSearchParams(window.location.search).get('mockScenario');
  const scenario = wanted ? resolveScenario(wanted) : null;
  return scenario ? scenario.id : undefined;
}

export function useMatchCenter(match: MatchDefinition, options: UseMatchCenterOptions = {}): MatchCenterState {
  /* `import.meta.env.DEV` بوصول مباشر لا اختياري (`?.`): vite يستبدل الوصول
     المباشر حرفياً بـ`false` في البناء المنشور، فيحذف Rollup الفرع كله. بصيغة
     `?.` يبقى الفرع حياً بعلمٍ كاذب — سلوكه صحيح لكنه شحنٌ لكود ميت. */
  const isDev = import.meta.env.DEV === true;
  const provider = options.provider ?? (isDev ? MOCK_PROVIDER_ID : SERVER_PROVIDER_ID);
  const allowMock = options.allowMock ?? isDev;

  /* `0` قبل التركيب: الرسم على الخادم لا يقرأ ساعة، فلا يختلف HTML المُولَّد
     عن أول رسم في المتصفح (البند 13: لقطة مؤرخة لا تدّعي أنها قراءة حية). */
  const [now, setNow] = useState(0);
  const initialArchiveRead: MatchRead | null = match.archivedSnapshot ? {
    data: match.archivedSnapshot,
    failure: null,
    cache: 'HIT',
    readAt: match.archivedSnapshot.readAt ?? undefined,
  } : null;
  const initialStore: ReadStore = initialArchiveRead ? { [match.id]: initialArchiveRead } : {};
  const [store, setStore] = useState<ReadStore>(initialStore);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(Boolean(initialArchiveRead));
  const [online, setOnline] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [correction, setCorrection] = useState<ScoreCorrection | null>(null);
  /* البند 5: اختيار الزائر يُحفظ ولا يُنتزع منه عند تحديث أو عند هدف. */
  const [userTab, setUserTab] = useState<TabId | null>(null);

  /* نفس السبب: شرط ثابت الكذب في الإنتاج يحذف الاستدعاء — ومعه قراءة
     `location.search` — فلا يبقى في الحزمة المنشورة ما يقرأ رابط الزائر. */
  const scenario = useMemo(
    () => (import.meta.env.DEV === true ? devScenario(allowMock) : undefined),
    [allowMock],
  );
  const storeRef = useRef<ReadStore>(initialStore);
  const knownKeysRef = useRef<string[]>([]);
  const seededRef = useRef(false);
  const refreshRef = useRef<() => void>(() => {});

  const read = store[match.id] ?? null;
  const snapshot = read?.data ?? null;
  const status = snapshot?.status ?? null;
  const phase = status?.phase ?? 'pre';

  /* ── الساعة: ثانية واحدة قبل البداية، و15 ثانية بعدها ─────────────────
     العدّاد يحتاج ثوانى؛ أما بعد البداية فلا شيء يُعرض بالثانية، وتقليص
     التكرار يمنع إعادة رسم الرادار والجداول كل ثانية بلا سبب.
     البند 10: العدّاد **ليس** في منطقة `aria-live`، فلا يُقرأ كل ثانية. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tick = () => setNow(Date.now());
    tick();
    const step = phase === 'pre' ? 1_000 : 15_000;
    const timer = window.setInterval(tick, step);
    return () => window.clearInterval(timer);
  }, [phase]);

  /* ── الاتصال والتبويب المخفي (البند 11) ───────────────────────────── */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const sync = () => {
      setHidden(document.hidden);
      setOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  /* ── تطبيق نتيجة واحدة: الدمج، الختم، الإعلان ─────────────────────── */
  const applyResult = useCallback((settled: SettledSnapshot, at: number) => {
    const previous = storeRef.current[match.id] ?? null;
    const previousData = previous?.data ?? null;

    /* البند 8: الختم يسجّل لحظة النهاية المؤكدة حتى تُقاس عليها نافذة التوقف،
       وإلا قيس من `readAt` الذي يتجدد مع كل محاولة فلا يتوقف الطلب أبداً. */
    const stamped: SettledResult = settled.status === 'fulfilled'
      ? {
        status: 'fulfilled',
        value: {
          data: {
            ...settled.value.data,
            status: stampCompletion(previousData?.status ?? null, settled.value.data.status, settled.value.data.readAt)
              ?? settled.value.data.status,
          },
          cache: settled.value.cache,
        },
      }
      : toSettledResult(settled);

    const next = mergeReads(storeRef.current, { [match.id]: stamped }, at);
    storeRef.current = next;
    setStore(next);
    setHasLoaded(true);

    const nextData = next[match.id]?.data ?? null;
    if (!nextData || nextData === previousData) return;

    /* البند 7: أول قراءة في الجلسة تُبصم الموجود بلا إعلان **فقط إن لم تكن
       لدينا بصمات محفوظة**. فإن حُفظت من قبل (تحديث صفحة أثناء المباراة) فأي
       هدف جديد فعلاً يُعلن — والصمت هنا يفوّت هدفاً حقيقياً. */
    if (!seededRef.current) {
      const restored = restoreKnownKeys(match.id);
      knownKeysRef.current = restored;
      seededRef.current = true;
      const plan = planAnnouncements({
        matchId: match.id,
        previousEvents: [],
        nextEvents: nextData.events,
        knownKeys: restored,
        silentSeed: restored.length === 0,
      });
      knownKeysRef.current = plan.knownKeys;
      persistKnownKeys(match.id, plan.knownKeys);
      if (plan.announce.length) setAnnouncements(current => [...current, ...plan.announce]);
      return;
    }

    const plan = planAnnouncements({
      matchId: match.id,
      previousEvents: previousData?.events ?? [],
      nextEvents: nextData.events,
      knownKeys: knownKeysRef.current,
    });
    knownKeysRef.current = plan.knownKeys;
    persistKnownKeys(match.id, plan.knownKeys);
    if (plan.announce.length) setAnnouncements(current => [...current, ...plan.announce]);

    /* البند 7: تصحيح النتيجة إشارة مستقلة عن الأحداث — تغيّرٌ لا تفسّره
       الأهداف المعلَنة. تُعرض ولا تُخزَّن في قائمة الأهداف لأن `Announcement`
       يشترط حدثاً حقيقياً، وتصحيح النتيجة ليس حدثاً في الملعب. */
    const detected = detectScoreCorrection(previousData?.score ?? null, nextData.score, plan.announce);
    setCorrection(detected);
  }, [match.id]);

  /* ── دورة الطلب الواحدة ─────────────────────────────────────────────── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (match.archivedSnapshot) {
      const archivedRead: MatchRead = {
        data: match.archivedSnapshot,
        failure: null,
        cache: 'HIT',
        readAt: match.archivedSnapshot.readAt ?? undefined,
      };
      const next = { ...storeRef.current, [match.id]: archivedRead };
      storeRef.current = next;
      setStore(next);
      setHasLoaded(true);
      setLoading(false);
      return;
    }
    let disposed = false;
    let controller: AbortController | null = null;
    let timer: number | undefined;

    const schedule = () => {
      if (disposed) return;
      const current = storeRef.current[match.id] ?? null;
      /* البند 8: تخفيف الطلبات بعد النهاية، ثم التوقف بعد نافذة الاستقرار. */
      if (shouldStopPolling(current?.data?.status ?? null, current?.data ?? null, Date.now())) return;
      const interval = pollIntervalFor(current?.data?.status ?? null, 'status') ?? FALLBACK_POLL_MS;
      timer = window.setTimeout(() => { void run(); }, interval);
    };

    const run = async () => {
      if (disposed) return;
      /* البند 11: إيقاف الطلب حين تكون الصفحة مخفية أو بلا اتصال. */
      const allowed = pollingAllowed({
        hidden: typeof document === 'undefined' ? false : document.hidden,
        online: typeof navigator === 'undefined' ? true : navigator.onLine,
      });
      if (!allowed) { schedule(); return; }

      controller = new AbortController();
      setLoading(true);
      const settled = await settle(fetchMatchSnapshot(match, {
        provider,
        allowMock,
        scenario,
        signal: controller.signal,
        now: Date.now(),
      }));
      controller = null;
      if (disposed) return;
      setLoading(false);
      if (settled.status === 'rejected' && settled.code === 'ABORTED') { schedule(); return; }
      applyResult(settled, Date.now());
      schedule();
    };

    refreshRef.current = () => {
      if (timer) window.clearTimeout(timer);
      void run();
    };
    void run();

    return () => {
      disposed = true;
      refreshRef.current = () => {};
      controller?.abort();
      if (timer) window.clearTimeout(timer);
    };
  }, [match, provider, allowMock, scenario, applyResult]);

  /* البند 11: «الاستئناف عند العودة أو عودة الاتصال». أول تشغيل يتولاه
     الأثر السابق، فتُتخطى أول دورة هنا حتى لا يُطلب مرتين عند التركيب. */
  const firstResume = useRef(true);
  useEffect(() => {
    if (firstResume.current) { firstResume.current = false; return; }
    if (!hidden && online) refreshRef.current();
  }, [hidden, online]);

  /* ── التبويبات (البندان 5 و10) ────────────────────────────────────── */
  const activeTab = resolveTab(status, userTab);
  const chooseTab = useCallback((tab: TabId) => { setUserTab(tab); }, []);
  /* البند 10: التنقّل بالأسهم داخل `tablist`. في RTL السهم الأيسر = التالي. */
  const moveTab = useCallback((direction: 'next' | 'previous') => {
    setUserTab(current => nextTabId(current ?? activeTab, direction));
  }, [activeTab]);

  const refreshNow = useCallback(() => { refreshRef.current(); }, []);
  const clearAnnouncements = useCallback(() => { setAnnouncements([]); setCorrection(null); }, []);

  /* ── المشتقات المعروضة ─────────────────────────────────────────────── */
  /* البند 13: اللقطة الثابتة بلا JavaScript **لا تدّعي أنها قراءة حية**، ولا
     تدّعي عطلاً لم يحدث. قبل أول قراءة لا يوجد `readAt` أصلاً، وتمريره إلى
     `freshnessLabel` كان يُخرج «تعذر التحديث» في HTML المُولَّد — تحذير كاذب
     في الصفحة المنشورة. فتُعرض حالة انتظار صريحة حتى تصل قراءة. */
  const freshness = useMemo<Freshness>(() => {
    if (!hasLoaded || !now) return { text: 'في انتظار أول قراءة من المصدر', level: 'invalid' };
    return freshnessLabel({
      readAt: snapshot?.readAt ?? null,
      cache: read?.cache,
      now,
      failed: Boolean(read?.failure),
    });
  }, [hasLoaded, now, snapshot, read]);

  const countdown = useMemo(
    () => (now ? countdownParts(match.kickoffUtc, now) : null),
    [match.kickoffUtc, now],
  );

  /* قراءة أقدم من المحفوظة ليست عطلاً يُعلن: البيانات المعروضة صحيحة وأقدم
     فحسب، والتحذير منها يقلق الزائر بلا سبب. أما باقي الرموز فتُترجم من
     جدولي التشخيص — بيانات العقد أولاً، ثم أخطاء النقل. */
  const failureCode = read?.failure ?? null;
  const failureText = useMemo(() => {
    if (!failureCode || failureCode === 'STALE_READ') return null;
    const table = MATCH_CENTER_DIAGNOSTICS as Record<string, string>;
    return table[failureCode] ?? describeTransportCode(failureCode);
  }, [failureCode]);

  return {
    match,
    read,
    snapshot,
    status,
    freshness,
    countdown,
    now,
    online,
    hidden,
    loading,
    hasLoaded,
    simulated: snapshot?.provider === MOCK_PROVIDER_ID,
    failureText,
    failureCode,
    announcements,
    correction,
    activeTab,
    chooseTab,
    moveTab,
    refreshNow,
    clearAnnouncements,
  };
}

/** التبويب الافتراضي لحالة بعينها — يُستخدم في الاختبارات والرسم الثابت. */
export function initialTab(status: MatchStatus | null): TabId {
  return defaultTab(status);
}

export type { Announcement, CountdownParts, Freshness, MatchRead, MatchSnapshot, ScoreCorrection, TabId };
