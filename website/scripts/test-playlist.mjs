/* ==========================================================================
   اختبارات منطق قائمة القنوات (kora-live.m3u8) — 9 فحوص
   التشغيل:  npm test        (أو: node --test scripts/)
   لا تحتاج شبكة ولا أي اعتماديات خارجية.
========================================================================== */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  FALLBACK_CHANNEL_LOGO,
  FALLBACK_CHANNEL_NAME,
  LIVE_CATEGORY,
  parseKoraPlaylist,
} from "../src/lib/koraPlaylist.mjs";

const HEADER = "#EXTM3U\n";

/* ١ — يقرأ القناة واسمها ورابطها من سطر #EXTINF */
test("1) يقرأ القناة واسمها ورابطها", () => {
  const text =
    HEADER +
    '#EXTINF:-1 tvg-name="786431" group-title="مباريات مباشرة" tvg-logo="⚽",786431\n' +
    "https://passive-rotunda-deduct.ngrok-free.dev/my_restream.m3u8\n";

  const list = parseKoraPlaylist(text);

  assert.equal(list.length, 1);
  assert.equal(list[0].name, "786431");
  assert.equal(list[0].url, "https://passive-rotunda-deduct.ngrok-free.dev/my_restream.m3u8");
});

/* ٢ — «Live» تُوحَّد إلى «مباريات مباشرة» */
test("2) يوحّد التصنيف «Live» إلى «مباريات مباشرة»", () => {
  const list = parseKoraPlaylist(
    HEADER + '#EXTINF:-1 tvg-name="x" group-title="Live",قناة\nhttps://a.example/x.m3u8\n'
  );

  assert.equal(list[0].cat, LIVE_CATEGORY);
  assert.equal(list[0].cat, "مباريات مباشرة");
});

/* ٣ — التصنيف العربي الصريح يبقى كما هو */
test("3) يحفظ التصنيف الصريح كما هو", () => {
  const list = parseKoraPlaylist(
    HEADER + '#EXTINF:-1 group-title="رياضية",قناة رياضية\nhttps://a.example/s.m3u8\n'
  );

  assert.equal(list[0].cat, "رياضية");
});

/* ٤ — tvg-logo يُستبدل بإيموجي كرة (رابط favicon لا يصلح كأيقونة) */
test("4) يستبدل tvg-logo بإيموجي الكرة", () => {
  const list = parseKoraPlaylist(
    HEADER +
      '#EXTINF:-1 tvg-logo="https://logo.example/very/long/path.png",قناة\nhttps://a.example/l.m3u8\n'
  );

  assert.equal(list[0].logo, FALLBACK_CHANNEL_LOGO);
  assert.equal(list[0].logo, "⚽");
});

/* ٥ — اسم افتراضي لو كان ما بعد الفاصلة فارغاً */
test("5) يستخدم الاسم الافتراضي عند غياب الاسم", () => {
  const list = parseKoraPlaylist(HEADER + "#EXTINF:-1,   \nhttps://a.example/n.m3u8\n");

  assert.equal(list[0].name, FALLBACK_CHANNEL_NAME);
});

/* ٦ — #EXTINF بلا رابط بعده لا يُنتج قناة وهمية */
test("6) يتجاهل #EXTINF بلا رابط بث", () => {
  const list = parseKoraPlaylist(HEADER + '#EXTINF:-1 group-title="Live",قناة بلا رابط\n');

  assert.deepEqual(list, []);
});

/* ٧ — نهايات أسطر CRLF (ملفات ويندوز) لا تكسر القراءة */
test("7) يتعامل مع نهايات أسطر CRLF", () => {
  const list = parseKoraPlaylist(
    HEADER.replace("\n", "\r\n") +
      '#EXTINF:-1 group-title="Live",قناة\r\nhttps://a.example/crlf.m3u8\r\n'
  );

  assert.equal(list.length, 1);
  assert.equal(list[0].url, "https://a.example/crlf.m3u8");
});

/* ٨ — نص ليس قائمة m3u8 (صفحة HTML مثلاً) لا يُفسَّر كقنوات */
test("8) يُرجع قائمة فارغة لنص ليس m3u8", () => {
  assert.deepEqual(parseKoraPlaylist("<html>ngrok warning</html>"), []);
  assert.deepEqual(parseKoraPlaylist(""), []);
  assert.deepEqual(parseKoraPlaylist(undefined), []);
});

/* Optional rebroadcasting is not imported from the reference store. */
test("9) optional playlist is valid and does not import reference stream credentials", () => {
  const path = fileURLToPath(new URL("../public/kora-live.m3u8", import.meta.url));
  const text = readFileSync(path, "utf8");
  assert.ok(text.startsWith("#EXTM3U"));
  assert.deepEqual(parseKoraPlaylist(text), []);
});
