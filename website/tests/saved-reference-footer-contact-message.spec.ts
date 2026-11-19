import {test,expect} from '@playwright/test';
test('footer contact icon opens WhatsApp with the requested inquiry',async({page})=>{
 await page.route('https://**',r=>r.abort());await page.route('**/*.mp4*',r=>r.abort());await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
 const icon=page.locator('.footer-contact-circle'),url=new URL((await icon.getAttribute('href'))!);expect(url.origin+url.pathname).toBe('https://wa.me/201090415657');expect(url.searchParams.get('text')).toBe('مرحبا ستريم مستر ارغب في الاستفسار عن السيرفرات و طلب تجربه مجانيه لبدا المشاهده');await expect(icon).toHaveAttribute('target','_blank');await expect(icon).toHaveAttribute('rel','noopener noreferrer');
});
