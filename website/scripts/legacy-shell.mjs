import { HOME_SECTIONS, NAV_GROUPS, SERVER_PAGES } from '../src/navigation.mjs';

/* هيدر الصفحات القديمة — يُبنى من نفس خريطة التنقل التي يستخدمها هيدر React
   (src/navigation.mjs)، فتظهر كل صفحات الموقع وأقسام الرئيسية في القوائم المنسدلة. */
const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const page = (href) => `/${href}`;
const section = (id) => `/#${id}`;
const chevron = '<svg class="sm-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const item = (href, label, desc = '', icon = '') =>
  `<a class="sm-dd-link" href="${esc(href)}">${icon ? `<span class="sm-dd-icon" aria-hidden="true">${icon}</span>` : ''}<span><b>${esc(label)}</b>${desc ? `<small>${esc(desc)}</small>` : ''}</span></a>`;

function desktopPanel(group) {
  if (group.key === 'home') {
    return `<div class="sm-dd-grid sm-dd-grid-3">${HOME_SECTIONS.map(s => item(section(s.id), s.label, s.desc, s.icon)).join('')}</div>`
      + `<div class="sm-dd-foot"><a href="/">الصفحة الرئيسية — العودة للأعلى</a><a class="sm-dd-pill" href="/?trial=1">تجربة مجانية ↗</a></div>`;
  }
  if (group.key === 'servers') {
    return `<div class="sm-dd-cards">${SERVER_PAGES.map(s => `<a class="sm-dd-card sm-card-${s.code}" href="${page(`${s.code}/`)}"><span class="sm-dd-card-art" aria-hidden="true">${s.emoji}</span><b>${esc(s.label)}</b><small>${esc(s.desc)}</small></a>`).join('')}</div>`
      + `<div class="sm-dd-grid sm-dd-grid-3">${group.links.map(l => item(page(l.href), l.label, l.desc)).join('')}</div>`
      + `<div class="sm-dd-foot"><span>سيرفرات مزودين عالية الثبات — تفعيل ودعم فوري خلال 5 دقائق</span><a class="sm-dd-pill" href="/#pricing">عرض الأسعار ↗</a></div>`;
  }
  return `<div class="sm-dd-grid">${group.links.map(l => item(page(l.href), l.label, l.desc)).join('')}</div>`
    + (group.legal ? `<div class="sm-dd-legal">${group.legal.map(l => `<a href="${page(l.href)}">${esc(l.label)}</a>`).join('')}</div>` : '');
}

function mobileLinks(group) {
  if (group.key === 'home') return [['/', 'الصفحة الرئيسية'], ...HOME_SECTIONS.map(s => [section(s.id), s.label])];
  if (group.key === 'servers') return [[page(group.links[0].href), group.links[0].label], ...SERVER_PAGES.map(s => [page(`${s.code}/`), s.label]), ...group.links.slice(1).map(l => [page(l.href), l.label])];
  return [...group.links, ...(group.legal || [])].map(l => [page(l.href), l.label]);
}

const desktopNav = NAV_GROUPS.map(g => `<div class="sm-dd" data-group="${g.key}" data-match="${esc(g.match.join(' '))}"><button type="button" class="sm-dd-btn" id="sm-dd-btn-${g.key}" aria-expanded="false" aria-controls="sm-dd-${g.key}">${esc(g.label)}${chevron}</button><div class="sm-dd-panel sm-dd-${g.key}" id="sm-dd-${g.key}"><div class="sm-dd-box">${desktopPanel(g)}</div></div></div>`).join('');
const mobileNav = NAV_GROUPS.map(g => `<details class="sm-acc" data-group="${g.key}" data-match="${esc(g.match.join(' '))}"><summary>${esc(g.label)}${chevron}</summary>${mobileLinks(g).map(([href, label]) => `<a href="${esc(href)}">${esc(label)}</a>`).join('')}</details>`).join('');

export const header = `<a class="sm-skip" href="#main-content">تخطي إلى المحتوى</a>
<div class="sm-announcement">ستريم ماستر برو — <strong>اشتراك واحد، ترفيه بلا حدود</strong><a href="/?trial=1">اطلب تجربتك المجانية ←</a></div>
<header class="sm-header"><nav aria-label="القائمة الرئيسية" class="sm-nav">
<a class="sm-brand" href="/"><span class="sm-mark">▶</span><span>ستريم ماستر<small>STREAM MASTER PRO</small></span></a>
<div class="sm-desktop">${desktopNav}</div>
<div class="sm-actions"><a class="sm-cart" href="/cart/" aria-label="سلة المشتريات"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M2 3h3l3 13h11l3-10H6"/><circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/></svg><span data-sm-cart-count>0</span></a><a class="sm-cta" href="/?trial=1">تجربة مجانية ↗</a><button class="sm-menu-toggle" aria-label="فتح القائمة" aria-controls="sm-mobile-nav" aria-expanded="false">☰</button></div>
</nav><div id="sm-mobile-nav" class="sm-mobile" hidden>${mobileNav}</div></header>`;

export const footer = `<footer class="sm-footer"><div class="sm-footer-top"><div><a class="sm-brand" href="/"><span class="sm-mark">▶</span><span>ستريم ماستر<small>STREAM MASTER PRO</small></span></a><p>المنصة التقنية لخدمات الربط والدعم الفني.<br>سيرفرات المزودين (نوفا وإيستار وموكا) — تفعيل سريع ودعم متواصل.</p><a class="sm-cta" href="https://wa.me/201098950879" target="_blank" rel="noopener noreferrer">تواصل عبر واتساب ↗</a></div><div><h2>اكتشف أكثر</h2><a href="/store/">الباقات والأسعار</a><a href="/servers/">مقارنة السيرفرات</a><a href="/channels/">مكتبة القنوات</a><a href="/blog/">مقالات ودلائل</a><a href="/world-cup-2026/">كأس العالم 2026</a><a href="/predictions/">توقعات المباريات</a></div><div><h2>نحن هنا لمساعدتك</h2><a href="/about/">من نحن</a><a href="/faq/">الأسئلة الشائعة</a><a href="/status/">حالة الخدمة</a><a href="/privacy/">سياسة الخصوصية</a><a href="/terms/">شروط الاستخدام</a><a href="/refund/">سياسة الاسترجاع</a><a href="/watch-legal.html">المشاهدة القانونية</a></div></div><div class="sm-wordmark" aria-hidden="true">ستريم ماستر®</div><div class="sm-footer-disclaimer" style="margin:20px 0 8px;padding:16px 20px;border:1px solid rgba(255,255,255,0.12);border-radius:16px;background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.6);font-size:12.5px;line-height:1.9"><strong style="display:block;color:#d8ff3e;margin-bottom:4px">⚠️ إخلاء مسؤولية قانوني وسياسة الملكية الفكرية (DMCA):</strong>يعمل موقع <strong style="color:rgba(255,255,255,0.85)">ستريم ماستر برو (Stream Master Pro)</strong> كوسيط تقني ودليل فهرسة فقط، ولا يقوم باستضافة أو تخزين أو رفع أو بث أي ملفات وسائط أو قنوات مرئية على خوادمه الخاصة. كافة العلامات التجارية المذكورة مملوكة لأصحابها الشرعيين، ويتحمل المستخدم وحده مسؤولية استخدامه للخدمة والامتثال للقوانين المحلية في بلده. للإبلاغ عن أي انتهاك لحقوق الطبع والنشر (DMCA) وطلب حذف الروابط خلال 24–72 ساعة، يرجى مراسلتنا عبر البريد الرسمي: <a href="mailto:support@streammasterstore.com" dir="ltr" style="color:#fff;text-decoration:underline">support@streammasterstore.com</a> أو مراجعة <a href="/terms/" style="color:#fff;text-decoration:underline">وثيقة الشروط وسياسة DMCA</a>.</div><div class="sm-footer-bottom"><span>© ${new Date().getUTCFullYear()} ستريم ماستر برو — جميع الحقوق محفوظة.</span><a href="#main-content">الرجوع للأعلى ↑</a></div></footer>`;
