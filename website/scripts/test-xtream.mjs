/* ==========================================================================
   اختبارات منطق مشغّل الاشتراك الشخصي (Xtream + M3U) — شبكة أمان القسم
   التشغيل:  npm test        (أو: node --test scripts/)
   لا تحتاج شبكة ولا اعتماديات خارجية — دوال خالصة فقط.
========================================================================== */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ACCOUNTS_KEY,
  FAVORITES_KEY,
  LIST_ITEM_HEIGHT,
  MAX_ACCOUNTS,
  MAX_RECENTS,
  PHP_PROXY,
  SMARTERS_USER_AGENT,
  STORAGE_KEY,
  UA_LABEL,
  UA_PARAM,
  UA_PRESET_SMARTERS,
  accountKey,
  accountLabel,
  addUaVariants,
  buildDiagReport,
  buildModes,
  composeFailMsg,
  createShareToken,
  daysUntil,
  filterStreams,
  getProxyUrl,
  isHlsCandidateUrl,
  isNgrokUrl,
  isProxiedUrl,
  isTrustedProxy,
  isValidAccount,
  liveStreamUrl,
  loadAccounts,
  loadJSON,
  m3uCandidates,
  m3uDownloadUrl,
  maskUsername,
  matchesQuery,
  normalizeArabic,
  normalizeHost,
  ASPECT_MODES,
  aspectStyle,
  decodeEpgField,
  findChannelByNumber,
  formatClock,
  formatEpgLine,
  getResumeAt,
  hashPin,
  isTsStreamUrl,
  isValidPin,
  loadPinState,
  loadResumeMap,
  parseM3U,
  parseSeriesInfo,
  parseShareToken,
  parseShortEpg,
  parseVodInfo,
  savePinState,
  saveResumePosition,
  seriesStreamUrl,
  shortEpgUrl,
  srtToVtt,
  stepChannel,
  timeshiftUrl,
  toggleLockKey,
  verifyPin,
  vodStreamUrl,
  loadProfileList,
  playerApiUrl,
  profileKeyFor,
  pushRecent,
  removeAccount,
  resolveProxyBases,
  resolveWorkerBase,
  saveJSON,
  saveProfileList,
  schemeOf,
  sortCategories,
  streamKey,
  toggleInList,
  upsertAccount,
  windowRange,
  withUserAgentPreset,
} from "../src/lib/xtream.mjs";

const PROXY = "https://proxy.example";

/* مخزن وهمي بسيط يحاكي localStorage (مع إمكانية تعطيله لاختبار الأخطاء) */
function fakeStorage(initial = {}, { broken = false } = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      if (broken) throw new Error("QuotaExceededError");
      map.set(k, String(v));
    },
    removeItem: (k) => map.delete(k),
    _map: map,
  };
}

const stream = (id, name, catId, extra = {}) => ({ id, name, icon: "", catId, ...extra });

/* ١ — تنقية رابط السيرفر من كل الأشكال التي يلصقها المستخدم */
test("1) normalizeHost ينقّي البروتوكول والمسار والمنفذ", () => {
  assert.equal(normalizeHost("  nv2live.com  "), "nv2live.com");
  assert.equal(normalizeHost("http://server.com:8080/"), "server.com:8080");
  assert.equal(normalizeHost("https://server.com:8080/get.php?username=a"), "server.com:8080");
  assert.equal(normalizeHost("server.com/c/"), "server.com");
  assert.equal(normalizeHost(null), "");
  assert.equal(normalizeHost("::server.com"), "server.com");
});

/* ٢ — البروتوكول المناسب لتنزيل قائمة القنوات */
test("2) schemeOf يحفظ http الصريح ويرفع الباقي إلى https", () => {
  assert.equal(schemeOf("http://server.com:8080"), "http");
  assert.equal(schemeOf("HTTP://server.com"), "http");
  assert.equal(schemeOf("server.com"), "https");
});

/* ٣ — قراءة ملف M3U: الاسم والشعار والتصنيف */
test("3) parseM3U يقرأ الاسم والشعار والتصنيف", () => {
  const text =
    "#EXTM3U\n" +
    '#EXTINF:-1 tvg-id="mbc1" tvg-logo="https://cdn.example/mbc1.png" group-title="قنوات MBC",MBC 1\n' +
    "https://server.com/live/user/pass/101.m3u8\n" +
    "#EXTINF:-1,قناة بلا تصنيف\n" +
    "https://server.com/live/user/pass/102.ts\n";

  const { categories, streams } = parseM3U(text);

  assert.equal(streams.length, 2);
  assert.equal(streams[0].name, "MBC 1");
  assert.equal(streams[0].icon, "https://cdn.example/mbc1.png");
  assert.equal(streams[0].catId, "قنوات MBC");
  assert.equal(streams[0].url, "https://server.com/live/user/pass/101.m3u8");
  /* قناة بلا group-title تُدرج في «قنواتي» ولا تُهمَل */
  assert.equal(streams[1].catId, "قنواتي");
  assert.deepEqual(
    categories.map((c) => c.name).sort(),
    ["قنوات MBC", "قنواتي"].sort()
  );
});

/* ٤ — الملف التالف أو الفارغ لا يُنتج قنوات وهمية */
test("4) parseM3U يتجاهل الأسطر غير الصالحة والملفات الفارغة", () => {
  assert.deepEqual(parseM3U("").streams, []);
  assert.deepEqual(parseM3U("#EXTM3U\n# تعليق\n\n").streams, []);
  /* سطر #EXTINF بلا رابط بعده لا يُحتسب */
  assert.equal(parseM3U('#EXTM3U\n#EXTINF:-1,قناة معلقة\n').streams.length, 0);
});

/* ٥ — توحيد الأشكال العربية قبل البحث */
test("5) normalizeArabic يوحّد الهمزات والتاء المربوطة والياء والتشكيل", () => {
  assert.equal(normalizeArabic("الجزيرة"), normalizeArabic("الجزيره"));
  assert.equal(normalizeArabic("أحمد"), normalizeArabic("احمد"));
  assert.equal(normalizeArabic("إم بي سي"), "ام بي سي");
  assert.equal(normalizeArabic("مُصطفى"), normalizeArabic("مصطفي"));
  assert.equal(normalizeArabic("قناة ٢"), "قناه 2");
  assert.equal(normalizeArabic("  MBC   MASR "), "mbc masr");
});

/* ٦ — مطابقة البحث: كل الكلمات بلا ترتيب وبلا حساسية للشكل */
test("6) matchesQuery يطابق بكل الكلمات وبأي ترتيب", () => {
  assert.equal(matchesQuery("MBC Masr 2", "mbc masr"), true);
  assert.equal(matchesQuery("MBC Masr 2", "masr mbc"), true);
  assert.equal(matchesQuery("قناة الجزيرة", "الجزيره"), true);
  assert.equal(matchesQuery("قناة الجزيرة", "العربية"), false);
  assert.equal(matchesQuery("أي شيء", ""), true);
  assert.equal(matchesQuery("", "بحث"), false);
});

/* ٧ — البحث يعمل على كل التصنيفات لا داخل التصنيف المختار فقط */
test("7) filterStreams: البحث شامل لكل التصنيفات", () => {
  const streams = [
    stream(1, "MBC 1", "قنوات MBC"),
    stream(2, "beIN Sports 1", "رياضية"),
    stream(3, "MBC Masr", "مصرية"),
  ];
  const result = filterStreams(streams, { query: "mbc", categoryId: "رياضية" });
  assert.deepEqual(result.map((s) => s.id), [1, 3]);
});

/* ٨ — التصنيف يعمل عند غياب البحث، والبحث يتقدّم عليه */
test("8) filterStreams: التصنيف عند عدم البحث والبحث يتقدّم على التصنيف", () => {
  const streams = [stream(1, "MBC 1", "قنوات MBC"), stream(2, "MBC Masr", "مصرية")];
  assert.deepEqual(filterStreams(streams, { categoryId: "مصرية" }).map((s) => s.id), [2]);
  assert.deepEqual(
    filterStreams(streams, { categoryId: "مصرية", query: "1" }).map((s) => s.id),
    [1]
  );
});

/* ٩ — تبويب المفضلة */
test("9) filterStreams: تبويب المفضلة يعتمد مفتاح القناة الثابت", () => {
  const streams = [
    stream(1, "MBC 1", "قنوات MBC"),
    stream(2, "MBC Masr", "مصرية"),
    stream(3, "قناة ملف", "قنواتي", { url: "https://a.example/x.m3u8" }),
  ];
  assert.equal(streamKey(streams[2]), "u:https://a.example/x.m3u8");
  assert.equal(streamKey(streams[0]), "x:1");

  const favorites = ["x:2", "u:https://a.example/x.m3u8"];
  const result = filterStreams(streams, { tab: "favorites", favorites });
  assert.deepEqual(result.map((s) => s.id), [2, 3]);
});

/* ١٠ — تبويب «الأخيرة» بترتيب الأحدث أولاً */
test("10) filterStreams: تبويب الأخيرة يرتّب بالأحدث مشاهدةً", () => {
  const streams = [stream(1, "A", "c"), stream(2, "B", "c"), stream(3, "C", "c")];
  const result = filterStreams(streams, { tab: "recent", recents: ["x:3", "x:1"] });
  assert.deepEqual(result.map((s) => s.id), [3, 1]);
});

/* ١١ — إزالة سقف الـ300: الباقة الكبيرة تُعرض كاملة */
test("11) filterStreams لا يقتطع القوائم الكبيرة (لا سقف 300 قناة)", () => {
  const streams = Array.from({ length: 1500 }, (_, i) => stream(i + 1, `قناة ${i + 1}`, "ضخمة"));
  assert.equal(filterStreams(streams, {}).length, 1500);
  assert.equal(filterStreams(streams, { categoryId: "ضخمة" }).length, 1500);
  assert.equal(filterStreams(streams, { query: "قناة" }).length, 1500);
});

/* ١٢ — رياضيات القائمة الافتراضية */
test("12) windowRange يحسب النطاق والهامش والأبعاد", () => {
  const r = windowRange({
    scrollTop: 0,
    itemHeight: LIST_ITEM_HEIGHT,
    viewportHeight: 580,
    total: 1000,
    overscan: 4,
  });
  assert.equal(r.start, 0);
  assert.equal(r.totalHeight, 1000 * LIST_ITEM_HEIGHT);
  assert.equal(r.offsetY, 0);
  assert.ok(r.end >= Math.ceil(580 / LIST_ITEM_HEIGHT));
  assert.equal(r.count, r.end - r.start);
});

/* ١٣ — حدود القائمة الافتراضية: النهاية والتجاوز والفراغ */
test("13) windowRange يراعي نهاية القائمة والتجاوز والقائمة الفارغة", () => {
  const itemHeight = 50;
  const end = windowRange({ scrollTop: 99999, itemHeight, viewportHeight: 500, total: 30 });
  assert.equal(end.end, 30);
  assert.ok(end.start <= 24);

  const empty = windowRange({ scrollTop: 0, itemHeight, viewportHeight: 500, total: 0 });
  assert.deepEqual(
    { start: empty.start, end: empty.end, totalHeight: empty.totalHeight },
    { start: 0, end: 0, totalHeight: 0 }
  );

  const small = windowRange({ scrollTop: 0, itemHeight, viewportHeight: 500, total: 3, overscan: 5 });
  assert.equal(small.start, 0);
  assert.equal(small.end, 3);
  assert.equal(small.totalHeight, 150);
});

/* ١٤ — مسارات الاتصال: المباشر + الـWorker + بروكسي PHP */
test("14) buildModes يبني المسارات حسب بروتوكول الصفحة مع Worker و PHP Proxy", () => {
  const https = buildModes({ proxyBase: PROXY, isHttpsSite: true });
  assert.deepEqual(https.map((m) => m.id), [
    "direct-https",
    "proxy-https",
    "proxy-http",
    "php-https",
    "php-http",
  ]);
  assert.equal(https[0].base("srv.com"), "https://srv.com");
  assert.equal(https[1].base("srv.com"), `${PROXY}/h/srv.com`);
  assert.equal(https[2].base("srv.com"), `${PROXY}/x/srv.com`);
  assert.equal(https[3].base("srv.com"), "/proxy.php?url=https://srv.com");
  assert.equal(https[4].base("srv.com"), "/proxy.php?url=http://srv.com");

  const http = buildModes({ proxyBase: PROXY, isHttpsSite: false });
  assert.deepEqual(http.map((m) => m.id), [
    "direct-https",
    "direct-http",
    "proxy-https",
    "proxy-http",
    "php-https",
    "php-http",
  ]);
  assert.equal(http[1].base("srv.com"), "http://srv.com");
});

/* ١٥ — بناء الروابط: ترميز صحيح لاسم المستخدم وكلمة السر للمباشر والـWorker و/proxy.php */
test("15) بناء روابط الحساب والبث وترميزهما عبر المباشر والـWorker و/proxy.php", () => {
  const api = playerApiUrl("https://srv.com", "user name", "p@ss/1");
  assert.equal(
    api,
    "https://srv.com/player_api.php?username=user%20name&password=p%40ss%2F1"
  );
  assert.equal(
    playerApiUrl("https://srv.com", "u", "p", "get_live_streams"),
    "https://srv.com/player_api.php?username=u&password=p&action=get_live_streams"
  );
  /* عبر /proxy.php يُرمَّز الرابط كاملاً بما فيه معامل action */
  assert.equal(
    playerApiUrl("/proxy.php?url=http://srv.com:8080", "u", "p", "get_live_streams"),
    "/proxy.php?url=" +
      encodeURIComponent(
        "http://srv.com:8080/player_api.php?username=u&password=p&action=get_live_streams"
      )
  );
  assert.equal(
    liveStreamUrl("https://srv.com", "u", "p", 101),
    "https://srv.com/live/u/p/101.m3u8"
  );
  assert.equal(
    liveStreamUrl("/proxy.php?url=http://srv.com:8080", "u", "p", 101),
    "/proxy.php?url=" + encodeURIComponent("http://srv.com:8080/live/u/p/101.m3u8")
  );
  assert.equal(
    m3uDownloadUrl({ host: "srv.com", username: "u", password: "p", scheme: "http" }),
    "http://srv.com/get.php?username=u&password=p&type=m3u_plus&output=hls"
  );
});

/* ١٦ — مرشحات التشغيل من ملف M3U: نسخة m3u8 ثم الأصلية عبر المباشر والـWorker و/proxy.php */
test("16) m3uCandidates يبني قائمة مرشحة بلا تكرار تشمل Worker و /proxy.php", () => {
  const list = m3uCandidates("http://srv.com/live/u/p/5.ts", {
    proxyBase: PROXY,
    isHttpsSite: true,
  });
  assert.equal(list[0], "https://srv.com/live/u/p/5.m3u8");
  assert.ok(list.includes("http://srv.com/live/u/p/5.ts"));
  assert.ok(list.includes(`${PROXY}/x/srv.com/live/u/p/5.m3u8`));
  assert.ok(list.some((u) => u.startsWith(`${PROXY}/?u=`)));
  assert.ok(list.some((u) => u.startsWith(`${PHP_PROXY}?url=`)));
  assert.equal(new Set(list).size, list.length);

  /* روابط ngrok تبدأ بالوسيط فوراً لتجاوز صفحة التحذير */
  const ngrok = m3uCandidates("https://sub.ngrok-free.dev/my_restream.m3u8", {
    proxyBase: PROXY,
    isHttpsSite: true,
  });
  assert.equal(ngrok[0], `${PROXY}/h/sub.ngrok-free.dev/my_restream.m3u8`);

  /* على صفحة http لا نرفع البروتوكول */
  const plain = m3uCandidates("http://srv.com/live/u/p/5.ts", {
    proxyBase: PROXY,
    isHttpsSite: false,
  });
  assert.ok(plain.includes("http://srv.com/live/u/p/5.m3u8"));
  assert.deepEqual(m3uCandidates("", { proxyBase: PROXY }), []);
});

/* ١٧ — رسائل الفشل الذكية */
test("17) composeFailMsg يميّز CORS عن حجب الوسطاء عن المهلة", () => {
  const cors = composeFailMsg([
    { mode: "direct-https", label: "مباشر", status: "fail", note: "حجب المتصفح (CORS) أو خطأ شبكة" },
    { mode: "proxy-https", label: "وسيط", status: "ok", note: "نجح" },
  ]);
  assert.match(cors, /CORS/);

  const both = composeFailMsg([
    { mode: "direct-https", label: "مباشر", status: "fail", note: "حجب المتصفح (CORS) أو خطأ شبكة" },
    { mode: "proxy-https", label: "وسيط", status: "fail", note: "HTTP 403" },
  ]);
  assert.match(both, /الحل المضمون/);

  const timeout = composeFailMsg([
    { mode: "direct-https", label: "مباشر", status: "fail", note: "مهلة 12 ثانية" },
  ]);
  assert.match(timeout, /لا استجابة/);

  assert.match(composeFailMsg([]), /تقرير التشخيص/);
});

/* ١٨ — تقنين بيانات الدخول قبل أي إخراج */
test("18) maskUsername يخفي أغلب اسم المستخدم", () => {
  assert.equal(maskUsername("ahmed1234"), "ah******");
  assert.equal(maskUsername("ab"), "**");
  assert.equal(maskUsername(""), "*");
});

test("19) buildDiagReport لا يحتوي كلمة السر أبداً", () => {
  const account = { host: "srv.com", username: "ahmed1234", password: "SECRET-PASS" };
  const report = buildDiagReport({
    diag: [{ mode: "direct-https", label: "مباشر HTTPS", status: "ok", note: "نجح" }],
    account,
    phase: "ready",
    streamsCount: 12,
    activeLabel: "مباشر HTTPS",
  });
  assert.doesNotMatch(report, /SECRET-PASS/);
  assert.doesNotMatch(report, /ahmed1234/);
  assert.match(report, /ah\*+/);
  assert.match(report, /12 قناة/);
});

/* ٢٠ — رمز المشاركة: ذهاب وإياب بلا أسرار */
test("20) createShareToken و parseShareToken بلا كلمة سر", () => {
  const token = createShareToken({
    diag: [
      { mode: "direct-https", label: "مباشر HTTPS", status: "fail", note: "حجب المتصفح (CORS)" },
    ],
    host: "srv.com",
    username: "ahmed1234",
    streamsCount: 0,
    errorMsg: "فشل الدخول",
    userAgent: "Mozilla/5.0",
  });

  assert.ok(token.startsWith("SMP1."));
  assert.ok(!token.includes("SECRET"));
  const payload = parseShareToken(token);
  assert.equal(payload.h, "srv.com");
  assert.equal(payload.u, "ah******");
  assert.equal(payload.d.length, 1);
  assert.equal(payload.d[0].s, "no");
  assert.equal(payload.a, "Mozilla/5.0");

  assert.equal(parseShareToken("غير صالح"), null);
  assert.equal(parseShareToken("SMP1.%%%"), null);
  assert.equal(parseShareToken(""), null);
});

/* ٢١ — هجرة الحساب القديم (حساب واحد) إلى قائمة الحسابات */
test("21) loadAccounts يهاجر الجلسة القديمة ويزيل التكرار", () => {
  const legacy = { host: "http://old.com:8080/", username: "u1", password: "p1" };
  const storage = fakeStorage({
    [STORAGE_KEY]: JSON.stringify(legacy),
    [ACCOUNTS_KEY]: JSON.stringify([
      { host: "new.com", username: "u2", password: "p2" },
      { host: "http://old.com:8080", username: "u1", password: "p1" },
    ]),
  });

  const list = loadAccounts(storage);
  assert.equal(list.length, 2);
  assert.deepEqual(list.map((a) => a.host), ["new.com", "old.com:8080"]);
  assert.equal(list[0].username, "u2");
});

/* ٢٢ — تجاهل الحسابات الناقصة وحد أقصى للحسابات */
test("22) loadAccounts يتجاهل الحسابات الناقصة ويحترم الحد الأقصى", () => {
  const many = Array.from({ length: MAX_ACCOUNTS + 4 }, (_, i) => ({
    host: `s${i}.com`,
    username: `u${i}`,
    password: "p",
  }));
  const storage = fakeStorage({
    [ACCOUNTS_KEY]: JSON.stringify([...many, { host: "x.com", username: "", password: "" }]),
  });
  const list = loadAccounts(storage);
  assert.equal(list.length, MAX_ACCOUNTS);
  assert.equal(isValidAccount({ host: "x.com", username: "", password: "p" }), false);
  assert.equal(isValidAccount({ host: "x.com", username: "u", password: "p" }), true);
});

/* ٢٣ — إضافة/تحديث/حذف حساب */
test("23) upsertAccount و removeAccount يديران القائمة بلا تكرار", () => {
  let list = [];
  list = upsertAccount(list, { host: "http://a.com/", username: "u1", password: "p1" });
  list = upsertAccount(list, { host: "b.com", username: "u2", password: "p2" });
  assert.deepEqual(list.map((a) => a.host), ["b.com", "a.com"]);

  /* تحديث نفس الحساب لا يضيف نسخة ثانية */
  list = upsertAccount(list, { host: "a.com", username: "u1", password: "جديد" });
  assert.equal(list.length, 2);
  assert.equal(list[0].host, "a.com");
  assert.equal(list[0].password, "جديد");

  /* حساب غير صالح لا يُضاف */
  assert.deepEqual(upsertAccount(list, { host: "", username: "u", password: "p" }).length, 2);

  list = removeAccount(list, { host: "a.com", username: "u1", password: "جديد" });
  assert.deepEqual(list.map((a) => a.host), ["b.com"]);
  assert.deepEqual(removeAccount(list, accountKey({ host: "b.com", username: "u2" })), []);
});

/* ٢٤ — تسمية الحساب على الشريحة */
test("24) accountLabel يُظهر السيرفر", () => {
  assert.equal(accountLabel({ host: "http://srv.com:8080/", username: "u" }), "srv.com:8080");
  assert.equal(accountLabel({ host: "", username: "u" }), "u");
  assert.equal(accountLabel(null), "");
});

/* ٢٥ — المفضلة وسجل المشاهدة */
test("25) toggleInList و pushRecent يحفظان بلا تكرار وبترتيب صحيح", () => {
  let favorites = [];
  favorites = toggleInList(favorites, "x:1");
  favorites = toggleInList(favorites, "x:2");
  assert.deepEqual(favorites, ["x:2", "x:1"]);
  favorites = toggleInList(favorites, "x:1");
  assert.deepEqual(favorites, ["x:2"]);
  assert.deepEqual(toggleInList(favorites, ""), ["x:2"]);

  let recents = [];
  for (let i = 0; i < MAX_RECENTS + 5; i++) recents = pushRecent(recents, `x:${i}`);
  assert.equal(recents.length, MAX_RECENTS);
  assert.equal(recents[0], `x:${MAX_RECENTS + 4}`);

  const again = pushRecent(["x:1", "x:2"], "x:2");
  assert.deepEqual(again, ["x:2", "x:1"]);
});

/* ٢٦ — التخزين: JSON تالف أو ممتلئ لا يكسر الصفحة */
test("26) loadJSON و saveJSON يتعاملان مع الخطأ بهدوء", () => {
  const broken = fakeStorage({ k: "{ليس JSON" });
  assert.deepEqual(loadJSON(broken, "k", []), []);
  assert.deepEqual(loadJSON(broken, "missing", { a: 1 }), { a: 1 });

  const full = fakeStorage({}, { broken: true });
  assert.equal(saveJSON(full, "k", { a: 1 }), false);
  assert.equal(loadJSON(full, "k", null), null);
  assert.equal(loadJSON(null, "k", "بديل"), "بديل");
});

/* ٢٧ — ترتيب التصنيفات بالعربية */
test("27) sortCategories يرتّب عربياً بلا تعديل الأصل", () => {
  const input = [
    { id: "2", name: "رياضية" },
    { id: "1", name: "أخبارية" },
  ];
  const sorted = sortCategories(input);
  assert.equal(sorted[0].name, "أخبارية");
  assert.equal(input[0].name, "رياضية"); /* الأصل لم يتغير */
});

/* ٢٨ — المفضلة وسجل المشاهدة لكل حساب على حدة */
test("28) المفضلة وسجل المشاهدة مفصولان بين الحسابين", () => {
  const storage = fakeStorage();
  const keyA = profileKeyFor({ host: "a.com", username: "u1", password: "p1" });
  const keyB = profileKeyFor({ host: "b.com", username: "u2", password: "p2" });
  assert.notEqual(keyA, keyB);
  assert.equal(profileKeyFor(null, "MyList.m3u"), "m:MyList.m3u");
  assert.equal(profileKeyFor(null, ""), "m:file");

  saveProfileList(storage, FAVORITES_KEY, keyA, ["x:1", "x:2"]);
  saveProfileList(storage, FAVORITES_KEY, keyB, ["x:9"]);
  assert.deepEqual(loadProfileList(storage, FAVORITES_KEY, keyA), ["x:1", "x:2"]);
  assert.deepEqual(loadProfileList(storage, FAVORITES_KEY, keyB), ["x:9"]);
  assert.deepEqual(loadProfileList(storage, FAVORITES_KEY, "x:غير موجود"), []);

  /* قيم غير نصية أو تخزين تالف لا تكسر الواجهة */
  saveJSON(storage, FAVORITES_KEY, { [keyA]: ["x:1", 5, null] });
  assert.deepEqual(loadProfileList(storage, FAVORITES_KEY, keyA), ["x:1"]);
  assert.equal(saveProfileList(fakeStorage({}, { broken: true }), FAVORITES_KEY, keyA, ["x:1"]), false);
  assert.deepEqual(loadProfileList(fakeStorage({ [FAVORITES_KEY]: "نص تالف" }), FAVORITES_KEY, keyA), []);
});

/* ٢٩ — الأيام المتبقية في الاشتراك من طابع الانتهاء */
test("29) daysUntil يحسب المتبقي ويتعامل مع المنتهي والمجهول", () => {
  const day = 86400000;
  const now = Date.UTC(2026, 0, 1, 12, 0, 0);
  assert.equal(daysUntil(now / 1000 + 3 * (day / 1000), now), 3);
  assert.equal(daysUntil(now / 1000 + day / 1000 / 2, now), 1); /* نصف يوم → يوم */
  assert.equal(daysUntil(now / 1000 - day / 1000, now), 0); /* منتهٍ */
  assert.equal(daysUntil(0, now), null);
  assert.equal(daysUntil(Number.NaN, now), null);
  assert.equal(daysUntil(undefined, now), null);
});

/* ٣٠ — أدوات البروكسي المشتركة مع صفحة البث المباشر */
test("30) isTrustedProxy و resolveWorkerBase و resolveProxyBases و getProxyUrl", () => {
  assert.equal(isTrustedProxy("https://serverproject.ahmedlasheenrespicare.workers.dev"), true);
  assert.equal(isTrustedProxy("https://my-app.ahmedlasheenrespicare-png.deno.net"), true);
  assert.equal(isTrustedProxy("https://evil.example.com"), false);
  assert.equal(isTrustedProxy("javascript:alert(1)"), false);

  const session = fakeStorage();
  const customWorker = "https://custom.ahmedlasheenrespicare.workers.dev";
  const resolved = resolveWorkerBase({
    proxyBase: PROXY,
    search: `?proxy=${customWorker}/`,
    session,
  });
  assert.equal(resolved, customWorker);
  assert.equal(session.getItem("smp-proxy"), customWorker);

  const bases = resolveProxyBases({ proxyBase: PROXY, session });
  assert.deepEqual(bases, [customWorker, PHP_PROXY, PROXY]);

  assert.equal(
    getProxyUrl(PHP_PROXY, "http://srv.com:8080/live/u/p/10.m3u8"),
    `/proxy.php?url=${encodeURIComponent("http://srv.com:8080/live/u/p/10.m3u8")}`
  );
  assert.equal(
    getProxyUrl(PROXY, "http://srv.com:8080/live/u/p/10.m3u8"),
    `${PROXY}/x/srv.com:8080/live/u/p/10.m3u8`
  );
  assert.equal(
    getProxyUrl(PROXY, "https://srv.com/live/u/p/10.m3u8"),
    `${PROXY}/h/srv.com/live/u/p/10.m3u8`
  );
});

/* ٣١ — كشف روابط HLS المباشرة والمرمّزة عبر البروكسي وروابط ngrok */
test("31) isHlsCandidateUrl و isNgrokUrl يكشفان الروابط المباشرة والمرمّزة", () => {
  assert.equal(isHlsCandidateUrl("https://srv.com/live/u/p/1.m3u8"), true);
  assert.equal(isHlsCandidateUrl("https://srv.com/live/u/p/1.m3u8?token=abc"), true);
  assert.equal(
    isHlsCandidateUrl(
      "/proxy.php?url=" + encodeURIComponent("http://srv.com/live/u/p/1.m3u8?token=abc")
    ),
    true
  );
  assert.equal(
    isHlsCandidateUrl(
      `${PROXY}/?u=` + encodeURIComponent("http://srv.com/live/u/p/1.m3u8?token=abc")
    ),
    true
  );
  assert.equal(isHlsCandidateUrl("http://srv.com/live/u/p/1.ts"), false);

  assert.equal(isNgrokUrl("https://abc.ngrok-free.dev/live.m3u8"), true);
  assert.equal(isNgrokUrl("https://srv.com/live.m3u8"), false);
});


/* ٣٢ — روابط الأفلام والمسلسلات والإعادة (Timeshift) وEPG عبر نفس الـWorker/البروكسي */
test("32) vodStreamUrl و seriesStreamUrl و timeshiftUrl و shortEpgUrl تركّب المسارات عبر كل الوسائط", () => {
  assert.equal(vodStreamUrl("https://srv.com", "u", "p", 55, "mkv"), "https://srv.com/movie/u/p/55.mkv");
  assert.equal(
    vodStreamUrl(`${PROXY}/h/srv.com`, "u", "p", 55),
    `${PROXY}/h/srv.com/movie/u/p/55.mp4`
  );
  assert.equal(
    vodStreamUrl("/proxy.php?url=https://srv.com", "u", "p", 9, "exe"),
    `/proxy.php?url=${encodeURIComponent("https://srv.com/movie/u/p/9.mp4")}`
  );
  assert.equal(seriesStreamUrl("https://srv.com", "u", "p", 71, "mp4"), "https://srv.com/series/u/p/71.mp4");

  /* 2024-01-01T10:30:00Z — الطابع بـUTC كما تتوقع لوحات Xtream */
  const start = Date.UTC(2024, 0, 1, 10, 30) / 1000;
  assert.equal(
    timeshiftUrl("https://srv.com", "u", "p", 12, start, 180),
    "https://srv.com/timeshift/u/p/12/2024-01-01:10-30/180.m3u8"
  );

  assert.equal(
    shortEpgUrl("https://srv.com", "u", "p", 42, 4),
    "https://srv.com/player_api.php?username=u&password=p&action=get_short_epg&stream_id=42&limit=4"
  );
  /* playerApiUrl يقبل معاملات إضافية بلا كسر الروابط القديمة */
  assert.equal(
    playerApiUrl("https://srv.com", "u", "p", "get_vod_info", { vod_id: 7 }),
    "https://srv.com/player_api.php?username=u&password=p&action=get_vod_info&vod_id=7"
  );
});

/* ٣٣ — EPG: فك Base64 العربي + «يعرض الآن / التالي» مع نسبة التقدّم */
test("33) parseShortEpg يفك Base64 ويرسم يعرض الآن/التالي مع progress", () => {
  const b64 = (text) => Buffer.from(text, "utf8").toString("base64");
  const now = Date.UTC(2026, 2, 5, 18, 20) / 1000; /* 18:20 UTC */
  const payload = {
    epg_listings: [
      {
        title: { base64: b64("استوديو التحليل") },
        description: { base64: b64("ملخص المباريات") },
        start_timestamp: String(now - 1200), /* بدأ قبل 20 دقيقة */
        stop_timestamp: String(now + 1800), /* ينتهي بعد 30 دقيقة */
      },
      {
        title: { base64: b64("المسلسل الليلي") },
        description: { base64: "" },
        start_timestamp: String(now + 1800),
        stop_timestamp: String(now + 5400),
      },
    ],
  };
  const epg = parseShortEpg(payload, now);
  assert.equal(epg.now?.title, "استوديو التحليل");
  assert.equal(epg.now?.desc, "ملخص المباريات");
  assert.equal(epg.next?.title, "المسلسل الليلي");
  assert.ok(Math.abs((epg.progress ?? 0) - 1200 / 3000) < 1e-9);

  const line = formatEpgLine(epg);
  assert.match(line, /يعرض الآن: استوديو التحليل/);
  assert.match(line, /التالي: المسلسل الليلي/);
  assert.ok(formatClock(epg.now.startTs).length === 5);

  /* decodeEpgField يقبل نصاً خاماً أو {base64} أو القيم الفارغة */
  assert.equal(decodeEpgField({ base64: b64("قناة العربية") }), "قناة العربية");
  assert.equal(decodeEpgField("نص مباشر"), "نص مباشر");
  assert.equal(decodeEpgField(null), "");
  assert.equal(decodeEpgField({ base64: "!!!" }), "");

  /* بلا قنوات = حالة فارغة آمنة */
  const empty = parseShortEpg([], now);
  assert.equal(empty.now, null);
  assert.equal(empty.next, null);
  assert.equal(formatEpgLine(empty), "");
});

/* ٣٤ — بطاقات الأفلام والمسلسلات: storyline وتقييم وطاقم التمثيل + المواسم والحلقات */
test("34) parseVodInfo و parseSeriesInfo يبنيان البطاقة التفصيلية والمواسم", () => {
  const vod = parseVodInfo({
    movie_data: { stream_id: 31, name: "فيلم الاختبار", container_extension: "mkv" },
    info: {
      movie_image: "https://img/p.jpg",
      plot: "قصة قصيرة",
      rating: "7.8",
      cast: "ممثل أ، ممثل ب",
      genre: "دراما",
      duration: "01:45:00",
      releasedate: "2024-05-01",
      youtubeid: "abc123",
    },
  });
  assert.equal(vod.id, 31);
  assert.equal(vod.ext, "mkv");
  assert.equal(vod.poster, "https://img/p.jpg");
  assert.equal(vod.plot, "قصة قصيرة");
  assert.equal(vod.rating, 7.8);
  assert.equal(vod.cast, "ممثل أ، ممثل ب");
  assert.equal(vod.trailer, "https://www.youtube.com/watch?v=abc123");

  const series = parseSeriesInfo({
    info: { name: "مسلسل تجريبي", cover: "https://img/s.jpg", plot: "بداية مشوقة", rating: "8" },
    seasons: [{ season_number: 1, name: "الموسم الأول" }, { season_number: 2, name: "الموسم الثاني" }],
    episodes: {
      "1": [
        { id: 101, episode_num: 2, title: "الثانية", container_extension: "mp4", info: { duration: "45:00" } },
        { id: 100, episode_num: 1, title: "", container_extension: "mkv", info: {} },
      ],
      "2": [{ id: 200, episode_num: 1, title: "البداية", container_extension: "mp4", info: {} }],
    },
  });
  assert.equal(series.seasons.length, 2);
  assert.equal(series.seasons[0].name, "الموسم الأول");
  /* الحلقات تُرتب برقمها والبلا عنوان يأخذ «الحلقة N» */
  assert.deepEqual(series.seasons[0].episodes.map((e) => e.id), [100, 101]);
  assert.equal(series.seasons[0].episodes[0].title, "الحلقة 1");
  assert.equal(series.seasons[1].episodes.length, 1);
  assert.equal(series.cover, "https://img/s.jpg");
});

/* ٣٥ — أرقام القنوات والتنقل بالريموت + تحويل SRT إلى WebVTT للترجمة المرفوعة */
test("35) findChannelByNumber و stepChannel و srtToVtt تعمل كما في المشغّل", () => {
  const list = [stream(1, "أ", "c", { num: "101" }), stream(2, "ب", "c", { num: "102" }), stream(3, "ج", "c", { num: "103" })];
  assert.equal(findChannelByNumber(list, "102")?.id, 2);
  assert.equal(findChannelByNumber(list, "0103")?.id, 3); /* تجاهل الأصفار */
  assert.equal(findChannelByNumber(list, "999"), null);
  assert.equal(findChannelByNumber(list, ""), null);

  /* التجوّز: بعد الأخيرة يعود لأولى والعكس */
  assert.equal(stepChannel(list, streamKey(list[0]), -1)?.id, 3);
  assert.equal(stepChannel(list, streamKey(list[2]), 1)?.id, 1);
  assert.equal(stepChannel(list, streamKey(list[1]), 1)?.id, 3);
  assert.equal(stepChannel([], "x", 1), null);

  const srt = "1\n00:00:01,500 --> 00:00:04,000\nمرحباً بالعالم\n\n2\n00:00:05,000 --> 00:00:07,000\nالسطر الثاني\n";
  const vtt = srtToVtt(srt);
  assert.match(vtt, /^WEBVTT/);
  assert.match(vtt, /00:00:01\.500 --> 00:00:04\.000/);
  assert.ok(!vtt.includes(",000 -->"));
  assert.ok(!/^\s*\d+\s*$/m.test(vtt.replace("WEBVTT", ""))); /* لا أرقام سطوح في VTT */
});

/* ٣٦ — القفل الأبوي: PIN من 4 أرقام يُخزَّن Hashed ولا يُكشف */
test("36) hashPin/verifyPin/loadPinState/toggleLockKey تحمي التصنيفات", () => {
  assert.equal(isValidPin("1234"), true);
  assert.equal(isValidPin("12a4"), false);
  assert.equal(isValidPin("123"), false);

  const h = hashPin("4321");
  assert.ok(h.length > 4);
  assert.notEqual(h, "4321");
  assert.equal(verifyPin(h, "4321"), true);
  assert.equal(verifyPin(h, "1111"), false);
  assert.equal(verifyPin("", "1111"), false);
  assert.equal(verifyPin(h, "111"), false);

  const storage = fakeStorage();
  assert.equal(loadPinState(storage), null);
  savePinState(storage, { pin: h, locked: [] });
  assert.equal(loadPinState(storage)?.pin, h);

  let state = toggleLockKey({ pin: h, locked: [] }, "l:5");
  assert.deepEqual(state.locked, ["l:5"]);
  state = toggleLockKey(state, "l:5");
  assert.deepEqual(state.locked, []);
  state = toggleLockKey(state, "v:9");
  state = toggleLockKey(state, "l:5");
  assert.deepEqual([...state.locked].sort(), ["l:5", "v:9"]);
});

/* ٣٧ — متابعة المشاهدة: حفظ موضع الحلقة/الفيلم لكل حساب على حدة مع تقليم ذكي */
test("37) saveResumePosition و getResumeAt يحفظان الموضع ويتقليمان للأقدم", () => {
  const storage = fakeStorage();
  const profile = "x:host:user";
  assert.equal(getResumeAt(loadResumeMap(storage, profile), "e:1"), 0);

  assert.equal(saveResumePosition(storage, profile, "e:1", 120, 1000), true);
  assert.equal(saveResumePosition(storage, profile, "e:2", 10, 2000), false); /* أقصر من 15 ثانية */
  assert.equal(saveResumePosition(storage, profile, "", 500, 3000), false);

  const map = loadResumeMap(storage, profile);
  assert.equal(getResumeAt(map, "e:1"), 120);
  assert.equal(getResumeAt({ "e:1": { t: 5, ts: 1 } }, "e:1"), 0); /* موضع صغير يُهمل */

  /* 300 مدخل كحد أقصى — الأقدم يُقلم */
  for (let i = 0; i < 320; i += 1) saveResumePosition(storage, profile, `e:${i}`, 60 + i, 10_000 + i);
  const big = loadResumeMap(storage, profile);
  assert.equal(Object.keys(big).length, 300);
  assert.equal(big["e:0"], undefined);
  assert.ok(big["e:319"]);

  /* حساب آخر لا يرى متابعات هذا الحساب */
  assert.equal(Object.keys(loadResumeMap(storage, "x:other")).length, 0);
});

/* ٣٨ — أوضاع العرض 16:9/4:3/Fill/Contain + كشف روابط TS الخام لـmpegts.js */
test("38) aspectStyle يعطي أنماط العرض و isTsStreamUrl يميّز MPEG-TS الخام", () => {
  assert.equal(ASPECT_MODES.length, 5);
  assert.equal(aspectStyle("auto").objectFit, "contain");
  assert.equal(aspectStyle("cover").objectFit, "cover");
  assert.equal(aspectStyle("fill").objectFit, "fill");
  assert.equal(aspectStyle("16:9").aspectRatio, "16 / 9");
  assert.equal(aspectStyle("4:3").aspectRatio, "4 / 3");
  assert.equal(aspectStyle(undefined).objectFit, "contain");

  assert.equal(isTsStreamUrl("http://srv.com/live/u/p/5.ts"), true);
  assert.equal(isTsStreamUrl("/proxy.php?url=" + encodeURIComponent("http://srv.com/live/u/p/5.ts?x=1")), true);
  assert.equal(isTsStreamUrl("http://srv.com/live/u/p/5.m3u8"), false);
  assert.equal(isTsStreamUrl("http://srv.com/movie/u/p/5.mp4"), false);
  assert.equal(isTsStreamUrl(""), false);
});

/* ٣٩ — بصمة المشغّل: User-Agent الخاص بـ IPTV Smarters/VLC يُطلب من الوسيط
   (المتصفح لا يستطيع تغيير الرأس بنفسه — رأس محظور في fetch/XHR) */
test("39) withUserAgentPreset و isProxiedUrl: بصمة Smarters لروابط الوسيط فقط", () => {
  assert.equal(SMARTERS_USER_AGENT, "iptv_smarters_player_lite/1.4.2 VLC/3.1.2 LibVLC/3.1.2");
  assert.equal(UA_PARAM, "smpua");
  assert.equal(UA_PRESET_SMARTERS, "smarters");

  const target = "http://srv.com:8080/live/u/p/1.m3u8";
  const php = `/proxy.php?url=${encodeURIComponent(target)}`;

  /* بروكسي PHP: المعامل يُضاف لاستعلام الوسيط — لا داخل الرابط المُرمَّز */
  assert.equal(withUserAgentPreset(php), `${php}&smpua=smarters`);
  assert.equal(
    decodeURIComponent(withUserAgentPreset(php).split("url=")[1].split("&")[0]),
    target,
    "الرابط الأصلي يجب ألا يتغير"
  );
  /* إضافة واحدة فقط (لا تكرار لو البصمة موجودة) */
  assert.equal(withUserAgentPreset(withUserAgentPreset(php)), `${php}&smpua=smarters`);
  assert.equal(withUserAgentPreset(`${php}&smpua=smarters`), `${php}&smpua=smarters`);

  /* Worker بمسار /h/ بلا استعلام → ?smpua= ومع استعلام → &smpua= */
  const opts = { proxyBase: PROXY };
  assert.equal(
    withUserAgentPreset(`${PROXY}/h/srv.com/live/1.m3u8`, UA_PRESET_SMARTERS, opts),
    `${PROXY}/h/srv.com/live/1.m3u8?smpua=smarters`
  );
  assert.equal(
    withUserAgentPreset(`${PROXY}/h/srv.com/live/1.m3u8?token=abc`, UA_PRESET_SMARTERS, opts),
    `${PROXY}/h/srv.com/live/1.m3u8?token=abc&smpua=smarters`
  );
  assert.equal(
    withUserAgentPreset(`${PROXY}/?u=${encodeURIComponent(target)}`, UA_PRESET_SMARTERS, opts),
    `${PROXY}/?u=${encodeURIComponent(target)}&smpua=smarters`
  );
  /* الوسيط الرسمي يُعرف من نطاقه بلا تمرير proxyBase */
  const official = "https://serverproject.ahmedlasheenrespicare.workers.dev/h/srv.com/1.m3u8";
  assert.equal(withUserAgentPreset(official), `${official}?smpua=smarters`);

  /* بصمة غير معروفة تُتجاهل (القائمة مغلقة في المشغّل والوسيط معاً) */
  assert.equal(withUserAgentPreset(php, "curl/8"), php);
  assert.equal(withUserAgentPreset(php, ""), php);

  /* الروابط المباشرة: لا بصمة (لا وسيط = لا سيطرة على الرأس) */
  assert.equal(withUserAgentPreset("https://srv.com/live/u/p/1.m3u8"), "https://srv.com/live/u/p/1.m3u8");
  assert.equal(
    withUserAgentPreset("https://srv.com/live/u/p/1.m3u8", UA_PRESET_SMARTERS, opts),
    "https://srv.com/live/u/p/1.m3u8"
  );
  assert.equal(isProxiedUrl("https://srv.com/live/u/p/1.m3u8", { proxyBase: PROXY }), false);
  assert.equal(isProxiedUrl(php), true);
  assert.equal(isProxiedUrl("/proxy.php/h/srv.com/live/1.m3u8"), true);
  assert.equal(isProxiedUrl(`${PROXY}/h/srv.com/live/1.m3u8`, { proxyBase: PROXY }), true);
  assert.equal(isProxiedUrl(`${PROXY}/x/srv.com/live/1.m3u8`, { proxyBase: PROXY }), true);
  /* الوسيط الرسمي يُعرف من نطاقه حتى بدون تمرير proxyBase */
  assert.equal(
    isProxiedUrl("https://serverproject.ahmedlasheenrespicare.workers.dev/h/srv.com/1.m3u8"),
    true
  );
  assert.equal(isProxiedUrl(""), false);
});

/* ٤٠ — سلّم المرشّحات: بعد كل مرشّح عبر وسيط نسخة ببصمة Smarters/VLC،
   وتُقدَّم البصمة لو نجحت سابقاً، والروابط المباشرة والأصلية لا تتغير */
test("40) addUaVariants يضيف بصمة Smarters بعد كل مسار عبر وسيط ويحفظ الأصل", () => {
  const directUrl = "https://srv.com/live/u/p/1.m3u8";
  const phpUrl = `/proxy.php?url=${encodeURIComponent("http://srv.com/live/u/p/1.m3u8")}`;
  const workerUrl = `${PROXY}/h/srv.com/live/u/p/1.m3u8`;
  const mode = { id: "php-https", label: "بروكسي HTTPS", base: (h) => `/proxy.php?url=https://${h}` };

  const candidates = [
    { url: directUrl, native: false, label: "اتصال مباشر", isLive: true },
    { url: workerUrl, native: false, label: "وسيط HTTPS", isLive: true, mode },
    { url: phpUrl, native: false, label: "بروكسي HTTPS", isLive: true, mode },
    /* المرشّح الأصلي يكرر رابطاً موجوداً عمداً — يجب ألا يُحذف */
    { url: directUrl, native: true, label: "تشغيل أصلي مباشر", isLive: true },
  ];

  const ladder = addUaVariants(candidates, { proxyBase: PROXY });
  assert.deepEqual(
    ladder.map((c) => c.url),
    [
      directUrl,
      workerUrl,
      `${workerUrl}?smpua=smarters`,
      phpUrl,
      `${phpUrl}&smpua=smarters`,
      directUrl,
    ],
    "كل وسيط تُجرَّب بعده نفس المسار ببصمة Smarters، والمباشر لا يتغير"
  );
  assert.deepEqual(
    ladder.map((c) => c.ua ?? ""),
    ["", "", "smarters", "", "smarters", ""],
    "البصمة مسجّلة على المرشّح حتى تُذكر عند النجاح"
  );
  assert.equal(ladder[2].label, `وسيط HTTPS • ${UA_LABEL}`);
  assert.equal(ladder[4].mode, mode, "نسخة البصمة تبقى على نفس المسار");
  assert.equal(ladder[5].native, true, "التشغيل الأصلي المكرر يبقى في القائمة");
  assert.equal(ladder[2].native, false);

  /* نجحت البصمة سابقاً → تُجرَّب أولاً (توفير محاولة فاشلة في كل تشغيل) */
  const preferred = addUaVariants(candidates, { proxyBase: PROXY, preferred: UA_PRESET_SMARTERS });
  assert.equal(preferred[0].url, directUrl, "المباشر يبقى أولاً كما كان");
  assert.equal(preferred[1].url, `${workerUrl}?smpua=smarters`, "البصمة تُقدَّم على نفس المسار");
  assert.equal(preferred[2].url, workerUrl);
  assert.deepEqual(preferred.slice(1, 3).map((c) => c.ua ?? ""), ["smarters", ""]);

  /* قائمة بلا وسطاء (مباشر فقط) تبقى كما هي */
  const plain = [{ url: directUrl, native: false, label: "اتصال مباشر" }];
  assert.deepEqual(addUaVariants(plain, { proxyBase: PROXY }), plain);
  /* ومرشّح ببصمة مضافة مسبقاً لا يُضاعَف */
  const once = [{ url: `${phpUrl}&smpua=smarters`, native: false, label: "بروكسي", ua: "smarters" }];
  assert.deepEqual(addUaVariants(once, { proxyBase: PROXY }), once);
});

/* ٤١ — مرشّحات ملف M3U مع البصمة: ngrok يبدأ بالوسيط وتُجرَّب البصمة بعده */
test("41) m3uCandidates + addUaVariants: البصمة تأتي بعد كل رابط وسيط", () => {
  const urls = m3uCandidates("http://srv.com/live/u/p/5.ts", {
    proxyBase: PROXY,
    isHttpsSite: true,
  });
  const ladder = addUaVariants(
    urls.map((u) => ({ url: u, native: false, label: "مرشّح" })),
    { proxyBase: PROXY }
  );

  const proxied = ladder.filter((c) => isProxiedUrl(c.url, { proxyBase: PROXY }));
  assert.ok(proxied.length >= 3, "روابط الوسيط و/proxy.php كلها في السلّم");
  /* كل رابط وسيط عادي يقابله رابط ببصمة Smarters */
  const withUa = proxied.filter((c) => c.ua === UA_PRESET_SMARTERS);
  assert.equal(withUa.length, proxied.length - withUa.length);
  assert.ok(
    withUa.every((c) => c.url.includes("smpua=smarters")),
    "البصمة موجودة في كل مرشّح موسوم"
  );
  /* الروابط المباشرة لا تحمل البصمة إطلاقاً */
  assert.ok(
    ladder.filter((c) => !isProxiedUrl(c.url, { proxyBase: PROXY })).every((c) => !c.url.includes("smpua=")),
    "لا معنى لبصمة في اتصال مباشر من المتصفح"
  );
});
