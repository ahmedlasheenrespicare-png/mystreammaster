import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { leagues, leaguePath, leagueViews } from './league-pages-data.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('all indexable league views have a fixed safe server route and a readable insertion point', async () => {
  const htaccess = await fs.readFile(path.join(root, '.htaccess'), 'utf8');
  const renderer = await fs.readFile(path.join(root, 'league-page.php'), 'utf8');
  assert.match(htaccess, /RewriteRule \^leagues\/.*league-page\.php \[L,QSA\]/);
  assert.match(renderer, /https:\/\/streammasterstore\.com\/scoreboard\.php\?league=/);
  assert.match(renderer, /sm_st_service\(/);
  assert.doesNotMatch(renderer, /league-archive-|standings-snapshot/);
  for (const league of leagues) {
    assert.ok(htaccess.includes(league.slug));
    assert.ok(renderer.includes(`'${league.slug}' => ['${league.table}', '${league.matches || league.table}']`), `incorrect source identifiers for ${league.slug}`);
    for (const view of leagueViews) {
      const html = await fs.readFile(path.join(root, leaguePath(league, view.slug), 'index.html'), 'utf8');
      assert.equal((html.match(/<!--SM_LEAGUE_DATA-->/g) || []).length, 1);
      assert.match(html, /rel="canonical"/);
    }
  }
});

test('PHP league renderer escapes data, preserves zeros and handles stale/failed sources', t => {
  const result = spawnSync('php', [path.join(root, 'website/scripts/test-league-server.php')], { encoding: 'utf8' });
  if (result.error?.code === 'ENOENT') { t.skip('PHP is not installed; run the PHP fixture on the deployment runtime'); return; }
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /league server renderer tests passed/);
});
