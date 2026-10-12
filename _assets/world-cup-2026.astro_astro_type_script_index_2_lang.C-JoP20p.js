import{f as u,c as l,g as r,a as f}from"./worldcup-api.DMLlnwMc.js";let s=[],m="all";const t={liveContainer:document.getElementById("wc-live-container"),todayContainer:document.getElementById("wc-today-container"),upcomingContainer:document.getElementById("wc-upcoming-container"),completedContainer:document.getElementById("wc-completed-container"),liveEmpty:document.getElementById("wc-live-empty"),todayEmpty:document.getElementById("wc-today-empty"),upcomingEmpty:document.getElementById("wc-upcoming-empty"),completedEmpty:document.getElementById("wc-completed-empty"),lastUpdated:document.getElementById("wc-last-updated"),sourceIndicator:document.getElementById("wc-source-indicator"),groupSelect:document.getElementById("wc-group-select"),refreshBtn:document.getElementById("wc-refresh-btn"),statLive:document.getElementById("stat-live"),statToday:document.getElementById("stat-today"),statUpcoming:document.getElementById("stat-upcoming"),statCompleted:document.getElementById("stat-completed"),tabLiveCount:document.getElementById("tab-live-count"),tabTodayCount:document.getElementById("tab-today-count"),tabUpcomingCount:document.getElementById("tab-upcoming-count"),tabCompletedCount:document.getElementById("tab-completed-count")};function y(e){const a=e.status==="live",n=e.status==="finished",h=e.homeFlag?`<img src="${e.homeFlag}" alt="${e.homeTeamCode}" class="match-flag-img" />`:`<span class="match-flag-emoji">${r(e.homeTeamCode)}</span>`,p=e.awayFlag?`<img src="${e.awayFlag}" alt="${e.awayTeamCode}" class="match-flag-img" />`:`<span class="match-flag-emoji">${r(e.awayTeamCode)}</span>`,g=a?"match-live":n?"match-finished":"match-scheduled";let i="";a?i=`
      <div class="match-header-live">
        <span class="live-dot"></span>
        <span class="live-text">مباشر ${e.minute||""}'</span>
      </div>
    `:n?i=`
      <div class="match-header-finished">
        <span>✅</span>
        <span>انتهت</span>
      </div>
    `:i=`
      <div class="match-header-time">
        <span>🕐</span>
        <span>${f(e.kickoff)}</span>
      </div>
    `;let d="";return(a||n)&&(d=`
      <div class="match-score">
        <span class="score-num">${e.homeScore??0}</span>
        <span class="score-sep">-</span>
        <span class="score-num">${e.awayScore??0}</span>
      </div>
    `),`
    <div class="match-card ${g}">
      <div class="match-header">
        <span class="match-icon">${a?"🔴":"⚽"}</span>
        ${i}
      </div>
      <div class="match-body">
        <div class="match-team">
          <div class="match-flag-box">${h}</div>
          <span class="match-team-name">${e.homeTeam}</span>
        </div>
        <div class="match-center">
          ${d||'<span class="match-vs">VS</span>'}
        </div>
        <div class="match-team">
          <div class="match-flag-box">${p}</div>
          <span class="match-team-name">${e.awayTeam}</span>
        </div>
      </div>
    </div>
  `}function v(){if(document.getElementById("match-card-styles"))return;const e=document.createElement("style");e.id="match-card-styles",e.textContent=`
    .match-card {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 1rem;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .match-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 30px -10px rgba(0, 0, 0, 0.3);
    }

    .match-live { border-color: rgba(220, 38, 38, 0.5); }
    .match-live:hover { box-shadow: 0 12px 30px -10px rgba(220, 38, 38, 0.3); }
    .match-finished { border-color: rgba(34, 197, 94, 0.3); }
    .match-finished:hover { box-shadow: 0 12px 30px -10px rgba(34, 197, 94, 0.2); }
    .match-scheduled { border-color: rgba(245, 158, 11, 0.3); }
    .match-scheduled:hover { box-shadow: 0 12px 30px -10px rgba(245, 158, 11, 0.2); }

    .match-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      background: rgba(0, 0, 0, 0.2);
    }

    .match-icon { font-size: 1rem; }

    .match-header-live,
    .match-header-finished,
    .match-header-time {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.8125rem;
      font-weight: 700;
    }

    .match-header-live { color: #fca5a5; }
    .live-dot {
      width: 8px;
      height: 8px;
      background: #dc2626;
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    }
    .live-text { font-weight: 900; }
    .match-header-finished { color: #86efac; }
    .match-header-time { color: #fcd34d; }

    .match-body {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1rem;
      gap: 0.5rem;
    }

    .match-team {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.625rem;
      flex: 1;
      min-width: 0;
    }

    .match-flag-box {
      width: 3.5rem;
      height: 3.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.75rem;
      background: rgba(255, 255, 255, 0.05);
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: transform 0.3s ease;
    }

    .match-card:hover .match-flag-box { transform: scale(1.1); }

    .match-flag-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .match-flag-emoji {
      font-size: 2rem;
      line-height: 1;
    }

    .match-team-name {
      font-size: 0.75rem;
      font-weight: 700;
      color: white;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    .match-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 4rem;
    }

    .match-score {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .score-num {
      font-size: 1.75rem;
      font-weight: 900;
      color: white;
      min-width: 2rem;
      text-align: center;
    }

    .score-sep {
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.4);
    }

    .match-vs {
      font-size: 0.75rem;
      font-weight: 900;
      color: rgba(255, 255, 255, 0.3);
      letter-spacing: 0.1em;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @media (max-width: 640px) {
      .match-body { padding: 1rem 0.75rem; }
      .match-flag-box { width: 2.75rem; height: 2.75rem; }
      .match-flag-emoji { font-size: 1.5rem; }
      .match-team-name { font-size: 0.6875rem; }
      .score-num { font-size: 1.5rem; min-width: 1.75rem; }
    }
  `,document.head.appendChild(e)}function c(e,a,n){if(a){if(e.length===0){a.innerHTML="",n?.classList.remove("hidden");return}n?.classList.add("hidden"),a.innerHTML=e.map(y).join("")}}function b(){const e=l(s);t.statLive&&(t.statLive.textContent=String(e.live.length)),t.statToday&&(t.statToday.textContent=String(e.today.length)),t.statUpcoming&&(t.statUpcoming.textContent=String(e.upcoming.length)),t.statCompleted&&(t.statCompleted.textContent=String(e.completed.length)),t.tabLiveCount&&(t.tabLiveCount.textContent=String(e.live.length)),t.tabTodayCount&&(t.tabTodayCount.textContent=String(e.today.length)),t.tabUpcomingCount&&(t.tabUpcomingCount.textContent=String(e.upcoming.length)),t.tabCompletedCount&&(t.tabCompletedCount.textContent=String(e.completed.length))}function x(){t.lastUpdated&&(t.lastUpdated.textContent=new Date().toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"}))}function w(e){return m==="all"?e:e.filter(a=>a.group===m)}async function o(){try{s=await u();const e=w(s),a=l(e);c(a.live,t.liveContainer,t.liveEmpty),c(a.today,t.todayContainer,t.todayEmpty),c(a.upcoming.slice(0,12),t.upcomingContainer,t.upcomingEmpty),c(a.completed.slice(0,12),t.completedContainer,t.completedEmpty),b(),x()}catch(e){console.error("Error:",e)}}t.groupSelect?.addEventListener("change",()=>{m=t.groupSelect.value,o()});t.refreshBtn?.addEventListener("click",o);window.addEventListener("refresh-matches",o);v();o();setInterval(o,6e4);
