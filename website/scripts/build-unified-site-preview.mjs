/* Isolated review page: reuse the approved homepage shell without changing
 * production pages. Run from any directory with Node and website dependencies. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = await fs.readFile(path.join(root, 'home-preview/saved-reference/index.html'), 'utf8');
const $ = load(source);
const base = '/home-preview/saved-reference/';
const nav = $('.nav').first();
const menu = $('.nav__menu').first();
const contact = $('section.sm-contact').first();
const footer = $('footer.sm-footer').first();
const dialog = $('#sm-cart-dialog').first();
if (![nav, menu, contact, footer, dialog].every(element => element.length === 1)) throw new Error('Reference shell components are missing');
// Homepage section links point to the homepage, not to the sample page.
for (const a of [...nav.find('a[href^="#"]').toArray(), ...menu.find('a[href^="#"]').toArray(), ...footer.find('a[href^="#"]').toArray()]) {
  $(a).attr('href', '/' + $(a).attr('href'));
}
nav.find('#sm-language').attr('href', '/en/');
nav.find('.nav__logo a').attr('href', '/');
// Keep the homepage's original cascade order; later reference styles refine
// earlier inline CSS, particularly for the contact scene and footer.
const styles = $('head').children('style, link[rel="stylesheet"]').toArray().map(el => $.html(el)).join('\n');
const rewrite = text => text.replaceAll('./assets/', base + 'assets/');
const head = rewrite(styles);
const body = rewrite([$.html(nav), $.html(menu), `<main id="sample-page" class="unified-sample" dir="rtl"><div class="unified-sample__inner"><p class="unified-sample__eyebrow">معاينة مستقلة · صفحات الموقع</p><nav aria-label="مسار التصفح"><a href="/">الرئيسية</a> / <span>صفحة داخلية</span></nav><h1>تفاصيل الباقات<br><span>بهوية ستريم ماستر</span></h1><p>نموذج لتجربة الهيدر والتذييل وخلفية الصفحات الداخلية مع التصميم المعتمد للرئيسية. محتوى هذه الصفحة للمعاينة فقط.</p><div class="unified-sample__cards"><article><small>اختر الأنسب لك</small><h2>السيرفرات والباقات</h2><p>استعرض الخيارات المتاحة وتأكد من المواصفات قبل الاشتراك.</p><a href="/servers/">استكشف السيرفرات ↗</a></article><article><small>نحن هنا لمساعدتك</small><h2>ابدأ المشاهدة</h2><p>تعرّف على خطوات التشغيل واطلب المساعدة عند الحاجة.</p><a href="/trial/">اطلب تجربة مجانية ↗</a></article><article><small>اكتشف المزيد</small><h2>مقالات ودلائل</h2><p>إرشادات ومعلومات تساعدك في اختيار ما يناسب أجهزتك.</p><a href="/blog/">تصفّح المقالات ↗</a></article></div></div></main>`, '<div class="mountain-footer-reveal">' + $.html(contact) + $.html(footer) + '</div>', $.html(dialog)].join('\n'));
const html = `<!doctype html><html lang="ar" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>معاينة توحيد صفحات الموقع</title>${head}<link rel="stylesheet" href="./preview.css"></head><body dir="ltr">${body}<script src="${base}assets/motion-settings.js"></script><script src="${base}assets/cart-catalog.js"></script><script src="${base}assets/reference-cart.js"></script><script src="${base}assets/contact-footer.js"></script><script src="${base}assets/footer-brand-motion.js"></script><script src="./preview.js"></script></body></html>`;
const target = path.join(root, 'home-preview/unified-site-preview/index.html');
await fs.writeFile(target, html);
console.log(`Generated ${target}`);
