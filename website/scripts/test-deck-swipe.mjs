/* ==========================================================================
   اختبار منطق التقليب باللمس — الكروت تتبع الإصبع 1:1 ثم تُقلَّب
   --------------------------------------------------------------------------
   يُختبر الحساب الخالص في `src/components/deck-swipe.mjs` (نفس الدوال التي
   يستوردها ServerDeck.tsx)، فلا يعتمد على متصفح. سبب وجوده: الشكوى كانت أن
   الكروت «لا تتحرّك مع الإصبع»، وهذا الاختبار يثبّت ثلاثة أمور:
     1) إزاحة الشريط تساوي حركة الإصبع بالبكسل داخل حدّ السحب.
     2) السحب الرأسي لا يُحسب تقليباً (تمرير الصفحة يبقى سليماً).
     3) الاتجاه والعتبة: 42px، يسار = التالي، يمين = السابق، والقصير يرتدّ.
   التشغيل: node --test scripts/test-deck-swipe.mjs
   ========================================================================== */
import assert from "node:assert/strict";
import test from "node:test";

import {
  AXIS_LOCK,
  MAX_DRAG,
  RUBBER_BAND,
  SWIPE_THRESHOLD,
  dragOffset,
  pickAxis,
  stepIndex,
  swipeDirection,
} from "../src/components/deck-swipe.mjs";

test("قفل المحور: أقل من 8px لم يُحسم، ثم الأفقي أو الرأسي", () => {
  assert.equal(AXIS_LOCK, 8);
  assert.equal(pickAxis(3, 2), null, "حركة صغيرة جداً ليست سحباً");
  assert.equal(pickAxis(9, 1), "x", "حركة أفقية = تقليب");
  assert.equal(pickAxis(2, 12), "y", "حركة رأسية = تمرير الصفحة");
  /* حركة قطرية يغلب فيها الأفقي تُحسب تقليباً */
  assert.equal(pickAxis(18, 11), "x");
  assert.equal(pickAxis(11, 18), "y");
});

test("الكروت تتبع الإصبع بنسبة 1:1 داخل حدّ السحب", () => {
  for (const dx of [0, 1, 17, 42, 96, 159, 160, -17, -96, -160]) {
    assert.equal(dragOffset(dx), dx, `الإزاحة ${dx} يجب أن تمرّ كما هي`);
  }
});

test("مقاومة مطّاطية بعد 160px: تزيد بمعدل 0.25 فقط", () => {
  assert.equal(RUBBER_BAND, 0.25);
  /* 200px حركة إصبع = 160 + 40*0.25 = 170px إزاحة */
  assert.equal(dragOffset(200), 170);
  assert.equal(dragOffset(-200), -170);
  assert.ok(Math.abs(dragOffset(400)) < 400, "الشريط لا يهرب مع سحب طويل");
  assert.equal(dragOffset(400), MAX_DRAG + (400 - MAX_DRAG) * RUBBER_BAND);
});

test("اتجاه التقليب وعتبته 42px", () => {
  assert.equal(SWIPE_THRESHOLD, 42);
  assert.equal(swipeDirection(-42), "next", "سحب لليسار = الكارت التالي");
  assert.equal(swipeDirection(42), "prev", "سحب لليمين = الكارت السابق");
  assert.equal(swipeDirection(-41), null, "أقل من العتبة يرتدّ بلا تبديل");
  assert.equal(swipeDirection(41), null);
  assert.equal(swipeDirection(0), null);
});

test("فهرس الكارت يلفّ دائرياً في الاتجاهين", () => {
  assert.equal(stepIndex(0, 1, 4), 1);
  assert.equal(stepIndex(3, 1, 4), 0, "بعد الأخير يعود للأول");
  assert.equal(stepIndex(0, -1, 4), 3, "قبل الأول يذهب للأخير");
  assert.equal(stepIndex(2, -3, 4), 3);
  assert.equal(stepIndex(0, 1, 0), 0, "بلا كروت لا ينكسر");
});
