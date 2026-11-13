/**
 * Maintained Arabic display names for teams returned by the match feeds.
 * Keys may include provider spellings/aliases; normalization is applied at load.
 * Unknown teams intentionally retain the provider name instead of receiving a
 * misleading letter-by-letter transliteration.
 */
export function normalizeTeamAlias(value: string): string {
  return value.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\u0600-\u06ff]+/g, " ").trim();
}

const aliases: Record<string, string> = {
  // National teams — Arabic country names, not phonetic renderings of English.
  "Algeria": "الجزائر", "Andorra": "أندورا", "Anguilla": "أنغويلا", "Argentina": "الأرجنتين", "Australia": "أستراليا",
  "Austria": "النمسا", "Azerbaijan": "أذربيجان", "Bahrain": "البحرين", "Benin": "بنين", "Bolivia": "بوليفيا",
  "Botswana": "بوتسوانا", "Brazil": "البرازيل", "Bulgaria": "بلغاريا", "Burkina Faso": "بوركينا فاسو", "Cameroon": "الكاميرون", "Canada": "كندا", "Burundi": "بوروندي", "Bermuda": "برمودا",
  "Chile": "تشيلي", "China": "الصين", "Chinese Taipei": "تايبيه الصينية", "Colombia": "كولومبيا", "Comoros": "جزر القمر",
  "Congo DR": "الكونغو الديمقراطية", "Costa Rica": "كوستاريكا", "Djibouti": "جيبوتي", "Dominica": "دومينيكا",
  "Dominican Republic": "جمهورية الدومينيكان", "Ecuador": "الإكوادور", "Egypt": "مصر", "Eswatini": "إسواتيني",
  "Fiji": "فيجي", "France": "فرنسا", "Gambia": "غامبيا", "Germany": "ألمانيا", "Gibraltar": "جبل طارق",
  "Honduras": "هندوراس", "India": "الهند", "Indonesia": "إندونيسيا", "Iran": "إيران", "Iraq": "العراق",
  "Ivory Coast": "ساحل العاج", "Japan": "اليابان", "Jordan": "الأردن", "Kenya": "كينيا", "Kuwait": "الكويت",
  "Kyrgyz Republic": "قيرغيزستان", "Lebanon": "لبنان", "Liechtenstein": "ليختنشتاين", "Lithuania": "ليتوانيا",
  "Malaysia": "ماليزيا", "Maldives": "المالديف", "Mali": "مالي", "Malta": "مالطا", "Mauritius": "موريشيوس",
  "Mexico": "المكسيك", "Morocco": "المغرب", "Mozambique": "موزمبيق", "Namibia": "ناميبيا", "New Caledonia": "كاليدونيا الجديدة",
  "New Zealand": "نيوزيلندا", "Niger": "النيجر", "Nigeria": "نيجيريا", "Palestine": "فلسطين", "Panama": "بنما",
  "Cook Islands": "جزر كوك", "Tahiti": "تاهيتي", "Sri Lanka": "سريلانكا", "Suriname": "سورينام",
  "Moldova": "مولدوفا", "Kazakhstan": "كازاخستان", "Estonia": "إستونيا", "North Macedonia": "مقدونيا الشمالية", "Faroe Islands": "جزر فارو",
  "Ethiopia": "إثيوبيا", "Mauritania": "موريتانيا", "Cape Verde": "الرأس الأخضر", "Cabo Verde": "الرأس الأخضر", "Liberia": "ليبيريا",
  "Gabon": "الغابون", "Lesotho": "ليسوتو", "Malawi": "مالاوي", "Libya": "ليبيا", "Aruba": "أروبا", "Martinique": "مارتينيك",
  "Antigua and Barbuda": "أنتيغوا وباربودا", "Trinidad and Tobago": "ترينيداد وتوباغو", "Curaçao": "كوراساو",
  "St. Lucia": "سانت لوسيا", "Puerto Rico": "بورتوريكو", "Grenada": "غرينادا", "St. Kitts and Nevis": "سانت كيتس ونيفيس",
  "Papua New Guinea": "بابوا غينيا الجديدة", "Paraguay": "باراغواي", "Peru": "بيرو", "Qatar": "قطر", "Russia": "روسيا",
  "Rwanda": "رواندا", "Sao Tome and Principe": "ساو تومي وبرينسيبي", "Saudi Arabia": "السعودية", "Senegal": "السنغال",
  "Seychelles": "سيشل", "Singapore": "سنغافورة", "Solomon Islands": "جزر سليمان", "South Africa": "جنوب أفريقيا",
  "South Korea": "كوريا الجنوبية", "Korea Republic": "كوريا الجنوبية", "United States": "الولايات المتحدة", "USA": "الولايات المتحدة",
  "Uruguay": "أوروغواي", "Uzbekistan": "أوزبكستان", "Vanuatu": "فانواتو", "Venezuela": "فنزويلا", "Vietnam": "فيتنام",
  "Yemen": "اليمن", "Spain": "إسبانيا", "Portugal": "البرتغال", "England": "إنجلترا", "Scotland": "إسكتلندا",
  "Wales": "ويلز", "Netherlands": "هولندا", "Belgium": "بلجيكا", "Switzerland": "سويسرا", "Italy": "إيطاليا",
  "Croatia": "كرواتيا", "Denmark": "الدنمارك", "Greece": "اليونان", "Ireland": "أيرلندا", "Northern Ireland": "أيرلندا الشمالية",
  "Norway": "النرويج", "Poland": "بولندا", "Romania": "رومانيا", "Serbia": "صربيا", "Slovakia": "سلوفاكيا",
  "Slovenia": "سلوفينيا", "Sweden": "السويد", "Turkey": "تركيا", "Türkiye": "تركيا", "Ukraine": "أوكرانيا",
  "United Arab Emirates": "الإمارات", "UAE": "الإمارات", "North Korea": "كوريا الشمالية", "Thailand": "تايلاند",
  "Syria": "سوريا", "Sudan": "السودان", "Tunisia": "تونس", "Oman": "عُمان", "Czechia": "التشيك",
  "Czech Republic": "التشيك", "Hungary": "المجر", "Finland": "فنلندا", "Iceland": "آيسلندا", "Luxembourg": "لوكسمبورغ",
  "Jamaica": "جامايكا", "El Salvador": "السلفادور", "Guatemala": "غواتيمالا", "Haiti": "هايتي", "Cuba": "كوبا",
  "Tajikistan": "طاجيكستان", "Turkmenistan": "تركمانستان", "Uganda": "أوغندا", "Tanzania": "تنزانيا", "Zimbabwe": "زيمبابوي",
  "Ghana": "غانا", "Côte d'Ivoire": "ساحل العاج", "Congo": "الكونغو", "Equatorial Guinea": "غينيا الاستوائية",
  "Guinea": "غينيا", "Guinea-Bissau": "غينيا بيساو", "Sierra Leone": "سيراليون", "Togo": "توغو", "Zambia": "زامبيا",

  // Club teams from the supported English, Spanish, German, Italian and French leagues.
  "AFC Bournemouth": "بورنموث", "Arsenal": "أرسنال", "Aston Villa": "أستون فيلا", "Brentford": "برينتفورد",
  "Brighton & Hove Albion": "برايتون", "Brighton": "برايتون", "Chelsea": "تشيلسي", "Coventry City": "كوفنتري سيتي",
  "Crystal Palace": "كريستال بالاس", "Everton": "إيفرتون", "Fulham": "فولهام", "Hull City": "هال سيتي",
  "Ipswich Town": "إيبسويتش تاون", "Ipswich": "إيبسويتش تاون", "Leeds United": "ليدز يونايتد", "Liverpool": "ليفربول",
  "Manchester City": "مانشستر سيتي", "Manchester United": "مانشستر يونايتد", "Newcastle United": "نيوكاسل يونايتد",
  "Nottingham Forest": "نوتنغهام فورست", "Sunderland": "سندرلاند", "Tottenham Hotspur": "توتنهام هوتسبير",
  "Tottenham": "توتنهام", "Plymouth Parkway": "بليموث باركواي", "Berkhamsted": "بيركهامستيد",
  "Alavés": "ألافيس", "Alaves": "ألافيس", "Athletic Club": "أتلتيك بلباو", "Atlético Madrid": "أتلتيكو مدريد",
  "Atletico Madrid": "أتلتيكو مدريد", "Barcelona": "برشلونة", "Celta Vigo": "سيلتا فيغو", "Deportivo": "ديبورتيفو لاكورونيا",
  "Elche": "إلتشي", "Espanyol": "إسبانيول", "Getafe": "خيتافي", "Levante": "ليفانتي", "Málaga": "مالاغا",
  "Malaga": "مالاغا", "Osasuna": "أوساسونا", "Racing Santander": "راسينغ سانتاندير", "Rayo Vallecano": "رايو فايكانو",
  "Real Betis": "ريال بيتيس", "Real Madrid": "ريال مدريد", "Real Sociedad": "ريال سوسيداد", "Sevilla": "إشبيلية",
  "Valencia": "فالنسيا", "Villarreal": "فياريال", "1. FC Union Berlin": "يونيون برلين", "Union Berlin": "يونيون برلين",
  "Bayer Leverkusen": "باير ليفركوزن", "Bayern Munich": "بايرن ميونخ", "Borussia Dortmund": "بوروسيا دورتموند",
  "Borussia Mönchengladbach": "بوروسيا مونشنغلادباخ", "Borussia Monchengladbach": "بوروسيا مونشنغلادباخ",
  "Eintracht Frankfurt": "آينتراخت فرانكفورت", "FC Augsburg": "أوغسبورغ", "FC Cologne": "كولن", "Cologne": "كولن",
  "Hamburg SV": "هامبورغ", "Mainz": "ماينز", "RB Leipzig": "لايبزيغ", "SC Freiburg": "فرايبورغ",
  "SC Paderborn 07": "بادربورن", "SV Elversberg": "إلفرسبرغ", "Schalke 04": "شالكه", "TSG Hoffenheim": "هوفنهايم",
  "VfB Stuttgart": "شتوتغارت", "Werder Bremen": "فيردر بريمن", "AC Milan": "ميلان", "AS Roma": "روما",
  "Atalanta": "أتالانتا", "Bologna": "بولونيا", "Cagliari": "كالياري", "Como": "كومو", "Fiorentina": "فيورنتينا",
  "Frosinone": "فروزينوني", "Genoa": "جنوى", "Internazionale": "إنتر ميلان", "Inter": "إنتر ميلان", "Juventus": "يوفنتوس",
  "Lazio": "لاتسيو", "Lecce": "ليتشي", "Monza": "مونزا", "Napoli": "نابولي", "Parma": "بارما",
  "Sassuolo": "ساسولو", "Torino": "تورينو", "Udinese": "أودينيزي", "Venezia": "فينيتسيا",
  "AJ Auxerre": "أوكسير", "AS Monaco": "موناكو", "Angers": "أنجيه", "Brest": "بريست", "Le Havre AC": "لوهافر",
  "Le Mans": "لو مان", "Lens": "لانس", "Lille": "ليل", "Lorient": "لورين", "Lyon": "ليون",
  "Marseille": "مارسيليا", "Nice": "نيس", "Paris FC": "باريس إف سي", "Paris Saint-Germain": "باريس سان جيرمان",
  "Stade Rennais": "رين", "Strasbourg": "ستراسبورغ", "Toulouse": "تولوز", "Troyes": "تروا",

  // Egyptian Premier League clubs.
  "Olympic El Qanah": "القناة", "Al-Masry SC": "المصري", "Zamalek SC": "الزمالك", "Zamalek": "الزمالك",
  "Al Ahly": "الأهلي", "El Mokawloon": "المقاولون العرب", "ZED FC": "زد", "Modern Sport": "مودرن سبورت",
  "Enppi": "إنبي", "Al Assiouty Sport": "بيراميدز", "Ceramica Cleopatra": "سيراميكا كليوباترا", "Smouha SC": "سموحة",
  "Ghazl El Mehalla": "غزل المحلة", "Abu Qair Semad": "أبو قير للأسمدة", "Asyut Petroleum": "بترول أسيوط",
  "National Bank of Egypt": "البنك الأهلي", "El Geish": "طلائع الجيش", "Al Ittihad": "الاتحاد السكندري",
  "El Gouna": "الجونة", "Petrojet": "بتروجت", "Wadi Degla": "وادي دجلة",

  // Frequently appearing continental competitions.
  "AEK Athens": "آيك أثينا", "Bodo/Glimt": "بودو غليمت", "Bodø/Glimt": "بودو غليمت", "Club Brugge": "كلوب بروج",
  "FC Porto": "بورتو", "Fenerbahce": "فنربخشة", "Fenerbahçe": "فنربخشة", "Feyenoord Rotterdam": "فينورد",
  "Galatasaray": "غلطة سراي", "LASK Linz": "لاسك لينتس", "PSV Eindhoven": "آيندهوفن", "Sabah FK": "ساباه",
  "Shakhtar Donetsk": "شاختار دونيتسك", "Slavia Prague": "سلافيا براغ", "Slovan Bratislava": "سلوفان براتيسلافا",
  "Sporting CP": "سبورتينغ لشبونة", "Viking FK": "فايكنغ", "AZ Alkmaar": "ألكمار", "Anderlecht": "أندرلخت",
  "Ararat-Armenia": "أرارات أرمينيا", "Benfica": "بنفيكا", "Besiktas": "بشكتاش", "Beşiktaş": "بشكتاش", "Celtic": "سيلتيك",
  "Dinamo Zagreb": "دينامو زغرب", "Ferencvaros": "فيرينتسفاروش", "Ferencváros": "فيرينتسفاروش", "Hapoel Be'er": "هبوعيل بئر السبع",
  "Jagiellonia Bialystok": "ياجيلونيا بياويستوك", "Lech Poznan": "ليخ بوزنان", "Levski Sofia": "ليفسكي صوفيا",
  "Lillestrom": "ليلستروم", "Lillestrøm": "ليلستروم", "NEC Nijmegen": "إن إي سي نايميخن", "NK Celje": "تسيليه",
  "OFI Crete": "أوفي كريت", "Olympiacos": "أولمبياكوس", "Omonia Nicosia": "أومونيا نيقوسيا", "RB Salzburg": "ريد بول سالزبورغ",
  "SK Sturm Graz": "شتورم غراتس", "Sparta Prague": "سبارتا براغ", "Union St.-Gilloise": "يونيون سان جيلواز",
  "Viktoria Plzen": "فيكتوريا بلزن", "Viktoria Plzeň": "فيكتوريا بلزن", "Torreense": "تورينسي",
  // Deliberate test fixtures; these aliases are harmless if such labels are ever supplied.
  "Club X": "كلوب إكس", "Club Y": "كلوب واي",
};

const normalizedAliases = new Map(Object.entries(aliases).map(([alias, arabic]) => [normalizeTeamAlias(alias), arabic]));

export function arabicTeamName(name: string): string {
  if (/[\u0600-\u06ff]/.test(name)) return name;
  return normalizedAliases.get(normalizeTeamAlias(name)) ?? name;
}
