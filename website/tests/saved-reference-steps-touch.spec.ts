import {test,expect} from '@playwright/test';
for (const size of [{width:320,height:600},{width:390,height:700},{width:768,height:900}]) {
 test(`native touch scrolling pins steps and moves both ways at ${size.width}px`,async({browser})=>{
  test.setTimeout(90000);
  const context=await browser.newContext({viewport:size,hasTouch:true,isMobile:true,reducedMotion:'no-preference'});
  const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
  await page.route('https://**',route=>route.abort());await page.route('**/*.mp4*',route=>route.abort());
  await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
  await page.addStyleTag({content:'.loader{display:none!important}'});
  const stage=page.locator('#steps-stage'),view=stage.locator('.steps__view'),items=stage.locator('.steps__item');
  await expect(stage).toHaveClass(/is-enhanced/);
  await stage.evaluate(el=>window.scrollTo({top:window.scrollY+el.getBoundingClientRect().top+80,behavior:'instant'}));
  await expect.poll(()=>view.evaluate(el=>getComputedStyle(el).position),{timeout:15000}).toBe('sticky');
  const cdp=await context.newCDPSession(page);
  async function swipe(up:boolean){
   const x=size.width/2,start=up?size.height*.78:size.height*.22,delta=(up?-1:1)*size.height*.52;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:start}]});
   for(let i=1;i<=10;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:start+delta*i/10}]});await page.waitForTimeout(20)}
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(200);
  }
  let start=await page.evaluate(()=>scrollY);const seen=new Set<number>();
  for(let i=0;i<7;i++){
   await swipe(true);const geometry=await stage.evaluate(el=>({top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,view:el.querySelector('.steps__view')!.getBoundingClientRect().top,transform:getComputedStyle(el.querySelector('.steps__view')!).transform}));
   if(geometry.top<0&&geometry.bottom>size.height){expect(Math.abs(geometry.view)).toBeLessThan(2);expect(geometry.transform).toBe('none')}
   const current=await items.evaluateAll(els=>els.findIndex(el=>el.getAttribute('data-current')==='true'));if(current>=0)seen.add(current);
  }
  const end=await page.evaluate(()=>scrollY);expect(end).toBeGreaterThan(start+size.height);expect(seen.has(1)).toBe(true);expect(seen.has(3)).toBe(true);
  await swipe(false);await swipe(false);expect(await page.evaluate(()=>scrollY)).toBeLessThan(end-100);
  expect(errors).toEqual([]);await context.close();
 });
}
