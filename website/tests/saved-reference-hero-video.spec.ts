import {test,expect} from '@playwright/test';
test('hero does not download or display the removed video while the later video remains',async({page})=>{
 const requests:string[]=[];page.on('request',r=>{if(/hero-video(?:-mobile)?\.mp4/.test(r.url()))requests.push(r.url())});await page.route('**/main-D5MQsYQ6.js*',r=>r.fulfill({body:'',contentType:'text/javascript'}));await page.route('https://**',r=>r.abort());await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.ban video')).toHaveCount(0);await expect(page.locator('.abt__video video')).toHaveAttribute('data-src',/video-streammaster-hero-montage-1080/);await page.waitForTimeout(500);expect(requests).toEqual([]);
});
