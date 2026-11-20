# قاعدة شريحة الخبر داخل صفحة الخبر (معتمدة 2026-11-07)

القاعدة الدائمة بعد هذا الطلب: **كل خبر في `website/src/content/featured-news.ts` تظهر شريحته داخل صفحته `/news/<slug>/`** بنفس مفردات تذكرة الصفحة الرئيسية:

- شارة التصنيف على الزاوية (ليموني `#d8ff3e`).
- التاريخ أعلى الشريحة، مع شعارَي الفريقين إن وُجدا (`teamBadges`).
- العنوان والوصف كما هما في المصدر (بلا إعادة صياغة).
- النتيجة إن وُجدت (`score`).
- صورة اللاعب أو صوره المقصوصة (`images`) كاملة بلا قصّ (`object-fit: contain`) وبنصها البديل نفسه.

## التنفيذ

| الملف | الدور |
|---|---|
| `website/scripts/inject-news-slides.mjs` | يقرأ `FEATURED_NEWS` من المصدر ويحقن الشريحة في `website/public/news/<slug>/index.html` بين `news-slide:start` و`news-slide:end`، ويستبدل وسم التنسيق `<style id="news-slide-style">` — إعادة التشغيل لا تكرّر شيئاً. |
| `website/scripts/test-news-slides.mjs` | حارس يفشل إذا أُضيف خبر بلا شريحة، أو اختلف العنوان/الوصف/الصورة/النص البديل عن المصدر، أو تكرّرت الشريحة، أو غاب تنسيق الجوال. |
| `website/scripts/rshot-news.mjs` | لقطات تحقّق (سطح مكتب 1200px وجوال 390px) لشريحة أي خبر. |

## الترتيب في البناء

```
npm run build  =  inject-news-slides → build:client → build:ssr → prerender → publish-static
npm test       =  inject-news-slides → build:ssr → node --test ...
```

الحقن قبل `prerender`/`publish-static` حتى تصل الشرائح إلى `website/dist` ثم إلى جذر النشر (`news/<slug>/index.html`).

## إضافة خبر جديد — الخطوات الملزمة

1. اكتب الخبر في `news/<slug>/index.html` المحلي (أو `website/public/news/<slug>/index.html`).
2. أضف مدخله في `featured-news.ts` مع `images` (مسار داخلي + نص بديل عربي وصفي)، و`score`/`teamBadges` عند الحاجة.
3. شغّل `node scripts/inject-news-slides.mjs` (أو `npm run build` — يفعلها تلقائياً).
4. شغّل `npm test` للتأكد من الحارس، ثم لقطة تحقّق عبر `node scripts/rshot-news.mjs <slug>`.

## ضوابط التصميم

- لا حركة إجبارية (`animation`/`@keyframes` ممنوعة داخل الشريحة) — تحترم `prefers-reduced-motion` ضمنياً بعدم وجود حركة.
- لا خطوط خارجية ولا أصول خارجية داخل الشريحة (`https?://` ممنوع) — الصور والشعارات محلية.
- الصور `object-fit: contain` بلا قصّ، مع هالة خفيفة تفصل الشخص عن اللوح الداكن.
- أكثر من صورة: الشريحة تأخذ `news-slide--multi` فتتقاسم الصور العرض بالتساوي بلا تراكب.
- الجوال (≤640px): الصورة أعلى النص، ثم التاريخ، ثم العنوان والوصف — بلا تداخل.
