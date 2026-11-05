/* ==========================================================================
   أخبار مميزة يدوية تظهر في الصفحة الرئيسية (قبل المباريات القادمة)
   --------------------------------------------------------------------------
   كل خبر صفحة داخلية من الموقع (في public/news/…)، ولا تُنسخ هنا عناوين أو
   صور من مواقع أخرى. أضف الخبر الأحدث أولاً.
========================================================================== */

export interface FeaturedNewsItem {
  category: string;
  /** تاريخ الخبر بصيغة عرض جاهزة */
  dateLabel: string;
  title: string;
  description: string;
  /** مسار داخلي بلا بادئة الموقع، يُمرَّر إلى to() */
  href: string;
  /** صور مقصوصة بخلفية شفافة تُعرض أعلى البطاقة (اختياري) */
  images?: { src: string; alt: string }[];
  /** صورة خلفية للبطاقة تعبّر عن المباراة (اختيارية، مسار داخلي) */
  backgroundImage?: string;
  /** لوحة المواجهة: صورة واحدة تجمع لاعبي المباراة مع النتيجة (تُعرض أعلى البطاقة) */
  matchupImage?: string;
  /** شعارا الفريقين (مسارات داخلية) يُعرضان بجانب شعار البطولة */
  teamBadges?: string[];
  /** نتيجة المباراة تُعرض تحت شعارَي الفريقين (اختيارية) */
  score?: string;
  /** شعار البطولة يُعرض كخلفية عميقة خافتة في البطاقة الكبيرة (رابط كامل) */
  backgroundLogo?: string;
  /** بطاقة كبيرة بتصميم الخبر المميز (عرض مزدوج وخلفية وصور) */
  featured?: boolean;
  /** شريحة التذكرة: تعرض الصورة كاملة داخل نصف الشريحة دون قصّ أو تصغير زائد */
  fullImage?: boolean;
}

export const FEATURED_NEWS: FeaturedNewsItem[] = [
  {
    category: "دوري أبطال أوروبا",
    dateLabel: "4 نوفمبر 2026",
    title: "هالاند يقود سيتي لفوز 3-2 على لايبزيغ في ألمانيا",
    description: "مانشستر سيتي يفوز 3-2 على لايبزيغ في الجولة الرابعة من دوري أبطال أوروبا، بهدف إيرلينغ هالاند في الدقيقة 78 بعد تعادلين متتاليين.",
    href: "news/manchester-city-leipzig-3-2-2026/",
    score: "2 - 3",
  },
  {
    category: "دوري أبطال أوروبا",
    dateLabel: "4 نوفمبر 2026",
    title: "ريال مدريد يفلت من فخ أثينا بفوز 3-2 بهدف فالفيردي",
    description: "ريال مدريد يفوز 3-2 على آيك أثينا بعد أن تقدم اليونانيون مرتين، بهدف فيديريكو فالفيردي في الوقت بدل الضائع، ليحافظ على سجله المثالي.",
    href: "news/real-madrid-aek-athens-3-2-2026/",
    score: "2 - 3",
  },
  {
    category: "دوري أبطال أوروبا",
    dateLabel: "4 نوفمبر 2026",
    title: "فنربخشة يقلب تأخره مرتين ويهزم ليفربول 3-2 في إسطنبول",
    description: "فنربخشة يقلب تأخره مرتين ويفوز 3-2 على ليفربول في دوري أبطال أوروبا، ليوقف سلسلة الريدز المثالية بقيادة المدرب المؤقت ديرك كويت.",
    href: "news/fenerbahce-liverpool-3-2-2026/",
    score: "3 - 2",
  },
  {
    category: "دوري أبطال أوروبا",
    dateLabel: "4 نوفمبر 2026",
    title: "كومو يكتسح لانس 9-1 ويعادل رقماً قياسياً في دوري الأبطال",
    description: "كومو يفوز 9-1 على لانس في الجولة الرابعة من دوري أبطال أوروبا، ويعادل أكبر عدد أهداف في مباراة بالبطولة، وأكبر فارق فوز بثمانية أهداف.",
    href: "news/como-lens-9-1-2026/",
    score: "1 - 9",
  },
  {
    category: "منتخبات",
    dateLabel: "5 نوفمبر 2026",
    title: "رونالدو يعلن اعتزاله دولياً مع البرتغال بعد توقف نوفمبر",
    description: "أعلن كريستيانو رونالدو (41 عاماً) اعتزاله اللعب الدولي مع البرتغال بعد التوقف الدولي في نوفمبر، بعد 234 مباراة و146 هدفاً دولياً، وهو رقم قياسي عالمياً.",
    href: "news/ronaldo-international-retirement-2026/",
  },
  {
    category: "انتقالات",
    dateLabel: "4 نوفمبر 2026",
    title: "تقارير: الهلال يعدّ عرضاً لبرونو فيرنانديز في يناير",
    description: "تقارير تفيد بأن الهلال يعدّ عرضاً بنحو 55 مليون يورو لضم برونو فيرنانديز في يناير، ونفى الصحفي بن جاكوبس وجود أي تحرك.",
    href: "news/bruno-fernandes-al-hilal-january-2026/",
fullImage: true,
images: [
  { src: "images/players/tr-bruno-fernandes-slide.webp", alt: "برونو فيرنانديز ينزلق احتفالاً بقميص مانشستر يونايتد الأحمر — الهلال يعدّ عرضاً لضمه في يناير" },
],
    teamBadges: ["images/teams/manchester-united-club-badge.webp"],
  },
  {
    category: "انتقالات",
    dateLabel: "4 نوفمبر 2026",
    title: "ريال مدريد يتفق مع جي جي غابرييل نجم يونايتد",
    description: "ريال مدريد يتوصل لاتفاق شفهي مع جي جي غابرييل، موهبة مانشستر يونايتد البالغة 16 عاماً، بعد منافسة مع برشلونة وتشيلسي وبايرن وباريس سان جيرمان، ولم يُوقَّع العقد بعد.",
    href: "news/real-madrid-jj-gabriel-agreement-2026/",
fullImage: true,
images: [
  { src: "images/players/tr-jj-gabriel-run.webp", alt: "جي جي غابرييل موهبة مانشستر يونايتد بالقميص الأحمر — ريال مدريد يتفق شفهياً معه" },
],
    teamBadges: ["images/teams/real-madrid-club-badge.webp", "images/teams/manchester-united-club-badge.webp"],
  },
  {
    category: "دوري أبطال أوروبا",
    dateLabel: "3 نوفمبر 2026",
    title: "باريس سان جيرمان يكتسح فياريال 6-0 ويسجل رباعية في 17 دقيقة",
    description: "باريس سان جيرمان يفوز 6-0 على فياريال في الجولة الرابعة من دوري أبطال أوروبا، ويسجل أربعة أهداف في 17 دقيقة، وهو الأسرع في تاريخ البطولة.",
    href: "news/psg-villarreal-6-0-2026/",
fullImage: true,
images: [
  { src: "images/players/ucl-psg-ruiz-brace.webp", alt: "فابيان رويز يحتفل بأحد هدفيه بقميص باريس سان جيرمان الأبيض في السداسية التاريخية على فياريال" },
],
    teamBadges: ["images/teams/paris-saint-germain-club-badge.webp"],
    score: "0 - 6",
  },
  {
    category: "دوري أبطال أوروبا",
    dateLabel: "3 نوفمبر 2026",
    title: "يونايتد يقلب تأخره بهدفين أمام روما ويفوز 3-2 بثنائية كونيا",
    description: "مانشستر يونايتد يقلب تأخره بهدفين أمام روما ويفوز 3-2 في أولد ترافورد، بثنائية ماثيوس كونيا وهدف برونو فيرنانديز من ركلة جزاء.",
    href: "news/man-utd-roma-3-2-2026/",
fullImage: true,
images: [
  { src: "images/players/ucl-utd-cunha-shirt.webp", alt: "ماثيوس كونيا يحمل قميص يونايتد الأحمر بيده بعد قلب التأخر بهدفين أمام روما في أولد ترافورد" },
],
    teamBadges: ["images/teams/manchester-united-club-badge.webp"],
    score: "3 - 2",
  },
  {
    category: "دوري أبطال أوروبا",
    dateLabel: "3 نوفمبر 2026",
    title: "بايرن يهزم أتلتيكو 2-0 في مدريد ونوير يتجاوز ميسي وموللر",
    description: "بايرن ميونخ يفوز 2-0 على أتلتيكو مدريد في الجولة الرابعة من دوري أبطال أوروبا، ويصعد مانويل نوير إلى المركز الثالث في عدد مباريات البطولة.",
    href: "news/bayern-atletico-2-0-2026/",
fullImage: true,
images: [
  { src: "images/players/ucl-bayern-karl-hands.webp", alt: "لينارت كارل يرفع يديه احتفالاً بهدفه الأول في فوز بايرن 2-0 على أتلتيكو مدريد" },
],
    teamBadges: ["images/teams/bayern-munich-badge.webp"],
    score: "0 - 2",
  },
  {
    category: "دوري أبطال أوروبا",
    dateLabel: "3 نوفمبر 2026",
    title: "إنتر يهزم فينورد 3-0 في روتردام ويواصل انتصاراته",
    description: "إنتر ميلان يفوز 3-0 على فينورد في روتردام ضمن الجولة الرابعة من دوري أبطال أوروبا، بأهداف بيسيك وإسبوزيتو وزيلينسكي.",
    href: "news/inter-feyenoord-3-0-2026/",
fullImage: true,
images: [
  { src: "images/players/ucl-inter-bisseck-wave.webp", alt: "يان بيسك يلوّح لجماهير إنتر بعد هدفه الافتتاحي في فوز روتردام 3-0 على فينورد" },
],
    teamBadges: ["images/teams/internazionale-club-badge.webp"],
    score: "0 - 3",
  },
  {
    category: "دوري أبطال أوروبا",
    dateLabel: "3 نوفمبر 2026",
    title: "برشلونة يستعيد توازنه بثلاثية أمام أستون فيلا في دوري الأبطال",
    description: "برشلونة يفوز 3-0 على أستون فيلا في كامب نو ضمن الجولة الرابعة من دوري أبطال أوروبا، بأهداف يامال ورافينيا (2)، ويرفع رصيده إلى 9 نقاط.",
    href: "news/barcelona-villa-3-0-2026/",
    teamBadges: ["images/teams/barcelona-club-badge.webp"],
    score: "3 - 0",
    fullImage: true,
    images: [
      { src: "images/players/esp-yamal.webp", alt: "لامين يامال يحتفل بهدف برشلونة أمام أستون فيلا" },
    ],
  },
  {
    category: "دوري روشن",
    dateLabel: "23 أكتوبر 2026",
    title: "الهلال يستعيد صدارة دوري روشن بفوز 3-2 على القادسية",
    description: "الهلال يفوز 3-2 على القادسية في الدمام ضمن الجولة الحادية عشرة من دوري روشن، ويستعيد الصدارة برصيد 27 نقطة.",
    href: "news/hilal-top-qadsiah-3-2-2026/",
fullImage: true,
images: [
  { src: "images/players/ksa-hilal-neves-qadsiah.webp", alt: "روبن نيفيز يحتفل بهدفه في فوز الهلال 3-2 على القادسية في الجولة الحادية عشرة من دوري روشن" },
],
    teamBadges: ["images/teams/al-qadsiah-club-badge.webp"],
    score: "3 - 2",
  },
  {
    category: "دوري روشن",
    dateLabel: "1 نوفمبر 2026",
    title: "إيفان توني يتصدر هدافي دوري روشن برصيد 12 هدفاً",
    description: "إيفان توني يتصدر هدافي دوري روشن برصيد 12 هدفاً بعد 9 مباريات، متقدماً بأربعة أهداف على أقرب ملاحقيه.",
    href: "news/ivan-toney-tops-roshn-scorers-2026/",
fullImage: true,
images: [
  { src: "images/players/ksa-toney-roshn-topscorer.webp", alt: "إيفان توني مهاجم الأهلي مديد الذراعين يحتفل بأهدافه وهو يتصدّر هدافي دوري روشن برصيد 12 هدفاً" },
],
  },
  {
    category: "دوري روشن",
    dateLabel: "1 نوفمبر 2026",
    title: "رونالدو يقترب من 1000 هدف بعد هاتريك أمام الخلود",
    description: "رونالدو يسجل هاتريك في فوز النصر 5-3 على الخلود ويصل إلى 985 هدفاً في مسيرته، على بعد 15 هدفاً من الألف.",
    href: "news/ronaldo-985-goals-hat-trick-2026/",
fullImage: true,
images: [
  { src: "images/players/ksa-ronaldo-985-goals.webp", alt: "كريستيانو رونالدو يشير للأعلى بعد هاتريك الخلود ليصل إلى الهدف 985 في مسيرته مع بطقم النصر الأصفر" },
],
  },
  {
    category: "دوري أبطال آسيا للنخبة",
    dateLabel: "2 نوفمبر 2026",
    title: "الأهلي يواجه السد القطري في دوري أبطال آسيا للنخبة",
    description: "الأهلي يلتقي السد القطري الاثنين 2 نوفمبر في الدوحة ضمن الجولة الرابعة من دوري أبطال آسيا للنخبة.",
    href: "news/al-ahly-al-sadd-acl-elite-2026/",
fullImage: true,
images: [
  { src: "images/players/ksa-ahli-sadd-mahrez.webp", alt: "رياض محرز مديد الذراعين يحتفل بقميص الأهلي السعودي الأسود قبيل مواجهة السد في الجولة الرابعة من دوري أبطال آسيا للنخبة" },
],
  },
  {
    category: "الدوري المصري",
    dateLabel: "1 نوفمبر 2026",
    title: "عموتة تحت الضغط بعد التعادل مع القناة",
    description: "انتقادات لعموتة وسيد معوض لطريقة لعب الأهلي بعد التعادل 3-3 مع القناة، مع تجميد مستحقات اللاعبين.",
    href: "news/ahly-umotah-pressure-2026/",
fullImage: true,
images: [
  { src: "images/players/egy-ahly-umotah-somersault.webp", alt: "لاعب الأهلي يؤدي شقلبة خلفية احتفالاً بالقميص الأحمر خلال مباراة القناة في الدوري المصري" },
],
  },
  {
    category: "الدوري المصري",
    dateLabel: "1 نوفمبر 2026",
    title: "الزمالك بقيادة معتمد جمال: 6 انتصارات في 8 مباريات",
    description: "الزمالك يحقق 6 انتصارات في أول 8 مباريات بقيادة معتمد جمال، ويحتل المركز الثاني برصيد 19 نقطة.",
    href: "news/zamalek-gamal-form-2026/",
fullImage: true,
images: [
  { src: "images/players/egy-zamalek-gamal-shout.webp", alt: "معتمد جمال المدير الفني للزمالك يكبّ كفّيه حول فمه احتفالاً بالقميص الأبيض" },
],
  },
  {
    category: "الدوري الإسباني",
    dateLabel: "31 أكتوبر 2026",
    title: "برشلونة يعود للانتصارات بسداسية أمام ألافيس",
    description: "برشلونة يكتسح ألافيس 6-1 في الجولة 11 من الدوري الإسباني، ويرتقي إلى صدارة الترتيب برصيد 30 نقطة.",
    href: "news/barcelona-alaves-6-1-2026/",
fullImage: true,
images: [
  { src: "images/players/esp-barca-yamal-fist.webp", alt: "لامين يامال يرفع قبضته احتفالاً بقميص برشلونة بعد السداسية أمام ألافيس" },
],
    teamBadges: ["images/teams/barcelona-club-badge.webp"],
    score: "6 - 1",
  },
  {
    category: "الدوري الإيطالي",
    dateLabel: "1 نوفمبر 2026",
    title: "لاتسيو يحقق أفضل بداية في تاريخه برصيد 28 نقطة",
    description: "لاتسيو يفوز 2-1 على كالياري برصيد 28 نقطة بعد 10 جولات، وهي أفضل بداية في تاريخ النادي، بهدفي إيساكسن وبينامونتي.",
    href: "news/lazio-best-start-2026/",
fullImage: true,
images: [
  { src: "images/players/ita-lazio-cataldi-start.webp", alt: "ماتيو كاتالدي لاعب لاتسيو بقميص رقم 32 يحتفل بذراعيه مفتوحتين بعد أفضل بداية في تاريخ النادي" },
],
  },
  {
    category: "الدوري الإيطالي",
    dateLabel: "1 نوفمبر 2026",
    title: "ميلان يهزم إنتر 3-1 في ديربي ميلانو",
    description: "ميلان يفوز 3-1 على إنتر في ديربي ميلانو على سان سيرو، بأهداف بوليسيتش ورابيو ومورييرا، ويرفع رصيده إلى 21 نقطة.",
    href: "news/milan-beats-inter-derby-2026/",
fullImage: true,
images: [
  { src: "images/players/ita-milan-derby-moreira.webp", alt: "كريستيان مورييرا ينزلق احتفالاً بقميص ميلان المخطط بعد فوز الديربي 3-1 على إنتر" },
],
    teamBadges: ["images/teams/internazionale-club-badge.webp"],
  },
  {
    category: "الدوري الإيطالي",
    dateLabel: "1 نوفمبر 2026",
    title: "يوفنتوس يفوز 2-0 على نابولي ويستعيد توازنه",
    description: "يوفنتوس يفوز 2-0 على نابولي في الجولة العاشرة بأهداف ألاجبوفيتش وبوغا، ويرفع رصيده إلى 17 نقطة.",
    href: "news/juventus-beats-napoli-2026/",
fullImage: true,
images: [
  { src: "images/players/ita-juventus-boga-fist.webp", alt: "جيريمي بوغا يقفز بقبضته مرفوعة احتفالاً بقميص يوفنتوس الأبيض بعد هدفه أمام نابولي" },
],
  },
  {
    category: "الدوري الألماني",
    dateLabel: "1 نوفمبر 2026",
    title: "صيباري يخضع لجراحة ناجحة وغنابري مصاب",
    description: "صيباري يخضع لجراحة ناجحة في الكاحل، وغنابري يغيب بإصابة في الفخذ الخلفي بعد كلاسيكو دورتموند.",
    href: "news/bayern-saibari-surgery-gnabry-injury-2026/",
fullImage: true,
images: [
  { src: "images/players/ger-bayern-saibari-injury.webp", alt: "ألكسندر صيباري يصرخ وأثناء إصابته بقميص بايرن ميونخ الأحمر في كلاسيكو دورتموند" },
],
    teamBadges: ["images/teams/bayern-munich-badge.webp"],
  },
  {
    category: "الدوري الألماني",
    dateLabel: "31 أكتوبر 2026",
    title: "بايرن ميونخ يتصدر الدوري الألماني بـ18 نقطة مساوياً دورتموند",
    description: "تعادل 2-2 في الكلاسيكو يبقي بايرن في الصدارة بفارق الأهداف، ودورتموند ثانياً بالرصيد نفسه.",
    href: "news/bayern-munich-top-2026/",
fullImage: true,
images: [
  { src: "images/players/ger-bayern-top-arms-open.webp", alt: "لاعب بايرن ميونخ مديد الذراعين يحتفل بالتصدر بقميص الفريق الأحمر بعد كلاسيكو دورتموند" },
],
    teamBadges: ["images/teams/bayern-munich-badge.webp"],
    score: "2 - 2",
  },
  {
    category: "الدوري الإسباني",
    dateLabel: "1 نوفمبر 2026",
    title: "ريال مدريد يفوز 3-0 على سانتاندير ويواصل انتصاراته",
    description: "مبابي يفتتح بركلة جزاء، وبيلينغهام يسجل هدفه الخمسين مع ريال مدريد في فوز الجولة الحادية عشرة.",
    href: "news/real-madrid-racing-santander-2026/",
fullImage: true,
images: [
  { src: "images/players/esp-real-mbappe-walk.webp", alt: "كيليان مبابي يمشي مبتسماً بقميص ريال مدريد الوردي بعد افتتاح التسجيل بركلة جزاء أمام راسينغ سانتاندير" },
],
    teamBadges: ["images/teams/real-madrid-club-badge.webp"],
    score: "0 - 3",
  },
  {
    category: "الدوري الإنجليزي",
    dateLabel: "1 نوفمبر 2026",
    title: "أرسنال يفوز 1-0 على ليفربول في أنفيلد وينفرد بصدارة الدوري",
    description: "هدف كاي هافيرتز في الدقيقة 16 يمنح أرسنال فوزاً ثميناً في أنفيلد، ويرفعه إلى صدارة الدوري برصيد 24 نقطة.",
    href: "news/arsenal-liverpool-1-0-2026/",
fullImage: true,
images: [
  { src: "images/players/eng-arsenal-havertz-anfield.webp", alt: "كاي هافيرتز يتحكم في الكرة بقميص أرسنال الأصفر في هدف الفوز التاريخي بأنفيلد" },
],
    teamBadges: ["images/teams/liverpool-badge.webp", "images/teams/arsenal-badge.webp"],
    score: "0 - 1",
  },
  {
    category: "دوري روشن",
    dateLabel: "29 أكتوبر 2026",
    title: "الجولة 12 من دوري روشن: رونالدو يقود النصر لفوز خماسي والقادسية يكتسح الرياض",
    description: "رونالدو يسجل هاتريك في فوز النصر 5-3 على الخلود، والقادسية يكتسح الرياض 6-0 ويعتلي الصدارة.",
    href: "news/saudi-league-round-12-2026/",
  fullImage: true,
  images: [
    { src: "images/players/ksa-ronaldo-hattrick.webp", alt: "كريستيانو رونالدو بكبضة الانتصار بعد هاتريك قاده للفوز على الخلود 5-3 في الجولة 12 من دوري روشن" },
  ],
  },
  {
    category: "الدوري المصري",
    dateLabel: "29 أكتوبر 2026",
    title: "ملخص الجولة الثامنة من الدوري المصري: بيراميدز يواصل الصدارة والأهلي يعود للفوز",
    description: "بيراميدز يحقق الفوز الثامن توالياً، والأهلي يعود للانتصار، والزمالك يفوز على المقاولون في لقاءات الأربعاء والخميس.",
    href: "news/egyptian-league-matchday-8-2026/",
  fullImage: true,
  images: [
    { src: "images/players/egy-ahly-round8-celebration.webp", alt: "لاعبو الأهلي يحتفلون بهدف عمر الساعي في فوز الجولة الثامنة على مودرن سبورت" },
  ],
  },
  {
    category: "الدوري الإنجليزي",
    dateLabel: "28 أكتوبر 2026",
    title: "كاريك وبرونو فرنانديز يجريان جلسة مصارحة بعد الاستبعاد",
    description: "لقاء في كارينغتون لتصفية الأجواء بعد إبقاء فرنانديز على مقاعد البدلاء أمام بورنموث.",
    href: "news/carrick-fernandes-talks-2026/",
    fullImage: true,
    images: [
      { src: "images/players/eng-bruno-bench-snub.webp", alt: "برونو فرنانديز بيده على رأسه بنظرة مطفأة بعد إبقاؤه على مقاعد البدلاء في مواجهة بورنموث" },
    ],
    },
  {
    category: "كأس الرابطة الإنجليزية",
    dateLabel: "28 أكتوبر 2026",
    title: "مواجهة الليلة: ليفربول ضد تشيلسي في كأس الرابطة الإنجليزية",
    description: "تبدأ المباراة الساعة 8 مساءً بتوقيت غرينتش في أنفيلد ضمن الدور الرابع.",
    href: "news/liverpool-chelsea-carabao-cup-preview-2026/",
    fullImage: true,
    images: [
      { src: "images/players/eng-iraola-alonso-duel.webp", alt: "إيرولا وألونسو في مواجهة المدربين قبل قمة ليفربول وتشيلسي في الدور الرابع من كأس الرابطة على أنفيلد" },
    ],
  },
  {
    category: "كأس الرابطة الإنجليزية",
    dateLabel: "27 أكتوبر 2026",
    title: "صدمة: أرسنال يودّع كأس الرابطة أمام فليتوود تاون بركلات الترجيح",
    description: "فليتوود من الدرجة الرابعة يفوز 5-3 بركلات الترجيح بعد التعادل 1-1، وطرد داومان في الدقيقة 85.",
    href: "news/arsenal-fleetwood-carabao-cup-2026/",
    fullImage: true,
    images: [
      { src: "images/players/eng-arteta-fleetwood-exit.webp", alt: "ميكيل أرتيتا بأكتاف متقاطعة ونظرة فارغة بعد خروج أرسنال من كأس الرابطة أمام فليتوود تاون بركلات الترجيح" },
    ],
    },
  {
    category: "الدوري الإسباني",
    dateLabel: "27 أكتوبر 2026",
    title: "أزمة مبابي في الصين: شركات تنهي تعاقداتها وبث الليغا يتوقف",
    description: "شركات صينية تنهي تعاقداتها مع مبابي بعد تعليق ساخر عن ماو، والتلفزيون الصيني يوقف بث الليغا.",
    href: "news/mbappe-china-sponsors-2026/",
    fullImage: true,
    images: [
      { src: "images/players/esp-mbappe-china-apology.webp", alt: "كيليان مبابي برأس منخفض وكفّين متضامتين في لحظة الاعتذار بعد انسحاب الرعاة الصينيين" },
    ],
    },
  {
    category: "الدوري الإسباني",
    dateLabel: "27 أكتوبر 2026",
    title: "برشلونة يُغرَّم 602 يورو في قضية خوليان ألفاريز",
    description: "الاتحاد الإسباني يغرّم برشلونة بعد شكوى أتلتيكو مدريد بشأن التواصل مع خوليان ألفاريز دون إخطار.",
    href: "news/barcelona-alvarez-fine-2026/",
    fullImage: true,
    images: [
      { src: "images/players/esp-alvarez-regret.webp", alt: "خوليان ألفاريز بيديه على رأسه نادما بعد قضية التواصل مع برشلونة وغرامة الاتحاد الإسباني" },
    ],
    },
  {
    category: "الدوري التركي",
    dateLabel: "27 أكتوبر 2026",
    title: "استقالة مدرب فنربخشة إسماعيل كارتال بعد الخسارة أمام غلطة سراي",
    description: "فنربخشة ينهي ارتباطه بالمدرب بالتراضي بعد خسارته 1-2 أمام غلطة سراي في ديربي القارات.",
    href: "news/fenerbahce-kartal-resignation-2026/",
    fullImage: true,
    images: [
      { src: "images/players/tur-kartal-resignation.webp", alt: "إسماعيل كارتال مدرب فنربخشة بأكتاف متقاطعة ونظرة عابسة بعد الاستقالة عقب خسارة ديربي غلطة سراي" },
    ],
  },
  {
    category: "الكرة الذهبية",
    dateLabel: "26 أكتوبر 2026",
    title: "الكرة الذهبية 2026: هاري كين يفوز بالجائزة وبوتيلاس تتوج للمرة الثالثة",
    description: "هاري كين أول إنجليزي يفوز بالكرة الذهبية منذ مايكل أوين عام 2001، وألكسيا بوتيلاس تفوز بكرة الذهب للسيدات للمرة الثالثة.",
    href: "news/ballon-dor-2026-winners/",
    fullImage: true,
    images: [
      { src: "images/players/ballondor-kane-wins.webp", alt: "هاري كين يحتضن كأس الكرة الذهبية بعد تتويجه أفضل لاعب في العالم" },
    ],
  },
  {
    category: "الكرة الذهبية",
    dateLabel: "26 أكتوبر 2026",
    title: "الكرة الذهبية 2026: ما قبل الحفل وكيف انتهت الليلة",
    description: "كين يفوز بالكرة الذهبية للرجال، وبوتيلاس تفوز بها للمرة الثالثة للسيدات، ومراجعة المرشحين والغيابات قبل الحفل.",
    href: "news/ballon-dor-2026-ceremony-preview/",
    fullImage: true,
    images: [
      { src: "images/players/ballondor-golden-trophy.webp", alt: "كأس الكرة الذهبية على منصتها قبل الحفل في مسرح لندن بالاديوم" },
    ],
  },
  {
    category: "دوري أبطال آسيا للنخبة",
    dateLabel: "27 أكتوبر 2026",
    title: "الشمال يفوز على الهلال 3-1 في دوري أبطال آسيا للنخبة",
    description: "فوز الشمال 3-1 على استاد البيت، بعد تعادل 1-1 في الشوط الأول بهدفي ويسلي سعيد والدوسري.",
    href: "news/hilal-shamal-first-half-2026/",
    fullImage: true,
    images: [
      { src: "images/players/ksa-hilal-fulltime-reaction.webp", alt: "سالم الدوسري يقود قميص الهلال بيديه على رأسه بعد صافرة نهاية خسارة الشمال 3-1 في دوري أبطال آسيا" },
    ],
  },
  {
    category: "الدوري التركي",
    dateLabel: "26 أكتوبر 2026",
    title: "طرابزون سبور يفوز على ريزة سبور 4-3 ويصعد للمركز الثالث",
    description: "فوز مثير لطرابزون سبور بقيادة محمد صلاح، وصعود للمركز الثالث برصيد 19 نقطة.",
    href: "news/trabzonspor-rizespor-4-3-2026/",
    fullImage: true,
    images: [
      { src: "images/players/tur-franculino-duo-celebration.webp", alt: "فرانكولينو صاحب ثنائية ريزة يحتفل بكف مرفوع مع قائد طرابزون سبور بعد فوز 4-3" },
    ],
  },
  {
    category: "الدوري الفرنسي",
    dateLabel: "26 أكتوبر 2026",
    title: "باريس سان جيرمان يهزم ليون 2-0 ويتصدر الدوري الفرنسي",
    description: "هدفا مايولو وغودتس من البدلاء يمنحان باريس سان جيرمان الفوز في حديقة الأمراء، وعودته إلى صدارة الترتيب.",
    href: "news/psg-lyon-2-0/",
    fullImage: true,
    images: [
      { src: "images/players/fra-psg-mayulu-godts-goals.webp", alt: "مايولو وجودتس يحتفلان بهدفا فوز باريس سان جيرمان على ليون 2-0" },
    ],
  },
  {
    category: "الدوري الفرنسي",
    dateLabel: "26 أكتوبر 2026",
    title: "مواجهة الليلة: باريس سان جيرمان ضد ليون في الدوري الفرنسي",
    description: "تنطلق المباراة الساعة 8:30 مساءً بتوقيت باريس في حديقة الأمراء، بعد تأجيلها من الأحد.",
    href: "news/psg-lyon-tonight/",
    fullImage: true,
    images: [
      { src: "images/players/fra-psg-lyon-duel.webp", alt: "فوفانا وفران توريس في مواجهة قمة الدوري الفرنسي" },
    ],
  },
  {
    category: "الدوري الإسباني",
    dateLabel: "25 أكتوبر 2026",
    title: "الكلاسيكو: ردود الفعل بعد فوز ريال مدريد 2-1 على برشلونة",
    description: "مورينيو وفليك يعلقان على الكلاسيكو في كامب نو، وتصريحات مورينيو عن تقنية الفيديو، وإصابات برشلونة بعد المباراة.",
    href: "news/clasico-post-match-reactions-2026/",
    teamBadges: ["images/teams/barcelona-club-badge.webp", "images/teams/real-madrid-club-badge.webp"],
    score: "1 - 2",
    fullImage: true,
    images: [
      { src: "images/players/esp-mourinho-flick-reactions.webp", alt: "مورينيو يحتفل بهدف مبابي الحاسم وفليك غاضب في كلاسيكو كامب نو" },
    ],
  },
  {
    category: "الدوري الإسباني",
    dateLabel: "25 أكتوبر 2026",
    title: "الكلاسيكو: ريال مدريد يفوز 2-1 على برشلونة بهدفي مبابي",
    description: "مبابي يسجل في الدقيقة 41 و87 في كامب نو، وأول خسارة لبرشلونة في الدوري هذا الموسم.",
    href: "news/clasico-first-half-2026/",
    teamBadges: ["images/teams/barcelona-club-badge.webp", "images/teams/real-madrid-club-badge.webp"],
    score: "1 - 2",
    fullImage: true,
    images: [
      { src: "images/players/esp-mbappe-goal.webp", alt: "مبابي يحتفل بهدفه في الشوط الأول من الكلاسيكو" },
    ],
  },
  {
    category: "الدوري الإسباني",
    dateLabel: "25 أكتوبر 2026",
    title: "الكلاسيكو: غيابات برشلونة وريال مدريد وترشيحات المباراة",
    description: "قبل المباراة: غيابات الفريقين وترشيحات الكلاسيكو، وقد انتهت بفوز ريال مدريد 2-1.",
    href: "news/clasico-preview-absences-predictions/",
    fullImage: true,
    images: [
      { src: "images/players/esp-clasico-duel.webp", alt: "يامال ومبابي في مواجهة الكلاسيكو" },
    ],
  },
  {
    category: "الدوري الإنجليزي",
    dateLabel: "25 أكتوبر 2026",
    title: "ليفربول يفوز 2-0 على برايتون في أنفيلد",
    description: "هدف عكسي لغروس وهدف لإيساك، وليفربول يصعد إلى المركز الرابع.",
    href: "news/liverpool-brighton-live/",
    teamBadges: ["images/teams/brighton-badge.webp", "images/teams/liverpool-badge.webp"],
    score: "2 - 0",
    fullImage: true,
    images: [
      { src: "images/players/eng-liv-goal-scene.webp", alt: "إيساك يحتفل بهدفه الثاني في أنفيلد وباركولا خلفه" },
    ],
  },
  {
    category: "الدوري الإنجليزي",
    dateLabel: "25 أكتوبر 2026",
    title: "بورنموث يهزم مانشستر يونايتد 3-0 في أولد ترافورد",
    description: "رايان وتافرنييه وإيفانيلسون يسجلون، وكاريك تحت الضغط بعد ثماني مباريات بلا فوز.",
    href: "news/man-utd-bournemouth-live/",
    teamBadges: ["images/teams/bournemouth-badge.webp", "images/teams/manchester-united-club-badge.webp"],
    score: "0 - 3",
    fullImage: true,
    images: [
      { src: "images/players/eng-bou-duo-celebration.webp", alt: "رايان وتافيرنييه يحتفلان بتقدم بورنموث 2-0 في أولد ترافورد" },
    ],
  },
  {
    category: "الدوري الألماني",
    dateLabel: "25 أكتوبر 2026",
    title: "بايرن يعود للصدارة بفوز 3-1 على فرايبورغ",
    description: "أوباميكانو وغنابري وأوليس يسجلون، وبيشوف يضيف هدفاً في مرماه، وكومباني خارج الخط.",
    href: "news/bundesliga-bayern-freiburg-2026/",
    fullImage: true,
    images: [
      { src: "images/players/ger-gnabry-upa-celebration.webp", alt: "غنابري وأوباميكانو يحتفلان بفوز بايرن على فرايبورغ" },
    ],
  },
  {
    category: "الدوري الإيطالي",
    dateLabel: "25 أكتوبر 2026",
    title: "إنتر يقلب على فيورنتينا 2-1 بهدفين في الوقت بدل الضائع",
    description: "تقدم فيورنتينا بهدف لخيمينيز، ثم عادل ثورام وحسم زيلينسكي بركلة جزاء في سان سيرو.",
    href: "news/inter-fiorentina-2-1/",
    teamBadges: ["images/teams/fiorentina-badge.webp", "images/teams/internazionale-club-badge.webp"],
    score: "2 - 1",
    fullImage: true,
    images: [
      { src: "images/players/ita-inter-group-celebration.webp", alt: "ثورام وزيلينسكي يحتفلان بهدفَي قلب النتيجة على فيورنتينا" },
    ],
  },
  {
    category: "الدوري الألماني",
    dateLabel: "24 أكتوبر 2026",
    title: "دورتموند يتصدر بفوزه على فرانكفورت 1-0",
    description: "هدف مكسيميليان بايير في الدقيقة 80 يمنح دورتموند صدارة الدوري الألماني.",
    href: "news/bundesliga-dortmund-frankfurt-2026/",
    fullImage: true,
    images: [
      { src: "images/players/ger-dortmund-beier-celebration.webp", alt: "ماكسيميليان باير وجوبي بيلينغهام يحتفلان بهدف الفوز على فرانكفورت" },
    ],
  },
  {
    category: "الدوري الإنجليزي",
    dateLabel: "24 أكتوبر 2026",
    title: "توتنهام يهزم تشيلسي 2-0 بهدف عكسي وهدف لتيل",
    description: "طرد كول بالمر في الدقيقة 80، وتيل يحسم الفوز في ستامفورد بريدج.",
    href: "news/tottenham-chelsea-2-0/",
    teamBadges: ["images/teams/tottenham-badge.webp", "images/teams/chelsea-badge.webp"],
    score: "0 - 2",
    images: [
      { src: "images/players/eng-tel-trio-celebration-v2.webp", alt: "ماتيس تيل ولاعبو توتنهام يحتفلون" },
    ],
    fullImage: true,
  },
  {
    category: "الدوري الإنجليزي",
    dateLabel: "24 أكتوبر 2026",
    title: "أستون فيلا يهزم مانشستر سيتي 2-1 بثنائية جاكسون",
    description: "فوز في فيلا بارك ينهي بداية سيتي المثالية في الدوري، وجاكسون يسجل هدفين.",
    href: "news/man-city-aston-villa/",
    teamBadges: ["images/teams/manchester-city-badge.webp", "images/teams/aston-villa-badge.webp"],
    score: "2 - 1",
    images: [
      { src: "images/players/eng-jackson-celebration.webp", alt: "نيكولاس جاكسون يحتفل" },
    ],
  },
  {
    category: "الدوري الألماني",
    dateLabel: "23 أكتوبر 2026",
    title: "كومباني في المستشفى بعد انهياره في تدريب بايرن",
    description: "المدرب فينسنت كومباني في المستشفى بعد انهياره خلال التدريب، وحالته مستقرة.",
    href: "news/bundesliga-kompany-hospitalized-2026/",
    fullImage: true,
    images: [
      { src: "images/players/ger-kompany-support-wave.webp", alt: "فينسان كومباني يلوّح للجماهير شكراً على رسائل الدعم خلال فترة العلاج" },
    ],
  },
  {
    category: "دوري أبطال أوروبا",
    dateLabel: "21 أكتوبر 2026",
    title: "بايرن ميونخ وأرسنال يتعادلان 2-2 بهدف متأخر لرايس",
    description: "تقدم بايرن بركلة جزاء لكين، ثم عادل رايس قبل النهاية بعشر دقائق.",
    href: "news/bayern-arsenal-2-2/",
    featured: true,
    backgroundLogo: "images/brand/ucl-logo-white.png",
    teamBadges: ["images/teams/bayern-munich-badge.webp", "images/teams/arsenal-badge.webp"],
    score: "2 - 2",
    backgroundImage: "images/news/bayern-arsenal-2-2.jpg",
    images: [
      { src: "images/players/ger-kane.webp", alt: "هاري كين" },
      { src: "images/players/eng-rice.webp", alt: "ديكلان رايس" },
    ],
  },
  {
    category: "دوري أبطال أوروبا",
    dateLabel: "20 أكتوبر 2026",
    title: "باريس سان جيرمان يهزم برشلونة 4-2 ويكسر سجله المثالي",
    description: "ستة أهداف في ملعب الأمير، وأول خسارة لبرشلونة هذا الموسم في أي مسابقة.",
    href: "news/psg-barcelona-4-2/",
    featured: true,
    backgroundLogo: "images/brand/ucl-logo-white.png",
    teamBadges: ["images/teams/barcelona-badge.webp", "images/teams/paris-saint-germain-badge.webp"],
    score: "4 - 2",
    backgroundImage: "images/news/psg-barcelona-4-2.jpg",
    images: [
      { src: "images/players/esp-yamal-sad.webp", alt: "لامين جمال حزيناً" },
      { src: "images/players/esp-flick-angry.webp", alt: "هانز فليك غاضباً" },
      { src: "images/players/fra-dembele-celebration.webp", alt: "عثمان ديمبيلي يحتفل" },
      { src: "images/players/fra-enrique-triumph.png", alt: "لويس إنريكي يحتفل" },
    ],
  },
];
