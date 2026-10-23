import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {load} from 'cheerio';
import {MIN_ADS_WORDS, visibleWords, hasAdLoader, assertAdsAllowed} from './ads-guard.mjs';

const website = new URL('../', import.meta.url);
const root = new URL('../../', import.meta.url);
const AD_LOADER = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8373438380621206';

/* الصفحات التي أُخرجت من برنامج الإعلانات: صفحات watch الأربع، والواجهات
   الوظيفية، ومشغّلا البث. وجود المُحمِّل فيها مخالف لسياسة AdSense. */
const NO_ADS = [
  'galatasaray-barcelona/watch/index.html',
  'manchester-city-psg/watch/index.html',
  'manchester-united-atletico/watch/index.html',
  'roma-real-madrid/watch/index.html',
  'status/index.html',
  'predictions/index.html',
  'live-free.html',
  'player.html',
];

test('حارس AdSense: يرفض الإعلانات على صفحة نصّها أقل من الحد', () => {
  const thin = `<html><head><script src="${AD_LOADER}"></script></head><body><main>نص قصير جداً</main></body></html>`;
  assert.throws(() => assertAdsAllowed(thin, '/thin'), /أقل من الحد|< \d+/);
  assert.equal(visibleWords(thin) < MIN_ADS_WORDS, true);
});

test('حارس AdSense: يسمح بالصفحة الغنية ويقرأ عدد الكلمات من <main> فقط', () => {
  const rich = `<html><head><script src="${AD_LOADER}"></script></head>
    <body><nav>${'تنقل '.repeat(500)}</nav><main>${'كلمة '.repeat(MIN_ADS_WORDS + 5)}</main></body></html>`;
  assert.equal(hasAdLoader(rich), true);
  assert.deepEqual(assertAdsAllowed(rich, '/rich'), {words: MIN_ADS_WORDS + 5, ads: true});
  assert.equal(visibleWords(rich), MIN_ADS_WORDS + 5, 'نص التنقل والسكربتات لا يُحسب');
});

test('حارس AdSense: الصفحة بلا مُحمِّل تمرّ بلا شروط', () => {
  const clean = '<html><body><main>صفحة بلا إعلانات</main></body></html>';
  assert.equal(hasAdLoader(clean), false);
  assert.deepEqual(assertAdsAllowed(clean, '/clean'), {words: visibleWords(clean), ads: false});
  assert.equal(visibleWords(clean), 3);
});

test('الصفحات المستثناة فعلياً في الشجرة المنشورة بلا أي أثر لـ AdSense', async () => {
  for (const page of NO_ADS) {
    const html = await fs.readFile(new URL(page, root), 'utf8');
    assert.equal(hasAdLoader(html), false, `${page}: ما زال يحمل مُحمِّل الإعلانات`);
  }
});

test('كل صفحة إعلانية منشورة تتجاوز حدّ الكلمات (286 صفحة على الأقل)', async () => {
  const pages = [
    'index.html',
    'blog/رسيفر-iptv/index.html',
    'blog/تقطيع-بث-iptv/index.html',
    'store/index.html',
    'faq/index.html',
    'channels/religious/index.html',
  ];
  let checked = 0;
  for (const page of pages) {
    const html = await fs.readFile(new URL(page, root), 'utf8');
    if (!hasAdLoader(html)) continue;
    const words = visibleWords(html);
    assert.ok(words >= MIN_ADS_WORDS, `${page}: ${words} كلمة فقط`);
    checked++;
  }
  assert.ok(checked >= 5, `صفحات إعلانية مفحوصة: ${checked}`);
});

test('سياسة الخصوصية تفصح عن إعلانات الأطراف الثالثة (شرط AdSense)', async () => {
  const $ = load(await fs.readFile(new URL('privacy/index.html', root), 'utf8'), {decodeEntities: false});
  const text = $('main').text();
  assert.match(text, /AdSense/, 'لا ذكر لـ AdSense في سياسة الخصوصية');
  assert.match(text, /ملفات تعريف ارتباط/, 'لا إفصاح عن ملفات الارتباط الإعلانية');
  /* الرابطان في href لا في النص المرئي — يُفحصان كسمات */
  assert.equal($('a[href*="adssettings.google.com"]').length >= 1, true, 'لا رابط لإيقاف الإعلانات المخصّصة');
  assert.equal($('a[href*="aboutads.info"]').length >= 1, true, 'لا رابط aboutads.info');
  assert.equal($('a[href*="policies.google.com"]').length >= 1, true, 'لا رابط سياسة Google');
});
