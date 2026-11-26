// Shared public destinations for the Arabic homepage and internal-page headers.
// The news link points to the live homepage section, not an imaginary /news/ index.
export const HEADER_GROUPS = [
  { key: 'servers', label: 'السيرفرات والباقات', links: [
    ['مقارنة السيرفرات', '/servers/'], ['نوفا', '/nova/'], ['إيستار', '/istar/'], ['موكا', '/moka/'], ['X', '/x/'], ['المتجر', '/store/'], ['التجربة المجانية', '/trial/'],
  ] },
  { key: 'sports', label: 'البطولات والمباريات', links: [
    ['عالم البطولات التفاعلي', '/#league-strip'], ['صفحات البطولات', '/leagues/'], ['مواعيد المباريات', '/matches/'], ['مركز المباراة', '/match-center/'], ['كأس العالم والمنتخبات', '/world-cup-2026/'],
    ['دوري أبطال أوروبا', '/leagues/champions-league/'], ['الدوري الإنجليزي', '/leagues/premier-league/'], ['الدوري الفرنسي', '/leagues/ligue-1/'], ['الدوري الإسباني', '/leagues/la-liga/'], ['الدوري الألماني', '/leagues/bundesliga/'], ['الدوري الإيطالي', '/leagues/serie-a/'], ['الدوري السعودي', '/leagues/saudi-pro-league/'], ['الدوري المصري', '/leagues/egyptian-premier-league/'],
  ] },
  { key: 'watch', label: 'القنوات والمشاهدة', links: [
    ['فهرس القنوات', '/channels/'], ['المشاهدة القانونية', '/watch-legal.html'], ['مشغّل الاشتراك', '/xtream-player.html'],
  ] },
  { key: 'content', label: 'المقالات والأخبار', links: [
    ['المقالات والأدلة', '/blog/'], ['الأخبار الرياضية', '/#sports-news'],
  ] },
  { key: 'help', label: 'المساعدة', links: [
    ['الأسئلة الشائعة', '/faq/'], ['حالة الخدمة والتواصل', '/status/'], ['من نحن', '/about/'], ['البحث', '/search/'], ['الخصوصية', '/privacy/'], ['الشروط', '/terms/'], ['الاسترجاع', '/refund/'],
  ] },
];
