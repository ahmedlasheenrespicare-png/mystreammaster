(()=>{
'use strict';
const plans=window.smCartCatalog;if(!Array.isArray(plans))return;
const key='stream-master-cart', currencyKey='sm-reference-currency';
const currencies={USD:'$',SAR:'ر.س',EGP:'ج.م',AED:'د.إ',KWD:'د.ك'};
const select=document.querySelector('#sm-currency'), dialog=document.querySelector('#sm-cart-dialog'), list=document.querySelector('#sm-cart-list'), count=document.querySelector('#sm-cart-count'), total=document.querySelector('.sm-cart-total'), checkout=document.querySelector('.sm-cart-checkout'), clear=document.querySelector('.sm-cart-clear');
let memory=[],savedCurrency='USD';try{savedCurrency=localStorage.getItem(currencyKey)||'USD'}catch{}select.value=currencies[savedCurrency]?savedCurrency:'USD';
function read(){try{const x=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(x)?x:[]}catch{return memory}}
function save(items){memory=items;try{localStorage.setItem(key,JSON.stringify(items))}catch{}window.dispatchEvent(new CustomEvent('cart-updated'));render()}
function planOf(item){return plans.find(p=>p.id===item?.plan?.id||item?.id===p.serverCode+'-12m')}
function expanded(){return read().flatMap(item=>{const plan=planOf(item);if(!plan)return [];const n=item.plan?1:Math.min(20,Math.max(1,Number(item.quantity)||1));return Array.from({length:n},()=>({item,plan}))})}
function money(value){return new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(value)+' '+(document.documentElement.dataset.referenceLanguage==='en'&&select.value!=='USD'?select.value:currencies[select.value])}
function renderPrices(){for(const p of plans){const text=money(p.prices['12'][select.value]);document.querySelectorAll(`[data-server-field="${p.serverCode}.price"], [data-path-field="${p.serverCode}.price"]`).forEach(el=>el.textContent=text);const i=plans.indexOf(p);const el=document.querySelector(`.league-carousel-item[data-index="${i}"] .price`);if(el){el.textContent=text+' ';const small=document.createElement('small');small.textContent='/ سنة';el.append(small)}}}
function newItem(plan){return {id:plan.id+'-12-'+Date.now()+'-'+Math.random().toString(36).slice(2),plan:{id:plan.id},months:'12',price:plan.prices['12'][select.value],currency:select.value}}
function changeQuantity(plan,change){const entries=read();if(change>0){if(entries.length>=100||expanded().length>=100)return;entries.push(newItem(plan))}else{const index=entries.findIndex(entry=>planOf(entry)?.id===plan.id);if(index<0)return;const item=entries[index];if(!item.plan&&Number(item.quantity)>1)item.quantity=Number(item.quantity)-1;else entries.splice(index,1)}save(entries)}
function render(){const en=document.documentElement.dataset.referenceLanguage==='en';const names={nova:'Nova Server',istar:'iStar Pro Server',moka:'Moka Server',x:'XTV Server'};const items=expanded();count.textContent=items.length;list.replaceChildren();let sum=0;const lines=[];
if(!items.length){const p=document.createElement('p');p.className='sm-cart-empty';p.textContent='السلة فارغة حالياً. اختر سيرفراً وأضفه للسلة.';list.append(p)}
const groups=new Map();items.forEach(({plan})=>groups.set(plan.id,{plan,quantity:(groups.get(plan.id)?.quantity||0)+1}));
for(const {plan,quantity} of groups.values()){
 const price=plan.prices['12'][select.value];sum+=price*quantity;lines.push(`${lines.length+1}. ${en?names[plan.serverCode]:plan.serverName} — ${en?'1 year':'سنة'} — ${quantity} × ${money(price)} = ${money(price*quantity)}`);
 const row=document.createElement('div');row.className='sm-cart-item';
 const text=document.createElement('div');text.className='sm-cart-item-info';const name=document.createElement('strong');name.textContent=plan.serverName;const detail=document.createElement('p');detail.textContent=`سنة · ${money(price)} لكل اشتراك`;text.append(name,detail);
 const controls=document.createElement('div');controls.className='sm-cart-item-controls';const quantityBox=document.createElement('div');quantityBox.className='sm-cart-quantity';quantityBox.setAttribute('aria-label','كمية '+plan.serverName);
 const minus=document.createElement('button');minus.type='button';minus.textContent='−';minus.setAttribute('aria-label','تقليل كمية '+plan.serverName);minus.disabled=quantity<=1;minus.onclick=()=>{changeQuantity(plan,-1);list.querySelector(`[data-plan="${plan.serverCode}"] .sm-cart-minus`)?.focus()};minus.className='sm-cart-minus';
 const number=document.createElement('span');number.className='sm-cart-quantity-value';number.textContent=String(quantity);number.setAttribute('aria-label','الكمية '+quantity);
 const plus=document.createElement('button');plus.type='button';plus.className='sm-cart-plus';plus.textContent='+';plus.setAttribute('aria-label','زيادة كمية '+plan.serverName);plus.disabled=read().length>=100||items.length>=100;plus.onclick=()=>{changeQuantity(plan,1);list.querySelector(`[data-plan="${plan.serverCode}"] .sm-cart-plus`)?.focus()};
 const remove=document.createElement('button');remove.type='button';remove.className='sm-cart-remove';remove.textContent='حذف';remove.setAttribute('aria-label','حذف '+plan.serverName+' من السلة');remove.onclick=()=>save(read().filter(item=>planOf(item)?.id!==plan.id));
 row.dataset.plan=plan.serverCode;quantityBox.append(minus,number,plus);controls.append(quantityBox,remove);row.append(text,controls);list.append(row);
}
total.textContent='الإجمالي: '+money(sum);clear.hidden=!items.length;checkout.hidden=!items.length;checkout.href='https://wa.me/201090415657?text='+encodeURIComponent(en?'Hello Stream Master, I would like to order the following technical activation plans:\n\n'+lines.join('\n')+'\n\nEstimated total: '+money(sum)+'\nPlease confirm the price and payment details.':'مرحبًا ستريم ماستر، أود إتمام طلب باقات التفعيل التقني التالية:\n\n'+lines.join('\n')+'\n\nالإجمالي التقريبي: '+money(sum)+'\nأرجو تأكيد السعر وبيانات الدفع.');}
select.addEventListener('change',()=>{try{localStorage.setItem(currencyKey,select.value)}catch{}renderPrices();render()});
document.querySelector('.sm-cart-open').onclick=()=>{render();dialog.showModal()};document.querySelector('.sm-cart-close').onclick=()=>dialog.close();dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});clear.onclick=()=>save(read().filter(item=>!planOf(item)));
window.addEventListener('storage',e=>{if(e.key===key)render();if(e.key===currencyKey&&currencies[e.newValue]){select.value=e.newValue;renderPrices();render()}});
const cards=document.querySelectorAll('.league-carousel-item');cards.forEach((card,i)=>{const plan=plans[i];if(!plan)return;const button=document.createElement('button');button.type='button';button.className='sm-cart-add';button.tabIndex=card.dataset.ringPos==='front'?0:-1;button.textContent='أضف إلى السلة';button.onclick=()=>{const items=read();if(items.length>=100)return;if(expanded().length>=100)return;items.push(newItem(plan));save(items);dialog.showModal()};card.querySelector('.actions')?.append(button)});
window.addEventListener('sm-reference-language-change',()=>{renderPrices();render()});
renderPrices();render();
})();
