/* عرض شرائح التذكرة الرئيسية حسب تاريخها: تبقى الشريحة ظاهرة ما دام عمرها
   7 أيام أو أقل (بتوقيت القاهرة)، ثم تُخفى تلقائياً دون تعديل الكود.
   الشرائح التي لا تاريخ قابل للقراءة لها تُخفى أيضاً (لا يمكن إثبات أنها حديثة). */

export const TICKET_MAX_AGE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

const AR_MONTHS: Record<string, number> = {
  يناير: 1,
  فبراير: 2,
  مارس: 3,
  أبريل: 4,
  ابريل: 4,
  مايو: 5,
  يونيو: 6,
  يوليو: 7,
  أغسطس: 8,
  اغسطس: 8,
  سبتمبر: 9,
  أكتوبر: 10,
  نوفمبر: 11,
  ديسمبر: 12,
};

/* يحوّل "2026-10-31" أو "31 أكتوبر 2026" إلى يوم UTC (بالميلي ثانية)، أو null */
export function parseTicketDay(value: string | undefined): number | null {
  if (!value) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (iso) return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const ar = /^(\d{1,2})\s+(\S+)\s+(\d{4})$/.exec(value.trim());
  if (ar) {
    const month = AR_MONTHS[ar[2]];
    if (month) return Date.UTC(Number(ar[3]), month - 1, Number(ar[1]));
  }
  return null;
}

/* يوم "اليوم" بتوقيت القاهرة كيوم UTC */
export function cairoTodayDay(nowMs: number): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(nowMs));
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value);
  return Date.UTC(get("year"), get("month") - 1, get("day"));
}

export function isWithinTicketWindow(value: string | undefined, nowMs: number): boolean {
  const day = parseTicketDay(value);
  if (day === null) return false;
  const ageDays = (cairoTodayDay(nowMs) - day) / DAY_MS;
  return ageDays <= TICKET_MAX_AGE_DAYS;
}
