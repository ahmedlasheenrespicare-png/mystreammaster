import {test,expect} from '@playwright/test';
for(const width of [390,1440])for(const js of [true,false])test(`server actions prepare WhatsApp messages at ${width}px, javascript ${js}`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled:js,reducedMotion:'reduce'});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**',r=>r.abort());await page.route('**/*.mp4*',r=>r.abort());await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
 const cards=page.locator(js?'#works .league-carousel-item':'#works .server-source .sm-server');await expect(cards).toHaveCount(4);
 for(const [i,name] of ['نوفا','إيستار','موكا','X'].entries()){
  const links=cards.nth(i).locator(js?'.actions a':'.sm-server__actions a');await expect(links).toHaveCount(2);
  for(const [j,intent] of ['الاشتراك','تجربة'].entries()){const link=links.nth(j),href=await link.getAttribute('href');const url=new URL(href!);expect(url.origin+url.pathname).toBe('https://wa.me/201090415657');expect(url.searchParams.get('text')).toContain(name);expect(url.searchParams.get('text')).toContain(intent);await expect(link).toHaveAttribute('target','_blank');await expect(link).toHaveAttribute('rel','noopener noreferrer');}
 }
 expect(errors).toEqual([]);await context.close();
});
