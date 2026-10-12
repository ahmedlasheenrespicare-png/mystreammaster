const p="ستريم ماستر برو",d="+201098950879",f={name:p,whatsapp:d},c=f,u="stream-master-cart";
const PRICE_WHITELIST={"nova-12m":{price:25,server:"نوفا",label:"12 شهر",icon:"🚀"},"moka-12m":{price:45,server:"موكا",label:"12 شهر",icon:"☕"},"istar-12m":{price:35,server:"ايستار",label:"12 شهر",icon:"⭐"}};
function validatePrice(id,price){const trusted=PRICE_WHITELIST[id];if(!trusted)return false;if(Math.abs(trusted.price-price)>2){console.warn(`Price tampering ${id}: ${price} vs ${trusted.price}`);return trusted.price;}return price;}
function s(){if(typeof window>"u")return[];try{const t=localStorage.getItem(u);let arr=t?JSON.parse(t):[];arr=arr.map(item=>{const trusted=PRICE_WHITELIST[item.id];if(trusted){const validPrice=validatePrice(item.id,item.price);if(typeof validPrice==='number'&&validPrice!==item.price){return {...item,price:validPrice};}else if(validPrice===false){return null;}}return item;}).filter(Boolean);return arr;}catch{return[]}}
function o(t){if(typeof window>"u")return;localStorage.setItem(u,JSON.stringify(t)),window.dispatchEvent(new CustomEvent("cart-updated"))}
function C(t){const trusted=PRICE_WHITELIST[t.id];if(trusted&&Math.abs(trusted.price-t.price)>2){t.price=trusted.price;t.serverName=trusted.server;t.label=trusted.label;t.serverIcon=trusted.icon;}const n=s(),a=n.findIndex(e=>e.id===t.id);a>=0?n[a].quantity+=1:n.push({...t,quantity:1}),o(n)}
function l(t){const n=s().filter(a=>a.id!==t);o(n)}
function h(t,n){if(n<=0){l(t);return}const a=s().map(e=>e.id===t?{...e,quantity:n}:e);o(a)}
function g(t){return t.reduce((n,a)=>n+a.price*a.quantity,0)}
function $(t){return t.reduce((n,a)=>n+a.quantity,0)}
function y(){o([])}
function w(t){const n=g(t),a=$(t);let e=`🛒 *طلب جديد من موقع ${c.name}*\n\n`;e+=`📋 *تفاصيل الطلب:*\n`;e+=`${"─".repeat(30)}\n`;t.forEach((r,i)=>{const trusted=PRICE_WHITELIST[r.id];const finalPrice=trusted?trusted.price:r.price;e+=`\n${i+1}. ${r.serverIcon||trusted?.icon||'📦'} *${r.serverName||trusted?.server}* - ${r.label||trusted?.label}\n`;e+=`   💰 ${finalPrice} ريال × ${r.quantity} = ${finalPrice*r.quantity} ريال\n`;e+=`   🆔 ${r.id}\n`;});e+=`\n${"─".repeat(30)}\n`;e+=`\n📦 *عدد الباقات:* ${a}`;e+=`\n💵 *الإجمالي:* ${n} ريال\n`;e+=`\n🕒 ${new Date().toLocaleString('ar-SA')}`;e+=`\n🔒 تم التحقق من الأسعار تلقائياً`;e+=`\n\n✅ أرجو تأكيد الطلب وإرسال طريقة الدفع.`;return e;}
function m(t){const validated=t.map(item=>{const trusted=PRICE_WHITELIST[item.id];if(trusted)return {...item,price:trusted.price,serverName:trusted.server,label:trusted.label,serverIcon:trusted.icon};return item;});const n=w(validated),e=`https://wa.me/${c.whatsapp.replace(/\+/g,"").replace(/\s/g,"")}?text=${encodeURIComponent(n)}`;window.open(e,"_blank")}
function I(t){return`$${t}`}
export{C as a,$ as b,y as c,g as d,I as f,s as g,l as r,m as s,h as u};
