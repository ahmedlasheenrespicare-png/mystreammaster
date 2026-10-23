# دليل المطوّر — كيف يعمل كود Stream Master Pro

**الإصدار:** 1.0 — 19 أكتوبر 2026
**الجمهور:** أي مطوّر جديد ينضم للمشروع، أو مطوّر موجود يريد فهم طبقة لم يعمل عليها من قبل.
**الهدف:** أن تستطيع، بعد قراءة هذا الملف، تشغيل الموقع محلياً، وتعديل صفحة أو سعر أو مقال بأمان، وفهم كيف يصل الكود إلى الإنتاج، وأين الأماكن الخطرة التي لا تُلمس.

---

## 0. قبل أن تبدأ: ثلاث حقائق تحكم كل شيء

1. **الموقع ليس تطبيق React واحداً.** هو خليط مقصود من أربع طبقات: تطبيق React يُرسم مسبقاً، صفحات HTML قديمة مُعاد نشرها عبر قالب موحّد، واجهات PHP تعمل على هوستنجر فقط، وملفات بيانات JSON تُولَّد من Actions.
2. **ملفات HTML في جذر المستودع ليست المصدر.** هي **مخرجات بناء**. أي تعديل مباشر عليها يُمحى في أول `npm run build`. المصدر في `website/src` و`website/legacy`.
3. **ما تراه في المستودع ليس ما يراه الزائر بالضرورة.** النشر يرفع جذر المستودع إلى هوستنجر، لكنه **يستثني `website/**`** — أي أن `website/docs` و`website/src` لا تُنشر. المنشور هو: HTML المولّد + `_assets` + PHP + البيانات.

---

## 1. نظرة معمارية في دقيقة

```
                    ┌──────────────────────────────┐
                    │  website/src  (React + TS)   │
                    │  الصفحات والمكوّنات والبيانات  │
                    └──────────────┬───────────────┘
                                   │ vite build + vite build --ssr
                                   ▼
        ┌──────────────────────────────────────────────────┐
        │  website/dist        (قالب + أصول مُبصَّمة)        │
        │  website/dist-ssr    (entry-server.js للرسم)      │
        └──────────────┬───────────────────────────────────┘
                       │ prerender.mjs  (775 مساراً + 404 + sitemap)
                       ▼
        ┌──────────────────────────────────────────────────┐
        │  website/dist/**  →  جذر المستودع (HTML كامل)     │
        │  + website/legacy/** → جذر المستودع (قالب قديم)   │
        └──────────────┬───────────────────────────────────┘
                       │ GitHub Actions → FTP
                       ▼
        ┌──────────────────────────────────────────────────┐
        │  Hostinger / public_html                          │
        │  HTML  +  PHP (proxy, embed, standings, …)        │
        │  +  sm-data (خارج الويب)                          │
        └──────────────────────────────────────────────────┘
```

**الفكرة الجوهرية:** كل صفحة تُسلَّم **HTML كاملاً** (محتوى داخل `<div id="root">`)، ثم يشتغل React فوقه بالـhydration. لا يوجد خادم Node في الإنتاج، ولا SSR وقت الطلب. هذا يعطي سرعة وفهرسة ممتازة، لكنه يعني أن **أي تغيير في المحتوى يحتاج إعادة بناء ونشر**.

---

## 2. شجرة المجلدات ودور كل طبقة

```
mystreammaster/
├── index.html                 ← مخرج بناء (308KB). لا تعدّله.
├── 404.html                   ← مخرج بناء. لا تعدّله.
├── blog/ matches/ channels/ …  ← مخرجات بناء (React + legacy). لا تعدّلها.
├── _assets/
│   ├── redesign/              ← أصول Vite المُبصَّمة. تُحذف وتُعاد في كل بناء.
│   └── storefront.css/js      ← أصول الصفحات القديمة (ثابتة، تُعدَّل يدوياً).
├── images/                    ← صور الموقع المنشور (105MB).
├── *.php                      ← واجهات الإنتاج (تعمل على هوستنجر فقط).
├── php-lib/                   ← مكتبات PHP مشتركة (غير قابلة للوصول من الويب).
├── admin-dashboard/           ← بوابة إدارة بمصادقة جلسة + لوحة محلية.
├── private/                   ← HTML اللوحة، محمي بـ.htaccess.
├── .htaccess / _headers       ← الأمان والتوجيه والتخزين المؤقت.
├── sitemap.xml / sitemap-0.xml / sitemap-index.xml
├── stream-embed.conf          ← قاعدة نفق المشغّل (حسّاس — يجب حجبه).
├── affiliates.json / clicks.json / allowed-domains.txt
│
└── website/                   ← المصدر (لا يُنشر)
    ├── index.html             ← قالب Vite (5KB) — الهيد الأساسي فقط.
    ├── src/
    │   ├── entry-client.tsx   ← hydrate أو createRoot + تسجيل SW.
    │   ├── entry-server.tsx   ← getAllRoutes + renderPage (وقت البناء).
    │   ├── App.tsx            ← الموجّه الفعلي (switch على المسار).
    │   ├── router.tsx         ← موجّه يدوي بلا مكتبات + اعتراض النقر.
    │   ├── seo.ts             ← مصدر SEO الوحيد (≈2000 سطر).
    │   ├── config.ts          ← الهوية، واتساب، PROXY_BASE، to()، absolute().
    │   ├── site.mjs           ← النطاق والبريد (يُستورد من Node وVite).
    │   ├── data.ts            ← الباقات، العملات، المدد، الأسئلة.
    │   ├── cart-storage.ts    ← قراءة/كتابة السلة مع إعادة تسعير.
    │   ├── hls.ts / mpegts.ts ← تحميل المشغّلات عند الطلب.
    │   ├── pages/             ← 17 صفحة React.
    │   ├── components/        ← 51 مكوّناً (أكبرها XtreamPlayer 2830 سطراً).
    │   ├── content/           ← كل المحتوى المنظّم (مقالات، بطولات، مباريات…).
    │   └── lib/               ← منطق خالص .mjs قابل للاختبار في Node.
    ├── legacy/                ← 32 صفحة HTML قديمة تُنشر عبر قالب موحّد.
    ├── scripts/               ← 30 سكربت اختبار + البناء والنشر والجلب.
    ├── tests/                 ← 28 ملف Playwright.
    ├── public/                ← يُنسخ كما هو إلى dist (صور، sw.js، manifest…).
    └── docs/                  ← وثائق داخلية. لا تُنشر.
```

### 2.1 لماذا `.mjs` وليس `.ts` في `src/lib`؟

لأن نفس الملف يُستورد من ثلاثة أماكن: تطبيق React (Vite)، سكربتات البناء (Node مباشرة)، واختبارات `node --test`. لو كُتب TypeScript لاحتجنا إلى خطوة ترجمة إضافية. لذلك المنطق الخالص يُكتب `.mjs` مع ملف `.d.mts` مجاور للأنواع، ويبقى `.tsx` للواجهة فقط.

---

## 3. خط الأنابيب: من المصدر إلى الإنتاج

### 3.1 الأمر الواحد

```bash
npm run build        # من جذر المستودع
```

وهو يفوّض إلى `website` وينفّذ أربع مراحل متتابعة:

```json
"build": "npm run build:client && npm run build:ssr && node scripts/prerender.mjs && node scripts/publish-static.mjs"
```

### 3.2 المرحلة 1 — `build:client` (Vite)

- المدخل: `website/index.html` + `src/entry-client.tsx`.
- المخرج: `website/dist/` يحتوي `index.html` (القالب بعد التجميع) و`_assets/redesign/*` بأسماء مُبصَّمة (hash).
- التقسيم: `vendor-react` و`vendor-react-dom` منفصلان لتخزين مؤقت أفضل.
- `assetsDir: "_assets/redesign"` — لا تغيّره دون تحديث كل المراجع.

### 3.3 المرحلة 2 — `build:ssr`

- يبني `src/entry-server.tsx` إلى `website/dist-ssr/entry-server.js`.
- هذا الملف يُصدّر: `getAllRoutes()`، `renderPage(path)`، `renderTree(path)`، ودوال SEO للصفحات القديمة.
- **لا يُنشر**؛ يُستخدم وقت البناء والاختبارات فقط.

### 3.4 المرحلة 3 — `scripts/prerender.mjs`

هذه أهم مرحلة. ما تفعله بالترتيب:

1. تقرأ `dist/index.html` كقالب.
2. تستورد `dist-ssr/entry-server.js` وتنادي `getAllRoutes()`.
3. لكل مسار (حالياً **775**):
   - `renderPage(route)` يعيد `{ html, seo }`.
   - `applyHead()` يستبدل في القالب: `<title>`، الوصف، canonical، كل وسوم OG/Twitter، `robots`، `theme-color` إن وُجد، وروابط `hreflang`، ويضيف JSON-LD خاصاً بالصفحة.
   - يحقن HTML داخل `<div id="root"></div>`.
   - مسارات `/cart` و`/__notfound__` تُحذف منها **إعلانات AdSense** فقط (يبقى GA4).
   - المسارات `/en*` تُحوَّل إلى `lang="en" dir="ltr"`.
   - يكتب `dist/<route>/index.html`.
4. يكتب `dist/404.html` بـ`noindex, follow`.
5. يكتب `dist/sitemap.xml` من المسارات التي لا يبدأ `robots` الخاص بها بـ`noindex`.

**نتيجة مهمة:** الصفحة الرئيسية المنشورة 308KB لأن كل نصها داخل HTML. هذا مقصود: الزائر يرى المحتوى قبل تحميل أي JS.

### 3.5 المرحلة 4 — `scripts/publish-static.mjs`

1. يحذف `_assets/redesign` القديم بالكامل (لا تضع فيه شيئاً يدوياً أبداً).
2. ينسخ كل `website/dist/**` إلى **جذر المستودع**.
3. يعالج `website/legacy/**` بـCheerio:
   - يأخذ `<main>` (أو كل محتوى `<body>` للصفحات المستقلة).
   - يحذف الهيدر والفوتر القديمين.
   - يضيف هيدر وفوتر موحّدين من `scripts/legacy-shell.mjs` (يقرأ التنقل من `src/navigation.mjs`).
   - يحقن الرسوم والجداول والتشكيلات من ملفات JSON (`fixture-charts`, `fixture-standings`, `fixture-lineups`, تقارير المباريات).
   - يطبّق SEO المركزي على صفحات التحليل فقط عبر `getLegacyAnalysisSeo`.
   - يبقي `<h1>` واحداً ويهبط الباقي إلى `<h2>`.
   - يضيف `storefront.css/js` إلى `<head>`.
4. يكتب `sitemap-index.xml` الذي يجمع `sitemap-0.xml` (القديم) و`sitemap.xml` (المولّد).

### 3.6 ملاحظة الحتمية

البناء **حتمي**: بعد `npm run build` على شجرة نظيفة، يجب أن يبقى `git status` نظيفاً. إن ظهرت فروقات في HTML فمعناه أن هناك مصدراً غير مستقر (تاريخ، ترتيب عشوائي، بيانات متغيرة). لا تتجاهل هذا — هو أفضل كاشف لتسرّب عدم الحتمية.

---

## 4. التوجيه والرسم

### 4.1 الموجّه (`src/router.tsx`)

مكتوب يدوياً، بلا React Router. السبب: يعمل في Node والمتصفح بنفس الكود، ويُبقي الروابط `<a href>` حقيقية في HTML.

- `normalizePath()`: يفك ترميز `decodeURI` (مهم للسلاجات العربية)، يزيل `BASE` والشرطة الأخيرة و`index.html`.
- `APP_PATHS`: مجموعة كل المسارات التي يتولاها React. **أي مسار غير موجود فيها يؤدي إلى تحميل صفحة كاملة** (وهذا مقصود للصفحات القديمة).
- اعتراض النقر: يمنع إعادة التحميل فقط للمسارات الداخلية الموجودة في `APP_PATHS`، ويترك `_blank` و`mailto` و`tel` وCtrl/Cmd.
- التعامل مع المراسي (`#pricing`) ذكي: من صفحة أخرى ينتقل للرئيسية ثم يمرّر.

### 4.2 `App.tsx` هو جدول التوجيه الحقيقي

لا يوجد ملف routes. الشروط مرتبة، والأولوية مهمة:

```
/en            → EnHomePage
/en/{plan}     → EnPlanPage
/en/faq        → EnFaqPage
/              → HomePage
/store|/servers→ Pricing (+ServersComparison)
/faq /trial /cart
/matches/{league}/{match} → MatchCenterPage   ← قبل /matches
/match-center
/matches/{league}          → LeagueLandingPage
/world-cup-2026/{team}     → TeamLandingPage
/matches                   → MatchesPage
/channels/{cat}            → ChannelCategoryPage
/channels /blog /blog/{slug}
/{nova|istar|moka}         → PlanPage
أي شيء آخر → NotFoundPage
```

**الخطر الأول للمطوّر الجديد:** إضافة صفحة في `App.tsx` فقط. النتيجة: تعمل محلياً بالتنقل الداخلي، لكنها **غير موجودة في البناء المسبق** (لأن `getAllRoutes` لا يعرفها) و`noindex` غير مضبوط. لذلك:

### 4.3 إضافة مسار جديد — القائمة الكاملة (5 أماكن)

1. أنشئ `src/pages/MyPage.tsx`.
2. أضف الحالة في `App.tsx` (import + شرط).
3. أضف المسار في `src/entry-server.tsx` داخل `getAllRoutes()`.
4. أضف المسار في `src/router.tsx` داخل `APP_PATHS`.
5. أضف حالة في `src/seo.ts` داخل `getSeo()` (title, description, canonical, robots, ogImage).
6. (إن كان له ظهور) أضف رابطه في `src/navigation.mjs`.
7. `npm run build` ثم تحقق من `dist/<route>/index.html` ومن `dist/sitemap.xml`.

---

## 5. مصدر الحقيقة: أين تعدّل ماذا؟

| ما تريد تعديله | الملف الصحيح | ملاحظات |
|---|---|---|
| اسم البراند، واتساب، `PROXY_BASE` | `src/config.ts` | النطاق والبريد من `src/site.mjs` |
| النطاق أو بريد الدعم | `src/site.mjs` | يُستخدم في Node وVite؛ لا تكرره يدوياً |
| أسعار الباقات والعملات | `src/data.ts` | `PRICING_PLANS` و`CURRENCIES` |
| المدة المتاحة | `src/data.ts` → `AVAILABLE_DURATIONS` | حالياً `["12"]` فقط |
| مقال مدونة جديد | `src/content/posts.ts` أو `guide-posts.ts` | يُضاف تلقائياً للمسارات والفهرس وsitemap |
| بطولة أو منتخب | `src/content/competitions.ts` | يغذّي `landingRoutes()` |
| تصنيف قنوات | `src/content/channel-categories.ts` + `navigation.mjs` | |
| مباراة في مركز المباراة | `src/content/match-center.mjs` (+ ملفات اللغة) | له اختبارات صارمة |
| عناوين SEO | `src/seo.ts` | لا تكتب `title` داخل المكوّن |
| روابط الهيدر | `src/navigation.mjs` | يغذّي React والقديم معاً |
| صفحة قديمة | `website/legacy/<path>/index.html` | الهيدر/الفوتر يُولَّدان آلياً |
| أصول الصفحات القديمة | `_assets/storefront.css/js` في الجذر | ليست مخرجات Vite |
| الصور | `images/` في الجذر + `website/public/images` | انتبه للتكرار (انظر الديون) |
| نص سياسة/شروط | `website/legacy/terms|refund|privacy/index.html` | ثم أعد البناء |

### 5.1 إضافة مقال

```ts
// src/content/posts.ts
{
  slug: "my-new-post",
  title: "…",
  description: "…",
  date: "2026-10-19",
  readingMinutes: 6,
  category: "دليل المشتري",
  intro: "…",
  sections: [{ heading: "…", paragraphs: ["…"] }],
  faq: [{ q: "…", a: "…" }],
}
```

لا حاجة لإضافة مسار يدوياً — `getAllRoutes()` يبنيها من `BLOG_POSTS`. لكن **أعد البناء** وتأكد من ظهورها في `/blog/` وفي `sitemap.xml`.

### 5.2 إضافة صفحة قديمة (legacy)

- ضع الملف في `website/legacy/<slug>/index.html` بزر `<main>`.
- الهيدر والفوتر سيُستبدلان تلقائياً؛ لا تعتمد على أي منهما.
- إن كانت الصفحة **يجب أن تُنشر بلا قالب** (مثل `player.html`)، أضفها إلى `STANDALONE_PAGES` في `publish-static.mjs`.
- إن كانت صفحة تحليل رياضي، أضف SEO لها في `getLegacyAnalysisSeo` وإلا ستفشل عملية النشر (البناء يرمي خطأً).

---

## 6. طبقة SEO

### 6.1 مصدر واحد

`src/seo.ts` هو المرجع. `getSeo(path)` ترجع كائناً واحداً يستخدمه:

- `prerender.mjs` لكتابة وسوم `<head>` في HTML.
- `applySeoToDocument(path)` لتحديث الوسوم أثناء التنقل الداخلي.

لذلك لا يوجد تعارض بين ما يراه جوجل وما يراه الزائر بعد التنقل. **لا تكتب وسوم SEO داخل المكوّنات.**

### 6.2 الصور والأبعاد

`OG_BY_ROUTE` يربط كل مسار بصورة في `/images/og/*.png` بأبعاد ثابتة **1200×630**. أي صورة جديدة يجب أن تلتزم بهذه الأبعاد، وإلا ستنكسر معاينة واتساب/تويتر.

### 6.3 hreflang والنسخة الإنجليزية

الصفحات التجارية فقط لها نسخة إنجليزية (`/en`, `/en/nova|istar|moka`, `/en/faq`). `seo.alternates` يضيف `hreflang`، و`prerender` يبدّل `og:locale`. الصفحات القانونية عربية فقط — لا تضف `hreflang` لها.

### 6.4 sitemap والفهرسة

- `sitemap.xml` يُولَّد من المسارات التي لا تبدأ بـ`noindex`.
- `sitemap-0.xml` قديم وثابت ويُدار يدوياً — إذا أضفت صفحة قديمة دائمة، أضفها هناك أيضاً.
- `sitemap-index.xml` يجمع الاثنين.
- الصفحات المحجوبة: `/status/`، `/search/`، `/player.html`، `/embed.php`، `/proxy.php`، `/admin-dashboard/`، `/cart/`، `/404`.

**قاعدة:** أي صفحة جديدة يجب أن تحدد `robots` صراحة. إذا لم تحدد، قد تُفهرس بالخطأ.

---

## 7. إدارة الحالة في المتصفح

لا Redux ولا Zustand. الحالة في `App.tsx` عبر `useState`، وتُمرَّر props.

| المفتاح | المحتوى | من يكتبه |
|---|---|---|
| `stream-master-cart` | عناصر السلة | `cart-storage.ts` |
| `smp-xtream-accounts` | حسابات Xtream (حتى 8) — **نص صريح** | `lib/xtream.mjs` |
| `smp-xtream-account` | حساب واحد (توافق قديم) | `lib/xtream.mjs` |
| `smp-xtream-favorites` / `-recents` | مفضلة وسجل | `lib/xtream.mjs` |
| `smp-proxy` | قاعدة الوسيط المختارة | `lib/xtream.mjs` |
| `admin-site-settings` وغيرها | إعدادات اللوحة | `admin-dashboard` |

### 7.1 السلة — درس مهم

`readCart()` **لا يثق** بالمخزون: يتحقق من أن الباقة موجودة في الكتالوج، ويعيد حساب السعر من `PRICING_PLANS`، ويحدّ الكمية بـ20 وعناصر السلة بـ100. هذا يمنع التلاعب بالسعر من DevTools. أي إضافة لحقول جديدة يجب أن تمر بنفس المنطق.

### 7.2 العملة

العملة الافتراضية **USD**. التحويل بأسعار ثابتة في `CURRENCIES`، وليست لحظية. لا تُضف API أسعار صرف دون مراجعة أمنية (CSP يقيد `connect-src`).

### 7.3 بيانات Xtream

`ACCOUNTS_KEY` تُخزَّن في `localStorage` بنص صريح — هذا تصميم حالي وليس خطأً عرضياً، لكنه يجعل أي XSS كارثة. راجع القسم 9.1.

---

## 8. المشغّل والوسائط

### 8.1 التحميل الكسول

`src/hls.ts` و`src/mpegts.ts` لا تُحمّلان المكتبتين (≈460KB) إلا عند أول تشغيل. النتيجة مخزّنة في الذاكرة، فأول تشغيل أبطأ قليلاً والباقي فوري. لا تستورد `hls.js` مباشرة في أي مكوّن.

### 8.2 سلسلة الوسيط

1. `resolveWorkerBase()` تختار قاعدة من: `?proxy=` في الرابط، أو جلسة `smp-proxy`، أو `PROXY_BASE`.
2. `getProxyUrl()` تبني `/proxy.php?url=…` أو رابط Worker.
3. `withUserAgentPreset()` تضيف بصمة Smarters/VLC عند الحاجة (`smpua`).
4. `addUaVariants()` تولّد بدائل عند فشل الصيغة الأولى.
5. التشخيص: `buildDiagReport()` + `createShareToken()` ينتجان رمزاً يبدأ بـ`SMP1.` **لا يحتوي كلمة المرور** — هذا ما يُطلب من العميل في الدعم.

### 8.3 طبقة PHP — الخريطة

| الملف | السطور | الدور | ملاحظة للمطوّر |
|---|---:|---|---|
| `proxy.php` | 588 | وسيط HLS/Xtream | **أخطر ملف في المشروع** — انظر 9.1 |
| `embed.php` | 480 | يخدم `/player/…` من نفق خارجي | يطبّق allowlist + SSRF + CSP |
| `standings.php` | 415 | ترتيب البطولات (ESPN + Highlightly) | قراءة فقط، بلا أسرار |
| `scoreboard.php` | 394 | جدول المباريات + تخزين مؤقت | ESPN + TheSportsDB |
| `match-center.php` | 1559 | تفاصيل المباراة والتشكيلات | يشترك في مخزن ESPN |
| `go.php` | 70 | تحويل روابط الشركاء + تتبع | whitelist من `affiliates.json` |
| `admin-dashboard/index.php` | 144 | بوابة إدارة بجلسة | كلمة المرور مجزّأة PBKDF2 |
| `php-lib/*` | — | مكتبات مشتركة | محجوبة عن الويب عبر `.htaccess` |

### 8.4 كيف يعمل `/player/`

```
/player.html
  └─ <iframe src="/player/five_channels_full.html">
       └─ .htaccess: ^player/(.*)$ → embed.php?u=player&p=/$1
            └─ embed.php يقرأ الأصل من stream-embed.conf
                 └─ يتحقق من allowed-domains.txt + SSRF
                      └─ يعيد كتابة HTML ويضمّنه
```

- الرابط الحقيقي للنفق **لا يظهر في مصدر الصفحة**.
- `website/scripts/embed-rewrite.mjs` نسخة JS مطابقة لمنطق `embed.php`، واختبار `test-embed-php.mjs` يضمن تطابقهما. أي تعديل في أحدهما يجب أن يقابله تعديل في الآخر.
- `stream-embed.conf` **يجب ألا يكون قابلاً للتنزيل**. حالياً هو في جذر النشر — دين أمني مفتوح.

### 8.5 Cloudflare Worker

`website/proxy/worker.js` نسخة العامل (24KB) تُنشر منفصلة على Cloudflare، و`PROXY_BASE` في `config.ts` يشير إليها. لا تخلط بينها وبين `proxy.php`: الاثنان يفعلان شيئاً مشابهاً بأساليب مختلفة، والـPHP هو المسار الافتراضي في الإنتاج.

---

## 9. الأماكن الخطرة التي يجب أن تعرفها قبل أي تعديل

### 9.1 `proxy.php` — الأولوية القصوى

الحالة الحالية:

- يقبل `?url=` لأي رابط عام ويعيد المحتوى بنوع MIME الأصلي.
- `allowed_domains()` **موجودة لكنها غير مُنفَّذة**.
- التحقق من TLS معطّل في السطور **363–364** (`SSL_VERIFYPEER=false`, `VERIFYHOST=0`).
- CSP في `_headers`/`.htaccess` يسمح `script-src 'self' 'unsafe-inline'`.

الأثر: صفحة يمكنها جلب HTML/JS من مصدر خارجي وتشغيله في **نفس أصل الموقع**، ثم قراءة `localStorage['smp-xtream-accounts']` (بيانات Xtream بنص صريح) أو استغلال جلسة الأدمن.

ما يجب فعله (بالتنسيق مع المالك قبل النشر):

1. تطبيق قائمة النطاقات فعلياً.
2. إعادة التحقق من TLS.
3. حصر أنواع المحتوى المسموحة (قوائم HLS/TS/JSON فقط، لا `text/html`).
4. إضافة `X-Content-Type-Options: nosniff` وCSP صارمة على استجابة الوسيط.
5. فصل نطاق الوسيط عن نطاق الموقع إن أمكن.

### 9.2 `stream-embed.conf` و`affiliates.json` و`clicks.json`

كلها في جذر النشر بلا حجب في `.htaccess`. افحصها بحذر: `curl https://streammasterstore.com/stream-embed.conf`.
الحل المقترح: نقلها خارج `public_html` أو حجبها بـ`<Files>`.

### 9.3 لوحة التحكم ليست CMS

`admin-dashboard/index.php` يصادق على الخادم بجلسة، لكن الواجهة (`private/_dashboard.html`) تخزّن الإعدادات والمقالات في `localStorage`. أي تعديل فيها **لا يصل للموقع**. لا تبنِ عليها ميزة، ولا تعد المستخدم بأنها تنشر.

### 9.4 الصفحات المولّدة

لا تعدّل: `index.html` في الجذر، `blog/**`، `matches/**`، `channels/**`، `world-cup-2026/**`، `_assets/redesign/**`، `sitemap.xml`، `404.html`. كلها تُستبدل في البناء.

### 9.5 روابط `arena.ai`

`CartModal.tsx` و`TrialModal.tsx` تحتوي روابط إلى `https://arena.ai/terms` و`/refund` — يجب استبدالها بـ`/terms/` و`/refund/` الداخليين. هذه ليست صفحة المشروع.

---

## 10. بيانات المباريات: كيف تصل إلى الصفحة

هناك **مسارَان** يجب التمييز بينهما:

### 10.1 مسار البناء (ثابت)

1. `src/content/match-center.mjs` (29 مباراة موثقة) + ملفات اللغة (`-spanish`, `-italian`, `-english-followup`).
2. `src/content/fixtures-archive/<league>/*.json` (10 بطولات) — تُجلب من ESPN عبر `fetch-fixtures-archive.mjs`.
3. `prerender` يبني صفحات `/matches/…`.
4. `publish-static` يحقن الجداول والتشكيلات من snapshots في صفحات التحليل القديمة.

### 10.2 مسار التشغيل (حي)

- `scoreboard.php` يجلب من ESPN (أيام مفردة) وTheSportsDB.
- `match-center.php` يضيف التفاصيل والتشكيلات.
- `standings.php` يجلب الترتيب.
- التخزين في `SM_DATA_DIR` **خارج جذر الويب**، وإلا فشل بأمان إلى مجلد مؤقت.

### 10.3 قواعد المصادر

- لا تضف مصدراً جديداً بلا `probe` موثّق. القاعدة في المشروع: كل مصدر يُعتمد بعد تقرير يثبت معرّف البطولة وعدد الفرق (`docs/standings-probe-report.json` نموذج).
- لا تضع مفاتيح API في JS أو في HTML — فقط في `secrets` أو متغيرات البيئة على الخادم.
- لا تجعل `MC_MATCHES` (جدول الربط) مفتوحاً للزوار.

### 10.4 Actions المرتبطة

| Workflow | الدور |
|---|---|
| `verify.yml` | على PR و`arena/**`: فحص تعارضات، اختبارات، بناء، Playwright |
| `deploy.yml` | على `main`: بناء ثم FTP |
| `fixtures-archive.yml` | يومياً 03:17 UTC + يدوي |
| `standings-snapshot.yml` | لقطة ترتيب |

`deploy.yml` يستخدم `concurrency` مع `cancel-in-progress: false` وينشر **آخر `main`** لا الكوميت الذي أطلق الحدث. السبب موثّق: حدث مكرر قديم حدث في 2026-10-14 وأعاد إصداراً قديماً فوق الأحدث. **لا تزل هذا السلوك.**

---

## 11. الاختبارات

### 11.1 طبقتان

| النوع | الأمر | العدد | ماذا يغطي |
|---|---|---:|---|
| Node | `npm test` | 30 ملفاً / 484 حالة | منطق `.mjs`، PHP عبر قراءة المصدر، SEO، المباريات، الوسيط |
| Playwright | `npm run test:ui` | 28 ملفاً / 167 اختباراً | التنقل، المتجر، المشغّل، صفحات التحليل، الاستجابة |

`npm test` يشغّل `pretest` أولاً: `npm run build:ssr`. **بدون dist-ssr ستفشل الاختبارات** لأنها تستورد `entry-server.js`.

### 11.2 التشغيل المستهدف (مهم)

تشغيل كل Playwright مرة واحدة بطيء جداً (١٤ دقيقة+) لأن `workers: 1` واللقطات كبيرة. شغّل ملفاً ملفاً:

```bash
npx playwright test tests/storefront.spec.ts
npx playwright test tests/navigation.spec.ts tests/watch-guide.spec.ts
```

### 11.3 قبل أي PR

```bash
npm run typecheck
npm test
npm run build
git status          # يجب أن يكون نظيفاً
npx playwright test tests/<الملف المتأثر>.spec.ts
```

### 11.4 `tests/source-store`

مجموعة PHP/WASM منفصلة (`node run.mjs`) تختبر منطق PHP بلا PHP مثبّت. لا تعمل في كل بيئة (تحتاج حزمة `@php-wasm` وcommit معيّن). لا تعتمد عليها وحدها.

---

## 12. التشغيل المحلي

### 12.1 المتطلبات

- Node **22** (مطابق لـCI).
- لا حاجة لـPHP محلياً؛ الواجهات PHP لن تعمل.
- مساحة كافية: `node_modules` + `images` كبيرة.

### 12.2 الخطوات

```bash
git clone …
cd mystreammaster
npm run setup        # = npm ci --prefix website
npm run dev          # Vite على 0.0.0.0:5173
```

للمعاينة على الشجرة المنشورة فعلاً (بما فيها legacy):

```bash
npm run preview      # node website/scripts/serve.mjs على :3000
```

`serve.mjs` يخدم **جذر المستودع** لا `dist`، ويحجب `.git` و`website` و`admin-dashboard`، ويعيد **501** لأي `.php` أو `/player/`. هذا مقصود: لا يوجد PHP في المعاينة.

### 12.3 ماذا يعمل محلياً؟

| يعمل | لا يعمل |
|---|---|
| كل صفحات React والبناء المسبق | `proxy.php` |
| الصفحات القديمة | `embed.php` و`/player/` |
| السلة، المشغّل بواجهته | `standings.php` و`scoreboard.php` |
| الاختبارات | تسجيل الدخول للوحة |
| SEO وsitemap | أي شيء يحتاج نفق المشغّل |

---

## 13. النشر

### 13.1 ما الذي يُرفع؟

كل جذر المستودع ما عدا:

```
.git*  .github/**  website/**  tests/**  node_modules/**
package*.json  README.md  .nojekyll  clicks.json  lib/**
```

**نتيجة يجب أن تعرفها:** `website/docs` لا تُنشر. `README.md` لا يُنشر. `clicks.json` لا يُرفع (يُنشأ على الخادم). `lib/**` مستثنى لأنه مسار عالق على هوستنجر، والمكتبات في `php-lib`.

### 13.2 المخاطر

- **لا تراجع تلقائي**: FTP يرفع فوق الملفات. إن نشرت بناءً سيئاً، فالإصلاح بنشر بناء جيد.
- **لا نشر ذري**: أثناء الرفع قد يرى الزائر خليطاً. لذلك لا تنشر في أوقات الذروة.
- **`cancel-in-progress: false`** مقصود لمنع نشر نصف اكتمل.
- **التوقيت**: النشر يستغرق دقائق، و`verify` يجب أن ينجح أولاً.

### 13.3 ما لا يجب فعله

- لا تدفع إلى `main` مباشرة إذا كان بإمكانك فتح PR.
- لا تعِد نشر كوميت قديم.
- لا تحذف `.htaccess` أو `_headers`.
- لا ترفع `website/` إلى `public_html`.

---

## 14. متغيرات البيئة والإعدادات

| المتغير | أين | الدور |
|---|---|---|
| `VITE_SITE_URL` | بناء | يغيّر النطاق في canonical/sitemap |
| `PORT` | `serve.mjs` | منفذ المعاينة (افتراضي 3000) |
| `SM_DATA_DIR` | `.htaccess` على الخادم | مجلد البيانات الخاص خارج الويب |
| `HIGHLIGHTLY_API_KEY` | GitHub Secrets | مصدر ترتيب اختياري |
| `FIXTURES_SOURCES_APPROVED` | GitHub Variables | بوابة اعتماد المصادر |
| `FIXTURES_STATISTICS` | GitHub Variables | تشغيل الإحصاءات |
| `PREVIEW_URL` | Playwright | عنوان الاختبار |
| `FTP_HOST` / `FTP_USER` / `FTP_PASS` | GitHub Secrets | النشر |

**لا تضع أي مفتاح في `config.ts` أو في HTML.** كل ما يصل للمتصفح يعتبر عاماً.

---

## 15. أخطاء شائعة وكيف تتجنبها

| الخطأ | النتيجة | الصواب |
|---|---|---|
| تعديل `index.html` في الجذر | يُمحى في أول بناء | عدّل `src/pages/HomePage.tsx` |
| إضافة صفحة في `App.tsx` فقط | لا تُبنى ولا تُفهرس | أضفها في `getAllRoutes` و`APP_PATHS` و`getSeo` |
| كتابة `<title>` في مكوّن | يتعارض مع prerender | أضف الحالة في `seo.ts` |
| تعديل `_assets/redesign` | يُحذف في البناء | عدّل `src` وأعد البناء |
| نسيان `build:ssr` قبل الاختبارات | فشل الاستيراد | `npm test` يفعلها تلقائياً، أو شغّلها يدوياً |
| إضافة صورة OG بأبعاد خاطئة | معاينة مشوّهة | 1200×630 فقط |
| إضافة صفحة بلا `robots` | فهرسة غير مقصودة | حدّد `index` أو `noindex` صراحة |
| تعديل `embed.php` وحده | تتعارض النسختان | عدّل `embed-rewrite.mjs` معه واختبر |
| إضافة مسار `/player/` جديد | يمر عبر `embed.php` | افهم القاعدة في `.htaccess` أولاً |
| نشر صفحة قديمة بلا `<main>` | القالب يلفّ كل `<body>` | استخدم `<main>` أو أضفها لـ`STANDALONE_PAGES` |
| إضافة مصدر بيانات بلا `probe` | رفض في المراجعة | اتبع `docs/standings-probe-report.json` |
| تشغيل Playwright كاملاً | ١٤ دقيقة وبلا ملخص | شغّل ملفاً ملفاً |

---

## 16. أول أسبوع للمطوّر الجديد

**اليوم 1**

- اقرأ هذا الملف + `README.md` (القسم المعماري).
- شغّل `npm run setup && npm run dev` وتصفّح كل مسار.
- `npm run build` ثم `npm run preview` وقارن.

**اليوم 2**

- اقرأ `App.tsx` و`router.tsx` و`entry-server.tsx`.
- اتبع مسار `/nova` من `data.ts` إلى HTML النهائي.
- افحص `dist/nova/index.html` و`sitemap.xml`.

**اليوم 3**

- اقرأ `seo.ts` (الدالة `getSeo` فقط) و`prerender.mjs`.
- أضف صفحة تجريبية وامرّ بها الأماكن الخمسة.
- تحقق من `noindex` ومن غيابها/وجودها في sitemap.

**اليوم 4**

- اقرأ `proxy.php` و`embed.php` مع أقسام 8 و9.
- شغّل `test-proxy-php.mjs` و`test-embed-php.mjs`.
- لا تعدّل شيئاً قبل مناقشة خطة إصلاح proxy.

**اليوم 5**

- اختر ديناً تقنياً من القسم 17 وأصلحه في فرع.
- شغّل `typecheck` + `test` + `build` + ملف Playwright واحد.
- افتح PR واكتب ما تحققت منه وما لم تتحقق منه.

---

## 17. الديون التقنية — مرتّبة بالأولوية

### P0 (لا تُؤجَّل)

1. `proxy.php`: تطبيق allowlist + إعادة TLS + حصر أنواع المحتوى.
2. حجب `stream-embed.conf` و`affiliates.json` و`clicks.json`.
3. إزالة روابط `arena.ai` من `CartModal`/`TrialModal`.
4. مراجعة الادعاءات التسويقية غير القابلة للإثبات (تقييمات، عدد مستخدمين، ثبات 99.9%).
5. إصلاح أو حجب `/status/` لأنها ليست مراقبة حية.

### P1

6. توحيد تجربة التفعيل: FAQ يعد ببريد و7 طرق دفع غير موجودة.
7. لوحة تحكم حقيقية أو توضيح أنها معاينة محلية.
8. إصلاح البحث (10 صفحات فقط) أو حذفه.
9. إضافة الصور المفقودة (`best-iptv.webp` ×3).
10. تحديث أرقام `README.md` القديمة.
11. مراجعة الخصوصية مقابل ما يُحمَّل فعلاً (OneSignal غير محمّلة، GA/AdSense بلا موافقة).

### P2

12. إزالة تكرار الصور (~100MB بين `images/` و`website/public/images`).
13. إضافة ESLint/Prettier و`npm audit` إلى CI.
14. تثبيت Actions بـSHA بدل tags.
15. رفع `workers` في Playwright أو تقسيم المجموعة.
16. حذف `match-analysis` القديم أو تحويله.
17. إصلاح canonical لصفحة 404.
18. إضافة CMP/موافقة للإعلانات.

---

## 18. قائمة تحقق قبل فتح PR

- [ ] `npm run typecheck` نظيف.
- [ ] `npm test` كامل (484 حالة، لا فشل).
- [ ] `npm run build` نجح و775 مساراً.
- [ ] `git status` نظيف بعد البناء.
- [ ] لا تعديل على ملفات مولّدة.
- [ ] المسارات الجديدة مضافة في الأماكن الخمسة.
- [ ] `robots` محدد لكل صفحة جديدة.
- [ ] `sitemap.xml` يحتوي الصفحات القابلة للفهرسة فقط.
- [ ] لا أسرار ولا مفاتيح في الكود.
- [ ] لم تُضعف CSP أو تعطّل TLS.
- [ ] اختبار Playwright واحد على الأقل للمسار المتأثر.
- [ ] وصف PR يذكر ما لم تتحقق منه.

---

## 19. استكشاف الأخطاء في الإنتاج

| العَرَض | أول ما تفحصه |
|---|---|
| صفحة 404 بعد النشر | هل المسار في `getAllRoutes`؟ هل `dist/<route>/index.html` موجود؟ |
| صفحة تعمل بالتنقل وتفشل بالتحديث | المسار غير موجود كملف — أعد البناء |
| عنوان/وصف خاطئ في جوجل | `getSeo` ثم `dist/<route>/index.html` |
| صفحة لا تظهر في sitemap | `robots` يبدأ بـ`noindex` |
| القوائم لا تعمل | `proxy.php` أو المصدر أو CSP `connect-src` |
| المشغّل يعطي شاشة بيضاء | `embed.php` + `stream-embed.conf` + حالة النفق |
| الدفع لا يصل | لا يوجد دفع على الموقع — تحقق من رسالة واتساب |
| التفعيل لا يصل بالبريد | غير مفعّل أصلاً — واتساب فقط |
| تعديل في اللوحة لا يظهر | متوقع — اللوحة محلية |
| الصفحات القديمة بلا هيدر | `legacy-shell.mjs` أو غياب `<main>` |

**قاعدة ذهبية:** لا تصلح شيئاً في الإنتاج يدوياً. أي إصلاح يبدأ من المصدر، يمر بالبناء والاختبارات، ثم يُنشر. الإصلاح اليدوي على الخادم سيُمحى في النشر التالي وسيخفي السبب الحقيقي.

---

## خاتمة

هذا المشروع أنضج مما يبدو في واجهته: بناء مسبق حتمي، SEO مركزي، اختبارات كثيرة، وتوثيق داخلي جيد. لكنه يحمل ثلاث نقاط هشّة يجب التعامل معها بجدية: **`proxy.php`**، **الادعاءات التسويقية**، **وأن لوحة التحكم ليست نظام نشر**.

أي سؤال معماري قبل تعديل كبير: اسأل أولاً، ثم عدّل، ثم أثبت بالاختبارات.

— فريق التقنية
