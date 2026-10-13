#!/usr/bin/env node
/* ==========================================================================
   فحص مسار المتصفح للبث المعاد (قناة 786431) — يدوياً أو من GitHub Actions
   --------------------------------------------------------------------------
   node scripts/check-proxy.mjs

   لماذا؟ إصلاح نفق ngrok يعيش في proxy/worker.js، ولا يعمل على الموقع قبل أن
   يُنشر الوسيط فعلاً على Cloudflare. هذا الفحص يخبرنا بصراحة أي مرحلة مكسورة:

     ① الوسيط المنشور يستجيب أصلاً          (/health → OK)
     ② الوسيط المنشور يتخطى صفحة تحذير ngrok (يرد HLS لا HTML) ← الفحص الحاسم
     ③ هل نفق ngrok + أداة إعادة البث يعملان الآن؟  (معلومة — لا يُسقِط الفحص)

   ملاحظة مقصودة: لو كان جهاز صاحب الموقع مغلقاً فلن يعمل البث المعاد، وهذا
   سلوك متوقع («البث المعاد غير متاح حالياً») — لذلك ③ لا يُسقِط الفحص،
   وكذلك ② يُعامَل كتحذير لو كان النفق نفسه غير متصل (الخلل ليس في الوسيط).

   خروج: 0 = كل شيء سليم (أو النفق غير متاح فقط) | 1 = الوسيط المنشور قديم/مكسور
========================================================================== */

import { appendFileSync } from "node:fs";

const PROXY = process.env.PROXY_BASE || "https://serverproject.ahmedlasheenrespicare.workers.dev";
const SITE = "https://ahmedlasheenrespicare-png.github.io";
const NGROK_HOST = process.env.RESTREAM_HOST || "passive-rotunda-deduct.ngrok-free.dev";
const RESTREAM_PATH = "/my_restream.m3u8";
const SKIP_HEADER = "ngrok-skip-browser-warning";

/* رؤوس الطلب التي يُرسلها متصفح حقيقي (hls.js) — ضرورية لصحة الفحص:
   صفحة تحذير ngrok تُعرض لطلبات المتصفحات تحديداً، وأي User-Agent غير متصفح
   (مثل "node" الافتراضي في Node) يتخطاها تلقائياً — فينجح الفحص كذباً حتى مع
   وسيط قديم لا يرسل الترويسة. لذلك نُقلّد المتصفح صراحةً. */
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "ar,en;q=0.9",
};

const ATTEMPTS = Number(process.env.CHECK_ATTEMPTS || 6); /* نشر Cloudflare يستغرق دقيقة تقريباً */
const RETRY_DELAY_MS = Number(process.env.CHECK_RETRY_DELAY_MS || 15000);
const TIMEOUT_MS = 20000;

const WARNING_MARKERS = ["You are about to visit", SKIP_HEADER];
const OFFLINE_MARKERS = ["ERR_NGROK_3200", "ERR_NGROK_8012", "is offline", "endpoint offline"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const head = (text, n = 160) => text.replace(/\s+/g, " ").trim().slice(0, n);

async function get(url, headers = {}) {
  const res = await fetch(url, {
    headers,
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  let body = "";
  try {
    body = await res.text();
  } catch {
    body = "";
  }
  return { status: res.status, contentType: res.headers.get("content-type") || "", body };
}

function isHls({ body, contentType }) {
  return body.trimStart().startsWith("#EXTM3U") || /mpegurl/i.test(contentType);
}

function isNgrokWarningPage({ body, contentType }) {
  const looksHtml = /text\/html/i.test(contentType) || /<html/i.test(body);
  return looksHtml && WARNING_MARKERS.some((m) => body.includes(m));
}

function isNgrokOfflinePage({ body, contentType }) {
  const looksHtml = /text\/html/i.test(contentType) || /<html/i.test(body);
  return looksHtml && OFFLINE_MARKERS.some((m) => body.includes(m));
}

/* ------------------------------- ① الصحة ------------------------------- */
async function checkHealth() {
  console.log("① فحص الوسيط المنشور — GET /health");
  try {
    const res = await get(`${PROXY}/health`, { Origin: SITE });
    const ok = res.status === 200 && res.body.trim().toUpperCase().includes("OK");
    console.log(
      `   ${ok ? "✅" : "❌"} ${PROXY}/health → ${res.status} ${head(res.body, 60) || "(بلا جسم)"}`
    );
    return ok;
  } catch (e) {
    console.log(`   ❌ تعذّر الوصول إلى ${PROXY}/health — ${e.message}`);
    console.log("      تأكد من نشر Worker باسم serverproject على حسابك في Cloudflare.");
    return false;
  }
}

/* --------------------- ② تخطي تحذير ngrok (الأهم) --------------------- */
async function checkNgrokBypass() {
  const url = `${PROXY}/h/${NGROK_HOST}${RESTREAM_PATH}`;
  console.log(`② فحص تخطي تحذير ngrok — GET /h/${NGROK_HOST}${RESTREAM_PATH}`);

  let last = null;

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    let res;
    try {
      res = await get(url, { Origin: SITE, ...BROWSER_HEADERS });
    } catch (e) {
      last = { kind: "network", detail: e.message };
      console.log(`   ⏳ محاولة ${attempt}/${ATTEMPTS}: تعذّر الاتصال (${e.message})`);
      if (attempt < ATTEMPTS) await sleep(RETRY_DELAY_MS);
      continue;
    }

    if (isHls(res)) {
      console.log(`   ✅ محاولة ${attempt}/${ATTEMPTS}: الوسيط المنشور يرد ملف HLS حقيقي`);
      console.log(`      ${head(res.body) || "(بلا جسم)"}`);
      return { ok: true };
    }

    if (isNgrokWarningPage(res)) {
      last = { kind: "warning", detail: `HTTP ${res.status} — صفحة تحذير HTML` };
      console.log(
        `   ⏳ محاولة ${attempt}/${ATTEMPTS}: وصلت صفحة تحذير ngrok (HTML) — الوسيط المنشور ما زال قديماً`
      );
      if (attempt < ATTEMPTS) await sleep(RETRY_DELAY_MS);
      continue;
    }

    if (isNgrokOfflinePage(res)) {
      console.log(`   ⚠️ النفق/أداة إعادة البث غير متصلة الآن (${head(res.body, 90)})`);
      return { ok: true, warning: "restream-offline" };
    }

    if (/NGROK_WARNING_PAGE/i.test(res.body)) {
      /* نسخة جديدة من الوسيط لكن النفق يرد صفحة التحذير: الوسيط المنشور سليم */
      last = { kind: "warning-passthrough", detail: head(res.body, 120) };
      console.log(`   ⚠️ الوسيط يعمل لكن النفق يرد صفحة تحذير: ${head(res.body, 120)}`);
      return { ok: true, warning: "tunnel-warning" };
    }

    last = {
      kind: "other",
      detail: `HTTP ${res.status} ${res.contentType} — ${head(res.body, 120) || "(بلا جسم)"}`,
    };
    console.log(`   ⏳ محاولة ${attempt}/${ATTEMPTS}: رد غير متوقع — ${last.detail}`);
    if (attempt < ATTEMPTS) await sleep(RETRY_DELAY_MS);
  }

  console.log(`   ❌ فشل الفحص ② — ${last ? last.detail : "بلا رد"}`);
  return { ok: false, reason: last ? last.kind : "unknown" };
}

/* ------------------- ③ هل نفق/أداة إعادة البث تعمل؟ ------------------- */
async function checkTunnelAlive() {
  console.log(`③ (معلومة) هل نفق ngrok متصل الآن؟ — GET https://${NGROK_HOST}${RESTREAM_PATH}`);
  try {
    const res = await get(`https://${NGROK_HOST}${RESTREAM_PATH}`, {
      ...BROWSER_HEADERS,
      [SKIP_HEADER]: "true",
    });
    if (isHls(res)) {
      console.log("   ✅ النفق يعمل ويرد ملف HLS — البث المعاد متاح الآن");
      return "up";
    }
    if (isNgrokOfflinePage(res)) {
      console.log("   ⚠️ النفق غير متصل (ERR_NGROK_3200) — شغّل أداة إعادة البث + ngrok على جهازك");
      return "offline";
    }
    console.log(`   ⚠️ رد غير متوقع من النفق: HTTP ${res.status} — ${head(res.body, 100)}`);
    return "unknown";
  } catch (e) {
    console.log(`   ⚠️ تعذّر الوصول إلى النفق: ${e.message}`);
    return "unknown";
  }
}

/* -------------------------------- التشغيل -------------------------------- */
console.log("=== فحص مسار البث المعاد (قناة 786431) ===");
console.log(`الوسيط : ${PROXY}`);
console.log(`النفق  : ${NGROK_HOST}\n`);

const healthOk = await checkHealth();
console.log("");
/* نُجري فحص ② حتى لو فشل ① — قد يكون /health معطّلاً بينما التوجيه يعمل */
const bypass = await checkNgrokBypass();
console.log("");
const tunnel = healthOk ? await checkTunnelAlive() : "unknown";

console.log("\n=== الخلاصة ===");
console.log(`① الوسيط يستجيب        : ${healthOk ? "✅" : "❌"}`);
console.log(
  `② تخطي تحذير ngrok     : ${bypass.ok ? "✅" : "❌"}${bypass.warning ? ` (تحذير: ${bypass.warning})` : ""}`
);
console.log(`③ النفق/إعادة البث     : ${tunnel === "up" ? "✅ متاح" : `⚠️ ${tunnel}`}`);

/* --------------------------------------------------------------------------
   نتيجة مقروءة آلياً: سطر JSON ثابت + ملخص في تبويب Actions + تنبيه (annotation)
   (سجلّ الـ workflow ليس متاحاً دائماً للقراءة من خارج GitHub — التنبيه يُقرأ
   من الـ API: /repos/{owner}/{repo}/check-runs/{id}/annotations)
-------------------------------------------------------------------------- */
const report = {
  health: healthOk,
  bypass: bypass.ok,
  bypassReason: bypass.reason ?? null,
  bypassWarning: bypass.warning ?? null,
  tunnel,
};

console.log(`RESTREAM_CHECK ${JSON.stringify(report)}`);

const label =
  `① ${healthOk ? "OK" : "FAIL"} · ② ${bypass.ok ? "OK" : "FAIL"}` +
  `${bypass.warning ? ` (${bypass.warning})` : ""} · ③ ${tunnel}`;

if (process.env.GITHUB_ACTIONS === "true") {
  console.log(`::notice title=Restream check result::${label}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        [
          "## فحص البث المعاد (قناة 786431)",
          `- ① الوسيط المنشور يستجيب: ${healthOk ? "✅" : "❌"}`,
          `- ② تخطي تحذير ngrok (يرد HLS لا HTML): ${bypass.ok ? "✅" : "❌"}${
            bypass.warning ? ` — تحذير: ${bypass.warning}` : ""
          }`,
          `- ③ النفق/أداة إعادة البث: ${tunnel === "up" ? "✅ متاح" : `⚠️ ${tunnel}`}`,
          "",
          `\`RESTREAM_CHECK ${JSON.stringify(report)}\``,
          "",
        ].join("\n")
      );
    } catch {
      /* بيئة بلا ملف ملخص — لا مشكلة */
    }
  }
}

if (!healthOk || !bypass.ok) {
  console.log("\n❌ النتيجة: الوسيط المنشور لا يمرّر البث بشكل صحيح.");
  if (!healthOk) {
    console.log("   • تحقق من https://serverproject.ahmedlasheenrespicare.workers.dev/health");
    console.log("   • تأكد أن Cloudflare Workers Builds نشرت proxy/worker.js بعد الدفع إلى main.");
  }
  if (bypass.reason === "warning") {
    console.log("   • السبب: النفق يرد صفحة تحذير HTML وليس البث ⇒ الوسيط المنشور نسخة قديمة");
    console.log("     من proxy/worker.js (التي لا ترسل ترويسة ngrok-skip-browser-warning).");
  }
  console.log("   • الحل: تأكد من نشر Worker، أو شغّل يدوياً: npx wrangler deploy");
  process.exit(1);
}

if (tunnel !== "up") {
  console.log(
    "\n⚠️  الوسيط سليم، لكن جهاز البث (أداة إعادة البث + ngrok) غير متاح الآن —\n" +
      "    سيظهر للزائر «البث المعاد غير متاح حالياً»، وهذا سلوك متوقع لا خلل في الكود."
  );
}

console.log("\n✅ النتيجة: مسار البث المعاد سليم.");
