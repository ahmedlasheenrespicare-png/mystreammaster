import { useEffect, useRef, useState } from 'react';
import { HOME_SECTIONS, NAV_GROUPS, homeSectionPath } from '../navigation.mjs';
import { HEADER_GROUPS } from '../header-floorplan.mjs';
import { counterpartHref } from '../i18n';
import { CURRENCIES } from '../data';
import './header-brand-crab39.css';
import { motionReduced } from '../lib/motion-preference';

type Link = { label: string; href: string };
const englishGroups: { title: string; links: Link[] }[] = [
  { title: 'Discover', links: [{ label: 'About Stream Master', href: '/en/#about' }, { label: 'Sports and leagues', href: '/en/#services' }, { label: 'Movies and series', href: '/en/#cinema-library' }] },
  { title: 'Start watching', links: [{ label: 'Choose your path', href: '/en/#path-section' }, { label: 'Choose your server', href: '/en/#works' }, { label: 'Simple steps', href: '/en/#journey' }] },
  { title: 'Help and more', links: [{ label: 'Customer reviews', href: '/en/#reviews' }, { label: 'FAQs', href: '/en/faq/' }, { label: 'Articles', href: '/blog/' }, { label: 'Contact us', href: '/en/#contact' }] },
];
const servers = [{ label: 'نوفا', href: '/nova/' }, { label: 'إيستار', href: '/istar/' }, { label: 'موكا', href: '/moka/' }, { label: 'X', href: '/x/' }];
const num = ['①', '②', '③', '④'];

function Logo({ english }: { english: boolean }) {
  return <a className="us-logo" href={english ? '/en/' : '/'} aria-label={english ? 'Stream Master home' : 'ستريم ماستر — الصفحة الرئيسية'}>
    <span className="sm-crab39" dir="rtl" aria-hidden="true"><span className="sm-crab39__row">
      <span className="sm-crab39__word"><span className="sm-crab39__tile"><sup className="sm-crab39__sup">4K</sup><span className="sm-crab39__sym">ست</span></span><span className="sm-crab39__rest">ريم</span></span>
      <span className="sm-crab39__word"><span className="sm-crab39__tile"><sup className="sm-crab39__sup">99</sup><span className="sm-crab39__sym">ما</span></span><span className="sm-crab39__rest">ستر</span></span>
    </span><span className="sm-crab39__sub" dir="ltr">Stream Master Pro</span></span>
  </a>;
}

export function UnifiedHeader({ path = '/', currency = 'USD', cartCount = 0, cartOpen = false, onCurrencyChange, onOpenCart }: {
  path?: string; currency?: string; cartCount?: number; cartOpen?: boolean; onCurrencyChange?: (value: string) => void; onOpenCart?: () => void;
}) {
  const english = path === '/en' || path.startsWith('/en/');
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  useEffect(() => { setOpen(false); }, [path]);
  // Keep the cart control reachable after the drawer closes, without changing scroll position.
  useEffect(() => { if (cartOpen) setHidden(false); }, [cartOpen]);
  useEffect(() => {
    let previous = window.scrollY;
    const scroll = () => { const y = window.scrollY, delta = y - previous; if (y < 80 || open || cartOpen) setHidden(false); else if (Math.abs(delta) >= 5) setHidden(delta > 0); if (Math.abs(delta) >= 5 || y < 80) previous = y; };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape' && open) { setOpen(false); document.querySelector<HTMLButtonElement>('.us-menu-toggle')?.focus(); } };
    window.addEventListener('scroll', scroll, { passive: true }); document.addEventListener('keydown', key);
    return () => { window.removeEventListener('scroll', scroll); document.removeEventListener('keydown', key); };
  }, [open, cartOpen]);
  const direct = english ? [
    {label:'Leagues',href:'/en/#league-strip'}, {label:'Movies and series',href:'/en/#cinema-library'}, {label:'Choose your path',href:'/en/#path-section'}, {label:'Servers',href:'/en/#works'},
  ] : [
    {label:'البطولات',href:'/#league-strip'}, {label:'الأفلام والمسلسلات',href:'/#cinema-library'}, {label:'اختر مسارك',href:'/#path-section'}, {label:'السيرفرات',href:'/#works'},
  ];
  return <header className={`us-header${hidden && !open && !cartOpen ? ' us-scrolled-away' : ''}`} data-unified-shell dir="ltr">
    <div className="us-header-bar"><Logo english={english} />
      {english ? <><nav className="us-numbered" dir="ltr" aria-label="Homepage sections">{direct.map((item,i) => <span key={item.href}>{num[i]} <a href={item.href}>{item.label}</a></span>)}</nav><nav className="us-server-links" dir="rtl" aria-label="Servers">{servers.map((item,i)=><span key={item.href}>{num[i]} <a href={`/en${item.href}`}>{['Nova','iStar','Moka','X'][i]}</a></span>)}</nav></> : <nav className="floor-nav floor-nav--desktop" dir="rtl" aria-label="التنقل الرئيسي"><a className="floor-home" href="/">الرئيسية</a>{HEADER_GROUPS.map(group => <details className="floor-group" key={group.key}><summary>{group.label}</summary><div className="floor-group-links">{group.links.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</div></details>)}</nav>}
      <div className="us-tools" dir="rtl"><a href={counterpartHref(path)} lang={english ? 'ar' : 'en'} aria-label={english ? 'التبديل إلى العربية' : 'Switch to English'}>{english ? 'العربية' : 'EN'}</a>
        <select className="us-currency" aria-label={english ? 'Select currency' : 'اختر العملة'} value={currency} onChange={e => onCurrencyChange?.(e.target.value)}>{['USD','SAR','EGP','AED','KWD'].map(code=><option key={code} value={code}>{code} {CURRENCIES[code].symbol}</option>)}</select>
        {onOpenCart ? <button className="us-cart" type="button" onClick={onOpenCart} aria-label={english ? 'Shopping cart' : 'سلة المشتريات'}>{english ? 'Cart' : 'السلة'} <span data-us-cart-count>{cartCount}</span></button> : <a className="us-cart" href="/cart/" aria-label={english ? 'Shopping cart' : 'سلة المشتريات'}>{english ? 'Cart' : 'السلة'} <span data-us-cart-count>{cartCount}</span></a>}
      </div>
      <button type="button" className="us-menu-toggle" aria-expanded={open} aria-controls="us-menu" aria-label={open ? (english ? 'Close menu' : 'إغلاق القائمة') : (english ? 'Open menu' : 'فتح القائمة')} onClick={() => setOpen(!open)}><span></span><span></span></button>
    </div>
    <noscript><style>{'.us-menu-toggle{display:none!important}.us-noscript{position:relative;background:#f5ece8;color:#280822;padding:12px 24px;max-height:70vh;overflow:auto}.us-noscript a{display:block;padding:8px}.us-noscript summary{cursor:pointer;font-weight:bold}'}</style><details className="us-noscript" dir="rtl"><summary>{english ? 'Navigation' : 'تصفح الموقع'}</summary>{HOME_SECTIONS.map(section => <a href={'/' + homeSectionPath(section.id)} key={section.id}>{section.label}</a>)}{NAV_GROUPS.flatMap(group => [...group.links, ...(group.legal ?? [])]).map(link => <a href={'/' + link.href} key={`${link.href}-${link.label}`}>{link.label}</a>)}</details></noscript>
    <div className="us-menu" id="us-menu" hidden={!open}>
      <div className="us-menu-backdrop" onClick={() => setOpen(false)}></div>
      <nav className="us-menu-panel" dir={english ? 'ltr' : 'rtl'} aria-label={english ? 'Page menu' : 'قائمة أقسام الصفحة'}>
        <p className="us-menu-title">{english ? 'Discover Stream Master' : 'اكتشف ستريم ماستر'} <span>✦</span></p>
        {english ? englishGroups.map(group=><section key={group.title}><h2>{group.title}</h2>{group.links.map(link=><a key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</a>)}</section>) : <nav className="floor-nav floor-nav--mobile" aria-label="أقسام الموقع"><a className="floor-home" href="/">الرئيسية</a>{HEADER_GROUPS.map(group=><details className="floor-group" key={group.key}><summary>{group.label}</summary><div className="floor-group-links">{group.links.map(([label,href])=><a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}</div></details>)}</nav>}
        {english && <details className="us-more"><summary>{english ? 'More pages' : 'صفحات الموقع'}</summary><div><h3>{english ? 'Homepage sections' : 'أقسام الرئيسية'}</h3>{HOME_SECTIONS.map(section=><a href={'/' + homeSectionPath(section.id)} key={section.id}>{section.label}</a>)}</div>{NAV_GROUPS.filter(group => group.key !== 'home').map(group=><div key={group.key}><h3>{group.label}</h3>{group.links.map(link=><a key={link.href} href={'/' + link.href}>{link.label}</a>)}{group.legal?.map(link=><a key={link.href} href={'/' + link.href}>{link.label}</a>)}</div>)}</details>}
      </nav>
    </div>
  </header>;
}

const message = 'مرحبا ستريم مستر ارغب في الاستفسار عن السيرفرات و طلب تجربه مجانيه لبدا المشاهده';
const whatsapp = `https://wa.me/201090415657?text=${encodeURIComponent(message)}`;
export function UnifiedFooter({ english = false, staticPage = false }: { english?: boolean; staticPage?: boolean }) {
  const footer = useRef<HTMLElement>(null);
  useEffect(() => {
    const scene = footer.current?.querySelector<HTMLElement>('.us-contact-scene');
    const nav = footer.current?.querySelector<HTMLElement>('.us-footer-nav');
    if (!scene || !nav) return;
    const entries = Array.from(nav.children) as HTMLElement[];
    let near = true, navNear = true, frame = 0;
    const update = () => {
      frame = 0;
      if (near) {
        const p = Math.max(0, Math.min(1, (innerHeight * .9 - scene.getBoundingClientRect().top) / (innerHeight * .45)));
        const eased = 1 - Math.pow(1 - p, 3);
        scene.style.setProperty('--us-brand-rise', `${(1 - eased) * 70}px`);
        scene.style.setProperty('--us-brand-opacity', String(.03 + eased * .2));
      }
      if (navNear || motionReduced()) {
        const rect = nav.getBoundingClientRect();
        const clamp = (n: number) => Math.max(0, Math.min(1, n));
        const overall = motionReduced() ? 1 : Math.min(clamp((innerHeight * 1.12 - rect.top) / (innerHeight * .84)), clamp(rect.bottom / (innerHeight * .18)));
        entries.forEach((entry, index) => {
          const p = motionReduced() ? 1 : clamp((overall - index * .04) / .8);
          const eased = 1 - Math.pow(1 - p, 3);
          entry.style.setProperty('--us-entry-y', `${(1 - eased) * 70}px`);
          entry.style.setProperty('--us-entry-opacity', String(eased));
        });
      }
    };
    const schedule = () => { if ((near || navNear) && !document.hidden && !frame) frame = requestAnimationFrame(update); };
    const motionChanged = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(observations => { for (const item of observations) { if (item.target === scene) { near = item.isIntersecting; scene.classList.toggle('us-offscreen', !near); } if (item.target === nav) navNear = item.isIntersecting; } schedule(); }, { rootMargin: '300px' }) : null;
    observer?.observe(scene); observer?.observe(nav); window.addEventListener('scroll', schedule, { passive: true }); window.addEventListener('resize', schedule); window.addEventListener('sm-motion-change', motionChanged); document.addEventListener('visibilitychange', schedule); schedule();
    return () => { observer?.disconnect(); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); window.removeEventListener('sm-motion-change', motionChanged); document.removeEventListener('visibilitychange', schedule); if (frame) cancelAnimationFrame(frame); };
  }, []);
  const links = english ? [
    { title:'Explore', items:[['Servers','/en/#works'],['Matches','/matches/'],['Channels','/channels/'],['Articles','/blog/'],['FAQ','/en/faq/']] },
    { title:'Servers', items:[['Nova','/en/nova/'],['iStar','/en/istar/'],['Moka','/en/moka/'],['X','/en/x/'],['Live channels','/channels/']] },
    { title:'About', items:[['About','/about/'],['Service status','/status/'],['Privacy','/privacy/'],['Terms','/terms/'],['Refund policy','/refund/'],['Legal viewing','/watch-legal.html'],['Predictions','/predictions/'],['Search','/search/']] },
    { title:'Matches', items:[['Match schedules','/matches/'],['Leagues','/en/#league-strip']] },
  ] : [
    { title:'استكشف', items:[['السيرفرات','/#works'],['المباريات','/matches/'],['القنوات','/channels/'],['المقالات','/blog/'],['الأسئلة الشائعة','/faq/']] },
    { title:'السيرفرات', items:[['سيرفر نوفا (Nova)','/nova/'],['سيرفر إيستار (iStar)','/istar/'],['سيرفر موكا (Moka)','/moka/'],['سيرفر X (XTV)','/x/'],['البث المباشر','/channels/']] },
    { title:'عن الموقع', items:[['من نحن','/about/'],['تواصل وحالة الخدمة','/status/'],['سياسة الخصوصية','/privacy/'],['شروط الاستخدام','/terms/'],['سياسة الاسترجاع','/refund/'],['المشاهدة القانونية','/watch-legal.html'],['التوقعات','/predictions/'],['البحث','/search/']] },
    { title:'المباريات', items:[['مواعيد المباريات','/matches/'],['عالم البطولات','/#league-strip']] },
  ];
  return <footer ref={footer} className="us-footer" data-unified-footer dir={english ? 'ltr' : 'rtl'}>
    <section className="us-contact"><p className="us-contact-top">{english ? 'From choosing to watching · We are here to help' : 'من الاختيار إلى التشغيل · نحن هنا لمساعدتك'}</p>
      <h2>{english ? <>Let’s start<br/><span>watching</span></> : <>خلّينا نبدأ<br/><span>المشاهدة</span></>}</h2>
      <p className="us-contact-intro">{english ? 'Ask about the servers or request a free trial; our team can help you get started.' : 'استفسر عن السيرفرات أو اطلب تجربتك المجانية، وفريق الدعم يساعدك في خطوات الإعداد.'}</p>
      <div className="us-contact-scene"><div className="us-contact-wordmark" aria-hidden="true">ستريم ماستر<sup>®</sup></div><img className="us-contact-hand" src="/_assets/unified/footer-hand-rose.webp" alt="" width="768" height="1376" loading="lazy" decoding="async"/><div className="us-contact-marquee" aria-hidden="true"><span>{english ? 'GET IN TOUCH ✦ GET IN TOUCH ✦' : 'تواصل معنا ✦ تواصل معنا ✦ تواصل معنا ✦'}</span></div><a href={whatsapp} className="us-contact-circle" target="_blank" rel="noopener noreferrer" aria-label={english ? 'Contact us on WhatsApp' : 'تواصل معنا عبر واتساب'}><svg viewBox="0 0 30 30" fill="none" aria-hidden="true"><path d="M4 6h22v15H4zM4 7l11 8 11-8M17 24h9m-3-3 3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></a></div>
      <img className="us-mountain" src="/_assets/unified/hills-plum.webp" alt="" width="1920" height="640" loading="lazy" decoding="async"/>
    </section>
    <div className="us-footer-content"><nav className="us-footer-nav" aria-label={english ? 'Footer links' : 'روابط التذييل'}>{links.map((group, groupIndex)=><div key={group.title}><h3>{group.title}</h3>{group.items.map(([label,href], index)=><a href={href} key={href}>{groupIndex === 1 && index < 4 && <img src={`/images/brand/${['nova','istar','moka','xtv'][index]}-ticket.webp`} alt="" width={[217,144,296,172][index]} height={[132,72,296,112][index]} loading="lazy" decoding="async"/>}{label}</a>)}</div>)}<div className="us-guarantee"><h3>{english ? 'Support' : 'الضمان والدعم'}</h3><p>♧ {english ? 'Warranty and refund policy' : 'معلومات الضمان وسياسة الاسترجاع'}</p><p>ϟ {english ? 'Activation and setup support' : 'الدعم للتفعيل والإعداد'}</p><p>◷ {english ? 'Contact our support team' : 'التواصل مع فريق الدعم'}</p><a href={`https://wa.me/201090415657?text=${encodeURIComponent('مرحبا ستريم ماستر اريد مساعدتي لتجربه الخدمه')}`} target="_blank" rel="noopener noreferrer">{english ? 'Request a free trial' : 'طلب كود فحص تجريبي'}</a></div></nav>
      <div className="us-footer-legal"><strong>{english ? 'Legal disclaimer' : 'إخلاء مسؤولية قانوني وسياسة الملكية الفكرية:'}</strong><p>{english ? 'Stream Master Pro is a technical intermediary and directory; it does not host, store or broadcast media or channels. Trademarks belong to their owners and users must follow local laws.' : 'يعمل ستريم ماستر برو كوسيط تقني ودليل فهرسة، ولا يستضيف أو يخزن أو يبث ملفات الوسائط أو القنوات. العلامات التجارية لأصحابها، وعلى المستخدم الالتزام بقوانين بلده.'}</p></div>
      {staticPage && <label className="us-motion"><span>حركات الموقع </span><select aria-label="حركات الموقع" defaultValue="on"><option value="auto">حسب إعداد الجهاز</option><option value="on">تشغيل</option><option value="off">إيقاف</option></select></label>}
      <div className="us-footer-copy"><span>© {new Date().getUTCFullYear()} Stream Master Pro</span><span>{english ? 'Technical setup and support' : 'الربط التقني والدعم الفني'}</span></div>
    </div>
  </footer>;
}
