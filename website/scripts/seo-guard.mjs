/* ==========================================================================
   حرّاس SEO وقت البناء — قواعد تمنع تكرار أخطاء حوكمة الكلمات
   --------------------------------------------------------------------------
   1) assertKeywordInTitle: الكلمة الأساسية يجب أن تظهر في العنوان (مانع).
   2) assertTitleLength: الطول يُقاس على جزء العنوان قبل لاحقة البراند
      (أول «|») — مخالفة مانعة فوق 60 حرفاً، وتحذير معلوماتي بين 55 و60.
      وجود البراند في نهاية العنوان سياسة تحريرية مسموح بها لا خطأ تقني،
      لذلك لا يُحسب في عداد المخالفات المانعة.
   3) noteBrandInTitle: ملاحظة معلوماتية غير مانعة باسم البراند في العنوان.
   4) findDuplicateKeywords: كلمة واحدة لا يملكها مساران (والقصد التجاري
      transactional لا يتكرر على كلمتين).

   كل الحرّاس تُستدعى على الصفحات القابلة للفهرسة فقط؛ صفحات noindex
   (تفاصيل المباريات غير المؤكدة والصفحات الوظيفية) مستثناة من طرف سكربتات
   البناء لأن عناوينها لا تُعرض في نتائج البحث أصلاً.

   الدوال كلها خالصة: تستقبل المدخلات وتعيد نصوص المخالفات، فتُستدعى من
   prerender.mjs (صفحات React) ومن publish-static.mjs (الصفحات القديمة)
   ومن فحص الخريطة السريع `npm run seo:guard` بلا أي بناء.
   التطبيع العربي يُستورد من src/lib/xtream.mjs — لا دالة تطبيع جديدة هنا.
========================================================================== */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeArabic } from "../src/lib/xtream.mjs";
import { KEYWORDS } from "../src/keywords.mjs";

const norm = (s) => normalizeArabic(s);

/** كلمة أساسية داخل العنوان — بغضّ النظر عن التشكيل وصيغة الحروف */
export function assertKeywordInTitle(route, title, primary) {
  if (!primary) return null;
  if (norm(title).includes(norm(primary))) return null;
  return `العنوان لا يخدم كلمته → ${route}\n  الكلمة: ${primary}\n  العنوان: ${title}`;
}

/** الجزء الدلالي من العنوان قبل لاحقة البراند (أول فاصلة عمودية) */
export function titleWithoutBrand(title) {
  return String(title).split("|")[0].trim();
}

/**
 * طول العنوان بدون اللاحقة:
 * • > 60 حرفاً: مخالفة مانعة تدخل عداد SEO_STRICT.
 * • 55–60 حرفاً: تحذير معلوماتي غير مانع.
 */
export function assertTitleLength(route, title) {
  const core = titleWithoutBrand(title);
  const violations = [];
  const warnings = [];
  if (core.length > 60) {
    violations.push(`عنوان ${core.length} حرفاً بدون اللاحقة (> 60) → ${route}`);
  } else if (core.length > 55) {
    warnings.push(`عنوان ${core.length} حرفاً بدون اللاحقة (55–60) → ${route}`);
  }
  return { violations, warnings };
}

/**
 * ملاحظة سياسة غير مانعة: وجود اسم البراند في العنوان قرار تحريري
 * (قاعدتنا: ≈55 حرفاً بدون اسم الموقع، ووجوده في النهاية مسموح).
 * تُعرض في التقرير تحت «ملاحظات سياسية» ولا تُفشل البناء الصارم.
 */
export function noteBrandInTitle(route, title) {
  if (title.includes("ستريم ماستر")) {
    return `اسم البراند داخل العنوان → ${route} :: ${title}`;
  }
  return null;
}

/** كلمة واحدة لا يملكها مساران — وحراسة إضافية على تكرار القصد التجاري */
export function findDuplicateKeywords(entries) {
  const seen = new Map();
  const dups = [];
  for (const { route, primary, intent } of entries) {
    if (!primary) continue;
    const key = norm(primary);
    if (seen.has(key)) dups.push(`كلمة مكرّرة «${primary}» → ${seen.get(key)} و${route}`);
    else seen.set(key, route);
    if (intent === "transactional") {
      const k2 = `tx:${key}`;
      if (seen.has(k2)) dups.push(`قصد تجاري مكرّر → ${seen.get(k2)} و${route}`);
      else seen.set(k2, route);
    }
  }
  return dups;
}

/* --------------------------------------------------------------------------
   تشغيل مباشر: npm run seo:guard
   فحص سريع لخريطة الكلمات نفسها (تكرار + صحة القصد) بلا اعتماد على dist —
   حارس مستقل يسبق البناء الكامل. مخالفات الخريطة وحدها تُفشل التشغيل دائماً،
   لأن الخريطة مكتوبة باليد ويجب أن تبقى سليمة في كل PR.
-------------------------------------------------------------------------- */

const isMain = (() => {
  if (!process.argv[1]) return false;
  try {
    return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (isMain) {
  const VALID_INTENTS = new Set([
    "transactional",
    "comparison",
    "informational",
    "editorial",
    "legal",
    "navigational",
  ]);
  const violations = [];
  const entries = [];
  for (const [route, entry] of Object.entries(KEYWORDS)) {
    entries.push({ route, primary: entry.primary, intent: entry.intent });
    if (!VALID_INTENTS.has(entry.intent)) {
      violations.push(`قصد غير صالح «${entry.intent}» → ${route}`);
    }
    if (entry.primary !== null && (typeof entry.primary !== "string" || !entry.primary.trim())) {
      violations.push(`primary يجب أن يكون نصاً أو null صراحةً → ${route}`);
    }
  }
  violations.push(...findDuplicateKeywords(entries));

  if (violations.length) {
    console.error(`❌ حارس الكلمات: ${violations.length} مخالفة في src/keywords.mjs`);
    for (const v of violations) console.error(`  • ${v}`);
    process.exit(1);
  }
  console.log(`✅ حارس الكلمات: ${entries.length} مساراً — بلا تكرار وبقيم قصد صالحة`);
  console.log("ℹ️  مخالفات عناوين الصفحات تُرصد وقت البناء في docs/seo-report.txt (تحذير حتى تفعيل SEO_STRICT=1)");
}
