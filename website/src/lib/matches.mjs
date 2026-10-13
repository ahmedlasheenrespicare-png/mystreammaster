// Public scoreboard via same-origin PHP proxy: no API secrets, fabricated fixtures, or inferred live scores.
export const LEAGUES = [
  { id: 'eng.1', name: 'الدوري الإنجليزي' },
  { id: 'esp.1', name: 'الدوري الإسباني' },
  { id: 'ita.1', name: 'الدوري الإيطالي' },
  { id: 'ger.1', name: 'الدوري الألماني' },
  { id: 'fra.1', name: 'الدوري الفرنسي' },
  { id: 'sau.1', name: 'الدوري السعودي' },
  { id: 'egy.1', name: 'الدوري المصري' },
  { id: 'uefa.champions', name: 'دوري أبطال أوروبا' },
  { id: 'uefa.europa', name: 'الدوري الأوروبي' },
  { id: 'fifa.worldq.caf', name: 'تصفيات كأس العالم — أفريقيا' },
  { id: 'fifa.worldq.uefa', name: 'تصفيات كأس العالم — أوروبا' },
  { id: 'fifa.friendly', name: 'مباريات دولية ودية' },
];
export const TIME_ZONES = [
  { id: 'Asia/Riyadh', name: 'مكة المكرمة — السعودية' },
  { id: 'Africa/Cairo', name: 'مصر — القاهرة' },
  { id: 'UTC', name: 'التوقيت العالمي UTC' },
  { id: 'Asia/Dubai', name: 'الإمارات — دبي' },
  { id: 'Europe/London', name: 'بريطانيا — لندن' },
  { id: 'Europe/Paris', name: 'فرنسا — باريس' },
  { id: 'America/New_York', name: 'الولايات المتحدة — نيويورك' },
  { id: 'Asia/Tokyo', name: 'اليابان — طوكيو' },
];

export const DIAGNOSTIC_LABELS = {
  PHP_PREVIEW_UNAVAILABLE: 'خادم PHP غير نشط في بيئة المعاينة الثابتة',
  PHP_UNAVAILABLE: 'خادم PHP غير مفعّل أو لم يُنفّذ الملف على الاستضافة',
  PROXY_NOT_FOUND: 'ملف وسيط المباريات (scoreboard.php) غير موجود على الخادم',
  METHOD_NOT_ALLOWED: 'طريقة الطلب غير مدعومة على الخادم',
  INVALID_LEAGUE: 'معرّف البطولة المرسل غير صالح',
  INVALID_DATES: 'نطاق التاريخ المرسل غير صالح',
  RATE_LIMITED: 'تم تجاوز حد الطلبات المؤقت على الخادم',
  HTTP_CLIENT_UNAVAILABLE: 'وسيلة الاتصال الخارجي (cURL) غير مفعّلة في PHP',
  DNS_LOOKUP_FAILED: 'تعذر على الخادم حل اسم نطاق المصدر (DNS)',
  UPSTREAM_TIMEOUT: 'انتهت مهلة انتظار رد المصدر (ESPN) على الخادم',
  UPSTREAM_CONNECT_FAILED: 'تعذر اتصال الخادم بمصدر المباريات (ESPN)',
  UPSTREAM_SSL_ERROR: 'فشل التحقق من شهادة الأمان (SSL) مع المصدر',
  UPSTREAM_NETWORK_ERROR: 'خطأ في اتصال الشبكة بين الخادم والمصدر',
  UPSTREAM_RATE_LIMITED: 'رفض المصدر الطلب مؤقتًا بسبب كثرة الطلبات (HTTP 429)',
  UPSTREAM_INVALID_JSON: 'أعاد المصدر استجابة غير صالحة بدل بيانات المباريات',
  INVALID_SCOREBOARD: 'بنية بيانات المباريات المستلمة غير صالحة',
  STALE_CACHE: 'تعذر تحديث المصدر؛ عُرضت آخر نسخة مخبأة على الخادم',
  REQUEST_TIMEOUT: 'انتهت مهلة الطلب من المتصفح (15 ثانية)',
  NETWORK_ERROR: 'تعذر الوصول إلى خادم الموقع أو قُطع الاتصال',
};

export function dayInZone(date, zone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = type => parts.find(p => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function shiftDay(day, offset) {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Invalid day');
  const date = new Date(`${day}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day) throw new Error('Invalid day');
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
export function weekDays(today) {
  return Array.from({ length: 15 }, (_, i) => shiftDay(today, i - 7));
}
export function dayLabel(day, options = {}) {
  return new Intl.DateTimeFormat('ar-EG', { timeZone: 'UTC', day: 'numeric', month: 'long', ...options }).format(new Date(`${day}T12:00:00Z`));
}
export function kickoff(date, zone) {
  return new Intl.DateTimeFormat('ar-EG', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(date));
}
export function scoreboardDates(day) {
  // Fetch the neighbouring UTC dates too. Local days may straddle UTC midnight.
  return `${shiftDay(day, -1).replaceAll('-', '')}-${shiftDay(day, 1).replaceAll('-', '')}`;
}
export function upstreamScoreboardUrl(league, day) {
  if (!LEAGUES.some(l => l.id === league)) throw new Error('Unknown league');
  return `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${scoreboardDates(day)}&limit=1000`;
}
export function scoreboardUrl(league, day) {
  if (!LEAGUES.some(l => l.id === league)) throw new Error('Unknown league');
  return `/scoreboard.php?league=${encodeURIComponent(league)}&dates=${scoreboardDates(day)}`;
}
export function describeDiagnostic(code) {
  const normalized = String(code || '').trim().toUpperCase();
  if (normalized in DIAGNOSTIC_LABELS) return DIAGNOSTIC_LABELS[normalized];
  const upstreamMatch = /^UPSTREAM_HTTP_(\d{3})$/.exec(normalized);
  if (upstreamMatch) {
    const status = Number(upstreamMatch[1]);
    if (status === 401 || status === 403) return `رفض المصدر الاتصال (HTTP ${status})`;
    if (status === 404) return 'المسار المطلوب غير متوفر لدى المصدر (HTTP 404)';
    if (status === 429) return 'رفض المصدر الطلب مؤقتًا بسبب كثرة الطلبات (HTTP 429)';
    return `خطأ من خادم المصدر (HTTP ${status})`;
  }
  const httpMatch = /^HTTP_(\d{3})$/.exec(normalized);
  if (httpMatch) return `استجاب خادم الموقع برمز HTTP ${httpMatch[1]}`;
  return 'خطأ غير محدد أثناء جلب البيانات';
}
export function diagnosticError(code, message) {
  const normalized = String(code || 'UNKNOWN_ERROR').trim().toUpperCase();
  const err = new Error(message || `${normalized}: ${describeDiagnostic(normalized)}`);
  err.code = normalized;
  return err;
}
export function classifyFetchError(error) {
  if (error && typeof error === 'object' && typeof error.code === 'string' && /^[A-Z0-9_]+$/.test(error.code)) {
    return error.code;
  }
  if (error && typeof error === 'object' && error.name === 'AbortError') {
    return 'REQUEST_TIMEOUT';
  }
  return 'NETWORK_ERROR';
}
export async function readScoreboardResponse(response, league, now = Date.now()) {
  const text = await response.text();
  if (text.trimStart().startsWith('<?php')) {
    throw diagnosticError('PHP_UNAVAILABLE');
  }
  let data = null;
  if (text.trim() !== '') {
    try { data = JSON.parse(text); } catch { data = null; }
  }
  const rawHeaderCode = response.headers?.get?.('x-diagnostic-code')?.trim().toUpperCase() || '';
  const headerCode = /^[A-Z0-9_]+$/.test(rawHeaderCode) ? rawHeaderCode : '';
  const bodyCode = data && typeof data === 'object' && typeof data.code === 'string' && /^[A-Z0-9_]+$/.test(data.code.trim().toUpperCase())
    ? data.code.trim().toUpperCase()
    : '';

  if (!response.ok) {
    const fallbackCode = response.status === 501
      ? 'PHP_PREVIEW_UNAVAILABLE'
      : response.status === 404
        ? 'PROXY_NOT_FOUND'
        : response.status === 429
          ? 'RATE_LIMITED'
          : `HTTP_${response.status}`;
    const code = bodyCode || (headerCode && headerCode !== 'OK' ? headerCode : '') || fallbackCode;
    throw diagnosticError(code, data && typeof data.message === 'string' ? data.message : undefined);
  }
  if (data && typeof data === 'object' && data.ok === false) {
    throw diagnosticError(bodyCode || (headerCode && headerCode !== 'OK' ? headerCode : 'INVALID_SCOREBOARD'));
  }
  if (!data || !Array.isArray(data.events)) {
    throw diagnosticError(bodyCode || 'INVALID_SCOREBOARD');
  }
  const matches = parseScoreboard(data, league);
  const rawCache = response.headers?.get?.('x-matches-cache')?.trim().toUpperCase() || 'MISS';
  const cache = rawCache === 'HIT' || rawCache === 'STALE' || rawCache === 'MISS' ? rawCache : 'MISS';
  const rawAge = response.headers?.get?.('x-cache-age')?.trim() || '';
  const ageSeconds = /^\d+$/.test(rawAge) ? Number(rawAge) : 0;
  const updated = new Date(Math.max(0, now - ageSeconds * 1000)).toISOString();
  const stale = cache === 'STALE';
  const diagnostic = stale ? (headerCode && headerCode !== 'OK' ? headerCode : 'STALE_CACHE') : undefined;
  return { id: league.id, matches, updated, cache, stale, diagnostic };
}
function team(value) {
  const name = value?.team?.displayName;
  if (typeof name !== 'string' || !name.trim()) return null;
  const rawScore = value?.score;
  const score = typeof rawScore === 'string' && /^\d+$/.test(rawScore) ? Number(rawScore) : typeof rawScore === 'number' && Number.isFinite(rawScore) ? rawScore : null;
  const logo = typeof value.team.logo === 'string' && value.team.logo.startsWith('https://') ? value.team.logo : undefined;
  return { name, score, logo };
}
export function parseScoreboard(data, league) {
  if (!data || !Array.isArray(data.events)) throw new Error('Invalid scoreboard');
  const seen = new Set();
  return data.events.flatMap(event => {
    const competition = event?.competitions?.[0];
    const home = team(competition?.competitors?.find(c => c?.homeAway === 'home'));
    const away = team(competition?.competitors?.find(c => c?.homeAway === 'away'));
    const date = competition?.date || event?.date;
    const status = competition?.status || event?.status;
    const id = `${league.id}:${event?.id}`;
    if (!event?.id || !home || !away || typeof date !== 'string' || !Number.isFinite(Date.parse(date)) || seen.has(id)) return [];
    seen.add(id);
    const type = status?.type;
    const special = /postpon|cancel|suspend|delay|abandon/i.test(String(type?.name || ''));
    const state = special ? 'other' : type?.completed === true ? 'finished' : type?.state === 'in' ? 'live' : 'scheduled';
    const specialLabels = { STATUS_POSTPONED: 'مؤجلة', STATUS_CANCELED: 'ملغاة', STATUS_CANCELLED: 'ملغاة', STATUS_SUSPENDED: 'متوقفة', STATUS_DELAYED: 'متأخرة', STATUS_ABANDONED: 'أُلغيت بعد بدايتها' };
    const detail = state === 'live' ? String(status?.displayClock || type?.shortDetail || 'مباشر') : state === 'other' ? specialLabels[type?.name] || 'تغيّر موعد المباراة' : state === 'finished' ? 'انتهت' : 'لم تبدأ';
    return [{ id, league: league.id, date, home, away, state, detail, venue: String(competition?.venue?.fullName || '') }];
  });
}
export function matchesForDay(matches, day, zone) {
  return matches.filter(m => dayInZone(new Date(m.date), zone) === day).sort((a, b) => Date.parse(a.date) - Date.parse(b.date) || a.id.localeCompare(b.id));
}
