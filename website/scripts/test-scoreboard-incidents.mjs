import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreboardIncidents } from '../src/lib/scoreboard-incidents.mjs';
const competitors = [{ id: 'home-id', homeAway: 'home' }, { team: { id: 'away-id' }, homeAway: 'away' }];
const goal = { scoringPlay: true, team: { id: 'home-id' }, athletesInvolved: [{ displayName: 'Source Player' }], clock: { displayValue: "45'+2'" } };
test('preserves explicit goals and cards with source side, player and stoppage time', () => {
  const result = scoreboardIncidents({ competitors, details: [goal, { ...goal, scoringPlay: false, yellowCard: true }, { ...goal, team: { id: 'away-id' }, scoringPlay: false, redCard: true }] });
  assert.deepEqual(result.map(row => [row.kind, row.side, row.player, row.minute]), [['goal', 'home', 'Source Player', "45'+2'"], ['yellow', 'home', 'Source Player', "45'+2'"], ['red', 'away', 'Source Player', "45'+2'"]]);
});
test('does not invent events, players, minutes or team attribution', () => {
  assert.deepEqual(scoreboardIncidents({ competitors }), []);
  assert.deepEqual(scoreboardIncidents({ competitors, details: [{ ...goal, athletesInvolved: [] }, { ...goal, clock: {} }, { ...goal, team: { id: 'unknown' } }, { ...goal, shootout: true }] }), []);
  assert.deepEqual(scoreboardIncidents(null), []);
});
test('keeps own-goal source attribution and recognizes second-yellow dismissal', () => {
  const result = scoreboardIncidents({ competitors, details: [{ ...goal, ownGoal: true }, { ...goal, scoringPlay: false, yellowCard: true, type: { text: 'Second Yellow Card' } }] });
  assert.equal(result[0].ownGoal, true);
  assert.equal(result[0].side, 'home');
  assert.equal(result[1].kind, 'red');
});
