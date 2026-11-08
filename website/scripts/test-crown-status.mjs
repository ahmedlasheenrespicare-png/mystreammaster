/* ==========================================================================
   اختبارات lib/crown-status.mjs — شارة الحالة وسطر الدرج في شريط التاج
   --------------------------------------------------------------------------
   الحالة مُغطّاة هنا لا في Playwright لأن الفيڈ الحي لا يضمن موعدًا مؤجّلًا
   في نافذة الاختبار، والانحرافان اللذان صُحّحا كانا صامتين تمامًا في البناء:
   1) `state: "other"` (تأجيل/إلغاء/إيقاف) كان يُعرض «لم تبدأ».
   2) قبل المباراة وبعدها كان الدرج يعيد نص الشارة في سطر ثانٍ.
   ========================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { CROWN_NO_BOARD_LINE, crownBandDetail, crownLiveClock, crownStateLabel } from '../src/lib/crown-status.mjs';

const at = (state, detail, venue = '') => ({ state, detail, venue });

test('شارة الحالة: كل لفظ من مصدره، وبلا حالة تُترك بلا وصف', () => {
  assert.equal(crownStateLabel(null), 'بانتظار لوحة المواعيد');
  assert.equal(crownStateLabel(undefined), 'بانتظار لوحة المواعيد');
  assert.equal(crownStateLabel(at('scheduled', 'لم تبدأ')), 'لم تبدأ');
  assert.equal(crownStateLabel(at('live', '67′')), 'مباشر الآن');
  assert.equal(crownStateLabel(at('finished', 'انتهت')), 'انتهت');
});

test('الانحراف المُصلَّح: موعد مؤجَّل لا يُسمى «لم تبدأ»', () => {
  // هذه هي سلسلة المصدر نفسها التي يرسلها scoreboard.php عبر parseScoreboard.
  for (const label of ['مؤجلة', 'ملغاة', 'متوقفة', 'متأخرة', 'أُلغيت بعد بدايتها']) {
    const chip = crownStateLabel(at('other', label));
    assert.equal(chip, label, `الشارة تحمل لفظ المصدر (${label})`);
    assert.notEqual(chip, 'لم تبدأ', 'مؤجَّلة ليست «لم تبدأ»');
    assert.notEqual(chip, 'انتهت', 'مؤجَّلة ليست «انتهت»');
  }
  // بلا تسمية خاصة يبقى لفظ المصدر العام — لا يُختلَق وصف جديد.
  assert.equal(crownStateLabel(at('other', '   ')), 'تغيّر موعد المباراة');
});

test('سطر الدرج: لا يعيد الشارة، ولا يخترع شرطة بديلة', () => {
  // مباشر: `detail` هو الساعة — مختلف عن الشارة فيُعرض كما هو.
  assert.equal(crownBandDetail(at('live', '67′')), '67′');
  // لم تبدأ: الشارة == التفصيل → الملعب من المصدر بدل التكرار.
  assert.equal(crownBandDetail(at('scheduled', 'لم تبدأ', 'سانتياغو برنابيو')), 'سانتياغو برنابيو');
  // انتهت بلا ملعب في الفيڈ → لا سطر إطلاقًا (وليست «انتهت» مرتين).
  assert.equal(crownBandDetail(at('finished', 'انتهت')), '');
  // مؤجَّلة: الشارة تأخذ لفظ المصدر، والسطر يأخذ الملعب.
  assert.equal(crownBandDetail(at('other', 'مؤجلة', 'المستايا')), 'المستايا');
  assert.equal(crownBandDetail(at('other', 'مؤجلة')), '');
  // لا مدخل في اللوحة: الجملة التعريفية القديمة بحروفها (التذكرة والفول-سكرين لا تتغير).
  assert.equal(crownBandDetail(null), CROWN_NO_BOARD_LINE);
});

test('خاصة عامة: الشريط لا يطبع الشارة مرتين مهما كان المدخل', () => {
  const details = ['لم تبدأ', 'انتهت', 'مباشر', '67′', 'مؤجلة', '', '   ', 'نص حر من المصدر'];
  const venues = ['', '   ', 'ملعب', 'أولد ترافورد'];
  for (const state of ['live', 'scheduled', 'finished', 'other']) {
    for (const detail of details) {
      for (const venue of venues) {
        const match = at(state, detail, venue);
        const chip = crownStateLabel(match);
        const line = crownBandDetail(match);
        assert.ok(chip.length > 0, `${state}/${detail}: الشارة لا تُترك فارغة`);
        assert.notEqual(line, chip, `${state}/${detail}: السطر لا يوازي الشارة (وإلا يُحذف)`);
        // ما لا يُعرَف من المصدر لا يُختلَق: إما نص المصدر أو ملعبه أو لا شيء.
        assert.ok(line === '' || line === detail.trim() || line === venue.trim(),
          `${state}/${detail}/${venue}: السطر مشتق من المصدر وحده`);
      }
    }
  }
});

test('ساعة المباراة الجارية: الدقيقة من المصدر والثواني تُستكمل داخلها فقط', () => {
  const at = (min, sec) => (min * 60 + sec) * 1000;
  // المصدر أرسل mm:ss → تُستخدم الرقمتان حرفيًا، مهما قال عدّاد الجهاز.
  assert.deepEqual(crownLiveClock('67:12', at(70, 0)), { minutes: 67, seconds: 12 });
  // دقيقة فقط: الثواني تُحسب من صافرة البداية داخل الدقيقة المعلَنة.
  assert.deepEqual(crownLiveClock('67′', at(67, 9)), { minutes: 67, seconds: 9 });
  // الدقيقة ٦٨ مرّت على الساعة لكن المصدر لم يُحدّث بعد: تُثبَّت على ٥٩،
  // فاختراع دقيقة لم يعلنها المصدر أسوأ من ثوانٍ متوقفة.
  assert.deepEqual(crownLiveClock('67′', at(68, 30)), { minutes: 67, seconds: 59 });
  // دقيقة مع وقت بدل ضائع («45'+2'») → ٤٥ من المصدر، والثواني لا تتخطى الدقيقة المعلَنة.
  assert.deepEqual(crownLiveClock("45'+2'", at(46, 10)), { minutes: 45, seconds: 59 });
  // صافرة لم تدق بعد (توقيت في المستقبل) أو قيمة غير رقمية → صفر لا ساعة مُوهِمة.
  assert.deepEqual(crownLiveClock('67′', -3_600_000), { minutes: 67, seconds: 0 });
  assert.deepEqual(crownLiveClock('67′', Number.NaN), { minutes: 67, seconds: 0 });
  // استراحة/نهاية شوط: لا رقم في المصدر ⇒ لا ساعة تُعرض أصلًا.
  assert.equal(crownLiveClock('HT', at(45, 0)), null);
  assert.equal(crownLiveClock('مباشر', at(10, 0)), null);
  assert.equal(crownLiveClock('', 0), null);
  assert.equal(crownLiveClock(undefined, 0), null);
});
