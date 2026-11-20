import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateStreamingBandwidth, HEADROOM, STREAMING_RATES } from '../src/lib/streaming-bandwidth.mjs';

const make = overrides => ({ provider: 'youtube', hd: 0, fhd: 1, uhd: 0, otherMbps: 0, measuredMbps: null, ...overrides });

test('توصيات الخدمتين والقيمة الافتراضية وحافة التقريب', () => {
  assert.deepEqual(STREAMING_RATES.youtube, { hd: 2.5, fhd: 5, uhd: 20 });
  assert.deepEqual(STREAMING_RATES.netflix, { hd: 3, fhd: 5, uhd: 15 });
  assert.equal(HEADROOM, 0.25);
  assert.deepEqual(calculateStreamingBandwidth(make()), {
    ok: true, videoMbps: 5, baselineMbps: 5, targetMbps: 6.3, comparison: 'not-provided',
  });
});

test('يجمع الشاشات والأنشطة والهامش بدل الخلط بين معدل الفيديو والسرعة', () => {
  const result = calculateStreamingBandwidth(make({ uhd: 1, otherMbps: 3, measuredMbps: 30 }));
  assert.deepEqual(result, { ok: true, videoMbps: 25, baselineMbps: 28, targetMbps: 35, comparison: 'below-target' });
  const netflix = calculateStreamingBandwidth(make({ provider: 'netflix', uhd: 1, otherMbps: 3, measuredMbps: 30 }));
  assert.deepEqual(netflix, { ok: true, videoMbps: 20, baselineMbps: 23, targetMbps: 28.8, comparison: 'enough' });
});

test('المقارنة عند الحدّ لا توحي بضمان أو تساوي أدنى الاحتياج بالهامش', () => {
  assert.equal(calculateStreamingBandwidth(make({ measuredMbps: 4 })).comparison, 'below-baseline');
  assert.equal(calculateStreamingBandwidth(make({ measuredMbps: 5 })).comparison, 'below-target');
  assert.equal(calculateStreamingBandwidth(make({ measuredMbps: 6.3 })).comparison, 'enough');
});

test('يرفض المدخلات الناقصة أو السالبة أو الكسرية أو غير المحدودة', () => {
  assert.deepEqual(calculateStreamingBandwidth(make({ provider: 'other' })), { ok: false, error: 'provider' });
  assert.deepEqual(calculateStreamingBandwidth(make({ fhd: 0 })), { ok: false, error: 'no-screens' });
  for (const value of [-1, 1.5, 9, NaN, Infinity]) {
    assert.deepEqual(calculateStreamingBandwidth(make({ hd: value })), { ok: false, error: 'screens' });
  }
  for (const value of [-1, 10001, NaN, Infinity]) {
    assert.deepEqual(calculateStreamingBandwidth(make({ otherMbps: value })), { ok: false, error: 'other' });
    assert.deepEqual(calculateStreamingBandwidth(make({ measuredMbps: value })), { ok: false, error: 'measured' });
  }
});
