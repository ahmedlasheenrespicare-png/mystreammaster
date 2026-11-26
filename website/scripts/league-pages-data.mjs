// Order matches the eight cards in league-world/world.html. These are the
// reviewed source identifiers, not the public URL slugs.
export const leagues = [
  { slug: 'champions-league', name: 'دوري أبطال أوروبا', table: 'uefa.champions', context: 'بطولة قارية للأندية الأوروبية ينظمها الاتحاد الأوروبي لكرة القدم؛ تعرض صفحة الترتيب مرحلة الدوري عندما يتيحها المصدر، وقد تختلف آلية التأهل والأدوار حسب الموسم.' },
  { slug: 'premier-league', name: 'الدوري الإنجليزي', table: 'eng.1', context: 'مسابقة الأندية الإنجليزية في الدرجة الممتازة؛ يجمع جدول الدوري أداء الفرق خلال الموسم، بينما تعرض صفحة المباريات مواعيد اليوم وفق توقيت القاهرة.' },
  { slug: 'ligue-1', name: 'الدوري الفرنسي', table: 'fra.1', context: 'مسابقة الدرجة الأولى للأندية الفرنسية؛ يساعد جدول المراكز ومعدلات الفرق على متابعة الأداء خلال موسم الدوري المحلي.' },
  { slug: 'la-liga', name: 'الدوري الإسباني', table: 'esp.1', context: 'مسابقة الدرجة الأولى في إسبانيا؛ تابع ترتيب الأندية الإسبانية وعدد المباريات والأهداف والنقاط كما يوردها مصدر الموقع.' },
  { slug: 'bundesliga', name: 'الدوري الألماني', table: 'ger.1', context: 'مسابقة الدرجة الأولى في ألمانيا؛ تعرض هذه الصفحات المراكز ومعدلات الأهداف والنقاط ومواعيد مباريات الأندية الألمانية.' },
  { slug: 'serie-a', name: 'الدوري الإيطالي', table: 'ita.1', context: 'مسابقة الدرجة الأولى للأندية الإيطالية؛ يوضح جدول البطولة النتائج الإجمالية لكل فريق، وتُعرض المباريات حسب اليوم المختار.' },
  { slug: 'saudi-pro-league', name: 'الدوري السعودي', table: 'ksa.1', matches: 'sau.1', context: 'مسابقة دوري المحترفين في السعودية؛ يُستخدم مصدر الترتيب الخاص بالدوري ومصدر المباريات المخصص له، وقد يختلف توقيت المباراة عن موعدها المحلي بسبب اختيار توقيت القاهرة.' },
  { slug: 'egyptian-premier-league', name: 'الدوري المصري', table: 'egy.1', context: 'مسابقة الدرجة الأولى للأندية المصرية؛ تعتمد صفحة الترتيب على مصدر الموقع المخصص للدوري المصري، وتُعرض المباريات بتوقيت القاهرة.' },
];
export const leagueViews = [
  { slug: '', name: 'نظرة عامة', view: 'overview' },
  { slug: 'standings', name: 'الترتيب', view: 'standings' },
  { slug: 'stats', name: 'الإحصائيات', view: 'rates' },
  { slug: 'matches', name: 'المباريات', view: 'matches' },
];
export const leaguePath = (league, view = '') => `/leagues/${league.slug}/${view ? view + '/' : ''}`;
