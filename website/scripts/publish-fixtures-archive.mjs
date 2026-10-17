import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateArchive, ARCHIVE_LEAGUES } from '../src/lib/fixtures-archive.mjs';
const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function publish(outDir = path.join(website, '.fixtures-out'), target = path.join(website, 'src/content/fixtures-archive')) {
  const report = JSON.parse(await fs.readFile(path.join(outDir, 'report.json'), 'utf8'));
  if (!Array.isArray(report.leagues) || report.leagues.length !== ARCHIVE_LEAGUES.length || new Set(report.leagues.map(l => l.league)).size !== ARCHIVE_LEAGUES.length) throw new Error('INVALID_REPORT');
  const writes = [];
  const leaguesPublished = [];
  const leaguesPreserved = [];
  let latestFetchedAt = typeof report.fetchedAt === 'string' ? report.fetchedAt : null;
  for (const entry of report.leagues) {
    if (!ARCHIVE_LEAGUES.includes(entry.league)) throw new Error('INVALID_LEAGUE');
    if (!entry.ok) {
      leaguesPreserved.push({ league: entry.league, code: entry.code ?? 'PRESERVED' });
      continue;
    }
    if (!entry.identityVerified || !entry.files?.length) throw new Error('UNVERIFIED_SOURCE');
    leaguesPublished.push(entry.league);
    for (const relative of entry.files) {
      if (!new RegExp(`^${entry.league.replaceAll('.', '\\.')}/\\d{4}\\.json$`).test(relative)) throw new Error('INVALID_PATH');
      const data = JSON.parse(await fs.readFile(path.join(outDir, 'archive', relative), 'utf8'));
      validateArchive(data, entry.league, path.basename(relative, '.json'));
      for (const m of data.matches) {
        if (!latestFetchedAt || Date.parse(m.fetchedAt) > Date.parse(latestFetchedAt)) {
          latestFetchedAt = m.fetchedAt;
        }
      }
      const destination = path.join(target, relative);
      let oldRaw = null;
      let old = null;
      try {
        oldRaw = await fs.readFile(destination, 'utf8');
        old = JSON.parse(oldRaw);
      } catch (e) { if (e.code !== 'ENOENT') throw e; }
      if (old) {
        validateArchive(old, entry.league, data.season);
        if (old.matches.some(m => !data.matches.some(n => n.id === m.id))) throw new Error('ARCHIVE_SHRINK_REJECTED');
      }
      const content = JSON.stringify(data, null, 2) + '\n';
      writes.push({ relative, destination, content, changed: oldRaw !== content });
    }
  }
  let currentBytes = 0;
  async function size(dir) { for (const e of await fs.readdir(dir, { withFileTypes: true }).catch(e => { if (e.code === 'ENOENT') return []; throw e; })) { const p = path.join(dir, e.name); if (e.isDirectory()) await size(p); else currentBytes += (await fs.stat(p)).size; } }
  await size(target);
  let projected = currentBytes;
  for (const w of writes) projected += Buffer.byteLength(w.content) - (await fs.stat(w.destination).catch(e => { if (e.code === 'ENOENT') return { size: 0 }; throw e; })).size;
  if (projected > 50 * 1024 * 1024) throw new Error('ARCHIVE_50_MIB_LIMIT_EXTERNAL_STORAGE_REQUIRED');
  // Entire artifact validated before changing the working tree. Commit is the transaction.
  let changedFiles = 0;
  for (const w of writes) {
    if (!w.changed) continue;
    changedFiles++;
    await fs.mkdir(path.dirname(w.destination), { recursive: true });
    await fs.writeFile(w.destination + '.tmp', w.content);
    await fs.rename(w.destination + '.tmp', w.destination);
  }
  return {
    files: writes.length,
    changedFiles,
    bytes: projected,
    lastFetchedAt: latestFetchedAt,
    leaguesPublished,
    leaguesPreserved,
  };
}

export function buildArchiveDeployReport({ lastFetchedAt, deployedAt = new Date().toISOString(), changedFiles = 0, commitSha = null }) {
  const fetchedMs = lastFetchedAt ? Date.parse(lastFetchedAt) : NaN;
  const deployedMs = Date.parse(deployedAt);
  const deltaSeconds = Number.isFinite(fetchedMs) && Number.isFinite(deployedMs)
    ? Math.max(0, Math.round((deployedMs - fetchedMs) / 1000))
    : null;
  return {
    lastFetchedAt: Number.isFinite(fetchedMs) ? new Date(fetchedMs).toISOString() : null,
    lastDeployedAt: Number.isFinite(deployedMs) ? new Date(deployedMs).toISOString() : null,
    deltaSeconds,
    changedFiles,
    commitSha,
    deployTriggered: changedFiles > 0,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outDir = process.argv[2] ? path.resolve(process.argv[2]) : undefined;
  const targetDir = process.argv[3] ? path.resolve(process.argv[3]) : undefined;
  console.log(JSON.stringify(await publish(outDir, targetDir), null, 2));
}
