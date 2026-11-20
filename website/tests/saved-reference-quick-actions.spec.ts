import {test,expect} from '@playwright/test';

for(const width of [320,390,768,1440]) test(`quick actions are fixed, accessible and usable at ${width}px`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'}),page=await context.newPage();
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.abort());await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 const actions=page.getByRole('navigation',{name:'إجراءات سريعة'}),trial=actions.getByRole('link',{name:'طلب تجربة مجانية لمدة ٦ ساعات'}),whatsapp=actions.getByRole('link',{name:'تواصل عبر واتساب'});
 await expect(actions).toHaveCSS('position','fixed');await expect(trial).toHaveAttribute('href','/?trial=1');
 const link=new URL((await whatsapp.getAttribute('href'))!);expect(link.origin+link.pathname).toBe('https://wa.me/201090415657');expect(link.searchParams.get('text')).toBe('مرحبًا ستريم ماستر، أريد الاستفسار عن اشتراكات الـ IPTV');
 await expect(whatsapp).toHaveAttribute('target','_blank');await expect(whatsapp).toHaveAttribute('rel',/noopener/);await expect(whatsapp).toHaveAttribute('rel',/noreferrer/);
 await expect(trial.locator('.sm-quick-action__caption')).toHaveText('تجربة');await expect(whatsapp.locator('.sm-quick-action__caption')).toHaveText('واتساب');
 for(const action of [trial,whatsapp]){const caption=action.locator('.sm-quick-action__caption');await expect(caption).toBeVisible();expect(await caption.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);const box=await action.boundingBox();expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44);expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width);await expect(action).toHaveCSS('transition-duration','0s');}
 const before=await actions.boundingBox();await page.evaluate(()=>window.scrollTo(0,1600));const after=await actions.boundingBox();expect(Math.abs(before!.y-after!.y)).toBeLessThanOrEqual(1);
 await trial.focus();await expect(trial.locator('.sm-quick-action__label')).toHaveCSS('visibility','visible');expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 await context.close();
});

test('trial action navigates to the homepage trial dialog entry point',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:850}}),page=await context.newPage();
 await page.route('**/main-D5MQsYQ6.js*',route=>route.abort());await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());
 await page.route('**/?trial=1',route=>route.fulfill({contentType:'text/html',body:'<title>Trial entry</title>'}));
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 await page.getByRole('link',{name:'طلب تجربة مجانية لمدة ٦ ساعات'}).click();await expect(page).toHaveURL(/\/?\?trial=1$/);await expect(page).toHaveTitle('Trial entry');await context.close();
});

test('homepage trial entry opens the existing trial form',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:850}}),page=await context.newPage();
 await page.route('https://**',route=>route.abort());
 await page.goto('/?trial=1',{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('dialog',{name:'طلب تجربة مجانية'})).toBeVisible({timeout:20000});
 await expect(page.getByLabel('نوع جهازك:')).toBeVisible();
 await expect(page.getByLabel('السيرفر المراد تجربته:')).toBeVisible();await context.close();
});
