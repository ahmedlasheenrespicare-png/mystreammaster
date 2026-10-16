// Collection page built from the four reviewed reports; no runtime feeds required.
const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderMatchAnalysis($, data) {
  if (!Array.isArray(data.reports) || data.reports.length !== 4 || new Set(data.reports.map(r=>r.slug)).size !== 4) throw new Error('Invalid analysis collection');
  const cards=data.reports.map((r,i)=>{
    if (!/^[a-z]+(?:-[a-z]+)*$/.test(r.slug) || !['violet','blue','red'].includes(r.accent) || !/^2026-10-1[34]$/.test(r.date) || ![r.homeScore,r.awayScore].every(n=>Number.isSafeInteger(n)&&n>=0)) throw new Error('Invalid analysis card');
    const url=`/${r.slug}/`;
    return `<li class="ma-item"><article class="ma-card ma-card--${r.accent}" data-report="${r.slug}" aria-labelledby="card-${r.slug}">
      <div class="ma-card-art"><div class="ma-card-top"><span class="ma-tag">${esc(r.tag)}</span><span class="ma-card-number" aria-hidden="true">0${i+1}</span></div>
      <div class="ma-scoreboard" dir="ltr" role="group" aria-label="النتيجة النهائية: ${esc(r.home)} ${r.homeScore}، ${esc(r.away)} ${r.awayScore}"><img src="/images/teams/${esc(r.homeLogo)}" alt="شعار ${esc(r.home)}" width="70" height="70" loading="lazy" decoding="async"><div class="ma-score"><span class="ma-final">انتهت</span><strong>${r.homeScore}<span aria-hidden="true">:</span>${r.awayScore}</strong></div><img src="/images/teams/${esc(r.awayLogo)}" alt="شعار ${esc(r.away)}" width="70" height="70" loading="lazy" decoding="async"></div>
      <div class="ma-art-footer"><span>دوري أبطال أوروبا</span><span>الجولة الثانية</span></div></div>
      <div class="ma-card-body"><time datetime="${r.date}">${esc(r.dateLabel)}</time><h3 id="card-${r.slug}">${esc(r.home)} <span class="ma-versus" aria-label="ضد">×</span> ${esc(r.away)}</h3><p class="ma-headline">${esc(r.headline)}</p><p class="ma-summary">${esc(r.summary)}</p><ul class="ma-topics" aria-label="داخل التقرير"><li>التشكيل والإحصائيات</li><li>مراجعات المحللين</li></ul><a class="ma-open" href="${url}" aria-label="اقرأ تحليل مباراة ${esc(r.home)} و${esc(r.away)}"><span>اقرأ التحليل الكامل</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="21" height="21" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" stroke-linecap="round" stroke-linejoin="round"/></svg></a></div>
    </article></li>`;
  });
  $('[data-analysis-cards]').html(cards.join('\n'));
}
