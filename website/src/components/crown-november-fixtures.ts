import type { FeaturedClash } from './LeagueTicketCard';

/* ==========================================================================
   شرائح مواجهات الشريط المتحرك — تحديد الأندية فقط
   --------------------------------------------------------------------------
   • المواعيد والنتائج والأحداث تأتي كلها من مصدر البطاقة نفسه (/scoreboard.php
     ← ESPN) عبر useClashes؛ لا تاريخ ولا نتيجة مكتوبة يدوياً هنا. ما يُثبَّت في
     هذا الملف هو «أي مواجهة تُعرض» وحده، مع تاريخها لأغراض حدّة العرض (7 أيام).
   • الحقل `date` هو يوم انطلاق المواجهة بتوقيت القاهرة كما في جداول البطولات،
     و`source` هو معرّف البطولة لدى المصدر؛ فلا مواجهة تُنسَب لبطولة لا تغذّيها.
   • الشعار المحلي يُذكر للأندية التي لها شعار محفوظ في الموقع فقط؛ وإلا يبقى
     crest فارغاً فيلتقط الشريط شعار النادي من المصدر نفسه (انظر CrownClashSlide)،
     وبديله اسم النادي — ولا تُخترع صور.
   ========================================================================== */

const team = (name: string, tokens: string[], badge = '') => ({
  name, tokens, mono: name, crest: badge ? `/images/teams/${badge}.webp` : '',
});

/* ── أرشيف الجولات الأوروبية (3–5 نوفمبر) — محفوظة للتوثيق، غير مختارة حالياً ── */
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

/* ── السبت 7 نوفمبر 2026 — أبرز ثماني قمة في الدوريات الأوروبية الخمس ──────────
   لا مباريات أندية أوروبية هذا الأسبوع (الجولة التالية من أبطال أوروبا
   24–25 نوفمبر)، فيكون الشريط لعطلة الأسبوع المحلية. دوري روشن أجرّت رابطته
   جولتها 13 كلها، وكأس مصر ليست ضمن مصادر الموقع — فلا تُذكر هنا. */
const november7Pairs: Array<[ReturnType<typeof team>, ReturnType<typeof team>, string, string]> = [
  [team('فالنسيا', ['valencia', 'فالنسيا']), team('ريال مدريد', ['real madrid', 'ريال مدريد'], 'real-madrid-badge'), 'الدوري الإسباني', 'esp.1'],
  [team('نوتنغهام فورست', ['nottingham', 'نوتنغهام', 'نوتينغهام']), team('مانشستر سيتي', ['manchester city', 'مانشستر سيتي'], 'manchester-city-badge'), 'الدوري الإنجليزي', 'eng.1'],
  [team('أرسنال', ['arsenal', 'أرسنال', 'ارسنال'], 'arsenal-badge'), team('هول سيتي', ['hull', 'هول']), 'الدوري الإنجليزي', 'eng.1'],
  [team('ليدز يونايتد', ['leeds', 'ليدز']), team('توتنهام هوتسبير', ['tottenham', 'توتنهام'], 'tottenham-badge'), 'الدوري الإنجليزي', 'eng.1'],
  [team('ماينز', ['mainz', 'ماينز']), team('بايرن ميونخ', ['bayern', 'بايرن'], 'bayern-munich-badge'), 'الدوري الألماني', 'ger.1'],
  [team('بوروسيا دورتموند', ['dortmund', 'دورتموند']), team('إلفرسبرج', ['elversberg', 'إلفرسبرج']), 'الدوري الألماني', 'ger.1'],
  [team('روما', ['roma', 'روما'], 'as-roma-badge'), team('ساسولو', ['sassuolo', 'ساسولو']), 'الدوري الإيطالي', 'ita.1'],
  [team('باريس سان جيرمان', ['paris saint-germain', 'psg', 'باريس سان جيرمان'], 'paris-saint-germain-badge'), team('تروا', ['troyes', 'تروا']), 'الدوري الفرنسي', 'fra.1'],
];
export const NOVEMBER_7_CROWN_CLASHES: FeaturedClash[] = november7Pairs.map(([home, away, eyebrow, source]) => ({
  eyebrow, home, away, source, date: '2026-11-07',
}));

/* بطاقات البطولات التي تبقى في الشريط حتى بعد إخفاء مواجهاتها: هي بطولات لا
   شرائح مواجهات، وقد اعتمدها المالك في الطلبين #346 و#347 (الكأسان الفضيتان)
   وأُضيف لها الدوري الأوروبي ليبقى شعاره بعد إخفاء شرائح 5 نوفمبر. */
export const CROWN_LEAGUE_CARDS: readonly { id: string; name: string }[] = [
  { id: 'eng.league_cup', name: 'كأس الرابطة' },
  { id: 'afc.champions', name: 'دوري أبطال آسيا للنخبة' },
  { id: 'uefa.europa', name: 'الدوري الأوروبي' },
];

/* طلب المالك (6 نوفمبر): شرائح أبرز مواجهات غدًا السبت فقط، وإخفاء شرائح
   دوري أبطال أوروبا (4 نوفمبر) والدوري الأوروبي (5 نوفمبر) من هذا الشريط وحده —
   شرائح التذكرة والأخبار خارج هذا الملف لا تتغيّر. */
const clashKey = (clash: FeaturedClash) => `${clash.home.name}|${clash.away.name}`;
export function novemberCrownClashes(previous: FeaturedClash[]): FeaturedClash[] {
  const selected = NOVEMBER_7_CROWN_CLASHES;
  const seen = new Set(selected.map(clashKey));
  // أي مواجهة سابقة تحمل تاريخ الغد تُسمح بها، بلا تكرار لبطاقة موجودة.
  const kept = previous.filter(clash => clash.date === '2026-11-07');
  return [...selected, ...kept.filter(clash => !seen.has(clashKey(clash)))];
}
