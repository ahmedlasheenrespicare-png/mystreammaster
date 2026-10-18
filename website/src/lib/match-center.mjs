/* ==========================================================================
   مركز المباراة (Match Center) — عقد البيانات المشترك
   --------------------------------------------------------------------------
   لماذا هذا الملف؟
   • قاعدة المشروع في البند 11: «طبقة بيانات مشتركة لكل مباراة؛ لا طلب مستقل
     لكل تبويب». هذا الملف هو تلك الطبقة: **منطق خالص بلا أي شبكة**، تصلح
     للاستيراد من React ومن سكربتات الاختبار في Node معاً — نفس عرف
     `matches.mjs` و`navigation.mjs` و`site.mjs` القائم في المشروع.
   • كل قرار سلوكي خطير في البنود 6–9 و11 مُنفَّذ هنا كدالة قابلة للاختبار،
     لا كامتداد داخل مكوّن. فأي انحراف يُكشف بالاختبار لا بالعين.

   المبادئ الأربعة التي يفرضها هذا العقد:
   1) **الحالة من البيانات وحدها، لا من الساعة.** وصول العدّاد إلى الصفر لا
      يصنع «مباشر» (البند 6). لا دالة هنا تقرأ `Date.now()` لتقرير الحالة.
   2) **الغياب `null` وليس صفراً.** لا نتيجة 0–0 قبل البداية، ولا تقييم مفقود
      يُعرض 0، ولا محور رادار ناقص يُستكمل بصفر (البند 6، 8، 9). وهو عرف
      مطبّق أصلاً في `fixture-lineups-snapshot.json`: «His rating is null, not zero».
   3) **لا خلط بين مزوّدين.** كل حمولة تحمل `provider`، والمقارنة ترفض أرقام
      مزوّدين مختلفين في لوحة واحدة (البند 2).
   4) **القراءة الأقدم لا تستبدل الأحدث** (البند 11)، وفشل مباراة لا يمسح
      الأخريين (البند 3، 11).
========================================================================== */

/* ───────────────────────── حالات المباراة ───────────────────────── */

/* البند 7: «التأجيل والتأخير والتوقف والإلغاء حالات مستقلة». لذلك لا تُطوى
   في حالة `other` واحدة كما يفعل `matches.mjs` في صفحة المواعيد — هنا لكل
   حالة رمزها ونصها وسلوكها الخاص في التحديث والتبويب الافتراضي. */
export const MATCH_CODES = [
  'scheduled',   // لم تبدأ
  'live',        // جارية
  'halftime',    // استراحة بين الشوطين
  'finished',    // انتهت
  'postponed',   // مؤجلة
  'delayed',     // متأخرة (تأخير بدء)
  'suspended',   // متوقفة مؤقتاً
  'abandoned',   // أُلغيت بعد بدايتها
  'canceled',    // ملغاة
  'unknown',     // لم يحدد المصدر حالة
];

/* النصوص العربية المعتمدة — مصدر واحد حتى لا يختلف wording بين التبويبات. */
export const STATUS_LABELS = {
  scheduled: 'لم تبدأ',
  live: 'مباشر',
  halftime: 'استراحة',
  finished: 'انتهت',
  postponed: 'مؤجلة',
  delayed: 'متأخرة',
  suspended: 'متوقفة',
  abandoned: 'أُلغيت بعد بدايتها',
  canceled: 'ملغاة',
  unknown: 'الحالة غير محددة من المصدر',
};

/* البند 6 و7 و8: ثلاث مراحل سلوكية كبرى تُشتق منها معدلات التحديث والتبويب
   الافتراضي وسلوك العدّاد. */
export const PHASES = { scheduled: 'pre', live: 'live', halftime: 'live', finished: 'post', postponed: 'terminal', delayed: 'pre', suspended: 'live', abandoned: 'post', canceled: 'terminal', unknown: 'pre' };

/* الحالات التي تُعدّ «انتهت فعلياً» لأغراض سجل المواجهات (البند 8). */
const COMPLETED_CODES = new Set(['finished', 'abandoned']);

/* خرائط مطابقة من مفردات المزوّد إلى رموزنا. مفصولة لكل مزوّد عمداً:
   البند 2 يمنع خلط أرقام مزوّدين، وأولى خطوات ذلك ألا يُخلط **مفرداتهما**.
   المزوّدان المعروفان للمشروع: ESPN (مربوط اليوم في scoreboard.php) و
   API-Football (مقترح، غير مفعّل). وكلاهما قابل للاستبدال — القرار المعتمد
   هو «طبقة مصدر قابلة للتبديل»، فلا يُعتمد أيهما هنا. */
const ESPN_STATE_MAP = {
  STATUS_SCHEDULED: 'scheduled', STATUS_HALFTIME: 'halftime', STATUS_END_OF_FIRST_HALF: 'halftime',
  STATUS_IN_PLAY: 'live', STATUS_IN_PROGRESS: 'live', STATUS_SECOND_HALF: 'live',
  STATUS_FIRST_HALF: 'live', STATUS_EXTRA_TIME: 'live', STATUS_PENALTIES: 'live',
  STATUS_FULL_TIME: 'finished', STATUS_FINAL: 'finished', STATUS_AWARDED: 'finished', STATUS_FORFEIT: 'finished',
  STATUS_POSTPONED: 'postponed', STATUS_CANCELED: 'canceled', STATUS_CANCELLED: 'canceled',
  STATUS_SUSPENDED: 'suspended', STATUS_DELAYED: 'delayed', STATUS_ABANDONED: 'abandoned',
  /* مباراة نُقل موعدها لا تُلعب في الوقت المنشور، فحالتها «مؤجلة» حتى يعلن
     المصدر موعداً جديداً. وهو نفس المعنى الذي تعرضه صفحة المواعيد القائمة
     بنص «تغيّر موعد المباراة» في `matches.mjs`. */
  STATUS_RESCHEDULED: 'postponed',
};
const API_FOOTBALL_STATE_MAP = {
  NS: 'scheduled', TBD: 'scheduled', '1H': 'live', HT: 'halftime', '2H': 'live',
  ET: 'live', BT: 'live', P: 'live', SUSP: 'suspended', INT: 'suspended',
  FT: 'finished', AET: 'finished', PEN: 'finished', PST: 'postponed',
  CANC: 'canceled', ABD: 'abandoned', AWD: 'finished', WO: 'finished',
};

/* ───────────────────── تطبيع الحالة من المصدر ───────────────────── */

/* البند 6 (فقرة أخيرة) هو السبب في أن هذه الدالة **لا تقبل `now` إطلاقاً**:
   لا يمكن للعدّاد أن يدفع المباراة إلى «مباشر». الحالة تأتي من حقل المصدر
   فقط. إن قال المصدر «لم تبدأ» وقد مضى الموعد، تبقى `scheduled` وتُترك
   للواجهة أن تُظهر ملاحظة «تأخرت البداية حسب المصدر» — بلا اختراع حالة. */
export function normalizeStatus(raw, provider = 'unknown') {
  const type = raw?.type ?? null;
  /* كل مزوّد له جدول مفرداته **وحده**. البند 2 يمنع خلط مزوّدين، وأولى خطوات
     ذلك ألا تُقرأ مفردات أحدهما بجدول الآخر — فـ`STATUS_HALFTIME` ليست رمزاً
     صالحاً لدى API-Football، وقراءتها كاستراحة خلطٌ لا تخمين بريء. */
  const map = provider === 'apifootball' ? API_FOOTBALL_STATE_MAP : provider === 'espn' ? ESPN_STATE_MAP : null;
  const candidates = [
    type?.name, raw?.code, raw?.status, raw?.short, raw?.long, type?.shortDetail,
  ].map(value => (typeof value === 'string' ? value.trim() : '')).filter(Boolean);

  let code = 'unknown';
  for (const candidate of candidates) {
    const key = candidate.toUpperCase().replaceAll(' ', '_').replaceAll('-', '_');
    if (map && map[key]) { code = map[key]; break; }
  }

  /* إشارة بنيوية من المزوّد نفسه، لا من مفردات مزوّد آخر: ESPN يرسل
     `type.state` بقيمة pre/in/post بجانب الاسم التفصيلي. تُستخدم فقط إن لم
     يطابق الاسم الجدول، لأن الاسم أدق (يميّز الاستراحة والتأجيل). */
  if (code === 'unknown' && provider === 'espn') {
    const state = typeof type?.state === 'string' ? type.state.trim().toLowerCase() : '';
    if (state === 'in') code = 'live';
    else if (state === 'post') code = 'finished';
    else if (state === 'pre') code = 'scheduled';
  }

  /* مطابقة بالكلمات المفتاحية — **فقط حين لا يُعرف المزوّد**. إن أُعلن مزوّد
     ولم يطابق رمزه جدولَه، فالنتيجة `unknown` وتعرض الواجهة نص المصدر كما هو
     بدل تخمين حالة. هذا هو الفرق بين «غير متاح» صادق وحالة مختلَقة. */
  if (code === 'unknown' && !map) {
    for (const candidate of candidates) {
      const lowered = candidate.toLowerCase();
      if (/postpon|reschedul/.test(lowered)) { code = 'postponed'; break; }
      if (/cancel/.test(lowered)) { code = 'canceled'; break; }
      if (/abandon/.test(lowered)) { code = 'abandoned'; break; }
      if (/suspend|interrupt/.test(lowered)) { code = 'suspended'; break; }
      if (/delay/.test(lowered)) { code = 'delayed'; break; }
      if (/half\s*time|halftime|\bht\b/.test(lowered)) { code = 'halftime'; break; }
      if (/full\s*time|match\s*finished|\bft\b|final/.test(lowered)) { code = 'finished'; break; }
      if (/\bin\s*play|in\s*progress|\blive\b|first\s*half|second\s*half/.test(lowered)) { code = 'live'; break; }
    }
  }

  /* البند 7: «لا تُعلن النهاية لمجرد مرور 90 دقيقة». علامة `completed` تُقبل
     من المصدر فقط، ولا تُشتق من الوقت المنقضي. */
  const completedFlag = raw?.type?.completed === true || raw?.completed === true;
  if (code === 'unknown' && completedFlag) code = 'finished';
  if (code === 'live' && completedFlag) code = 'finished';

  /* الوقت المعروض يأتي من المصدر حرفياً (displayClock / elapsed) — لا يُحسب
     محلياً من موعد البداية، لأن ذلك يخالف «الوقت المتاح من المصدر». */
  const clock = firstString(raw?.displayClock, type?.detail, raw?.clock, raw?.elapsedLabel);
  const elapsedRaw = firstNumber(raw?.elapsed, raw?.type?.elapsed, raw?.minutesElapsed);
  const period = firstNumber(raw?.period, raw?.type?.period);

  return {
    code,
    label: STATUS_LABELS[code],
    phase: PHASES[code],
    completed: COMPLETED_CODES.has(code) || (code === 'finished' && completedFlag),
    clock,
    elapsed: elapsedRaw,
    period,
    /* البند 6 و8: «لم يُعلن بعد» و«غير متاح» نصّان مختلفان. `detail` يحمل ما
       أرسله المصدر إن كان نصاً، وإلا يبقى null فتعرض الواجهة النص المناسب. */
    detail: clock || firstString(raw?.type?.shortDetail, raw?.detail),
  };
}

/* ────────────────────── النتيجة: لا 0–0 وهمية ────────────────────── */

/* البند 6: «عدم عرض 0–0 كأنها نتيجة مؤكدة قبل الانطلاق». لذلك النتيجة
   `null` كلياً ما لم تؤكد البيانات حالة بدأت فيها المباراة. الفرق بين
   `null` (غير متاح) و`0` (صفر حقيقي) محفوظ في كل الطبقات — وهو ما يختبره
   البند 14 صراحة («بيانات ناقصة وصفر حقيقي»). */
export function deriveScore(status, rawHome, rawAway) {
  if (!status || !['live', 'halftime', 'finished', 'suspended', 'abandoned'].includes(status.code)) return null;
  const home = firstNumber(rawHome?.score, rawHome?.goals, rawHome);
  const away = firstNumber(rawAway?.score, rawAway?.goals, rawAway);
  /* صفر حقيقي مقبول؛ غير المتاح يبقى null ولا يتحول صفراً. */
  /* A displayable score is an atomic home/away pair. Never leak a partial
     number to the pitch or mobile summary; zero remains a valid value. */
  if (!isValidScore({ home, away })) return null;
  return { home, away };
}

/* ─────────────────── التوقيت: مناطق IANA لا إزاحة ثابتة ─────────────────── */

/* البند 1: «احسب العرض المحلي باستخدام Africa/Cairo وAsia/Riyadh، وليس بإضافة
   ثلاث ساعات ثابتة طوال السنة». القياس أثبت أن القاهرة GMT+03:00 في
   2026-10-17 وGMT+02:00 في 2026-11-05 — فأي إزاحة ثابتة تخطئ بعد 12 يوماً.
   لذلك كل عرض يمر بـIntl، ولا يوجد في المشروع `+ 3 * 3600 * 1000`. */
export const MATCH_ZONES = ['Asia/Riyadh', 'Africa/Cairo'];

export function formatInZone(iso, zone, options = {}) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) throw new Error(`Invalid date: ${iso}`);
  return new Intl.DateTimeFormat('ar-EG', { timeZone: zone, ...options }).format(date);
}

export function kickoffLabel(iso, zone) {
  return formatInZone(iso, zone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}

export function dayLabelInZone(iso, zone) {
  return formatInZone(iso, zone, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/* البند 4 و6: العدّاد للعرض فقط. يعيد `null` بعد البداية حتى لا تعرض الواجهة
   عدّاداً سالباً، ولا يُستخدم أبداً لتقرير الحالة (انظر normalizeStatus). */
export function countdownParts(kickoffUtc, now) {
  const start = Date.parse(kickoffUtc);
  if (!Number.isFinite(start)) return null;
  const diff = start - now;
  if (diff <= 0) return { started: true, days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
  const seconds = Math.floor(diff / 1000);
  return {
    started: false,
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
    totalMs: diff,
  };
}

/* البند 11: «عدم كتابة «محدث الآن» لمجرد إعادة المحاولة أو استلام نسخة
   مخزنة قديمة». التسمية تُشتق من `readAt` وحالة الكاش، لا من لحظة الطلب. */
/* حدّ «محدَّث الآن»: 75 ثانية تغطي دورة التحديث (60 ث) وعمر كاش الخادم
   (45 ث في `scoreboard.php`) معاً. وما زاد على ثلاث دقائق يُعرض قديماً. */
export const FRESH_NOW_SECONDS = 75;
export const FRESH_AGING_SECONDS = 180;

/* البند 11: «عدم كتابة «محدَّث الآن» لمجرد إعادة المحاولة أو استلام نسخة
   مخزنة قديمة». التسمية تُشتق من `readAt` وحالة الكاش، لا من لحظة الطلب.

   تُرجع `level` بدل علم منطقي غامض، لأن الواجهة تحتاج أن تفرّق أربع حالات
   لا اثنتين: طازجة، تتقادم، مخزّنة/قديمة، ومتعذّرة أو غير صالحة. و`fresh`
   وحدها هي التي يجوز عرضها على أنها قراءة حالية. */
export function freshnessLabel({ readAt, cache = 'MISS', now, failed = false }) {
  if (failed || !readAt) return { text: 'تعذر التحديث — تُعرض آخر قراءة مؤكدة', level: 'failed' };
  /* وقت قراءة مستقبلي أو تالف ليس حداثة. بلا هذا الفحص كان `Math.max(0, …)`
     يحوّل العمر السالب إلى صفر فيُعرض «محدَّث الآن» لقراءة مرفوضة أصلاً —
     وهو تناقض مع `mergeReads` التي ترفضها. */
  if (!isTrustworthyReadAt(readAt, now)) return { text: 'وقت القراءة الوارد غير صالح — تُعرض آخر قراءة مؤكدة', level: 'invalid' };
  const age = Math.max(0, Math.round((now - Date.parse(readAt)) / 1000));
  if (cache === 'STALE') return { text: `نسخة مخزّنة على الخادم (عمرها ${describeAge(age)}) — المصدر لا يستجيب`, level: 'stale' };
  if (age <= FRESH_NOW_SECONDS) return { text: 'محدَّث الآن', level: 'fresh' };
  return { text: `آخر قراءة قبل ${describeAge(age)}`, level: age <= FRESH_AGING_SECONDS ? 'aging' : 'stale' };
}

function describeAge(seconds) {
  if (seconds < 60) return `${seconds} ثانية`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} دقيقة`;
  return `${Math.round(minutes / 60)} ساعة`;
}

/* ───────────── رفض الأقدم + عزل فشل المباريات (البند 11) ───────────── */

/* رموز التشخيص الخاصة بطبقة مركز المباراة. تُعرض للزائر بالعربية، وتبقى
   منفصلة عن `DIAGNOSTIC_LABELS` في `matches.mjs` لأن هذه الأعطال تخص قراءة
   مباراة واحدة لا جدول بطولة كامل. */
export const MATCH_CENTER_DIAGNOSTICS = {
  MISSING_READ_AT: 'الاستجابة لا تحمل وقت قراءة، فلا يمكن التأكد من حداثتها',
  FUTURE_READ_AT: 'وقت القراءة الوارد من المصدر في المستقبل (انحراف في ساعته)',
  STALE_READ: 'وصلت قراءة أقدم من المحفوظة فتُركت بلا استخدام',
  INVALID_METRICS: 'بنية أرقام المقارنة الواردة غير صالحة',
  UNDECLARED_PROVIDER: 'أرقام المقارنة لا تعلن مصدرها، فلا يمكن ضمان تجانسها',
};

/* سماحية انحراف الساعة. المصدر أو وسيط الخادم قد يسبق ساعتنا بثوانٍ؛ ما زاد
   على دقيقتين ليس حداثة بل عطباً، لأنه **يجمّد كل تحديث لاحق بصمت**: أي قراءة
   حقيقية بعدها ستبدو «أقدم» فتُرفض إلى الأبد. */
export const READ_AT_FUTURE_TOLERANCE_MS = 120_000;

/** هل وقت القراءة صالح للاعتماد عليه كأساس للمقارنة الزمنية؟ */
export function isTrustworthyReadAt(readAt, now, tolerance = READ_AT_FUTURE_TOLERANCE_MS) {
  if (typeof readAt !== 'string' || readAt.trim() === '') return false;
  const parsed = Date.parse(readAt);
  if (!Number.isFinite(parsed)) return false;
  return parsed <= now + tolerance;
}

/** سبب رفض وقت القراءة، أو `null` إن كان صالحاً. */
export function readAtProblem(readAt, now) {
  if (typeof readAt !== 'string' || readAt.trim() === '' || !Number.isFinite(Date.parse(readAt))) return 'MISSING_READ_AT';
  if (Date.parse(readAt) > now + READ_AT_FUTURE_TOLERANCE_MS) return 'FUTURE_READ_AT';
  return null;
}

/* «رفض الاستجابات الأقدم وعدم استبدال قراءة حديثة بأخرى قديمة». المساواة
   تُرفض أيضاً: استبدال قراءة بأخرى بنفس الوقت يسبب وميضاً وإعادة إعلان
   أهداف بلا مبرر. */
export function isStaleRead(incoming, current) {
  if (!current?.readAt) return false;
  if (!incoming?.readAt) return true;
  return Date.parse(incoming.readAt) <= Date.parse(current.readAt);
}

/* البند 3 و11: «فشل مباراة لا يمسح بيانات المباراتين الأخريين». الدمج
   يحافظ على آخر قراءة مؤكدة لكل مباراة على حدة، ويلصق الفشل بتلك المباراة
   فقط مع سببها — فلا يظهر خطأ شامل ولا تُفقد بيانات سليمة.

   قراءتان تُرفضان هنا صراحةً لأن قبولهما أخطر من رفضهما:
   • بلا `readAt` صالح → تُخزَّن بلا أساس زمني، فتتعطل حماية الأقدم كلياً
     وتصير أي قراءة لاحقة (حتى الأقدم) مقبولة.
   • بـ`readAt` مستقبلي → تُقبل مرة واحدة ثم ترفض كل قراءة حقيقية بعدها.
   وفي الحالتين تُسجَّل كعطلة مرئية بدل أن تمر بصمت. */
export function mergeReads(current, results, now) {
  const next = { ...current };
  for (const [matchId, result] of Object.entries(results)) {
    const existing = next[matchId] || null;
    /* قراءة مخزّنة بوقت غير جدير بالثقة (مستقبلي أو تالف) ليست مرجعاً صالحاً:
       تُسقط من الأساس حتى لا تحجب التحديثات الحقيقية التي تليها. */
    const trustedData = existing?.data && isTrustworthyReadAt(existing.data.readAt, now) ? existing.data : null;
    const baseline = existing ? { ...existing, data: trustedData } : null;

    if (result?.status === 'fulfilled' && result.value?.data) {
      const problem = readAtProblem(result.value.data.readAt, now);
      if (problem) {
        next[matchId] = { ...(baseline || {}), data: trustedData, failure: problem, attemptedAt: now };
        continue;
      }
      if (isStaleRead(result.value.data, trustedData)) {
        /* استجابة أقدم: تُحفظ القيم كما هي مع تسجيل أن محاولة جرت. */
        next[matchId] = baseline
          ? { ...baseline, rejectedStale: (baseline.rejectedStale || 0) + 1 }
          : { data: null, failure: 'STALE_READ', rejectedStale: 1, attemptedAt: now };
        continue;
      }
      next[matchId] = { data: result.value.data, failure: null, cache: result.value.cache || 'MISS', readAt: result.value.data.readAt, attemptedAt: now };
      continue;
    }
    /* البند 11: «الاحتفاظ بآخر قراءة مؤكدة مع وقتها وتحذير واضح عند الفشل». */
    next[matchId] = { ...(baseline || {}), data: trustedData, failure: result?.code || 'NETWORK_ERROR', attemptedAt: now };
  }
  return next;
}

/* ──────────────────── التبويبات: الافتراضي وثبات الاختيار ──────────────────── */

export const TABS = [
  { id: 'prematch', label: 'قبل المباراة' },
  { id: 'live', label: 'مباشر' },
  { id: 'analysis', label: 'التحليل' },
  { id: 'postmatch', label: 'بعد المباراة' },
];

export function defaultTab(status) {
  if (status?.phase === 'post') return 'postmatch';
  if (status?.phase === 'pre' || status?.phase === 'live') return 'live';
  return 'prematch';
}

/* البند 5 (الفقرة الأخيرة): «إذا اختار المستخدم تبويباً بنفسه، فلا ننقله منه
   قسرياً عند التحديث أو وصول هدف». لذلك `userChoice` — إن وُجد — يفوز دائماً،
   حتى لو تغيّرت الحالة من معاينة إلى مباشر أثناء قراءته. */
export function resolveTab(status, userChoice) {
  if (userChoice && TABS.some(tab => tab.id === userChoice)) return userChoice;
  return defaultTab(status);
}

/* البند 10: التبويبات تعمل بلوحة المفاتيح. في RTL يُرصف الصف من اليمين إلى
   اليسار، فأول عنصر في DOM هو **الأيمن** بصرياً، و«التالي» في ترتيب القراءة
   العربي هو `index + 1` (الأيسر بصرياً). هذه الدالة تتعامل مع الترتيب
   المنطقي فقط؛ أمّا ربط الأسهم بها فيفعله المكوّن: ArrowLeft ← next و
   ArrowRight ← previous، كما توصي ARIA للاتجاه من اليمين لليسار. */
export function nextTabId(currentId, direction) {
  const index = TABS.findIndex(tab => tab.id === currentId);
  if (index === -1) return TABS[0].id;
  const delta = direction === 'next' ? 1 : -1;
  const next = (index + delta + TABS.length) % TABS.length;
  return TABS[next].id;
}

/* ─────────── إعلانات الأهداف والتصحيحات (البند 7) ─────────── */

/* أنواع الأحداث التي تستحق إعلاناً صوتياً/بصرياً. محصورة عمداً: البند 10
   يطلب aria-live للأهداف والتصحيحات والتنبيهات المهمة، **وليس** لكل حدث. */
const ANNOUNCEABLE_TYPES = new Set(['goal', 'penalty', 'own_goal', 'missed_penalty', 'var_cancelled', 'var_confirmed']);

/* بصمة ثابتة للحدث تمنع تكرار الإعلان مع كل استجابة (البند 7). المعرّف من
   المصدر أولى؛ وإن غاب تُبنى بصمة من النوع والدقيقة واللاعب — وهي كافية
   لأن الحدث نفسه لا يتكرر بنفس الدقيقة واللاعب والنوع في مباراة واحدة. */
export function eventKey(matchId, event) {
  const id = event?.id ?? event?.eventId ?? event?.uuid;
  if (id !== undefined && id !== null && String(id).trim() !== '') return `${matchId}:${String(id).trim()}`;
  const parts = [event?.type || 'event', event?.minute ?? '-', event?.extraMinute ?? '-', event?.player?.id ?? event?.player?.name ?? '-'];
  return `${matchId}:${parts.join(':')}`;
}

const SOURCE_EVENT_TYPES = new Map([
  ['goal', 'goal'], ['goal volley', 'goal'], ['goal - volley', 'goal'],
  ['penalty', 'penalty'], ['penalty goal', 'penalty'], ['penalty scored', 'penalty'],
  ['own goal', 'own_goal'],
  ['missed penalty', 'missed_penalty'], ['penalty missed', 'missed_penalty'],
  ['yellow card', 'yellow_card'],
  ['red card', 'red_card'],
  ['substitution', 'substitution'],
  ['var cancelled', 'var_cancelled'], ['var cancellation', 'var_cancelled'],
  ['var confirmed', 'var_confirmed'], ['var confirmation', 'var_confirmed'],
]);

/* توقفات المباراة (`Start Delay`/`End Delay`) يرسلها ESPN مرتين — نسخة لكل
   فريق — ثم يرسل انتهاءها. لا تحمل معلومة تتجاوز ساعة المباراة، فتُوسم
   `silent` بدل عرضها كنوع «آخر» بنصها الإنجليزي. الوسم في العقد نفسه (لا في
   الواجهة وحدها) حتى يبقى الإخفاء لو وصلت حمولة قديمة من مخبأ الخادم. */
const SILENT_SOURCE_TYPES = new Set(['start delay', 'end delay', 'delay', 'delay over']);

function sourceEventType(raw) {
  const value = raw?.sourceType ?? raw?.type?.text ?? raw?.type?.name ?? raw?.type;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function normalizeEvent(raw) {
  const sourceType = sourceEventType(raw);
  const normalizedType = sourceType
    ?.toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const type = normalizedType ? SOURCE_EVENT_TYPES.get(normalizedType) ?? 'other' : 'other';
  const silent = normalizedType ? SILENT_SOURCE_TYPES.has(normalizedType) : false;

  /* Preserve source identifiers whenever the contract provides them; do not
     derive team identity from its display name. */
  const rawId = raw?.id ?? raw?.eventId ?? raw?.uuid;
  const sourceTypeId = raw?.sourceTypeId ?? raw?.typeId ?? raw?.type?.id;
  const sourceTeamId = raw?.sourceTeamId ?? raw?.teamId ?? raw?.team?.id;
  const period = raw?.period?.number ?? raw?.period;
  const periodText = typeof period === 'string' || typeof period === 'number'
    ? String(period).trim() || null
    : null;
  const cancelled = raw?.cancelled === true || raw?.disallowed === true || type === 'var_cancelled';

  return {
    id: rawId === undefined || rawId === null || String(rawId).trim() === '' ? null : String(rawId).trim(),
    sourceType,
    sourceTypeId: sourceTypeId === undefined || sourceTypeId === null || String(sourceTypeId).trim() === '' ? null : String(sourceTypeId).trim(),
    sourceTeamId: sourceTeamId === undefined || sourceTeamId === null || String(sourceTeamId).trim() === '' ? null : String(sourceTeamId).trim(),
    type,
    cancelled,
    silent,
    minute: firstNumber(raw?.minute, raw?.clock, raw?.time?.elapsed),
    extraMinute: firstNumber(raw?.extraMinute, raw?.time?.extra),
    period: periodText,
    team: firstString(raw?.team?.name, raw?.teamName),
    teamSide: raw?.team?.homeAway === 'home' || raw?.side === 'home' ? 'home' : raw?.team?.homeAway === 'away' || raw?.side === 'away' ? 'away' : null,
    player: raw?.player?.name ? { id: raw?.player?.id ?? null, name: raw.player.name } : null,
    relatedPlayer: raw?.relatedPlayer?.name
      ? { id: raw.relatedPlayer.id ?? null, name: raw.relatedPlayer.name }
      : raw?.assist?.name ? { id: raw.assist.id ?? null, name: raw.assist.name } : null,
    detail: firstString(raw?.detail, raw?.comments, raw?.text),
  };
}

/* ─────────── رموز الملعب وتخطيط الشريط الزمني ─────────── */

/* الرمز شكل لا لون: البطاقة مستطيل، والهدف كرة، والتبديل سهمان. تُصدَّر
   القائمة كي ترسمها الواجهة SVG بلا تكرار تعريف في ملفين يتباعدان. */
const EVENT_SYMBOLS = {
  goal: 'ball',
  penalty: 'penalty',
  own_goal: 'own-goal',
  missed_penalty: 'missed-penalty',
  yellow_card: 'yellow-card',
  red_card: 'red-card',
  substitution: 'substitution',
  var_cancelled: 'var',
  var_confirmed: 'var',
  other: 'other',
};

export function eventSymbol(type) {
  return EVENT_SYMBOLS[type] ?? 'other';
}

/* أرضية الملعب لا تحمل إحداثيات: `keyEvents` من ESPN لا يرسل x/y، فوضع
   الحدث أفقياً هو **دقيقته** وحدها، وصفّه هو فريقه. هذا ما نعنيه بـ
   «على الملعب»: زمان ومكانة فريق، لا موقع داخل المستطيل. */
export const PITCH_MINUTES = 90;
export const PITCH_MAX_ROWS = 3;
const PITCH_MINUTE_GAP = 6;

export function pitchLanes(events) {
  const lanes = { totalMinutes: PITCH_MINUTES, home: [], away: [], unknown: [], untimed: [] };
  const list = (Array.isArray(events) ? events : [])
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => event && typeof event === 'object' && event.silent !== true)
    .sort((a, b) => {
      const aMinute = typeof a.event.minute === 'number' ? a.event.minute : Infinity;
      const bMinute = typeof b.event.minute === 'number' ? b.event.minute : Infinity;
      if (aMinute !== bMinute) return aMinute - bMinute;
      const aExtra = typeof a.event.extraMinute === 'number' ? a.event.extraMinute : 0;
      const bExtra = typeof b.event.extraMinute === 'number' ? b.event.extraMinute : 0;
      if (aExtra !== bExtra) return aExtra - bExtra;
      return a.index - b.index;
    });

  const timed = list.filter(({ event }) => typeof event.minute === 'number' && Number.isFinite(event.minute) && event.minute >= 0);
  const longest = timed.reduce((max, { event }) => Math.max(max, event.minute), 0);
  /* مباريات الوقت الإضافي تمتد إلى 120′؛ الشريط يتمدد بدل تكديس كل شيء عند 90. */
  lanes.totalMinutes = Math.max(PITCH_MINUTES, Math.ceil(longest / 15) * 15);

  const laneRows = { home: [], away: [], unknown: [] };
  for (const { event, index } of list) {
    const key = `${event.id ?? 'event'}:${index}`;
    if (typeof event.minute !== 'number' || !Number.isFinite(event.minute) || event.minute < 0) {
      lanes.untimed.push({ event, key });
      continue;
    }
    const side = event.teamSide === 'home' || event.teamSide === 'away' ? event.teamSide : 'unknown';
    const minute = Math.min(lanes.totalMinutes, event.minute);
    /* الأحداث المتقاربة تُزاح إلى صف تالٍ بدل التراكب فوق بعضها. */
    let row = 0;
    while (row < PITCH_MAX_ROWS - 1
      && laneRows[side].some(marker => marker.row === row && minute - marker.minute < PITCH_MINUTE_GAP)) {
      row += 1;
    }
    laneRows[side].push({ row, minute });
    lanes[side].push({ event, key, minute, position: (minute / lanes.totalMinutes) * 100, row });
  }
  return lanes;
}

/* البند 4: الشعارات «عند توفر أصول مسموح باستخدامها». والبند 12: لا تنزيل
   ولا استضافة. فالشعار يُربط من المصدر مباشرةً — وهو ما تفعله `parseScoreboard`
   في `lib/matches.mjs` فعلاً في الإنتاج — بشرط `https://` نفسه حرفياً، حتى لا
   يختلف حدّان أمنيان في مشروع واحد. وما لا يحقق الشرط يصير `null` لا رابطاً
   مشكوكاً فيه: `javascript:` أو رابط نسبي من مصدر خارجي ليس أصلاً مسموحاً. */
export function safeLogoUrl(value) {
  return typeof value === 'string' && value.startsWith('https://') ? value : null;
}

/* أنواع الأحداث التي تحرّك النتيجة فعلاً. تُصدَّر لأن طبقة النقل تبني بها
   محاكاة لا تختلف نتيجتها عن أحداثها — وتكرار القائمة هناك يعني تعريفين
   لـ«أي حدث يُحتسب» يمكن أن يتباعدا. */
export const SCORING_TYPES = new Set(['goal', 'penalty', 'own_goal']);

/* كم هدفاً يضيفه هذا الحدث إلى رصيد طرف بعينه.
   الهدف العكسي يحتاج عناية خاصة: من سجّله في مرماه **لا يُخصم** منه هدف،
   بل يُضاف هدف لخصمه. لذلك لا يصلح هنا رقم بإشارة واحدة (‎-1‎) يُطبق على
   الطرفين — فقد كان ذلك ينتج تنبيه «صُحّحت النتيجة» كذباً عند كل هدف عكسي. */
function creditsSide(event, side) {
  if (!event || event.cancelled) return 0;
  if (event.type === 'goal' || event.type === 'penalty') return event.teamSide === side ? 1 : 0;
  if (event.type === 'own_goal') {
    if (event.teamSide === 'home') return side === 'away' ? 1 : 0;
    if (event.teamSide === 'away') return side === 'home' ? 1 : 0;
    return 0; /* الطرف غير معروف من المصدر — انظر معالجة الفجوة أدناه */
  }
  return 0; /* ركلة جزاء مهدرة وإشعارات VAR والبطاقات والتبديلات لا تحرّك النتيجة */
}

/**
 * النتيجة كما تفسّرها الأحداث المعلنة — مشتقة عبر `creditsSide` نفسها التي
 * يستعملها `detectScoreCorrection`، فلا ينشأ تعريف ثانٍ للاحتساب.
 *
 * `unattributed` أحداث تحرّك النتيجة لكن المصدر لم يرسل جانب الفريق فيها؛ لا
 * تُضاف إلى أي طرف لأن إسنادها تخمين (البند 2)، لكنها تُعلن رقماً حتى يظهر
 * النقص بدل أن يختفي داخل مجموع يبدو تاماً.
 */
export function scoreFromEvents(events) {
  const list = Array.isArray(events) ? events : [];
  const home = list.reduce((sum, event) => sum + creditsSide(event, 'home'), 0);
  const away = list.reduce((sum, event) => sum + creditsSide(event, 'away'), 0);
  const unattributed = list.reduce((sum, event) => {
    if (!event || event.cancelled || !SCORING_TYPES.has(event.type) || event.teamSide !== null) return sum;
    return sum + 1;
  }, 0);
  return { home, away, unattributed };
}

/* البند 7: «دعم تصحيح النتيجة». إن تغيّرت النتيجة بما لا تفسّره الأهداف
   المعلنة، فهي مراجعة من المصدر (VAR أو تصحيح يدوي) وتستحق تنبيهاً مستقلاً.

   تُفرَّق حالتان حتى لا نزعج الزائر بإنذار كاذب:
   • **مراجعة حقيقية** — المجموع نفسه تغيّر بما لا تفسّره الأهداف المعلنة.
   • **فجوة إسناد** — المجموع مفسَّر تماماً لكن طرفاً غير منسوب لأن المصدر لم
     يرسل جانب الفريق في حدث ما. هذه ليست تصحيحاً للنتيجة فلا يُعلن. */
export function detectScoreCorrection(previousScore, nextScore, announcedGoals) {
  if (!previousScore || !nextScore) return null;
  const deltaHome = (nextScore.home ?? 0) - (previousScore.home ?? 0);
  const deltaAway = (nextScore.away ?? 0) - (previousScore.away ?? 0);
  const goals = Array.isArray(announcedGoals) ? announcedGoals.filter(item => item?.event) : [];
  const explainedHome = goals.reduce((sum, item) => sum + creditsSide(item.event, 'home'), 0);
  const explainedAway = goals.reduce((sum, item) => sum + creditsSide(item.event, 'away'), 0);
  if (deltaHome === explainedHome && deltaAway === explainedAway) return null;

  /* فجوة إسناد: حدث يحرّك النتيجة لكن المصدر لم يرسل جانب الفريق فيه. يُحسب
     في الإجمالي لا في أي طرف، لأن جمعه إلى طرف بعينه تخمين. فإن تطابق
     الإجمالي مع هذا المقدار غير المنسوب فالنتيجة مفسَّرة ولا يُعلن تصحيح. */
  const unattributedTotal = goals.reduce((sum, item) => {
    const event = item.event;
    if (!SCORING_TYPES.has(event.type) || event.teamSide !== null) return sum;
    return sum + (event.cancelled ? -1 : 1);
  }, 0);
  if (unattributedTotal !== 0 && deltaHome + deltaAway === explainedHome + explainedAway + unattributedTotal) return null;

  return {
    from: previousScore,
    to: nextScore,
    message: `صُحّحت النتيجة من المصدر: ${previousScore.home ?? '—'}–${previousScore.away ?? '—'} صارت ${nextScore.home ?? '—'}–${nextScore.away ?? '—'}`,
  };
}

/* بصمة **الإعلان** تختلف عن بصمة **الهوية**. الهوية هي معرّف الحدث وحده،
   لكن الهدف الملغى بعد VAR يحمل نفس معرّف الهدف الأصلي — فلو كُفيت الهوية
   وحدها لابتُلعت واقعة الإلغاء بوصفها «مُعلنة مسبقاً». لذلك يُضاف وسم
   الإلغاء إلى بصمة الإعلان: الهدف يُعلن مرة، وإلغاؤه يُعلن مرة، وتكرار
   أيٍّ منهما لا يُعلن شيئاً (البند 7). */
function announceToken(matchId, event) {
  const key = eventKey(matchId, event);
  return event.cancelled ? `${key}|cancelled` : key;
}

/* البند 7 بأربع متطلبات في دالة واحدة:
   أ) منع تكرار الإشعار مع كل استجابة  → `knownKeys`
   ب) منعه عند إعادة تحميل الصفحة      → `knownKeys` تُستعاد من sessionStorage
   ج) عدم عرض أهداف قديمة وصلت مع استعادة الاتصال كأنها الآن → `silentSeed`
   د) إعلان التصحيح وإلغاء الهدف بعد VAR → فرعا `removed` و`cancelled`

   `silentSeed` هو المفتاح: أول قراءة ناجحة في هذه الجلسة **تُعلن صفر أحداث**
   وتبصم الموجود كله. فلو انقطع الاتصال وعادت الصفحة لتجلب 40 دقيقة من
   الأحداث دفعة واحدة، لا تُعرض كأنها وقعت في تلك اللحظة. */
export function planAnnouncements({ matchId, previousEvents = [], nextEvents = [], knownKeys = [], silentSeed = false }) {
  const known = new Set(knownKeys);
  const previous = previousEvents.map(event => ({ event, key: eventKey(matchId, event) }));
  const next = nextEvents.map(event => ({ event, key: eventKey(matchId, event), token: announceToken(matchId, event) }));
  const nextKeys = new Set(next.map(entry => entry.key));

  if (silentSeed) {
    return { announce: [], knownKeys: Array.from(new Set([...known, ...next.map(entry => entry.token)])) };
  }

  const announce = [];

  /* أهداف جديدة، أو هدف قائم تحوّل إلى ملغى — وكلاهما لم يُبصم من قبل */
  for (const { event, key, token } of next) {
    if (!ANNOUNCEABLE_TYPES.has(event.type) || known.has(token)) continue;
    if (event.cancelled) {
      announce.push({ kind: 'cancelled', key, matchId, event, message: `أُلغي هدف بعد مراجعة الفيديو — ${event.team || ''} ${event.player?.name || ''}`.trim() });
    } else {
      announce.push({ kind: 'goal', key, matchId, event, message: `هدف ${event.team || ''} ${event.player?.name || ''} ${event.minute !== null ? `(${event.minute}${event.extraMinute !== null ? `+${event.extraMinute}` : ''})` : ''}`.trim() });
    }
    known.add(token);
  }

  /* هدف كان معلناً ثم اختفى من المصدر → إلغاء/تصحيح، لا صمت */
  for (const { event, key } of previous) {
    if (!ANNOUNCEABLE_TYPES.has(event.type) || event.cancelled || nextKeys.has(key)) continue;
    if (!known.has(key)) continue; /* لم يُعلن أصلاً فلا يُصحَّح */
    announce.push({ kind: 'corrected', key, matchId, event, message: `تصحيح من المصدر: لم يعد الهدف مسجَّلاً باسم ${event.player?.name || event.team || 'غير محدد'}` });
  }

  return { announce, knownKeys: Array.from(known) };
}

/* النتيجة قابلة للعرض فقط إذا أرسل المصدر عددين صحيحين غير سالبين؛ الصفر
   الحقيقي صالح، أما الطرف الناقص أو الكسري أو غير الرقمي فيُخفي النتيجة كاملة. */
export function isValidScore(score) {
  const validGoal = value => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
  return Boolean(score && validGoal(score.home) && validGoal(score.away));
}

const SCORE_STATUSES = new Set(['live', 'halftime', 'finished', 'suspended']);

/** أهلية عرض النتيجة: حالة تسمح بها + هدفان صالحان. */
export function canShowScore(status, score) {
  return SCORE_STATUSES.has(status?.code) && isValidScore(score);
}

/* الموعد الثابت ليس موعداً جديداً بعد تأخير أو تأجيل/إلغاء موثّقين. */
const KICKOFF_STATUSES_WITHOUT_CURRENT_TIME = new Set(['delayed', 'postponed', 'canceled']);
export function canShowKickoff(status) {
  return !KICKOFF_STATUSES_WITHOUT_CURRENT_TIME.has(status?.code);
}

/* ────────── سجل المواجهات: آخر ثلاث مكتملة بلا تكرار (البند 5، 6، 8) ────────── */

function h2hKey(entry) {
  const id = entry?.fixtureId ?? entry?.id;
  if (id !== undefined && id !== null && String(id).trim() !== '') return `id:${String(id).trim()}`;
  return `d:${entry?.date || ''}|${entry?.home || ''}|${entry?.away || ''}`;
}

/* البند 5: «آخر ثلاث مواجهات مكتملة». الاكتمال وحده لا يكفي — مباراة أُلغيت
   بعد بدايتها «مكتملة» بمعنى أنها انتهت، لكن ليس لها نتيجة رسمية، وإدخالها
   بلا هدفين يعرض مواجهة بلا نتيجة أو يدفع بمواجهة صحيحة خارج الثلاث. لذلك
   يشترط هذا الفحص نتيجة رسمية من المصدر: حالة `finished` وهدفان حاضران. */
export function isResultOfficial(status, score) {
  return status?.code === 'finished' && isValidScore(score);
}

function isCountableH2h(entry) {
  return entry?.completed === true
    && typeof entry?.date === 'string' && entry.date.trim() !== ''
    && Number.isFinite(Date.parse(entry.date))
    && isValidScore({ home: entry.homeGoals, away: entry.awayGoals });
}

/* البند 6: «سجل المواجهات لا يتضمن المباراة المقبلة قبل اكتمالها».
   البند 8: «تحديث آخر ثلاث مواجهات مكتملة لإدخال هذا اللقاء دون تكراره».
   البند 5: «تمييز الوديات» → الحقل `friendly` يبقى كما أرسله المصدر؛ وإن لم
   يميّزه المصدر يبقى `null` فتعرض الواجهة «نوع البطولة غير محدد» ولا تخمّن. */
export function mergeH2h(existing = [], self = null, limit = 3) {
  const completed = (Array.isArray(existing) ? existing : []).filter(isCountableH2h);
  if (self && isCountableH2h(self)) {
    const key = h2hKey(self);
    if (!completed.some(entry => h2hKey(entry) === key)) completed.push(self);
  }
  return completed
    .slice()
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, Math.max(0, limit));
}

/* ─────────── مستوى الفريق Form: تجميع صادق على العدد الفعلي ─────────── */

/* بند الرسالة التكميلية 1ب: آخر خمس مباريات W/D/L وأهداف له وعليه، على
   **العدد الفعلي المتاح** — لا قسمة على 5 إن توفرت 3، ولا تحويل نتيجة
   أو هدف مفقود إلى صفر. المدخل أحداث مطبّعة بشكل واحد (من `lastFiveGames`
   لدى المزوّد أو مشتقة من جدول نتائج مؤكد)، والمخرج تجميع بلا أي رقم
   من خارجها. النتيجة تُحسب من الهدفين وطرف الفريق، لا من وسم مزوّد وحده.

   كل حدث: { fixtureId, date, competition, opponent, homeTeamId,
   awayTeamId, homeGoals, awayGoals } — حدث بلا هدفين أو بلا تاريخ صالح
   أو لا يخص الفريق **يُستبعد من العدّ** ولا يصير تعادلاً صفرياً. */
export function summarizeForm(entries, teamId, limit = 5) {
  const wanted = teamId === null || teamId === undefined ? '' : String(teamId).trim();
  if (wanted === '' || !Array.isArray(entries)) return null;

  const countable = entries.filter(entry => {
    if (!entry || typeof entry !== 'object') return false;
    if (typeof entry.date !== 'string' || !Number.isFinite(Date.parse(entry.date))) return false;
    if (firstNumber(entry.homeGoals) === null || firstNumber(entry.awayGoals) === null) return false;
    return String(entry.homeTeamId ?? '') === wanted || String(entry.awayTeamId ?? '') === wanted;
  });
  if (countable.length === 0) return null;

  const matches = countable
    .slice()
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, Math.max(0, limit))
    .map(entry => {
      const isHome = String(entry.homeTeamId ?? '') === wanted;
      const goalsFor = firstNumber(isHome ? entry.homeGoals : entry.awayGoals);
      const goalsAgainst = firstNumber(isHome ? entry.awayGoals : entry.homeGoals);
      return {
        fixtureId: entry.fixtureId ?? null,
        date: entry.date,
        competition: typeof entry.competition === 'string' && entry.competition.trim() !== '' ? entry.competition.trim() : null,
        opponent: typeof entry.opponent === 'string' && entry.opponent.trim() !== '' ? entry.opponent.trim() : null,
        venue: isHome ? 'home' : 'away',
        goalsFor,
        goalsAgainst,
        result: goalsFor > goalsAgainst ? 'W' : goalsFor < goalsAgainst ? 'L' : 'D',
      };
    });

  const played = matches.length;
  const sum = key => matches.reduce((total, match) => total + match[key], 0);
  const goalsFor = sum('goalsFor');
  const goalsAgainst = sum('goalsAgainst');
  const round2 = value => Math.round(value * 100) / 100;

  return {
    matches,
    played,
    wins: matches.filter(match => match.result === 'W').length,
    draws: matches.filter(match => match.result === 'D').length,
    losses: matches.filter(match => match.result === 'L').length,
    goalsFor,
    goalsAgainst,
    /* المتوسطان مسمّيان بذاتهما ومقسومان على العدد الفعلي — لا «متوسط» مبهم. */
    avgGoalsFor: round2(goalsFor / played),
    avgGoalsAgainst: round2(goalsAgainst / played),
    /* نطاق العينة كما ورد في كل حدث، لا كما نتمنى: بطولة واحدة تظهر باسمها. */
    competitions: [...new Set(matches.map(match => match.competition).filter(Boolean))],
  };
}

/* ───────── ختم لحظة النهاية: شرط توقف التحديث (البند 8 و11) ───────── */

/* لماذا هذه الدالة ضرورية؟
   لأن `normalizeStatus` لا تعرف متى انتهت المباراة — تعرف فقط **أنها** انتهت.
   ولو قِيست نافذة التخفيف من `readAt` لتجددت مع كل قراءة، فتظل أصغر من
   النافذة دائماً و**لا يتوقف التحديث أبداً**. لذلك يُختم الوقت مرة عند أول
   قراءة تؤكد النهاية، ويُحفظ بعدها، ويُمحى إن أعاد المصدر فتح المباراة. */
export function stampCompletion(previousStatus, nextStatus, readAt) {
  if (!nextStatus) return nextStatus;
  if (!nextStatus.completed) {
    /* مباراة أعيد فتحها (تصحيح، أو استئناف بعد توقف) تفقد ختمها. */
    return { ...nextStatus, finishedAt: null };
  }
  const previousFinishedAt = previousStatus?.finishedAt;
  if (typeof previousFinishedAt === 'string' && Number.isFinite(Date.parse(previousFinishedAt))) {
    return { ...nextStatus, finishedAt: previousFinishedAt };
  }
  return { ...nextStatus, finishedAt: typeof readAt === 'string' && Number.isFinite(Date.parse(readAt)) ? readAt : null };
}

/* ─────────── معدلات التحديث حسب نوع البيانات (البند 11) ─────────── */

/* البند 11: «تحديث كل نوع بيانات حسب تواتر توفره، وليس افتراض أن الترتيب
   والتقييمات والنتيجة تتجدد بالمعدل نفسه». النتيجة 60 ثانية أثناء الظهور
   (المعدل الذي اقترحتَه)، والتشكيلات أبطأ لأنها تُعلن مرة، والتقييمات أبطأ
   لأنها تُنشر بعد النهاية، والترتيب أبطأ لأنه مشترك بين المباريات الثلاث. */
export const POLL_INTERVALS = {
  pre: { status: 300_000, lineups: 300_000, history: 3_600_000, standings: 1_800_000 },
  live: { status: 60_000, events: 60_000, statistics: 60_000, lineups: 300_000, ratings: null, standings: 1_800_000 },
  post: { status: 300_000, events: 300_000, statistics: 300_000, lineups: null, ratings: 600_000, standings: 1_800_000 },
  terminal: { status: 900_000 },
};

/* البند 8: «تخفيف طلبات التحديث بعد النهاية، مع مراعاة احتمال وصول
   الإحصائيات والتقييمات لاحقاً». فبعد ساعة من النهاية المؤكدة **ومع** وجود
   الإحصائيات والتقييمات (أو تأكيد المصدر غيابها) يتوقف الطلب كلياً. */
export const POST_MATCH_WINDOW_MS = 3_600_000;

export function pollIntervalFor(status, dataType) {
  const phase = status?.phase || 'pre';
  const table = POLL_INTERVALS[phase] || {};
  const value = table[dataType];
  return typeof value === 'number' ? value : null; /* null = لا يُطلب هذا النوع في هذه المرحلة */
}

export function shouldStopPolling(status, data, now) {
  if (status?.phase !== 'post') return false;
  /* تُقاس النافذة من الختم الذي تضعه `stampCompletion` — **ولا ترتد إلى
     `readAt` إطلاقاً**، لأن `readAt` يتجدد مع كل قراءة فتظل النافذة غير
     منقضية أبداً ويستمر الطلب إلى ما لا نهاية. وإن غاب الختم نواصل الطلب:
     الاستمرار حذرٌ أرخص من التوقف على موعد لا نعرفه. */
  const finishedAt = typeof status.finishedAt === 'string' ? Date.parse(status.finishedAt) : NaN;
  if (!Number.isFinite(finishedAt)) return false;
  if (now - finishedAt < POST_MATCH_WINDOW_MS) return false;
  const hasStats = data?.statistics !== null && data?.statistics !== undefined;
  const ratingsSettled = data?.ratings !== null && data?.ratings !== undefined;
  return hasStats && ratingsSettled;
}

/* البند 11: «إيقاف polling عند إخفاء الصفحة واستئنافه عند العودة أو استعادة
   الاتصال» — نفس عرف MatchesPage القائم. تُرك القرار للمكوّن، لكن الشرط
   موحّد هنا حتى لا يختلف بين المباريات الثلاث. */
export function pollingAllowed({ hidden, online }) {
  return !hidden && online;
}

/* ───────────── المقارنة والرادار: أمانة الأرقام (البند 9) ───────────── */

/* البند 9: «عدم استخدام توقعات المزود أو احتمالات الفوز على أنها إحصائيات
   فعلية». هذه المفاتيح مرفوضة صراحة، و`odds` موجود فعلاً في استجابة ESPN. */
const FORBIDDEN_METRIC = /odds|probabilit|prediction|expected_?winner|implied|betting|form_?prediction/i;

/* البند 9: «حتى ستة محاور». ومضلع يحتاج 3 رؤوس على الأقل حتى لا يكون
   «مضلعاً مضللاً» — وهو تعبيرك حرفياً. */
/* يُصدّران لأن مكوّن الرادار (المرحلة 5) يحتاج السقف نفسه: تكرار الرقم 6 في
   المكوّن يعني حدّين يمكن أن يتباعدا، والبند 9 يجعل السقف جزءاً من العقد. */
export const MAX_AXES = 6;
export const MIN_AXES = 3;

/* البند 9: «قبل اللقاء: بيانات متجانسة لنفس المسابقة والفترة ... أثناءه
   وبعده: أرقام المباراة نفسها». الوضعان لا يُخلطان: `match` = أرقام هذه
   المباراة، `season` = متوسطات فترة. الخلط يقارن مباراة واحدة بموسم كامل. */
export function buildComparison(metrics, { mode = 'match', sample = null, provider = null } = {}) {
  const fail = (reason, message, axes = []) => ({
    ok: false, polygon: false, reason, message, mode, sample, axes, tableOk: axes.length > 0,
  });

  if (!Array.isArray(metrics) || metrics.length === 0) {
    return fail('NO_DATA', 'لا تتوفر أرقام مقارنة من المصدر لهذه المباراة.', []);
  }

  /* صف تالف يعني أن مجموعة الأرقام كلها غير موثوقة. تُرفض المقارنة كاملة بدل
     إسقاط الصف بصمت — فإسقاطه قد يترك مضلعاً يبدو سليماً وهو ناقص. والأهم
     أن هذه الدالة تُستدعى من مسار العرض، فلا يجوز أن ترمي استثناءً يهدم
     الصفحة؛ التدهور الآمن رسالة واضحة لا انهيار. */
  if (metrics.some(metric => !metric || typeof metric !== 'object' || typeof metric.key !== 'string' || typeof metric.label !== 'string')) {
    return fail('INVALID_METRICS', MATCH_CENTER_DIAGNOSTICS.INVALID_METRICS, []);
  }

  /* البند 9: «عدم استخدام توقعات المزود أو احتمالات الفوز على أنها إحصائيات
     فعلية». يُفحص **قبل** بقية الشروط لأن تشخيصه هو الأنفع: احتمال فوز وارد
     في المقارنة خطأ في المادة نفسها، لا نقص في وصفها. */
  if (metrics.some(metric => FORBIDDEN_METRIC.test(String(metric.key || '')))) {
    return fail('FORBIDDEN_METRIC', 'لا تُعرض توقعات المزود أو احتمالات الفوز ضمن الإحصائيات الفعلية.', []);
  }

  /* البند 2 و9: مزوّد واحد لكل المقارنة. أرقام مزوّدين مختلفين في لوحة واحدة
     مقارنة باطلة حتى لو بدت الأرقام متقاربة. وإن لم يُعلن أي مزوّد فلا سبيل
     إلى ضمان التجانس أصلاً، فالرفض أولى من الرسم. */
  const providers = new Set(metrics.map(m => m.provider ?? provider).filter(Boolean));
  if (providers.size === 0) {
    return fail('UNDECLARED_PROVIDER', MATCH_CENTER_DIAGNOSTICS.UNDECLARED_PROVIDER, []);
  }
  if (providers.size > 1) {
    return fail('MIXED_PROVIDERS', 'لا يمكن عرض المقارنة: أرقامها واردة من أكثر من مصدر، ودمجها في لوحة واحدة مضلل.', []);
  }

  const modes = new Set(metrics.map(m => m.mode ?? mode));
  if (modes.size > 1) {
    return fail('MIXED_MODES', 'لا يمكن عرض المقارنة: بعض الأرقام من المباراة نفسها وبعضها من فترة أوسع.', []);
  }

  if (metrics.length > MAX_AXES) {
    return fail('TOO_MANY_AXES', `المقارنة معروضة بستة محاور كحد أقصى؛ وصلت ${metrics.length}.`, []);
  }

  /* البند 9: وضع «قبل اللقاء» يحتاج حجم عينة معلن. بلا عينة معروفة لا تُعرض
     متوسطات كأنها حقائق. */
  const effectiveMode = [...modes][0] || mode;
  if (effectiveMode === 'season' && (!sample || !(sample.matches > 0))) {
    return fail('NO_SAMPLE', 'لا تتوفر بيانات فترة متجانسة بحجم عينة معروف قبل اللقاء.', []);
  }

  const axes = metrics.map(metric => {
    const home = toFiniteOrNull(metric.home);
    const away = toFiniteOrNull(metric.away);
    const comparable = home !== null && away !== null;
    /* البند 9: «توحيد المقاييس بطريقة معلنة». الطريقة المعلنة هي النسبة إلى
       الأعلى بين الفريقين في هذا المحور — **لا** درجة من 100 ولا تقييم قوة.
       صفران حقيقيان يبقيان صفراً (وهذا صفر فعلي لا استكمالاً لنقص). */
    const peak = comparable ? Math.max(Math.abs(home), Math.abs(away)) : 0;
    return {
      key: metric.key,
      label: metric.label,
      unit: metric.unit || '',
      home, away,
      homeNorm: comparable && peak > 0 ? Math.abs(home) / peak : comparable ? 0 : null,
      awayNorm: comparable && peak > 0 ? Math.abs(away) / peak : comparable ? 0 : null,
      /* البند 9: «عدم استكمال المحاور الناقصة بأصفار أو قيم تخمينية». المحور
         غير القابل للمقارنة يُستبعد من المضلع ويبقى في الجدول بقيمة «غير متاح». */
      comparable,
    };
  });

  const drawable = axes.filter(axis => axis.comparable);
  if (drawable.length < MIN_AXES) {
    return {
      ...fail('INSUFFICIENT_AXES', `تتوفر ${drawable.length} محاور قابلة للمقارنة من أصل ${axes.length}؛ لا يكفي لرسم مضلع غير مضلل. الأرقام الأصلية في الجدول أدناه.`, axes),
      tableOk: true,
    };
  }

  return {
    ok: true, polygon: true, reason: 'OK', mode: effectiveMode, sample, provider: providers.size === 1 ? [...providers][0] : null,
    message: '', axes, tableOk: true, drawableCount: drawable.length,
  };
}

/* إحداثيات رؤوس المضلع لـSVG أصلي (البند 9: «يفضّل تنفيذ الرسوم بـSVG أصلي
   أو الأدوات الموجودة بالمشروع»). الزوايا تبدأ من الأعلى وتتقدم عكس عقارب
   الساعة، والمحاور غير القابلة للمقارنة **تُحذف** من المضلع لا تُصفَّر —
   فحذفها يغيّر شكل المضلع بصدق بدل أن يرسم نقصاً كأنه صفر. */
export function radarPoints(axes, { cx = 100, cy = 100, r = 80, side = 'home' } = {}) {
  const usable = axes.filter(axis => axis.comparable);
  if (usable.length < MIN_AXES) return '';
  return usable.map((axis, index) => {
    const angle = (Math.PI * 2 * index) / usable.length - Math.PI / 2;
    const value = side === 'away' ? axis.awayNorm : axis.homeNorm;
    const radius = r * Math.max(0, Math.min(1, value ?? 0));
    return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`;
  }).join(' ');
}

export function radarAxisLabels(axes, { cx = 100, cy = 100, r = 98 } = {}) {
  const usable = axes.filter(axis => axis.comparable);
  return usable.map((axis, index) => {
    const angle = (Math.PI * 2 * index) / usable.length - Math.PI / 2;
    return { key: axis.key, label: axis.label, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
}

/* ────────────────── المسارات والمعرّفات (البند 3، 13) ────────────────── */

/* البند 3: «لكل مباراة رابط مستقل وثابت ... تبقى المباراة على الرابط نفسه
   عند انتقالها من المعاينة إلى المباشر ثم التقرير النهائي». لذلك الرابط
   **لا يحمل حالة ولا نتيجة ولا معرّف مزوّد** — بل slug ثابت مشتق من
   الفريقين، والمعرّف الحقيقي يبقى في ملف البيانات وحده.
   القرار المعتمد: المسار المتداخل تحت صفحة البطولة القائمة. */
export function matchPath(competitionSlug, slug) {
  return `/matches/${competitionSlug}/${slug}/`;
}

/* البند 3: «ربط البيانات بالـFixture ID، وليس باسم الفريق أو توقيت البداية
   وحده». هذه الدالة هي الطريق الوحيد المقبول لربط قراءة واردة بمباراة:
   تطابق بمعرّف المزوّد أولاً، ولا تسقط إلى الاسم إلا إن لم يكن للمباراة
   معرّف مُتحقق بعد — وعندها تُعلَّم القراءة بأنها ربط تقريبي. */
export function matchByFixtureId(matches, provider, fixtureId) {
  const wanted = String(fixtureId ?? '').trim();
  if (wanted === '') return null;
  return matches.find(match => {
    const id = match?.externalIds?.[provider];
    return id !== undefined && id !== null && String(id).trim() === wanted;
  }) || null;
}

export function isVerified(match) {
  if (match?.verification !== 'confirmed') return false;
  const hasId = value => value !== null && value !== undefined && String(value).trim() !== '';
  return Object.entries(match.externalIds || {}).some(([provider, eventId]) =>
    hasId(eventId)
      && hasId(match.home?.externalIds?.[provider])
      && hasId(match.away?.externalIds?.[provider]),
  );
}

/* ==========================================================================
   تحليل المباراة: فحص التوافر، والمقارنة بلا حكم قِيم، والفلاتر النقية
   --------------------------------------------------------------------------
   ثلاث قواعد تحكم هذا القسم كله:

   1) **قرار «يُعرض أم لا» قرار بيانات لا قرار ذوق**. لذلك `displayable*` و
      `analysisIsAvailable` و`computeAvailableTabs` هنا، ولا تُترك داخل مكوّن:
      ما يُخفى القسم الفارغ هو نفسه ما يختبره Node، لا نسخة ثانية مكتوبة
      في JSX تتباعد عن الاختبار مع أول تعديل.

   2) **الرقم الأعلى ليس الأفضل**. `compareStatRow` تُعطي الطرفين قيمتيهما
      ونسبتيهما إلى الأعلى بينهما، وتُخرج الفارق مطلقاً بلا جهة «رابحة».
      زيادة الأخطاء والبطاقات والتسلل ليست ميزة، ومن يقرر ذلك ليس طبقة
      البيانات — فلو خرجت من هنا بكلمة «أفضل» لتكررت في كل لوحة وتعذّر نفيها.

   3) **ما لا يملكه المصدر لا يُرسم**. التشكيلات والتقييمات ومقارنة الموسم
      وxG والإحداثيات المكانية لا تصل في ربط وسيط الموقع الحالي؛ تُعرض
      كغياب موصوف (`unavailableDataNotes`)، ولا تتحول أصفاراً ولا واجهات
      فارغة ولا رسوماً تزيينية.
========================================================================== */

/* ────────────── نصوص الأحداث: مصدر واحد للملعب والتحليل والفلترات ────────────── */

/* المعروف يُعرَّب، والمجهول يُعرض بنص المصدر كما هو — اختلاق اسم عربي لحدث
   لا نعرفه هو وصفٌ لم يقله المصدر، وهو ما يمنع نفس البند الذي يمنع تخمين
   حالة المباراة من الساعة. */
export const EVENT_TYPE_LABELS = {
  goal: 'هدف',
  penalty: 'هدف من ركلة جزاء',
  own_goal: 'هدف عكسي',
  missed_penalty: 'ركلة جزاء مهدرة',
  yellow_card: 'بطاقة صفراء',
  red_card: 'بطاقة حمراء',
  substitution: 'تبديل',
  var_cancelled: 'مراجعة فيديو — إلغاء',
  var_confirmed: 'مراجعة فيديو — تأكيد',
};

export const EVENT_TYPE_UNCLASSIFIED_LABEL = 'نوع وارد من المصدر بلا تسمية معروفة';

/** اسم نوع الحدث، أو `fallback` إن جهلناه ولم يرسل المصدر تسمية. */
export function eventTypeName(event, fallback = null) {
  const known = EVENT_TYPE_LABELS[event?.type];
  if (typeof known === 'string') return known;
  return filledText(event?.sourceType) ?? fallback;
}

/* facet = مفتاح التجميع في الفلاتر. الأحداث غير المصنَّفة تُجمَع عند تسمية
   المصدر لا عند كلمة `other` وحدها، وإلا صار «Possession sequence» و«Injury»
   خياراً واحداً في الفلتر — وهذا يخالف «الفلاتر تطابق أحداث المصدر». */
export function eventTypeFacet(event) {
  if (event?.type !== 'other') return event?.type ?? 'other';
  const source = filledText(event?.sourceType);
  return source ? `other:${source}` : 'other';
}

export function eventTypeFacetLabel(facet, events = []) {
  const known = EVENT_TYPE_LABELS[facet];
  if (typeof known === 'string') return known;
  const sample = events.find(event => eventTypeFacet(event) === facet);
  return eventTypeName(sample, EVENT_TYPE_UNCLASSIFIED_LABEL);
}

/** الدقيقة كما تصل: «55′» أو «45+2′» للبدل الضائع. وبلا دقيقة لا رقم عندنا. */
export function eventMinuteLabel(event) {
  const minute = event?.minute;
  if (typeof minute !== 'number' || !Number.isFinite(minute) || minute < 0) return null;
  const extra = typeof event?.extraMinute === 'number' && Number.isFinite(event.extraMinute) && event.extraMinute >= 0
    ? `+${event.extraMinute}`
    : '';
  return `${minute}${extra}′`;
}

/* صف الفريق كما يُسمّى في الفلاتر. الأسماء الحقيقية تُمرَّر من المكوّن؛ هذه
   التسميات العامة هي الوصف البنيوي (مضيف/ضيف/غير منسوب) وليست بديلاً عنها. */
export const EVENT_SIDE_LABELS = {
  home: 'المضيف',
  away: 'الضيف',
  unassigned: 'غير منسوب إلى طرف',
};

/** الشوط كما ورد: رقم معروف له اسم، وغير المعروف نصُّه، والغياب `null`. */
const PERIOD_LABELS = {
  1: 'الشوط الأول',
  2: 'الشوط الثاني',
  3: 'الشوط الإضافي الأول',
  4: 'الشوط الإضافي الثاني',
  5: 'ركلات الترجيح',
};

export function eventPeriodInfo(period) {
  const raw = typeof period === 'number' && Number.isFinite(period) ? String(period) : filledText(period);
  if (raw === null) return null;
  const asNumber = /^-?\d+$/.test(raw) ? Number(raw) : null;
  const label = asNumber !== null && PERIOD_LABELS[asNumber] ? PERIOD_LABELS[asNumber] : raw;
  return { value: raw, label, classified: asNumber !== null && Boolean(PERIOD_LABELS[asNumber]) };
}

export function eventPeriodLabel(event) {
  const info = eventPeriodInfo(event?.period);
  return info ? info.label : null;
}

/* الوصف الكامل للحدث: يُقرأ في `aria-label` على الملعب، ويُعرض في بطاقة
   التفاصيل في التحليل. صيغة واحدة لا صيغتان — وإلا اختلف وصف الحدث الواحد
   بين موضعين في الصفحة نفسها. */
export function describeEvent(event) {
  if (!event || typeof event !== 'object') return null;
  const team = event.teamSide === 'home' || event.teamSide === 'away' ? filledText(event.team) : null;
  const side = event.teamSide === 'home' ? 'المضيف' : event.teamSide === 'away' ? 'الضيف' : null;
  const related = event.type === 'substitution' && event.relatedPlayer?.name
    ? `لاعب مرتبط: ${event.relatedPlayer.name}`
    : null;
  const detail = event.type === 'other' ? filledText(event.detail) : null;
  return [
    eventMinuteLabel(event),
    eventTypeName(event),
    side,
    team,
    filledText(event.player?.name),
    related,
    event.cancelled ? 'ملغى من المصدر' : null,
    detail,
  ].filter(part => typeof part === 'string' && part.trim() !== '').join(' · ') || null;
}

/** هل للحدث موضع على الشريط الزمني؟ (لا دقيقة ⇒ لا موضع، ولا نُخترع واحداً) */
export function eventOnTimeline(event) {
  return isRenderableEvent(event)
    && typeof event.minute === 'number'
    && Number.isFinite(event.minute)
    && event.minute >= 0;
}

/** حدث قابل للعرض: كائن صحيح وليس توقفَ مصدر (`Start Delay`/`End Delay`). */
export function isRenderableEvent(event) {
  return Boolean(event && typeof event === 'object' && event.silent !== true);
}

export function renderableEvents(events) {
  return (Array.isArray(events) ? events : []).filter(isRenderableEvent);
}

/* ──────────────────── ما يُعرض فعلاً: فحص توافر كل قسم ──────────────────── */

function filledText(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function finiteNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function displayablePlayers(players) {
  if (!Array.isArray(players)) return [];
  return players.filter(player => Boolean(player && filledText(player.name)));
}

export function displayableStatistics(statistics) {
  if (!Array.isArray(statistics)) return [];
  return statistics.filter(stat => Boolean(stat && filledText(stat.label))
    && (finiteNumber(stat.home) !== null || finiteNumber(stat.away) !== null));
}

export function displayableRatings(ratings) {
  if (!Array.isArray(ratings)) return [];
  return ratings.filter(player => Boolean(player && filledText(player.name) && finiteNumber(player.rating) !== null));
}

export function confirmedLineupSides(lineups) {
  if (!lineups || typeof lineups !== 'object') return [];
  return ['home', 'away'].flatMap(side => {
    const data = lineups[side];
    if (!data || data.confirmed !== true) return [];
    const starters = displayablePlayers(data.starters);
    const substitutes = displayablePlayers(data.substitutes);
    const hasVisibleContent = Boolean(filledText(data.formation) || filledText(data.coach) || starters.length || substitutes.length);
    return hasVisibleContent ? [{ side, data }] : [];
  });
}

export function displayableHeadToHead(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.filter(entry => Boolean(entry
    && filledText(entry.home)
    && filledText(entry.away)
    && typeof entry.date === 'string'
    && Number.isFinite(Date.parse(entry.date))
    && isValidScore({ home: entry.homeGoals, away: entry.awayGoals }),
  ));
}

export function hasDisplayableForm(form) {
  return Boolean(form && Array.isArray(form.matches) && form.matches.some(item => item
    && finiteNumber(item.goalsFor) !== null
    && finiteNumber(item.goalsAgainst) !== null
    && (item.result === 'W' || item.result === 'D' || item.result === 'L'),
  ));
}

export function displayableComparisonAxes(comparison) {
  if (!comparison || !Array.isArray(comparison.axes)) return [];
  return comparison.axes.filter(axis => Boolean(axis && filledText(axis.label))
    && (finiteNumber(axis.home) !== null || finiteNumber(axis.away) !== null));
}

/** المواجهات المكتملة + هذه المباراة عند تأكيد نتيجتها — منطق واحد يستهلكه
    التبويبُ والتوافرُ معاً، فلا يُعدّ القسم «ملياناً» بشيء لا يعرضه. */
export function headToHeadFor(match, snapshot, status) {
  const official = isResultOfficial(status, snapshot?.score ?? null);
  const score = snapshot?.score ?? null;
  const self = official && score
    ? {
      fixtureId: match?.externalIds?.espn ?? null,
      date: match?.kickoffUtc ?? null,
      competition: filledText(match?.competitionName),
      year: filledText(match?.season),
      friendly: false,
      completed: true,
      home: filledText(match?.home?.name) ?? filledText(match?.home?.sourceName) ?? '',
      away: filledText(match?.away?.name) ?? filledText(match?.away?.sourceName) ?? '',
      homeTeamId: match?.home?.externalIds?.espn ?? null,
      awayTeamId: match?.away?.externalIds?.espn ?? null,
      homeGoals: score.home,
      awayGoals: score.away,
    }
    : null;
  return displayableHeadToHead(mergeH2h(snapshot?.h2h ?? [], self, 3));
}

/**
 * مجمل المواجهات من الصفوف المعروضة نفسها: فوز المضيف / تعادل / فوز الضيف.
 * نسبة الفوز بمعرّف فريق المصدر إن حمله الصف وطرفُ المباراة، وإلا بمطابقة
 * الاسم كما يُعرض (الاسم العربي أو اسم المصدر). صفٌّ واحد لا يُنسب لأحدهما
 * يُسقط السطر كله (`null`) — لا تخمين ولا «أخرى».
 *
 * `home`/`away`: نص الاسم، أو طرف المباراة `{ name, sourceName, shortName, externalIds }`.
 */
export function headToHeadSummary(entries, home, away) {
  const rows = displayableHeadToHead(entries);
  const sides = [h2hSide(home), h2hSide(away)];
  if (rows.length === 0 || sides.some(side => side === null)) return null;
  if (sides[0].id !== null && sides[0].id === sides[1].id) return null;
  if (sides[0].names.some(name => sides[1].names.includes(name))) return null;
  const summary = { homeWins: 0, draws: 0, awayWins: 0, total: rows.length };
  for (const entry of rows) {
    const hg = finiteNumber(entry.homeGoals);
    const ag = finiteNumber(entry.awayGoals);
    if (hg === null || ag === null) return null;
    if (hg === ag) { summary.draws += 1; continue; }
    const winnerId = firstString(hg > ag ? entry.homeTeamId : entry.awayTeamId);
    const winnerName = normalizeName(hg > ag ? entry.home : entry.away);
    const index = sides.findIndex(side => (winnerId !== null && side.id !== null)
      ? side.id === winnerId
      : (winnerName !== null && side.names.includes(winnerName)));
    if (index === 0) summary.homeWins += 1;
    else if (index === 1) summary.awayWins += 1;
    else return null;
  }
  return summary;
}

function normalizeName(value) {
  const text = filledText(value);
  return text ? text.replace(/\s+/g, ' ').toLowerCase() : null;
}

function h2hSide(side) {
  if (typeof side === 'string') {
    const name = normalizeName(side);
    return name ? { id: null, names: [name] } : null;
  }
  if (!side || typeof side !== 'object') return null;
  const names = [side.name, side.sourceName, side.shortName].map(normalizeName).filter(Boolean);
  const id = firstString(side.externalIds?.espn);
  return names.length > 0 || id !== null ? { id, names } : null;
}

/** معطيات المقارنة الموسمية كما تصل، محصنة ضد صف المقارنة الناقصة. */
export function comparisonFor(snapshot) {
  return buildComparison(
    (snapshot?.seasonComparison ?? []).map(metric => ({ ...metric, mode: 'season' })),
    { mode: 'season', sample: snapshot?.seasonSample ?? null, provider: snapshot?.provider ?? null },
  );
}

/* ─────────────────────── مجموعات الأرقام وسهولة المسح ─────────────────────── */

/* التجميع بـ`key` الذي يرسله وسيط الموقع، لا بالتسمية العربية: التسمية قد
   تتغيّر في الطبقة التالية، والمفتاح هو ما يربط الرقم بمصدره. */
export const STAT_GROUPS = [
  { id: 'possession-passing', label: 'الاستحواذ والتمرير', keys: ['possessionPct', 'totalPasses', 'accuratePasses', 'passPct'] },
  { id: 'shots', label: 'التسديد', keys: ['totalShots', 'shotsOnTarget', 'blockedShots', 'shotPct', 'penaltyKickShots', 'penaltyKickGoals'] },
  {
    id: 'build-up',
    label: 'بناء الهجمة',
    keys: ['totalCrosses', 'accurateCrosses', 'crossPct', 'totalLongBalls', 'accurateLongBalls', 'longballPct', 'wonCorners'],
  },
  { id: 'defense', label: 'الدفاع', keys: ['totalTackles', 'effectiveTackles', 'tacklePct', 'interceptions', 'totalClearance', 'effectiveClearance'] },
  { id: 'goalkeeping', label: 'حراسة المرمى', keys: ['saves'] },
  { id: 'discipline', label: 'الانضباط', keys: ['foulsCommitted', 'offsides', 'yellowCards', 'redCards'] },
];

/* كل مفتاح تعرفه الطبقة مُجمَّع؛ ما يرسله مصدر لاحقاً بلا تعريف عندنا لا
   يُرمى ولا يُجمَع قسراً مع جيران لا علاقة له بهم. */
export const STAT_GROUP_FALLBACK = { id: 'source-other', label: 'أرقام أخرى من المصدر' };

/**
 * صف مقارنة واحد: القيمتان كما وردتا، الفارق، ونسبة كل طرف إلى الأعلى بينهما.
 *
 * • `home`/`away` رقم أو `null` — الغياب يبقى غياباً ولا يُستكمل صفراً.
 * • `bar` نسب 0–1 من الأكبر بين الطرفين، للتمثيل البصري فقط؛ لا تُجمع ولا
 *   تُقرأ منها «أفضلية»، صفران حقيقيان يعطيان نصفين متساويين.
 * • `difference` عدد مطلق بلا حكم: من يقرأ «الأخطاء: ٩ مقابل ١٤» لا يحتاج من
 *   يقول له إن ٩ أفضل — بل قد يعكسه.
 */
export function compareStatRow(stat) {
  const home = finiteNumber(stat?.home);
  const away = finiteNumber(stat?.away);
  const both = home !== null && away !== null;
  const peak = both ? Math.max(Math.abs(home), Math.abs(away)) : 0;
  const unit = filledText(stat?.unit);
  return {
    key: filledText(stat?.key) ?? filledText(stat?.label) ?? '',
    label: filledText(stat?.label) ?? '',
    unit,
    /** هل الوحدة نسبة مئوية؟ تُلاحق الرقم مباشرة («58%») لا في التسمية. */
    unitIsPercent: unit === '%',
    home,
    away,
    both,
    difference: both ? Math.abs(home - away) : null,
    /** الطرف الأوفر رقماً — وصفٌ للكمية لا للأفضلية. */
    leadingSide: both && home !== away ? (home > away ? 'home' : 'away') : null,
    comparable: both,
    /* طرف بلا رقم ⇒ لا مقارنة، فلا يُرسم شريطٌ لصفّ نصفُه اختلاق. */
    bar: {
      home: both ? (peak > 0 ? Math.abs(home) / peak : 0.5) : null,
      away: both ? (peak > 0 ? Math.abs(away) / peak : 0.5) : null,
    },
  };
}

/** الأرقام المتاحة مجمَّعة في مجموعات يسهل مسحها؛ والمجموعة الفارغة لا تُنشأ. */
export function groupStatistics(statistics) {
  const rows = displayableStatistics(statistics);
  if (rows.length === 0) return [];
  const groupOf = new Map();
  STAT_GROUPS.forEach((def, index) => def.keys.forEach(key => groupOf.set(key, index)));
  const buckets = STAT_GROUPS.map(() => new Map());
  const extra = [];
  for (const row of rows) {
    const index = groupOf.get(row.key);
    if (index === undefined) { extra.push(row); continue; }
    const bucket = buckets[index];
    /* ترتيب المجموعة ثابت كما عُرّفت، لا كما جاءت في الاستجابة: «مجموعات سهلة
       المسح» تعني أن يقرأ المحلل الصفوف بالترتيب نفسه في كل مباراة وفي كل
       قراءة. ومفتاح مكرر من المصدر يُدمج في أول صف له بدل صفّين متجاورين. */
    if (!bucket.has(row.key)) bucket.set(row.key, row);
  }
  const groups = [];
  STAT_GROUPS.forEach((def, index) => {
    const bucket = buckets[index];
    const ordered = def.keys.map(key => bucket.get(key)).filter(Boolean);
    if (ordered.length > 0) {
      groups.push({ id: def.id, label: def.label, rows: ordered.map(compareStatRow) });
    }
  });
  if (extra.length > 0) {
    groups.push({ id: STAT_GROUP_FALLBACK.id, label: STAT_GROUP_FALLBACK.label, rows: extra.map(compareStatRow) });
  }
  return groups;
}

/**
 * شريط الاستحواذ البارز: يُرسم فقط إذا وصلت نسبتا الطرفين رقميتين معاً.
 * النسبة المكتوبة رقم المصدر كما هو، وعرض الشريط منسوب إلى مجموعهما — حرس
 * بصري وحده إن لم يبلغ المجموع 100 بسبب التقريب، لا تعديل على الرقم.
 */
export function possessionSplit(statistics) {
  const row = displayableStatistics(statistics).find(stat => stat.key === 'possessionPct');
  const home = finiteNumber(row?.home);
  const away = finiteNumber(row?.away);
  if (home === null || away === null || home < 0 || away < 0 || home + away <= 0) return null;
  const total = home + away;
  return { home, away, homeShare: home / total, awayShare: away / total };
}

/* عدّادات بطاقة الفريق على الملعب: من جدول الإحصائيات نفسه لا من الأحداث،
   حتى يبقى الرقم على الملعب هو الرقم في الجدول. الحبّة بلا قيمة تُحذف. */
export const PITCH_COUNTERS = [
  { id: 'yellow', key: 'yellowCards', label: 'صفراء' },
  { id: 'red', key: 'redCards', label: 'حمراء' },
  { id: 'corners', key: 'wonCorners', label: 'ركنيات' },
];

export function pitchCounters(statistics, side) {
  if (side !== 'home' && side !== 'away') return [];
  const rows = displayableStatistics(statistics);
  return PITCH_COUNTERS.flatMap(({ id, key, label }) => {
    const value = finiteNumber(rows.find(stat => stat.key === key)?.[side]);
    return value === null ? [] : [{ id, label, value }];
  });
}

/**
 * ملخص رقمي موجز: صفّان حاضران فقط. لا «سيطرة»، ولا «أفضلية»، ولا جودة
 * فرص — هذه أرقام Source لا تُثبت شيئاً منها، والبند 6 يمنع استنتاجاً من
 * أرقام لا تحتمله.
 */
export function analysisFacts(statistics) {
  return displayableStatistics(statistics)
    .map(compareStatRow)
    .filter(row => row.both);
}

/* ───────────────────────── عدد أحداث المصدر كما وردت ───────────────────────── */

/** وقائع معدودة لا استنتاجات: كم حدثاً وصل، وكيف توزّع، وكم ملغى. */
export function summarizeSourceEvents(events) {
  const list = renderableEvents(events);
  const counted = {
    total: list.length,
    onTimeline: 0,
    untimed: 0,
    cancelled: 0,
    bySide: { home: 0, away: 0, unassigned: 0 },
    types: [],
    periods: [],
    firstMinute: null,
    lastMinute: null,
  };

  const typeCounts = new Map();
  const periodCounts = new Map();
  for (const event of list) {
    if (eventOnTimeline(event)) {
      counted.onTimeline += 1;
      const minute = event.minute;
      counted.firstMinute = counted.firstMinute === null ? minute : Math.min(counted.firstMinute, minute);
      counted.lastMinute = counted.lastMinute === null ? minute : Math.max(counted.lastMinute, minute);
    } else {
      counted.untimed += 1;
    }
    if (event.cancelled === true) counted.cancelled += 1;
    const side = event.teamSide === 'home' || event.teamSide === 'away' ? event.teamSide : 'unassigned';
    counted.bySide[side] += 1;

    const facet = eventTypeFacet(event);
    const seen = typeCounts.get(facet) || { value: facet, label: eventTypeFacetLabel(facet, list), count: 0 };
    seen.count += 1;
    typeCounts.set(facet, seen);

    const info = eventPeriodInfo(event.period);
    const periodValue = info ? info.value : 'none';
    const periodLabel = info ? info.label : 'شوط غير مبيَّن من المصدر';
    const periodSeen = periodCounts.get(periodValue) || { value: periodValue, label: periodLabel, count: 0 };
    periodSeen.count += 1;
    periodCounts.set(periodValue, periodSeen);
  }

  counted.types = [...typeCounts.values()];
  counted.periods = [...periodCounts.values()];
  return counted;
}

/* ───────────────────────── فلاتر أحداث التحليل ───────────────────────── */

export const EVENT_FILTER_ALL = 'all';
export const EVENT_FILTER_NO_PERIOD = 'none';
export const EVENT_FILTER_NO_SIDE = 'unassigned';

export const EVENT_FILTER_DEFAULTS = { team: EVENT_FILTER_ALL, period: EVENT_FILTER_ALL, type: EVENT_FILTER_ALL };

function eventSideValue(event) {
  return event?.teamSide === 'home' || event?.teamSide === 'away' ? event.teamSide : EVENT_FILTER_NO_SIDE;
}

function eventPeriodValue(event) {
  const info = eventPeriodInfo(event?.period);
  return info ? info.value : EVENT_FILTER_NO_PERIOD;
}

export function eventMatchesFilters(event, filters = {}) {
  if (!isRenderableEvent(event)) return false;
  const team = filters?.team ?? EVENT_FILTER_ALL;
  const period = filters?.period ?? EVENT_FILTER_ALL;
  const type = filters?.type ?? EVENT_FILTER_ALL;
  if (team !== EVENT_FILTER_ALL && eventSideValue(event) !== team) return false;
  if (period !== EVENT_FILTER_ALL && eventPeriodValue(event) !== period) return false;
  if (type !== EVENT_FILTER_ALL && eventTypeFacet(event) !== type) return false;
  return true;
}

/** الفلترة على أحداث المصدر المطبَّعة نفسها — لا نسخة ثانية من القائمة. */
export function filterEvents(events, filters = {}) {
  return renderableEvents(events).filter(event => eventMatchesFilters(event, filters));
}

/**
 * خيارات الفلاتر مشتقة من الأحداث الموجودة وحدها: خيارٌ بلا حدث يطابقه لا
 * معنى له، و«عرض الكل» يبقى الخيار الافتراضي الذي لا يحذف شيئاً.
 */
export function eventFilterOptions(events, { homeName = null, awayName = null } = {}) {
  const list = renderableEvents(events);
  const summary = summarizeSourceEvents(list);
  const sideLabels = { home: homeName || EVENT_SIDE_LABELS.home, away: awayName || EVENT_SIDE_LABELS.away, [EVENT_FILTER_NO_SIDE]: EVENT_SIDE_LABELS.unassigned };
  const team = Object.entries(summary.bySide)
    .filter(([, count]) => count > 0)
    .map(([value, count]) => ({ value, label: sideLabels[value] || value, count }));
  return {
    total: list.length,
    team,
    period: summary.periods.map(entry => ({ ...entry })),
    type: summary.types.map(entry => ({ ...entry })),
  };
}

/** كم فلترًا نشطاً؟ — لتسمية زر «عرض الكل» وحالته بلا خلل. */
export function activeEventFilterCount(filters = {}) {
  return Object.entries(EVENT_FILTER_DEFAULTS).reduce((total, [key, defaultValue]) => {
    const value = filters?.[key];
    return total + (typeof value === 'string' && value !== '' && value !== defaultValue ? 1 : 0);
  }, 0);
}

/* ─────────────────── الغياب الموصوف: ما لا يصل من المصدر ─────────────────── */

/**
 * أقسام لا تُعرض لأن بياناتها لا تصل. تُقال بصريح العبارة بدل مصفوفة
 * فارغة أو أصفار — «لا يتوفر» جواب، وليس فشلاً يُخفى.
 */
export function unavailableDataNotes(snapshot) {
  const notes = [];
  if (confirmedLineupSides(snapshot?.lineups ?? null).length === 0) {
    notes.push({ id: 'lineups', text: 'التشكيلات: لا توجد تشكيلة أساسية مؤكدة في القراءة الحالية؛ لا تُخمَّن أسماء أو مراكز.' });
  }
  if (displayableRatings(snapshot?.ratings ?? null).length === 0) {
    notes.push({ id: 'ratings', text: 'تقييمات اللاعبين: لا يوردها المصدر؛ لا تُعرض ولا تُستبدل بأرقام تُحسب محلياً.' });
  }
  if (displayableComparisonAxes(comparisonFor(snapshot)).length === 0) {
    notes.push({ id: 'comparison', text: 'مقارنة الموسم: لا تصل أرقامها ولا حجم عينتها، فلا يُرسم مضلع ولا تُعرض متوسطات.' });
  }
  notes.push({ id: 'spatial', text: 'الأحداث لا تحمل إحداثيات مكانية، ولا يرسل المصدر نموذج أهداف متوقعة (xG)؛ فلا خرائط تسديد ولا تمرير ولا مناطق ضغط.' });
  return notes;
}

/** هل يوجد ما يُحلَّل؟ أحداث فعلية أو أرقام فعلية — لا عنوان فارغ لتبويب. */
export function analysisIsAvailable(snapshot) {
  return renderableEvents(snapshot?.events).length > 0
    || displayableStatistics(snapshot?.statistics).length > 0;
}

/** هل للمباراة تحليل مكتوب (من match-analysis.json)؟ */
export function hasMatchAnalysis(match) {
  return typeof match?.analysisSlug === 'string' && match.analysisSlug.trim() !== '';
}

/* ───────────────────────── ترتيب التبويبات وآليته ───────────────────────── */

export function hasPreviewFacts(match, snapshot, status) {
  const competition = filledText(match?.competitionName);
  const venue = snapshot ? filledText(snapshot.venue) : filledText(match?.venue);
  const kickoffVisible = canShowKickoff(status)
    && typeof match?.kickoffUtc === 'string'
    && Number.isFinite(Date.parse(match.kickoffUtc));
  return Boolean(
    competition
      || venue
      || kickoffVisible
      || filledText(match?.season)
      || (typeof match?.round === 'number' && Number.isFinite(match.round))
      || filledText(match?.round),
  );
}

/** المرحلة أولاً ثم توافر بيانات المصدر، للواجهة والروابط والطباعة معاً. */
export function computeAvailableTabs({ match, snapshot, status }) {
  const tabs = [];
  if (hasPreviewFacts(match, snapshot, status)
    || headToHeadFor(match, snapshot, status).length > 0
    || confirmedLineupSides(snapshot?.lineups ?? null).length > 0) tabs.push('prematch');
  if ((status?.phase === 'pre' || status?.phase === 'live')
    && (canShowKickoff(status) && Number.isFinite(Date.parse(match?.kickoffUtc))
      || snapshot && (isValidScore(snapshot.score) || analysisIsAvailable(snapshot)))) tabs.push('live');
  if (hasMatchAnalysis(match)) tabs.push('analysis');
  if (status?.phase === 'post' && (analysisIsAvailable(snapshot)
    || isResultOfficial(status, snapshot?.score ?? null))) tabs.push('postmatch');
  return tabs;
}
/* ─────────────────────── أدوات داخلية ─────────────────────── */

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

/* يميّز الصفر الحقيقي من الغياب: `0` رقم صالح ويعود `0`، بينما `null`
   و`undefined` و`''` و`NaN` تعود `null`. هذا الفرق هو ما يمنع تحويل
   «غير متاح» إلى صفر في النتيجة والتقييمات ومحاور الرادار. */
function firstNumber(...values) {
  for (const value of values) {
    const parsed = toFiniteOrNull(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

function toFiniteOrNull(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

// Explicit source position codes only. Row grouping is schematic, not tracking data.
const PITCH_ROLES = new Map([
  ['حارس المرمى', ['G']], ['الدفاع', ['CD', 'CD-L', 'CD-R', 'LB', 'RB']],
  ['الوسط', ['LM', 'RM', 'CM', 'CM-L', 'CM-R', 'DM', 'DM-L', 'DM-R']],
  ['الوسط الهجومي', ['AM', 'AM-L', 'AM-R']], ['الهجوم', ['F', 'CF', 'CF-L', 'CF-R']],
]);

/** All placement, linking and filtering live here, never in presentation components. */
export function lineupPitchSides({ match, snapshot }) {
  const lineups = snapshot?.lineups;
  if (snapshot?.provider !== 'espn' || lineups?.provider !== 'espn'
      || !lineups.eventId || String(lineups.eventId) !== String(match?.externalIds?.espn)) return [];
  const usedIds = new Set();
  const result = [];
  for (const side of ['home', 'away']) {
    const squad = lineups[side];
    if (squad?.confirmed !== true) continue;
    if (!squad.teamId || String(squad.teamId) !== String(match?.[side]?.externalIds?.espn)
        || !Array.isArray(squad.starters) || squad.starters.length !== 11 || !Array.isArray(squad.substitutes)) return [];
    const players = [...squad.starters, ...squad.substitutes];
    for (const player of players) {
      if (!player?.id || !player.name || usedIds.has(String(player.id))) return [];
      usedIds.add(String(player.id));
    }
    const events = (snapshot?.status?.phase === 'live' || snapshot?.status?.phase === 'post')
      ? [...new Map(renderableEvents(snapshot.events).filter(eventOnTimeline)
        .filter(event => event.type !== 'other')
        .map(event => [eventKey(match.id, event), event])).values()] : [];
    const decorate = (player) => ({ ...player, badges: events.flatMap(event => {
      if (event.teamSide !== side || (event.sourceTeamId != null && String(event.sourceTeamId) !== String(squad.teamId))) return [];
      const isPlayer = String(event.player?.id ?? '') === String(player.id);
      const isOutgoing = event.type === 'substitution' && String(event.relatedPlayer?.id ?? '') === String(player.id);
      if (!isPlayer && !isOutgoing) return [];
      return [{ event, label: describeEvent(event), minute: eventMinuteLabel(event), typeLabel: eventTypeName(event, 'حدث'),
        role: event.type === 'substitution' ? (isOutgoing ? 'خروج' : 'دخول') : null }];
    }) });
    const rows = [...PITCH_ROLES].map(([label, positions]) => ({ label,
      players: squad.starters.filter(player => positions.includes(player.positionCode)).map(decorate),
    })).filter(row => row.players.length);
    // An unknown position must not silently invent a slot or drop a starter.
    if (rows.reduce((count, row) => count + row.players.length, 0) !== 11) continue;
    result.push({ side, teamName: match[side].name, formation: squad.formation ?? null, rows,
      substitutes: squad.substitutes.map(decorate).filter(player => player.badges.length),
    });
  }
  return result;
}

/* ─────────────── المعاينة: حقائقها وموضعها (الملعب أو اللوحة) ─────────────── */

/**
 * حقائق المباراة الست بمصدر واحد للملعب واللوحة معاً: المسابقة، الموسم،
 * الجولة، الملعب، موعد القاهرة، موعد مكة — بما وصل فقط، والموعد التالف يُحذف
 * بدل قيمة بديلة.
 */
export function previewFacts(match, snapshot, status) {
  const competition = filledText(match?.competitionName);
  const season = filledText(match?.season);
  const round = typeof match?.round === 'number' && Number.isFinite(match.round)
    ? String(match.round)
    : filledText(match?.round);
  const venue = snapshot ? filledText(snapshot.venue) : filledText(match?.venue);
  let cairo = null;
  let mecca = null;
  if (canShowKickoff(status) && typeof match?.kickoffUtc === 'string' && Number.isFinite(Date.parse(match.kickoffUtc))) {
    try {
      const time = kickoffLabel(match.kickoffUtc, 'Africa/Cairo');
      let day = null;
      try {
        day = formatInZone(match.kickoffUtc, 'Africa/Cairo', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      } catch { day = null; }
      cairo = `${time}${day ? ` · ${day}` : ''}`;
      mecca = kickoffLabel(match.kickoffUtc, 'Asia/Riyadh');
    } catch {
      cairo = null;
      mecca = null;
    }
  }
  return [
    ['competition', 'المسابقة', competition],
    ['season', 'الموسم', season],
    ['round', 'الجولة', round],
    ['venue', 'الملعب', venue],
    ['cairo', 'موعد القاهرة', cairo],
    ['mecca', 'موعد مكة', mecca],
  ].flatMap(([id, label, value]) => (value ? [{ id, label, value }] : []));
}

/**
 * للمحتوى بيت واحد في كل لحظة: المعاينة على الملعب ما دام الملعب لا يرسم
 * تشكيلة والمباراة لم تنطلق بعد، وتعود إلى لوحة «قبل المباراة» حين تحل
 * التشكيلة محلها على الملعب — أو حين تنطلق المباراة فيصير الملعب للأحداث
 * والنتيجة (مباشر/بعد المباراة/حالة نهائية) ولو لم تصل تشكيلة قط.
 * المرجع للتشكيلة هو ما يُرسم فعلاً (`lineupPitchSides`)، لا «مؤكدة» نظرياً:
 * تشكيلة تعذّر رسمها لا تُخلي الملعب من المعاينة قبل الانطلاق.
 * الحالة قبل أول قراءة (`status` غائبة أو `unknown`) تُعامل كما قبل المباراة.
 */
export function previewPlacement({ match, snapshot, status = null }) {
  if (status?.phase && status.phase !== 'pre') return 'panel';
  return lineupPitchSides({ match, snapshot }).length > 0 ? 'panel' : 'pitch';
}

/* ─────────────── أسماء المراكز بالعربية (رموز المصدر الصريحة فقط) ─────────────── */

const POSITION_LABELS_AR = new Map([
  ['G', 'حارس المرمى'],
  ['CD', 'قلب دفاع'], ['CD-L', 'قلب دفاع أيسر'], ['CD-R', 'قلب دفاع أيمن'],
  ['LB', 'ظهير أيسر'], ['RB', 'ظهير أيمن'],
  ['DM', 'وسط دفاعي'], ['DM-L', 'وسط دفاعي أيسر'], ['DM-R', 'وسط دفاعي أيمن'],
  ['CM', 'وسط'], ['CM-L', 'وسط أيسر'], ['CM-R', 'وسط أيمن'],
  ['LM', 'جناح أيسر'], ['RM', 'جناح أيمن'],
  ['AM', 'وسط هجومي'], ['AM-L', 'وسط هجومي أيسر'], ['AM-R', 'وسط هجومي أيمن'],
  ['F', 'مهاجم'], ['CF', 'مهاجم'], ['CF-L', 'مهاجم أيسر'], ['CF-R', 'مهاجم أيمن'],
]);

/** كل رموز المراكز التي يوزّعها الملعب — للاختبار: لكل رمز تسمية. */
export const PITCH_POSITION_CODES = [...PITCH_ROLES.values()].flat();

/** تسمية عربية لرمز مركز المصدر، أو `null` لرمز غير معروف فيبقى الرمز وحده. */
export function positionLabelAr(code) {
  const key = filledText(code);
  return key ? POSITION_LABELS_AR.get(key.toUpperCase()) ?? null : null;
}
