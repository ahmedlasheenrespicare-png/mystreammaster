import test from 'node:test';
import assert from 'node:assert/strict';
import archive from '../src/content/fixtures-archive/ita.1/2026.json' with { type: 'json' };
import {
  MATCH_CENTER_ITALIAN_COMPETITION,
  MATCH_CENTER_ITALIAN_MATCHES,
  MATCH_CENTER_ALL_MATCHES,
  matchByExternalId,
  matchByRoute,
  matchCenterPath,
} from '../src/content/match-center.mjs';

const byId = new Map(archive.matches.map(match => [String(match.id), match]));

test('Serie A Match Center bindings are a one-to-one projection of the local archive', () => {
  assert.equal(MATCH_CENTER_ITALIAN_COMPETITION.leagueId, 'ita.1');
  assert.equal(MATCH_CENTER_ITALIAN_MATCHES.length, archive.matches.length);
  assert.equal(new Set(MATCH_CENTER_ITALIAN_MATCHES.map(match => match.externalIds.espn)).size, archive.matches.length);
  assert.ok(MATCH_CENTER_ITALIAN_MATCHES.every(match => MATCH_CENTER_ALL_MATCHES.includes(match)));

  for (const fixture of MATCH_CENTER_ITALIAN_MATCHES) {
    const source = byId.get(fixture.externalIds.espn);
    assert.ok(source, `archive event ${fixture.externalIds.espn} exists`);
    assert.equal(fixture.leagueId, 'ita.1');
    assert.equal(fixture.kickoffUtc, source.date);
    assert.equal(fixture.home.name, source.home.name);
    assert.equal(fixture.home.externalIds.espn, source.home.id);
    assert.equal(fixture.away.name, source.away.name);
    assert.equal(fixture.away.externalIds.espn, source.away.id);
    assert.equal(fixture.venue, null, 'the archive has no venue field to populate');
    assert.equal(fixture.archivedSnapshot.provider, 'snapshot');
    assert.equal(fixture.archivedSnapshot.readAt, source.fetchedAt);
    assert.deepEqual(fixture.archivedSnapshot.score, source.status === 'scheduled' ? null : source.score);
    assert.equal(fixture.archivedSnapshot.status.code, source.status === 'cancelled' ? 'canceled' : source.status);
    assert.equal(fixture.archivedSnapshot.statistics?.find(row => row.key === 'possessionPct')?.home ?? null,
      source.statistics?.home?.possession ?? null);
    assert.equal(fixture.archivedSnapshot.statistics?.find(row => row.key === 'possessionPct')?.away ?? null,
      source.statistics?.away?.possession ?? null);
    assert.equal(fixture.archivedSnapshot.statistics?.find(row => row.key === 'totalShots')?.home ?? null,
      source.statistics?.home?.shots ?? null);
    assert.equal(fixture.archivedSnapshot.statistics?.find(row => row.key === 'passPct')?.away ?? null,
      source.statistics?.away?.passAccuracy ?? null);
    assert.deepEqual(fixture.archivedSnapshot.events, [], 'unarchived event timelines are not fabricated');
    assert.equal(fixture.archivedSnapshot.lineups, null, 'unarchived lineups stay unavailable');
    assert.equal(matchByExternalId('espn', source.id)?.id, fixture.id);
    assert.equal(matchByRoute(matchCenterPath(fixture))?.id, fixture.id);
  }
});
