// Refresh the saved-reference preview's news data from the existing editorial source.
// This does not change the approved production snapshot.
import fs from 'node:fs/promises';
import { readFeaturedNews } from './inject-news-slides.mjs';

const output = new URL('../../home-preview/saved-reference/assets/sports-news.json', import.meta.url);
const news = readFeaturedNews().map(({ category, dateLabel, title, description, href, images, score }) => ({
  category, dateLabel, title, description, href,
  images: (images || []).map(({ src, alt }) => ({ src, alt })),
  ...(score ? { score } : {}),
}));
const extra = JSON.parse(await fs.readFile(new URL('../../home-preview/saved-reference/assets/sports-news-extra.json', import.meta.url), 'utf8'));
news.unshift(...extra);
await fs.writeFile(output, JSON.stringify(news, null, 2) + '\n');
console.log(`Saved-reference news data: ${news.length} stories.`);
