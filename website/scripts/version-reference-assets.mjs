import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

// Unfingerprinted assets can otherwise remain cached for a year on Hostinger.
// Hash the complete reference dependency graph, and use the same version on
// entry points, imported modules and the fallback snapshot. Normalize existing
// versions first so repeated builds are stable.
const entries = ['main-D5MQsYQ6.js','motion-settings.js','hero-motion.js','about-motion.js','about-devices.js','about-video.js','path-section.js','server-reveal.js','server-counters.js','sports-intro.js','sports-gallery.js','sports-stats.js','featured-matches.js','blog-rail.js','mobile-motion.js','contact-footer.js'];
const modules = ['standings.js','fixtures-archive.js','leader-logo.js','matches.js','scoreboard-incidents.js','team-names-ar.js','standings-snapshot.json'];
const names = [...entries, ...modules];
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
  for (const name of names) contents.set(name, strip(await fs.readFile(path.join(reference, 'assets', name), 'utf8')));
  const digest = createHash('sha256').update(html);
  for (const [name, data] of contents) digest.update(name).update(data);
  const hash = digest.digest('hex').slice(0, 16);
  await fs.writeFile(htmlPath, version(html, entries, hash));
  for (const name of ['sports-stats.js', 'featured-matches.js', 'matches.js']) {
    await fs.writeFile(path.join(reference, 'assets', name), version(contents.get(name), modules, hash));
  }
  return hash;
}
