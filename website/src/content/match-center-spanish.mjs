/*
 * Fixtures esp.1 recibidos por el usuario desde scoreboard.php.
 *
 * Esta tabla conserva literalmente los valores compartidos (event ID, hora UTC,
 * nombre del evento, estadio y team IDs/nombres de home/away). El asistente no
 * ejecutó el endpoint ni afirma una comprobación independiente contra ESPN.
 * Las definiciones publicables se derivan de estas filas y validan además que
 * el nombre del evento "away at home" coincide con los dos equipos recibidos.
 */

import {
  MATCH_CENTER_SPANISH_20261212_20270205_RANGES,
  MATCH_CENTER_SPANISH_20261212_20270205_VERIFICATION,
  MATCH_CENTER_SPANISH_20270206_20270212_RANGES,
  MATCH_CENTER_SPANISH_20270206_20270212_VERIFICATION,
  MATCH_CENTER_SPANISH_20270213_20270219_RANGES,
  MATCH_CENTER_SPANISH_20270213_20270219_VERIFICATION,
  MATCH_CENTER_SPANISH_20270220_20270226_RANGES,
  MATCH_CENTER_SPANISH_20270220_20270226_VERIFICATION,
  MATCH_CENTER_SPANISH_20270227_20270305_RANGES,
  MATCH_CENTER_SPANISH_20270227_20270305_VERIFICATION,
  MATCH_CENTER_SPANISH_20270306_20270312_RANGES,
  MATCH_CENTER_SPANISH_20270306_20270312_VERIFICATION,
  MATCH_CENTER_SPANISH_20270313_20270319_RANGES,
  MATCH_CENTER_SPANISH_20270313_20270319_VERIFICATION,
  MATCH_CENTER_SPANISH_20270320_20270326_RANGES,
  MATCH_CENTER_SPANISH_20270320_20270326_VERIFICATION,
  MATCH_CENTER_SPANISH_20270403_20270409_RANGES,
  MATCH_CENTER_SPANISH_20270403_20270409_VERIFICATION,
  MATCH_CENTER_SPANISH_20270410_20270416_RANGES,
  MATCH_CENTER_SPANISH_20270410_20270416_VERIFICATION,
  MATCH_CENTER_SPANISH_20270417_20270423_RANGES,
  MATCH_CENTER_SPANISH_20270417_20270423_VERIFICATION,
  MATCH_CENTER_SPANISH_20270501_20270507_RANGES,
  MATCH_CENTER_SPANISH_20270501_20270507_VERIFICATION,
  MATCH_CENTER_SPANISH_20270508_20270514_RANGES,
  MATCH_CENTER_SPANISH_20270508_20270514_VERIFICATION,
  MATCH_CENTER_SPANISH_20270515_20270521_RANGES,
  MATCH_CENTER_SPANISH_20270515_20270521_VERIFICATION,
  MATCH_CENTER_SPANISH_20270522_20270528_RANGES,
  MATCH_CENTER_SPANISH_20270522_20270528_VERIFICATION,
  MATCH_CENTER_SPANISH_20270529_20270604_RANGES,
  MATCH_CENTER_SPANISH_20270529_20270604_VERIFICATION,
} from './match-center-spanish-followup.mjs';
export {
  MATCH_CENTER_SPANISH_20261212_20270205_VERIFICATION,
  MATCH_CENTER_SPANISH_20270206_20270212_VERIFICATION,
  MATCH_CENTER_SPANISH_20270213_20270219_VERIFICATION,
  MATCH_CENTER_SPANISH_20270220_20270226_VERIFICATION,
  MATCH_CENTER_SPANISH_20270227_20270305_VERIFICATION,
  MATCH_CENTER_SPANISH_20270306_20270312_VERIFICATION,
  MATCH_CENTER_SPANISH_20270313_20270319_VERIFICATION,
  MATCH_CENTER_SPANISH_20270320_20270326_VERIFICATION,
  MATCH_CENTER_SPANISH_20270403_20270409_VERIFICATION,
  MATCH_CENTER_SPANISH_20270410_20270416_VERIFICATION,
  MATCH_CENTER_SPANISH_20270417_20270423_VERIFICATION,
  MATCH_CENTER_SPANISH_20270501_20270507_VERIFICATION,
  MATCH_CENTER_SPANISH_20270508_20270514_VERIFICATION,
  MATCH_CENTER_SPANISH_20270515_20270521_VERIFICATION,
  MATCH_CENTER_SPANISH_20270522_20270528_VERIFICATION,
  MATCH_CENTER_SPANISH_20270529_20270604_VERIFICATION,
};

const MATCH_CENTER_SPANISH_20261017_20261211_RANGES = [
  {
    dates: '20261017-20261023',
    events: [
      ['401882843', '2026-10-17T12:00Z', 'Atlético Madrid at Espanyol', 'RCDE Stadium', '88', 'Espanyol', '1068', 'Atlético Madrid'],
      ['401882837', '2026-10-17T14:15Z', 'Elche at Villarreal', 'Estadio de la Cerámica', '102', 'Villarreal', '3751', 'Elche'],
      ['401882846', '2026-10-17T16:00Z', 'Barcelona at Real Betis', 'Estadio La Cartuja', '244', 'Real Betis', '83', 'Barcelona'],
      ['401882838', '2026-10-17T19:00Z', 'Athletic Club at Valencia', 'Mestalla Stadium', '94', 'Valencia', '93', 'Athletic Club'],
      ['401882840', '2026-10-18T12:00Z', 'Racing Santander at Osasuna', 'El Sadar', '97', 'Osasuna', '87', 'Racing Santander'],
      ['401882845', '2026-10-18T14:15Z', 'Alavés at Celta Vigo', 'Balaidos', '85', 'Celta Vigo', '96', 'Alavés'],
      ['401882841', '2026-10-18T16:30Z', 'Real Sociedad at Málaga', 'La Rosaleda', '99', 'Málaga', '89', 'Real Sociedad'],
      ['401882839', '2026-10-18T19:00Z', 'Sevilla at Real Madrid', 'Santiago Bernabéu', '86', 'Real Madrid', '243', 'Sevilla'],
      ['401882842', '2026-10-19T19:00Z', 'Rayo Vallecano at Getafe', 'Estadio Coliseum', '2922', 'Getafe', '101', 'Rayo Vallecano'],
      ['401882870', '2026-10-21T18:00Z', 'Athletic Club at Levante', 'Estadi Ciutat de València', '1538', 'Levante', '93', 'Athletic Club'],
      ['401882836', '2026-10-23T19:00Z', 'Málaga at Alavés', 'Mendizorrotza', '96', 'Alavés', '99', 'Málaga'],
    ],
  },
  {
    dates: '20261024-20261030',
    events: [
      ['401882830', '2026-10-24T12:00Z', 'Elche at Rayo Vallecano', 'Estadio de Vallecas', '101', 'Rayo Vallecano', '3751', 'Elche'],
      ['401882831', '2026-10-24T14:15Z', 'Espanyol at Racing Santander', 'El Sardineros', '87', 'Racing Santander', '88', 'Espanyol'],
      ['401882827', '2026-10-24T16:30Z', 'Villarreal at Valencia', 'Mestalla Stadium', '94', 'Valencia', '102', 'Villarreal'],
      ['401882834', '2026-10-24T19:00Z', 'Deportivo at Atlético Madrid', 'Riyadh Air Metropolitano', '1068', 'Atlético Madrid', '90', 'Deportivo'],
      ['401882835', '2026-10-25T13:00Z', 'Getafe at Athletic Club', 'San Mamés', '93', 'Athletic Club', '2922', 'Getafe'],
      ['401882833', '2026-10-25T15:15Z', 'Real Betis at Celta Vigo', 'Balaidos', '85', 'Celta Vigo', '244', 'Real Betis'],
      ['401882829', '2026-10-25T17:30Z', 'Levante at Real Sociedad', 'Reale Arena', '89', 'Real Sociedad', '1538', 'Levante'],
      ['401882832', '2026-10-25T20:00Z', 'Real Madrid at Barcelona', 'Spotify Camp Nou', '83', 'Barcelona', '86', 'Real Madrid'],
      ['401882828', '2026-10-26T20:00Z', 'Osasuna at Sevilla', 'Ramón Sánchez Pizjuán Stadium', '243', 'Sevilla', '97', 'Osasuna'],
      ['401882817', '2026-10-30T20:00Z', 'Espanyol at Villarreal', 'Estadio de la Cerámica', '102', 'Villarreal', '88', 'Espanyol'],
    ],
  },
  {
    dates: '20261031-20261106',
    events: [
      ['401882820', '2026-10-31T13:00Z', 'Atlético Madrid at Levante', 'Estadi Ciutat de València', '1538', 'Levante', '1068', 'Atlético Madrid'],
      ['401882818', '2026-10-31T15:15Z', 'Celta Vigo at Rayo Vallecano', 'Estadio de Vallecas', '101', 'Rayo Vallecano', '85', 'Celta Vigo'],
      ['401882825', '2026-10-31T17:30Z', 'Málaga at Real Betis', 'Estadio La Cartuja', '244', 'Real Betis', '99', 'Málaga'],
      ['401882822', '2026-10-31T20:00Z', 'Alavés at Barcelona', 'Spotify Camp Nou', '83', 'Barcelona', '96', 'Alavés'],
      ['401882821', '2026-11-01T13:00Z', 'Sevilla at Getafe', 'Estadio Coliseum', '2922', 'Getafe', '243', 'Sevilla'],
      ['401882819', '2026-11-01T15:15Z', 'Real Madrid at Racing Santander', 'El Sardineros', '87', 'Racing Santander', '86', 'Real Madrid'],
      ['401882823', '2026-11-01T17:30Z', 'Valencia at Elche', 'Estadio Martínez Valero', '3751', 'Elche', '94', 'Valencia'],
      ['401882826', '2026-11-01T20:00Z', 'Real Sociedad at Athletic Club', 'San Mamés', '93', 'Athletic Club', '89', 'Real Sociedad'],
      ['401882824', '2026-11-02T20:00Z', 'Osasuna at Deportivo', 'Riazor', '90', 'Deportivo', '97', 'Osasuna'],
      ['401882809', '2026-11-06T20:00Z', 'Alavés at Sevilla', 'Ramón Sánchez Pizjuán Stadium', '243', 'Sevilla', '96', 'Alavés'],
    ],
  },
  {
    dates: '20261107-20261113',
    events: [
      ['401882812', '2026-11-07T13:00Z', 'Racing Santander at Málaga', 'La Rosaleda', '99', 'Málaga', '87', 'Racing Santander'],
      ['401882813', '2026-11-07T15:15Z', 'Deportivo at Espanyol', 'RCDE Stadium', '88', 'Espanyol', '90', 'Deportivo'],
      ['401882811', '2026-11-07T17:30Z', 'Athletic Club at Osasuna', 'El Sadar', '97', 'Osasuna', '93', 'Athletic Club'],
      ['401882808', '2026-11-07T20:00Z', 'Real Madrid at Valencia', 'Mestalla Stadium', '94', 'Valencia', '86', 'Real Madrid'],
      ['401882814', '2026-11-08T13:00Z', 'Real Betis at Elche', 'Estadio Martínez Valero', '3751', 'Elche', '244', 'Real Betis'],
      ['401882810', '2026-11-08T15:15Z', 'Rayo Vallecano at Real Sociedad', 'Reale Arena', '89', 'Real Sociedad', '101', 'Rayo Vallecano'],
      ['401882815', '2026-11-08T17:30Z', 'Levante at Celta Vigo', 'Balaidos', '85', 'Celta Vigo', '1538', 'Levante'],
      ['401882807', '2026-11-08T17:30Z', 'Getafe at Villarreal', 'Estadio de la Cerámica', '102', 'Villarreal', '2922', 'Getafe'],
      ['401882816', '2026-11-08T20:00Z', 'Barcelona at Atlético Madrid', 'Riyadh Air Metropolitano', '1068', 'Atlético Madrid', '83', 'Barcelona'],
    ],
  },
  { dates: '20261114-20261120', events: [] },
  {
    dates: '20261121-20261127',
    events: [
      ['401882806', '2026-11-22T20:00Z', 'Deportivo at Alavés', 'Mendizorrotza', '96', 'Alavés', '90', 'Deportivo'],
      ['401882805', '2026-11-22T20:00Z', 'Espanyol at Athletic Club', 'San Mamés', '93', 'Athletic Club', '88', 'Espanyol'],
      ['401882804', '2026-11-22T20:00Z', 'Villarreal at Barcelona', 'Spotify Camp Nou', '83', 'Barcelona', '102', 'Villarreal'],
      ['401882803', '2026-11-22T20:00Z', 'Atlético Madrid at Getafe', 'Estadio Coliseum', '2922', 'Getafe', '1068', 'Atlético Madrid'],
      ['401882802', '2026-11-22T20:00Z', 'Elche at Levante', 'Estadi Ciutat de València', '1538', 'Levante', '3751', 'Elche'],
      ['401882801', '2026-11-22T20:00Z', 'Málaga at Osasuna', 'El Sadar', '97', 'Osasuna', '99', 'Málaga'],
      ['401882800', '2026-11-22T20:00Z', 'Real Sociedad at Racing Santander', 'El Sardineros', '87', 'Racing Santander', '89', 'Real Sociedad'],
      ['401882799', '2026-11-22T20:00Z', 'Valencia at Rayo Vallecano', 'Estadio de Vallecas', '101', 'Rayo Vallecano', '94', 'Valencia'],
      ['401882798', '2026-11-22T20:00Z', 'Celta Vigo at Real Madrid', 'Santiago Bernabéu', '86', 'Real Madrid', '85', 'Celta Vigo'],
      ['401882797', '2026-11-22T20:00Z', 'Real Betis at Sevilla', 'Ramón Sánchez Pizjuán Stadium', '243', 'Sevilla', '244', 'Real Betis'],
    ],
  },
  {
    dates: '20261128-20261204',
    events: [
      ['401882795', '2026-11-29T20:00Z', 'Villarreal at Celta Vigo', 'Balaidos', '85', 'Celta Vigo', '102', 'Villarreal'],
      ['401882794', '2026-11-29T20:00Z', 'Barcelona at Deportivo', 'Riazor', '90', 'Deportivo', '83', 'Barcelona'],
      ['401882793', '2026-11-29T20:00Z', 'Atlético Madrid at Elche', 'Estadio Martínez Valero', '3751', 'Elche', '1068', 'Atlético Madrid'],
      ['401882792', '2026-11-29T20:00Z', 'Getafe at Espanyol', 'RCDE Stadium', '88', 'Espanyol', '2922', 'Getafe'],
      ['401882791', '2026-11-29T20:00Z', 'Racing Santander at Levante', 'Estadi Ciutat de València', '1538', 'Levante', '87', 'Racing Santander'],
      ['401882790', '2026-11-29T20:00Z', 'Athletic Club at Málaga', 'La Rosaleda', '99', 'Málaga', '93', 'Athletic Club'],
      ['401882796', '2026-11-29T20:00Z', 'Rayo Vallecano at Real Betis', 'Estadio La Cartuja', '244', 'Real Betis', '101', 'Rayo Vallecano'],
      ['401882789', '2026-11-29T20:00Z', 'Alavés at Real Madrid', 'Santiago Bernabéu', '86', 'Real Madrid', '96', 'Alavés'],
      ['401882788', '2026-11-29T20:00Z', 'Sevilla at Real Sociedad', 'Reale Arena', '89', 'Real Sociedad', '243', 'Sevilla'],
      ['401882787', '2026-11-29T20:00Z', 'Osasuna at Valencia', 'Mestalla Stadium', '94', 'Valencia', '97', 'Osasuna'],
    ],
  },
  {
    dates: '20261205-20261211',
    events: [
      ['401882786', '2026-12-06T20:00Z', 'Espanyol at Alavés', 'Mendizorrotza', '96', 'Alavés', '88', 'Espanyol'],
      ['401882785', '2026-12-06T20:00Z', 'Real Madrid at Athletic Club', 'San Mamés', '93', 'Athletic Club', '86', 'Real Madrid'],
      ['401882784', '2026-12-06T20:00Z', 'Real Betis at Atlético Madrid', 'Riyadh Air Metropolitano', '1068', 'Atlético Madrid', '244', 'Real Betis'],
      ['401882783', '2026-12-06T20:00Z', 'Celta Vigo at Barcelona', 'Spotify Camp Nou', '83', 'Barcelona', '85', 'Celta Vigo'],
      ['401882782', '2026-12-06T20:00Z', 'Valencia at Getafe', 'Estadio Coliseum', '2922', 'Getafe', '94', 'Valencia'],
      ['401882781', '2026-12-06T20:00Z', 'Elche at Osasuna', 'El Sadar', '97', 'Osasuna', '3751', 'Elche'],
      ['401882780', '2026-12-06T20:00Z', 'Deportivo at Racing Santander', 'El Sardineros', '87', 'Racing Santander', '90', 'Deportivo'],
      ['401882779', '2026-12-06T20:00Z', 'Levante at Rayo Vallecano', 'Estadio de Vallecas', '101', 'Rayo Vallecano', '1538', 'Levante'],
      ['401882778', '2026-12-06T20:00Z', 'Málaga at Sevilla', 'Ramón Sánchez Pizjuán Stadium', '243', 'Sevilla', '99', 'Málaga'],
      ['401882777', '2026-12-06T20:00Z', 'Real Sociedad at Villarreal', 'Estadio de la Cerámica', '102', 'Villarreal', '89', 'Real Sociedad'],
    ],
  },
];

export const MATCH_CENTER_SPANISH_COMPETITION = {
  slug: 'الدوري-الإسباني',
  leagueId: 'esp.1',
  name: 'الدوري الإسباني',
  season: '2026/27',
};

function asciiSlugPart(value) {
  return String(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function makeFixture(row) {
  const [eventId, date, sourceEventName, venue, homeId, homeName, awayId, awayName] = row;
  const [sourceAwayName, separator, sourceHomeName] = sourceEventName.split(/\s+(at)\s+/);
  if (separator !== 'at' || sourceAwayName !== awayName || sourceHomeName !== homeName) {
    throw new Error(`Source fixture ${eventId} has inconsistent event/team names`);
  }
  if (!/^\d+$/.test(eventId) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/.test(date)) {
    throw new Error(`Source fixture ${eventId} has an invalid event id or UTC date`);
  }
  const kickoffUtc = date.replace(/Z$/, ':00Z');
  const slug = `la-liga-${asciiSlugPart(homeName)}-vs-${asciiSlugPart(awayName)}`;
  const team = (id, name) => ({
    name,
    shortName: name,
    sourceName: name,
    logo: null,
    externalIds: { espn: id, apifootball: null },
  });
  return {
    id: `espn-${eventId}`,
    slug,
    competitionSlug: MATCH_CENTER_SPANISH_COMPETITION.slug,
    competitionName: MATCH_CENTER_SPANISH_COMPETITION.name,
    leagueId: MATCH_CENTER_SPANISH_COMPETITION.leagueId,
    season: MATCH_CENTER_SPANISH_COMPETITION.season,
    round: null,
    kickoffUtc,
    venue,
    sourceEventName,
    verification: 'confirmed',
    externalIds: { espn: eventId, apifootball: null },
    home: team(homeId, homeName),
    away: team(awayId, awayName),
  };
}

export const MATCH_CENTER_SPANISH_20261017_20261211_MATCHES = MATCH_CENTER_SPANISH_20261017_20261211_RANGES
  .flatMap(({ events }) => events.map(makeFixture));
export const MATCH_CENTER_SPANISH_20261212_20270205_MATCHES = MATCH_CENTER_SPANISH_20261212_20270205_RANGES
  .flatMap(({ events }) => events.map(makeFixture));
export const MATCH_CENTER_SPANISH_20270206_20270212_MATCHES = MATCH_CENTER_SPANISH_20270206_20270212_RANGES
  .flatMap(({ events }) => events.map(makeFixture));
export const MATCH_CENTER_SPANISH_20270213_20270219_MATCHES = MATCH_CENTER_SPANISH_20270213_20270219_RANGES
  .flatMap(({ events }) => events.map(makeFixture));
export const MATCH_CENTER_SPANISH_20270220_20270226_MATCHES = MATCH_CENTER_SPANISH_20270220_20270226_RANGES
  .flatMap(({ events }) => events.map(makeFixture));
export const MATCH_CENTER_SPANISH_20270227_20270305_MATCHES = MATCH_CENTER_SPANISH_20270227_20270305_RANGES
  .flatMap(({ events }) => events.map(makeFixture));
export const MATCH_CENTER_SPANISH_20270306_20270312_MATCHES = MATCH_CENTER_SPANISH_20270306_20270312_RANGES
  .flatMap(({ events }) => events.map(makeFixture));
export const MATCH_CENTER_SPANISH_20270313_20270319_MATCHES = MATCH_CENTER_SPANISH_20270313_20270319_RANGES
  .flatMap(({ events }) => events.map(makeFixture));
export const MATCH_CENTER_SPANISH_20270320_20270326_MATCHES = MATCH_CENTER_SPANISH_20270320_20270326_RANGES
  .flatMap(({ events }) => events.map(makeFixture));
export const MATCH_CENTER_SPANISH_20270403_20270409_MATCHES = MATCH_CENTER_SPANISH_20270403_20270409_RANGES
  .flatMap(({ events }) => events.map(makeFixture));
export const MATCH_CENTER_SPANISH_20270410_20270416_MATCHES = MATCH_CENTER_SPANISH_20270410_20270416_RANGES
  .flatMap(({ events }) => events.map(makeFixture));
export const MATCH_CENTER_SPANISH_20270417_20270423_MATCHES = MATCH_CENTER_SPANISH_20270417_20270423_RANGES
  .flatMap(({ events }) => events.map(makeFixture));
export const MATCH_CENTER_SPANISH_20270501_20270507_MATCHES = MATCH_CENTER_SPANISH_20270501_20270507_RANGES
  .flatMap(({ events }) => events.map(makeFixture));
export const MATCH_CENTER_SPANISH_20270508_20270514_MATCHES = MATCH_CENTER_SPANISH_20270508_20270514_RANGES
  .flatMap(({ events }) => events.map(makeFixture));
export const MATCH_CENTER_SPANISH_20270515_20270521_MATCHES = MATCH_CENTER_SPANISH_20270515_20270521_RANGES
  .flatMap(({ events }) => events.map(makeFixture));
export const MATCH_CENTER_SPANISH_20270522_20270528_MATCHES = MATCH_CENTER_SPANISH_20270522_20270528_RANGES
  .flatMap(({ events }) => events.map(makeFixture));
export const MATCH_CENTER_SPANISH_20270529_20270604_MATCHES = MATCH_CENTER_SPANISH_20270529_20270604_RANGES
  .flatMap(({ events }) => events.map(makeFixture));
export const MATCH_CENTER_SPANISH_MATCHES = [
  ...MATCH_CENTER_SPANISH_20261017_20261211_MATCHES,
  ...MATCH_CENTER_SPANISH_20261212_20270205_MATCHES,
  ...MATCH_CENTER_SPANISH_20270206_20270212_MATCHES,
  ...MATCH_CENTER_SPANISH_20270213_20270219_MATCHES,
  ...MATCH_CENTER_SPANISH_20270220_20270226_MATCHES,
  ...MATCH_CENTER_SPANISH_20270227_20270305_MATCHES,
  ...MATCH_CENTER_SPANISH_20270306_20270312_MATCHES,
  ...MATCH_CENTER_SPANISH_20270313_20270319_MATCHES,
  ...MATCH_CENTER_SPANISH_20270320_20270326_MATCHES,
  ...MATCH_CENTER_SPANISH_20270403_20270409_MATCHES,
  ...MATCH_CENTER_SPANISH_20270410_20270416_MATCHES,
  ...MATCH_CENTER_SPANISH_20270417_20270423_MATCHES,
  ...MATCH_CENTER_SPANISH_20270501_20270507_MATCHES,
  ...MATCH_CENTER_SPANISH_20270508_20270514_MATCHES,
  ...MATCH_CENTER_SPANISH_20270515_20270521_MATCHES,
  ...MATCH_CENTER_SPANISH_20270522_20270528_MATCHES,
  ...MATCH_CENTER_SPANISH_20270529_20270604_MATCHES,
];

export const MATCH_CENTER_SPANISH_20261017_20261211_VERIFICATION = {
  receivedOn: '2026-10-17',
  provider: 'espn',
  leagueId: 'esp.1',
  method: 'مخرجات scoreboard.php?league=esp.1&dates={range} أرسلها المستخدم؛ لم ينفذ المساعد طلب API ولم يجرِ تحققاً مستقلاً من المصدر.',
  receivedRanges: MATCH_CENTER_SPANISH_20261017_20261211_RANGES.map(({ dates, events }) => ({
    dates,
    scoreboardEndpoint: `https://streammasterstore.com/scoreboard.php?league=esp.1&dates=${dates}`,
    eventCount: events.length,
  })),
  receivedEvents: MATCH_CENTER_SPANISH_20261017_20261211_RANGES.flatMap(({ dates, events }) => events.map(([id, date, name, venue]) => ({
    id, date, name, venue, status: 'STATUS_SCHEDULED', window: dates,
  }))),
  receivedTeams: MATCH_CENTER_SPANISH_20261017_20261211_RANGES.flatMap(({ events }) => events.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
    { event, side: 'home', id: homeId, name: homeName },
    { event, side: 'away', id: awayId, name: awayName },
  ])),
};
