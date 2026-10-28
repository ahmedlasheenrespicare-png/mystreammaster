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
    category: "الدوري الإنجليزي",
    dateLabel: "28 أكتوبر 2026",
    title: "كاريك وبرونو فرنانديز يجريان جلسة مصارحة بعد الاستبعاد",
    description: "لقاء في كارينغتون لتصفية الأجواء بعد إبقاء فرنانديز على مقاعد البدلاء أمام بورنموث.",
    href: "news/carrick-fernandes-talks-2026/",
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
