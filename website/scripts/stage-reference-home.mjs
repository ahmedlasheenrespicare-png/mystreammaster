/* Build an isolated, noindex release candidate from an explicitly approved
 * Git snapshot. Preview edits cannot silently leak into the candidate. This
 * script does NOT change /, /en/, sitemap or the deployment pipeline. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { syncReferenceSources } from './sync-reference-sources.mjs';
import { syncReferencePaths } from './sync-reference-paths.mjs';
import { versionReferenceAssets } from './version-reference-assets.mjs';
import { generateReferenceEnglish } from './generate-reference-english.mjs';
import { APPROVED_HOME_SNAPSHOT } from './approved-home-snapshot.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const snapshot = APPROVED_HOME_SNAPSHOT;
const candidate = path.join(root, 'home-preview/release-candidate');
const candidateUrl = '/home-preview/release-candidate/';
const assetsUrl = `${candidateUrl}assets/`;
const previewUrl = '/home-preview/saved-reference/';
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'stream-master-home-'));
try {
  const archived = spawnSync('git', ['archive', '--format=tar', snapshot, 'home-preview/saved-reference'], { cwd: root, maxBuffer: 256 * 1024 * 1024 });
  if (archived.status !== 0) throw new Error(`Cannot archive approved snapshot ${snapshot}. Fetch full Git history first. ${archived.stderr?.toString()}`);
  const extracted = spawnSync('tar', ['-xf', '-', '-C', temporary], { input: archived.stdout, maxBuffer: 1024 * 1024 });
  if (extracted.status !== 0) throw new Error(`Cannot extract snapshot: ${extracted.stderr?.toString()}`);
  const source = path.join(temporary, 'home-preview/saved-reference');
  await fs.rm(candidate, { recursive: true, force: true });
  await fs.cp(source, candidate, { recursive: true });
  // Canonical prices and sports data are intentionally refreshed on every
  // build; only the approved design/content snapshot stays pinned.
  await syncReferenceSources(path.join(root, 'website'), path.join(candidate, 'assets'));
  await syncReferencePaths(path.join(root, 'website'), candidate);
  await versionReferenceAssets(candidate);
  await generateReferenceEnglish(candidate);

  // Keep the two language pages, dynamic JS, CSS and the league iframe within
  // the same snapshot; shared site-wide images and /m3u-player.html remain
  // production dependencies and are not modified by this staging tool.
  async function rewrite(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await rewrite(file);
      else if (/\.(?:html|js|css|json)$/i.test(entry.name)) {
        let contents = await fs.readFile(file, 'utf8');
        contents = contents.replaceAll(previewUrl + 'assets/', assetsUrl);
        for (const [oldName, newName] of [['cairo.woff2', 'server-cairo.woff2'], ['title-tajawal.woff2', 'server-title-tajawal.woff2'], ['title-amiri.woff2', 'server-title-amiri.woff2']]) {
          contents = contents.replaceAll('/home-preview/kota-servers-reference-preview/server-cards/' + oldName, assetsUrl + newName);
        }
        if (file === path.join(candidate, 'index.html')) {
          contents = contents.replaceAll('./assets/', assetsUrl).replaceAll(previewUrl + 'en/', candidateUrl + 'en/').replaceAll('/m3u-player.html', candidateUrl + 'm3u-player.html');
        } else if (file === path.join(candidate, 'en/index.html')) {
          contents = contents.replaceAll(previewUrl, candidateUrl).replaceAll('/m3u-player.html', candidateUrl + 'm3u-player.html');
        } else if (file === path.join(candidate, 'assets/reference-language.js')) {
          contents = contents.replaceAll(`location.assign('${previewUrl}')`, `location.assign('${candidateUrl}')`);
        } else if (file === path.join(candidate, 'assets/sports-balls.js')) {
          contents = contents.replaceAll("'./assets/", `'${assetsUrl}`);
        }
        await fs.writeFile(file, contents);
      }
    }
  }
  await rewrite(candidate);
  // The M3U player is a separate Vite entry. Stage the built entry and its
  // dependencies so the candidate can be exercised without changing /.
  const dist = path.join(root, 'website/dist');
  let player;
  try { player = await fs.readFile(path.join(dist, 'm3u-player.html'), 'utf8'); }
  catch { throw new Error('Build the client first: npm run build:client --prefix website'); }
  await fs.mkdir(path.join(candidate, 'compiled/_assets'), { recursive: true });
  await fs.cp(path.join(dist, '_assets/redesign'), path.join(candidate, 'compiled/_assets/redesign'), { recursive: true });
  await fs.writeFile(path.join(candidate, 'm3u-player.html'), player.replaceAll('/_assets/redesign/', candidateUrl + 'compiled/_assets/redesign/'));
  console.log(`Noindex candidate generated at ${candidateUrl} from ${snapshot}`);
} finally {
  await fs.rm(temporary, { recursive: true, force: true });
}
