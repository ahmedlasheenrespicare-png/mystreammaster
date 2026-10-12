import{g as r,s as y,c as p,f as m,b as x,d as w,u as b,r as E}from"./cart.Di6XXYKZ.js";function h(){const e=r(),s=document.getElementById("cart-empty"),i=document.getElementById("cart-items"),d=document.getElementById("cart-list"),l=document.getElementById("summary-count"),o=document.getElementById("summary-total");if(!s||!i||!d||!l||!o)return;if(e.length===0){s.classList.remove("hidden"),i.classList.add("hidden");return}s.classList.add("hidden"),i.classList.remove("hidden"),d.innerHTML=e.map(t=>`
        <div class="flex flex-wrap items-center gap-4 p-5" data-id="${t.id}">
          <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-red to-red-700 text-3xl shadow-lg">
            ${t.serverIcon}
          </div>
          <div class="flex-1 min-w-[200px]">
            <h3 class="text-lg font-black text-white">${t.serverName}</h3>
            <p class="text-sm text-gray-400">${t.label}</p>
            <p class="num-latin mt-1 text-base font-black text-brand-red-light">${m(t.price)}</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="qty-btn flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white transition-all hover:bg-white/10"
              data-action="decrease"
              aria-label="إنقاص الكمية"
            >−</button>
            <span class="num-latin min-w-[2rem] text-center text-lg font-black text-white">${t.quantity}</span>
            <button
              type="button"
              class="qty-btn flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white transition-all hover:bg-white/10"
              data-action="increase"
              aria-label="زيادة الكمية"
            >+</button>
          </div>
          <button
            type="button"
            class="remove-btn flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 transition-all hover:bg-red-500/20"
            aria-label="حذف"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      `).join(""),l.textContent=String(x(e));const u=w(e);o.textContent=m(u),o.setAttribute("data-total-sar",String(u)),d.querySelectorAll("[data-id]").forEach(t=>{const n=t.dataset.id,g=t.querySelector('[data-action="decrease"]'),v=t.querySelector('[data-action="increase"]'),f=t.querySelector(".remove-btn");g?.addEventListener("click",()=>{const a=r().find(c=>c.id===n);a&&b(n,a.quantity-1)}),v?.addEventListener("click",()=>{const a=r().find(c=>c.id===n);a&&b(n,a.quantity+1)}),f?.addEventListener("click",()=>E(n))})}document.getElementById("checkout-whatsapp")?.addEventListener("click",()=>{const e=r();e.length!==0&&y(e)});document.getElementById("clear-cart")?.addEventListener("click",()=>{confirm("هل تريد إفراغ السلة بالكامل؟")&&p()});h();window.addEventListener("cart-updated",h);
