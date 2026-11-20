/* ==========================================================================
   اختبار عرض شرائح التذكرة حسب عمرها — 7 أيام أو أقل ثم تُخفى
   --------------------------------------------------------------------------
   يُجمَّع src/lib/ticket-recency.ts بـ esbuild (المستخدم أصلاً في البناء)
   ثم تُختبر الدوال نفسها التي تستخدمها الصفحة الرئيسية.
   التشغيل: node --test scripts/test-ticket-recency.mjs
   ========================================================================== */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { transformSync } from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "..", "src", "lib", "ticket-recency.ts"), "utf8");
const compiled = transformSync(source, { loader: "ts", format: "esm" }).code;
const dir = mkdtempSync(join(tmpdir(), "ticket-recency-"));
const file = join(dir, "ticket-recency.mjs");
writeFileSync(file, compiled);
const { TICKET_MAX_AGE_DAYS, isWithinTicketWindow, parseTicketDay } = await import(file);

/* منتصف النهار بتوقيت القاهرة (UTC+2 في 31 أكتوبر) لتجنّب حدود اليوم */
const now = Date.parse("2026-10-31T12:00:00+02:00");

test("الحد الأقصى 7 أيام", () => {
  assert.equal(TICKET_MAX_AGE_DAYS, 7);
});

test("شريحة عمرها 7 أيام أو أقل تبقى ظاهرة", () => {
  assert.equal(isWithinTicketWindow("2026-10-24", now), true, "7 أيام بالضبط");
  assert.equal(isWithinTicketWindow("2026-10-28", now), true, "3 أيام");
  assert.equal(isWithinTicketWindow("2026-10-31", now), true, "اليوم");
});

test("شريحة عمرها أكثر من 7 أيام تُخفى", () => {
  assert.equal(isWithinTicketWindow("2026-10-23", now), false, "8 أيام");
  assert.equal(isWithinTicketWindow("2026-09-01", now), false, "شهرين");
});

test("صيغة الأخبار العربية «27 أكتوبر 2026» تُقرأ بالشكل نفسه", () => {
  assert.equal(isWithinTicketWindow("27 أكتوبر 2026", now), true);
  assert.equal(isWithinTicketWindow("15 أكتوبر 2026", now), false);
  assert.equal(parseTicketDay("16 أكتوبر 2026"), parseTicketDay("2026-10-16"));
});

test("تاريخ المباراة القادم يبقى ظاهراً", () => {
  assert.equal(isWithinTicketWindow("2026-11-07", now), true);
});

test("تاريخ غير قابل للقراءة أو غائب يُخفى (لا يمكن إثبات حداثته)", () => {
  assert.equal(isWithinTicketWindow(undefined, now), false);
  assert.equal(isWithinTicketWindow("غير معروف", now), false);
});

test("اليوم بتوقيت القاهرة وليس بتوقيت الخادم: عند منتصف الليل بالقاهرة", () => {
  /* 23:30 بتوقيت القاهرة في 31 أكتوبر: الشريحة بتاريخ 24 أكتوبر عمرها 7 أيام بالضبط */
  const lateCairo = Date.parse("2026-10-31T23:30:00+02:00");
  assert.equal(isWithinTicketWindow("2026-10-24", lateCairo), true);
  /* 00:30 بتوقيت القاهرة في 1 نوفمبر: اليوم 1 نوفمبر، فشريحة 24 أكتوبر عمرها 8 أيام */
  const nextCairo = Date.parse("2026-11-01T00:30:00+02:00");
  assert.equal(isWithinTicketWindow("2026-10-24", nextCairo), false);
});
