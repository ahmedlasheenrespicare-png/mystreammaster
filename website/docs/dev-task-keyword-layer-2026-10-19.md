# تكليف تنفيذ: طبقة الكلمات المستهدفة والحرّاس الآليون

**إلى:** مطوّر الموقع
**من:** إدارة المنتج
**التاريخ:** 19 أكتوبر 2026
**الفرع المقترح:** `feat/keyword-layer` (من `main`، لا تعمل على `main` مباشرة)
**المرجع:** `website/docs/keyword-map-2026-10-19.md` و`website/docs/seo-strategy-2026-10-19.md`

---

## 0. الملخص في نصف صفحة

الموقع اليوم لا يملك إعلاناً صريحاً عن الكلمة التي تخدمها كل صفحة. النتيجة: **41 عنواناً** يحمل اسم البراند ويُهدر مساحة الكلمة، و**`/store` و`/servers` لهما نفس الـ`h1` حرفياً**، و**كلمتان لصفحتين مختلفتين** في عدة مواضع — ولا اختبار واحد يكشف ذلك.

المطلوب: إضافة **حقل كلمات اختياري** إلى `SeoMeta`، وخريطة واحدة تحمل الكلمة والقصد لكل مسار، ثم **ثلاثة حرّاس آليين** داخل البناء تمنع تكرار الأخطاء.

**الأثر على الترتيب:** ضعيف مباشرةً. **الأثر على المنع:** مرتفع. هذا العمل **حوكمة**، لا تحسين ترتيب — لا تَعِد المالك بغير ذلك.

**ما لا يفعله هذا التكليف:** لا يُضيف `<meta name="keywords">`، ولا يُطبع `primaryKeyword` في HTML، ولا يغيّر أي سعر أو سياسة أو ملف `.php`.

---

## 1. حدود لا تُتجاوز

| ✅ مسموح | ❌ ممنوع |
|---|---|
| `website/src/**` و`website/scripts/**` | أي ملف `.php` |
| `website/index.html` (حذف وسم keywords) | `admin-dashboard/**` |
| `package.json` (إضافة سكربت واحد) | `channels.json` |
| `website/docs/**` | تعديل أي اختبار قائم ليمرّ |
| | تغيير CSP أو `ads.txt` أو `adsbygoogle` |
| | تغيير أي `slug` أو مسار |

**قاعدة الاختبار:** إن فشل حارس، **أصلح الصفحة لا الحارس**. لا `t.skip` ولا `assert.ok(true)` ولا حذف حالة.

**قاعدة الهوية:** أي عنوان جديد يجب أن يستخدم الصياغات المعتمدة، ولا يستخدم «سيرفرنا» أو «قنواتنا» أو «شاهد عندنا»، ولا يَعِد بمشاهدة مشفّرة مجانية.

---

## 2. الملفات التي ستُلمس (6 فقط)

| # | الملف | الحالة | التغيير |
|---|---|---|---|
| 1 | `website/src/keywords.mjs` | **جديد** | خريطة 81 مساراً |
| 2 | `website/src/keywords.d.mts` | **جديد** | الأنواع |
| 3 | `website/src/seo.ts` | تعديل | 3 حقول في `SeoMeta` + سطران في `getSeo` |
| 4 | `website/scripts/seo-guard.mjs` | **جديد** | الحرّاس الثلاثة |
| 5 | `website/scripts/prerender.mjs` + `publish-static.mjs` | تعديل | نداء الحارس |
| 6 | `website/index.html` | تعديل | حذف `<meta name="keywords">` |

---

## 3. الخطوة 0 — التقاط خط الأساس قبل أي تعديل

```bash
git checkout -b feat/keyword-layer
npm ci --prefix website
npm run typecheck && npm test && npm run build
git status            # يجب أن يكون نظيفاً — سجّل الناتج
```

احفظ هذا الناتج في وصف الـPR. لو ظهرت فروقات في `git status` قبل أن تكتب سطراً، **توقف وأبلغ** — الشجرة ليست حتمية.

---

## 4. الخطوة 1 — إنشاء `website/src/keywords.mjs`

**لماذا `.mjs` وليس `.ts`؟** لأن نفس الملف يُستورد من تطبيق React (Vite) ومن سكربتات البناء (Node مباشرة). هذا هو النمط المعتمد في المشروع نفسه: `site.mjs` و`navigation.mjs` — كلاهما `.mjs` مع `.d.mts` مجاور. اتبع النمط نفسه حرفياً.

```js
/* ==========================================================================
   خريطة الكلمات المستهدفة — مصدر واحد يقصد كل مسار
   --------------------------------------------------------------------------
   لماذا؟
     • قبل هذا الملف لم يكن في الكود ما يعلن أن /store تخدم «سعر» وأن
       /servers تخدم «مقارنة» — فخرجت الصفحتان بنفس h1 حرفياً.
     • الحقل هنا للحوكمة الداخلية فقط: لا يُطبع في HTML، ولا يُقرأ بواسطة
       محركات البحث. قيمته أنه يجعل الخطأ قابلاً للفحص قبل النشر.

   القاعدة:
     • مسار واحد = كلمة أساسية واحدة = قصد واحد.
     • primary = null إعلان صريح: صفحة قانونية/وظيفية لا تستهدف كلمة.
     • لا تكرّر primary بين مسارين — الحارس في scripts/seo-guard.mjs يرفض.

   المفتاح: المسار بلا شرطة ختامية، كما يُنتجه normalizePath في router.tsx
   الاستثناء الوحيد: /watch-legal.html (ملف بامتداد، لا مجلد).
========================================================================== */

/** @typedef {"transactional"|"comparison"|"informational"|"editorial"|"legal"|"navigational"} Intent */

export const KEYWORDS = {
  "/": { primary: "ربط تقني", secondary: ["دليل المشاهدة", "إعداد مشغلات", "M3U", "Xtream"], intent: "transactional" },
  // … (الجدول الكامل في القسم 10)
};
```

### 4.1 `website/src/keywords.d.mts`

```ts
export type Intent =
  | "transactional" | "comparison" | "informational"
  | "editorial" | "legal" | "navigational";

export interface KeywordEntry {
  /** الكلمة التي تملكها الصفحة — null للصفحات القانونية/الوظيفية */
  primary: string | null;
  /** كلمات تُخدم داخل النص لا في العنوان */
  secondary?: string[];
  intent: Intent;
}

export declare const KEYWORDS: Record<string, KeywordEntry>;

export declare function keywordsFor(route: string): KeywordEntry;
```

### 4.2 دالة مساعدة (في نهاية `keywords.mjs`)

```js
/** تطبيع المسار: بلا شرطة ختامية، مع فك ترميز السلاجات العربية */
export function normalizeRoute(route) {
  let out = String(route ?? "/");
  try { out = decodeURI(out); } catch { /* مسار غير صالح الترميز */ }
  out = `/${out.replace(/^\/+/, "")}`;
  if (out !== "/" && !/\.[a-z0-9]+$/i.test(out)) out = out.replace(/\/+$/, "");
  return out || "/";
}

/** كلمة المسار أو إعلان صريح بأنه بلا استهداف */
export function keywordsFor(route) {
  return KEYWORDS[normalizeRoute(route)] ?? { primary: null, intent: "navigational" };
}
```

**ملاحظة:** `normalizeRoute` يجب أن يتصرف مثل `normalizePath` في `website/src/router.tsx` تماماً. لا تكتب تطبيعاً مختلفاً — وإلا تعذّر العثور على المفاتيح.

---

## 5. الخطوة 2 — ربط `seo.ts`

### 5.1 أضف الحقول إلى الواجهة (بعد `themeColor`، السطر ~42)

```ts
export interface SeoMeta {
  // … الحقول الحالية كما هي — لا تحذف ولا تُعدّل شيئاً

  /** الكلمة التي تملكها هذه الصفحة. null = صفحة لا تستهدف كلمة (قانونية/وظيفية) */
  primaryKeyword?: string | null;
  /** كلمات تُخدم داخل النص لا في العنوان */
  secondaryKeywords?: string[];
  /** نوع القصد — يمنع تنافس صفحتين على قصد واحد */
  intent?: "transactional" | "comparison" | "informational" | "editorial" | "legal" | "navigational";
}
```

### 5.2 مرّرها من الخريطة (داخل `getSeo`، عند بناء `base`، حوالي السطر 285)

```ts
import { keywordsFor } from "./keywords.mjs";
// …
export function getSeo(path: string): SeoMeta {
  const clean = `/${path.replace(/^\/+|\/+$/g, "")}`;
  const routeKey = clean.replace(/^\/|^$/g, "");
  const kw = keywordsFor(clean);          // ← سطر جديد
  // …
  const base: SeoMeta = {
    // … كما هي
    primaryKeyword: kw.primary,           // ← سطر جديد
    secondaryKeywords: kw.secondary ?? [], // ← سطر جديد
    intent: kw.intent,                    // ← سطر جديد
  };
```

### 5.3 تنبيه حرج

الفروع الداخلية في `getSeo` (22 فرعاً) تُرجع `{ ...base, title: … }` — أي أنها **ترث الحقول تلقائياً**. لا تكرّر كتابة الحقول في كل فرع.

لكن **الفرع الذي يعيد كائناً جديداً بالكامل** (`/cart` مثلاً) يجب أن يحمل `intent: "navigational"` و`primary: null` صراحةً، وإلا صار بلا قصد معلن.

### 5.4 ما لا تفعله في هذه الخطوة

- **لا تُغيّر أي `title` أو `description` بعد.** الخطوة 2 إضافة بيانات فقط؛ أي تغيير في العناوين يكون في PR منفصل ليُقاس أثره وحده.
- **لا تُطبع `primaryKeyword` في HTML.** `prerender.mjs` يجب أن يبقى كما هو في هذه النقطة.

---

## 6. الخطوة 3 — الحرّاس الثلاثة

### 6.1 `website/scripts/seo-guard.mjs` (جديد)

```js
/* حرّاس SEO — تُنادى من البناء، وتفشل البناء عند المخالفة في الوضع الصارم */
import { normalizeArabic } from "../src/lib/xtream.mjs";

const norm = (s) => normalizeArabic(s);

/** كلمة أساسية داخل العنوان — بغضّ النظر عن التشكيل وصيغة الحروف */
export function assertKeywordInTitle(route, title, primary) {
  if (!primary) return null;
  if (norm(title).includes(norm(primary))) return null;
  return `العنوان لا يخدم كلمته الأساسية → ${route}\n  الكلمة: ${primary}\n  العنوان: ${title}`;
}

/** عنوان لا يحمل اسم البراند ولا يتجاوز 60 حرفاً */
export function assertTitleShape(route, title) {
  const problems = [];
  if (title.includes("ستريم ماستر")) problems.push(`اسم البراند داخل العنوان → ${route} :: ${title}`);
  if (title.length > 60) problems.push(`عنوان ${title.length} حرفاً (> 60) → ${route}`);
  return problems;
}

/** كلمة واحدة لا يملكها مسارَان */
export function findDuplicateKeywords(entries) {
  const seen = new Map();
  const dups = [];
  for (const { route, primary, intent } of entries) {
    if (!primary) continue;
    const key = norm(primary);
    if (seen.has(key)) dups.push(`كلمة مكرّرة «${primary}» → ${seen.get(key)} و${route}`);
    else seen.set(key, route);
    // القصد التجاري لا يتكرّر: صفحتان بنفس القصد = تنافس داخلي
    if (intent === "transactional") {
      const k2 = `tx:${key}`;
      if (seen.has(k2)) dups.push(`قصد تجاري مكرّر → ${seen.get(k2)} و${route}`);
      else seen.set(k2, route);
    }
  }
  return dups;
}
```

**ملاحظة:** استخدم `normalizeArabic` من `src/lib/xtream.mjs` — فهي تزيل التشكيل وتوحّد «أ/إ/آ» و«ة/ه» و«ى/ي» و«ؤ/و». لا تكتب دالة تطبيع جديدة.

### 6.2 النداء من `prerender.mjs` (داخل الحلقة، بعد `renderPage`)

```js
import { assertKeywordInTitle, assertTitleShape, findDuplicateKeywords } from "./seo-guard.mjs";

const strict = process.env.SEO_STRICT === "1";
const violations = [];
const entries = [];

for (const route of routes) {
  const { html, seo } = renderPage(route);
  // … الكود الحالي كما هو

  entries.push({ route, primary: seo.primaryKeyword, intent: seo.intent });
  const k = assertKeywordInTitle(route, seo.title, seo.primaryKeyword);
  if (k) violations.push(k);
  violations.push(...assertTitleShape(route, seo.title));
}

violations.push(...findDuplicateKeywords(entries));

if (violations.length) {
  await fs.writeFile("docs/seo-report.txt", violations.join("\n\n"), "utf8");
  console.error(`\n⚠️  ${violations.length} مخالفة SEO — التقرير في website/docs/seo-report.txt`);
  if (strict) throw new Error(`SEO strict: ${violations.length} مخالفة`);
}
```

### 6.3 نفس النداء من `publish-static.mjs` (للصفحات القديمة)

الصفحات القديمة (`/about/`, `/terms/`, `/privacy/`, `/refund/`, `/predictions/`, `/status/`, `/watch-legal.html`, تقارير المباريات) **لا تمرّ عبر `getSeo`** — تُنشر في `publish-static.mjs` عبر Cheerio. أضف بعد كتابة كل صفحة:

```js
import { keywordsFor } from "../src/keywords.mjs";
import { assertKeywordInTitle, assertTitleShape } from "./seo-guard.mjs";

const kw = keywordsFor("/" + relative);
const title = $("title").first().text().trim();
violations.push(...assertTitleShape("/" + relative, title));
const k = assertKeywordInTitle("/" + relative, title, kw.primary);
if (k) violations.push(k);
```

### 6.4 التسلسل الآمن: تحذير أولاً، ثم إلزام

**لا تُشغّل الوضع الصارم في PR الأول.** التسلسل:

| PR | الوضع | النتيجة المتوقعة |
|---|---|---|
| **PR-1** (هذا) | `SEO_STRICT` غير مضبوط = تحذير | البناء ينجح، ويُنتج `docs/seo-report.txt` بقائمة المخالفات |
| **PR-2** | إصلاح العناوين الـ41 والـ27 والمكرّرات | التقرير يفرغ تدريجياً |
| **PR-3** | `SEO_STRICT=1` في `verify.yml` | البناء يفشل على أي مخالفة جديدة |

**سبب هذا التسلسل:** لو أُلزم الوضع الصارم فوراً، لَفَشَل البناء على 41+27 مخالفة قائمة، ولتعطّل النشر. التحذير أولاً يعطيك القائمة كاملة قبل أن تُغلق البوابة.

---

## 7. الخطوة 4 — إصلاحات مصاحبة (دقيقتان، معطّلة الآن)

### 7.1 حذف `<meta name="keywords">`

**الملف:** `website/index.html` السطر **26**.

```html
<!-- احذف هذا السطر بالكامل -->
<meta name="keywords" content="خدمات ربط تقني, إعداد مشغل IPTV, M3U, …" />
```

**السبب:** ينتشر على 776 صفحة بنفس النص حرفياً، جوجل يتجاهله رسمياً منذ 2009، ويعطي انطباعاً كاذباً بأن هناك استهدافاً لكل صفحة. حذفه لا يضرّ شيئاً ويُنقص بايتات من كل صفحة.

### 7.2 إصلاح مسافة مفقودة في `h1` الرئيسية

**الملف:** `website/src/components/Hero.tsx` السطر **360**.

```diff
- {" كل ما تحب"}
+ {" كل ما تحب "}
```

**المشكلة المقاسة:** النص المستخرج من `h1` هو `شاهِد كل ما تحببجودة 4K وبلا تقطيع` — كلمتان ملتصقتان، لأن `LineReveal` يرسم كل سطر في `span` منفصل بلا فاصل نصي. هذا يُضعف استخراج `h1` آلياً (ومنها أنظمة الذكاء الاصطناعي).

### 7.3 `h1` الرئيسية — **قرار مطلوب من المالك، لا تنفّذه منفرداً**

الحالي: `شاهِد كل ما تحب بجودة 4K وبلا تقطيع`

| المشكلة | التفصيل |
|---|---|
| لا يحوي أي كلمة مستهدفة | لا «ربط تقني» ولا «إعداد مشغلات» |
| يحمل وعداً غير قابل للإثبات | «بلا تقطيع» و«4K» — مخالفة قسم الهوية |
| لا يطابق الصياغة المعتمدة | «خدمات ربط تقني وإعداد مشغلات البث ودليل المشاهدة الرسمية» |

**المقترح (بانتظار موافقة المالك قبل التنفيذ):**
```
ربط تقني وإعداد مشغلات البث على شاشتك
```
مع نقل «4K وبلا تقطيع» إلى سطر فرعي (`p`) بلا وعد مطلق.

**لا تنفّذ 7.3 في هذا الـPR** — ضعه في PR منفصل بعد موافقة صريحة، لأنه تغيير بصري في أعلى الصفحة.

---

## 8. الخطوة 5 — التحقق والبوابات

```bash
npm run typecheck        # ✅ يجب أن يمرّ
npm test                 # ✅ 484 حالة (483 ناجح + 1 متخطّى) — لا فشل
npm run build            # ✅ 775 مساراً + تقرير SEO
cat website/docs/seo-report.txt   # راجع القائمة، لا تُصلحها في هذا الـPR
git status               # ✅ نظيف (البناء حتمي)
npx playwright test tests/storefront.spec.ts tests/navigation.spec.ts
```

**تحقق إضافي يدوي (إلزامي):**

```bash
# 1) الحقول وصلت فعلاً لكل مسار
node -e "
const { renderPage, getAllRoutes } = await import('./website/dist-ssr/entry-server.js');
const r = getAllRoutes().filter(x => !x.startsWith('/matches/') || x.split('/').length < 4);
console.log(r.slice(0,5).map(x => [x, renderPage(x).seo.primaryKeyword]));
" --input-type=module

# 2) الحقول لم تتسرّب إلى HTML
grep -c "primaryKeyword" index.html dist/index.html   # يجب أن يكون 0

# 3) وسم keywords اختفى
grep -c 'name="keywords"' index.html                   # يجب أن يكون 0
```

---

## 9. معايير القبول (Definition of Done)

- [ ] `keywords.mjs` + `keywords.d.mts` موجودان، و`keywordsFor()` تعمل من Node ومن Vite.
- [ ] `SeoMeta` يحمل الحقول الثلاثة، و`getSeo` يملؤها لكل مسار.
- [ ] **0** ظهور لـ`primaryKeyword` في أي HTML منشور.
- [ ] `docs/seo-report.txt` يُنتج في كل بناء ويحوي المخالفات القائمة.
- [ ] البناء ينجح في وضع التحذير، ويفشل عند `SEO_STRICT=1` (اختبره محلياً بحقن مخالفة ثم أزلها).
- [ ] `<meta name="keywords">` محذوف، وعدده في الجذر = 0.
- [ ] مسافة `h1` مصلحة.
- [ ] البوابات الأربع تمرّ، و`git status` نظيف.
- [ ] لم يُعدّل أي ملف `.php` أو `admin-dashboard` أو `channels.json`.
- [ ] لم يُعدّل أي اختبار قائم.
- [ ] لم يتغيّر أي `title` في هذا الـPR (القاعدة: بيانات فقط، لا تحسينات مختلطة).

---

## 10. جدول المسارات الـ81 — انسخه كما هو

**ملاحظة:** العناوين في العمود الأخير **مقترحة ومقاسة** (كلها ≤ 60 حرفاً ولا تحمل اسم البراند). لكن تنفيذها **ليس في هذا الـPR** — إنها مادة PR-2. في هذا الـPR يُملأ عمود «الكلمة» و«القصد» فقط.

| المسار | الكلمة الأساسية | القصد | العنوان المقترح | طول |
|---|---|---|---|---:|
| `/` | ربط تقني | transactional | ربط تقني وإعداد مشغلات البث | 27 |
| `/about/` | من نحن | navigational | من نحن: خدمة ربط تقني وإعداد المشغلات | 37 |
| `/blog/` | أدلة تشغيل | informational | أدلة تشغيل IPTV وإعداد المشغلات | 31 |
| `/blog/android-tv-boxes-buying-guide/` | صناديق Android TV | informational | صناديق Android TV: كيف تختار جهازاً موثوقاً؟ | 44 |
| `/blog/choose-iptv-server/` | اختيار سيرفر IPTV | informational | اختيار سيرفر IPTV: المعايير التقنية قبل السعر | 45 |
| `/blog/hdr-and-frame-rate-explained/` | HDR | informational | HDR وعدد الإطارات: ماذا يغيّران في الصورة؟ | 42 |
| `/blog/http-protocols/` | — (بلا استهداف) | editorial | — يُحذف أو يُنقل خارج الفهرسة — | 31 |
| `/blog/internet-speed-for-video-streaming/` | سرعة الإنترنت | informational | سرعة الإنترنت المطلوبة لمشاهدة الفيديو | 38 |
| `/blog/iptv-samsung-lg-setup/` | إعداد IPTV على سامسونج | informational | إعداد IPTV على سامسونج و LG: خطوات مفصّلة | 41 |
| `/blog/iptv-على-apple-tv/` | إعداد مشغّل IPTV | informational | إعداد مشغّل IPTV على Apple TV | 29 |
| `/blog/iptv-مقابل-netflix-وشاهد/` | IPTV مقابل Netflix | comparison | IPTV مقابل Netflix وشاهد: مقارنة تقنية | 38 |
| `/blog/phone-and-computer-viewing-setup/` | المشاهدة على الهاتف | informational | إعداد المشاهدة على الهاتف والكمبيوتر | 36 |
| `/blog/risks-of-unverified-apps/` | التطبيقات غير الموثوقة | informational | التطبيقات غير الموثوقة: خطر على جهازك | 37 |
| `/blog/test-iptv-server-stability/` | ثبات سيرفر IPTV | informational | كيف تختبر ثبات سيرفر IPTV قبل الدفع؟ | 36 |
| `/blog/video-resolution-hd-fhd-4k/` | دقة الصورة | informational | دقة الصورة: HD وFHD و4K وأيها يناسبك؟ | 37 |
| `/blog/what-is-unlicensed-streaming/` | بث محتوى بدون ترخيص | informational | ما معنى بث محتوى بدون ترخيص؟ | 28 |
| `/blog/أهمية-الدعم-الفني-في-اشتراكات-iptv/` | الدعم الفني | informational | أهمية الدعم الفني في خدمات IPTV | 31 |
| `/blog/افضل-اشتراك-iptv-2026/` | اشتراك IPTV 2026 | informational | اشتراك IPTV في 2026: ما الذي تغيّر؟ | 35 |
| `/blog/افضل-قنوات-iptv-الرياضية/` | القنوات الرياضية الناقلة | informational | القنوات الرياضية الناقلة: من يملك حق البث؟ | 42 |
| `/blog/الدول-العربية-في-كأس-العالم-2026/` | المنتخبات العربية | informational | المنتخبات العربية في كأس العالم 2026 | 36 |
| `/blog/تثبيت-iptv-على-samsung-smart-tv/` | Samsung Smart TV | informational | إعداد IPTV على Samsung Smart TV (Tizen) | 39 |
| `/blog/كأس-العالم-2026-iptv/` | كأس العالم 2026 | informational | كأس العالم 2026: القنوات الناقلة الرسمية | 40 |
| `/blog/مقارنة-نوفا-ايستار-موكا/` | مقارنة نوفا | comparison | مقارنة نوفا وإيستار وموكا: أيها يناسبك؟ | 39 |
| `/blog/نهائي-دوري-أبطال-أوروبا-2026/` | نهائي دوري أبطال أوروبا | informational | نهائي دوري أبطال أوروبا 2026: النتيجة والناقل | 45 |
| `/blog/هل-iptv-آمن/` | هل IPTV آمن | informational | هل IPTV آمن؟ الأمان التقني والقانوني | 36 |
| `/channels/` | دليل القنوات | informational | دليل القنوات والمنصات الرسمية | 29 |
| `/channels/documentaries/` | القنوات الوثائقية | informational | القنوات الوثائقية ومواقعها الرسمية | 34 |
| `/channels/entertainment/` | قنوات الترفيه | informational | قنوات الترفيه وروابطها الرسمية | 30 |
| `/channels/kids/` | قنوات الأطفال | informational | قنوات الأطفال وروابط المشاهدة الرسمية | 37 |
| `/channels/movies/` | قنوات الأفلام | informational | قنوات الأفلام وروابط الجهات الرسمية | 35 |
| `/channels/music/` | القنوات الموسيقية | informational | القنوات الموسيقية ومواقعها الرسمية | 34 |
| `/channels/news/` | القنوات الإخبارية | informational | القنوات الإخبارية وروابط الجهات الرسمية | 39 |
| `/channels/platforms/` | منصات المشاهدة | informational | منصات المشاهدة الرسمية وخيارات الوصول | 37 |
| `/channels/religious/` | القنوات الدينية | informational | القنوات الدينية وروابط الجهات الرسمية | 37 |
| `/channels/sports/` | القنوات الرياضية | informational | القنوات الرياضية وروابط المنصات الرسمية | 39 |
| `/en/` | technical activation | transactional | Technical Activation & Streaming Player Setup | 45 |
| `/en/faq/` | FAQ | informational | FAQ: Activation, Payment, Devices & Renewals | 44 |
| `/en/istar/` | iStar Pro Server | transactional | iStar Pro Server: Technical Activation & Setup | 46 |
| `/en/moka/` | Moka Server | transactional | Moka Server: Technical Activation & Setup | 41 |
| `/en/nova/` | Nova Server | transactional | Nova Server: Technical Activation & Setup | 41 |
| `/faq/` | أسئلة تفعيل IPTV | informational | أسئلة تفعيل IPTV والدفع والأجهزة | 32 |
| `/galatasaray-barcelona/` | جالاتا سراي | editorial | جالاتا سراي 1–4 برشلونة: تحليل الجولة | 37 |
| `/galatasaray-barcelona/watch/` | متابعة جالاتا سراي | editorial | متابعة جالاتا سراي × برشلونة رسمياً | 35 |
| `/istar/` | باقة إيستار | transactional | باقة إيستار برو: تفعيل وربط تقني | 32 |
| `/manchester-city-psg/` | مانشستر سيتي | editorial | مانشستر سيتي 2–4 باريس: تحليل المباراة | 38 |
| `/manchester-city-psg/watch/` | متابعة سيتي | editorial | متابعة سيتي × باريس: النتيجة والمشاهدة | 38 |
| `/manchester-united-atletico/` | أتلتيكو | editorial | أتلتيكو 2–0 مانشستر يونايتد: تحليل الجولة | 41 |
| `/manchester-united-atletico/watch/` | متابعة أتلتيكو | editorial | متابعة أتلتيكو × مانشستر يونايتد رسمياً | 39 |
| `/match-analysis/` | تحليل مباريات | editorial | تحليل مباريات دوري أبطال أوروبا 2026/27 | 39 |
| `/match-center/` | مركز المباراة | informational | مركز المباراة: النتائج والتشكيلات والإحصاءات | 44 |
| `/matches/` | مواعيد المباريات | informational | مواعيد المباريات والنتائج والقنوات الناقلة | 42 |
| `/matches/الدوري-الألماني/` | مباريات الدوري الألماني | informational | مباريات الدوري الألماني: المواعيد والقنوات | 42 |
| `/matches/الدوري-الإسباني/` | مباريات الدوري الإسباني | informational | مواعيد مباريات الدوري الإسباني والقنوات | 39 |
| `/matches/الدوري-الإنجليزي/` | مباريات الدوري الإنجليزي | informational | مباريات الدوري الإنجليزي: المواعيد والقنوات | 43 |
| `/matches/الدوري-الإيطالي/` | مباريات الدوري الإيطالي | informational | مباريات الدوري الإيطالي: المواعيد والقنوات | 42 |
| `/matches/الدوري-السعودي/` | مباريات الدوري السعودي | informational | مباريات الدوري السعودي: المواعيد والقنوات | 41 |
| `/matches/الدوري-الفرنسي/` | مباريات الدوري الفرنسي | informational | مباريات الدوري الفرنسي: المواعيد والقنوات | 41 |
| `/matches/الدوري-المصري/` | مباريات الدوري المصري | informational | مباريات الدوري المصري: المواعيد والقنوات | 40 |
| `/matches/دوري-أبطال-أوروبا/` | دوري أبطال أوروبا | informational | دوري أبطال أوروبا: المواعيد والقنوات الناقلة | 44 |
| `/moka/` | باقة موكا | transactional | باقة موكا: تفعيل وربط تقني | 26 |
| `/nova/` | باقة نوفا | transactional | باقة نوفا: تفعيل وربط تقني للمباريات | 36 |
| `/predictions/` | توقعات المباريات | editorial | توقعات المباريات: كيف تُقرأ الأرقام؟ | 36 |
| `/privacy/` | — (بلا استهداف) | legal | سياسة الخصوصية | 14 |
| `/refund/` | — (بلا استهداف) | legal | سياسة الاسترداد والإلغاء | 24 |
| `/roma-real-madrid/` | روما | editorial | روما 3–4 ريال مدريد: نتيجة وتشكيلات | 35 |
| `/roma-real-madrid/watch/` | متابعة روما | editorial | متابعة روما × ريال مدريد: النتيجة الرسمية | 41 |
| `/servers/` | مقارنة السيرفرات | comparison | مقارنة السيرفرات والباقات التقنية | 33 |
| `/status/` | حالة الخدمة | navigational | حالة الخدمة: آخر تحقق معلن | 26 |
| `/store/` | سعر باقات التفعيل | transactional | سعر باقات التفعيل التقني والمقارنة | 34 |
| `/terms/` | — (بلا استهداف) | legal | شروط الاستخدام وحقوق الملكية | 28 |
| `/trial/` | تجربة IPTV مجانية | transactional | تجربة IPTV مجانية 6 ساعات | 25 |
| `/watch-legal.html/` | المشاهدة القانونية | informational | المشاهدة القانونية للقنوات المشفّرة | 35 |
| `/world-cup-2026/` | كأس العالم FIFA 2026 | informational | كأس العالم FIFA 2026: الأرشيف الكامل | 36 |
| `/world-cup-2026/الأردن/` | منتخب الأردن | informational | مباريات منتخب الأردن وتوقيتاتها | 31 |
| `/world-cup-2026/الجزائر/` | منتخب الجزائر | informational | مباريات منتخب الجزائر وتوقيتاتها | 32 |
| `/world-cup-2026/السعودية/` | منتخب السعودية | informational | مباريات منتخب السعودية وتوقيتاتها | 33 |
| `/world-cup-2026/العراق/` | منتخب العراق | informational | مباريات منتخب العراق وتوقيتاتها | 31 |
| `/world-cup-2026/المغرب/` | منتخب المغرب | informational | مباريات منتخب المغرب وتوقيتاتها | 31 |
| `/world-cup-2026/تونس/` | منتخب تونس | informational | مباريات منتخب تونس وتوقيتاتها | 29 |
| `/world-cup-2026/قطر/` | منتخب قطر | informational | مباريات منتخب قطر وتوقيتاتها | 28 |
| `/world-cup-2026/مصر/` | منتخب مصر | informational | مباريات منتخب مصر وتوقيتاتها | 28 |

### 10.1 إدخالات `primary: null`

أربعة مسارات فقط: `/privacy/`, `/refund/`, `/terms/`, و`/blog/http-protocols/` (الأخير بانتظار قرار الحذف — انظر 11).

**لماذا `null` وليس كلمة؟** لثلاثة أسباب:
1. الصفحات القانونية لا تُنافس على كلمة، ولا يجب أن تُحشى بها.
2. الحارس يحتاج تمييزاً صريحاً بين «لم أملأ الحقل» و«هذه صفحة لا تستهدف».
3. يمنع ظهور إنذارات كاذبة تحفّز على الحشو.

### 10.2 ملاحظة على الخريطة

الخريطة فيها **3 مجموعات بتكرار مقصود سأُزال لاحقاً**، والحارس سيكشفها ولن يمنعها لأنها `primary` مختلفة:
- `/blog/choose-iptv-server/` و`/blog/افضل-اشتراك-iptv-2026/` — قصداهما متقاربان، يحتاجان دمجاً في PR-2.
- `/blog/iptv-samsung-lg-setup/` و`/blog/تثبيت-iptv-على-samsung-smart-tv/` — نفس القصد، يحتاجان دمجاً.
- `/blog/مقارنة-نوفا-ايستار-موكا/` و`/blog/choose-iptv-server/` — تداخل جزئي.

لا تدمجها في هذا الـPR. سجّلها في التقرير فقط.

---

## 11. أسئلة تُطرح على المالك قبل التنفيذ

لا تخمّن في هذه النقاط — اسأل أولاً:

| # | السؤال | الخيارات | ما يترتب على الجواب |
|---|---|---|---|
| 1 | مصير `/blog/http-protocols/`؟ | (أ) حذف + 410 (ب) نقله إلى `legacy` كمصدر (ج) إبقاء | إن (أ) أو (ب): يُحذف من الخريطة |
| 2 | هل نُبقي `/store/` و`/servers/` منفصلتين؟ | (أ) `/store` سعر · `/servers` مقارنة (ب) دمج | إن (ب): تتغيّر خريطتان وروابط |
| 3 | هل نُفعّل الحقل الصارم في `verify.yml` في PR-3؟ | (أ) نعم (ب) تحذير دائم | يحدد متى تُغلق البوابة |
| 4 | `h1` الرئيسية (7.3)؟ | (أ) تغييره (ب) إبقاؤه | إن (ب): يبقى الحارس بلا كلمة للرئيسية؛ أعلن `primary: null` لها |

**حتى تُجاب هذه الأسئلة:** نفّذ 1–7.2 فقط، وضع الخريطة كما هي أعلاه.

---

## 12. قالب رسالة الكوميت والـPR

```
feat(seo): add keyword map and build-time SEO guards

- add src/keywords.mjs: one primary keyword + intent per route (81 routes)
- add src/keywords.d.mts types; keywordsFor() normalizes Arabic routes
- extend SeoMeta with primaryKeyword / secondaryKeywords / intent
- add scripts/seo-guard.mjs: brand-free titles, keyword-in-title, no duplicates
- wire guards into prerender.mjs and publish-static.mjs (warn mode by default)
- report violations to docs/seo-report.txt (not committed in CI)
- drop the global meta keywords tag (776 pages, no SEO value)

No title, price, policy or PHP change in this PR.
Verified: typecheck, test (484), build (775 routes), git status clean,
Playwright storefront+navigation. Not verified: field impact on rankings.
```

---

## 13. ما لا يُفعل في هذا الـPR (وأسبابه)

| ❌ | السبب |
|---|---|
| تغيير العناوين الـ41 | يُخلط بين «إضافة بيانات» و«تحسين عناوين»، فيتعذّر قياس أثر أي منهما |
| إضافة صفحات للأجهزة (Fire TV/MAG) | PR محتوى منفصل |
| تفعيل `SEO_STRICT` | يُعطّل النشر على 68 مخالفة قائمة |
| تعديل `test-seo.mjs` | لا تلمس اختباراً قائماً؛ الحارس ملف جديد |
| حذف صفحات | قرار المالك (القسم 11) |
| أي تعديل على PHP | خارج النطاق |

---

## 14. بعد الدمج — ما يتوقعه المالك

| المدى | ما سيحدث | ما لن يحدث |
|---|---|---|
| فوراً | لا تغيير في الترتيب. تقرير مخالفات متاح | لا تحسّن |
| 2–4 أسابيع (PR-2) | تحسّن CTR محدود على العناوين المعدّلة | لا قفزة ترتيب |
| 4–12 أسبوعاً | تحسّن ملاءمة `/store` و`/servers` بعد فصل القصد | لا يغني عن ترقية صفحات الدوريات |
| مستمر | الأخطاء الثلاثة (البراند/التنافس/التكرار) لا تعود | لا يرفع موقعاً محتواه ضعيف |

**اصدق المالك:** أكبر مردود في خطة SEO كلها هو **ترقية صفحات الدوريات الثماني** (S7)، لا هذا التكليف. هذا التكليف يمنع الخطأ؛ S7 يجلب الزيارة. نفّذهما بالتوازي.

---

**التوقيع:** إدارة المنتج — 19 أكتوبر 2026
**للأسئلة:** لا تُعدّل في نقطة غامضة. اسأل، ثم اكتب.
