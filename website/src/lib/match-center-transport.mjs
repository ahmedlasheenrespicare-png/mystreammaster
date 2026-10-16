/* ==========================================================================
   طبقة النقل — المزوّد القابل للتبديل
   --------------------------------------------------------------------------
   قرار صاحب المشروع رقم 1 (2026-10-16): «مزوّد قابل للتبديل — يُبنى كل شيء
   على محاكاة كاملة خلف واجهة Provider واحدة، ولم يُعتمد ESPN ولا API-Football
   بعد».

   هذه الطبقة تفصل ثلاثة أشياء كان خلطها مصدر أخطاء حقيقية في التدقيق السابق:

   1) **العنوان** — من أين تُقرأ البيانات. رابط نسبي إلى خادمنا وحده (البند 11)،
      ولا يحمل من الزائر لا معرّف مصدر ولا عنواناً.
   2) **التكييف** — تحويل حمولة المزوّد إلى لقطة العقد. هنا تُعلن مفردات
      المزوّد، وحمولةٌ لا تعلن مصدرها أو لا تعلن أي مباراة تخصّ **تُرفض** ولا
      تُخمَّن (البندان 2 و3).
   3) **المحاكاة** — مزوّد كامل بلا شبكة، للاختبارات والمعاينة.

   قاعدتان بنيويتان:

   • **المحاكاة تمر عبر نفس المكیّف**. `mockSnapshot` تبني حمولة بشكل الخادم
     ثم تدفعها إلى `adaptSnapshot`، فكل اختبار على المحاكاة يختبر مسار
     التحليل الحقيقي أيضاً. لو بُنيت اللقطة مباشرة لتباعد المساران وصار
     الاختبار يثبت ما لا يستعمله الإنتاج.

   • **لا تقرأ هذه الطبقة ساعةً ولا تقرّر حداثةً ولا تدمج**. ذلك كله في
     `lib/match-center.mjs` (`mergeReads`, `isStaleRead`, `readAtProblem`)
     ومختبَر هناك. `readAt` يمر كما ورد — حتى لو كان تالفاً — لأن رفضه هنا
     يعني أن `mergeReads` لن يسجّل سبب الرفض ولن يحفظ آخر قراءة مؤكدة.
========================================================================== */

import {
  deriveScore,
  isVerified,
  normalizeEvent,
  normalizeStatus,
  scoreFromEvents,
} from './match-center.mjs';

/* ─────────────────────────── عناوين النقل ─────────────────────────── */

/** نقطة النهاية الوحيدة التي يكلّمها المتصفح (البند 11: روابط نسبية فقط). */
export const MATCH_CENTER_ENDPOINT = '/match-center.php';

/* ─────────────────── أخطاء النقل ورسائلها العربية ─────────────────── */

/* منفصلة عن `MATCH_CENTER_DIAGNOSTICS` لأن تلك تصف مشاكل **البيانات**
   (قراءة أقدم، وقت مستقبلي، أرقام غير صالحة) وهذه تصف مشاكل **الطلب**.
   خلطهما في جدول واحد يجعل «المصدر رفض الطلب» و«القراءة قديمة» رسالةً واحدة. */
export const TRANSPORT_DIAGNOSTICS = {
  UNKNOWN_MATCH: 'المباراة المطلوبة ليست من مباريات مركز المباراة',
  UNVERIFIED_MATCH: 'لا تُطلب مباراة لم يُؤكَّد معرّفها من المصدر بعد',
  UNDECLARED_PROVIDER: 'الاستجابة لا تعلن مصدرها، فلا تُقرأ مفرداتها بجدول مزوّد آخر',
  MISSING_MATCH_BINDING: 'الاستجابة لا تقول أي مباراة تخصّ، فلا يمكن ربطها',
  MISMATCHED_MATCH: 'الاستجابة تخص مباراة أخرى — رُفضت حتى لا تنتقل نتيجة مباراة إلى صفحة غيرها',
  EMPTY_PAYLOAD: 'وصلت استجابة فارغة أو ليست كائناً',
  MALFORMED_JSON: 'استجابة الخادم ليست JSON صالحاً',
  MOCK_DISABLED: 'المحاكاة معطّلة خارج بيئة التطوير',
  UNSUPPORTED_PROVIDER: 'المزوّد المطلوب غير مسجّل في طبقة النقل',
  NETWORK_ERROR: 'تعذّر الاتصال بخادم الموقع',
};

/** خطأ نقل يحمل رمزاً — تستهلكه `mergeReads` عبر `settle` أدناه. */
export class TransportError extends Error {
  constructor(code, detail = null) {
    super(detail ? `${TRANSPORT_DIAGNOSTICS[code] || code}: ${detail}` : TRANSPORT_DIAGNOSTICS[code] || code);
    this.name = 'TransportError';
    this.code = code;
    this.detail = detail;
  }
}

/** نص عربي لأي رمز، بما فيها رموز HTTP الديناميكية. */
export function describeTransportCode(code) {
  const normalized = String(code || '').trim().toUpperCase();
  if (normalized in TRANSPORT_DIAGNOSTICS) return TRANSPORT_DIAGNOSTICS[normalized];
  if (/^HTTP_(\d{3})$/.test(normalized)) return `استجاب خادم الموقع برمز HTTP ${normalized.slice(5)}`;
  return 'خطأ غير محدد أثناء جلب بيانات المباراة';
}

/* ───────────────────────── سجل المزوّدين ───────────────────────── */

export const SERVER_PROVIDER_ID = 'server';
export const MOCK_PROVIDER_ID = 'mock';

/* «قابل للتبديل» يعني أن التبديل لا يتطلب تعديل المكوّنات: كل مزوّد مسجّل
   هنا بوصفه واسمه وحدوده، والواجهة تسأل السجل ولا تسأل مزوّداً بعينه. */
export const PROVIDERS = [
  {
    id: SERVER_PROVIDER_ID,
    label: 'خادم الموقع',
    kind: 'endpoint',
    note: 'يقرأ `match-center.php`، وهو يكلّم المصدر ويخبّئ النتيجة لكل الزوار (البند 11).',
  },
  {
    id: MOCK_PROVIDER_ID,
    label: 'محاكاة كاملة',
    kind: 'mock',
    /* البند 2: لا نَعِد بما لا يغطيه الربط. المحاكاة تُظهر السلوك (الحالات،
       العدّاد، منع تكرار الأهداف) ولا تُظهر بيانات حقيقية، وتُوسم في الواجهة. */
    note: 'مزوّد محلي بلا شبكة للاختبارات والمعاينة. لا يُستدعى في البناء المنشور ما لم يُسمح به صراحةً.',
  },
];

/**
 * المزوّد بالاسم. الغياب (بلا قيمة أو فارغ) يعني المزوّد الافتراضي = خادمنا،
 * لا «مجهول»: فالافتراض الآمن هو الطريق الحقيقي، أما اسم غير مسجّل فيُرفض.
 */
export function resolveProvider(id) {
  const wanted = String(id ?? SERVER_PROVIDER_ID).trim() || SERVER_PROVIDER_ID;
  return PROVIDERS.find(provider => provider.id === wanted) || null;
}

export function providerIds() {
  return PROVIDERS.map(provider => provider.id);
}

/* ───────────────────── أدوات صغيرة مشتركة ───────────────────── */

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return null;
}

/* الغياب يصير `null` — لا `{}` ولا `0` ولا `[]`. البند 8: «القيم الناقصة تبقى
   «غير متاح» ولا تتحول أصفاراً». قيمة افتراضية بشكل صحيح تُعرض رقماً بلا أصل. */
function absentToNull(value) {
  return value === undefined ? null : value;
}

/* ───────────────────────── عنوان الطلب ───────────────────────── */

/**
 * هل المباراة صالحة لأن تُطلب من المصدر أصلاً؟
 *
 * البند 3: «الربط بمعرّف المباراة Fixture ID». والبند 2: استخراج المعرّف من
 * المصدر نفسه. فمباراة بلا معرّف مؤكد لا تُطلب — لا يُخمَّن معرّفها ولا يُربط
 * باسم الفريق ولا بوقت البداية، خاصة وقد ثبت أن **ثلاث** مباريات تبدأ 14:00Z.
 */
export function assertRequestable(match) {
  const slug = firstString(match?.slug);
  if (!slug) throw new TransportError('UNKNOWN_MATCH');
  if (!isVerified(match)) throw new TransportError('UNVERIFIED_MATCH', slug);
  return slug;
}

/**
 * الرابط النسبي الوحيد الذي يكلّمه المتصفح.
 *
 * يحمل **سلاج المباراة** لا معرّف المصدر: جدول الربط ملك الخادم وحده، فلا
 * يصله من الزائر معرّف ولا عنوان مصدر (البند 11: «عدم قبول عناوين مصدر
 * اعتباطية من الزائر»). ولو حمل المعرّف لصار للزائر أن يطلب أي حدث في أي
 * مسابقة عبر صفحتنا.
 */
export function matchCenterEndpoint(match) {
  const slug = assertRequestable(match);
  return `${MATCH_CENTER_ENDPOINT}?${new URLSearchParams({ match: slug }).toString()}`;
}

/* ───────────────────── تكييف حمولة الخادم ───────────────────── */

/* شكل الاستجابة المتفق عليه مع `match-center.php`:
   {
     provider: 'espn',            // إلزامي — بدونه تُرفض
     match: 'brentford-liverpool',// أو event: '401879262' — إلزامي أحدهما
     readAt: '2026-10-17T14:32:11Z',
     cache: 'HIT' | 'MISS',
     status: { type: { name, state, completed, shortDetail }, displayClock },
     score: { home, away } | competitors: [{ homeAway, score }],
     events: [...], statistics, lineups, ratings, h2h,
     seasonComparison, seasonSample
   } */

function readSideScore(payload, side) {
  /* شكلنا المطبَّع أولاً، ثم شكل ESPN الخام — وكلاهما يمر بـ`deriveScore`
     نفسها، فلا يُشتق المجموع مرتين بقاعدتين.

     ⚠️ يُعاد دائماً غلاف `{ score }`: `deriveScore` تقرأ `raw.score` ثم
     `raw.goals` ثم `raw` نفسه. وإرجاع كائن النتيجة كاملاً `{home, away}`
     لكلا الطرفين كان يجعلها لا تجد رقماً في أي مستوى، فتعيد `null` — أي
     نتيجة غائبة في كل مباراة، وهو عطل يبدو كتصميم «لا نتيجة قبل البداية». */
  const direct = payload?.score;
  if (direct && typeof direct === 'object' && !Array.isArray(direct) && side in direct) {
    return { score: direct[side] };
  }
  const competitors = Array.isArray(payload?.competitors) ? payload.competitors : null;
  if (competitors) {
    const found = competitors.find(item => item?.homeAway === side || item?.team?.homeAway === side);
    if (found) return found.team ?? found;
  }
  return null;
}

/* معرّف هوية: نص أو رقم. الخادم قد يعيد `event` رقماً في JSON، وإسقاطه كان
   يجعل الحمولة تُرفض «بلا رابط» مع أنها تحمل رابطاً صحيحاً — والعقد يقبل
   الرقم والنص على السواء (`matchByFixtureId`)، فطبقة النقل يجب أن تقبلهما. */
function firstIdentity(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

/** البند 3: لا تنتقل بيانات مباراة إلى صفحة أخرى. */
function assertSameMatch(payload, match) {
  const gotSlug = firstString(payload?.match, payload?.slug, payload?.matchId);
  const gotEvent = firstIdentity(payload?.event, payload?.eventId, payload?.fixtureId);
  if (!gotSlug && !gotEvent) throw new TransportError('MISSING_MATCH_BINDING');

  const wantedSlug = firstString(match?.slug);
  const wantedEvent = firstIdentity(match?.externalIds?.espn);
  if (gotSlug && wantedSlug && gotSlug !== wantedSlug) {
    throw new TransportError('MISMATCHED_MATCH', `الوارد ${gotSlug} والمطلوب ${wantedSlug}`);
  }
  if (gotEvent && wantedEvent && gotEvent !== wantedEvent) {
    throw new TransportError('MISMATCHED_MATCH', `الوارد ${gotEvent} والمطلوب ${wantedEvent}`);
  }
}

/**
 * تحويل حمولة الخادم إلى لقطة العقد.
 *
 * لا تقرأ ساعة ولا تحكم على الحداثة — `readAt` يمر كما ورد لتتولاه
 * `readAtProblem`/`isStaleRead` في طبقة العقد، فيبقى تعريف الحداثة واحداً.
 */
export function adaptSnapshot(payload, match) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TransportError('EMPTY_PAYLOAD');
  }

  /* البند 2: «عدم خلط أرقام من مزوّدين مختلفين». وأولى خطواته ألا تُقرأ
     مفردات مزوّد بجدول مزوّد آخر — فحمولة لا تعلن مصدرها تُرفض ولا تُخمَّن،
     لأن `normalizeStatus` بدون مزوّد معلَن تلجأ إلى مطابقة الكلمات المفتاحية
     وهي أضعف من جدول المزوّد. */
  const provider = firstString(payload.provider);
  if (!provider) throw new TransportError('UNDECLARED_PROVIDER');

  assertSameMatch(payload, match);

  const status = normalizeStatus(payload.status ?? null, provider);
  const events = Array.isArray(payload.events) ? payload.events.map(normalizeEvent) : [];

  return {
    matchId: match.id,
    provider,
    readAt: absentToNull(payload.readAt),
    status,
    /* البند 6: `deriveScore` تُعيد `null` قبل البداية، فلا تُعرض 0–0 نتيجةً
       مؤكدة لمباراة لم تبدأ. */
    score: deriveScore(status, readSideScore(payload, 'home'), readSideScore(payload, 'away')),
    events,
    statistics: absentToNull(payload.statistics),
    lineups: absentToNull(payload.lineups),
    /* ESPN لا يوفّر تقييمات اللاعبين إطلاقاً (تقرير §12.3) — يبقى `null`. */
    ratings: absentToNull(payload.ratings),
    h2h: Array.isArray(payload.h2h) ? payload.h2h : [],
    seasonComparison: absentToNull(payload.seasonComparison),
    seasonSample: absentToNull(payload.seasonSample),
  };
}

/* ────────────────────────── المحاكاة الكاملة ──────────────────────────
   البند 14 يطلب اختبار: قبل البداية، البداية، الاستراحة، النهاية، التأجيل،
   الإيقاف، إعادة الجدولة، هدف جديد، إلغاء هدف، تصحيح نتيجة، إعادة تحميل
   بلا تكرار. كل حالة منها سيناريو مسمّى هنا، فتُختبر بالاسم لا بالصدفة.
===================================================================== */

/* أسماء اللاعبين في المحاكاة **وهمية وموسومة كذلك**. البند 6 يمنع تخمين
   أسماء اللاعبين؛ ومحاكاة تحمل أسماء حقيقية الشكل قد تصل إلى صفحة منشورة
   فتصير تخميناً معروضاً خبراً. لذلك كل اسم يعلن أنه محاكاة. */
export const MOCK_PLAYER = { home: 'لاعب محاكاة (أ)', away: 'لاعب محاكاة (ب)' };

export const MOCK_SCENARIOS = [
  { id: 'scheduled', name: 'STATUS_SCHEDULED', state: 'pre', elapsed: null, label: 'لم تبدأ' },
  { id: 'delayed', name: 'STATUS_DELAYED', state: 'pre', elapsed: null, label: 'متأخرة' },
  { id: 'postponed', name: 'STATUS_POSTPONED', state: 'pre', elapsed: null, label: 'مؤجلة' },
  { id: 'rescheduled', name: 'STATUS_RESCHEDULED', state: 'pre', elapsed: null, label: 'تغيّر موعدها' },
  { id: 'canceled', name: 'STATUS_CANCELED', state: 'pre', elapsed: null, label: 'ملغاة' },
  { id: 'firstHalf', name: 'STATUS_FIRST_HALF', state: 'in', elapsed: 30, label: 'الشوط الأول' },
  { id: 'halftime', name: 'STATUS_HALFTIME', state: 'in', elapsed: 45, label: 'استراحة' },
  { id: 'secondHalf', name: 'STATUS_SECOND_HALF', state: 'in', elapsed: 92, label: 'الشوط الثاني' },
  { id: 'suspended', name: 'STATUS_SUSPENDED', state: 'in', elapsed: 55, label: 'متوقفة' },
  { id: 'finished', name: 'STATUS_FULL_TIME', state: 'post', elapsed: 90, label: 'انتهت' },
  { id: 'abandoned', name: 'STATUS_ABANDONED', state: 'post', elapsed: 62, label: 'أُلغيت بعد بدايتها' },
];

/** دقائق المباراة التي يظهر عندها كل حدث — ثابتة فلا تختلف بين تشغيلين. */
export const MOCK_EVENT_SCRIPT = [
  { id: 'mc-1', minute: 8, type: 'Goal', side: 'home' },
  { id: 'mc-2', minute: 17, type: 'Yellow Card', side: 'away' },
  { id: 'mc-3', minute: 26, type: 'Goal', side: 'away' },
  { id: 'mc-4', minute: 34, type: 'Substitution', side: 'home' },
  { id: 'mc-5', minute: 41, type: 'Own Goal', side: 'home' },
  { id: 'mc-6', minute: 52, type: 'Penalty', side: 'away' },
  { id: 'mc-7', minute: 61, type: 'Goal', side: 'home' },
  /* البند 7: هدف أُلغي بعد VAR. يحمل **نفس المعرّف** `mc-8` في الحالتين،
     لأن المصدر يعدّل الحدث ولا يستبدله — وهذا ما يمنع إعلانه مرتين. */
  { id: 'mc-8', minute: 66, type: 'Goal', side: 'home' },
  { id: 'mc-9', minute: 68, type: 'Red Card', side: 'away' },
  { id: 'mc-10', minute: 83, type: 'Goal', side: 'away' },
  { id: 'mc-11', minute: 90, type: 'Substitution', side: 'away', extraMinute: 2 },
];

/* قرارات VAR قائمة **مستقلة** عن قائمة الأحداث، لأن القرار ليس حدثاً في
   الملعب: المصدر يعدّل الحدث الأصلي فيصير `cancelled: true` عليه هو.

   جعلُ القرار حدثاً من نوع `VAR Cancelled` داخل القائمة كان ينتج وسمين
   للإلغاء — واحد على الهدف الملغى وواحد على الإشعار نفسه، لأن
   `normalizeEvent` توسم كل `var_cancelled` بـ`cancelled`. والعدد يهم:
   `planAnnouncements` تبني بصم الإعلان من الوسم، فوسمان يعنيان إعلانين. */
export const MOCK_VAR_DECISIONS = [
  { minute: 74, cancels: 'mc-8' },
];

export function resolveScenario(id) {
  const wanted = String(id ?? '').trim();
  return MOCK_SCENARIOS.find(scenario => scenario.id === wanted) || null;
}

/**
 * أحداث المحاكاة حتى دقيقة بعينها.
 *
 * `elapsed` تتجاوز دقيقة السيناريو الثابتة: حين تُشتق الحالة من الساعة يجب أن
 * تظهر أحداث الدقيقة العاشرة في الدقيقة العاشرة، لا أحداث الدقيقة الثلاثين.
 */
export function mockEvents(scenarioId, { cancelGoal = true, elapsed = null } = {}) {
  const scenario = resolveScenario(scenarioId);
  if (!scenario || scenario.elapsed === null) return [];
  const cutoff = Number.isFinite(elapsed) ? Math.min(elapsed, scenario.elapsed) : scenario.elapsed;
  const cancelledIds = cancelGoal
    ? new Set(MOCK_VAR_DECISIONS.filter(decision => decision.minute <= cutoff).map(decision => decision.cancels))
    : new Set();

  return MOCK_EVENT_SCRIPT.filter(item => item.minute <= cutoff).map(item => ({
    id: item.id,
    type: item.type,
    minute: item.minute,
    extraMinute: item.extraMinute ?? null,
    side: item.side,
    /* الإلغاء يظهر على الهدف الأصلي (كما يفعل المصدر) لا كحدث منفصل، فيبقى
       معرّف الحدث واحداً وتعمل بصمة الإعلان في طبقة العقد كما صُمّمت. */
    cancelled: cancelledIds.has(item.id),
    player: { id: item.id, name: MOCK_PLAYER[item.side] },
    team: { name: item.side === 'home' ? 'الفريق المضيف (محاكاة)' : 'الفريق الضيف (محاكاة)', homeAway: item.side },
  }));
}

/**
 * أي سيناريو تحاكيه الساعة؟
 *
 * ⚠️ هذه الدالة **للمحاكاة وحدها**. في الإنتاج لا تُشتق الحالة من مرور الوقت
 * إطلاقاً: `normalizeStatus` لا تقبل `now`، والبند 6 صريح — «وصول العدّاد إلى
 * الصفر لا يقلب المباراة إلى مباشر без تأكيد البيانات». هنا الساعة تقوم مقام
 * **مصدر يبلغ عن الحالة**، لا مقام استنتاج من عندنا.
 */
export function mockPhaseAt(match, now) {
  const kickoff = Date.parse(match?.kickoffUtc ?? '');
  if (!Number.isFinite(kickoff)) return 'scheduled';
  const elapsed = (now - kickoff) / 60_000;
  if (elapsed < 0) return 'scheduled';
  if (elapsed < 45) return 'firstHalf';
  if (elapsed < 57) return 'halftime';
  /* حتى الدقيقة 95 يبقى الشوط الثاني قائماً فتظهر أحداث الوقت المحتسب
     (83 و90+2 في النص) أثناء المباراة لا بعدها وحدها. */
  if (elapsed < 95) return 'secondHalf';
  return 'finished';
}

/** دقيقة المباراة المنقضية من موعد البداية — للمحاكاة وحدها (انظر `mockPhaseAt`). */
export function elapsedMinutesAt(match, now) {
  const kickoff = Date.parse(match?.kickoffUtc ?? '');
  if (!Number.isFinite(kickoff)) return 0;
  return Math.max(0, (now - kickoff) / 60_000);
}

/**
 * لقطة محاكاة كاملة — تُبنى حمولةً بشكل الخادم ثم تمر بـ`adaptSnapshot`،
 * فالنتيجة تثبت أن المحاكاة والإنتاج يقرآن بنفس القاعدة.
 */
export function mockSnapshot(match, options = {}) {
  const now = Number.isFinite(options.now) ? options.now : Date.parse(match?.kickoffUtc ?? '') || 0;
  /* سيناريو مسمّى = دقيقة ثابتة (للاختبارات). بلا تسمية = الساعة تقود،
     فتتقدم الأحداث مع الوقت على نفس الرابط — وهو جوهر المطلوب. */
  const explicit = Boolean(options.scenario);
  const scenarioId = options.scenario || mockPhaseAt(match, now);
  const scenario = resolveScenario(scenarioId) || resolveScenario('scheduled');
  const clockElapsed = scenario.elapsed === null
    ? null
    : explicit ? scenario.elapsed : Math.floor(Math.min(elapsedMinutesAt(match, now), scenario.elapsed));

  const events = mockEvents(scenario.id, { ...options, elapsed: clockElapsed });
  /* النتيجة تُشتق من الأحداث عبر `scoreFromEvents` نفسها، فلا يمكن أن تختلف
     المحاكاة عن أحداثها — وهذا ما يجعلها صالحة لاختبار «تصحيح النتيجة»:
     أي اختلاف لاحق يكون مقصوداً لا عَرَضياً. */
  const derived = scoreFromEvents(events.map(normalizeEvent));

  const payload = {
    /* المحاكاة تحاكي **مفردات ESPN** لأن خادمنا سيعيد هذا الشكل، وأسماء
       السيناريوهات (`STATUS_FIRST_HALF` …) أسماء ESPN نفسها. فلو أُعلنت
       `provider: 'mock'` هنا لما وجد `normalizeStatus` جدول مفردات، ولجأ إلى
       مطابقة الكلمات المفتاحية — وهي أضعف، ولا تميّز `STATUS_SCHEDULED`
       فيصير «الحالة غير محددة». لذلك تُعلن المفردات هنا، ثم يُوسم الناتج
       `mock` بعد التكييف: المفردات من ESPN، والبيانات ليست من مصدر حقيقي. */
    provider: 'espn',
    match: match?.slug,
    event: match?.externalIds?.espn ?? null,
    readAt: new Date(now).toISOString(),
    cache: 'MOCK',
    status: {
      type: { name: scenario.name, state: scenario.state, completed: scenario.state === 'post', shortDetail: scenario.label },
      displayClock: clockElapsed === null ? null : `${clockElapsed}:00`,
      /* البند 7: «الوقت المتاح من المصدر». يُرسل رقماً كما يرسله المصدر،
         وتقرأه `normalizeStatus` فتضعه في `status.elapsed`. */
      elapsed: clockElapsed,
    },
    /* لا نتيجة قبل البداية ولا في الحالات التي لا يُلعَب فيها (البند 6). */
    score: clockElapsed === null ? null : { home: derived.home, away: derived.away },
    events,
    /* البند 2 وتقرير §12.5: هذه الخانات **غير مؤكدة من المصدر**، فمحاكاتها
       بلا طلب صريح تعني أن الواجهة تُختبر على بيانات لا وجود لها. تُترك فارغة
       لتظهر «غير متاح» كما ستظهر فعلاً، وتُحقن في الاختبارات عند الحاجة. */
    statistics: null,
    lineups: null,
    ratings: null,
    h2h: [],
    seasonComparison: null,
    seasonSample: null,
    ...options.overrides,
  };

  const data = adaptSnapshot(payload, match);
  /* `mock` مزوّد مسجّل في السجل لكنه ليس مصدر بيانات حقيقياً؛ إبقاء الوسم في
     اللقطة هو ما يمنع شارة «محاكاة» من الاختفاء عند أول إعادة رسم. */
  return { ...data, provider: MOCK_PROVIDER_ID, scenario: scenario.id };
}

/* ───────────────────────── جلب لقطة واحدة ───────────────────────── */

/**
 * قراءة واحدة لمباراة واحدة — **لا طلب لكل تبويب** (البند 11).
 *
 * @returns {{ data: object, cache: string }}
 */
export async function fetchMatchSnapshot(match, options = {}) {
  const provider = resolveProvider(options.provider ?? SERVER_PROVIDER_ID);
  if (!provider) throw new TransportError('UNSUPPORTED_PROVIDER', String(options.provider));

  if (provider.kind === 'mock') {
    /* الحارس صريح ولا يعتمد على متغيّر بناء: من يستدعي المحاكاة عليه أن يعلن
       `allowMock`، وطبقة React تمرّر `import.meta.env.DEV` وحده. فلو اعتمدنا
       على environment وحده لكانت أي إضافة لاحقة قادرة على تشغيلها في الإنتاج. */
    if (options.allowMock !== true) throw new TransportError('MOCK_DISABLED');
    return { data: mockSnapshot(match, options), cache: 'MOCK' };
  }

  const endpoint = matchCenterEndpoint(match);
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new TransportError('NETWORK_ERROR', 'لا تتوفر واجهة fetch');

  let response;
  try {
    response = await fetchImpl(endpoint, {
      signal: options.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error; /* الإلغاء ليس عطلاً */
    /* خطأ يحمل رمزاً يُترك كما هو: إعادة تغليفه `NETWORK_ERROR` كانت تُسقط
       السبب الحقيقي، فيظهر للزائر «تعذّر الاتصال» بدل «رفض المصدر الطلب
       مؤقتاً» — والبند 11 يشترط تحذيراً واضحاً، والوضوح يبدأ من الرمز. */
    if (error instanceof TransportError) throw error;
    throw new TransportError('NETWORK_ERROR', error?.message || null);
  }
  if (!response?.ok) throw new TransportError(`HTTP_${response?.status ?? 0}`);

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new TransportError('MALFORMED_JSON');
  }

  return { data: adaptSnapshot(payload, match), cache: firstString(payload?.cache) || 'MISS' };
}

/* ─────────────────── تسوية الوعود لشكل `mergeReads` ───────────────────
   `mergeReads` تقرأ `result.code` من الوعد المرفوض، بينما `Promise.allSettled`
   يضع الخطأ في `result.reason`. هذا الجسر يجعل الرمز يصل، فيُسجَّل سبب الفشل
   وتُحفظ آخر قراءة مؤكدة (البند 11) بدل أن يضيع الخطأ في `reason` مهملة.
===================================================================== */
export function settle(promise) {
  return Promise.resolve(promise).then(
    value => ({ status: 'fulfilled', value }),
    reason => ({
      status: 'rejected',
      code: reason?.name === 'AbortError' ? 'ABORTED' : reason?.code || 'NETWORK_ERROR',
      reason,
    }),
  );
}
