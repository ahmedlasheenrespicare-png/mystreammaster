// Order matches the eight cards in league-world/world.html. These are the
// reviewed source identifiers, not the public URL slugs.
export const leagues = [
  { slug: 'champions-league', name: 'دوري أبطال أوروبا', table: 'uefa.champions' },
  { slug: 'premier-league', name: 'الدوري الإنجليزي', table: 'eng.1' },
  { slug: 'ligue-1', name: 'الدوري الفرنسي', table: 'fra.1' },
  { slug: 'la-liga', name: 'الدوري الإسباني', table: 'esp.1' },
  { slug: 'bundesliga', name: 'الدوري الألماني', table: 'ger.1' },
  { slug: 'serie-a', name: 'الدوري الإيطالي', table: 'ita.1' },
  { slug: 'saudi-pro-league', name: 'الدوري السعودي', table: 'ksa.1', matches: 'sau.1' },
  { slug: 'egyptian-premier-league', name: 'الدوري المصري', table: 'egy.1' },
];
export const leagueViews = [
  { slug: '', name: 'نظرة عامة', view: 'overview' },
  { slug: 'standings', name: 'الترتيب', view: 'standings' },
  { slug: 'stats', name: 'الإحصائيات', view: 'rates' },
  { slug: 'matches', name: 'المباريات', view: 'matches' },
];
export const leaguePath = (league, view = '') => `/leagues/${league.slug}/${view ? view + '/' : ''}`;
