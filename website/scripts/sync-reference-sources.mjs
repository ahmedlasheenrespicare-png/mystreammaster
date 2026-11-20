import fs from 'node:fs/promises';
import path from 'node:path';

/** Publish the homepage's data and parsers for the standalone static preview.
 * Only the browser import suffix changes: some hosts serve .mjs as octet-stream.
 */
export async function syncReferenceSources(website, destination) {
  await fs.mkdir(destination, { recursive: true });
  for (const name of ['matches', 'scoreboard-incidents', 'standings', 'fixtures-archive', 'leader-logo']) {
    const source = await fs.readFile(path.join(website, 'src/lib', `${name}.mjs`), 'utf8');
    await fs.writeFile(path.join(destination, `${name}.js`), source.replaceAll('./scoreboard-incidents.mjs', './scoreboard-incidents.js'));
  }
  await fs.copyFile(path.join(website, 'src/content/standings-snapshot.json'), path.join(destination, 'standings-snapshot.json'));
  // Mirror the newest reviewed archive used by each league landing page.
  for (const league of ['eng.1','esp.1','ita.1','ger.1','fra.1','egy.1','uefa.champions']) {
    const dir = path.join(website, 'src/content/fixtures-archive', league);
    const latest = (await fs.readdir(dir)).filter(name => /^\d{4}\.json$/.test(name)).sort().at(-1);
    if (!latest) throw new Error(`Missing reviewed archive for ${league}`);
    await fs.copyFile(path.join(dir, latest), path.join(destination, `league-archive-${league}.json`));
  }
}
