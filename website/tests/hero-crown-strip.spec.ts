import { expect, test } from '@playwright/test';

test.describe('Hero 3D Crown tournament strip on home page (/)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (route) => route.abort());
  });

  test('renders 8 tournament cards in a 3D crown above the hero ticket row and live stats below the main ticket', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');

    const strip = page.locator('#hero [data-hero-league-strip="crown3d"]');
    const ticketRow = page.locator('#hero .hero-ticket-row');
    const mainTicket = page.locator('#hero .hero-ticket-row .home-matches-ticket');
    const statsBar = page.locator('#hero [data-hero-league-stats="crown3d"]');
    await expect(strip).toBeVisible();
    await expect(ticketRow).toBeVisible();
    await expect(statsBar).toBeVisible();

    const stripBox = await strip.boundingBox();
    const ticketBox = await ticketRow.boundingBox();
    const mainBox = await mainTicket.boundingBox();
    const statsBox = await statsBar.boundingBox();
    expect(stripBox).not.toBeNull();
    expect(ticketBox).not.toBeNull();
    expect(mainBox).not.toBeNull();
    expect(statsBox).not.toBeNull();
    // 3D Crown cards sit above the ticket row; statistics sit below the main ticket
    expect(stripBox!.y + stripBox!.height).toBeLessThanOrEqual(ticketBox!.y + 2);
    expect(statsBox!.y).toBeGreaterThanOrEqual(mainBox!.y + mainBox!.height - 2);

    const cards = strip.locator('[data-crown-card]');
    await expect(cards).toHaveCount(8);
    await expect(strip.locator('[data-trophy-variant="authentic"]')).toHaveCount(8);
    await expect(strip).not.toContainText('1st');
    await expect(statsBar).not.toContainText('1st');

    // Transparent background on tournament emblem inside trophy cup
    const emblemBg = await strip
      .locator('[data-crown-offset="0"] .lc-trophy-emblem .league-carousel-badge')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(emblemBg).toBe('rgba(0, 0, 0, 0)');

    // Initial active card: UEFA Champions League + synchronized stats bar below main ticket
    await expect(strip.locator('[data-crown-card="uefa.champions"]')).toHaveAttribute('data-crown-offset', '0');
    await expect(statsBar.locator('[data-crown-stats-league="uefa.champions"]')).toBeVisible();
    await expect(statsBar.locator('[data-crown-wing="leader"] [data-crown-leader-name]')).toHaveText('Paris Saint-Germain');
    await expect(statsBar.locator('[data-crown-wing="stats"] [data-crown-metric="best-attack"]')).toBeVisible();
    await expect(statsBar.locator('[data-crown-wing="stats"] [data-crown-metric="best-defence"]')).toBeVisible();
    await expect(statsBar.locator('[data-crown-wing="stats"] [data-crown-metric="total-goals"]')).toBeVisible();

    // Clicking the exposed side of an angled neighbor card rotates it to front and updates stats below main ticket
    await strip.locator('[data-crown-card="eng.1"]').click({ position: { x: 18, y: 28 } });
    await expect(strip.locator('[data-crown-card="eng.1"]')).toHaveAttribute('data-crown-offset', '0');
    await expect(statsBar.locator('[data-crown-stats-league="eng.1"]')).toBeVisible();
    await expect(statsBar.locator('[data-crown-wing="leader"] [data-crown-leader-name]')).toHaveText('Manchester City');

    // Next/prev arrow controls step cleanly and sync stats bar
    await strip.getByRole('button', { name: 'البطولة التالية في شريط الهيرو' }).click();
    await expect(strip.locator('[data-crown-card="fra.1"]')).toHaveAttribute('data-crown-offset', '0');
    await expect(statsBar.locator('[data-crown-stats-league="fra.1"]')).toBeVisible();
    await expect(statsBar.locator('[data-crown-wing="leader"] [data-crown-leader-name]')).toHaveText('AS Monaco');

    // Clicking the active front card navigates to that tournament's hub page
    await strip.locator('[data-crown-card="fra.1"]').click();
    await expect.poll(() => decodeURI(page.url())).toContain('/matches/الدوري-الفرنسي/');
  });

  test('auto-steps every 5s when motion is allowed and preserves zero horizontal overflow on mobile', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();
    await page.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (route) => route.abort());
    await page.goto('http://127.0.0.1:3000/');

    const strip = page.locator('#hero [data-hero-league-strip="crown3d"]');
    const mainTicket = page.locator('#hero .hero-ticket-row .home-matches-ticket');
    const statsBar = page.locator('#hero [data-hero-league-stats="crown3d"]');
    await expect(strip.locator('[data-crown-card="uefa.champions"]')).toHaveAttribute('data-crown-offset', '0');

    const mainBox = await mainTicket.boundingBox();
    const statsBox = await statsBar.boundingBox();
    expect(mainBox).not.toBeNull();
    expect(statsBox).not.toBeNull();
    expect(statsBox!.y).toBeGreaterThanOrEqual(mainBox!.y + mainBox!.height - 2);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    // Wait slightly over 5s for the automatic step to Premier League in both crown and stats bar
    await page.waitForTimeout(5300);
    await expect(strip.locator('[data-crown-card="eng.1"]')).toHaveAttribute('data-crown-offset', '0');
    await expect(statsBar.locator('[data-crown-wing="leader"] [data-crown-leader-name]')).toHaveText('Manchester City');

    await context.close();
  });

  test('renders angled parallelogram day tabs and diagonal split match cards across desktop and mobile', async ({ page }) => {
    const cairoDay = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    await page.route('**/scoreboard.php*', (route) => {
      const league = new URL(route.request().url()).searchParams.get('league') ?? '';
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          events:
            league === 'eng.1'
              ? [
                  {
                    id: 'diag-test-1',
                    date: `${cairoDay}T14:00:00Z`,
                    competitions: [
                      {
                        date: `${cairoDay}T14:00:00Z`,
                        venue: { fullName: 'ملعب الاتحاد' },
                        status: { displayClock: '68′', type: { state: 'in', completed: false } },
                        competitors: [
                          {
                            homeAway: 'home',
                            score: '2',
                            team: {
                              displayName: 'مانشستر سيتي',
                              logo: 'http://127.0.0.1:3000/images/teams/manchester-city-club-badge.webp',
                            },
                          },
                          {
                            homeAway: 'away',
                            score: '1',
                            team: {
                              displayName: 'باريس سان جيرمان',
                              logo: 'http://127.0.0.1:3000/images/teams/paris-saint-germain-club-badge.webp',
                            },
                          },
                        ],
                      },
                    ],
                  },
                ]
              : [],
        }),
      });
    });

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');

    const ticket = page.locator('[data-hero-side="matches"]');
    await expect(ticket.locator('[data-day-tabs-variant="diagonal"]')).toBeVisible();
    const todayTab = ticket.getByRole('tab', { name: 'اليوم', exact: true });
    await expect(todayTab).toHaveAttribute('aria-selected', 'true');

    // Verify skewed blade transform on the tab button
    const tabTransform = await todayTab.evaluate((el) => getComputedStyle(el).transform);
    expect(tabTransform).not.toBe('none');

    const card = ticket.locator('a.hero-match-slide[data-match-card-variant="diagonal"]');
    await expect(card).toBeVisible();
    await expect(card.locator('.hms-diag-home-zone')).toBeVisible();
    await expect(card.locator('.hms-diag-away-zone')).toBeVisible();
    await expect(card).toContainText('مانشستر سيتي');
    await expect(card).toContainText('باريس سان جيرمان');
    await expect(card).toContainText('68′');

    // Keyboard arrow navigation between أمس / اليوم / غد
    await todayTab.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(ticket.getByRole('tab', { name: 'غد', exact: true })).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(todayTab).toHaveAttribute('aria-selected', 'true');

    // Mobile viewport: horizontal diagonal duel row fits 132px height with zero overflow
    await page.setViewportSize({ width: 390, height: 900 });
    await expect(card.locator('.hms-diag-mobile')).toBeVisible();
    await expect(card.locator('[data-match-score]')).toHaveAttribute('dir', 'rtl');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
