// Public scoreboard only: no API secrets, fabricated fixtures, or inferred live scores.
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

export function dayInZone(date, zone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = type => parts.find(p => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function shiftDay(day, offset) {
  const date = new Date(`${day}T12:00:00Z`);
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
export function scoreboardUrl(league, day) {
  if (!LEAGUES.some(l => l.id === league)) throw new Error('Unknown league');
  // Fetch the neighbouring UTC dates too. Local days may straddle UTC midnight.
  const dates = `${shiftDay(day, -1).replaceAll('-', '')}-${shiftDay(day, 1).replaceAll('-', '')}`;
  return `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${dates}&limit=1000`;
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
