/* ==========================================================================
   فحص بيانات الأحداث المنظّمة (Event JSON-LD)
   --------------------------------------------------------------------------
   يتحقّق من كل كيان `SportsEvent`/`Event` في صفحات الموقع (المصادر المنسوخة
   في `website/legacy/` والنسخ المنشورة المولّدة في جذر المستودع) أن يحمل:
     - الحقول الإلزامية لتقرير «Events» في Search Console: name، startDate، location.
     - الحقول الموصى بها: description، endDate، image، offers، performer،
       organizer، eventStatus، eventAttendanceMode.
     - اكتمال `offers` (AggregateOffer) بالعملة والتوفّر والرابط ونطاق الأسعار.
   السبب: كيان حدث ناقص الحقول (مثل `superEvent` باسم فقط) يُنتج أخطاءً حرجة
   («Missing field "location" / "startDate"») تمنع ظهور النتائج الغنية.
   يفحص الاختبار الشجرتين معاً حتى لا تنفصل النسخة المنشورة عن مصدرها أبداً.
========================================================================== */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.dirname(website);

const REQUIRED = ['name', 'startDate', 'location'];
const RECOMMENDED = [
  'description',
  'endDate',
  'image',
  'offers',
  'performer',
  'organizer',
  'eventStatus',
  'eventAttendanceMode',
];
const OFFER_FIELDS = ['priceCurrency', 'availability', 'url', 'lowPrice', 'highPrice'];

/* عدد كيانات الحدث المتوقعة في كل صفحة: المباراة + بطولتها (superEvent)،
   وصفحة المتابعة، وكأس العالم 2026. */
const EXPECTED_EVENT_COUNT = {
  'manchester-united-atletico/index.html': 2,
  'manchester-united-atletico/watch/index.html': 1,
  'world-cup-2026/index.html': 1,
};

const EVENT_TYPES = new Set(['Event', 'SportsEvent', 'MusicEvent', 'BusinessEvent', 'BroadcastEvent']);

function eventNodes(node, trail = 'root') {
  if (Array.isArray(node)) return node.flatMap((v, i) => eventNodes(v, `${trail}[${i}]`));
  if (node && typeof node === 'object') {
    const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
    const here = types.some((t) => EVENT_TYPES.has(t)) ? [[trail, node]] : [];
    return here.concat(Object.entries(node).flatMap(([k, v]) => eventNodes(v, `${trail}.${k}`)));
  }
  return [];
}

async function readEvents(relative) {
  const html = await fs.readFile(path.join(root, relative), 'utf8');
  const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  return blocks.flatMap((m) => eventNodes(JSON.parse(m[1].trim())));
}

for (const [relative, expected] of Object.entries(EXPECTED_EVENT_COUNT)) {
  for (const tree of ['legacy', 'published']) {
    const file = tree === 'legacy' ? path.join('website', 'legacy', relative) : relative;
    test(`بيانات الأحداث مكتملة الحقول: ${file}`, async () => {
      const events = await readEvents(file);
      assert.equal(events.length, expected, `عدد كيانات الحدث في ${file}`);
      for (const [trail, ev] of events) {
        for (const field of [...REQUIRED, ...RECOMMENDED]) {
          assert.ok(field in ev && ev[field] !== null && ev[field] !== '', `${trail}: ينقصه الحقل ${field}`);
        }
        assert.ok(Array.isArray(ev.location) ? ev.location.length > 0 : typeof ev.location === 'object', `${trail}: location غير صالح`);
        assert.match(String(ev.startDate), /^\d{4}-\d{2}-\d{2}/, `${trail}: صيغة startDate`);
        const offers = ev.offers;
        assert.equal(offers['@type'], 'AggregateOffer', `${trail}: نوع offers`);
        for (const field of OFFER_FIELDS) assert.ok(field in offers, `${trail}: ينقص offers الحقل ${field}`);
        assert.ok(Array.isArray(offers.offers) && offers.offers.length > 0, `${trail}: قائمة offers فارغة`);
        for (const offer of offers.offers) {
          assert.equal(offer['@type'], 'Offer', `${trail}: نوع عنصر offers`);
          for (const field of ['name', 'price', 'priceCurrency', 'availability', 'url']) {
            assert.ok(field in offer, `${trail}: ينقص Offer الحقل ${field}`);
          }
        }
      }
    });
  }
}

test('النسخة المنشورة تحمل نفس كيانات الحدث الموجودة في المصدر المنسوخ', async () => {
  for (const relative of Object.keys(EXPECTED_EVENT_COUNT)) {
    const fromLegacy = (await readEvents(path.join('website', 'legacy', relative))).map(([, ev]) => JSON.stringify(ev));
    const fromPublished = (await readEvents(relative)).map(([, ev]) => JSON.stringify(ev));
    assert.deepEqual(fromPublished, fromLegacy, `${relative}: المنشور لا يطابق المصدر — أعد npm run build`);
  }
});
