(()=>{
'use strict';
const button=document.querySelector('#sm-language');if(!button)return;
const key='sm-reference-language', frames=new Map(), originals=new WeakMap(), attributeOriginals=new WeakMap();const staticEnglish=document.documentElement.dataset.referenceLanguagePage==='en';let english=staticEnglish, dictionary=null, loading=null;
const rootURL=new URL('./reference-en.json',document.currentScript.src);rootURL.search=new URL(document.currentScript.src).search;
function translate(s){
 const trimmed=s.trim();if(!trimmed)return s;
 let t=dictionary?.[trimmed]??dictionary?.[trimmed.replace(/\s+/g,' ')];
 const term=value=>dictionary?.[value.trim()]||value.trim();
 if(!t){t=trimmed
  .replace(/^موسم (\d+) · (.+)$/, (_,year,phase)=>'Season '+year+' · '+term(phase))
  .replace(/^([^·]+) · (.+)$/, (whole,label,rest)=>dictionary?.[label.trim()] ? term(label)+' · '+rest : whole)
  .replace(/^الإجمالي:\s*/, 'Total: ')
  .replace(/^سنة · (.+) لكل اشتراك$/, '1 year · $1 per subscription')
  .replace(/^الكمية (\d+)$/, 'Quantity $1')
  .replace(/^حذف (.+) من السلة$/, (_,name)=>'Remove '+term(name)+' from cart')
  .replace(/^زيادة كمية (.+)$/, (_,name)=>'Increase quantity of '+term(name))
  .replace(/^تقليل كمية (.+)$/, (_,name)=>'Decrease quantity of '+term(name))
  .replace(/^كمية (.+)$/, (_,name)=>'Quantity of '+term(name))
  .replace(/^فرز حسب (.+)$/, (_,name)=>'Sort by '+term(name))
  .replace(/^عرض إحصائيات (.+)$/, (_,name)=>'Show statistics for '+term(name))
  .replace(/^العودة إلى واجهة بطاقة (.+)$/, (_,name)=>'Back to '+term(name)+' card')
  .replace(/^شعار (.+)$/, (_,name)=>term(name)+' logo')
  .replace(/^إحصائيات (.+)$/, (_,name)=>term(name)+' statistics')
  .replace(/^مباريات (.+)$/, (_,name)=>term(name)+' matches')
  .replace(/^جدول ترتيب (.+)$/, (_,name)=>term(name)+' standings')
  .replace(/^المفضلة \((\d+)\)$/, 'Favourites ($1)')
  .replace(/^الأخيرة \((\d+)\)$/, 'Recent ($1)')
  .replace(/^ملف قنوات: (.+)$/, 'Channel file: $1')
  .replace(/^تم تحميل الملف «(.+)» — (\d+) تصنيف و (\d+) قناة$/, 'Loaded file “$1” — $2 categories and $3 channels')
  .replace(/^تشغيل: (.+)$/, 'Playing: $1')
  .replace(/^إزالة (.+) من المفضلة$/, 'Remove $1 from favourites')
  .replace(/^إضافة (.+) إلى المفضلة$/, 'Add $1 to favourites')
  .replace(/^(\d+) قناة معروضة$/, '$1 channels shown')
  .replace(/^قناة متاحة في باقتك$/, 'channels available in your playlist')
  .replace(/^شاشة (\d+) — اضغط قناة لتشغيلها هنا$/, 'Screen $1 — choose a channel to play here')
  .replace(/^لا نتائج للبحث "(.+)" — جرّب كلمة أخرى أو ابحث بلا همزات\.$/, 'No results for "$1". Try another search.')
  .replace(/^([\d.,٠-٩٫٬]+) نقطة$/, '$1 points')
  .replace(/^([\d.,٠-٩٫٬]+) هدف\/مباراة$/, '$1 goals/match')
  .replace(/^([\d.,٠-٩٫٬]+) هدف[ًاا]*$/, '$1 goals');
  if(t===trimmed)return s;
  if(/(?:points|goals|goals\/match)$/.test(t))t=t.replace(/[٠-٩]/g,n=>'٠١٢٣٤٥٦٧٨٩'.indexOf(n)).replace(/٫/g,'.').replace(/٬/g,',');
 }
 return s.replace(trimmed,t);
}
function excluded(node){if(node.nodeType!==1&&node.nodeType!==3)return true;const parent=node.nodeType===3?node.parentElement:node;return !parent||!!parent.closest('script,style,noscript,svg,.source-cards,.team-cell bdi,.sm-crab39,.sm-welcome-mark,.footer-background-brand,#sm-language');}
function applyNode(node){if(excluded(node))return;if(node.nodeType===3){if(english){const before=node.nodeValue,after=translate(before);if(before!==after){originals.set(node,before);node.nodeValue=after}}else if(originals.has(node)){node.nodeValue=originals.get(node);originals.delete(node)}return}if(node.nodeType!==1)return;
 for(const attr of ['aria-label','title','placeholder','alt','data-accent']){if(!node.hasAttribute(attr))continue;const value=node.getAttribute(attr);let attrs=attributeOriginals.get(node);if(english){const converted=translate(value);if(converted!==value){if(!attrs){attrs={};attributeOriginals.set(node,attrs)}attrs[attr]=value;node.setAttribute(attr,converted)}}else if(attrs&&attrs[attr]!=null){node.setAttribute(attr,attrs[attr]);delete attrs[attr]}}
 for(const child of node.childNodes)applyNode(child)}
function applyDoc(doc){if(!doc?.body)return;doc.documentElement.lang=english?'en':'ar';doc.documentElement.dataset.referenceLanguage=english?'en':'ar';applyNode(doc.body)}
function watch(doc){if(!doc?.body||frames.has(doc))return;const observer=new MutationObserver(records=>{if(!english)return;for(const record of records){if(record.type==='characterData'||record.type==='attributes')applyNode(record.target);else for(const node of record.addedNodes)applyNode(node)}});observer.observe(doc.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','placeholder','alt','data-accent']});frames.set(doc,observer);applyDoc(doc)}
function refresh(){button.textContent=english?'العربية':'EN';button.setAttribute('aria-label',english?'التبديل إلى العربية':'Switch to English');button.setAttribute('lang',english?'ar':'en');for(const doc of frames.keys())applyDoc(doc);window.dispatchEvent(new Event('sm-reference-language-change'))}
async function setLanguage(en){if(en&&!dictionary){loading??=fetch(rootURL).then(r=>{if(!r.ok)throw Error('Translations unavailable');return r.json()});try{dictionary=await loading}catch{loading=null;button.textContent='EN';return}}english=en;try{localStorage.setItem(key,en?'en':'ar')}catch{}refresh()}
button.addEventListener('click',event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();if(staticEnglish){try{localStorage.setItem(key,'ar')}catch{}location.assign('/home-preview/saved-reference/');return}setLanguage(!english)});watch(document);
document.querySelectorAll('#m3u-player iframe,#explore-world').forEach(iframe=>{let previous=null;const attach=()=>{try{const doc=iframe.contentDocument;if(previous&&previous!==doc){frames.get(previous)?.disconnect();frames.delete(previous)}previous=doc;watch(doc)}catch{}};iframe.addEventListener('load',attach);attach()});
try{if(staticEnglish||localStorage.getItem(key)==='en')setLanguage(true)}catch{}
})();
