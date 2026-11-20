import {test,expect} from '@playwright/test';
for(const theme of ['light','dark'])test(`sections have no separator borders in ${theme}`,async({page})=>{
 await page.goto('/home-preview/');await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);const sections=page.locator('main > section');expect(await sections.count()).toBeGreaterThan(4);for(const section of await sections.all()){await expect(section).toHaveCSS('border-top-width','0px');await expect(section).toHaveCSS('border-bottom-width','0px')}
 await expect(page.locator('.league-gallery .league-card').first()).not.toHaveCSS('border-top-width','0px');
});
