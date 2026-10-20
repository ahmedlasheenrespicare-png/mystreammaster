/* ==========================================================================
   حرّاس SEO وقت البناء — ثلاث قواعد تمنع تكرار أخطاء حوكمة الكلمات
   --------------------------------------------------------------------------
   1) assertKeywordInTitle: الكلمة الأساسية يجب أن تظهر في العنوان.
   2) assertTitleShape: عنوان بلا اسم البراند وطوله ≤ 60 حرفاً.
   3) findDuplicateKeywords: كلمة واحدة لا يملكها مساران (والقصد التجاري
      transactional لا يتكرر على كلمتين).

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

/** عنوان بلا اسم البراند وبطول ≤ 60 حرفاً */
export function assertTitleShape(route, title) {
  const problems = [];
  if (title.includes("ستريم ماستر")) problems.push(`اسم البراند داخل العنوان → ${route} :: ${title}`);
  if (title.length > 60) problems.push(`عنوان ${title.length} حرفاً (> 60) → ${route}`);
  return problems;
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
