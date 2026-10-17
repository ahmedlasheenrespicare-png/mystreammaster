import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateArchive, ARCHIVE_LEAGUES } from '../src/lib/fixtures-archive.mjs';
const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function publish(outDir = path.join(website, '.fixtures-out'), target = path.join(website, 'src/content/fixtures-archive')) {
  const report = JSON.parse(await fs.readFile(path.join(outDir, 'report.json'), 'utf8'));
  if (!Array.isArray(report.leagues) || report.leagues.length !== ARCHIVE_LEAGUES.length || new Set(report.leagues.map(l => l.league)).size !== ARCHIVE_LEAGUES.length) throw new Error('INVALID_REPORT');
  const writes = [];
  for (const entry of report.leagues) {
    if (!ARCHIVE_LEAGUES.includes(entry.league)) throw new Error('INVALID_LEAGUE');
    if (!entry.ok) continue;
    if (!entry.identityVerified || !entry.files?.length) throw new Error('UNVERIFIED_SOURCE');
    for (const relative of entry.files) {
      if (!new RegExp(`^${entry.league.replaceAll('.', '\\.')}/\\d{4}\\.json$`).test(relative)) throw new Error('INVALID_PATH');
      const data = JSON.parse(await fs.readFile(path.join(outDir, 'archive', relative), 'utf8'));
      validateArchive(data, entry.league, path.basename(relative, '.json'));
      const destination = path.join(target, relative);
      let old;
      try { old = JSON.parse(await fs.readFile(destination, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
      if (old) {
        validateArchive(old, entry.league, data.season);
        if (old.matches.some(m => !data.matches.some(n => n.id === m.id))) throw new Error('ARCHIVE_SHRINK_REJECTED');
      }
      writes.push({ destination, content: JSON.stringify(data, null, 2) + '\n' });
    }
  }
  let currentBytes = 0;
  async function size(dir) { for (const e of await fs.readdir(dir, { withFileTypes: true }).catch(e => { if (e.code === 'ENOENT') return []; throw e; })) { const p = path.join(dir, e.name); if (e.isDirectory()) await size(p); else currentBytes += (await fs.stat(p)).size; } }
  await size(target);
  let projected = currentBytes;
  for (const w of writes) projected += Buffer.byteLength(w.content) - (await fs.stat(w.destination).catch(e => { if (e.code === 'ENOENT') return { size: 0 }; throw e; })).size;
  if (projected > 50 * 1024 * 1024) throw new Error('ARCHIVE_50_MIB_LIMIT_EXTERNAL_STORAGE_REQUIRED');
  // Entire artifact validated before changing the working tree. Commit is the transaction.
  for (const w of writes) {
    await fs.mkdir(path.dirname(w.destination), { recursive: true });
    await fs.writeFile(w.destination + '.tmp', w.content);
    await fs.rename(w.destination + '.tmp', w.destination);
  }
  return { files: writes.length, bytes: projected };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(await publish());
