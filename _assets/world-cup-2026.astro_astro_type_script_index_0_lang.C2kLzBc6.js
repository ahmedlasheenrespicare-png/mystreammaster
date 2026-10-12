import{f as v,b as m,d as g,g as d}from"./worldcup-api.DMLlnwMc.js";const l={container:document.getElementById("wc-stats-container")};function p(){if(document.getElementById("stats-card-styles"))return;const s=document.createElement("style");s.id="stats-card-styles",s.textContent=`
    /* ========== بطاقة الإحصائيات ========== */
    .stats-card {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 1rem;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .stats-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 30px -10px rgba(0, 0, 0, 0.3);
    }

    /* رأس البطاقة */
    .stats-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.875rem 1.25rem;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .stats-card-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .stats-card-icon { font-size: 1.25rem; }

    .stats-card-name {
      font-size: 0.875rem;
      font-weight: 900;
      color: white;
    }

    /* جسم البطاقة */
    .stats-card-body {
      padding: 1rem 1.25rem;
    }

    /* صف الإحصائية */
    .stats-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.625rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .stats-row:last-child { border-bottom: none; }

    .stats-row-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .stats-row-flag-box {
      width: 2rem;
      height: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.5rem;
      background: rgba(255, 255, 255, 0.05);
      overflow: hidden;
      flex-shrink: 0;
    }

    .stats-row-flag {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .stats-row-flag-emoji { font-size: 1.25rem; }

    .stats-row-name {
      font-size: 0.8125rem;
      font-weight: 700;
      color: white;
    }

    .stats-row-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .stats-row-value {
      font-size: 1rem;
      font-weight: 900;
      color: #fcd34d;
    }

    .stats-row-label {
      font-size: 0.625rem;
      color: rgba(255, 255, 255, 0.5);
      font-weight: 600;
    }

    /* ذيل البطاقة */
    .stats-card-footer {
      display: flex;
      justify-content: center;
      padding: 0.75rem 1.25rem;
      background: rgba(0, 0, 0, 0.1);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .stats-card-footer-text {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.5);
      font-weight: 600;
    }

    /* بطاقة الإحصائيات العامة */
    .stats-overview-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    @media (max-width: 640px) {
      .stats-overview-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .stats-overview-card {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05));
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 1rem;
      padding: 1.25rem;
      text-align: center;
      transition: all 0.3s ease;
    }

    .stats-overview-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 30px -10px rgba(245, 158, 11, 0.3);
    }

    .stats-overview-icon { font-size: 2rem; margin-bottom: 0.5rem; }
    .stats-overview-value {
      font-size: 2rem;
      font-weight: 900;
      color: white;
      line-height: 1;
      margin-bottom: 0.25rem;
    }
    .stats-overview-label {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.6);
      font-weight: 700;
    }

    /* المتصدرين */
    .leader-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      border-radius: 0.75rem;
      margin-bottom: 0.375rem;
      background: linear-gradient(90deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.02));
      border: 1px solid rgba(245, 158, 11, 0.15);
      transition: all 0.3s ease;
    }

    .leader-row:hover {
      background: rgba(245, 158, 11, 0.15);
    }

    .leader-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .leader-pos {
      width: 1.75rem;
      text-align: center;
      font-size: 1rem;
    }

    .leader-flag-box {
      width: 2.5rem;
      height: 2.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.5rem;
      background: rgba(255, 255, 255, 0.05);
      overflow: hidden;
    }

    .leader-flag {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .leader-flag-emoji { font-size: 1.5rem; }

    .leader-name {
      font-size: 0.875rem;
      font-weight: 700;
      color: white;
    }

    .leader-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .leader-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .leader-stat-val {
      font-size: 1rem;
      font-weight: 900;
      color: #fcd34d;
    }

    .leader-stat-lbl {
      font-size: 0.5rem;
      color: rgba(255, 255, 255, 0.5);
      font-weight: 600;
      text-transform: uppercase;
    }
  `,document.head.appendChild(s)}function f(s){return`
    <div class="stats-overview-grid">
      <div class="stats-overview-card">
        <div class="stats-overview-icon">⚽</div>
        <div class="stats-overview-value">${s.totalMatches}</div>
        <div class="stats-overview-label">مباراة</div>
      </div>
      <div class="stats-overview-card">
        <div class="stats-overview-icon">🥅</div>
        <div class="stats-overview-value">${s.totalGoals}</div>
        <div class="stats-overview-label">هدف</div>
      </div>
      <div class="stats-overview-card">
        <div class="stats-overview-icon">📊</div>
        <div class="stats-overview-value">${s.avgGoals}</div>
        <div class="stats-overview-label">معدل/مباراة</div>
      </div>
      <div class="stats-overview-card">
        <div class="stats-overview-icon">🔴</div>
        <div class="stats-overview-value">${s.liveMatches}</div>
        <div class="stats-overview-label">مباشر</div>
      </div>
      <div class="stats-overview-card">
        <div class="stats-overview-icon">✅</div>
        <div class="stats-overview-value">${s.completedMatches}</div>
        <div class="stats-overview-label">انتهت</div>
      </div>
      <div class="stats-overview-card">
        <div class="stats-overview-icon">🌍</div>
        <div class="stats-overview-value">48</div>
        <div class="stats-overview-label">منتخب</div>
      </div>
    </div>
  `}function w(s){const t={};s.forEach(a=>{if(a.homeScore!=null&&a.homeScore>0){const e=a.homeTeam;t[e]||(t[e]={goals:0,code:a.homeTeamCode,flag:a.homeFlag}),t[e].goals+=a.homeScore}if(a.awayScore!=null&&a.awayScore>0){const e=a.awayTeam;t[e]||(t[e]={goals:0,code:a.awayTeamCode,flag:a.awayFlag}),t[e].goals+=a.awayScore}});const i=Object.entries(t).sort(([,a],[,e])=>e.goals-a.goals).slice(0,8);return i.length===0?`
      <div class="stats-card">
        <div class="stats-card-header">
          <div class="stats-card-title">
            <span class="stats-card-icon">⚽</span>
            <span class="stats-card-name">أكثر المنتخبات تهديفاً</span>
          </div>
        </div>
        <div class="stats-card-body">
          <div class="stats-empty">لا توجد بيانات بعد</div>
        </div>
      </div>
    `:`
    <div class="stats-card">
      <div class="stats-card-header">
        <div class="stats-card-title">
          <span class="stats-card-icon">⚽</span>
          <span class="stats-card-name">أكثر المنتخبات تهديفاً</span>
        </div>
      </div>
      <div class="stats-card-body">
        ${i.map(([a,e],n)=>{const c=e.flag?`<img src="${e.flag}" alt="${e.code}" class="stats-row-flag" />`:`<span class="stats-row-flag-emoji">${d(e.code)}</span>`;return`
      <div class="stats-row">
        <div class="stats-row-left">
          <span class="stats-row-pos">${n+1}</span>
          <div class="stats-row-flag-box">${c}</div>
          <span class="stats-row-name">${a}</span>
        </div>
        <div class="stats-row-right">
          <span class="stats-row-value">${e.goals}</span>
          <span class="stats-row-label">هدف</span>
        </div>
      </div>
    `}).join("")}
      </div>
      <div class="stats-card-footer">
        <span class="stats-card-footer-text">أعلى ${i} منتخبات تسجيلاً</span>
      </div>
    </div>
  `}function b(s){return s.length===0?"":`
    <div class="stats-card">
      <div class="stats-card-header">
        <div class="stats-card-title">
          <span class="stats-card-icon">🏆</span>
          <span class="stats-card-name">متصدري المجموعات</span>
        </div>
      </div>
      <div class="stats-card-body">
        ${s.map(i=>{const r=i.teams[0];return r?`
      <div class="leader-row">
        <div class="leader-left">
          <span class="leader-pos">🏆</span>
          <div class="leader-flag-box">${r.flag?`<img src="${r.flag}" alt="${r.teamCode}" class="leader-flag" />`:`<span class="leader-flag-emoji">${d(r.teamCode)}</span>`}</div>
          <span class="leader-name">${r.teamName}</span>
        </div>
        <div class="leader-right">
          <div class="leader-stat">
            <span class="leader-stat-val">${r.points}</span>
            <span class="leader-stat-lbl">نقاط</span>
          </div>
          <div class="leader-stat">
            <span class="leader-stat-val">${r.played}</span>
            <span class="leader-stat-lbl">مباريات</span>
          </div>
          <div class="leader-stat">
            <span class="leader-stat-val">${r.won}</span>
            <span class="leader-stat-lbl">فوز</span>
          </div>
        </div>
      </div>
    `:""}).join("")}
      </div>
      <div class="stats-card-footer">
        <span class="stats-card-footer-text">متصدر كل مجموعة من ${s.length} مجموعات</span>
      </div>
    </div>
  `}async function o(){if(l.container)try{const[s,t]=await Promise.all([v(),m()]),i=g(s);l.container.innerHTML=`
      ${f(i)}
      <div style="display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
        ${w(s)}
        ${b(t)}
      </div>
    `}catch(s){console.error("Error loading stats:",s),l.container.innerHTML=`
      <div class="empty-state">
        <span class="empty-icon">📈</span>
        <h4 class="empty-title">خطأ في تحميل الإحصائيات</h4>
        <p class="empty-subtitle">يرجى المحاولة مرة أخرى</p>
      </div>
    `}}p();o();setInterval(o,3e5);
