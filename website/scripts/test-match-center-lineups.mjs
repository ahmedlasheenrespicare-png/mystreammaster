import test from 'node:test';
import assert from 'node:assert/strict';
import { lineupPitchSides, unavailableDataNotes } from '../src/lib/match-center.mjs';
import { adaptSnapshot } from '../src/lib/match-center-transport.mjs';
import { MATCH_CENTER_ALL_MATCHES } from '../src/content/match-center.mjs';
import { pitchLineupPayload } from '../tests/fixtures/pitch-lineups.mjs';
const match = MATCH_CENTER_ALL_MATCHES.find(match => match.slug === 'manchester-city-ipswich-town');
const read = (payload = pitchLineupPayload()) => lineupPitchSides({ match, snapshot: adaptSnapshot(payload, match) });
const allPlayers = side => [...side.rows.flatMap(row => row.players), ...side.substitutes];

test('confirmed source-role XI is static, twelve events do not replace the outgoing starter', () => {
  const sides = read();
  assert.equal(sides.length, 2);
  for (const side of sides) assert.equal(side.rows.flatMap(row => row.players).length, 11);
  assert.equal(sides[0].substitutes[0].id, 'h11');
  const scorer = allPlayers(sides[0]).find(player => player.id === 'h10');
  assert.deepEqual(scorer.badges.map(b => b.event.id), ['goal', 'yellow', 'red', 'cancelled', 'sub']);
  assert.equal(scorer.badges[1].minute, '45+2′');
  assert.equal(scorer.badges.at(-1).role, 'خروج');
  assert.equal(sides[0].substitutes[0].badges[0].role, 'دخول');
  assert.equal(sides[0].substitutes[0].badges[1].minute, '90+3′');
  assert.equal(sides[0].substitutes[0].badges[1].typeLabel, 'هدف');
  assert.equal(scorer.badges[3].event.cancelled, true);
  assert.deepEqual(allPlayers(sides[1]).flatMap(player => player.badges), []);
});
test('unlinked IDs, name-only, wrong-side/team, untimed, other and delay events never become player overlays', () => {
  const ids = read().flatMap(allPlayers).flatMap(player => player.badges.map(b => b.event.id));
  for (const id of ['unlinked', 'wrong-side', 'no-id', 'wrong-team-id', 'untimed', 'silent', 'other']) assert.ok(!ids.includes(id), id);
});
test('grouping does not interpret formationPlace or mutate the snapshot', () => {
  const payload = pitchLineupPayload();
  payload.lineups.home.starters.forEach(p => { p.formationPlace = '999'; });
  const before = JSON.stringify(payload); read(payload);
  assert.equal(JSON.stringify(payload), before);
  assert.equal(read(payload)[0].rows[0].players[0].positionCode, 'G');
});
test('unknown positions never get guessed, and an absent opponent remains absent', () => {
  const payload = pitchLineupPayload();
  payload.lineups.home.starters[0].positionCode = 'unverified';
  assert.deepEqual(read(payload).map(s => s.side), ['away']);
  payload.lineups.home = null;
  assert.deepEqual(read(payload).map(s => s.side), ['away']);
});
test('identity mismatches and duplicate players fail closed, not by array order or name', () => {
  for (const mutate of [p => p.lineups.provider = 'snapshot', p => p.lineups.eventId = '401879258',
    p => p.lineups.home.teamId = '373', p => p.lineups.home.starters[1].id = 'h0',
    p => p.lineups.away.starters[0].id = 'h0', p => p.lineups.home.substitutes[0].id = 'h0',
    p => p.lineups.home.starters.pop(), p => p.lineups.home.starters.push({ id: 'extra' })]) {
    const payload = pitchLineupPayload(); mutate(payload); assert.deepEqual(read(payload), []);
  }
});
test('expected and absent XI never drawn; a legitimate pre-match XI gets no future event overlays', () => {
  const payload = pitchLineupPayload();
  payload.lineups.home.confirmed = false; payload.lineups.away.confirmed = false;
  assert.deepEqual(read(payload), []);
  payload.lineups = null; assert.deepEqual(read(payload), []);
  const pre = pitchLineupPayload(); pre.status.type = { name: 'STATUS_SCHEDULED', state: 'pre', completed: false };
  assert.equal(read(pre).length, 2);
  assert.deepEqual(read(pre).flatMap(allPlayers).flatMap(p => p.badges), []);
});
test('duplicate source events do not repeat the same badge; null rating stays null', () => {
  const payload = pitchLineupPayload(); payload.events.push(payload.events[0]);
  const player = allPlayers(read(payload)[0]).find(p => p.id === 'h10');
  assert.equal(player.badges.filter(b => b.event.id === 'goal').length, 1);
  assert.equal(player.rating, null);
});
test('missing-data text describes this read, not a blanket claim that source cannot supply lineups', () => {
  const snapshot = adaptSnapshot(pitchLineupPayload(), match);
  assert.ok(!unavailableDataNotes(snapshot).some(n => n.id === 'lineups'));
  snapshot.lineups = null;
  assert.match(unavailableDataNotes(snapshot).find(n => n.id === 'lineups').text, /القراءة الحالية/);
});
