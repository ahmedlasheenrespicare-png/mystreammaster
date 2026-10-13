/* ==========================================================================
   فحص الترطيب (Hydration) — يتأكد أن HTML المُولَّد مسبقاً يطابق ما يرسمه المتصفح
   --------------------------------------------------------------------------
   التشغيل:
     npm run build:ssr          # يبني وحدة الخادم
     npm i -D jsdom             # مرة واحدة (الاعتمادية غير مضمّنة افتراضياً)
     node scripts/hydration-check.mjs

   الفائدة: أي تعديل يجعل الخادم يرسم شيئاً مختلفاً عن المتصفح (تاريخ، رقم عشوائي،
   قراءة من window أثناء الرسم...) سيظهر هنا كخطأ قبل أن يظهر للمستخدم.
========================================================================== */
import { JSDOM } from "jsdom";

const dom = new JSDOM(`<!doctype html><html lang="ar" dir="rtl"><head></head><body><div id="root"></div></body></html>`, {
  url: "http://localhost:4173/nova/",
  pretendToBeVisual: true,
});

/* نُهيّئ بيئة المتصفح قبل تحميل أي وحدة من التطبيق */
const w = dom.window;
globalThis.window = w;
globalThis.document = w.document;
try { Object.defineProperty(globalThis, "navigator", { value: w.navigator, configurable: true }); } catch { /* موجود */ }
for (const key of Object.getOwnPropertyNames(w)) {
  if (!(key in globalThis)) {
    try { globalThis[key] = w[key]; } catch { /* تجاهل */ }
  }
}
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
w.matchMedia = w.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
globalThis.matchMedia = w.matchMedia;
globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
w.IntersectionObserver = globalThis.IntersectionObserver;
w.scrollTo = () => {};
globalThis.scrollTo = () => {};
globalThis.IS_REACT_ACT_ENVIRONMENT = false;

const { renderPage, renderTree } = await import("../dist-ssr/entry-server.js");
const { hydrateRoot } = await import("react-dom/client");
const React = (await import("react")).default;

const routes = ["/", "/channels", "/nova", "/blog", "/blog/choose-iptv-server"];
let failures = 0;

for (const route of routes) {
  const root = document.getElementById("root");
  const { html } = renderPage(route);
  root.innerHTML = html;

  const problems = [];
  const origError = console.error;
  console.error = (...args) => {
    const text = args.map((a) => (a instanceof Error ? a.message : String(a))).join(" ");
    if (/hydrat|did not match|mismatch|server rendered/i.test(text)) problems.push(text.slice(0, 220));
    else if (/Warning/i.test(text)) problems.push("WARN: " + text.slice(0, 220));
  };

  const instance = hydrateRoot(root, renderTree(route), {
    onRecoverableError: (err) => problems.push("recoverable: " + String(err?.message || err).slice(0, 220)),
  });

  await new Promise((r) => setTimeout(r, 120));
  console.error = origError;

  const domWords = (root.textContent || "").trim().split(/\s+/).length;
  if (problems.length) {
    failures++;
    console.log(`✗ ${route} — ${problems.length} مشكلة، نص: ${domWords} كلمة`);
    problems.slice(0, 3).forEach((p) => console.log(`    ${p}`));
  } else {
    console.log(`✓ ${route} — لا أخطاء ترطيب، نص: ${domWords} كلمة`);
  }
  instance.unmount();
}

console.log(failures === 0 ? "\n✅ كل الصفحات تُرطَّب بلا أخطاء" : `\n❌ ${failures} صفحة بها مشاكل`);
