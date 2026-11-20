import {test,expect} from '@playwright/test';
for(const width of [390,1440])test(`floating trial prepares the requested WhatsApp message at ${width}px`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:900},isMobile:width<600,hasTouch:width<600});const page=await context.newPage();await page.route('https://**',r=>r.abort());await page.route('**/*.mp4*',r=>r.abort());await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
 const link=page.locator('.sm-quick-action--trial');const url=new URL((await link.getAttribute('href'))!);expect(url.origin+url.pathname).toBe('https://wa.me/201090415657');expect(url.searchParams.get('text')).toBe('مرحبا ستريم ماستر اريد مساعدتي لتجربه الخدمه');await expect(link).toHaveAttribute('target','_blank');await expect(link).toHaveAttribute('rel','noopener noreferrer');await expect(link).toBeVisible();await context.close();
});
