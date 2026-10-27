import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
  });
});

test('homepage match and news engagement plus trial, plan, and pricing clicks reach the existing GA4 dataLayer', async ({ page }) => {
  await page.addInitScript(() => {
    (window as typeof window & { dataLayer: unknown[] }).dataLayer = [];
    document.addEventListener('click', event => {
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest<HTMLAnchorElement>('a[href]');
      if (link) {
        const destination = new URL(link.href);
        if (destination.hash === '#pricing' || destination.pathname.startsWith('/news/') || destination.pathname.startsWith('/matches/') || /^\/(?:en\/)?(?:nova|istar|moka|x)(?:\/|$)/.test(destination.pathname)) event.preventDefault();
      }
    }, true);
  });

  await page.route('**/scoreboard.php*', async route => {
    const requestUrl = new URL(route.request().url());
    const rangeStart = requestUrl.searchParams.get('dates')?.slice(0, 8);
    if (!rangeStart) return route.fulfill({ status: 400, body: 'Missing dates' });
    const requestedDay = new Date(`${rangeStart.slice(0, 4)}-${rangeStart.slice(4, 6)}-${rangeStart.slice(6, 8)}T12:00:00Z`);
    requestedDay.setUTCDate(requestedDay.getUTCDate() + 1);
    const date = `${requestedDay.toISOString().slice(0, 10)}T18:00:00Z`;
    const league = requestUrl.searchParams.get('league') || 'eng.1';
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        events: [{
          id: `${league}-analytics-test`,
          date,
          competitions: [{
            date,
            competitors: [
              { homeAway: 'home', team: { displayName: 'Test Home' }, score: '' },
              { homeAway: 'away', team: { displayName: 'Test Away' }, score: '' },
            ],
            status: { type: { state: 'pre', completed: false, name: 'STATUS_SCHEDULED', shortDetail: 'Scheduled' } },
          }],
        }],
      }),
    });
  });

  await page.goto('/');

  await page.locator('.hero-side-ticket--matches').getByRole('tab', { name: 'غد' }).click();
  const matchLink = page.locator('#hero-matches-panel a.hero-match-slide').first();
  await expect(matchLink).toBeVisible();
  await matchLink.click();
  await page.locator('.home-matches-ticket .league-ticket-dot').nth(1).click();
  await page.locator('.home-matches-ticket .league-ticket-slide.is-active a[href*="/news/"]').click();

  const pricingLink = page.locator('a[href="#pricing"]').filter({ hasText: 'مقارنة كل الباقات' }).first();
  await expect(pricingLink).toBeVisible();
  await pricingLink.click();

  const planLink = page.getByRole('group', { name: 'مقارنة سيرفرات المشاهدة' }).getByRole('link', { name: /اشترك في نوفا/ });
  await expect(planLink).toBeVisible();
  await planLink.click();

  await page.locator('#hero').getByRole('button', { name: 'اطلب تجربتك المجانية' }).click();

  const events = await page.evaluate(() => {
    const dataLayer = (window as typeof window & { dataLayer: IArguments[] }).dataLayer;
    return dataLayer
      .filter(entry => entry?.[0] === 'event')
      .map(entry => ({ name: entry[1], params: entry[2] }));
  });

  expect(events).toEqual(expect.arrayContaining([
    expect.objectContaining({
      name: 'hero_match_day_select',
      params: expect.objectContaining({ placement: 'home_hero', day_key: 'tomorrow' }),
    }),
    expect.objectContaining({
      name: 'hero_match_open',
      params: expect.objectContaining({ placement: 'home_hero', league_id: expect.any(String) }),
    }),
    expect.objectContaining({
      name: 'hero_ticket_slide_select',
      params: expect.objectContaining({ placement: 'home_hero', slide_kind: 'news' }),
    }),
    expect.objectContaining({
      name: 'hero_news_open',
      params: expect.objectContaining({ placement: 'home_hero', story_path: 'news/psg-lyon-tonight/' }),
    }),
    expect.objectContaining({
      name: 'commercial_cta_click',
      params: expect.objectContaining({ cta_type: 'pricing', target_path: '/#pricing' }),
    }),
    expect.objectContaining({
      name: 'commercial_cta_click',
      params: expect.objectContaining({ cta_type: 'plan', plan_code: 'nova', target_path: '/nova' }),
    }),
    expect.objectContaining({
      name: 'commercial_cta_click',
      params: expect.objectContaining({ cta_type: 'trial', cta_location: 'trial_modal' }),
    }),
  ]));
});
