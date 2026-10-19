/* ==========================================================================
   مولّد `src/content/league-averages.json` — متوسطات الدوري من الأرشيف
   --------------------------------------------------------------------------
   يشتق لكل بطولة متوسطاتٍ موثقة (استحواذ/تسديدات/دقة تمرير لكل فريق في
   المباراة) من ملفات الأرشيف تحت `src/content/fixtures-archive` وحده — بلا شبكة ولا
   مزوّد جديد. المخرجات ملتزَمة في المستودع ويُعيد توليدها عمل
   `fixtures-archive.yml` بعد كل نشر للأرشيف حتى لا يتيه الأساس عن مصدره.

   الاستخدام: node website/scripts/build-league-averages.mjs
========================================================================== */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeLeagueAverages } from '../src/lib/fixtures-archive.mjs';

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const archiveDir = path.join(website, 'src', 'content', 'fixtures-archive');
const outFile = path.join(website, 'src', 'content', 'league-averages.json');

const leagues = {};
for (const league of await fs.readdir(archiveDir)) {
  const leagueDir = path.join(archiveDir, league);
  if (!(await fs.stat(leagueDir)).isDirectory()) continue;
  const seasons = (await fs.readdir(leagueDir)).filter(name => name.endsWith('.json')).sort().reverse();
  for (const season of seasons) {
    const data = JSON.parse(await fs.readFile(path.join(leagueDir, season), 'utf8'));
    const averages = computeLeagueAverages(data.matches);
    /* الموسم الأحدث صاحب العينة الكافية هو المعتمد لكل بطولة. */
    if (averages && !leagues[league]) leagues[league] = { season: data.season, ...averages };
  }
}

const payload = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: 'content/fixtures-archive (verified provider records only)',
  definition: 'متوسط لكل فريق في المباراة الواحدة، من مباريات منتهية حملت أرقام الطرفين معاً؛ عينة أدنى من 10 مباريات تُسقط البطولة.',
  leagues: Object.fromEntries(Object.entries(leagues).sort(([a], [b]) => a.localeCompare(b))),
};

await fs.writeFile(outFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`league-averages.json: ${Object.keys(payload.leagues).length} leagues → ${Object.keys(payload.leagues).join(', ')}`);
