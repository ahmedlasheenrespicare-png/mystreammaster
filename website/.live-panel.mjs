import sparticuz, { inflate } from '@sparticuz/chromium';
import { chromium } from '@playwright/test';
import path from 'node:path';
const S = [
  ['possessionPct', 'الاستحواذ', '%', 41.8, 58.2], ['totalShots', 'التسديدات', '', 9, 17],
  ['shotsOnTarget', 'على المرمى', '', 3, 6], ['passPct', 'دقة التمرير', '%', 76.1, 85.3],
  ['wonCorners', 'الركنيات', '', 3, 7], ['saves', 'التصديات', '', 5, 2],
  ['yellowCards', 'بطاقات صفراء', '', 2, 1], ['redCards', 'بطاقات حمراء', '', 0, 0],
].map(([key, label, unit, home, away]) => ({ key, label, unit, home, away }));
const base = {
  provider: 'espn', match: 'brentford-liverpool', event: '401879262', league: 'eng.1',
  readAt: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), cache: 'HIT',
  score: { home: 1, away: 2 }, logos: { home: null, away: null }, venue: 'Gtech Community Stadium',
  events: [{ type: 'goal', minute: 12, side: 'home', player: 'A', id: 'e1' }],
  statistics: S, lineups: null, ratings: null, h2h: [], form: null,
  status: { type: { name: 'STATUS_SECOND_HALF', state: 'in', completed: false }, displayClock: "67'" },
};
const libraries = await inflate(path.resolve('/home/user/mystreammaster/website/node_modules/@sparticuz/chromium/bin/al2023.tar.br'));
const browser = await chromium.launch({
  executablePath: await sparticuz.executablePath(),
  args: sparticuz.args.filter(a => !['--single-process', '--disable-web-security'].includes(a)),
  env: { ...process.env, LD_LIBRARY_PATH: `${libraries}/lib:${process.env.LD_LIBRARY_PATH || ''}` },
});
const ctx = await browser.newContext({ viewport: { width: 1100, height: 1300 }, reducedMotion: 'reduce', locale: 'ar', deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.context().route('**/match-center.php*', route => route.fulfill({ status: 200, headers: { 'Content-Type': 'application/json' }, json: base }));
await page.goto('http://127.0.0.1:3000/matches/%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A-%D8%A7%D9%84%D8%A5%D9%86%D8%AC%D9%84%D9%8A%D8%B2%D9%8A/brentford-liverpool/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#mc-panel-live .mc-indexboard', { timeout: 25000 });
await page.waitForTimeout(900);
await page.locator('#mc-panel-live').screenshot({ path: '/home/user/mystreammaster/website/docs/match-center-shots/live-indicators-now.png' });
console.log('ok');
await browser.close();
