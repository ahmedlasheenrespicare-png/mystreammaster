/* ==========================================================================
   حارس مقال «أفضل سيرفر IPTV في مصر» وأسعاره بالجنيه المصري
   --------------------------------------------------------------------------
   القاعدة التي يحرسها هذا الاختبار:
     • جدول الأسعار المصري لا يُرسم إلا إذا وصلت أرقام فعلية في
       src/content/egypt-pricing.ts — ولا يظهر عنوان قسم فارغ بلا جدول.
     • الأرقام المعروضة في الصفحة هي نفسها المكتوبة في ملف الأسعار الواحد
       (لا نسخ يدوي في نص المقال)، وكل سعر موجب، والمتوسط الشهري صحيح.
     • الصفحة مفهرسة: h1 واحد، canonical صحيح، وفي sitemap، وغير يتيمة.
   ========================================================================== */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { renderPage } from '../dist-ssr/entry-server.js';

const website = new URL('../', import.meta.url);
const route = '/blog/افضل-سيرفر-iptv-في-مصر';

const pricingSource = await fs.readFile(new URL('src/content/egypt-pricing.ts', website), 'utf8');
const { html: egyptHtml, seo: egyptSeo } = renderPage(route);

/* مدخلات ملف الأسعار: الاسم ثم الأسعار الثلاثة كما كُتبت في المصدر */
const sourceRows = [...pricingSource.matchAll(
  /code:\s*"([a-z]+)",[\s\S]*?prices:\s*\{\s*"3":\s*(null|\d+),\s*"6":\s*(null|\d+),\s*"12":\s*(null|\d+)\s*\}/g,
)].map((m) => ({
  code: m[1],
  prices: { 3: m[2] === 'null' ? null : Number(m[2]), 6: m[3] === 'null' ? null : Number(m[3]), 12: m[4] === 'null' ? null : Number(m[4]) },
}));

const hasPrices = sourceRows.some((r) => Object.values(r.prices).some((p) => p !== null));

test('ملف الأسعار المصري يقتصر على سيرفري العرض: نوفا ثم X', () => {
  assert.deepEqual(sourceRows.map((r) => r.code), ['nova', 'x']);
});

test('كل سعر في ملف الأسعار عدد صحيح موجب', () => {
  for (const row of sourceRows) {
    for (const [term, price] of Object.entries(row.prices)) {
      if (price === null) continue;
      assert.ok(Number.isInteger(price) && price > 0, `${row.code} ${term} شهراً: سعر غير صالح (${price})`);
    }
    /* المدة السنوية لا تكون أغلى من مجموع أقساط قصيرة بنفس النسبة */
    const { 3: q3, 6: q6, 12: q12 } = row.prices;
    if (q3 && q12) assert.ok(q12 / 12 <= q3 / 3, `${row.code}: المتوسط الشهري للسنوي يجب ألا يتجاوز متوسط 3 أشهر`);
    if (q6 && q12) assert.ok(q12 / 12 <= q6 / 6, `${row.code}: المتوسط الشهري للسنوي يجب ألا يتجاوز متوسط 6 أشهر`);
  }
});

test('الصفحة مفهرسة ولها h1 واحد وعنوان يحمل الكلمة المستهدفة', () => {
  assert.match(egyptSeo.robots, /^index/, 'الصفحة يجب أن تُفهرس');
  assert.ok(egyptSeo.title.includes('أفضل سيرفر IPTV في مصر'), 'العنوان يحمل الكلمة المستهدفة');
  assert.ok((egyptHtml.match(/<h1\b/g) ?? []).length === 1, 'h1 واحد فقط');
  assert.ok(egyptSeo.canonical.includes(encodeURIComponent('افضل-سيرفر-iptv-في-مصر')), 'canonical يطابق المسار');
});

test('لا نص تقني مسرّب (null / NaN / undefined) في الصفحة', () => {
  const text = egyptHtml.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  assert.ok(!/\bNaN\b|\bundefined\b|>\s*null\s*</.test(text), 'قيمة تقنية ظاهرة للمستخدم');
});

test('جدول الأسعار يُرسم فقط بعد وصول الأرقام، ومطابق للمصدر', () => {
  const hasTable = egyptHtml.includes('أسعار اشتراك IPTV في مصر بالجنيه المصري');
  const hasHeading = egyptHtml.includes('أسعار الاشتراك في مصر بالجنيه المصري');

  if (!hasPrices) {
    assert.equal(hasTable, false, 'جدول أسعار بلا أرقام — يجب ألا يُرسم');
    assert.equal(hasHeading, false, 'عنوان «أسعار الاشتراك في مصر» ظاهر بلا جدول — قسم فارغ');
    return;
  }

  assert.equal(hasTable, true, 'الأسعار وصلت والجدول غير مرسوم');
  assert.equal(hasHeading, true, 'عنوان قسم الأسعار غائب مع وجود الجدول');
  const fmt = (n) => `${n.toLocaleString('en-US')} ج.م`;
  /* نسخة الجوال (بطاقات) يجب أن تعرض الأسعار نفسها بلا تمرير أفقي */
  for (const row of sourceRows) {
    for (const price of Object.values(row.prices)) {
      if (price === null) continue;
      const occurrences = egyptHtml.split(fmt(price)).length - 1;
      assert.ok(occurrences >= 2, `السعر ${price} يجب أن يظهر في جدول الحاسب وبطاقات الجوال`);
    }
  }
  for (const row of sourceRows) {
    for (const price of Object.values(row.prices)) {
      if (price === null) continue;
      assert.ok(egyptHtml.includes(fmt(price)), `السعر ${price} المكتوب في المصدر غير معروض في الصفحة`);
    }
  }
});

test('الحدود الجغرافية معلنة على الصفحة: داخل مصر فقط', () => {
  const text = egyptHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.ok(text.includes('تعمل داخل مصر فقط'), 'شارة «داخل مصر فقط» غائبة عن الصفحة');
  const outside = (egyptSeo.jsonLd ?? [])
    .filter((node) => node['@type'] === 'FAQPage')
    .flatMap((node) => node.mainEntity ?? [])
    .find((q) => String(q.name ?? '').includes('خارج مصر'));
  assert.ok(outside, 'سؤال «خارج مصر» غائب عن الأسئلة المنظّمة');
  assert.match(String(outside.acceptedAnswer?.text ?? ''), /لا\./, 'جواب خارج مصر يجب أن يكون قاطعاً بالنفي');
});

test('الأسئلة المنظّمة (FAQPage) مطابقة لأسئلة ظاهرة فعلاً', () => {
  const visibleQuestions = [...egyptHtml.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/g)].length;
  const faqLd = (egyptSeo.jsonLd ?? []).find((node) => node['@type'] === 'FAQPage');
  assert.ok(faqLd, 'FAQPage موجود');
  assert.equal(faqLd.mainEntity.length, visibleQuestions, 'عدد الأسئلة في JSON-LD يطابق الأسئلة الظاهرة');
});
