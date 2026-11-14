import { test, expect } from '@playwright/test';
for (const viewport of [{width:390,height:500},{width:390,height:850},{width:1280,height:850}]) {
 test(`hero link plays first card in sequence ${viewport.width}x${viewport.height}`, async ({page}) => {
   await page.setViewportSize(viewport);
   await page.addInitScript(() => localStorage.setItem('sm-motion-preference','on'));
   const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('/home-preview/');
   await page.evaluate(() => { const e=document.querySelector('.path-sequence')!; (window as any).pathSamples=[];new MutationObserver(()=>{const s=(e as HTMLElement).style;const v=['--preview-upper','--preview-band','--preview-lower'].map(k=>parseFloat(s.getPropertyValue(k)));if(v.every(Number.isFinite))(window as any).pathSamples.push(v)}).observe(e,{attributes:true,attributeFilter:['style']}); });
   await page.locator('.hero-path-link').focus();await page.keyboard.press('Enter');
   const seq=page.locator('.path-sequence');
   await expect(seq).toHaveClass(/is-hero-preview/);
   await expect(seq).not.toHaveClass(/is-hero-preview/,{timeout:20000});
   const samples:number[][]=await page.evaluate(()=>(window as any).pathSamples);
   expect(samples.some(([u,b,l])=>u>0&&u<1&&b===0&&l===0)).toBeTruthy();
   expect(samples.some(([u,b,l])=>u===1&&b>0&&b<1&&l===0)).toBeTruthy();
   expect(samples.some(([u,b,l])=>u===1&&b===1&&l>0&&l<1)).toBeTruthy();
   const first=page.locator('.path-card').first();await expect(first).toHaveClass(/is-active/);await expect(first).toHaveClass(/is-settled/);
   expect(Number(await first.evaluate(e=>(e as HTMLElement).style.getPropertyValue('--card-in')))).toBe(1);
   await expect(page.locator('.path-mini-card').first()).toHaveAttribute('aria-current','true');
   expect(new URL(page.url()).hash).toBe('#path-section');
   expect(errors).toEqual([]);
 });
}
test('reduced motion jumps to settled first card, and manual input cancels playback',async({page})=>{
 await page.setViewportSize({width:390,height:850});await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));await page.goto('/home-preview/');
 await page.locator('.hero-path-link').focus();await page.keyboard.press('Enter');await expect(page.locator('.path-card').first()).toHaveClass(/is-settled/);await expect(page.locator('.path-sequence')).not.toHaveClass(/is-hero-preview/);
 await page.evaluate(()=>{(window as any).setDraftMotion('on');window.scrollTo({top:0,behavior:'instant'})});await page.locator('.hero-path-link').focus();await page.keyboard.press('Enter');await expect(page.locator('.path-sequence')).toHaveClass(/is-hero-preview/);await page.mouse.wheel(0,120);await expect(page.locator('.path-sequence')).not.toHaveClass(/is-hero-preview/);
});
