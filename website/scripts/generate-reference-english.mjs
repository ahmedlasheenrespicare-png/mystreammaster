import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Build a separately addressable English preview from the approved Arabic source.
// Script/style contents are kept intact; runtime-only data is localized in the browser.
// Both previews remain noindex until a deliberate production migration.
const defaultReference = fileURLToPath(new URL('../../home-preview/saved-reference/', import.meta.url));
const escapeHtml = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function translateText(text, translations) {
  const trimmed=text.trim();
  if(!trimmed) return text;
  const translated=translations[trimmed] ?? translations[trimmed.replace(/&nbsp;|&#160;|&#x0*a0;/gi,' ').replace(/\s+/g,' ')];
  return translated ? text.replace(trimmed,escapeHtml(translated)) : text;
}
export function renderReferenceEnglish(source,translations) {
  let html=source;
  // Keep the page's own fragments relative to /en/ while resolving shared assets to the source.
  html=html.replaceAll('./assets/','/home-preview/saved-reference/assets/');
  const tokens=html.match(/<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>|<noscript\b[^>]*>[\s\S]*?<\/noscript\s*>|<!--[\s\S]*?-->|<![^>]*>|<\/?[A-Za-z][^>]*>|[^<]+|</gi) || [];
  let svgDepth=0;
  html=tokens.map(token=>{
    if(/^<(script|style|noscript)\b|^<!--|^<!/i.test(token))return token;
    if(/^<svg\b/i.test(token))svgDepth++;
    if(/^<\/svg\s*>/i.test(token)){svgDepth--;return token}
    if(token.startsWith('<')){
      if(svgDepth)return token;
      return token.replace(/\blang="ar"/gi,'lang="en"').replace(/\b(aria-label|title|placeholder|alt|data-accent)="([^"]*)"/gi,(full,attribute,value)=>{
        const translated=translations[value];return translated?`${attribute}="${escapeHtml(translated).replaceAll('"','&quot;')}"`:full;
      });
    }
    return svgDepth?token:translateText(token,translations);
  }).join('');
  html=html.replace('<html lang="en"','<html lang="en" data-reference-language-page="en" data-reference-language="en"');
  html=html.replace(/<h([1-6])\b[^>]*>[\s\S]*?<\/h\1>/gi, heading=>heading.replace(/<\/span><span/g,'</span> <span'));
  html=html.replace('<a href="/home-preview/saved-reference/en/" id="sm-language" aria-label="Switch to English" lang="en">EN</a>', '<a href="/home-preview/saved-reference/" id="sm-language" aria-label="التبديل إلى العربية" lang="ar">العربية</a>');
  html=html.replace('<title>ستريم ماستر — معاينة التصميم</title>','<title>Stream Master — English design preview</title>');
  html=html.replace('<meta name="description" content="معاينة مستقلة لتصميم ستريم ماستر قيد التطوير.">','<meta name="description" content="English design preview of Stream Master, under development.">');
  return html;
}
export async function generateReferenceEnglish(reference=defaultReference) {
  const source=await fs.readFile(path.join(reference,'index.html'),'utf8');
  const translations=JSON.parse(await fs.readFile(path.join(reference,'assets/reference-en.json'),'utf8'));
  const target=path.join(reference,'en/index.html');
  await fs.mkdir(path.dirname(target),{recursive:true});
  await fs.writeFile(target,renderReferenceEnglish(source,translations));
  return target;
}
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) console.log(`Generated ${await generateReferenceEnglish()}`);
