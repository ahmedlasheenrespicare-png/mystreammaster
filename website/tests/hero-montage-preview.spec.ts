import { test, expect } from '@playwright/test';
for (const width of [390,1440]) test(`hero montage plays at ${width}px`, async ({page})=>{
 await page.setViewportSize({width,height:850});
 await page.goto('/home-preview/hero-video-preview/');
 const video=page.locator('video');
 await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState),{timeout:20000}).toBeGreaterThan(1);
 const details=await video.evaluate((v:HTMLVideoElement)=>({duration:v.duration,width:v.videoWidth,height:v.videoHeight,paused:v.paused,muted:v.muted}));
 expect(details.duration).toBeGreaterThan(65);expect(details.width).toBe(960);expect(details.height).toBe(540);expect(details.muted).toBe(true);
 await video.evaluate((v:HTMLVideoElement)=>{v.currentTime=20;return v.play()});
 await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime),{timeout:10000}).toBeGreaterThan(20.2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});
