import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { load } from 'cheerio';

/* ==========================================================================
   أيقونات البطولات في رؤوس صفحات الهبوط — في HTML المُسبق رسمه نفسه
   --------------------------------------------------------------------------
   • الشارة تُرسم وقت البناء (SSR) فلا تحتاج JavaScript لتظهر — نفس قاعدة
     شريط البطولات في test-league-carousel.mjs.
   • الفحص بنيوي: الرابط الموثّق لكل بطولة، بديل الكأس المحايد تحتها،
     `alt=""` الزخرفية، والتحميل الفوري فوق الطية — ولا اختبار يعتمد نجاح
     تحميل الصورة من الشبكة.
   • صفحات المنتخبات مستثناة تماماً: لا شارة بطولة ولا بديل كأس (الكأس على
     صفحة منتخب خطأ في المعنى).
   ========================================================================== */

const website = new URL('../', import.meta.url);
const root = new URL('../../', import.meta.url);
const competitions = await fs.readFile(new URL('src/content/competitions.ts', website), 'utf8');

/* القيم تُقرأ من المصدر الواحد (competitions.ts) — لا تُنسخ في الاختبار */
const iconsBlock = competitions.match(/export const LEAGUE_ICONS[^\n]*=\s*\{([\s\S]*?)\n\};/);
assert.ok(iconsBlock, 'LEAGUE_ICONS معرَّفة في content/competitions.ts');
const LEAGUE_ICONS = Object.fromEntries(
  [...iconsBlock[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]),
);

const landingsBlock = competitions.match(/export const LEAGUE_LANDINGS[^\n]*=\s*\[([\s\S]*?)\n\];/);
assert.ok(landingsBlock, 'LEAGUE_LANDINGS معرَّفة في content/competitions.ts');
/* في كل مدخلة: slug ثم leagueId مباشرة (معرّف المباريات — مرجع الأيقونة) */
const landings = [...landingsBlock[1].matchAll(/slug:\s*"([^"]+)",\s*leagueId:\s*"([^"]+)",/g)].map((m) => ({
  slug: m[1],
  leagueId: m[2],
}));
assert.equal(landings.length, 8, 'ثماني صفحات هبوط بطولات، لكل منها slug وleagueId');

const teamsBlock = competitions.match(/export const TEAM_LANDINGS[^\n]*=\s*\[([\s\S]*?)\n\];/);
assert.ok(teamsBlock, 'TEAM_LANDINGS معرَّفة في content/competitions.ts');
const teams = [...teamsBlock[1].matchAll(/slug:\s*"([^"]+)",/g)].map((m) => m[1]);
assert.equal(teams.length, 8, 'ثماني صفحات هبوط منتخبات');

test('seven league landings have a documented icon and Egypt resolves to the neutral fallback', () => {
  const withIcon = landings.filter((landing) => LEAGUE_ICONS[landing.leagueId]);
  assert.equal(withIcon.length, 7, 'سبع بطولات لها شعار موثّق لدى المصدر');
  const withoutIcon = landings.filter((landing) => !LEAGUE_ICONS[landing.leagueId]);
  assert.deepEqual(withoutIcon.map((l) => l.leagueId), ['egy.1'], 'الدوري المصري وحده بلا شعار موثّق');
});

test('every league landing hero carries its badge beside the h1 in the prerendered HTML', async () => {
  for (const { slug, leagueId } of landings) {
    const page = load(await fs.readFile(new URL(`matches/${slug}/index.html`, root), 'utf8'));
    /* الشارة والعنوان في سطر الرأس نفسه — عنوان واحد لا يتكرر */
    const title = page('.matches-hero-title');
    assert.equal(title.length, 1, `${slug}: سطر عنوان واحد في الرأس`);
    assert.equal(title.find('h1#landing-title').length, 1, `${slug}: العنوان داخل سطر الرأس`);

    const badge = title.find('.league-carousel-badge');
    assert.equal(badge.length, 1, `${slug}: شارة واحدة`);
    assert.equal(badge.attr('aria-hidden'), 'true', `${slug}: الشارة زخرفية`);
    /* البديل المحايد مرسوم دائماً — وحده يظهر حين لا يتوفّر شعار */
    assert.equal(badge.find('.league-carousel-fallback').length, 1, `${slug}: بديل الكأس تحت الشعار`);

    const images = badge.find('img.league-carousel-logo');
    const icon = LEAGUE_ICONS[leagueId];
    if (icon) {
      assert.equal(images.length, 1, `${slug}: صورة الشعار الموثّق`);
      /* الحلّ بـ leagueId (معرّف المباريات) لا standings.leagueId — السعودي
         شعاره تحت sau.1؛ فلو استُخدم معرّف الترتيب ksa.1 اختفت الصورة */
      assert.equal(images.attr('src'), icon, `${slug}: الشعار من LEAGUE_ICONS[${leagueId}]`);
      assert.equal(images.attr('alt'), '', `${slug}: الأيقونة زخرفية والاسم في h1`);
      /* فوق الطية: تحميل فوري لا كسول، وأبعاد صريحة تمنع قفز التخطيط */
      assert.equal(images.attr('loading'), 'eager', `${slug}: أيقونة الرأس لا تُحمَّل lazily`);
      assert.equal(images.attr('decoding'), 'async', slug);
      assert.ok(Number(images.attr('width')) > 0 && Number(images.attr('height')) > 0, `${slug}: أبعاد صريحة`);
    } else {
      assert.equal(images.length, 0, `${slug}: بلا شعار موثّق → بديل الكأس وحده بلا صورة`);
    }
  }
});

test('team landing pages ship no league badge at all', async () => {
  for (const slug of teams) {
    const page = load(await fs.readFile(new URL(`world-cup-2026/${slug}/index.html`, root), 'utf8'));
    assert.equal(page('.league-carousel-badge').length, 0, `${slug}: صفحات المنتخبات بلا شارة بطولة`);
    assert.equal(page('.matches-hero-title').length, 0, `${slug}: رأس صفحة المنتخب بلا سطر شارة`);
  }
});
