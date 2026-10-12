import{f as $,c as k,g as y,a as L}from"./worldcup-api.DMLlnwMc.js";const S="/images/hero-slider-bg.webp";function E(e,r){const i=e.status==="live",t=e.status==="finished",d=e.homeFlag?`<img src="${e.homeFlag}" alt="${e.homeTeamCode}" class="slide-flag" />`:`<span class="slide-flag-emoji">${y(e.homeTeamCode)}</span>`,u=e.awayFlag?`<img src="${e.awayFlag}" alt="${e.awayTeamCode}" class="slide-flag" />`:`<span class="slide-flag-emoji">${y(e.awayTeamCode)}</span>`;let l="";i?l=`<span class="slide-badge-live"><span class="live-dot-sm"></span> مباشر ${e.minute||""}'</span>`:t?l='<span class="slide-badge-finished">انتهت</span>':l=`<span class="slide-badge-time">${L(e.kickoff)}</span>`;let a="";return i||t?a=`
        <div class="slide-score">
          <span class="slide-score-num">${e.homeScore??0}</span>
          <span class="slide-score-sep">-</span>
          <span class="slide-score-num">${e.awayScore??0}</span>
        </div>
      `:a='<span class="slide-vs">VS</span>',`
      <div class="hero-swiper-slide relative h-full" data-index="${r}">
        <div class="absolute inset-0 bg-gradient-to-br from-brand-red/20 via-purple-900/20 to-brand-bg-soft"></div>
        <div class="absolute top-0 right-0 w-32 h-32 bg-brand-red/10 rounded-full blur-[40px]"></div>
        <div class="absolute right-4 top-4 z-10">${l}</div>
        <div class="absolute inset-x-0 bottom-0 z-10 p-6">
          <p class="mb-3 text-xs font-bold uppercase tracking-wider text-gray-300">${e.group?`كأس العالم 2026 - المجموعة ${e.group}`:"كأس العالم 2026"}</p>
          <div class="mb-2 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">${d}<span class="text-xl font-black text-white sm:text-2xl">${e.homeTeam}</span></div>
            ${i||t?`<span class="num-latin text-2xl font-black text-brand-red-light sm:text-3xl">${e.homeScore??0}</span>`:""}
          </div>
          <div class="mb-3 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">${u}<span class="text-xl font-black text-white sm:text-2xl">${e.awayTeam}</span></div>
            ${i||t?`<span class="num-latin text-2xl font-black text-brand-red-light sm:text-3xl">${e.awayScore??0}</span>`:""}
          </div>
          <div class="text-center">${a}</div>
        </div>
      </div>
    `}function b(){const e=document.querySelector(".hero-swiper-card"),r=document.querySelector(".hero-swiper-viewport"),i=document.getElementById("hero-swiper-track"),t=document.querySelector(".hero-swiper-dots"),d=document.querySelector(".hero-swiper-prev"),u=document.querySelector(".hero-swiper-next");if(!e||!r||!i||!d||!u)return;const l=Array.from(i.querySelectorAll(".hero-swiper-slide"));if(l.length<2)return;let a=0,f=null;function o(s){a=(s+l.length)%l.length,i.style.transform=`translateX(${a*100}%)`,x()}function x(){if(!t)return;t.querySelectorAll(".hero-swiper-dot").forEach((c,n)=>{c.classList.toggle("active",n===a),c.setAttribute("aria-current",String(n===a))})}t&&(t.innerHTML="",l.forEach((s,c)=>{const n=document.createElement("button");n.type="button",n.className="hero-swiper-dot"+(c===0?" active":""),n.setAttribute("aria-label",`عرض الشريحة ${c+1}`),n.setAttribute("role","tab"),n.setAttribute("aria-current",String(c===0)),n.addEventListener("click",g=>{g.preventDefault(),g.stopPropagation(),p(),o(c)}),t.appendChild(n)})),d.addEventListener("click",s=>{s.preventDefault(),s.stopPropagation(),p(),o(a-1)}),u.addEventListener("click",s=>{s.preventDefault(),s.stopPropagation(),p(),o(a+1)});function p(){e.classList.add("is-interacting"),setTimeout(()=>{e.classList.remove("is-interacting")},2600)}function h(){f||(f=window.setInterval(()=>{e.classList.contains("is-interacting")||o(a+1)},5e3))}function v(){f&&(window.clearInterval(f),f=null)}e.addEventListener("mouseenter",v),e.addEventListener("mouseleave",h),e.addEventListener("touchstart",v,{passive:!0}),e.addEventListener("touchend",()=>{setTimeout(h,1e3)},{passive:!0});let w=0,m=!1;r.addEventListener("touchstart",s=>{w=s.touches[0].clientX,m=!0},{passive:!0}),r.addEventListener("touchend",s=>{if(!m)return;m=!1;const n=s.changedTouches[0].clientX-w;Math.abs(n)>50&&(p(),n>0?o(a-1):o(a+1))},{passive:!0}),e.addEventListener("keydown",s=>{s.key==="ArrowLeft"&&(p(),o(a+1)),s.key==="ArrowRight"&&(p(),o(a-1))}),window.matchMedia("(prefers-reduced-motion: reduce)").matches||h(),console.log("Swiper initialized with",l.length,"slides")}async function T(){/* Hero dynamic loading disabled for performance - using static slides */}document.addEventListener("DOMContentLoaded",()=>{b(),T()});
