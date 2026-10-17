/* ==========================================================================
   عقد جدول الترتيب لصفحات هبوط البطولات — وحدة JS خالصة
   --------------------------------------------------------------------------
   لماذا .mjs مع .d.mts؟ نفس عرف المشروع (`matches.mjs`، `navigation.mjs`،
   `match-center.mjs`): يُستهلك من تطبيق React ومن سكربتات الاختبار في Node
   معاً، بلا خطوة بناء.

   العلاقة بـ `public/_assets/fixture-standings.js`:
   • ذاك مُصيّر صفحات التوثيق، وعقده مغلق على **ثلاث** بطولات مع «فريق
     المواجهة»، ويقرأ من `fixture-standings-snapshot.json`. لا يُعدّل ولا
     يُستهلك من هنا — لأنه مشدود باختبارات قائمة (٧٦ صفاً ثابتاً).
   • هذه الوحدة عقد **صفحات هبوط البطولات**: بطولة واحدة لكل صفحة، بلا
     «فريق مواجهة»، وتقرأ من `standings-snapshot.json`.
   قواعد التحقق أدناه **مطابقة حرفياً** لقواعد الوسيط في `standings.php`
   ولقواعد المُصيّر القائم — حتى لا ينشأ تعريفان يتباعدان لاحقاً:
   • لا يُعاد حساب النقاط ولا فارق الأهداف ولا معايير التعادل؛ المركز
     يُؤخذ من المصدر كما هو.
   • عدد الصفوف يجب أن يطابق عدد فرق البطولة تماماً، وإلا رُفضت القراءة.
   • القيم الرقمية صحيحة وآمنة، وغير سالبة عدا النقاط وفارق الأهداف.
   ========================================================================== */

/* البطولات المؤهَّلة لعرض الترتيب — تُضاف بطولة هنا **فقط** بعد:
   1) إثبات مسبار موثّق (معرّف الدوري + عدد الفرق) لدى المصدر.
   2) وجود البطولة في قائمة `standings.php` المسموحة.
   وهذا الترتيب نفسه مضبوط في اختبار `test-league-standings.mjs`.
   • الفرنسي والألماني والإيطالي والسعودي أُضيفت بعد مسبار 2026-10-16:
     fra.1 → s:600~l:710 (18)، ger.1 → s:600~l:720 (18)،
     ita.1 → s:600~l:730 (20)، ksa.1 → s:600~l:21231 (18).
   • المصري `egy.1` رفض المصدر طلبه (HTTP 400) في المسبار نفسه، فيبقى
     «غير متاح» ولا يُخمَّن ولا يُستكمل من موقع آخر. */
export const STANDINGS_LEAGUES = [
  { id: 'uefa.champions', count: 36, phase: 'مرحلة الدوري الموحّدة' },
  { id: 'eng.1', count: 20, phase: 'ترتيب الدوري المحلي' },
  { id: 'fra.1', count: 18, phase: 'ترتيب الدوري المحلي' },
  { id: 'esp.1', count: 20, phase: 'ترتيب الدوري المحلي' },
  { id: 'ger.1', count: 18, phase: 'ترتيب الدوري المحلي' },
  { id: 'ita.1', count: 20, phase: 'ترتيب الدوري المحلي' },
  { id: 'ksa.1', count: 18, phase: 'ترتيب الدوري المحلي' },
];

export const STANDINGS_FIELDS = ['points', 'played', 'wins', 'draws', 'losses', 'goalsFor', 'goalsAgainst', 'goalDifference'];
export const STANDINGS_HEADINGS = ['النقاط', 'لعب', 'فاز', 'تعادل', 'خسر', 'له', 'عليه', 'الفارق'];

/* الوسم الظاهر عند تعذّر التحقق من قراءة أحدث — نصّه معتمد ولا يُختصر. */
export const STALE_BADGE_TEXT = 'بيانات قديمة';

const TIME_ZONE = 'Africa/Cairo';

/** إعداد البطولة — `undefined` يعني «غير مؤهَّلة لعرض الترتيب» */
export function standingsConfig(league) {
  return STANDINGS_LEAGUES.find((entry) => entry.id === league);
}

/** موسم بصيغة 2026/27 */
export function seasonText(season) {
  return `${season}/${String(season + 1).slice(-2)}`;
}

/**
 * تحقق كامل من استجابة الوسيط (أو من جدول لقطة) قبل عرضها.
 * يرمي `INVALID_STANDINGS` عند أي انحراف — ولا يُصلح شيئاً بنفسه.
 * @param {unknown} data
 * @param {string} league
 */
export function validateStandings(data, league) {
  const config = standingsConfig(league);
  const raw = /** @type {any} */ (data);
  if (!config || !raw || raw.ok !== true || raw.provider !== 'ESPN' || raw.league !== league || raw.phase !== 'league'
    || !Number.isInteger(raw.season) || raw.season < 2000 || raw.season > 2100
    || typeof raw.fetchedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(raw.fetchedAt) || !Number.isFinite(Date.parse(raw.fetchedAt))
    || typeof raw.stale !== 'boolean' || !Array.isArray(raw.entries) || raw.entries.length !== config.count) {
    throw new Error('INVALID_STANDINGS');
  }
  const ids = new Set();
  const ranks = new Set();
  const entries = raw.entries.map((row) => {
    if (!row || typeof row.teamId !== 'string' || !/^[1-9]\d{0,11}$/.test(row.teamId) || ids.has(row.teamId)
      || typeof row.name !== 'string' || !row.name.trim() || row.name.length > 240 || /[\u0000-\u001f\u007f]/.test(row.name)
      || !Number.isInteger(row.rank) || row.rank < 1 || row.rank > config.count || ranks.has(row.rank)) {
      throw new Error('INVALID_STANDINGS');
    }
    const result = { teamId: row.teamId, name: row.name.trim(), rank: row.rank };
    for (const field of STANDINGS_FIELDS) {
      const value = row[field] ?? null;
      if (value !== null && (!Number.isSafeInteger(value) || (!['points', 'goalDifference'].includes(field) && value < 0))) {
        throw new Error('INVALID_STANDINGS');
      }
      result[field] = value;
    }
    ids.add(row.teamId);
    ranks.add(row.rank);
    return result;
  });
  if (!entries.some((row) => STANDINGS_FIELDS.some((field) => row[field] !== null))) throw new Error('INVALID_STANDINGS');
  entries.sort((a, b) => a.rank - b.rank);
  return {
    ok: true, provider: 'ESPN', league, phase: 'league',
    season: raw.season, fetchedAt: new Date(raw.fetchedAt).toISOString(), stale: raw.stale, entries,
  };
}

/**
 * جدول بطولة من ملف اللقطة — يمر بنفس التحقق، فما يُرسم في HTML وقت البناء
 * مساوٍ في الصرامة لما يصل من الوسيط.
 * @param {unknown} snapshot
 * @param {string} league
 */
export function leagueStandingsByLeague(snapshot, league) {
  const tables = /** @type {any} */ (snapshot)?.tables;
  if (!Array.isArray(tables)) throw new Error('MISSING_STANDINGS_SNAPSHOT');
  const matches = tables.filter((table) => table?.league === league);
  if (matches.length !== 1) throw new Error('MISSING_STANDINGS_SNAPSHOT');
  return validateStandings(matches[0], league);
}

/** وقت القراءة بتوقيت القاهرة — نفس صيغة صفحات التوثيق */
export function formatStandingsTime(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'وقت غير متاح';
  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: TIME_ZONE, year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(value));
}

/** رقم أو «غير متاح» — لا يُستنتج ناقص من غيره */
export function standingsNumber(value, field) {
  if (value === null || value === undefined) return 'غير متاح';
  return `${field === 'goalDifference' && value > 0 ? '+' : ''}${value}`;
}

/* ------------------------------ صياغة الحالات ------------------------------ */

/** الحالة الابتدائية في HTML الثابت (بلا JavaScript) */
export function standingsInitialStatus(fetchedAt) {
  return `لقطة مراجعة موثّقة · آخر قراءة: ${formatStandingsTime(fetchedAt)} بتوقيت القاهرة · يُتحقق من وجود أحدث عند تحميل الصفحة.`;
}

/** بعد قراءة ناجحة حديثة */
export function standingsUpdatedStatus(fetchedAt) {
  return `آخر قراءة مؤكدة: ${formatStandingsTime(fetchedAt)} بتوقيت القاهرة · تحديث تلقائي أثناء ظهور الصفحة.`;
}

/** عند تعذّر قراءة أحدث — تُعرض آخر قراءة مؤكدة مع وسم «بيانات قديمة» */
export function standingsStaleStatus(reasonText, fetchedAt) {
  return `${reasonText} · ${STALE_BADGE_TEXT} — تُعرض آخر قراءة مؤكدة: ${formatStandingsTime(fetchedAt)} بتوقيت القاهرة.`;
}

/** سبب الفشل بلغة مفهومة — لا نصوص تشخيص داخلية للزائر */
export function describeStandingsFailure(code, online = true) {
  if (!online || code === 'OFFLINE') return 'لا يوجد اتصال لتحديث الترتيب';
  if (code === 'PHP_PREVIEW_UNAVAILABLE') return 'المعاينة الحالية لا تشغّل PHP؛ تعذّر التحقق من وجود ترتيب أحدث';
  if (code === 'OLDER_READING') return 'وردت قراءة أقدم؛ لم تُستبدل بها القراءة الأحدث';
  if (code === 'CURL_UNAVAILABLE') return 'إضافة cURL غير مفعّلة على خادم الترتيب';
  if (code === 'STALE' || code === 'STALE_CACHE') return 'تعذرت قراءة أحدث من المصدر؛ استُخدمت نسخة الوسيط المخزّنة';
  if (code === 'UPSTREAM_TIMEOUT') return 'تأخر المصدر في الرد؛ تُعرض آخر قراءة مؤكدة';
  if (typeof code === 'string' && /^UPSTREAM_HTTP_5\d\d$/.test(code)) return 'المصدر غير متاح مؤقتاً؛ تُعرض آخر قراءة مؤكدة';
  return 'تعذر تحديث جدول الترتيب من المصدر';
}

/** رابط الوسيط — نفس أصل الموقع، بلا مفاتيح ولا معرّفات في المتصفح */
export function standingsUrl(league) {
  return `/standings.php?league=${encodeURIComponent(league)}`;
}
