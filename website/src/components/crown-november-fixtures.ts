import type { FeaturedClash } from './LeagueTicketCard';

// UEFA's 4 November 2026 slate. Times, scores and incidents still come only
// from the existing scoreboard feed; these entries select the teams to show.
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

// Preserve only the previously displayed fixtures from yesterday, not the
// other historical selections. Ticket/news content is deliberately untouched.
export function novemberCrownClashes(previous: FeaturedClash[]): FeaturedClash[] {
  return [...NOVEMBER_4_CROWN_CLASHES, ...previous.filter(clash => clash.date === '2026-11-03')];
}
