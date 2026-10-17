/*
 * Follow-up Premier League fixtures received from the user's scoreboard.php output.
 * Values retain the event id, UTC kickoff, event name, venue and source team IDs/names.
 * The assistant did not call the endpoint or independently verify the payload.
 */
export const MATCH_CENTER_ENGLISH_20261018_20261023_RANGES = [
  {
    dates: '20261018-20261023',
    complete: true,
    events: [
      ['401879263', '2026-10-18T13:00Z', 'Sunderland at AFC Bournemouth', 'Vitality Stadium', '349', 'AFC Bournemouth', '366', 'Sunderland'],
      ['401879261', '2026-10-18T13:00Z', 'Crystal Palace at Brighton & Hove Albion', 'American Express Stadium', '331', 'Brighton & Hove Albion', '384', 'Crystal Palace'],
      ['401879260', '2026-10-18T13:00Z', 'Manchester United at Leeds United', 'Elland Road', '357', 'Leeds United', '360', 'Manchester United'],
      ['401878769', '2026-10-18T15:30Z', 'Arsenal at Nottingham Forest', 'The City Ground', '393', 'Nottingham Forest', '359', 'Arsenal'],
      ['401879257', '2026-10-19T19:00Z', 'Coventry City at Tottenham Hotspur', 'Tottenham Hotspur Stadium', '367', 'Tottenham Hotspur', '388', 'Coventry City'],
      ['401879253', '2026-10-23T19:00Z', 'Nottingham Forest at Ipswich Town', 'Portman Road', '373', 'Ipswich Town', '393', 'Nottingham Forest'],
    ],
  },
];

export const MATCH_CENTER_ENGLISH_20261018_20261023_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة 20261018-20261023، وفيها 6 أحداث مجدولة. لم ينفذ المساعد طلب API ولم يتحقق استقلالياً من المصدر.',
  receivedRanges: MATCH_CENTER_ENGLISH_20261018_20261023_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20261018_20261023_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20261018_20261023_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};

export const MATCH_CENTER_ENGLISH_20261024_20261030_RANGES = [
  {
    dates: '20261024-20261030',
    complete: true,
    events: [
      ['401879256', '2026-10-24T11:30Z', 'Manchester City at Aston Villa', 'Villa Park', '362', 'Aston Villa', '382', 'Manchester City'],
      ['401878768', '2026-10-24T14:00Z', 'Everton at Arsenal', 'Emirates Stadium', '359', 'Arsenal', '368', 'Everton'],
      ['401879255', '2026-10-24T14:00Z', 'Fulham at Coventry City', 'Coventry Building Society Arena', '388', 'Coventry City', '370', 'Fulham'],
      ['401878767', '2026-10-24T16:30Z', 'Tottenham Hotspur at Chelsea', 'Stamford Bridge', '363', 'Chelsea', '367', 'Tottenham Hotspur'],
      ['401879254', '2026-10-25T14:00Z', 'Newcastle United at Crystal Palace', 'Selhurst Park', '384', 'Crystal Palace', '361', 'Newcastle United'],
      ['401878766', '2026-10-25T14:00Z', 'Brentford at Hull City', 'The MKM Stadium', '306', 'Hull City', '337', 'Brentford'],
      ['401878765', '2026-10-25T14:00Z', 'Brighton & Hove Albion at Liverpool', 'Anfield', '364', 'Liverpool', '331', 'Brighton & Hove Albion'],
      ['401879252', '2026-10-25T14:00Z', 'AFC Bournemouth at Manchester United', 'Old Trafford', '360', 'Manchester United', '349', 'AFC Bournemouth'],
      ['401878764', '2026-10-25T16:30Z', 'Leeds United at Sunderland', 'Stadium of Light', '366', 'Sunderland', '357', 'Leeds United'],
    ],
  },
];

export const MATCH_CENTER_ENGLISH_20261024_20261030_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة 20261024-20261030، وفيها 9 أحداث مجدولة. لم ينفذ المساعد طلب API ولم يتحقق استقلالياً من المصدر.',
  receivedRanges: MATCH_CENTER_ENGLISH_20261024_20261030_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20261024_20261030_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20261024_20261030_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};

/* The Oct 17 output already recorded two non-trial events, but without team IDs.
   Their exact ESPN team IDs are now cross-referenced from matches in the user's
   Oct 24–30 output. Side order follows the documented "away at home" event name;
   the assistant did not make another API request. */
export const MATCH_CENTER_ENGLISH_20261017_CROSS_REFERENCED_EVENTS = [
  {
    id: '401878771',
    date: '2026-10-17T11:30Z',
    name: 'Chelsea at Everton',
    venue: 'Hill Dickinson Stadium',
    home: { id: '368', name: 'Everton', sourceEventId: '401878768' },
    away: { id: '363', name: 'Chelsea', sourceEventId: '401878767' },
  },
  {
    id: '401878770',
    date: '2026-10-17T14:00Z',
    name: 'Hull City at Fulham',
    venue: 'Craven Cottage',
    home: { id: '370', name: 'Fulham', sourceEventId: '401879255' },
    away: { id: '306', name: 'Hull City', sourceEventId: '401878766' },
  },
];

export const MATCH_CENTER_ENGLISH_20261017_CROSS_REFERENCE_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'معرّفات أحداث 17 أكتوبر وأسماؤها وملاعبها من الخرج المرسل لذلك اليوم؛ معرّفات الفرق أُعيد ربطها بالاسم المطابق في خرج المستخدم 20261024-20261030، مع تحقق كل معرّف من مباراة الشاهد المسجلة. الجانبان وفق قاعدة المصدر «الضيف at المضيف». لم ينفّذ المساعد طلب API.',
  sourceWindow: '20261024-20261030',
  events: MATCH_CENTER_ENGLISH_20261017_CROSS_REFERENCED_EVENTS,
};

export const MATCH_CENTER_ENGLISH_20261031_20261106_RANGES = [
  {
    dates: '20261031-20261106',
    complete: true,
    events: [
      ['401879248', '2026-10-31T12:30Z', 'Manchester United at Chelsea', 'Stamford Bridge', '363', 'Chelsea', '360', 'Manchester United'],
      ['401879251', '2026-10-31T15:00Z', 'Leeds United at AFC Bournemouth', 'Vitality Stadium', '349', 'AFC Bournemouth', '357', 'Leeds United'],
      ['401879249', '2026-10-31T15:00Z', 'Nottingham Forest at Brentford', 'Gtech Community Stadium', '337', 'Brentford', '393', 'Nottingham Forest'],
      ['401879247', '2026-10-31T15:00Z', 'Sunderland at Coventry City', 'Coventry Building Society Arena', '388', 'Coventry City', '366', 'Sunderland'],
      ['401878763', '2026-10-31T15:00Z', 'Ipswich Town at Hull City', 'The MKM Stadium', '306', 'Hull City', '373', 'Ipswich Town'],
      ['401879245', '2026-10-31T15:00Z', 'Brighton & Hove Albion at Manchester City', 'Etihad Stadium', '382', 'Manchester City', '331', 'Brighton & Hove Albion'],
      ['401878761', '2026-10-31T17:30Z', 'Crystal Palace at Tottenham Hotspur', 'Tottenham Hotspur Stadium', '367', 'Tottenham Hotspur', '384', 'Crystal Palace'],
      ['401879250', '2026-10-31T20:00Z', 'Fulham at Aston Villa', 'Villa Park', '362', 'Aston Villa', '370', 'Fulham'],
      ['401879246', '2026-11-01T16:30Z', 'Arsenal at Liverpool', 'Anfield', '364', 'Liverpool', '359', 'Arsenal'],
      ['401878762', '2026-11-02T20:00Z', 'Everton at Newcastle United', "St. James' Park", '361', 'Newcastle United', '368', 'Everton'],
      ['401879242', '2026-11-06T20:00Z', 'Coventry City at Everton', 'Hill Dickinson Stadium', '368', 'Everton', '388', 'Coventry City'],
    ],
  },
];

export const MATCH_CENTER_ENGLISH_20261031_20261106_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة 20261031-20261106، وفيها 11 حدثاً مجدولاً مع معرّفات الفرق والجانبين والملاعب. لم ينفذ المساعد طلب API ولم يتحقق استقلالياً من المصدر.',
  receivedRanges: MATCH_CENTER_ENGLISH_20261031_20261106_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20261031_20261106_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20261031_20261106_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};

export const MATCH_CENTER_ENGLISH_20261107_20261113_RANGES = [
  {
    dates: '20261107-20261113',
    complete: true,
    events: [
      ['401878758', '2026-11-07T12:30Z', 'Tottenham Hotspur at Leeds United', 'Elland Road', '357', 'Leeds United', '367', 'Tottenham Hotspur'],
      ['401878760', '2026-11-07T15:00Z', 'Hull City at Arsenal', 'Emirates Stadium', '359', 'Arsenal', '306', 'Hull City'],
      ['401879241', '2026-11-07T15:00Z', 'Newcastle United at Fulham', 'Craven Cottage', '370', 'Fulham', '361', 'Newcastle United'],
      ['401878757', '2026-11-07T17:30Z', 'Manchester City at Nottingham Forest', 'The City Ground', '393', 'Nottingham Forest', '382', 'Manchester City'],
      ['401879244', '2026-11-08T14:00Z', 'Brentford at Brighton & Hove Albion', 'American Express Stadium', '331', 'Brighton & Hove Albion', '337', 'Brentford'],
      ['401879243', '2026-11-08T14:00Z', 'Liverpool at Crystal Palace', 'Selhurst Park', '384', 'Crystal Palace', '364', 'Liverpool'],
      ['401878759', '2026-11-08T14:00Z', 'AFC Bournemouth at Ipswich Town', 'Portman Road', '373', 'Ipswich Town', '349', 'AFC Bournemouth'],
      ['401879239', '2026-11-08T14:00Z', 'Chelsea at Sunderland', 'Stadium of Light', '366', 'Sunderland', '363', 'Chelsea'],
      ['401879240', '2026-11-08T16:30Z', 'Aston Villa at Manchester United', 'Old Trafford', '360', 'Manchester United', '362', 'Aston Villa'],
    ],
  },
];

export const MATCH_CENTER_ENGLISH_20261107_20261113_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة 20261107-20261113، وفيها 9 أحداث مجدولة مع معرّفات الفرق والجانبين والملاعب. لم ينفذ المساعد طلب API ولم يتحقق استقلالياً من المصدر.',
  receivedRanges: MATCH_CENTER_ENGLISH_20261107_20261113_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20261107_20261113_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20261107_20261113_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};

/** نافذة أسبوعية فارغة كما أرسلها المستخدم؛ لا تُنشأ fixtures ولا يُستنتج انتهاء الموسم. */
export const MATCH_CENTER_ENGLISH_20261114_20261120_RANGES = [
  {
    dates: '20261114-20261120',
    complete: true,
    events: [],
  },
];

export const MATCH_CENTER_ENGLISH_20261114_20261120_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة 20261114-20261120 وكانت events فارغة؛ سُجّلت للتدقيق فقط بلا fixtures، ولا يُستنتج منها انتهاء الموسم. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر.',
  receivedRanges: MATCH_CENTER_ENGLISH_20261114_20261120_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20261114_20261120_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20261114_20261120_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};

export const MATCH_CENTER_ENGLISH_20261121_20261127_RANGES = [
  {
    dates: '20261121-20261127',
    complete: true,
    events: [
      ['401879233', '2026-11-21T12:30Z', 'Fulham at Manchester City', 'Etihad Stadium', '382', 'Manchester City', '370', 'Fulham'],
      ['401879238', '2026-11-21T15:00Z', 'Nottingham Forest at AFC Bournemouth', 'Vitality Stadium', '349', 'AFC Bournemouth', '393', 'Nottingham Forest'],
      ['401878756', '2026-11-21T15:00Z', 'Sunderland at Aston Villa', 'Villa Park', '362', 'Aston Villa', '366', 'Sunderland'],
      ['401879236', '2026-11-21T15:00Z', 'Leeds United at Chelsea', 'Stamford Bridge', '363', 'Chelsea', '357', 'Leeds United'],
      ['401879235', '2026-11-21T15:00Z', 'Crystal Palace at Coventry City', 'Coventry Building Society Arena', '388', 'Coventry City', '384', 'Crystal Palace'],
      ['401878754', '2026-11-21T15:00Z', 'Ipswich Town at Tottenham Hotspur', 'Tottenham Hotspur Stadium', '367', 'Tottenham Hotspur', '373', 'Ipswich Town'],
      ['401879232', '2026-11-21T17:30Z', 'Arsenal at Newcastle United', "St. James' Park", '361', 'Newcastle United', '359', 'Arsenal'],
      ['401879234', '2026-11-22T14:00Z', 'Brighton & Hove Albion at Hull City', 'The MKM Stadium', '306', 'Hull City', '331', 'Brighton & Hove Albion'],
      ['401878755', '2026-11-22T16:30Z', 'Manchester United at Liverpool', 'Anfield', '364', 'Liverpool', '360', 'Manchester United'],
      ['401879237', '2026-11-23T20:00Z', 'Everton at Brentford', 'Gtech Community Stadium', '337', 'Brentford', '368', 'Everton'],
      ['401879225', '2026-11-27T20:00Z', 'Chelsea at Nottingham Forest', 'The City Ground', '393', 'Nottingham Forest', '363', 'Chelsea'],
    ],
  },
];

export const MATCH_CENTER_ENGLISH_20261121_20261127_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة 20261121-20261127، وفيها 11 حدثاً مجدولاً مع معرّفات الفرق والجانبين والملاعب. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر.',
  receivedRanges: MATCH_CENTER_ENGLISH_20261121_20261127_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20261121_20261127_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20261121_20261127_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};

export const MATCH_CENTER_ENGLISH_20261128_20261204_RANGES = [
  {
    dates: '20261128-20261204',
    complete: true,
    events: [
      ['401879227', '2026-11-28T15:00Z', 'Coventry City at Leeds United', 'Elland Road', '357', 'Leeds United', '388', 'Coventry City'],
      ['401879226', '2026-11-28T15:00Z', 'Brentford at Manchester United', 'Old Trafford', '360', 'Manchester United', '337', 'Brentford'],
      ['401878752', '2026-11-28T17:30Z', 'Aston Villa at Ipswich Town', 'Portman Road', '373', 'Ipswich Town', '362', 'Aston Villa'],
      ['401879229', '2026-11-29T12:00Z', 'Liverpool at Everton', 'Hill Dickinson Stadium', '368', 'Everton', '364', 'Liverpool'],
      ['401879231', '2026-11-29T14:05Z', 'Newcastle United at Brighton & Hove Albion', 'American Express Stadium', '331', 'Brighton & Hove Albion', '361', 'Newcastle United'],
      ['401879230', '2026-11-29T14:05Z', 'Hull City at Crystal Palace', 'Selhurst Park', '384', 'Crystal Palace', '306', 'Hull City'],
      ['401879228', '2026-11-29T14:05Z', 'AFC Bournemouth at Fulham', 'Craven Cottage', '370', 'Fulham', '349', 'AFC Bournemouth'],
      ['401879224', '2026-11-29T14:05Z', 'Tottenham Hotspur at Sunderland', 'Stadium of Light', '366', 'Sunderland', '367', 'Tottenham Hotspur'],
      ['401878753', '2026-11-29T16:30Z', 'Manchester City at Arsenal', 'Emirates Stadium', '359', 'Arsenal', '382', 'Manchester City'],
      ['401879223', '2026-12-02T20:00Z', 'Brighton & Hove Albion at AFC Bournemouth', 'Vitality Stadium', '349', 'AFC Bournemouth', '331', 'Brighton & Hove Albion'],
      ['401878751', '2026-12-02T20:00Z', 'Everton at Aston Villa', 'Villa Park', '362', 'Aston Villa', '368', 'Everton'],
      ['401878750', '2026-12-02T20:00Z', 'Arsenal at Brentford', 'Gtech Community Stadium', '337', 'Brentford', '359', 'Arsenal'],
      ['401879222', '2026-12-02T20:00Z', 'Crystal Palace at Chelsea', 'Stamford Bridge', '363', 'Chelsea', '384', 'Crystal Palace'],
      ['401879221', '2026-12-02T20:00Z', 'Ipswich Town at Coventry City', 'Coventry Building Society Arena', '388', 'Coventry City', '373', 'Ipswich Town'],
      ['401879220', '2026-12-02T20:00Z', 'Nottingham Forest at Hull City', 'The MKM Stadium', '306', 'Hull City', '393', 'Nottingham Forest'],
      ['401879219', '2026-12-02T20:00Z', 'Sunderland at Liverpool', 'Anfield', '364', 'Liverpool', '366', 'Sunderland'],
      ['401879218', '2026-12-02T20:00Z', 'Leeds United at Manchester City', 'Etihad Stadium', '382', 'Manchester City', '357', 'Leeds United'],
      ['401879217', '2026-12-02T20:00Z', 'Manchester United at Newcastle United', "St. James' Park", '361', 'Newcastle United', '360', 'Manchester United'],
      ['401878749', '2026-12-02T20:00Z', 'Fulham at Tottenham Hotspur', 'Tottenham Hotspur Stadium', '367', 'Tottenham Hotspur', '370', 'Fulham'],
    ],
  },
];

export const MATCH_CENTER_ENGLISH_20261128_20261204_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة 20261128-20261204، وفيها 19 حدثاً مجدولاً مع معرّفات الفرق والجانبين والملاعب. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر.',
  receivedRanges: MATCH_CENTER_ENGLISH_20261128_20261204_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20261128_20261204_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20261128_20261204_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};

export const MATCH_CENTER_ENGLISH_20261205_20261211_RANGES = [
  {
    dates: '20261205-20261211',
    complete: true,
    events: [
      ['401879216', '2026-12-05T15:00Z', 'Hull City at AFC Bournemouth', 'Vitality Stadium', '349', 'AFC Bournemouth', '306', 'Hull City'],
      ['401879215', '2026-12-05T15:00Z', 'Crystal Palace at Aston Villa', 'Villa Park', '362', 'Aston Villa', '384', 'Crystal Palace'],
      ['401879214', '2026-12-05T15:00Z', 'Manchester City at Brentford', 'Gtech Community Stadium', '337', 'Brentford', '382', 'Manchester City'],
      ['401879213', '2026-12-05T15:00Z', 'Liverpool at Chelsea', 'Stamford Bridge', '363', 'Chelsea', '364', 'Liverpool'],
      ['401879212', '2026-12-05T15:00Z', 'Fulham at Everton', 'Hill Dickinson Stadium', '368', 'Everton', '370', 'Fulham'],
      ['401879211', '2026-12-05T15:00Z', 'Ipswich Town at Leeds United', 'Elland Road', '357', 'Leeds United', '373', 'Ipswich Town'],
      ['401879210', '2026-12-05T15:00Z', 'Coventry City at Manchester United', 'Old Trafford', '360', 'Manchester United', '388', 'Coventry City'],
      ['401878748', '2026-12-05T15:00Z', 'Sunderland at Newcastle United', "St. James' Park", '361', 'Newcastle United', '366', 'Sunderland'],
      ['401878747', '2026-12-05T15:00Z', 'Brighton & Hove Albion at Nottingham Forest', 'The City Ground', '393', 'Nottingham Forest', '331', 'Brighton & Hove Albion'],
      ['401879209', '2026-12-05T15:00Z', 'Arsenal at Tottenham Hotspur', 'Tottenham Hotspur Stadium', '367', 'Tottenham Hotspur', '359', 'Arsenal'],
    ],
  },
];

export const MATCH_CENTER_ENGLISH_20261205_20261211_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة eng.1 20261205-20261211، وفيها 10 أحداث مجدولة مع معرّفات الفرق والجانبين والملاعب. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر؛ هذه نافذة منفصلة عن خرج esp.1 الذي يحمل التاريخ نفسه.',
  receivedRanges: MATCH_CENTER_ENGLISH_20261205_20261211_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20261205_20261211_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20261205_20261211_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};


export const MATCH_CENTER_ENGLISH_20261212_20261218_RANGES = [
  {
    dates: '20261212-20261218',
    complete: true,
    events: [
      ['401878746', '2026-12-12T15:00Z', 'AFC Bournemouth at Arsenal', 'Emirates Stadium', '359', 'Arsenal', '349', 'AFC Bournemouth'],
      ['401878745', '2026-12-12T15:00Z', 'Everton at Brighton & Hove Albion', 'American Express Stadium', '331', 'Brighton & Hove Albion', '368', 'Everton'],
      ['401879208', '2026-12-12T15:00Z', 'Aston Villa at Coventry City', 'Coventry Building Society Arena', '388', 'Coventry City', '362', 'Aston Villa'],
      ['401879207', '2026-12-12T15:00Z', 'Manchester United at Crystal Palace', 'Selhurst Park', '384', 'Crystal Palace', '360', 'Manchester United'],
      ['401879206', '2026-12-12T15:00Z', 'Brentford at Fulham', 'Craven Cottage', '370', 'Fulham', '337', 'Brentford'],
      ['401879205', '2026-12-12T15:00Z', 'Tottenham Hotspur at Hull City', 'The MKM Stadium', '306', 'Hull City', '367', 'Tottenham Hotspur'],
      ['401878744', '2026-12-12T15:00Z', 'Newcastle United at Ipswich Town', 'Portman Road', '373', 'Ipswich Town', '361', 'Newcastle United'],
      ['401878743', '2026-12-12T15:00Z', 'Leeds United at Liverpool', 'Anfield', '364', 'Liverpool', '357', 'Leeds United'],
      ['401878742', '2026-12-12T15:00Z', 'Chelsea at Manchester City', 'Etihad Stadium', '382', 'Manchester City', '363', 'Chelsea'],
      ['401878741', '2026-12-12T15:00Z', 'Nottingham Forest at Sunderland', 'Stadium of Light', '366', 'Sunderland', '393', 'Nottingham Forest'],
    ],
  },
];

export const MATCH_CENTER_ENGLISH_20261212_20261218_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة eng.1 20261212-20261218، وفيها 10 أحداث مجدولة مع معرّفات الفرق والجانبين والملاعب. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر؛ هذه نافذة منفصلة عن خرج esp.1 للفترة نفسها.',
  receivedRanges: MATCH_CENTER_ENGLISH_20261212_20261218_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20261212_20261218_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20261212_20261218_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};


export const MATCH_CENTER_ENGLISH_20261219_20261225_RANGES = [
  {
    dates: '20261219-20261225',
    complete: true,
    events: [
      ['401878740', '2026-12-19T15:00Z', 'Coventry City at AFC Bournemouth', 'Vitality Stadium', '349', 'AFC Bournemouth', '388', 'Coventry City'],
      ['401879204', '2026-12-19T15:00Z', 'Manchester United at Arsenal', 'Emirates Stadium', '359', 'Arsenal', '360', 'Manchester United'],
      ['401879203', '2026-12-19T15:00Z', 'Newcastle United at Brentford', 'Gtech Community Stadium', '337', 'Brentford', '361', 'Newcastle United'],
      ['401878739', '2026-12-19T15:00Z', 'Ipswich Town at Brighton & Hove Albion', 'American Express Stadium', '331', 'Brighton & Hove Albion', '373', 'Ipswich Town'],
      ['401879202', '2026-12-19T15:00Z', 'Aston Villa at Chelsea', 'Stamford Bridge', '363', 'Chelsea', '362', 'Aston Villa'],
      ['401879201', '2026-12-19T15:00Z', 'Fulham at Leeds United', 'Elland Road', '357', 'Leeds United', '370', 'Fulham'],
      ['401879200', '2026-12-19T15:00Z', 'Tottenham Hotspur at Liverpool', 'Anfield', '364', 'Liverpool', '367', 'Tottenham Hotspur'],
      ['401879199', '2026-12-19T15:00Z', 'Hull City at Manchester City', 'Etihad Stadium', '382', 'Manchester City', '306', 'Hull City'],
      ['401879198', '2026-12-19T15:00Z', 'Everton at Nottingham Forest', 'The City Ground', '393', 'Nottingham Forest', '368', 'Everton'],
      ['401878738', '2026-12-19T15:00Z', 'Crystal Palace at Sunderland', 'Stadium of Light', '366', 'Sunderland', '384', 'Crystal Palace'],
    ],
  },
];

export const MATCH_CENTER_ENGLISH_20261219_20261225_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة eng.1 20261219-20261225، وفيها 10 أحداث مجدولة مع معرّفات الفرق والجانبين والملاعب. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر؛ هذه نافذة منفصلة عن خرج esp.1 للفترة نفسها.',
  receivedRanges: MATCH_CENTER_ENGLISH_20261219_20261225_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20261219_20261225_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20261219_20261225_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};


export const MATCH_CENTER_ENGLISH_20261226_20270101_RANGES = [
  {
    dates: '20261226-20270101',
    complete: true,
    events: [
      ['401878737', '2026-12-26T12:30Z', 'Leeds United at Aston Villa', 'Villa Park', '362', 'Aston Villa', '357', 'Leeds United'],
      ['401879197', '2026-12-26T15:00Z', 'Sunderland at Everton', 'Hill Dickinson Stadium', '368', 'Everton', '366', 'Sunderland'],
      ['401878734', '2026-12-26T15:00Z', 'Brighton & Hove Albion at Fulham', 'Craven Cottage', '370', 'Fulham', '331', 'Brighton & Hove Albion'],
      ['401879196', '2026-12-26T15:00Z', 'Brentford at Ipswich Town', 'Portman Road', '373', 'Ipswich Town', '337', 'Brentford'],
      ['401878731', '2026-12-26T15:00Z', 'AFC Bournemouth at Tottenham Hotspur', 'Tottenham Hotspur Stadium', '367', 'Tottenham Hotspur', '349', 'AFC Bournemouth'],
      ['401878733', '2026-12-26T17:30Z', 'Liverpool at Hull City', 'The MKM Stadium', '306', 'Hull City', '364', 'Liverpool'],
      ['401878732', '2026-12-26T20:00Z', 'Manchester City at Newcastle United', "St. James' Park", '361', 'Newcastle United', '382', 'Manchester City'],
      ['401878736', '2026-12-27T14:00Z', 'Chelsea at Coventry City', 'Coventry Building Society Arena', '388', 'Coventry City', '363', 'Chelsea'],
      ['401879195', '2026-12-27T16:30Z', 'Nottingham Forest at Manchester United', 'Old Trafford', '360', 'Manchester United', '393', 'Nottingham Forest'],
      ['401878735', '2026-12-27T19:00Z', 'Arsenal at Crystal Palace', 'Selhurst Park', '384', 'Crystal Palace', '359', 'Arsenal'],
      ['401879190', '2026-12-29T19:30Z', 'Leeds United at Hull City', 'The MKM Stadium', '306', 'Hull City', '357', 'Leeds United'],
      ['401879186', '2026-12-29T19:30Z', 'Brighton & Hove Albion at Tottenham Hotspur', 'Tottenham Hotspur Stadium', '367', 'Tottenham Hotspur', '331', 'Brighton & Hove Albion'],
      ['401879192', '2026-12-29T20:15Z', 'Manchester City at Everton', 'Hill Dickinson Stadium', '368', 'Everton', '382', 'Manchester City'],
      ['401878730', '2026-12-30T19:30Z', 'Brentford at Coventry City', 'Coventry Building Society Arena', '388', 'Coventry City', '337', 'Brentford'],
      ['401879193', '2026-12-30T19:30Z', 'AFC Bournemouth at Crystal Palace', 'Selhurst Park', '384', 'Crystal Palace', '349', 'AFC Bournemouth'],
      ['401879191', '2026-12-30T19:30Z', 'Arsenal at Fulham', 'Craven Cottage', '370', 'Fulham', '359', 'Arsenal'],
      ['401879188', '2026-12-30T19:30Z', 'Sunderland at Manchester United', 'Old Trafford', '360', 'Manchester United', '366', 'Sunderland'],
      ['401879187', '2026-12-30T19:30Z', 'Nottingham Forest at Newcastle United', "St. James' Park", '361', 'Newcastle United', '393', 'Nottingham Forest'],
      ['401879194', '2026-12-30T20:15Z', 'Liverpool at Aston Villa', 'Villa Park', '362', 'Aston Villa', '364', 'Liverpool'],
      ['401879189', '2026-12-30T20:15Z', 'Chelsea at Ipswich Town', 'Portman Road', '373', 'Ipswich Town', '363', 'Chelsea'],
      ['401879182', '2027-01-01T20:00Z', 'Everton at Leeds United', 'Elland Road', '357', 'Leeds United', '368', 'Everton'],
    ],
  },
];

export const MATCH_CENTER_ENGLISH_20261226_20270101_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة eng.1 20261226-20270101، وفيها 21 حدثاً مجدولاً مع معرّفات الفرق والجانبين والملاعب. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر؛ هذه نافذة منفصلة عن خرج esp.1 للفترة نفسها، وكان السجل الإسباني فارغاً.',
  receivedRanges: MATCH_CENTER_ENGLISH_20261226_20270101_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20261226_20270101_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20261226_20270101_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};

export const MATCH_CENTER_ENGLISH_20270102_20270108_RANGES = [
  {
    dates: '20270102-20270108',
    complete: true,
    events: [
      ['401878728', '2027-01-02T12:30Z', 'Manchester United at Brighton & Hove Albion', 'American Express Stadium', '331', 'Brighton & Hove Albion', '360', 'Manchester United'],
      ['401879185', '2027-01-02T15:00Z', 'Ipswich Town at Arsenal', 'Emirates Stadium', '359', 'Arsenal', '373', 'Ipswich Town'],
      ['401879184', '2027-01-02T15:00Z', 'Crystal Palace at Brentford', 'Gtech Community Stadium', '337', 'Brentford', '384', 'Crystal Palace'],
      ['401879181', '2027-01-02T15:00Z', 'Coventry City at Liverpool', 'Anfield', '364', 'Liverpool', '388', 'Coventry City'],
      ['401879179', '2027-01-02T15:00Z', 'Fulham at Nottingham Forest', 'The City Ground', '393', 'Nottingham Forest', '370', 'Fulham'],
      ['401879178', '2027-01-02T15:00Z', 'Hull City at Sunderland', 'Stadium of Light', '366', 'Sunderland', '306', 'Hull City'],
      ['401878729', '2027-01-02T17:30Z', 'Aston Villa at AFC Bournemouth', 'Vitality Stadium', '349', 'AFC Bournemouth', '362', 'Aston Villa'],
      ['401879183', '2027-01-03T14:00Z', 'Newcastle United at Chelsea', 'Stamford Bridge', '363', 'Chelsea', '361', 'Newcastle United'],
      ['401879180', '2027-01-03T16:30Z', 'Tottenham Hotspur at Manchester City', 'Etihad Stadium', '382', 'Manchester City', '367', 'Tottenham Hotspur'],
      ['401879177', '2027-01-05T19:30Z', 'Brentford at Arsenal', 'Emirates Stadium', '359', 'Arsenal', '337', 'Brentford'],
      ['401879176', '2027-01-05T19:30Z', 'AFC Bournemouth at Brighton & Hove Albion', 'American Express Stadium', '331', 'Brighton & Hove Albion', '349', 'AFC Bournemouth'],
      ['401879174', '2027-01-05T19:30Z', 'Aston Villa at Everton', 'Hill Dickinson Stadium', '368', 'Everton', '362', 'Aston Villa'],
      ['401879169', '2027-01-05T19:30Z', 'Hull City at Nottingham Forest', 'The City Ground', '393', 'Nottingham Forest', '306', 'Hull City'],
      ['401878727', '2027-01-05T20:15Z', 'Liverpool at Sunderland', 'Stadium of Light', '366', 'Sunderland', '364', 'Liverpool'],
      ['401879175', '2027-01-06T19:30Z', 'Chelsea at Crystal Palace', 'Selhurst Park', '384', 'Crystal Palace', '363', 'Chelsea'],
      ['401879173', '2027-01-06T19:30Z', 'Tottenham Hotspur at Fulham', 'Craven Cottage', '370', 'Fulham', '367', 'Tottenham Hotspur'],
      ['401879172', '2027-01-06T19:30Z', 'Coventry City at Ipswich Town', 'Portman Road', '373', 'Ipswich Town', '388', 'Coventry City'],
      ['401879171', '2027-01-06T20:15Z', 'Manchester City at Leeds United', 'Elland Road', '357', 'Leeds United', '382', 'Manchester City'],
      ['401879170', '2027-01-07T20:00Z', 'Newcastle United at Manchester United', 'Old Trafford', '360', 'Manchester United', '361', 'Newcastle United'],
    ],
  },
];

export const MATCH_CENTER_ENGLISH_20270102_20270108_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة eng.1 20270102-20270108، وفيها 19 حدثاً مجدولاً مع معرّفات الفرق والجانبين والملاعب. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر؛ هذه نافذة منفصلة عن خرج esp.1 للفترة نفسها.',
  receivedRanges: MATCH_CENTER_ENGLISH_20270102_20270108_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20270102_20270108_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20270102_20270108_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};

/** نافذة أسبوعية فارغة كما أرسلها المستخدم؛ سجل تدقيق فقط ولا يعني انتهاء الموسم. */
export const MATCH_CENTER_ENGLISH_20270109_20270115_RANGES = [
  {
    dates: '20270109-20270115',
    complete: true,
    events: [],
  },
];

export const MATCH_CENTER_ENGLISH_20270109_20270115_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة eng.1 20270109-20270115 وكانت events فارغة؛ سُجّلت للتدقيق فقط بلا fixtures ولا يُستنتج منها انتهاء الموسم. هذه نافذة إنجليزية منفصلة عن خرج esp.1 للفترة نفسها، الذي يظل سجلاً مستقلاً. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر.',
  receivedRanges: MATCH_CENTER_ENGLISH_20270109_20270115_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20270109_20270115_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20270109_20270115_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};


export const MATCH_CENTER_ENGLISH_20270116_20270122_RANGES = [
  {
    dates: '20270116-20270122',
    complete: true,
    events: [
      ['401878726', '2027-01-16T15:00Z', 'Ipswich Town at AFC Bournemouth', 'Vitality Stadium', '349', 'AFC Bournemouth', '373', 'Ipswich Town'],
      ['401878725', '2027-01-16T15:00Z', 'Manchester United at Aston Villa', 'Villa Park', '362', 'Aston Villa', '360', 'Manchester United'],
      ['401879168', '2027-01-16T15:00Z', 'Brighton & Hove Albion at Brentford', 'Gtech Community Stadium', '337', 'Brentford', '331', 'Brighton & Hove Albion'],
      ['401879167', '2027-01-16T15:00Z', 'Sunderland at Chelsea', 'Stamford Bridge', '363', 'Chelsea', '366', 'Sunderland'],
      ['401878724', '2027-01-16T15:00Z', 'Everton at Coventry City', 'Coventry Building Society Arena', '388', 'Coventry City', '368', 'Everton'],
      ['401878723', '2027-01-16T15:00Z', 'Arsenal at Hull City', 'The MKM Stadium', '306', 'Hull City', '359', 'Arsenal'],
      ['401879166', '2027-01-16T15:00Z', 'Crystal Palace at Liverpool', 'Anfield', '364', 'Liverpool', '384', 'Crystal Palace'],
      ['401878722', '2027-01-16T15:00Z', 'Nottingham Forest at Manchester City', 'Etihad Stadium', '382', 'Manchester City', '393', 'Nottingham Forest'],
      ['401878721', '2027-01-16T15:00Z', 'Fulham at Newcastle United', "St. James' Park", '361', 'Newcastle United', '370', 'Fulham'],
      ['401879165', '2027-01-16T15:00Z', 'Leeds United at Tottenham Hotspur', 'Tottenham Hotspur Stadium', '367', 'Tottenham Hotspur', '357', 'Leeds United'],
    ],
  },
];

export const MATCH_CENTER_ENGLISH_20270116_20270122_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة eng.1 20270116-20270122، وفيها 10 أحداث مجدولة مع معرّفات الفرق والجانبين والملاعب. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر؛ هذه نافذة منفصلة عن خرج esp.1 للفترة نفسها.',
  receivedRanges: MATCH_CENTER_ENGLISH_20270116_20270122_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20270116_20270122_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20270116_20270122_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};


export const MATCH_CENTER_ENGLISH_20270123_20270129_RANGES = [
  {
    dates: '20270123-20270129',
    complete: true,
    events: [
      ['401878720', '2027-01-23T15:00Z', 'Newcastle United at Arsenal', 'Emirates Stadium', '359', 'Arsenal', '361', 'Newcastle United'],
      ['401879164', '2027-01-23T15:00Z', 'Manchester City at Brighton & Hove Albion', 'American Express Stadium', '331', 'Brighton & Hove Albion', '382', 'Manchester City'],
      ['401879163', '2027-01-23T15:00Z', 'Tottenham Hotspur at Crystal Palace', 'Selhurst Park', '384', 'Crystal Palace', '367', 'Tottenham Hotspur'],
      ['401879162', '2027-01-23T15:00Z', 'Brentford at Everton', 'Hill Dickinson Stadium', '368', 'Everton', '337', 'Brentford'],
      ['401878719', '2027-01-23T15:00Z', 'Aston Villa at Fulham', 'Craven Cottage', '370', 'Fulham', '362', 'Aston Villa'],
      ['401879161', '2027-01-23T15:00Z', 'Hull City at Ipswich Town', 'Portman Road', '373', 'Ipswich Town', '306', 'Hull City'],
      ['401879160', '2027-01-23T15:00Z', 'Chelsea at Leeds United', 'Elland Road', '357', 'Leeds United', '363', 'Chelsea'],
      ['401878718', '2027-01-23T15:00Z', 'Liverpool at Manchester United', 'Old Trafford', '360', 'Manchester United', '364', 'Liverpool'],
      ['401878717', '2027-01-23T15:00Z', 'AFC Bournemouth at Nottingham Forest', 'The City Ground', '393', 'Nottingham Forest', '349', 'AFC Bournemouth'],
      ['401879159', '2027-01-23T15:00Z', 'Coventry City at Sunderland', 'Stadium of Light', '366', 'Sunderland', '388', 'Coventry City'],
    ],
  },
];

export const MATCH_CENTER_ENGLISH_20270123_20270129_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة eng.1 20270123-20270129، وفيها 10 أحداث مجدولة مع معرّفات الفرق والجانبين والملاعب. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر؛ هذه نافذة منفصلة عن خرج esp.1 للفترة نفسها.',
  receivedRanges: MATCH_CENTER_ENGLISH_20270123_20270129_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20270123_20270129_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20270123_20270129_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};


export const MATCH_CENTER_ENGLISH_20270130_20270205_RANGES = [
  {
    dates: '20270130-20270205',
    complete: true,
    events: [
      ['401879158', '2027-01-30T15:00Z', 'Fulham at AFC Bournemouth', 'Vitality Stadium', '349', 'AFC Bournemouth', '370', 'Fulham'],
      ['401878716', '2027-01-30T15:00Z', 'Ipswich Town at Aston Villa', 'Villa Park', '362', 'Aston Villa', '373', 'Ipswich Town'],
      ['401878715', '2027-01-30T15:00Z', 'Manchester United at Brentford', 'Gtech Community Stadium', '337', 'Brentford', '360', 'Manchester United'],
      ['401878714', '2027-01-30T15:00Z', 'Nottingham Forest at Chelsea', 'Stamford Bridge', '363', 'Chelsea', '393', 'Nottingham Forest'],
      ['401879157', '2027-01-30T15:00Z', 'Leeds United at Coventry City', 'Coventry Building Society Arena', '388', 'Coventry City', '357', 'Leeds United'],
      ['401879156', '2027-01-30T15:00Z', 'Crystal Palace at Hull City', 'The MKM Stadium', '306', 'Hull City', '384', 'Crystal Palace'],
      ['401879155', '2027-01-30T15:00Z', 'Everton at Liverpool', 'Anfield', '364', 'Liverpool', '368', 'Everton'],
      ['401879154', '2027-01-30T15:00Z', 'Arsenal at Manchester City', 'Etihad Stadium', '382', 'Manchester City', '359', 'Arsenal'],
      ['401878713', '2027-01-30T15:00Z', 'Brighton & Hove Albion at Newcastle United', "St. James' Park", '361', 'Newcastle United', '331', 'Brighton & Hove Albion'],
      ['401879153', '2027-01-30T15:00Z', 'Sunderland at Tottenham Hotspur', 'Tottenham Hotspur Stadium', '367', 'Tottenham Hotspur', '366', 'Sunderland'],
    ],
  },
];

export const MATCH_CENTER_ENGLISH_20270130_20270205_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة eng.1 20270130-20270205، وفيها 10 أحداث مجدولة مع معرّفات الفرق والجانبين والملاعب. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر؛ هذه نافذة منفصلة عن خرج esp.1 للفترة نفسها.',
  receivedRanges: MATCH_CENTER_ENGLISH_20270130_20270205_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20270130_20270205_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20270130_20270205_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};


export const MATCH_CENTER_ENGLISH_20270206_20270212_RANGES = [
  {
    dates: '20270206-20270212',
    complete: true,
    events: [
      ['401878712', '2027-02-06T15:00Z', 'Liverpool at Arsenal', 'Emirates Stadium', '359', 'Arsenal', '364', 'Liverpool'],
      ['401878711', '2027-02-06T15:00Z', 'Hull City at Brighton & Hove Albion', 'American Express Stadium', '331', 'Brighton & Hove Albion', '306', 'Hull City'],
      ['401879152', '2027-02-06T15:00Z', 'Coventry City at Crystal Palace', 'Selhurst Park', '384', 'Crystal Palace', '388', 'Coventry City'],
      ['401879151', '2027-02-06T15:00Z', 'Newcastle United at Everton', 'Hill Dickinson Stadium', '368', 'Everton', '361', 'Newcastle United'],
      ['401879150', '2027-02-06T15:00Z', 'Manchester City at Fulham', 'Craven Cottage', '370', 'Fulham', '382', 'Manchester City'],
      ['401879149', '2027-02-06T15:00Z', 'Tottenham Hotspur at Ipswich Town', 'Portman Road', '373', 'Ipswich Town', '367', 'Tottenham Hotspur'],
      ['401878710', '2027-02-06T15:00Z', 'AFC Bournemouth at Leeds United', 'Elland Road', '357', 'Leeds United', '349', 'AFC Bournemouth'],
      ['401879148', '2027-02-06T15:00Z', 'Chelsea at Manchester United', 'Old Trafford', '360', 'Manchester United', '363', 'Chelsea'],
      ['401879147', '2027-02-06T15:00Z', 'Brentford at Nottingham Forest', 'The City Ground', '393', 'Nottingham Forest', '337', 'Brentford'],
      ['401878709', '2027-02-06T15:00Z', 'Aston Villa at Sunderland', 'Stadium of Light', '366', 'Sunderland', '362', 'Aston Villa'],
      ['401879146', '2027-02-10T20:00Z', 'AFC Bournemouth at Aston Villa', 'Villa Park', '362', 'Aston Villa', '349', 'AFC Bournemouth'],
      ['401879145', '2027-02-10T20:00Z', 'Liverpool at Coventry City', 'Coventry Building Society Arena', '388', 'Coventry City', '364', 'Liverpool'],
      ['401878708', '2027-02-10T20:00Z', 'Brentford at Crystal Palace', 'Selhurst Park', '384', 'Crystal Palace', '337', 'Brentford'],
      ['401878707', '2027-02-10T20:00Z', 'Leeds United at Everton', 'Hill Dickinson Stadium', '368', 'Everton', '357', 'Leeds United'],
      ['401879144', '2027-02-10T20:00Z', 'Nottingham Forest at Fulham', 'Craven Cottage', '370', 'Fulham', '393', 'Nottingham Forest'],
      ['401879143', '2027-02-10T20:00Z', 'Sunderland at Hull City', 'The MKM Stadium', '306', 'Hull City', '366', 'Sunderland'],
      ['401878706', '2027-02-10T20:00Z', 'Arsenal at Ipswich Town', 'Portman Road', '373', 'Ipswich Town', '359', 'Arsenal'],
      ['401879142', '2027-02-10T20:00Z', 'Brighton & Hove Albion at Manchester United', 'Old Trafford', '360', 'Manchester United', '331', 'Brighton & Hove Albion'],
      ['401879141', '2027-02-10T20:00Z', 'Chelsea at Newcastle United', "St. James' Park", '361', 'Newcastle United', '363', 'Chelsea'],
      ['401879140', '2027-02-10T20:00Z', 'Manchester City at Tottenham Hotspur', 'Tottenham Hotspur Stadium', '367', 'Tottenham Hotspur', '382', 'Manchester City'],
    ],
  },
];

export const MATCH_CENTER_ENGLISH_20270206_20270212_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة eng.1 20270206-20270212، وفيها 20 حدثاً مجدولاً مع معرّفات الفرق والجانبين والملاعب. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر؛ هذه نافذة منفصلة عن خرج esp.1 للفترة نفسها.',
  receivedRanges: MATCH_CENTER_ENGLISH_20270206_20270212_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20270206_20270212_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20270206_20270212_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};


/** نافذة إنجليزية فارغة كما أرسلها المستخدم؛ سجل تدقيق فقط ولا يعني انتهاء الموسم. */
export const MATCH_CENTER_ENGLISH_20270213_20270219_RANGES = [
  {
    dates: '20270213-20270219',
    complete: true,
    events: [],
  },
];

export const MATCH_CENTER_ENGLISH_20270213_20270219_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة eng.1 20270213-20270219 وكانت events فارغة؛ سُجّلت للتدقيق فقط بلا fixtures ولا يُستنتج منها انتهاء الموسم. هذه نافذة إنجليزية منفصلة عن خرج esp.1 للفترة نفسها، الذي يظل سجلاً مستقلاً. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر.',
  receivedRanges: MATCH_CENTER_ENGLISH_20270213_20270219_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20270213_20270219_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20270213_20270219_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};


export const MATCH_CENTER_ENGLISH_20270220_20270226_RANGES = [
  {
    dates: '20270220-20270226',
    complete: true,
    events: [
      ['401879139', '2027-02-20T15:00Z', 'Crystal Palace at AFC Bournemouth', 'Vitality Stadium', '349', 'AFC Bournemouth', '384', 'Crystal Palace'],
      ['401878705', '2027-02-20T15:00Z', 'Fulham at Arsenal', 'Emirates Stadium', '359', 'Arsenal', '370', 'Fulham'],
      ['401879138', '2027-02-20T15:00Z', 'Coventry City at Brentford', 'Gtech Community Stadium', '337', 'Brentford', '388', 'Coventry City'],
      ['401879137', '2027-02-20T15:00Z', 'Tottenham Hotspur at Brighton & Hove Albion', 'American Express Stadium', '331', 'Brighton & Hove Albion', '367', 'Tottenham Hotspur'],
      ['401878704', '2027-02-20T15:00Z', 'Ipswich Town at Chelsea', 'Stamford Bridge', '363', 'Chelsea', '373', 'Ipswich Town'],
      ['401879136', '2027-02-20T15:00Z', 'Aston Villa at Leeds United', 'Elland Road', '357', 'Leeds United', '362', 'Aston Villa'],
      ['401878703', '2027-02-20T15:00Z', 'Hull City at Liverpool', 'Anfield', '364', 'Liverpool', '306', 'Hull City'],
      ['401879135', '2027-02-20T15:00Z', 'Newcastle United at Manchester City', 'Etihad Stadium', '382', 'Manchester City', '361', 'Newcastle United'],
      ['401879134', '2027-02-20T15:00Z', 'Manchester United at Nottingham Forest', 'The City Ground', '393', 'Nottingham Forest', '360', 'Manchester United'],
      ['401878702', '2027-02-20T15:00Z', 'Everton at Sunderland', 'Stadium of Light', '366', 'Sunderland', '368', 'Everton'],
    ],
  },
];

export const MATCH_CENTER_ENGLISH_20270220_20270226_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة eng.1 20270220-20270226، وفيها 10 أحداث مجدولة مع معرّفات الفرق والجانبين والملاعب. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر؛ هذه نافذة منفصلة عن خرج esp.1 للفترة نفسها.',
  receivedRanges: MATCH_CENTER_ENGLISH_20270220_20270226_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20270220_20270226_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20270220_20270226_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};


export const MATCH_CENTER_ENGLISH_20270227_20270305_RANGES = [
  {
    dates: '20270227-20270305',
    complete: true,
    events: [
      ['401879133', '2027-02-27T15:00Z', 'Chelsea at Aston Villa', 'Villa Park', '362', 'Aston Villa', '363', 'Chelsea'],
      ['401879132', '2027-02-27T15:00Z', 'AFC Bournemouth at Coventry City', 'Coventry Building Society Arena', '388', 'Coventry City', '349', 'AFC Bournemouth'],
      ['401878701', '2027-02-27T15:00Z', 'Sunderland at Crystal Palace', 'Selhurst Park', '384', 'Crystal Palace', '366', 'Sunderland'],
      ['401878700', '2027-02-27T15:00Z', 'Nottingham Forest at Everton', 'Hill Dickinson Stadium', '368', 'Everton', '393', 'Nottingham Forest'],
      ['401878699', '2027-02-27T15:00Z', 'Leeds United at Fulham', 'Craven Cottage', '370', 'Fulham', '357', 'Leeds United'],
      ['401878698', '2027-02-27T15:00Z', 'Manchester City at Hull City', 'The MKM Stadium', '306', 'Hull City', '382', 'Manchester City'],
      ['401879131', '2027-02-27T15:00Z', 'Brighton & Hove Albion at Ipswich Town', 'Portman Road', '373', 'Ipswich Town', '331', 'Brighton & Hove Albion'],
      ['401878697', '2027-02-27T15:00Z', 'Arsenal at Manchester United', 'Old Trafford', '360', 'Manchester United', '359', 'Arsenal'],
      ['401879130', '2027-02-27T15:00Z', 'Brentford at Newcastle United', "St. James' Park", '361', 'Newcastle United', '337', 'Brentford'],
      ['401879129', '2027-02-27T15:00Z', 'Liverpool at Tottenham Hotspur', 'Tottenham Hotspur Stadium', '367', 'Tottenham Hotspur', '364', 'Liverpool'],
      ['401879128', '2027-03-03T20:00Z', 'Tottenham Hotspur at AFC Bournemouth', 'Vitality Stadium', '349', 'AFC Bournemouth', '367', 'Tottenham Hotspur'],
      ['401878696', '2027-03-03T20:00Z', 'Crystal Palace at Arsenal', 'Emirates Stadium', '359', 'Arsenal', '384', 'Crystal Palace'],
      ['401879127', '2027-03-03T20:00Z', 'Ipswich Town at Brentford', 'Gtech Community Stadium', '337', 'Brentford', '373', 'Ipswich Town'],
      ['401878695', '2027-03-03T20:00Z', 'Fulham at Brighton & Hove Albion', 'American Express Stadium', '331', 'Brighton & Hove Albion', '370', 'Fulham'],
      ['401879126', '2027-03-03T20:00Z', 'Coventry City at Chelsea', 'Stamford Bridge', '363', 'Chelsea', '388', 'Coventry City'],
      ['401878694', '2027-03-03T20:00Z', 'Hull City at Leeds United', 'Elland Road', '357', 'Leeds United', '306', 'Hull City'],
      ['401879125', '2027-03-03T20:00Z', 'Aston Villa at Liverpool', 'Anfield', '364', 'Liverpool', '362', 'Aston Villa'],
      ['401879124', '2027-03-03T20:00Z', 'Everton at Manchester City', 'Etihad Stadium', '382', 'Manchester City', '368', 'Everton'],
      ['401879123', '2027-03-03T20:00Z', 'Newcastle United at Nottingham Forest', 'The City Ground', '393', 'Nottingham Forest', '361', 'Newcastle United'],
      ['401879122', '2027-03-03T20:00Z', 'Manchester United at Sunderland', 'Stadium of Light', '366', 'Sunderland', '360', 'Manchester United'],
    ],
  },
];

export const MATCH_CENTER_ENGLISH_20270227_20270305_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة eng.1 20270227-20270305، وفيها 20 حدثاً مجدولاً مع معرّفات الفرق والجانبين والملاعب. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر؛ هذه نافذة منفصلة عن خرج esp.1 للفترة نفسها.',
  receivedRanges: MATCH_CENTER_ENGLISH_20270227_20270305_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20270227_20270305_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20270227_20270305_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};


/** نافذة إنجليزية فارغة كما أرسلها المستخدم؛ سجل تدقيق فقط ولا يعني انتهاء الموسم. */
export const MATCH_CENTER_ENGLISH_20270306_20270312_RANGES = [
  {
    dates: '20270306-20270312',
    complete: true,
    events: [],
  },
];

export const MATCH_CENTER_ENGLISH_20270306_20270312_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة eng.1 20270306-20270312 وكانت events فارغة؛ سُجّلت للتدقيق فقط بلا fixtures ولا يُستنتج منها انتهاء الموسم. هذه نافذة إنجليزية منفصلة عن خرج esp.1 للفترة نفسها، الذي يظل سجلاً مستقلاً. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر.',
  receivedRanges: MATCH_CENTER_ENGLISH_20270306_20270312_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20270306_20270312_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20270306_20270312_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};


export const MATCH_CENTER_ENGLISH_20270313_20270319_RANGES = [
  {
    dates: '20270313-20270319',
    complete: true,
    events: [
      ['401879121', '2027-03-13T15:00Z', 'Newcastle United at AFC Bournemouth', 'Vitality Stadium', '349', 'AFC Bournemouth', '361', 'Newcastle United'],
      ['401879120', '2027-03-13T15:00Z', 'Hull City at Aston Villa', 'Villa Park', '362', 'Aston Villa', '306', 'Hull City'],
      ['401878693', '2027-03-13T15:00Z', 'Arsenal at Chelsea', 'Stamford Bridge', '363', 'Chelsea', '359', 'Arsenal'],
      ['401878692', '2027-03-13T15:00Z', 'Manchester City at Coventry City', 'Coventry Building Society Arena', '388', 'Coventry City', '382', 'Manchester City'],
      ['401878691', '2027-03-13T15:00Z', 'Fulham at Crystal Palace', 'Selhurst Park', '384', 'Crystal Palace', '370', 'Fulham'],
      ['401879119', '2027-03-13T15:00Z', 'Brighton & Hove Albion at Leeds United', 'Elland Road', '357', 'Leeds United', '331', 'Brighton & Hove Albion'],
      ['401878690', '2027-03-13T15:00Z', 'Ipswich Town at Liverpool', 'Anfield', '364', 'Liverpool', '373', 'Ipswich Town'],
      ['401879118', '2027-03-13T15:00Z', 'Everton at Manchester United', 'Old Trafford', '360', 'Manchester United', '368', 'Everton'],
      ['401879117', '2027-03-13T15:00Z', 'Brentford at Sunderland', 'Stadium of Light', '366', 'Sunderland', '337', 'Brentford'],
      ['401879116', '2027-03-13T15:00Z', 'Nottingham Forest at Tottenham Hotspur', 'Tottenham Hotspur Stadium', '367', 'Tottenham Hotspur', '393', 'Nottingham Forest'],
    ],
  },
];

export const MATCH_CENTER_ENGLISH_20270313_20270319_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة eng.1 20270313-20270319، وفيها 10 أحداث مجدولة مع معرّفات الفرق والجانبين والملاعب. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر؛ هذه نافذة منفصلة عن خرج esp.1 للفترة نفسها.',
  receivedRanges: MATCH_CENTER_ENGLISH_20270313_20270319_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20270313_20270319_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20270313_20270319_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};


export const MATCH_CENTER_ENGLISH_20270320_20270326_RANGES = [
  {
    dates: '20270320-20270326',
    complete: true,
    events: [
      ['401879115', '2027-03-20T15:00Z', 'Sunderland at Arsenal', 'Emirates Stadium', '359', 'Arsenal', '366', 'Sunderland'],
      ['401879114', '2027-03-20T15:00Z', 'AFC Bournemouth at Brentford', 'Gtech Community Stadium', '337', 'Brentford', '349', 'AFC Bournemouth'],
      ['401879113', '2027-03-20T15:00Z', 'Coventry City at Brighton & Hove Albion', 'American Express Stadium', '331', 'Brighton & Hove Albion', '388', 'Coventry City'],
      ['401879112', '2027-03-20T15:00Z', 'Tottenham Hotspur at Everton', 'Hill Dickinson Stadium', '368', 'Everton', '367', 'Tottenham Hotspur'],
      ['401879111', '2027-03-20T15:00Z', 'Liverpool at Fulham', 'Craven Cottage', '370', 'Fulham', '364', 'Liverpool'],
      ['401879110', '2027-03-20T15:00Z', 'Chelsea at Hull City', 'The MKM Stadium', '306', 'Hull City', '363', 'Chelsea'],
      ['401879109', '2027-03-20T15:00Z', 'Crystal Palace at Ipswich Town', 'Portman Road', '373', 'Ipswich Town', '384', 'Crystal Palace'],
      ['401879108', '2027-03-20T15:00Z', 'Manchester United at Manchester City', 'Etihad Stadium', '382', 'Manchester City', '360', 'Manchester United'],
      ['401879107', '2027-03-20T15:00Z', 'Leeds United at Newcastle United', "St. James' Park", '361', 'Newcastle United', '357', 'Leeds United'],
      ['401878689', '2027-03-20T15:00Z', 'Aston Villa at Nottingham Forest', 'The City Ground', '393', 'Nottingham Forest', '362', 'Aston Villa'],
    ],
  },
];

export const MATCH_CENTER_ENGLISH_20270320_20270326_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة eng.1 20270320-20270326، وفيها 10 أحداث مجدولة مع معرّفات الفرق والجانبين والملاعب. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر؛ هذه نافذة منفصلة عن خرج esp.1 للفترة نفسها.',
  receivedRanges: MATCH_CENTER_ENGLISH_20270320_20270326_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20270320_20270326_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20270320_20270326_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};


/** نافذة إنجليزية فارغة كما أرسلها المستخدم؛ سجل تدقيق فقط ولا يعني انتهاء الموسم. */
export const MATCH_CENTER_ENGLISH_20270327_20270402_RANGES = [
  {
    dates: '20270327-20270402',
    complete: true,
    events: [],
  },
];

export const MATCH_CENTER_ENGLISH_20270327_20270402_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة eng.1 20270327-20270402 وكانت events فارغة؛ سُجّلت للتدقيق فقط بلا fixtures ولا يُستنتج منها انتهاء الموسم. هذه نافذة إنجليزية منفصلة عن سجل esp.1 للفترة نفسها. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر.',
  receivedRanges: MATCH_CENTER_ENGLISH_20270327_20270402_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20270327_20270402_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20270327_20270402_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};


/** نافذة إنجليزية فارغة كما أرسلها المستخدم؛ سجل تدقيق فقط ولا يعني انتهاء الموسم. */
export const MATCH_CENTER_ENGLISH_20270403_20270409_RANGES = [
  {
    dates: '20270403-20270409',
    complete: true,
    events: [],
  },
];

export const MATCH_CENTER_ENGLISH_20270403_20270409_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة eng.1 20270403-20270409 وكانت events فارغة؛ سُجّلت للتدقيق فقط بلا fixtures ولا يُستنتج منها انتهاء الموسم. هذه نافذة إنجليزية منفصلة عن خرج esp.1 للفترة نفسها، الذي يظل سجلاً مستقلاً. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر.',
  receivedRanges: MATCH_CENTER_ENGLISH_20270403_20270409_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20270403_20270409_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20270403_20270409_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};


export const MATCH_CENTER_ENGLISH_20270410_20270416_RANGES = [
  {
    dates: '20270410-20270416',
    complete: true,
    events: [
      ['401879106', '2027-04-10T14:00Z', 'Manchester City at AFC Bournemouth', 'Vitality Stadium', '349', 'AFC Bournemouth', '382', 'Manchester City'],
      ['401879105', '2027-04-10T14:00Z', 'Brighton & Hove Albion at Aston Villa', 'Villa Park', '362', 'Aston Villa', '331', 'Brighton & Hove Albion'],
      ['401879104', '2027-04-10T14:00Z', 'Fulham at Chelsea', 'Stamford Bridge', '363', 'Chelsea', '370', 'Fulham'],
      ['401879103', '2027-04-10T14:00Z', 'Arsenal at Coventry City', 'Coventry Building Society Arena', '388', 'Coventry City', '359', 'Arsenal'],
      ['401879102', '2027-04-10T14:00Z', 'Everton at Crystal Palace', 'Selhurst Park', '384', 'Crystal Palace', '368', 'Everton'],
      ['401878688', '2027-04-10T14:00Z', 'Nottingham Forest at Leeds United', 'Elland Road', '357', 'Leeds United', '393', 'Nottingham Forest'],
      ['401879101', '2027-04-10T14:00Z', 'Newcastle United at Liverpool', 'Anfield', '364', 'Liverpool', '361', 'Newcastle United'],
      ['401879100', '2027-04-10T14:00Z', 'Hull City at Manchester United', 'Old Trafford', '360', 'Manchester United', '306', 'Hull City'],
      ['401878687', '2027-04-10T14:00Z', 'Ipswich Town at Sunderland', 'Stadium of Light', '366', 'Sunderland', '373', 'Ipswich Town'],
      ['401879099', '2027-04-10T14:00Z', 'Brentford at Tottenham Hotspur', 'Tottenham Hotspur Stadium', '367', 'Tottenham Hotspur', '337', 'Brentford'],
    ],
  },
];

export const MATCH_CENTER_ENGLISH_20270410_20270416_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة eng.1 20270410-20270416، وفيها 10 أحداث مجدولة مع معرّفات الفرق والجانبين والملاعب. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر؛ هذه نافذة منفصلة عن خرج esp.1 للفترة نفسها.',
  receivedRanges: MATCH_CENTER_ENGLISH_20270410_20270416_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20270410_20270416_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20270410_20270416_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};


export const MATCH_CENTER_ENGLISH_20270417_20270423_RANGES = [
  {
    dates: '20270417-20270423',
    complete: true,
    events: [
      ['401878686', '2027-04-17T14:00Z', 'Aston Villa at Arsenal', 'Emirates Stadium', '359', 'Arsenal', '362', 'Aston Villa'],
      ['401879098', '2027-04-17T14:00Z', 'Leeds United at Brentford', 'Gtech Community Stadium', '337', 'Brentford', '357', 'Leeds United'],
      ['401878685', '2027-04-17T14:00Z', 'Chelsea at Brighton & Hove Albion', 'American Express Stadium', '331', 'Brighton & Hove Albion', '363', 'Chelsea'],
      ['401878684', '2027-04-17T14:00Z', 'AFC Bournemouth at Everton', 'Hill Dickinson Stadium', '368', 'Everton', '349', 'AFC Bournemouth'],
      ['401879097', '2027-04-17T14:00Z', 'Sunderland at Fulham', 'Craven Cottage', '370', 'Fulham', '366', 'Sunderland'],
      ['401878683', '2027-04-17T14:00Z', 'Coventry City at Hull City', 'The MKM Stadium', '306', 'Hull City', '388', 'Coventry City'],
      ['401879096', '2027-04-17T14:00Z', 'Manchester United at Ipswich Town', 'Portman Road', '373', 'Ipswich Town', '360', 'Manchester United'],
      ['401879095', '2027-04-17T14:00Z', 'Crystal Palace at Manchester City', 'Etihad Stadium', '382', 'Manchester City', '384', 'Crystal Palace'],
      ['401878682', '2027-04-17T14:00Z', 'Tottenham Hotspur at Newcastle United', "St. James' Park", '361', 'Newcastle United', '367', 'Tottenham Hotspur'],
      ['401878681', '2027-04-17T14:00Z', 'Liverpool at Nottingham Forest', 'The City Ground', '393', 'Nottingham Forest', '364', 'Liverpool'],
    ],
  },
];

export const MATCH_CENTER_ENGLISH_20270417_20270423_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة eng.1 20270417-20270423، وفيها 10 أحداث مجدولة مع معرّفات الفرق والجانبين والملاعب. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر؛ هذه نافذة منفصلة عن خرج esp.1 للفترة نفسها.',
  receivedRanges: MATCH_CENTER_ENGLISH_20270417_20270423_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20270417_20270423_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20270417_20270423_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};


export const MATCH_CENTER_ENGLISH_20270424_20270430_RANGES = [
  {
    dates: '20270424-20270430',
    complete: true,
    events: [
      ['401878680', '2027-04-24T14:00Z', 'Arsenal at AFC Bournemouth', 'Vitality Stadium', '349', 'AFC Bournemouth', '359', 'Arsenal'],
      ['401878679', '2027-04-24T14:00Z', 'Coventry City at Aston Villa', 'Villa Park', '362', 'Aston Villa', '388', 'Coventry City'],
      ['401878678', '2027-04-24T14:00Z', 'Fulham at Brentford', 'Gtech Community Stadium', '337', 'Brentford', '370', 'Fulham'],
      ['401879094', '2027-04-24T14:00Z', 'Manchester City at Chelsea', 'Stamford Bridge', '363', 'Chelsea', '382', 'Manchester City'],
      ['401879093', '2027-04-24T14:00Z', 'Brighton & Hove Albion at Everton', 'Hill Dickinson Stadium', '368', 'Everton', '331', 'Brighton & Hove Albion'],
      ['401879092', '2027-04-24T14:00Z', 'Liverpool at Leeds United', 'Elland Road', '357', 'Leeds United', '364', 'Liverpool'],
      ['401879091', '2027-04-24T14:00Z', 'Crystal Palace at Manchester United', 'Old Trafford', '360', 'Manchester United', '384', 'Crystal Palace'],
      ['401879090', '2027-04-24T14:00Z', 'Ipswich Town at Newcastle United', "St. James' Park", '361', 'Newcastle United', '373', 'Ipswich Town'],
      ['401879089', '2027-04-24T14:00Z', 'Sunderland at Nottingham Forest', 'The City Ground', '393', 'Nottingham Forest', '366', 'Sunderland'],
      ['401878677', '2027-04-24T14:00Z', 'Hull City at Tottenham Hotspur', 'Tottenham Hotspur Stadium', '367', 'Tottenham Hotspur', '306', 'Hull City'],
    ],
  },
];

export const MATCH_CENTER_ENGLISH_20270424_20270430_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة eng.1 20270424-20270430، وفيها 10 أحداث مجدولة مع معرّفات الفرق والجانبين والملاعب. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر؛ هذه نافذة منفصلة عن خرج esp.1 للفترة نفسها.',
  receivedRanges: MATCH_CENTER_ENGLISH_20270424_20270430_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20270424_20270430_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20270424_20270430_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};


export const MATCH_CENTER_ENGLISH_20270501_20270507_RANGES = [
  {
    dates: '20270501-20270507',
    complete: true,
    events: [
      ['401878676', '2027-05-01T14:00Z', 'Tottenham Hotspur at Arsenal', 'Emirates Stadium', '359', 'Arsenal', '367', 'Tottenham Hotspur'],
      ['401879088', '2027-05-01T14:00Z', 'Nottingham Forest at Brighton & Hove Albion', 'American Express Stadium', '331', 'Brighton & Hove Albion', '393', 'Nottingham Forest'],
      ['401878675', '2027-05-01T14:00Z', 'Manchester United at Coventry City', 'Coventry Building Society Arena', '388', 'Coventry City', '360', 'Manchester United'],
      ['401879087', '2027-05-01T14:00Z', 'Aston Villa at Crystal Palace', 'Selhurst Park', '384', 'Crystal Palace', '362', 'Aston Villa'],
      ['401879086', '2027-05-01T14:00Z', 'Everton at Fulham', 'Craven Cottage', '370', 'Fulham', '368', 'Everton'],
      ['401879085', '2027-05-01T14:00Z', 'AFC Bournemouth at Hull City', 'The MKM Stadium', '306', 'Hull City', '349', 'AFC Bournemouth'],
      ['401879084', '2027-05-01T14:00Z', 'Leeds United at Ipswich Town', 'Portman Road', '373', 'Ipswich Town', '357', 'Leeds United'],
      ['401878674', '2027-05-01T14:00Z', 'Chelsea at Liverpool', 'Anfield', '364', 'Liverpool', '363', 'Chelsea'],
      ['401879083', '2027-05-01T14:00Z', 'Brentford at Manchester City', 'Etihad Stadium', '382', 'Manchester City', '337', 'Brentford'],
      ['401878673', '2027-05-01T14:00Z', 'Newcastle United at Sunderland', 'Stadium of Light', '366', 'Sunderland', '361', 'Newcastle United'],
    ],
  },
];

export const MATCH_CENTER_ENGLISH_20270501_20270507_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة eng.1 20270501-20270507، وفيها 10 أحداث مجدولة مع معرّفات الفرق والجانبين والملاعب. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر؛ هذه نافذة منفصلة عن خرج esp.1 للفترة نفسها.',
  receivedRanges: MATCH_CENTER_ENGLISH_20270501_20270507_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20270501_20270507_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20270501_20270507_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};


export const MATCH_CENTER_ENGLISH_20270508_20270514_RANGES = [
  {
    dates: '20270508-20270514',
    complete: true,
    events: [
      ['401878672', '2027-05-08T14:00Z', 'Manchester United at AFC Bournemouth', 'Vitality Stadium', '349', 'AFC Bournemouth', '360', 'Manchester United'],
      ['401879082', '2027-05-08T14:00Z', 'Aston Villa at Brentford', 'Gtech Community Stadium', '337', 'Brentford', '362', 'Aston Villa'],
      ['401878671', '2027-05-08T14:00Z', 'Sunderland at Brighton & Hove Albion', 'American Express Stadium', '331', 'Brighton & Hove Albion', '366', 'Sunderland'],
      ['401878670', '2027-05-08T14:00Z', 'Hull City at Everton', 'Hill Dickinson Stadium', '368', 'Everton', '306', 'Hull City'],
      ['401878669', '2027-05-08T14:00Z', 'Ipswich Town at Fulham', 'Craven Cottage', '370', 'Fulham', '373', 'Ipswich Town'],
      ['401879081', '2027-05-08T14:00Z', 'Arsenal at Leeds United', 'Elland Road', '357', 'Leeds United', '359', 'Arsenal'],
      ['401878668', '2027-05-08T14:00Z', 'Liverpool at Manchester City', 'Etihad Stadium', '382', 'Manchester City', '364', 'Liverpool'],
      ['401879080', '2027-05-08T14:00Z', 'Coventry City at Newcastle United', "St. James' Park", '361', 'Newcastle United', '388', 'Coventry City'],
      ['401878667', '2027-05-08T14:00Z', 'Crystal Palace at Nottingham Forest', 'The City Ground', '393', 'Nottingham Forest', '384', 'Crystal Palace'],
      ['401878666', '2027-05-08T14:00Z', 'Chelsea at Tottenham Hotspur', 'Tottenham Hotspur Stadium', '367', 'Tottenham Hotspur', '363', 'Chelsea'],
    ],
  },
];

export const MATCH_CENTER_ENGLISH_20270508_20270514_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة eng.1 20270508-20270514، وفيها 10 أحداث مجدولة مع معرّفات الفرق والجانبين والملاعب. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر؛ هذه نافذة منفصلة عن خرج esp.1 للفترة نفسها.',
  receivedRanges: MATCH_CENTER_ENGLISH_20270508_20270514_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20270508_20270514_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20270508_20270514_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};


export const MATCH_CENTER_ENGLISH_20270515_20270521_RANGES = [
  {
    dates: '20270515-20270521',
    complete: true,
    events: [
      ['401879079', '2027-05-15T14:00Z', 'Nottingham Forest at Arsenal', 'Emirates Stadium', '359', 'Arsenal', '393', 'Nottingham Forest'],
      ['401878665', '2027-05-15T14:00Z', 'Newcastle United at Aston Villa', 'Villa Park', '362', 'Aston Villa', '361', 'Newcastle United'],
      ['401879078', '2027-05-15T14:00Z', 'Everton at Chelsea', 'Stamford Bridge', '363', 'Chelsea', '368', 'Everton'],
      ['401879077', '2027-05-15T14:00Z', 'Tottenham Hotspur at Coventry City', 'Coventry Building Society Arena', '388', 'Coventry City', '367', 'Tottenham Hotspur'],
      ['401878664', '2027-05-15T14:00Z', 'Brighton & Hove Albion at Crystal Palace', 'Selhurst Park', '384', 'Crystal Palace', '331', 'Brighton & Hove Albion'],
      ['401879076', '2027-05-15T14:00Z', 'Fulham at Hull City', 'The MKM Stadium', '306', 'Hull City', '370', 'Fulham'],
      ['401879075', '2027-05-15T14:00Z', 'Manchester City at Ipswich Town', 'Portman Road', '373', 'Ipswich Town', '382', 'Manchester City'],
      ['401878663', '2027-05-15T14:00Z', 'Brentford at Liverpool', 'Anfield', '364', 'Liverpool', '337', 'Brentford'],
      ['401879074', '2027-05-15T14:00Z', 'Leeds United at Manchester United', 'Old Trafford', '360', 'Manchester United', '357', 'Leeds United'],
      ['401879073', '2027-05-15T14:00Z', 'AFC Bournemouth at Sunderland', 'Stadium of Light', '366', 'Sunderland', '349', 'AFC Bournemouth'],
    ],
  },
];

export const MATCH_CENTER_ENGLISH_20270515_20270521_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة eng.1 20270515-20270521، وفيها 10 أحداث مجدولة مع معرّفات الفرق والجانبين والملاعب. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر؛ هذه نافذة منفصلة عن خرج esp.1 للفترة نفسها.',
  receivedRanges: MATCH_CENTER_ENGLISH_20270515_20270521_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20270515_20270521_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20270515_20270521_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};


export const MATCH_CENTER_ENGLISH_20270522_20270528_RANGES = [
  {
    dates: '20270522-20270528',
    complete: true,
    events: [
      ['401879072', '2027-05-23T14:00Z', 'Chelsea at AFC Bournemouth', 'Vitality Stadium', '349', 'AFC Bournemouth', '363', 'Chelsea'],
      ['401879071', '2027-05-23T14:00Z', 'Hull City at Brentford', 'Gtech Community Stadium', '337', 'Brentford', '306', 'Hull City'],
      ['401878662', '2027-05-23T14:00Z', 'Liverpool at Brighton & Hove Albion', 'American Express Stadium', '331', 'Brighton & Hove Albion', '364', 'Liverpool'],
      ['401879070', '2027-05-23T14:00Z', 'Arsenal at Everton', 'Hill Dickinson Stadium', '368', 'Everton', '359', 'Arsenal'],
      ['401879069', '2027-05-23T14:00Z', 'Coventry City at Fulham', 'Craven Cottage', '370', 'Fulham', '388', 'Coventry City'],
      ['401879068', '2027-05-23T14:00Z', 'Sunderland at Leeds United', 'Elland Road', '357', 'Leeds United', '366', 'Sunderland'],
      ['401879067', '2027-05-23T14:00Z', 'Aston Villa at Manchester City', 'Etihad Stadium', '382', 'Manchester City', '362', 'Aston Villa'],
      ['401879066', '2027-05-23T14:00Z', 'Crystal Palace at Newcastle United', "St. James' Park", '361', 'Newcastle United', '384', 'Crystal Palace'],
      ['401878661', '2027-05-23T14:00Z', 'Ipswich Town at Nottingham Forest', 'The City Ground', '393', 'Nottingham Forest', '373', 'Ipswich Town'],
      ['401879065', '2027-05-23T14:00Z', 'Manchester United at Tottenham Hotspur', 'Tottenham Hotspur Stadium', '367', 'Tottenham Hotspur', '360', 'Manchester United'],
    ],
  },
];

export const MATCH_CENTER_ENGLISH_20270522_20270528_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة eng.1 20270522-20270528، وفيها 10 أحداث مجدولة مع معرّفات الفرق والجانبين والملاعب. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر؛ هذه نافذة منفصلة عن خرج esp.1 للفترة نفسها.',
  receivedRanges: MATCH_CENTER_ENGLISH_20270522_20270528_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20270522_20270528_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20270522_20270528_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};


export const MATCH_CENTER_ENGLISH_20270529_20270604_RANGES = [
  {
    dates: '20270529-20270604',
    complete: true,
    events: [
      ['401878660', '2027-05-30T15:00Z', 'Brighton & Hove Albion at Arsenal', 'Emirates Stadium', '359', 'Arsenal', '331', 'Brighton & Hove Albion'],
      ['401879064', '2027-05-30T15:00Z', 'Tottenham Hotspur at Aston Villa', 'Villa Park', '362', 'Aston Villa', '367', 'Tottenham Hotspur'],
      ['401879063', '2027-05-30T15:00Z', 'Brentford at Chelsea', 'Stamford Bridge', '363', 'Chelsea', '337', 'Brentford'],
      ['401878659', '2027-05-30T15:00Z', 'Nottingham Forest at Coventry City', 'Coventry Building Society Arena', '388', 'Coventry City', '393', 'Nottingham Forest'],
      ['401879062', '2027-05-30T15:00Z', 'Leeds United at Crystal Palace', 'Selhurst Park', '384', 'Crystal Palace', '357', 'Leeds United'],
      ['401879061', '2027-05-30T15:00Z', 'Newcastle United at Hull City', 'The MKM Stadium', '306', 'Hull City', '361', 'Newcastle United'],
      ['401879060', '2027-05-30T15:00Z', 'Everton at Ipswich Town', 'Portman Road', '373', 'Ipswich Town', '368', 'Everton'],
      ['401879059', '2027-05-30T15:00Z', 'AFC Bournemouth at Liverpool', 'Anfield', '364', 'Liverpool', '349', 'AFC Bournemouth'],
      ['401879058', '2027-05-30T15:00Z', 'Fulham at Manchester United', 'Old Trafford', '360', 'Manchester United', '370', 'Fulham'],
      ['401878658', '2027-05-30T15:00Z', 'Manchester City at Sunderland', 'Stadium of Light', '366', 'Sunderland', '382', 'Manchester City'],
    ],
  },
];

export const MATCH_CENTER_ENGLISH_20270529_20270604_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة eng.1 20270529-20270604، وفيها 10 أحداث مجدولة مع معرّفات الفرق والجانبين والملاعب. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر؛ هذه نافذة منفصلة عن خرج esp.1 للفترة نفسها.',
  receivedRanges: MATCH_CENTER_ENGLISH_20270529_20270604_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20270529_20270604_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20270529_20270604_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};


/** نافذة إنجليزية فارغة كما أرسلها المستخدم؛ سجل تدقيق فقط ولا يعني انتهاء الموسم. */
export const MATCH_CENTER_ENGLISH_20270605_20270611_RANGES = [
  {
    dates: '20270605-20270611',
    complete: true,
    events: [],
  },
];

export const MATCH_CENTER_ENGLISH_20270605_20270611_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'eng.1',
  method: 'أرسل المستخدم مخرجات scoreboard.php للنافذة eng.1 20270605-20270611 وكانت events فارغة؛ سُجّلت للتدقيق فقط بلا fixtures ولا يُستنتج منها انتهاء الموسم. سجل esp.1 لنافذته المستقلة يظل منفصلاً، ولا يُعامل كنطاق مطابق. لم ينفّذ المساعد طلب API ولم يتحقق استقلالياً من المصدر.',
  receivedRanges: MATCH_CENTER_ENGLISH_20270605_20270611_RANGES.map(({ dates, events, complete }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    eventCount: events.length,
    complete,
  })),
  receivedEvents: MATCH_CENTER_ENGLISH_20270605_20270611_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_ENGLISH_20270605_20270611_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};
