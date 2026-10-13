/* ==========================================================================
   اختبارات سلوك الوسيط (proxy/worker.js) — 8 فحوص
   أهمها: تجاوز صفحة تحذير ngrok (سبب فشل تشغيل قناة البث المعاد 786431).
   التشغيل:  npm test        (أو: node --test scripts/)
   الاختبارات لا تلمس الشبكة إطلاقاً: نستبدل fetch بدالة وهمية ونفحص الطلب
   الصادر الفعلي والرد العائد للزائر.
========================================================================== */

import { test } from "node:test";
import assert from "node:assert/strict";

import worker from "../proxy/worker.js";

const PROXY = "https://serverproject.ahmedlasheenrespicare.workers.dev";
const SITE = "https://ahmedlasheenrespicare-png.github.io";
const NGROK_HOST = "passive-rotunda-deduct.ngrok-free.dev";
const NGROK_SKIP_HEADER = "ngrok-skip-browser-warning";
const MBC_HOST = "shd-gcp-live.edgenextcdn.net";

/* --------------------------------------------------------------------------
   أداة: استبدال fetch العالمي بدالة وهمية تُسجّل الطلب الصادر
   (ترجع calls: روابط/رؤوس ما طلبه الوسيط من السيرفر الأصلي)
-------------------------------------------------------------------------- */
function stubFetch(response) {
  const calls = [];
  const original = globalThis.fetch;

  globalThis.fetch = async (input, init = {}) => {
    const url =
      input instanceof URL ? input.href : typeof input === "string" ? input : String(input.url);
    const headers = new Headers(init.headers || (input && input.headers) || {});
    calls.push({ url, method: init.method || "GET", headers });

    const out = typeof response === "function" ? response(url, headers) : response;
    if (out instanceof Promise) return out;
    return out;
  };

  return {
    calls,
    restore() {
      globalThis.fetch = original;
    },
  };
}

const MANIFEST =
  "#EXTM3U\n" +
  "#EXT-X-VERSION:3\n" +
  "#EXTINF:6.0,\n" +
  "seg1.ts\n" +
  "#EXTINF:6.0,\n" +
  "https://other.example/live/seg2.ts\n" +
  "#EXTINF:6.0,\n" +
  "http://plain.example/seg3.ts\n";

const m3u8Response = () =>
  new Response(MANIFEST, {
    status: 200,
    headers: { "content-type": "application/vnd.apple.mpegurl" },
  });

/* ١٠ — ترويسة تخطي تحذير ngrok تُرسل إلى مضيفات ngrok */
test("10) يرسل ngrok-skip-browser-warning إلى مضيف ngrok", async () => {
  const stub = stubFetch(m3u8Response());
  try {
    const res = await worker.fetch(new Request(`${PROXY}/h/${NGROK_HOST}/my_restream.m3u8`));

    assert.equal(stub.calls.length, 1);
    assert.equal(stub.calls[0].url, `https://${NGROK_HOST}/my_restream.m3u8`);
    assert.equal(
      stub.calls[0].headers.get(NGROK_SKIP_HEADER),
      "true",
      "بدون هذه الترويسة يرد ngrok صفحة تحذير HTML بدل البث"
    );
    assert.equal(res.status, 200);
  } finally {
    stub.restore();
  }
});

/* ١١ — ولا تُرسل إلى سيرفرات أخرى (لا نُسرّب ترويسات غريبة) */
test("11) لا يرسل ترويسة ngrok إلى سيرفر غير ngrok", async () => {
  const stub = stubFetch(m3u8Response());
  try {
    await worker.fetch(new Request(`${PROXY}/h/${MBC_HOST}/live/x/index.m3u8`));

    assert.equal(stub.calls[0].headers.get(NGROK_SKIP_HEADER), null);
    assert.equal(stub.calls[0].url, `https://${MBC_HOST}/live/x/index.m3u8`);
  } finally {
    stub.restore();
  }
});

/* ١٢ — صفحة التحذير (لو وصلت رغم الترويسة) تتحول لخطأ JSON صريح لا HTML */
test("12) يحوّل صفحة تحذير ngrok إلى خطأ JSON واضح", async () => {
  const warningHtml =
    "<!doctype html><html><head><title>ngrok</title></head><body><h1>You are about to visit</h1>" +
    `<p>passive-rotunda-deduct.ngrok-free.dev</p><p>${NGROK_SKIP_HEADER}</p></body></html>`;

  const stub = stubFetch(
    () =>
      new Response(warningHtml, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      })
  );
  try {
    const res = await worker.fetch(new Request(`${PROXY}/h/${NGROK_HOST}/my_restream.m3u8`));
    const raw = await res.text();
    const body = JSON.parse(raw);

    assert.equal(res.status, 502);
    assert.equal(body.error, "NGROK_WARNING_PAGE");
    assert.equal(raw.includes("<html"), false, "لا يجب تمرير HTML إلى hls.js");
  } finally {
    stub.restore();
  }
});

/* ١٣ — ملف البث الحقيقي يُعاد كما هو HLS (بترويسة نوع صحيحة) لا HTML */
test("13) يمرّر قائمة HLS بترويسة نوع صحيحة", async () => {
  const stub = stubFetch(m3u8Response());
  try {
    const res = await worker.fetch(new Request(`${PROXY}/h/${NGROK_HOST}/my_restream.m3u8`));
    const text = await res.text();

    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") || "", /mpegurl/i);
    assert.ok(text.startsWith("#EXTM3U"), "يجب أن يعود ملف HLS حقيقي");
  } finally {
    stub.restore();
  }
});

/* ١٤ — إعادة كتابة روابط القائمة: https → /h/ و http → /x/ (بلا كسر السيرفرات بلا TLS) */
test("14) يعيد كتابة روابط القائمة عبر الوسيط (‎/h‎ لـ https و ‎/x‎ لـ http)", async () => {
  const stub = stubFetch(m3u8Response());
  try {
    const res = await worker.fetch(new Request(`${PROXY}/h/${NGROK_HOST}/my_restream.m3u8`));
    const text = await res.text();

    assert.ok(text.includes(`/h/${NGROK_HOST}/seg1.ts`), "الرابط النسبي يُحلّ عبر /h/");
    assert.ok(text.includes("/h/other.example/live/seg2.ts"), "رابط https → /h/");
    assert.ok(text.includes("/x/plain.example/seg3.ts"), "رابط http → /x/ (بلا TLS)");
    assert.equal(text.includes("http://plain.example/seg3.ts"), false, "لا يبقى رابط مباشر");
  } finally {
    stub.restore();
  }
});

/* ١٥ — سلسلة الاستعلام (توكنات القنوات) تُمرَّر للسيرفر الأصلي */
test("15) يمرّر سلسلة الاستعلام (token) إلى السيرفر الأصلي", async () => {
  const stub = stubFetch(m3u8Response());
  try {
    await worker.fetch(
      new Request(`${PROXY}/h/${NGROK_HOST}/my_restream.m3u8?token=abc123&e=99`)
    );

    assert.ok(stub.calls[0].url.includes("token=abc123"), "التوكن يجب أن يصل للسيرفر");
    assert.ok(stub.calls[0].url.includes("e=99"));
  } finally {
    stub.restore();
  }
});

/* ١٦ — CORS: نطاق الموقع مسموح، وأي نطاق آخر يُرفض */
test("16) يسمح لنطاق الموقع (بما فيه streammasterstore.com) ويرفض نطاقاً غريباً (403)", async () => {
  const stub = stubFetch(() => m3u8Response());
  try {
    const allowed = await worker.fetch(
      new Request(`${PROXY}/h/${MBC_HOST}/live/x/index.m3u8`, { headers: { Origin: SITE } })
    );
    assert.equal(allowed.status, 200);
    assert.equal(allowed.headers.get("Access-Control-Allow-Origin"), SITE);

    const allowedStore = await worker.fetch(
      new Request(`${PROXY}/h/${MBC_HOST}/live/x/index.m3u8`, {
        headers: { Origin: "https://streammasterstore.com" },
      })
    );
    assert.equal(allowedStore.status, 200);
    assert.equal(
      allowedStore.headers.get("Access-Control-Allow-Origin"),
      "https://streammasterstore.com"
    );

    const allowedWww = await worker.fetch(
      new Request(`${PROXY}/h/${MBC_HOST}/live/x/index.m3u8`, {
        headers: { Origin: "https://www.streammasterstore.com" },
      })
    );
    assert.equal(allowedWww.status, 200);
    assert.equal(
      allowedWww.headers.get("Access-Control-Allow-Origin"),
      "https://www.streammasterstore.com"
    );

    const denied = await worker.fetch(
      new Request(`${PROXY}/h/${MBC_HOST}/live/x/index.m3u8`, {
        headers: { Origin: "https://evil.example" },
      })
    );
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).error, "ORIGIN_NOT_ALLOWED");
  } finally {
    stub.restore();
  }
});

/* ١٧ — حجب المضيفات الداخلية (SSRF) قبل أي محاولة اتصال */
test("17) يحجب المضيفات الداخلية والخاصة (SSRF)", async () => {
  const stub = stubFetch(m3u8Response());
  try {
    const localhost = await worker.fetch(new Request(`${PROXY}/h/localhost/secret.m3u8`));
    assert.equal(localhost.status, 403);
    assert.equal((await localhost.json()).error, "BLOCKED_HOST");

    const metadata = await worker.fetch(
      new Request(`${PROXY}/?u=${encodeURIComponent("http://169.254.169.254/latest/meta-data/")}`)
    );
    assert.equal(metadata.status, 403);
    assert.equal((await metadata.json()).error, "BLOCKED_HOST");

    assert.equal(stub.calls.length, 0, "لا يجب إجراء أي اتصال بمضيف محجوب");
  } finally {
    stub.restore();
  }
});
