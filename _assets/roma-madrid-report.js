// Reuse exactly the first report's chart controls, with explicit team labels.
import './fixture-charts.js';
import { romaMadridEvent, romaMadridStandings, FIELDS } from './roma-madrid-data.js';
const text = (node,value) => { if (node) node.textContent = value; };
const root = document.querySelector('main[data-roma-madrid-report]');
if (root) {
  const status = root.querySelector('[data-roma-live-status]');
  const tableReads = new Map();
  let scoreRead = 0;
  const pending = new Set();
  const request = async url => {
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(),12000);
    try {
      const response = await fetch(url,{signal:controller.signal,cache:'no-store',credentials:'omit',headers:{Accept:'application/json'}});
      if (!response.ok) throw new Error(response.status === 501 ? 'PHP_PREVIEW_UNAVAILABLE' : 'SOURCE_UNAVAILABLE');
      const body = await response.json();
      const age = Number(response.headers.get('X-Cache-Age') || '0');
      return {body,stale:response.headers.get('X-Scoreboard-Cache') === 'STALE',readAt:Date.now() - (Number.isFinite(age) && age >= 0 ? age * 1000 : 0)};
    } finally { clearTimeout(timer); }
  };
  let chartSnapshot = {source:'espn',state:'loading'};
  const publish = data => {
    chartSnapshot = {...chartSnapshot,...data,source:'espn'};
    window.__smFixtureChartSnapshot = chartSnapshot;
    document.dispatchEvent(new CustomEvent('sm:fixture-statistics',{detail:chartSnapshot}));
  };
  const stats = competitor => Object.fromEntries((competitor.statistics || []).map(s => {
    const raw = s.displayValue ?? s.value;
    const numeric = /^\d+(\.\d+)?%?$/.test(String(raw)) ? Number(String(raw).replace('%','')) : null;
    return [s.name,{value:Number.isFinite(numeric) ? numeric : null}];
  }));
  async function updateScore() {
    if (pending.has('score') || document.hidden) return;
    pending.add('score');
    try {
      if (!navigator.onLine) throw new Error('OFFLINE');
      const {body,stale,readAt} = await request('/scoreboard.php?league=uefa.champions&day=2026-10-14');
      const match = romaMadridEvent(body.events);
      // Cache age is reflected in the UI; it never overwrites the report's official values.
      const checkedAt = readAt;
      if (checkedAt < scoreRead) throw new Error('OLDER_READING');
      scoreRead = checkedAt;
      text(root.querySelector('[data-roma-score="home"]'),match.score.home);
      text(root.querySelector('[data-roma-score="away"]'),match.score.away);
      text(status,`انتهت المباراة · قراءة ESPN${stale ? ' مخزّنة قد تتأخر' : ''} · ${new Intl.DateTimeFormat('ar-EG',{timeZone:'Africa/Cairo',hour:'2-digit',minute:'2-digit'}).format(checkedAt)} بتوقيت القاهرة`);
      const home = stats(match.home); const away = stats(match.away);
      publish({state:'finished',phase:'finished',home,away,checkedAt:new Date(checkedAt).toISOString(),stale,message:'قراءة ESPN مستقلة عن الأرقام النهائية'});
      const box = root.querySelector('[data-roma-live-stats]');
      const fragment = document.createDocumentFragment();
      for (const [key,label] of [['possessionPct','الاستحواذ'],['totalShots','التسديدات'],['shotsOnTarget','على المرمى'],['wonCorners','الركنيات'],['foulsCommitted','الأخطاء']]) {
        const line=document.createElement('p'); line.className='stat-line';
        line.textContent=`${label}: روما ${home[key]?.value ?? 'غير متاح'} · ريال مدريد ${away[key]?.value ?? 'غير متاح'}`;
        fragment.append(line);
      }
      box.replaceChildren(fragment);
    } catch (error) {
      const message = error.message === 'PHP_PREVIEW_UNAVAILABLE' ? 'المعاينة لا تشغّل PHP' : !navigator.onLine ? 'لا يوجد اتصال' : 'تعذّر التحقق من قراءة ESPN مطابقة لهذه المباراة';
      text(status,`${message}؛ احتُفظ بآخر قراءة معروضة، وأرقام UEFA النهائية مستقلة أعلاه.`);
      publish({state:'error',stale:true,message});
    } finally { pending.delete('score'); }
  }
  async function updateTable(card) {
    const league=card.dataset.romaStanding;
    if (league === 'ita.1') return; // Static reviewed snapshot: PHP scope is unchanged.
    if (pending.has(league) || document.hidden) return;
    pending.add(league);
    const status=card.querySelector('[data-roma-standing-status]');
    try {
      if (!navigator.onLine) throw new Error('OFFLINE');
      const {body} = await request(`/standings.php?league=${encodeURIComponent(league)}`);
      const rows=romaMadridStandings(body,league);
      const read=Date.parse(body.fetchedAt);
      if (read < (tableReads.get(league) ?? Date.parse('2026-10-16T00:00:00Z'))) throw new Error('OLDER_READING');
      tableReads.set(league,read);
      const fragment=document.createDocumentFragment();
      for (const row of rows) {
        const tr=document.createElement('tr');
        if (['104','86'].includes(row.teamId)) tr.dataset.focusTeam=row.teamId;
        [row.rank,row.name,...FIELDS.map(k=>row[k] ?? 'غير متاح')].forEach((value,i)=>{
          const cell=document.createElement(i === 1 ? 'th' : 'td');
          if (i===1) cell.scope='row';
          cell.textContent=value; tr.append(cell);
        });
        fragment.append(tr);
      }
      card.querySelector('tbody').replaceChildren(fragment);
      const summary=card.querySelector('.fs-positions'); summary.replaceChildren();
      for (const row of rows.filter(r=>['104','86'].includes(r.teamId))) {
        const div=document.createElement('div'); div.className='fs-position';
        div.textContent=`${row.teamId==='104'?'روما':'ريال مدريد'} · المركز ${row.rank} · ${row.points ?? 'غير متاح'} نقطة`;
        summary.append(div);
      }
      text(status,`قراءة ESPN${body.stale?' مخزّنة قد تتأخر':''} · ${new Intl.DateTimeFormat('ar-EG',{timeZone:'Africa/Cairo',dateStyle:'short',timeStyle:'short'}).format(read)} بتوقيت القاهرة · تحديث كل خمس دقائق`);
      card.dataset.feedState=body.stale?'stale':'updated';
    } catch (error) {
      card.dataset.feedState='stale';
      const message=error.message==='PHP_PREVIEW_UNAVAILABLE'?'المعاينة لا تشغّل PHP':'تعذّر تحديث الترتيب';
      text(status,`${message}؛ احتُفظ بآخر جدول مؤرّخ${tableReads.has(league)?'':' · لقطة 16 أكتوبر 2026'}.`);
    } finally { pending.delete(league); }
  }
  const refresh = () => { void updateScore(); root.querySelectorAll('[data-roma-standing]').forEach(card=>{void updateTable(card);}); };
  refresh();
  setInterval(()=>{void updateScore();},60000);
  setInterval(()=>root.querySelectorAll('[data-roma-standing]').forEach(card=>{void updateTable(card);}),300000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden) refresh();});
  window.addEventListener('online',refresh);
  window.addEventListener('offline',()=>publish({state:'offline',stale:true,message:'لا يوجد اتصال لتحديث الأرقام'}));
}
