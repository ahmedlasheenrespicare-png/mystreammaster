import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, stat } from 'node:fs/promises';

const readSource = (path) => readFile(new URL(path, import.meta.url), 'utf8');

async function webpHasAlpha(path) {
  const image = await readFile(new URL(path, import.meta.url));
  assert.equal(image.toString('ascii', 0, 4), 'RIFF');
  assert.equal(image.toString('ascii', 8, 12), 'WEBP');

  let hasAlphaFlag = false;
  let hasAlphaChunk = false;
  for (let offset = 12; offset + 8 <= image.length;) {
    const type = image.toString('ascii', offset, offset + 4);
    const size = image.readUInt32LE(offset + 4);
    const payload = offset + 8;
    if (type === 'VP8X') hasAlphaFlag = (image[payload] & 0x10) !== 0;
    if (type === 'ALPH') hasAlphaChunk = true;
    offset = payload + size + (size % 2);
  }
  return hasAlphaFlag && hasAlphaChunk;
}

test('homepage critical hero uses immediate reveals and prioritized alpha-preserving WebP art', async () => {
  const hero = await readSource('../src/components/Hero.tsx');
  const motion = await readSource('../src/components/motion.tsx');
  assert.match(motion, /useState\(initiallyVisible\)/);
  assert.match(motion, /if \(!el \|\| initiallyVisible\) return/);
  const firstReveals = [...hero.matchAll(/<Reveal\b[^>]*>/g)].slice(0, 3).map(([tag]) => tag);
  assert.equal(firstReveals.length, 3, 'homepage has three critical hero reveal wrappers');
  for (const [index, tag] of firstReveals.entries()) {
    assert.match(tag, /\binitiallyVisible\b/, `critical hero wrapper ${index + 1} is visible in server HTML`);
  }

  const television = await readSource('../src/components/HeroTelevision.tsx');
  assert.match(television, /eng-haaland-header\.webp/, 'hero uses the existing optimized, alpha-preserving Haaland asset');
  assert.match(television, /superman-batman-stark\.webp/);
  assert.match(television, /loading="eager" fetchPriority="high"/, 'primary hero art is not lazy-loaded');

  const imagePairs = [
    ['../public/images/cinema/superman-batman-stark.webp', '../public/images/cinema/superman-batman-stark.png'],
    ['../public/images/players/eng-haaland-header.webp', '../public/images/players/eng-haaland-header.png'],
  ];
  for (const [optimizedPath, originalPath] of imagePairs) {
    const [optimized, original] = await Promise.all([
      stat(new URL(optimizedPath, import.meta.url)),
      stat(new URL(originalPath, import.meta.url)),
    ]);
    assert.ok(optimized.size < original.size / 2, `${optimizedPath}: optimized asset is substantially smaller`);
    assert.ok(await webpHasAlpha(optimizedPath), `${optimizedPath}: WebP retains its alpha channel`);
  }
});
