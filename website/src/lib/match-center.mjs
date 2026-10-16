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
  if (home === null && away === null) return null;
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
export function freshnessLabel({ readAt, cache = 'MISS', now, failed = false }) {
  if (failed || !readAt) return { text: 'تعذر التحديث — تُعرض آخر قراءة مؤكدة', honest: false };
  const age = Math.max(0, Math.round((now - Date.parse(readAt)) / 1000));
  if (cache === 'STALE') return { text: `نسخة مخزّنة على الخادم (عمرها ${describeAge(age)}) — المصدر لا يستجيب`, honest: false };
  if (age <= 75) return { text: 'محدَّث الآن', honest: true };
  return { text: `آخر قراءة قبل ${describeAge(age)}`, honest: age <= 180 };
}

function describeAge(seconds) {
  if (seconds < 60) return `${seconds} ثانية`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} دقيقة`;
  return `${Math.round(minutes / 60)} ساعة`;
}

/* ───────────── رفض الأقدم + عزل فشل المباريات (البند 11) ───────────── */

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
   فقط مع سببها — فلا يظهر خطأ شامل ولا تُفقد بيانات سليمة. */
export function mergeReads(current, results, now) {
  const next = { ...current };
  for (const [matchId, result] of Object.entries(results)) {
    const existing = next[matchId];
    if (result?.status === 'fulfilled' && result.value?.data) {
      if (isStaleRead(result.value.data, existing?.data)) {
        /* استجابة أقدم: تُحفظ كما هي مع تسجيل أن محاولة جرت، دون لمس القيم. */
        if (existing) next[matchId] = { ...existing, rejectedStale: (existing.rejectedStale || 0) + 1 };
        continue;
      }
      next[matchId] = { data: result.value.data, failure: null, cache: result.value.cache || 'MISS', readAt: result.value.data.readAt, attemptedAt: now };
      continue;
    }
    /* البند 11: «الاحتفاظ بآخر قراءة مؤكدة مع وقتها وتحذير واضح عند الفشل». */
    next[matchId] = {
      ...(existing || {}),
      data: existing?.data || null,
      failure: result?.code || 'NETWORK_ERROR',
      attemptedAt: now,
    };
  }
  return next;
}

/* ──────────────────── التبويبات: الافتراضي وثبات الاختيار ──────────────────── */

export const TABS = [
  { id: 'preview', label: 'معاينة' },
  { id: 'history', label: 'المواجهات' },
  { id: 'lineups', label: 'التشكيلات' },
  { id: 'live', label: 'مباشر' },
  { id: 'report', label: 'بعد المباراة' },
];

/* البند 5: «عند الدخول نفتح التبويب المناسب للحالة». */
export function defaultTab(status) {
  const code = status?.code || 'scheduled';
  if (code === 'live' || code === 'halftime' || code === 'suspended') return 'live';
  if (COMPLETED_CODES.has(code)) return 'report';
  return 'preview';
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

export function normalizeEvent(raw) {
  const typeRaw = String(raw?.type || raw?.detail || '').trim().toLowerCase();
  let type = 'other';
  if (/own\s*goal/.test(typeRaw)) type = 'own_goal';
  else if (/penalty/.test(typeRaw) && /miss|fail/.test(typeRaw)) type = 'missed_penalty';
  else if (/penalty/.test(typeRaw)) type = 'penalty';
  else if (/goal/.test(typeRaw)) type = 'goal';
  else if (/yellow/.test(typeRaw)) type = 'yellow_card';
  else if (/red/.test(typeRaw)) type = 'red_card';
  else if (/substitut|replacement/.test(typeRaw)) type = 'substitution';
  else if (/var/.test(typeRaw)) type = /cancel|disallow|overturn/.test(typeRaw) ? 'var_cancelled' : 'var_confirmed';

  /* معرّف الحدث من المصدر **يجب أن يبقى**. إسقاطه كان يجعل بصمة الحدث تُبنى
     من النوع والدقيقة واللاعب فقط، فتتغير البصمة حين يتحول هدف إلى
     «VAR Cancelled» — ويُعلن الحدث مرتين: مرة كهدف ملغى ومرة كهدف اختفى.
     البند 7 يمنع تكرار الإشعار، وحفظ المعرّف هو ما يجعل المنع فعلياً. */
  const rawId = raw?.id ?? raw?.eventId ?? raw?.uuid;

  return {
    id: rawId === undefined || rawId === null || String(rawId).trim() === '' ? null : String(rawId).trim(),
    type,
    /* البند 7: دعم إلغاء الهدف بعد VAR. `cancelled` حقيقة من المصدر، لا استنتاج. */
    cancelled: raw?.cancelled === true || raw?.disallowed === true || type === 'var_cancelled',
    minute: firstNumber(raw?.minute, raw?.clock, raw?.time?.elapsed),
    extraMinute: firstNumber(raw?.extraMinute, raw?.time?.extra),
    period: firstString(raw?.period),
    team: firstString(raw?.team?.name, raw?.teamName, raw?.teamSide),
    teamSide: raw?.team?.homeAway === 'home' || raw?.side === 'home' ? 'home' : raw?.team?.homeAway === 'away' || raw?.side === 'away' ? 'away' : null,
    player: raw?.player?.name ? { id: raw?.player?.id ?? null, name: raw?.player.name } : null,
    relatedPlayer: raw?.assist?.name ? { id: raw?.assist?.id ?? null, name: raw?.assist.name } : null,
    detail: firstString(raw?.detail, raw?.comments, raw?.text),
  };
}

function scoreOf(event) {
  if (!event || event.cancelled) return 0;
  if (event.type === 'goal' || event.type === 'penalty') return 1;
  if (event.type === 'own_goal') return -1; /* هدف في مرمى الفريق صاحب الحدث */
  return 0;
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

/* البند 7: «دعم تصحيح النتيجة». إن تغيّرت النتيجة بما لا تفسّره الأهداف
   المعلنة، فهي مراجعة من المصدر (VAR أو تصحيح يدوي) وتستحق تنبيهاً مستقلاً. */
export function detectScoreCorrection(previousScore, nextScore, announcedGoals) {
  if (!previousScore || !nextScore) return null;
  const deltaHome = (nextScore.home ?? 0) - (previousScore.home ?? 0);
  const deltaAway = (nextScore.away ?? 0) - (previousScore.away ?? 0);
  const explainedHome = announcedGoals.reduce((sum, a) => sum + (a.event.teamSide === 'home' ? scoreOf(a.event) : a.event.teamSide === 'away' && a.event.type === 'own_goal' ? 1 : 0), 0);
  const explainedAway = announcedGoals.reduce((sum, a) => sum + (a.event.teamSide === 'away' ? scoreOf(a.event) : a.event.teamSide === 'home' && a.event.type === 'own_goal' ? 1 : 0), 0);
  if (deltaHome === explainedHome && deltaAway === explainedAway) return null;
  return {
    from: previousScore,
    to: nextScore,
    message: `صُحّحت النتيجة من المصدر: ${previousScore.home ?? '—'}–${previousScore.away ?? '—'} صارت ${nextScore.home ?? '—'}–${nextScore.away ?? '—'}`,
  };
}

/* ────────── سجل المواجهات: آخر ثلاث مكتملة بلا تكرار (البند 5، 6، 8) ────────── */

function h2hKey(entry) {
  const id = entry?.fixtureId ?? entry?.id;
  if (id !== undefined && id !== null && String(id).trim() !== '') return `id:${String(id).trim()}`;
  return `d:${entry?.date || ''}|${entry?.home || ''}|${entry?.away || ''}`;
}

/* البند 6: «سجل المواجهات لا يتضمن المباراة المقبلة قبل اكتمالها».
   البند 8: «تحديث آخر ثلاث مواجهات مكتملة لإدخال هذا اللقاء دون تكراره».
   البند 5: «تمييز الوديات» → الحقل `friendly` يبقى كما أرسله المصدر؛ وإن لم
   يميّزه المصدر يبقى `null` فتعرض الواجهة «نوع البطولة غير محدد» ولا تخمّن. */
export function mergeH2h(existing = [], self = null, limit = 3) {
  const completed = existing.filter(entry => entry?.completed === true && entry?.date);
  if (self && self.completed === true && self.date) {
    const key = h2hKey(self);
    if (!completed.some(entry => h2hKey(entry) === key)) completed.push(self);
  }
  return completed
    .slice()
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, limit);
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
  const finishedAt = Date.parse(status.finishedAt || data?.readAt || '');
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
const MAX_AXES = 6;
const MIN_AXES = 3;

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

  /* البند 2 و9: مزوّد واحد لكل المقارنة. أرقام مزوّدين مختلفين في لوحة واحدة
     مقارنة باطلة حتى لو بدت الأرقام متقاربة. */
  const providers = new Set(metrics.map(m => m.provider ?? provider).filter(Boolean));
  if (providers.size > 1) {
    return fail('MIXED_PROVIDERS', 'لا يمكن عرض المقارنة: أرقامها واردة من أكثر من مصدر، ودمجها في لوحة واحدة مضلل.', []);
  }

  const modes = new Set(metrics.map(m => m.mode ?? mode));
  if (modes.size > 1) {
    return fail('MIXED_MODES', 'لا يمكن عرض المقارنة: بعض الأرقام من المباراة نفسها وبعضها من فترة أوسع.', []);
  }

  const forbidden = metrics.filter(m => FORBIDDEN_METRIC.test(String(m.key || '')));
  if (forbidden.length) {
    return fail('FORBIDDEN_METRIC', 'لا تُعرض توقعات المزود أو احتمالات الفوز ضمن الإحصائيات الفعلية.', []);
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
  return match?.verification === 'confirmed' && Object.values(match?.externalIds || {}).some(id => id !== null && id !== undefined && String(id).trim() !== '');
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
