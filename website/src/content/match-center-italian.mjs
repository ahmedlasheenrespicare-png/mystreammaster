/*
 * Serie A Match Center bindings are derived only from the locally committed
 * ESPN archive. No venue, round, event timeline, lineup, or missing statistic
 * is filled in from another endpoint or guessed here.
 */
import archive from './fixtures-archive/ita.1/2026.json' with { type: 'json' };

export const MATCH_CENTER_ITALIAN_COMPETITION = {
  slug: 'الدوري-الإيطالي',
  leagueId: 'ita.1',
  name: 'الدوري الإيطالي',
  season: '2026/27',
};

const STATUS = {
  scheduled: { code: 'scheduled', label: 'لم تبدأ', phase: 'pre', completed: false },
  live: { code: 'live', label: 'مباشرة', phase: 'live', completed: false },
  finished: { code: 'finished', label: 'انتهت', phase: 'post', completed: true },
  postponed: { code: 'postponed', label: 'مؤجلة', phase: 'terminal', completed: false },
  cancelled: { code: 'canceled', label: 'أُلغيت', phase: 'terminal', completed: false },
  suspended: { code: 'suspended', label: 'متوقفة', phase: 'terminal', completed: false },
  unknown: { code: 'unknown', label: 'الحالة غير متاحة', phase: 'terminal', completed: false },
};

function teamSlug(name) {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'team';
}

function archiveStatistics(match) {
  if (!match.statistics) return null;
  const rows = [
    ['possessionPct', 'الاستحواذ', '%', 'possession'],
    ['totalShots', 'التسديدات', '', 'shots'],
    ['passPct', 'دقة التمرير', '%', 'passAccuracy'],
  ];
  const statistics = rows.map(([key, label, unit, sourceKey]) => ({
    key,
    label,
    unit,
    home: match.statistics.home?.[sourceKey] ?? null,
    away: match.statistics.away?.[sourceKey] ?? null,
  }));
  return statistics.some(row => row.home !== null || row.away !== null) ? statistics : null;
}

function snapshotFromArchive(match, matchId) {
  const sourceStatus = STATUS[match.status] ?? STATUS.unknown;
  return {
    matchId,
    provider: 'snapshot',
    readAt: match.fetchedAt ?? null,
    status: {
      ...sourceStatus,
      clock: null,
      elapsed: null,
      period: null,
      detail: null,
    },
    score: match.status === 'scheduled' ? null : { ...match.score },
    events: [],
    statistics: archiveStatistics(match),
    lineups: null,
    ratings: null,
    h2h: [],
    form: null,
    logos: { home: null, away: null },
    venue: null,
    seasonComparison: null,
    seasonSample: null,
  };
}

export const MATCH_CENTER_ITALIAN_MATCHES = archive.matches.map(match => {
  const id = `ita1-${match.id}`;
  return {
    id,
    slug: `${teamSlug(match.home.name)}-vs-${teamSlug(match.away.name)}-${match.id}`,
    competitionSlug: MATCH_CENTER_ITALIAN_COMPETITION.slug,
    competitionName: MATCH_CENTER_ITALIAN_COMPETITION.name,
    leagueId: MATCH_CENTER_ITALIAN_COMPETITION.leagueId,
    season: MATCH_CENTER_ITALIAN_COMPETITION.season,
    round: null,
    kickoffUtc: match.date,
    venue: null,
    verification: 'confirmed',
    externalIds: { espn: String(match.id) },
    home: {
      name: match.home.name,
      shortName: match.home.name,
      sourceName: match.home.name,
      logo: null,
      externalIds: { espn: String(match.home.id) },
    },
    away: {
      name: match.away.name,
      shortName: match.away.name,
      sourceName: match.away.name,
      logo: null,
      externalIds: { espn: String(match.away.id) },
    },
    archivedSnapshot: snapshotFromArchive(match, id),
  };
});
