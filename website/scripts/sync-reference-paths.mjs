import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';

// Render canonical pricing values into the no-framework static reference.
// A bundled copy allows the TypeScript data and its extensionless imports to
// be evaluated in Node without introducing a second pricing source.
export async function loadHomepagePlans(website) {
  const result=await build({entryPoints:[path.join(website,'src/data.ts')],bundle:true,write:false,platform:'node',format:'esm',define:{'import.meta.env':'{}'},logLevel:'silent'});
  const source=Buffer.from(result.outputFiles[0].text).toString('base64');
  const {PRICING_PLANS}=await import(`data:text/javascript;base64,${source}`);
  return PRICING_PLANS;
}
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export function applyReferencePlanFields(html,plans) {
  for(const code of ['nova','istar','x']){
    const plan=plans.find(item=>item.serverCode===code);
    if(!plan?.prices?.['12']?.USD || !plan.channelsCount || !plan.quality || !plan.vodCount)throw new Error(`Incomplete homepage plan: ${code}`);
    const fields={price:'$'+plan.prices['12'].USD};
    for(const [field,value] of Object.entries(fields)){
      const pattern=new RegExp(`(<[^>]+data-path-field="${code}\\.${field}"[^>]*>)[^<]*(</[^>]+>)`,'g');
      let count=0;html=html.replace(pattern,(_,start,end)=>{count++;return start+escape(value)+end});
      if(count!==(field==='price'?2:1))throw new Error(`Missing reference path field: ${code}.${field}`);
    }
  }
  const codes=['nova','istar','x'];
  const selected=codes.map(code=>plans.find(item=>item.serverCode===code));
  // General statements must remain true for every path, even if plans diverge.
  function minimumCount(key,unit){
    const values=selected.map(plan=>String(plan[key]).match(/^\s*(\+)?([\d,]+)/));
    if(values.some(value=>!value))return 'تختلف حسب الباقة';
    const minimum=Math.min(...values.map(value=>Number(value[2].replaceAll(',',''))));
    if(!Number.isSafeInteger(minimum))return 'تختلف حسب الباقة';
    const greater=values.every(value=>value[1]);
    return `${greater?'أكثر من':'تبدأ من'} \u2066${minimum.toLocaleString('en-US')}\u2069 ${unit}`;
  }
  // The general section intentionally caps the advertised headline at 4K.
  const qualityOrder=['4K','FHD','HD','SD'];
  const qualities=selected.map(plan=>String(plan.quality).split('/').map(q=>q.trim().toUpperCase()));
  const best=qualityOrder.find(quality=>qualities.some(items=>items.includes(quality)));
  const shared={
    channels:minimumCount('channelsCount','قناة حية'),
    vod:minimumCount('vodCount','فيلم ومسلسل'),
    quality:best?`حتى \u2066${best}\u2069 حسب الباقة`:'تختلف حسب الباقة',
  };
  for(const [field,value] of Object.entries(shared)){
    const pattern=new RegExp(`(<dd\\s+data-path-shared-${field}>)[^<]*(<\\/dd>)`,'g');
    let count=0;html=html.replace(pattern,(_,start,end)=>{count++;return start+escape(value)+end});
    if(count!==1)throw new Error(`Missing shared path field: ${field}`);
  }
  return html;
}
// Keep provider claims clearly attributed to the published specifications,
// while using card-specific wording without altering the homepage source.
const referenceDescription = description => description
  .replace('يُعلن المزود الخارجي لهذا السيرفر', 'تشمل المواصفات المعلنة لهذا السيرفر')
  .replaceAll('المزود الخارجي', 'الجهة المقدّمة')
  .replaceAll('المزود', 'الجهة المقدّمة');
// The server cards and path cards must use the same annual plan values.
export function applyReferenceServerFields(html,plans) {
  for(const code of ['nova','istar','moka','x']){
    const plan=plans.find(item=>item.serverCode===code);
    const channels=plan?.channelsCount?.match(/^[+\d,]+/)?.[0];
    const vod=plan?.vodCount?.match(/^[+\d,]+/)?.[0];
    if(!plan?.prices?.['12']?.USD || !channels || !vod || !plan.quality || !plan.description)throw new Error(`Incomplete homepage server plan: ${code}`);
    const fields={price:'$'+plan.prices['12'].USD,channels,vod,quality:plan.quality,description:referenceDescription(plan.description)};
    for(const [field,value] of Object.entries(fields)){
      const nested=['quality','channels','vod'].includes(field);
      const pattern=nested
        ? new RegExp(`(<dd[^>]+data-server-field="${code}\\.${field}"[^>]*>)[\\s\\S]*?(</dd>)`,'g')
        : new RegExp(`(<[^>]+data-server-field="${code}\\.${field}"[^>]*>)[^<]*(</[^>]+>)`,'g');
      const rendered=field==='quality'
        ? value.split('/').map(part=>part.trim()).filter(Boolean).map(part=>`<span class="sm-server__quality-tag">${escape(part)}</span>`).join('<span class="sm-server__quality-separator"> / </span>')
        : (field==='channels'||field==='vod')
          ? `<span class="sm-server__count" aria-hidden="true">${escape(value)}</span><span class="sm-server__sr-only">${escape(value)}</span>`
          : escape(value);
      if(!rendered)throw new Error(`Empty reference server field: ${code}.${field}`);
      let count=0;html=html.replace(pattern,(_,start,end)=>{count++;return start+rendered+end});
      if(count!==1)throw new Error(`Missing reference server field: ${code}.${field}`);
    }
  }
  return html;
}
export async function syncReferencePaths(website,reference){
  const filename=path.join(reference,'index.html');
  const html=await fs.readFile(filename,'utf8');
  const plans=await loadHomepagePlans(website);
  await fs.writeFile(filename,applyReferenceServerFields(applyReferencePlanFields(html,plans),plans));
}
