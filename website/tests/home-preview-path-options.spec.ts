import {test,expect} from '@playwright/test';
for(const viewport of [{width:390,height:500},{width:390,height:850},{width:1280,height:850}]){
 test(`locked entry design displays three centered cards ${viewport.width}x${viewport.height}`,async({page})=>{
  await page.setViewportSize(viewport);await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));await page.goto('/home-preview/');
  await expect(page.locator('.path-entrance-options')).toHaveCount(0);await page.locator('.path-sequence').evaluate(el=>window.scrollTo({top:scrollY+el.getBoundingClientRect().top+80,behavior:'instant'}));
  const layer=page.locator('.path-demo-layer');await expect(layer).toHaveClass(/is-done/);await expect(layer).toHaveAttribute('data-entrance-design','3');await expect(layer).toHaveAttribute('data-locked-motion','2');
  const boxes=await page.locator('.path-demo-unit').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));const stage=await page.locator('.path-stage').boundingBox();expect(boxes).toHaveLength(3);expect(boxes[0].x).toBeGreaterThan(boxes[1].x);expect(boxes[1].x).toBeGreaterThan(boxes[2].x);expect(Math.abs((boxes[0].right+boxes[2].left)/2-(stage!.x+stage!.width/2))).toBeLessThan(2);
 });
}
test('hero button retains first-card entry; scrolling plays three-card entry with aligned pieces',async({page})=>{
 await page.setViewportSize({width:390,height:850});await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));await page.goto('/home-preview/');
 await page.locator('.hero-path-link').focus();await page.keyboard.press('Enter');await expect(page.locator('.path-sequence')).toHaveClass(/is-hero-preview/);await expect(page.locator('.path-demo-layer')).toBeHidden();await expect(page.locator('.path-sequence')).not.toHaveClass(/is-hero-preview/,{timeout:20000});await expect(page.locator('.path-card').first()).toHaveClass(/is-settled/);await expect(page.locator('.path-demo-layer')).toBeHidden();
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(300);await page.locator('.path-sequence').evaluate(el=>window.scrollTo({top:scrollY+el.getBoundingClientRect().top+80,behavior:'instant'}));const layer=page.locator('.path-demo-layer');await expect(layer).toBeVisible();await expect(layer).toHaveClass(/is-done/,{timeout:30000});await expect(layer).toHaveAttribute('data-entrance-design','3');
 for(const unit of await page.locator('.path-demo-unit').all()){
  const d=await unit.evaluate(el=>{const u=el as HTMLElement,c=u.querySelector('.path-card.is-active') as HTMLElement,b=c.querySelector('.path-gap-backdrop') as HTMLElement,cta=u.querySelector('.path-demo-cta') as HTMLElement;return {w:u.offsetWidth,h:u.offsetHeight,clip:cta.style.clipPath,band:getComputedStyle(b).transform,button:getComputedStyle(cta).transform,rect:c.getBoundingClientRect().toJSON(),ctaRect:cta.getBoundingClientRect().toJSON()}});const points=[...d.clip.matchAll(/([\d.]+)px/g)].map(m=>Number(m[1]));expect(Math.abs(points[0]-(.75*d.h-.1443375673*d.w))).toBeLessThan(.01);expect(Math.abs(points[1]-(.75*d.w-.4330127019*d.h))).toBeLessThan(.01);expect(['none','matrix(1, 0, 0, 1, 0, 0)']).toContain(d.band);expect(['none','matrix(1, 0, 0, 1, 0, 0)']).toContain(d.button);expect(Math.abs(d.rect.x-d.ctaRect.x)).toBeLessThan(.1);
 }
});
