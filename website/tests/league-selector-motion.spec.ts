import {test, expect} from '@playwright/test';

for(const width of [320,390,768]) test(`league selector animates on ${width}px when motion is enabled`,async({page})=>{
  await page.setViewportSize({width,height:700});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
  await page.goto('/home-preview/saved-reference/');
  const section=page.locator('#league-strip');
  await expect(section.locator('.league-fixed-actions svg')).toHaveCount(3);
  await expect(section.locator('.sm-leagues__cards > .world-launch')).toHaveCount(1);
  await expect(section.locator('.sm-leagues__actions a')).toHaveCount(0);
  await expect(section.locator('.sm-leagues__mini button')).toHaveCount(8);
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator('.sm-leagues__mini')).toHaveClass(/strip-visible/);
  await expect(section.locator('.sm-leagues__stats')).toHaveClass(/stats-visible/);
  await expect(section.locator('.league-fixed-actions')).toHaveClass(/is-visible/);
  const result=await section.evaluate(el=>{
    const bar=el.querySelector('.league-fixed-actions')!.getBoundingClientRect();
    (el.querySelector('.section-carousel-nav--next') as HTMLElement).click();
    const after=el.querySelector('.league-fixed-actions')!.getBoundingClientRect();
    return {logos:el.querySelectorAll('.league-transition-logo').length,ghosts:el.querySelectorAll('.league-transition-ghost').length,stats:el.querySelectorAll('.stat-transition-old').length,barStable:bar.x===after.x&&bar.y===after.y};
  });
  expect(result).toEqual({logos:2,ghosts:1,stats:4,barStable:true});
  await expect(section.locator('.sm-leagues__mini button[aria-pressed=true]')).toHaveText(/الدوري الإنجليزي/);
  await expect(section.locator('.league-transition-ghost')).toHaveCount(0);
  await expect(section.locator('.stat-transition-old')).toHaveCount(0);
  const current=await section.locator('.sm-leagues__mini button[aria-pressed=true]').textContent();
  await page.mouse.move(width/2,350);await page.mouse.wheel(0,300);
  await expect(section.locator('.sm-leagues__mini button[aria-pressed=true]')).toHaveText(current!);
  await expect(section.locator('.league-fixed-actions button')).toHaveCount(3);
  await expect(section.locator('.league-fixed-actions button').first()).toHaveCSS('min-height','44px');
});

test('selector respects disabled motion without disabling controls',async({page})=>{
  await page.setViewportSize({width:320,height:568});
  await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));
  await page.goto('/home-preview/saved-reference/');
  const section=page.locator('#league-strip');
  await expect(section.locator('.league-fixed-actions')).toBeAttached();
  const layers=await section.evaluate(el=>{
    (el.querySelector('.section-carousel-nav--next') as HTMLElement).click();
    return el.querySelectorAll('.league-transition-logo,.league-transition-ghost,.stat-transition-old').length;
  });
  expect(layers).toBe(0);
  await expect(section.locator('.sm-leagues__mini button[aria-pressed=true]')).toHaveText(/الدوري الإنجليزي/);
  await expect(section.locator('.sm-leagues__mini button').nth(1)).toHaveCSS('animation-name','none');
});
