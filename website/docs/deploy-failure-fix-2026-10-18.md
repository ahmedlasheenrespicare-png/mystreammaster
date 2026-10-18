# تقرير إصلاح عطل النشر — Deploy to Hostinger (18 أكتوبر 2026)

- **التشغيل المتعطل:** [Run 39168620387](https://github.com/ahmedlasheenrespicare-png/mystreammaster/actions/runs/39168620387) — المهمة [Job 117796795270](https://github.com/ahmedlasheenrespicare-png/mystreammaster/actions/runs/39168620387/job/117796795270)
- **مسار العمل:** `Deploy to Hostinger` على فرع `main` عند التصريف `eebef1f` (دمج PR #71)
- **الخطوة الفاشلة:** `npm run typecheck && npm test && npm run build`
- **الأثر:** تعثّر التحقق في أوله ⇒ تخطّي خطوة رفع FTP ⇒ **الإنتاج لم يتحرك**، و`main` في حالة لا تُبنى.
- **الحالة بعد الإصلاح:** `typecheck` ✅ · `467` اختبارًا (`466` ناجحًا / `0` فاشل) ✅ · بناء `677` مسارًا ✅ — والأمر الكامل المُشغَّل في CI يمر من البداية للنهاية.

---

## 1) الظاهر — ماذا فشل بالضبط؟

التسلسل داخل المهمة:

| # | الخطوة | النتيجة |
|---|--------|---------|
| 1–2 | Checkout + التقرير عن الالتزام | ✅ |
| 3–4 | Node 22 + `npm ci` | ✅ |
| 5 | `npm run typecheck && npm test && npm run build` | ❌ **فشل هنا** |
| 6 | رفع FTP إلى Hostinger | ⏭ تُخطّى |
| 7 | تقرير حداثة الأرشيف | ⏭ تُخطّى |

أول أخطاء `tsc` تكشف السبب فورًا:

```
src/components/MatchCenterPanels.tsx(258,1): error TS1185: Merge conflict marker encountered.
src/components/MatchCenterPanels.tsx(259,1): error TS1185: Merge conflict marker encountered.
...
```

أي: **نص علامات تعارض دمج غير محلولة** (`<<<<<<< HEAD` / `=======` / `>>>>>>> c1d9318`) مكتوب حرفياً داخل ملفات المصدر ووصل إلى `main`.

---

## 2) التشخيص

### أ) علامات تعارض في 8 ملفات (27 كتلة)

| الملف | عدد الكتل |
|-------|-----------|
| `website/src/components/MatchCenterPanels.tsx` | 14 |
| `match-center.php` | 5 |
| `website/scripts/test-match-center-lineups.mjs` | 2 |
| `website/scripts/test-match-center-php.mjs` | 2 |
| `website/src/components/MatchCenterAnalysis.tsx` | 1 |
| `website/scripts/test-match-center.mjs` | 1 |
| `website/scripts/test-match-center-analysis.mjs` | 1 |
| `website/scripts/test-match-center-pages.mjs` | 1 |

العلامات تقارن جهة `HEAD` (الكود الحديث لـ PR #67 «المرحلة أ» + إصلاحات PR #71) بجهة `c1d9318` (الكود الأقدم ما قبل «المرحلة أ»).

### ب) ارتجاع (Regression) أعمق من مجرد العلامات

فحص تاريخ `main` كشف أن أول التزام في فرع PR #71 — وهو `21d20f9` (رسالته «Merge pull request #66» لكنه **التزام أحادي الأب** على `ebcca82`) — أعاد بناء دمج قديم بطريقة مكسورة، فبالإضافة إلى ترك العلامات:

- **حُذف من `website/src/lib/match-center.mjs` (~170 سطرًا):** `previewFacts` · `previewPlacement` · `headToHeadSummary` · `possessionSplit` · `pitchCounters` / `PITCH_COUNTERS` · `positionLabelAr` / `PITCH_POSITION_CODES` + مساعداتهما (`normalizeName`, `h2hSide`, `POSITION_LABELS_AR`) + حقلَي `homeTeamId`/`awayTeamId` في صفوف المواجهات، كما حُذفت أنواعها كلها من `match-center.d.mts`.
- **تُراجعت `STAT_GROUPS`** من 6 مجموعات (28 رقماً) إلى 3 مجموعات قديمة.
- **`MatchCenterStatGroups.tsx`:** حُذف شريط الاستحواذ البارز وشعارات الفريقين (`logos`) و«عدّادات» ما يقابلها.
- **`MatchCenterVisuals.tsx`:** حُذفت المعاينة على الملعب (`mc-pitch-preview`) وعدّادات البطاقات/الركنيات وأسماء المراكز بالعربية.
- **`match-center.css`:** حُذفت 99 سطرًا من أنماط «المرحلة أ» (المعاينة على الملعب، شريط الاستحواذ، المجمل، بطاقات التوثيق…).
- **`MatchCenterPage.tsx`:** حُذف استخدام `MatchCenterDocs` (قسم «التوثيق والمراجعة» ببطاقاته).

بينما **بقيت الاختبارات والمكوّنات** (جهة `HEAD` داخل العلامات، وأجزاء سليمة من الملفات) **معتمدة على هذه الدوال** — فحتى لو حُلّت العلامات وحدها، لكانت `typecheck` والاختبارات قد فشلت بـ `TS2305: has no exported member 'previewFacts'` وغيره.

### ج) لماذا لم تُكتشف المشكلة قبل الدمج؟

- فرع PR #71 `arena/fcc467c4` بُني على قاعدة مكسورة (`21d20f9`)، ثم طُوِّر فوقها (إعادة هيكلة التنقل + تبويب التحليل + إصلاحات الاختبارات) دون أن يُلاحَظ وجود العلامات.
- workflow المراجعة `verify.yml` **أُضيف داخل PR #71 نفسه** — أي لم يكن موجوداً قبله ليرفض الفروع المكسورة.
- الدمج إلى `main` (`eebef1f`) نقل الشجرة المعيبة كما هي، و`deploy` المُشغَّل على الدفع هو اكتشفها — بعد فوات الأوان.

---

## 3) السبب الجذري (Root Cause)

**إعادة بناء يدوية/ناقصة لعملية دمج قديمة داخل فرع PR #71:**

1. عمل PR #67 («المرحلة أ» — المعاينة على الملعب، 28 إحصائية، شريط الاستحواذ، `previewFacts` و`previewPlacement` و`headToHeadSummary`…) اكتمل ودُمج في `main` عبر `ebcca82`.
2. فرع PR #71 أُنشئ فوق نسخة **ما قبل** PR #67، ثم أُدخل فيها «دمج» مع `main` (الالتزام `21d20f9`) دون حل التعارضات: رُفعت علامات `<<<<<<<` داخل 8 ملفات، وبقيت أجزاء من الكود القديم أزالت ميزات المرحلة أ من طبقة العقد والمكوّنات.
3. إصلاحات PR #71 اللاحقة (43 اختباراً + TypeScript) عالجت أخطاء هيكلة التنقل الجديدة فقط، ولم تمسّ العلامات ولا الارتجاع.
4. الدمج إلى `main` كسر `typecheck`، فتوقف النشر.

---

## 4) الإصلاح المُنفَّذ

### الخطوة أ — حل 27 كتلة تعارض (8 ملفات) بالاحتفاظ بجهة `HEAD`

المقارنة الآلية أثبتت أن كل ملف محلول يساوي **حرفياً** نسخة `main` السليمة (`ebcca82`) — مضافاً إليها إضافات PR #71 المتعمدة فقط (تبويب التحليل، تحديثات تعداد المسارات 620→624، ربط المباريات بلا معرّف ESPN…):

- `match-center.php` → نسخة «المرحلة أ»: خريطة `MC_STAT_LABELS` بـ28 اسماً + موحّد النسب `mc_pct` + `homeTeamId`/`awayTeamId` في المواجهات.
- `MatchCenterPanels.tsx` → اللوحات الحديثة (`previewFacts`, `FormSide` من `MatchCenterForm`، مجمل المواجهات، بوابة `lineupPitchSides`) + تسجيل `AnalysisPanel` الخاص بـ PR #71.
- `MatchCenterAnalysis.tsx` → تمرير `logos` إلى مجموعات الأرقام.
- ملفات الاختبارات الخمسة → نسخ «المرحلة أ» للاختبارات (28 رقماً، 6 مجموعات، المعاينة على الملعب، `PITCH_POSITION_CODES`، `headToHeadSummary`، `possessionSplit`…) مع الحفاظ على تحديثات PR #71 (4 تبويبات، 624 مساراً).

### الخطوة ب — استعادة الكود الذي أزاله الارتجاع (7 ملفات)

| الملف | الإجراء |
|-------|---------|
| `website/src/lib/match-center.mjs` | استعادة `ebcca82` كاملة + إعادة تطبيق إضافات PR #71 الثلاث: سطر `{ id: 'analysis' }` في `TABS`، دالة `hasMatchAnalysis`، وبوابة `computeAvailableTabs` للتبويب |
| `website/src/lib/match-center.d.mts` | الاستعادة + `TabId` يشمل `'analysis'` + `analysisSlug` في `MatchDefinition` + إعلان `hasMatchAnalysis` |
| `website/src/components/MatchCenterStatGroups.tsx` | استعادة كاملة: `PossessionBar` + خيار `logos` + النص «غير متاح» |
| `website/src/components/MatchCenterVisuals.tsx` | استعادة كاملة: المعاينة على الملعب، العدّادات، `positionLabelAr`، `TeamCrest` |
| `website/src/pages/match-center.css` | استعادة `ebcca82` (99 سطر «المرحلة أ») + إضافة CSS تبويب التحليل الخاصة بـ PR #71 |
| `website/src/pages/MatchCenterPage.tsx` | استعادة `ebcca82` (استخدام `MatchCenterDocs`، تلميح «قبل المباراة» الأصلي) + إبقاء إضافة PR #71 (تلميح التحليل، مسار Breadcrumb «مركز المباراة») |
| `website/tests/match-center-analysis.spec.ts` | استعادة كاملة (توقعات المجموعات الست والاستحواذ) |

### الخطوة ج — وقاية من التكرار

أُضيف إلى `verify.yml` خطوة **«Reject unresolved merge conflict markers»** ترفض أي شجرة تحمل علامات تعارض (`grep -RInE '^(<<<<<<< |=======$|>>>>>>> )'`) قبل أي فحص آخر — لئلا يعيد أي PR كسر `main` بالطريقة نفسها. (تعمل الآن على كل `pull_request` وكل دفعة على `arena/**`.)

---

## 5) التحقق النهائي

الأمر نفسه المُشغَّل في خطوة CI الفاشلة، على الشجرة المصلَّحة:

```bash
npm run typecheck && npm test && npm run build
```

| الفحص | النتيجة |
|-------|---------|
| `tsc --noEmit` | ✅ 0 أخطاء |
| `node --test` (29 ملف اختبار) | ✅ 467 اختباراً — 466 ناجحاً، 0 فاشل، 1 متجاهل |
| `vite build` + `prerender` + `publish-static` | ✅ 677 مساراً + `404.html` + `sitemap.xml` |
| حارس علامات التعارض الجديد | ✅ الشجرة نظيفة |

---

## 6) ما الذي يستعيده الإصلاح للمنتج؟

1. **المعاينة على الملعب** حتى صدور التشكيلة، ثم انتقالها إلى لوحة «قبل المباراة» (`previewPlacement`) — ولا تكرار للمحتوى في بيتين.
2. **حقائق المباراة الست** (`previewFacts`): المسابقة، الموسم، الجولة، الملعب، موعدا القاهرة ومكة.
3. **شريط الاستحواذ البارز** وشعارات الفريقين فوق مجموعات الأرقام.
4. **عدّادات بطاقة الفريق** (صفراء/حمراء/ركنيات) على الملعب + **أسماء المراكز بالعربية**.
5. **سطر مجمل المواجهات** (فوز/تعادل/خسارة) بنسبته بمعرّف فريق المصدر (`headToHeadSummary`).
6. **28 إحصائية في 6 مجموعات** مع موحّد مقاييس النسب `mc_pct` في `match-center.php`.
7. قسم **«التوثيق والمراجعة»** ببطاقاته في صفحة مركز المباراة.
8. **تبويب «التحليل»** الجديد (PR #71) يعمل الآن فوق قاعدة سليمة: `hasMatchAnalysis` + `analysisSlug` + الأنماط والمكوّن الخاصان به.

---

## 7) التوصيات

1. **لا يُدمج أي PR قبل اخضرار `verify.yml`** — وهو يشمل الآن حارس العلامات، و`typecheck`، و467 اختباراً، والبناء.
2. **استخدام `git merge` حقيقي** عند تحديث فروع العمل من `main` (بدلاً من إعادة بناء merges التزامات أحادية الأب كما في `21d20f9`)، وحل التعارضات محلياً قبل الرفع.
3. **فحص سريع قبل الرفع:** `grep -RInE '^(<<<<<<< |=======$|>>>>>>> )' website/src website/scripts match-center.php` يجب ألا يُرجع شيئاً.
4. مراجعة بنية الـ PR (الدمج مع `main`، ثم الاختبارات) قبل الضغط على «Merge» — خصوصاً عندما يحمل الـ PR تغييرات في طبقة العقد (`match-center.mjs`) والمكوّنات معاً.

---

## 8) الملفات المُعدَّلة (مصدر الإصلاح)

```
match-center.php
website/scripts/test-match-center.mjs
website/scripts/test-match-center-analysis.mjs
website/scripts/test-match-center-pages.mjs
website/scripts/test-match-center-php.mjs
website/scripts/test-match-center-lineups.mjs
website/src/components/MatchCenterAnalysis.tsx
website/src/components/MatchCenterPanels.tsx
website/src/components/MatchCenterStatGroups.tsx
website/src/components/MatchCenterVisuals.tsx
website/src/lib/match-center.mjs
website/src/lib/match-center.d.mts
website/src/pages/MatchCenterPage.tsx
website/src/pages/match-center.css
website/tests/match-center-analysis.spec.ts
.github/workflows/verify.yml
```

(إلى جانب إعادة توليد مخرجات الواجهة المنشورة — HTML/Assets — بواسطة `npm run build` وفق تقليد المستودع.)
