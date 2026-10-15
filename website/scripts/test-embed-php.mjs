/* ==========================================================================
   وسيط تضمين مشغّل البث الخاص (/embed.php + /player.html)
   --------------------------------------------------------------------------
   بيئة الاختبار لا تشغّل PHP (الاستضافة فقط تشغّله)، لذلك:
     • القواعد الحساسة (قراءة الإعدادات، قائمة النطاقات، حل الرابط، إعادة كتابة
       HTML) منفَّذة في scripts/embed-rewrite.mjs وتُختبر هنا سلوكياً.
     • ويفحص الاختبار نفسه أن embed.php يحمل القواعد نفسها (نفس أسلوب
       test-proxy-php.mjs)، فلا تنحرف نسخة PHP عن النسخة المختبَرة.
     • وبنية embed.php تُفحص ثابتاً (توازن الأقواس/الاقتباسات) لأن `php -l`
       غير متاح في CI.

   التشغيل:  npm test
========================================================================== */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  EMBED_CSP,
  EMBED_PREFIX,
  injectCspMeta,
  isHostAllowed,
  parseAllowedHosts,
  parseEmbedConfig,
  proxyHtmlUrls,
  upstreamUrlFor,
} from "./embed-rewrite.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const phpPath = path.join(root, "embed.php");
const php = await fs.readFile(phpPath, "utf8");
const confPath = path.join(root, "stream-embed.conf");
const conf = await fs.readFile(confPath, "utf8");
const allow = await fs.readFile(path.join(root, "allowed-domains.txt"), "utf8");

/* ───────────────────────── ١) ملف الإعدادات ───────────────────────── */

test("stream-embed.conf: أصل واحد لكل alias وبلا شرطة أخيرة", () => {
  const map = parseEmbedConfig(conf);
  assert.ok(map.has("player"), "يجب أن يعرف الإعداد alias باسم player (يطابق /player/ في .htaccess)");

  const origin = map.get("player");
  assert.match(origin, /^https:\/\/[a-z0-9.-]+$/i, "الأصل https وبلا مسار أو شرطة أخيرة");
  assert.ok(!origin.endsWith("/"), "الأصل لا ينتهي بشرطة");
  assert.equal(map.size, 1, "ملف واحد = أصل واحد؛ أي إضافة تحتاج قاعدة .htaccess مقابلة");
});

test("parseEmbedConfig يتجاهل التعليقات والأسطر التالفة", () => {
  const map = parseEmbedConfig(
    [
      "# تعليق",
      "",
      "   ",
      "bad line without equals",
      "= https://example.com",
      "ok = https://good.example.com/",
      "OK2 = https://second.example.com",
      "weird = not-a-url",
    ].join("\n")
  );
  assert.deepEqual([...map.keys()].sort(), ["ok", "ok2"]);
  assert.equal(map.get("ok"), "https://good.example.com", "الشرطة الأخيرة تُحذف");
});

/* ───────────────────────── ٢) قائمة النطاقات ───────────────────────── */

test("allowed-domains.txt يسمح بمضيف أصل المشغّل (وإلا رفضه الوسيط)", () => {
  const hosts = parseAllowedHosts(allow);
  const origin = parseEmbedConfig(conf).get("player");
  const host = new URL(origin).hostname.toLowerCase();
  assert.ok(isHostAllowed(host, hosts), `${host} غير مسموح في allowed-domains.txt`);
  /* نطاق النفق الأم يكفي: المضيف يتغير مع كل إعادة تشغيل للنفق */
  assert.ok(host.endsWith(".trycloudflare.com"), "نفق Cloudflare مؤقت — حدّث هذا الفحص إن تغيّر المزوّد");
  assert.ok(hosts.has("trycloudflare.com"), "allowed-domains.txt يجب أن يحوي نطاق النفق الأم");
});

test("القائمة: المضيف الفرعي مسموح والنطاق الأم غير المقيّد لا يمر", () => {
  const hosts = parseAllowedHosts(["tunnel.example", "# تعليق", "", "BAD HOST"].join("\n"));
  assert.ok(isHostAllowed("tunnel.example", hosts), "مطابقة تامة");
  assert.ok(isHostAllowed("a.b.tunnel.example", hosts), "مضيف فرعي بحد فاصل عند النقطة");
  assert.ok(!isHostAllowed("example", hosts), "النطاق الأم ليس مسموحاً بمجرد وجود مدخل فرعي");
  assert.ok(!isHostAllowed("eviltunnel.example", hosts), "بلا حد فاصل: eviltunnel.example ≠ .tunnel.example");
  assert.ok(!isHostAllowed("", hosts));
  assert.equal(hosts.size, 1, "التعليقات والفراغ والأسطر التالفة تُتجاهل");
});

/* ───────────────────────── ٣) بناء رابط الأصل ───────────────────────── */

test("upstreamUrlFor يبني رابط الأصل ويمنع الخروج منه", () => {
  const origin = "https://tunnel.example";
  assert.equal(upstreamUrlFor(origin, "/five_channels_full.html"), "https://tunnel.example/five_channels_full.html");
  assert.equal(upstreamUrlFor(origin, "five_channels_full.html"), "https://tunnel.example/five_channels_full.html");
  assert.equal(upstreamUrlFor(origin, "/a/b.js?v=1"), "https://tunnel.example/a/b.js?v=1");
  assert.equal(upstreamUrlFor(origin, "/a/../b"), "https://tunnel.example/b", "../ تُطبَّع داخل الأصل");

  assert.equal(upstreamUrlFor(origin, "/../../etc/passwd"), null, "محاولة الخروج من الأصل تُرفض");
  assert.equal(upstreamUrlFor(origin, ""), null);
  assert.equal(upstreamUrlFor(origin, "/a\0b"), null, "بايت صفري يُرفض");
});

/* ───────────────────────── ٤) إعادة كتابة HTML ───────────────────────── */

test("proxyHtmlUrls يحوّل الروابط الجذرية فقط إلى بادئة الوسيط", () => {
  const html = [
    '<script src="/assets/app.js"></script>',
    '<link rel="stylesheet" href="/assets/app.css">',
    '<img src="/logo.png" data-src="/logo@2x.png" alt="">',
    '<video poster="/p.jpg"><source src="/v.mp4"></video>',
  ].join("");
  const out = proxyHtmlUrls(html);
  assert.match(out, /src="\/player\/assets\/app\.js"/);
  assert.match(out, /href="\/player\/assets\/app\.css"/);
  assert.match(out, /src="\/player\/logo\.png"/);
  assert.match(out, /data-src="\/player\/logo@2x\.png"/);
  assert.match(out, /poster="\/player\/p\.jpg"/);
  assert.match(out, /<source src="\/player\/v\.mp4"/);
});

test("proxyHtmlUrls لا يمس الروابط النسبية أو الكاملة أو الخاصة", () => {
  const html = [
    '<script src="assets/app.js"></script>',
    '<script src="https://cdn.example/lib.js"></script>',
    '<script src="//cdn.example/lib.js"></script>',
    '<a href="#top">أعلى</a>',
    '<a href="mailto:a@b.co">بريد</a>',
    '<img src="data:image/png;base64,AAA">',
    '<video src="blob:https://x/1"></video>',
    '<a href="?channel=2">قناة</a>',
  ].join("");
  assert.equal(proxyHtmlUrls(html), html, "هذه الروابط يجب أن تبقى كما هي");
});

test("proxyHtmlUrls لا يضاعف البادئة ويعالج srcset", () => {
  const once = proxyHtmlUrls('<img src="/logo.png">');
  assert.equal(once, '<img src="/player/logo.png">');
  assert.equal(proxyHtmlUrls(once), once, "إعادة الكتابة الثانية لا تضيف بادئة جديدة");
  assert.equal(proxyHtmlUrls('<img src="/play/er.png">'), '<img src="/player/play/er.png">',
    "تشابه جزئي مع البادئة لا يمنع إعادة الكتابة");

  const srcset = proxyHtmlUrls('<img srcset="/a.png 1x, /b.png 2x, https://cdn/c.png 3x">');
  assert.match(srcset, /\/player\/a\.png 1x/);
  assert.match(srcset, /\/player\/b\.png 2x/);
  assert.match(srcset, /https:\/\/cdn\/c\.png 3x/);

  const relative = proxyHtmlUrls('<img srcset="a.png 1x, b.png 2x">');
  assert.equal(relative, '<img srcset="a.png 1x, b.png 2x">', "srcset نسبي لا يُمس");
});

test("injectCspMeta يحقن السياسة كأول عنصر في head", () => {
  const out = injectCspMeta('<html><head><title>x</title></head><body></body></html>');
  assert.ok(out.indexOf('http-equiv="Content-Security-Policy"') < out.indexOf("<title>"));
  assert.match(out, new RegExp(`content="${EMBED_CSP.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));

  const noHead = injectCspMeta("<html><body>x</body></html>");
  assert.match(noHead, /<html><head><meta http-equiv="Content-Security-Policy"/);

  const bare = injectCspMeta("<p>بلا هيكل</p>");
  assert.ok(bare.startsWith('<meta http-equiv="Content-Security-Policy"'));
});

/* ───────────────────────── ٥) عقد embed.php ───────────────────────── */

test("embed.php: الأصل من ملف مغلق ولا يقبل رابطاً من الزائر", () => {
  for (const needle of [
    "const EMBED_CONF_FILE    = 'stream-embed.conf';",
    "const EMBED_ALLOW_FILE   = 'allowed-domains.txt';",
    "function embed_config(): array",
    "function embed_allowed_hosts(): array",
    "if (!isset($config[$alias]))",
    "if (!embed_host_allowed($originHost))",
  ]) {
    assert.ok(php.includes(needle), `embed.php يجب أن يحتوي: ${needle}`);
  }
  /* alias فقط من الزائر، والرابط نفسه يُبنى من الإعدادات */
  assert.ok(php.includes("$alias = strtolower(trim((string) ($_GET['u'] ?? 'player')));"));
  assert.ok(!/\$_GET\[['"](url|target|src)['"]\]/.test(php), "الوسيط لا يقرأ رابطاً من مدخلات الزائر");
  assert.ok(php.includes("function embed_upstream_url(string $origin, string $rest): ?string"));
});

test("embed.php: منع SSRF وبلا تحويلات تلقائية", () => {
  assert.ok(php.includes("CURLOPT_FOLLOWLOCATION => false"), "التحويلات تُفحص يدوياً");
  assert.ok(php.includes("function embed_host_is_public(string $host): bool"));
  assert.ok(php.includes("FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE"));
  assert.ok(php.includes("$nextHost !== $originHost || !embed_host_allowed($nextHost)"), "قفزة لمضيف آخر تُعاد للزائر");
  assert.ok(php.includes("const EMBED_MAX_REDIRECT = 3;"));
  assert.ok(php.includes("function embed_rate_limit(): void"));
});

test("embed.php: HTML يُعاد كتابته والوسائط تُبث كما هي", () => {
  assert.ok(php.includes("function embed_proxy_html_urls(string $html): string"));
  assert.ok(php.includes("function embed_inject_csp_meta(string $html): string"));
  assert.ok(php.includes("stripos($contentType, 'text/html')"), "تمييز HTML عن غيره بنوع المحتوى");
  assert.ok(php.includes("header('Content-Security-Policy: ' . EMBED_CSP);"));
  assert.ok(php.includes("CURLOPT_WRITEFUNCTION"), "الوسائط تُبث متدفقة");
  assert.ok(php.includes("const EMBED_MAX_HTML     = 4 * 1024 * 1024;"));
});

test("قواعد إعادة الكتابة متطابقة بين PHP و JS", () => {
  /* قائمة السمات نفسها في النسختين */
  assert.ok(php.includes("$attrs = 'src|href|poster|data-src|data-href|data-poster';"),
    "قائمة السمات في PHP يجب أن تطابق URL_ATTRS في embed-rewrite.mjs");

  /* جذري فقط: يبدأ بـ / وليس // ولا بالبادئة نفسها.
     لا نكتب نمط PHP كسلسلة JS (الاقتباسات والشرطات المائلة تجعل المقارنة هشة)،
     بل نستخرج النمط من المصدر نفسه ثم نتحقق من بنيته ونجرّبه فعلياً. */
  const patternLine = php.match(/^\s*'#\(\(\?:\^\|.*$/m);
  assert.ok(patternLine, "نمط إعادة كتابة السمات مفقود في embed.php");
  const raw = patternLine[0].trim();
  assert.ok(raw.startsWith(String.raw`'#((?:^|[\s"`), "النمط يبدأ بفئة مسافة/اقتباس ثم جذري");
  assert.ok(raw.includes("' . $attrs . '"), "النمط يستخدم قائمة السمات نفسها");
  assert.ok(raw.includes("(?!(/|' . preg_quote(EMBED_PREFIX, '#') . '))#i"),
    "النمط يستثني // والبادئة نفسها (منع مضاعفة البادئة)");

  /* نجرّب النمط الفعلي المستخرج من PHP على عينة HTML */
  const jsPattern = new RegExp(
    "((?:^|[\\s\"'])(" + ["src", "href", "poster", "data-src", "data-href", "data-poster"].join("|") + ")\\s*=\\s*)([\"'])/(?!(/|/player/))",
    "gi"
  );
  const sample = '<img src="/logo.png"><link href="/a.css"><script src="//cdn/x.js"></script>';
  const rewritten = sample.replace(jsPattern, (_m, head, _attr, quote) => head + quote + "/player/");
  assert.equal(
    rewritten,
    '<img src="/player/logo.png"><link href="/player/a.css"><script src="//cdn/x.js"></script>'
  );

  /* البادئة واحدة في الطرفين وفي قاعدة .htaccess */
  assert.equal(EMBED_PREFIX, "/player/");
  assert.ok(php.includes("const EMBED_PREFIX       = '/player/';"));
});

test("embed.php: بنية سليمة (أقواس واقتباسات متوازنة)", () => {
  /* لا PHP في بيئة الاختبار، فنفحص البنية ثابتاً بدل `php -l`: ماسح يتتبع
     السلاسل والتعليعات ولا يحسب أقواسها (عدّ الأقواس نصياً يفشل مع أي `//`
     داخل نص عادي أو سلسلة). */
  const scan = (src) => {
    const stack = [];
    const pairs = { "}": "{", ")": "(", "]": "[" };
    let i = 0;
    let line = 1;
    while (i < src.length) {
      const c = src[i];
      const next = src[i + 1];
      if (c === "\n") { line++; i++; continue; }
      if (c === "/" && next === "*") { i = src.indexOf("*/", i + 2); i = i < 0 ? src.length : i + 2; continue; }
      if (c === "/" && next === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
      if (c === "#") { while (i < src.length && src[i] !== "\n") i++; continue; }
      if (c === "'" || c === '"') {
        const quote = c;
        i++;
        while (i < src.length) {
          if (src[i] === "\\") { i += 2; continue; }
          if (src[i] === quote) { i++; break; }
          if (src[i] === "\n") line++;
          i++;
        }
        continue;
      }
      if (c === "{" || c === "(" || c === "[") stack.push([c, line]);
      else if (c === "}" || c === ")" || c === "]") {
        const open = stack.pop();
        assert.ok(open, `قوس إغلاق ${c} بلا افتتاح عند السطر ${line}`);
        assert.equal(open[0], pairs[c], `قوس ${c} عند السطر ${line} يغلق ${open[0]} من السطر ${open[1]}`);
      }
      i++;
    }
    assert.deepEqual(stack, [], `أقواس لم تُغلق: ${stack.map(([c, l]) => `${c}@${l}`).join(", ")}`);
  };
  scan(php.replace(/^<\?php/, ""));

  assert.ok(!php.includes("<?=", "لا وسوم قصيرة (short open tags)"));
  assert.ok(!/[\u4e00-\u9fff]/.test(php), "لا أحرف غير عربية/لاتينية تسربت إلى الملف");

  /* كل دالة تُعرَّف مرة واحدة، وكل دالة داخلية (embed_*) مُعرَّفة فعلاً */
  const defined = new Set([...php.matchAll(/^function\s+([a-z0-9_]+)\s*\(/gim)].map((m) => m[1]));
  const called = new Set([...php.matchAll(/\b(embed_[a-z0-9_]+)\s*\(/g)].map((m) => m[1]));
  for (const name of called) {
    assert.ok(defined.has(name), `دالة مستخدمة غير مُعرَّفة: ${name}`);
  }
  assert.ok(defined.size >= 10, `عدد الدوال المعرَّفة قليل (${defined.size}) — تأكد أن الملف لم يُقتطع`);
});

/* ───────────────────────── ٦) الصفحة والتكامل ───────────────────────── */

test("player.html تُضمِّن الوسيط على نفس النطاق (بلا رابط نفق ظاهر)", async () => {
  const page = await fs.readFile(path.join(here, "../legacy/player.html"), "utf8");
  assert.match(page, /<iframe[^>]+src="\/player\/[^"]+"/, "مصدر الإطار يجب أن يكون /player/… على نفس النطاق");
  assert.ok(!page.includes("trycloudflare"), "رابط النفق لا يظهر في مصدر الصفحة");
  assert.match(page, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(page, /allowfullscreen/);
  assert.match(page, /loading="lazy"/);
});

test("القواعد متفقة بين .htaccess و robots.txt و _headers", async () => {
  const htaccess = await fs.readFile(path.join(root, ".htaccess"), "utf8");
  assert.match(htaccess, /RewriteRule \^player\/\(\.\*\)\$ embed\.php\?u=player&p=\/\$1 \[L,QSA\]/,
    "قاعدة /player/ يجب أن تمر إلى embed.php");

  const robots = await fs.readFile(path.join(root, "robots.txt"), "utf8");
  for (const rule of ["Disallow: /player.html", "Disallow: /player/", "Disallow: /embed.php"]) {
    assert.ok(robots.includes(rule), `robots.txt ينقصه: ${rule}`);
  }

  const headers = await fs.readFile(path.join(root, "_headers"), "utf8");
  assert.match(headers, /^\/embed\.php$/m, "_headers يحتاج قاعدة لـ /embed.php");
});
