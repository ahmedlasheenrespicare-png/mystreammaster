import type { FeaturedClash } from './LeagueTicketCard';

/* ==========================================================================
   شرائح مواجهات الشريط المتحرك — تحديد الأندية فقط
   --------------------------------------------------------------------------
   • المواعيد والنتائج والأحداث تأتي كلها من مصدر البطاقة نفسه (/scoreboard.php
     ← ESPN) عبر useClashes؛ لا تاريخ ولا نتيجة مكتوبة يدوياً هنا. ما يُثبَّت في
     هذا الملف هو «أي مواجهة تُعرض» وحده، مع تاريخها لأغراض حدّة العرض (7 أيام).
   • الحقل `date` هو تاريخ انطلاق المواجهة باليوم (توقيت القاهرة) كما في جدول
     UEFA: الجولة الرابعة من أبطال أوروبا لُعبت 3–4 نوفمبر، ومواجهات الدوري
     الأوروبي وجولة المؤتمر جرت 5 نوفمبر.
   • الشعار المحلي يُذكر للأندية التي لها شعار محفوظ في الموقع فقط؛ وإلا يبقى
     crest فارغاً فيلتقط الشريط شعار النادي من المصدر نفسه (انظر CrownClashSlide)،
     وبديله اسم النادي — ولا تُخترع صور.
   ========================================================================== */

// UEFA's 4 November 2026 slate (Champions League, matchday 4).
const team = (name: string, tokens: string[], badge = '') => ({
  name, tokens, mono: name, crest: badge ? `/images/teams/${badge}.webp` : '',
});
const pairs = [
  [team('أيك أثينا', ['aek', 'أيك', 'ايك']), team('ريال مدريد', ['real madrid', 'ريال مدريد'], 'real-madrid-badge')],
  [team('فنربخشة', ['fenerbah', 'فنربخشة']), team('ليفربول', ['liverpool', 'ليفربول'], 'liverpool-badge')],
  [team('بوروسيا دورتموند', ['dortmund', 'دورتموند']), team('ريال بيتيس', ['betis', 'بيتيس'])],
  [team('بورتو', ['porto', 'بورتو']), team('نابولي', ['napoli', 'نابولي'])],
  [team('آيندهوفن', ['psv', 'eindhoven', 'آيندهوفن', 'أيندهوفن']), team('كلوب بروج', ['brugge', 'bruges', 'بروج'])],
  [team('لايبزيغ', ['leipzig', 'لايبزيغ', 'لايبزيج']), team('مانشستر سيتي', ['manchester city', 'مانشستر سيتي'], 'manchester-city-badge')],
  [team('لانس', ['lens', 'لانس']), team('كومو', ['como', 'كومو'])],
  [team('سلافيا براغ', ['slavia', 'سلافيا']), team('أرسنال', ['arsenal', 'أرسنال', 'ارسنال'], 'arsenal-badge')],
  [team('فايكينغ', ['viking', 'فايكينغ', 'فيكينج']), team('صباح', ['sabah', 'صباح'])],
];
export const NOVEMBER_4_CROWN_CLASHES: FeaturedClash[] = pairs.map(([home, away]) => ({
  eyebrow: 'دوري أبطال أوروبا', home, away,
  source: 'uefa.champions', date: '2026-11-04',
}));

/* مواجهات الخميس 5 نوفمبر 2026 — أبرز ثماني قمة في الدوري الأوروبي (الجولة
   الثالثة). مصدر البطاقة uefa.europa: شارة البطولة لها شعار موثّق لدى المصدر،
   فيظهر تلقائياً خلف الشريحة وعنوانها «الدوري الأوروبي». */
const november5Pairs = [
  [team('ميلان', ['milan', 'ميلان']), team('فرينسفاروش', ['ferencvaros', 'ferencváros', 'fradi', 'فرينسفاروش'])],
  [team('ريال سوسيداد', ['real sociedad', 'sociedad', 'سوسيداد']), team('ليون', ['lyon', 'ol.', 'ليون'])],
  [team('آزد ألكمار', ['az alkmaar', 'alkmaar', 'ألكمار', 'آزد']), team('يوفنتوس', ['juventus', 'يوفنتوس'])],
  [team('باير ليفركوزن', ['leverkusen', 'ليفركوزن']), team('مرسيليا', ['marseille', 'olympique de marseille', 'مرسيليا', 'مارسيليا'])],
  [team('كريستال بالاس', ['crystal palace', 'كريستال بالاس']), team('هوفنهايم', ['hoffenheim', 'هوفنهايم'])],
  [team('سلتيك', ['celtic', 'سلتيك']), team('بيشتاش', ['besiktas', 'beşiktaş', 'بيشتاش', 'بيشيكتاش'])],
  [team('بنفيكا', ['benfica', 'بنفيكا']), team('ليخ بوزنان', ['lech poznan', 'lech', 'ليخ'])],
  [team('سندرلاند', ['sunderland', 'سندرلاند']), team('دينامو زغرب', ['dinamo zagreb', 'gnk dinamo', 'دينامو زغرب'])],
];
export const NOVEMBER_5_CROWN_CLASHES: FeaturedClash[] = november5Pairs.map(([home, away]) => ({
  eyebrow: 'الدوري الأوروبي', home, away,
  source: 'uefa.europa', date: '2026-11-05',
}));

/* بطاقات البطولتين الفضيتين (كأس الرابطة الإنجليزي ودوري أبطال آسيا للنخبة)
   تبقى في الشريط حتى بعد إخفاء مواجهتيهما: هي بطولات لا شرائح مواجهات، وقد
   اعتمدها المالك في الطلب #347. تُضاف هنا لتبقى إن خلت الشرائح من مواجهتها. */
export const CROWN_LEAGUE_CARDS: readonly { id: string; name: string }[] = [
  { id: 'eng.league_cup', name: 'كأس الرابطة' },
  { id: 'afc.champions', name: 'دوري أبطال آسيا للنخبة' },
];

/* طلب المالك (5 نوفمبر): مواجهات اليوم في الدوري الأوروبي أولاً، ثم مواجهات
   أمس في أبطال أوروبا. مواجهات 3 نوفمبر وما قبلها تُخفى من هذا الشريط وحده —
   شرائح التذكرة والأخبار خارج هذا الملف لا تتغيّر. */
const clashKey = (clash: FeaturedClash) => `${clash.home.name}|${clash.away.name}`;
export function novemberCrownClashes(previous: FeaturedClash[]): FeaturedClash[] {
  const selected = [...NOVEMBER_5_CROWN_CLASHES, ...NOVEMBER_4_CROWN_CLASHES];
  const seen = new Set(selected.map(clashKey));
  // أي مواجهة سابقة تحمل تاريخ أمس أو اليوم تُسمح بها، بلا تكرار لبطاقة موجودة.
  const kept = previous.filter(clash => clash.date === '2026-11-05' || clash.date === '2026-11-04');
  return [...selected, ...kept.filter(clash => !seen.has(clashKey(clash)))];
}
