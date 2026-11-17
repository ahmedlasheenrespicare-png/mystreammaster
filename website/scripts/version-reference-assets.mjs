import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

// Unfingerprinted assets can otherwise remain cached for a year on Hostinger.
// Hash the complete reference dependency graph, and use the same version on
// entry points, imported modules and the fallback snapshot. Normalize existing
// versions first so repeated builds are stable.
const entries = ['league-panels.js','league-panels.css','cinema-showcase.js','cinema-showcase.css','main-D5MQsYQ6.js','motion-settings.js','hero-motion.js','about-motion.js','about-devices.js','about-video.js','path-section.js','server-reveal.js','server-counters.js','sports-intro.js','sports-gallery.js','sports-stats.js','featured-matches.js','blog-rail.js','mobile-motion.js','contact-footer.js'];
const modules = ['standings.js','fixtures-archive.js','leader-logo.js','matches.js','scoreboard-incidents.js','team-names-ar.js','standings-snapshot.json','league-archive-eng.1.json','league-archive-esp.1.json','league-archive-ita.1.json','league-archive-ger.1.json','league-archive-fra.1.json','league-archive-egy.1.json','league-archive-uefa.champions.json'];
const images = ['hero-video.mp4','hero-video-mobile.mp4','hero-video-poster.jpg','cinema-1.jpg','cinema-2.jpg','cinema-3.jpg','cinema-4.jpg','cinema-5.jpg','path-sport.jpg','path-cinema.jpg','path-value.jpg','path-sport-2.jpg','path-cinema-2.jpg','path-value-2.jpg','path-sport-3.jpg','path-sport-4.jpg','path-cinema-3.jpg','path-cinema-4.jpg','path-value-3.jpg','path-value-4.jpg'];
// Include the Arabic film layers so changing an image invalidates the shared asset version.
for (const id of [0,5,4,8,6,3]) images.push(`cinema-layers/arabic-film-${id}.jpg`, `cinema-layers/arabic-backdrop-${id}.jpg`, `cinema-layers/arabic-person-${id}.webp`);
const names = [...entries, ...modules, ...images];
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function strip(text) {
  for (const name of names) text = text.replace(new RegExp(`(${escape(name)})\\?v=[^"'\\s]*`, 'g'), '$1');
  return text;
}
function version(text, candidates, hash) {
  for (const name of candidates) text = text.replace(new RegExp(`(${escape(name)})(?=["'])`, 'g'), `$1?v=${hash}`);
  return text;
}
export async function versionReferenceAssets(reference) {
  const htmlPath = path.join(reference, 'index.html');
  const html = strip(await fs.readFile(htmlPath, 'utf8'));
  const contents = new Map();
  for (const name of [...entries,...modules]) contents.set(name, strip(await fs.readFile(path.join(reference, 'assets', name), 'utf8')));
  for (const name of images) contents.set(name, await fs.readFile(path.join(reference, 'assets', name)));
  const digest = createHash('sha256').update(html);
  for (const [name, data] of contents) digest.update(name).update(data);
  const hash = digest.digest('hex').slice(0, 16);
  await fs.writeFile(htmlPath, version(html, [...entries,...images], hash));
  for (const name of ['sports-stats.js', 'featured-matches.js', 'matches.js', 'league-panels.js']) {
    await fs.writeFile(path.join(reference, 'assets', name), version(contents.get(name), modules, hash));
  }
  return hash;
}
