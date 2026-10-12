import{b as p,g as m}from"./worldcup-api.DMLlnwMc.js";let i=[],g="all";const r={container:document.getElementById("groups-container"),updated:document.getElementById("wc-groups-updated"),summaryMatches:document.getElementById("summary-matches"),summaryGoals:document.getElementById("summary-goals"),summaryAvg:document.getElementById("summary-avg"),summaryQualified:document.getElementById("summary-qualified")};function u(e,s){const a=s+1,n=e.flag?`<img src="${e.flag}" alt="${e.teamCode}" class="group-team-flag" />`:`<span class="group-team-flag-emoji">${m(e.teamCode)}</span>`;let t="",o="";return a===1?(t="pos-gold",o="🥇"):a===2?(t="pos-green",o="🥈"):a===3?(t="pos-gray",o=""):(t="pos-red",o=""),`
    <div class="group-team-row ${t}">
      <div class="group-team-left">
        <span class="group-team-pos">${o||a}</span>
        <div class="group-team-flag-box">${n}</div>
        <span class="group-team-name">${e.teamName}</span>
      </div>
      <div class="group-team-right">
        <div class="group-team-stat">
          <span class="stat-val">${e.points}</span>
          <span class="stat-lbl">نقاط</span>
        </div>
        <div class="group-team-stat">
          <span class="stat-val">${e.played}</span>
          <span class="stat-lbl">مباريات</span>
        </div>
        <div class="group-team-stat">
          <span class="stat-val">${e.won}/${e.drawn}/${e.lost}</span>
          <span class="stat-lbl">ف/ت/خ</span>
        </div>
        <div class="group-team-stat">
          <span class="stat-val">${e.goalDifference>0?"+":""}${e.goalDifference}</span>
          <span class="stat-lbl">فرق</span>
        </div>
      </div>
    </div>
  `}function f(e){const s=e.teams.map((t,o)=>u(t,o)).join("");let a=0,n=0;return e.teams.forEach(t=>{a+=t.goalsFor,n+=t.played}),n=Math.round(n/2),`
    <div class="group-card" data-group="${e.name}">
      <div class="group-card-header">
        <div class="group-card-title">
          <span class="group-card-icon">📊</span>
          <span class="group-card-name">المجموعة ${e.name}</span>
        </div>
        <span class="group-card-badge">نشطة</span>
      </div>
      <div class="group-card-body">
        ${s}
      </div>
      <div class="group-card-footer">
        <span class="group-card-stat">⚽ ${a} هدف</span>
        <span class="group-card-stat">📋 ${n} مباراة</span>
      </div>
    </div>
  `}function b(){if(document.getElementById("group-card-styles"))return;const e=document.createElement("style");e.id="group-card-styles",e.textContent=`
    /* ========== بطاقة المجموعة ========== */
    .group-card {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 1rem;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .group-card:hover {
      transform: translateY(-4px);
      border-color: rgba(245, 158, 11, 0.3);
      box-shadow: 0 12px 30px -10px rgba(245, 158, 11, 0.2);
    }

    /* رأس البطاقة */
    .group-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.875rem 1.25rem;
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05));
      border-bottom: 1px solid rgba(245, 158, 11, 0.2);
    }

    .group-card-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .group-card-icon { font-size: 1.25rem; }

    .group-card-name {
      font-size: 1rem;
      font-weight: 900;
      color: white;
    }

    .group-card-badge {
      padding: 0.25rem 0.75rem;
      background: rgba(34, 197, 94, 0.2);
      color: #86efac;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }

    /* جسم البطاقة */
    .group-card-body {
      padding: 0.5rem;
    }

    /* صف المنتخب */
    .group-team-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      border-radius: 0.75rem;
      margin-bottom: 0.375rem;
      transition: all 0.3s ease;
    }

    .group-team-row:last-child { margin-bottom: 0; }

    .group-team-row:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    /* ألوان المراكز */
    .pos-gold {
      background: linear-gradient(90deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05));
      border: 1px solid rgba(245, 158, 11, 0.2);
    }
    .pos-green {
      background: linear-gradient(90deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05));
      border: 1px solid rgba(34, 197, 94, 0.2);
    }
    .pos-gray {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .pos-red {
      background: linear-gradient(90deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.02));
      border: 1px solid rgba(239, 68, 68, 0.15);
    }

    /* يسار البطاقة - المنتخب */
    .group-team-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
      min-width: 0;
    }

    .group-team-pos {
      width: 1.75rem;
      text-align: center;
      font-size: 0.875rem;
      font-weight: 900;
      color: rgba(255, 255, 255, 0.6);
    }

    .group-team-flag-box {
      width: 2.5rem;
      height: 2.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.5rem;
      background: rgba(255, 255, 255, 0.05);
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      flex-shrink: 0;
    }

    .group-team-flag {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .group-team-flag-emoji {
      font-size: 1.5rem;
      line-height: 1;
    }

    .group-team-name {
      font-size: 0.8125rem;
      font-weight: 700;
      color: white;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* يمين البطاقة - الإحصائيات */
    .group-team-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .group-team-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 2.5rem;
    }

    .stat-val {
      font-size: 0.875rem;
      font-weight: 900;
      color: white;
    }

    .stat-lbl {
      font-size: 0.5rem;
      color: rgba(255, 255, 255, 0.5);
      font-weight: 600;
      text-transform: uppercase;
    }

    /* ذيل البطاقة */
    .group-card-footer {
      display: flex;
      justify-content: center;
      gap: 1.5rem;
      padding: 0.75rem 1.25rem;
      background: rgba(0, 0, 0, 0.1);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .group-card-stat {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.6);
      font-weight: 600;
    }

    /* Responsive */
    @media (max-width: 640px) {
      .group-team-right {
        gap: 0.5rem;
      }
      .group-team-stat {
        min-width: 2rem;
      }
      .stat-val {
        font-size: 0.75rem;
      }
      .group-team-name {
        font-size: 0.75rem;
        max-width: 5rem;
      }
    }
  `,document.head.appendChild(e)}function d(e){if(r.container){if(e.length===0){r.container.innerHTML=`
      <div class="empty-state">
        <span class="empty-icon">📊</span>
        <h4 class="empty-title">جاري تحميل البيانات...</h4>
        <p class="empty-subtitle">يرجى الانتظار</p>
      </div>
    `;return}r.container.innerHTML=e.map(f).join("")}}function h(){if(!i.length)return;let e=0,s=0,a=0;i.forEach(t=>{t.teams.forEach((o,l)=>{e+=o.goalsFor,l<2&&a++}),s+=t.teams.reduce((o,l)=>o+l.played,0)/2});const n=s>0?Math.round(e/s*10)/10:0;r.summaryMatches&&(r.summaryMatches.textContent=String(Math.round(s))),r.summaryGoals&&(r.summaryGoals.textContent=String(e)),r.summaryAvg&&(r.summaryAvg.textContent=String(n)),r.summaryQualified&&(r.summaryQualified.textContent=String(a))}function y(){r.updated&&(r.updated.textContent=`آخر تحديث: ${new Date().toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"})}`)}function v(e){if(e==="all")d(i);else{const s=i.filter(a=>a.name===e);d(s)}}async function c(){try{i=await p(),d(i),h(),y()}catch(e){console.error("Error loading groups:",e)}}document.querySelectorAll(".group-tab").forEach(e=>{e.addEventListener("click",()=>{const s=e.dataset.group;document.querySelectorAll(".group-tab").forEach(a=>a.classList.remove("active")),e.classList.add("active"),g=s||"all",v(g)})});b();c();setInterval(c,3e5);
