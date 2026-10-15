/* ==========================================================================
   فحص بيانات الأحداث المنظّمة (Event JSON-LD) وفق إرشادات جوجل
   --------------------------------------------------------------------------
   مرجع القواعد: https://developers.google.com/search/docs/appearance/structured-data/event
   يفحص كل صفحات الموقع (النسخ المنشورة في جذر المستودع والمصادر المنسوخة في
   `website/legacy/`):
     - أي كيان حدث في أي صفحة يجب أن يكون مسجّلاً هنا (فلا يُضاف ترميز حدث جديد
       دون فحص)، وأي كتلة JSON-LD غير صالحة تُسقط الاختبار.
     - الحقول الإلزامية (name، startDate، location) والموصى بها (description،
       endDate، image، performer، organizer، eventStatus، eventAttendanceMode).
     - `location`: مكان باسم وعنوان؛ والحدث في ملعب واحد يحمل عنواناً تفصيلياً
       (الشارع، المدينة، الرمز البريدي، الدولة) كما توصي جوجل.
     - `offers` اختياري، لكنه إن وُجد فهو تذاكر دخول للحدث نفسه: جوجل تشترط أن
       يقود `offers.url` إلى صفحة شراء تذكرة لهذا الحدث تحديداً. باقات المتجر
       ليست تذاكر، فلا يُسمح بأي عرض يشير إلى صفحات الموقع.
     - لا كيانات حدث متداخلة (superEvent/subEvent): جوجل تفحص كل كيان حدث متداخل
       كعنصر مستقل؛ كيان `superEvent` باسم فقط كان مصدر الخطأين الحرجين
       «Missing field "location" / "startDate"»، والبطولة الممتدة على موسم كامل
       ليست حدثاً في مكان واحد.
     - صفحة المتابعة لا تكرّر حدث المباراة (لكل حدث رابط واحد يحمل ترميزه) بل
       تشير إلى كيانه عبر `about` → `@id`.
     - النسخة المنشورة تطابق المصدر المنسوخ حتى لا تنفصلا أبداً.
========================================================================== */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.dirname(website);
const SITE = 'https://streammasterstore.com';

const MATCH_PAGE = 'manchester-united-atletico/index.html';
const WATCH_PAGE = 'manchester-united-atletico/watch/index.html';
const WORLD_CUP_PAGE = 'world-cup-2026/index.html';
const MATCH_ID = `${SITE}/manchester-united-atletico/#match`;

/* الصفحات الوحيدة المسموح لها بترميز حدث، وعدد كيانات الحدث في كل منها. */
const EXPECTED_EVENT_COUNT = {
  [MATCH_PAGE]: 1,
  [WORLD_CUP_PAGE]: 1,
};

const REQUIRED = ['name', 'startDate', 'location'];
const RECOMMENDED = ['description', 'endDate', 'image', 'performer', 'organizer', 'eventStatus', 'eventAttendanceMode'];
/* EventCompleted أُضيفت بعد انتهاء كأس العالم 2026 فعلياً (النهائي 19 يوليو
   2026): حالة الحدث في صفحة البطولة يجب أن تعكس اكتماله، لا أن يبقى مجدولاً. */
const EVENT_STATUSES = ['EventScheduled', 'EventCancelled', 'EventPostponed', 'EventRescheduled', 'EventMovedOnline', 'EventCompleted'].map(
  (s) => `https://schema.org/${s}`,
);
const ATTENDANCE_MODES = ['Offline', 'Online', 'Mixed'].map((m) => `https://schema.org/${m}EventAttendanceMode`);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})?)?$/;
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'dist-ssr', 'test-results', 'playwright-report']);

const isEventType = (t) => typeof t === 'string' && (t.endsWith('Event') || ['Festival', 'Hackathon', 'EventSeries', 'CourseInstance'].includes(t));
const typesOf = (node) => (Array.isArray(node['@type']) ? node['@type'] : [node['@type']]);

function eventNodes(node, trail = 'root') {
  if (Array.isArray(node)) return node.flatMap((v, i) => eventNodes(v, `${trail}[${i}]`));
  if (node && typeof node === 'object') {
    const here = typesOf(node).some(isEventType) ? [[trail, node]] : [];
    return here.concat(Object.entries(node).flatMap(([k, v]) => eventNodes(v, `${trail}.${k}`)));
  }
  return [];
}

function graphNodes(block) {
  return Array.isArray(block['@graph']) ? block['@graph'] : [block];
}

async function readBlocks(relative) {
  const html = await fs.readFile(path.join(root, relative), 'utf8');
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  return blocks.map((m, i) => {
    try {
      return JSON.parse(m[1].trim());
    } catch (error) {
      throw new Error(`${relative}: كتلة JSON-LD رقم ${i} غير صالحة (${error.message})`);
    }
  });
}

async function readEvents(relative) {
  return (await readBlocks(relative)).flatMap((block) => eventNodes(block));
}

async function htmlFiles(dir, out = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await htmlFiles(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

/* كل الصفحات بالشجرتين: المنشورة (الجذر عدا website/) والمصادر المنسوخة. */
async function allPages() {
  const legacyRoot = path.join(website, 'legacy');
  const published = (await htmlFiles(root)).filter((f) => !f.startsWith(website + path.sep));
  const legacy = await htmlFiles(legacyRoot);
  return [
    ...published.map((f) => ({ file: path.relative(root, f), page: path.relative(root, f) })),
    ...legacy.map((f) => ({ file: path.relative(root, f), page: path.relative(legacyRoot, f) })),
  ].map(({ file, page }) => ({ file: file.split(path.sep).join('/'), page: page.split(path.sep).join('/') }));
}

const bothTrees = (relative) => [path.posix.join('website', 'legacy', relative), relative];

function offerNodes(offers) {
  return (Array.isArray(offers) ? offers : [offers]).flatMap((o) =>
    o && o['@type'] === 'AggregateOffer' ? [o, ...offerNodes(o.offers ?? [])] : [o],
  );
}

function assertEvent(trail, ev) {
  for (const field of [...REQUIRED, ...RECOMMENDED]) {
    assert.ok(field in ev && ev[field] !== null && ev[field] !== '', `${trail}: ينقصه الحقل ${field}`);
  }

  assert.match(String(ev.startDate), ISO_DATE, `${trail}: صيغة startDate`);
  assert.match(String(ev.endDate), ISO_DATE, `${trail}: صيغة endDate`);
  assert.ok(Date.parse(ev.endDate) >= Date.parse(ev.startDate), `${trail}: endDate قبل startDate`);
  assert.ok(EVENT_STATUSES.includes(ev.eventStatus), `${trail}: eventStatus غير معروف`);
  assert.ok(ATTENDANCE_MODES.includes(ev.eventAttendanceMode), `${trail}: eventAttendanceMode غير معروف`);

  const images = Array.isArray(ev.image) ? ev.image : [ev.image];
  for (const image of images) assert.match(String(image), /^https:\/\//, `${trail}: رابط الصورة يجب أن يكون مطلقاً`);

  const performers = Array.isArray(ev.performer) ? ev.performer : [ev.performer];
  for (const performer of performers) assert.ok(performer?.name, `${trail}: performer بلا اسم`);
  assert.ok(ev.organizer?.name && ev.organizer?.url, `${trail}: organizer يحتاج name وurl`);

  const places = Array.isArray(ev.location) ? ev.location : [ev.location];
  assert.ok(places.length > 0, `${trail}: location فارغ`);
  for (const place of places) {
    assert.equal(place?.['@type'], 'Place', `${trail}: نوع location`);
    assert.ok(place.name, `${trail}: location بلا اسم المكان`);
    assert.equal(place.address?.['@type'], 'PostalAddress', `${trail}: location.address`);
    assert.ok(place.address.addressCountry, `${trail}: location.address بلا دولة`);
  }
  if (!Array.isArray(ev.location)) {
    for (const field of ['streetAddress', 'addressLocality', 'postalCode', 'addressCountry']) {
      assert.ok(ev.location.address[field], `${trail}: عنوان الملعب يحتاج ${field} (جوجل توصي بعنوان تفصيلي لا باسم المدينة فقط)`);
    }
  }

  if ('offers' in ev) {
    for (const offer of offerNodes(ev.offers)) {
      assert.ok(offer?.url, `${trail}: عرض بلا url`);
      assert.ok(
        !String(offer.url).startsWith(SITE),
        `${trail}: offers.url يشير إلى ${offer.url} — العروض يجب أن تكون تذاكر دخول للحدث نفسه، وباقات المتجر ليست تذاكر`,
      );
      if (offer['@type'] === 'Offer') {
        for (const field of ['price', 'priceCurrency', 'availability']) assert.ok(field in offer, `${trail}: ينقص Offer الحقل ${field}`);
      }
    }
  }
}

test('ترميز الأحداث موجود فقط في الصفحات المسجّلة، وكل كتل JSON-LD صالحة', async () => {
  const found = {};
  for (const { file, page } of await allPages()) {
    const count = (await readEvents(file)).length;
    if (count) found[file] = { page, count };
  }
  const expected = Object.fromEntries(
    Object.entries(EXPECTED_EVENT_COUNT).flatMap(([page, count]) => bothTrees(page).map((file) => [file, { page, count }])),
  );
  assert.deepEqual(found, expected, 'صفحات تحمل ترميز حدث غير مسجّلة هنا (أو عدد كيانات مختلف) — سجّلها بعد مطابقتها للإرشادات');
});

for (const relative of Object.keys(EXPECTED_EVENT_COUNT)) {
  for (const file of bothTrees(relative)) {
    test(`بيانات الحدث مكتملة ومطابقة لإرشادات جوجل: ${file}`, async () => {
      const events = await readEvents(file);
      assert.equal(events.length, EXPECTED_EVENT_COUNT[relative], `عدد كيانات الحدث في ${file}`);
      for (const [trail, ev] of events) {
        assert.match(
          trail,
          /^root(\.@graph\[\d+\])?$/,
          `${trail}: كيان حدث متداخل — جوجل تفحصه كعنصر مستقل؛ لا تستخدم superEvent/subEvent بكيان ناقص`,
        );
        assertEvent(trail, ev);
      }
    });
  }
}

test('صفحة المباراة تعرّف كيان الحدث بمعرّف ثابت', async () => {
  for (const file of bothTrees(MATCH_PAGE)) {
    const events = await readEvents(file);
    assert.equal(events.length, 1, `${file}: يجب أن تعرّف حدث المباراة مرة واحدة`);
    const [[, match]] = events;
    assert.equal(match['@id'], MATCH_ID, `${file}: @id`);
    assert.equal(match.url, `${SITE}/manchester-united-atletico/`, `${file}: url`);
  }
});

test('حدث كأس العالم 2026 مكتمل (انتهى فعلياً في 19 يوليو 2026)', async () => {
  for (const file of bothTrees(WORLD_CUP_PAGE)) {
    const events = await readEvents(file);
    assert.equal(events.length, 1, `${file}: يجب أن تعرّف حدث البطولة مرة واحدة`);
    const [[, wc]] = events;
    assert.equal(wc.eventStatus, 'https://schema.org/EventCompleted', `${file}: eventStatus يجب أن يكون EventCompleted بعد انتهاء البطولة`);
    assert.ok(Date.parse(wc.endDate) < Date.now(), `${file}: endDate يجب أن يكون في الماضي`);
  }
});

test('صفحة المتابعة لا تكرّر حدث المباراة وتشير إلى كيانه الأصلي', async () => {  for (const file of bothTrees(WATCH_PAGE)) {
    const blocks = await readBlocks(file);
    assert.equal(blocks.flatMap((block) => eventNodes(block)).length, 0, `${file}: يجب ألا تكرّر حدث المباراة`);
    const webPage = blocks.flatMap(graphNodes).find((node) => typesOf(node).includes('WebPage'));
    assert.equal(webPage?.about?.['@id'], MATCH_ID, `${file}: WebPage.about يجب أن يشير إلى كيان المباراة`);
  }
});

test('النسخة المنشورة تحمل نفس بيانات JSON-LD الموجودة في المصدر المنسوخ', async () => {
  for (const relative of [MATCH_PAGE, WATCH_PAGE, WORLD_CUP_PAGE]) {
    const [legacy, published] = await Promise.all(bothTrees(relative).map(readBlocks));
    assert.deepEqual(published, legacy, `${relative}: المنشور لا يطابق المصدر — أعد npm run build`);
  }
});
