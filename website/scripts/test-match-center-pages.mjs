import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPage } from '../dist-ssr/entry-server.js';
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
    const published = await fs.readFile(file, 'utf8');
    assert.match(published, /class="mc-pitch-frame"/, `${route}: published shared football pitch missing`);
    assert.match(published, /class="mc-match-title"/, `${route}: published match title missing`);
    // pretest builds SSR before build publishes the root. Test the current panel
    // contract, not yesterday's committed build artifacts (which must not be committed).
    const { html } = renderPage(route);
    assert.match(html, /class="mc-pitch-frame"/, `${route}: shared football pitch missing`);
    assert.match(html, /class="mc-match-title"/, `${route}: match title missing`);
    const hasPreviewFacts = [match.competitionName, match.venue, match.season, match.round]
      .some(value => typeof value === 'string' ? value.trim() !== '' : typeof value === 'number' && Number.isFinite(value))
      || (typeof match.kickoffUtc === 'string' && Number.isFinite(Date.parse(match.kickoffUtc)));
    if (hasPreviewFacts) {
      assert.match(html, /role="tablist"/, `${route}: data-backed panel navigation missing`);
      assert.match(html, /id="mc-panel-prematch"/, `${route}: fixture-data panel missing`);
    } else {
      assert.doesNotMatch(html, /role="tablist"|mc-panel-prematch/, `${route}: empty preview tab/panel must stay hidden`);
    }
    // «التوثيق والمراجعة» يشرح معنى «غير متاح» نصاً ثابتاً؛ خارجه لا بديل ولا عنصر نائب لبيانات غائبة.
    const outsideDocs = html.replace(/<section class="mc-docs"[\s\S]*?<\/section>/, '');
    assert.doesNotMatch(outsideDocs, /mc-unavailable|غير متاح|لم يُعلن بعد/, `${route}: blank match data must not render as a fallback`);
    // Archived finals render their score directly; scheduled fixtures use the
    // pre-lineup preview on the pitch. Neither path invents an unarchived fact.
    const isArchivedFinal = match.archivedSnapshot?.status.code === 'finished';
    if (isArchivedFinal) {
      assert.match(html, /class="mc-pitch-score"/, `${route}: archived score should render on the pitch`);
      assert.doesNotMatch(html, /class="mc-pitch-preview"/, `${route}: finished archive must not show a pre-match preview`);
    } else if (hasPreviewFacts) {
      assert.match(html, /class="mc-pitch-preview"/, `${route}: pre-lineup preview must sit on the pitch`);
      assert.doesNotMatch(html, /class="mc-match-facts"/, `${route}: facts must not repeat under the pitch while the preview is on it`);
    } else {
      assert.doesNotMatch(html, /mc-pitch-preview/, `${route}: no empty preview block on the pitch`);
    }
    assert.doesNotMatch(html, /mc-lineup-explainer|mc-pitch-disclaimer|وقت القراءة/, `${route}: explanatory source texts live only in the documentation section`);
    assert.match(html, /class="mc-docs-grid"/, `${route}: documentation cards missing`);
    if (!isArchivedFinal) {
      assert.doesNotMatch(html, /class="mc-pitch-score"/, `${route}: no score is rendered without an archived final result`);
    }
  }
  assert.equal(routes.size, MATCH_CENTER_ALL_MATCHES.length);
});
