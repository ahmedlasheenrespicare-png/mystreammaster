import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MATCH_CENTER_ALL_MATCHES, matchCenterPath } from '../src/content/match-center.mjs';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function generatedPage(match) {
  const route = matchCenterPath(match).replace(/^\/+|\/+$/g, '');
  return path.join(repository, route, 'index.html');
}

test('every registered fixture has the shared pitch and data-driven panel in its generated static page', async () => {
  assert.ok(MATCH_CENTER_ALL_MATCHES.length >= 620, 'coverage includes the full current fixture set and any later additions');
  const routes = new Set();
  for (const match of MATCH_CENTER_ALL_MATCHES) {
    const route = matchCenterPath(match);
    assert.equal(routes.has(route), false, `${route}: duplicate route`);
    routes.add(route);

    const file = generatedPage(match);
    const html = await fs.readFile(file, 'utf8');
    assert.match(html, /class="mc-pitch-frame"/, `${route}: shared football pitch missing`);
    assert.match(html, /class="mc-match-title"/, `${route}: match title missing`);
    const hasPreviewFacts = [match.competitionName, match.venue, match.season, match.round]
      .some(value => typeof value === 'string' ? value.trim() !== '' : typeof value === 'number' && Number.isFinite(value))
      || (typeof match.kickoffUtc === 'string' && Number.isFinite(Date.parse(match.kickoffUtc)));
    if (hasPreviewFacts) {
      assert.match(html, /role="tablist"/, `${route}: data-backed panel navigation missing`);
      assert.match(html, /id="mc-panel-preview"/, `${route}: fixture-data panel missing`);
    } else {
      assert.doesNotMatch(html, /role="tablist"|mc-panel-preview/, `${route}: empty preview tab/panel must stay hidden`);
    }
    assert.doesNotMatch(html, /mc-unavailable|غير متاح|لم يُعلن بعد/, `${route}: blank match data must not render as a fallback`);
    assert.doesNotMatch(html, /class="mc-pitch-score"/, `${route}: static page must not invent a score before a source read`);
  }
  assert.equal(routes.size, MATCH_CENTER_ALL_MATCHES.length);
});
