/* Shared, dependency-free SVG renderer: Node at build time, progressive enhancement in the browser.
   UEFA values come only from the visible final-match tables. ESPN uses the existing scoreboard request. */
export const CHART_METRICS = [
  { key: 'attempts', label: 'إجمالي التسديدات', group: 'attack', espn: 'totalShots' },
  { key: 'on-target', label: 'التسديدات على المرمى', group: 'attack', espn: 'shotsOnTarget' },
  { key: 'corners', label: 'الركنيات', group: 'attack', espn: 'wonCorners' },
  { key: 'possession', label: 'الاستحواذ', group: 'passing', espn: 'possessionPct', percent: true, donut: true },
  { key: 'passes-completed', label: 'التمريرات المكتملة', group: 'passing', espn: 'accuratePasses' },
  { key: 'passing-accuracy', label: 'دقة التمرير', group: 'passing', espn: 'passCompletionPct', percent: true },
  { key: 'saves', label: 'تصديات الحارس', group: 'defence', espn: 'saves' },
  { key: 'fouls', label: 'الأخطاء المرتكبة', group: 'defence', espn: 'foulsCommitted' },
  { key: 'red-cards', label: 'البطاقات الحمراء', group: 'defence', espn: 'redCards' },
];

const HOME = 'أتلتيكو مدريد';
const AWAY = 'مانشستر يونايتد';
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function chartValue(raw, percent = false) {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  if (!/^\d+(?:\.\d+)?%?$/.test(text) || (!percent && text.endsWith('%'))) return null;
  const value = Number(text.replace(/%$/, ''));
  if (!Number.isFinite(value) || value < 0 || (percent ? value > 100 : !Number.isSafeInteger(value))) return null;
  return value;
}

function valuesFor(metric, rows) {
  const row = rows?.[metric.key];
  return {
    home: chartValue(row?.home, metric.percent),
    away: chartValue(row?.away, metric.percent),
  };
}
const valueText = (value, percent) => value === null ? 'غير متاح' : `${value}${percent ? '%' : ''}`;
const comparisonLabel = (metric, home, away) => `${metric.label}: ${HOME} ${valueText(home, metric.percent)}، ${AWAY} ${valueText(away, metric.percent)}`;

function barRow(metric, value, team, scale, complete) {
  const width = complete ? Number((value / scale * 100).toFixed(4)) : 0;
  const teamName = team === 'home' ? HOME : AWAY;
  return `<div class="fc-bar-row" data-team="${team}">
    <div class="fc-value-line"><span><i class="fc-dot" aria-hidden="true"></i>${teamName}</span><bdi class="fc-value" dir="ltr" data-chart-value="${team}">${esc(valueText(value, metric.percent))}</bdi></div>
    <svg class="fc-bar-svg" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect class="fc-bar-track" x="0" y="0" width="100" height="8" rx="4"/>${complete ? `<rect class="fc-bar-fill" x="${100 - width}" y="0" width="${width}" height="8" rx="4"/>` : ''}</svg>
  </div>`;
}

function donutMarkup(metric, home, away, complete) {
  // Do not normalize missing/inconsistent percentages into an invented 50/50 split.
  const comparable = complete && Math.abs(home + away - 100) < 0.001;
  return `<div class="fc-donut-layout">
    <svg class="fc-donut" viewBox="0 0 140 140" role="img" aria-label="${esc(comparisonLabel(metric, home, away))}" focusable="false">
      <circle class="fc-ring-track" cx="70" cy="70" r="54"/>
      ${comparable ? `<g transform="rotate(-90 70 70)"><circle class="fc-ring fc-ring--home" cx="70" cy="70" r="54" pathLength="100" stroke-dasharray="${home} ${100 - home}"/><circle class="fc-ring fc-ring--away" cx="70" cy="70" r="54" pathLength="100" stroke-dasharray="${away} ${100 - away}" stroke-dashoffset="${-home}"/></g>` : ''}
      <text x="70" y="68" text-anchor="middle" class="fc-ring-caption">الاستحواذ</text><text x="70" y="88" text-anchor="middle" class="fc-ring-unit">نسبة مئوية</text>
    </svg>
    <div class="fc-donut-values">${['home', 'away'].map(team => `<div class="fc-value-line" data-team="${team}"><span><i class="fc-dot" aria-hidden="true"></i>${team === 'home' ? HOME : AWAY}</span><bdi class="fc-value" dir="ltr" data-chart-value="${team}">${esc(valueText(team === 'home' ? home : away, true))}</bdi></div>`).join('')}</div>
  </div>${!comparable && complete ? '<p class="fc-missing">لا يتيح مجموع النسب الوارد من المصدر رسماً دائرياً موثوقاً.</p>' : ''}`;
}

export function renderChartCards(rows) {
  return CHART_METRICS.map(metric => {
    const { home, away } = valuesFor(metric, rows);
    const complete = home !== null && away !== null;
    const scale = metric.percent ? 100 : Math.max(home ?? 0, away ?? 0, 1);
    return `<article class="fc-card" data-metric="${metric.key}" data-chart-group="${metric.group}" data-complete="${complete}" aria-labelledby="fc-${metric.key}-title">
      <h4 id="fc-${metric.key}-title">${metric.label}</h4>
      ${metric.donut ? donutMarkup(metric, home, away, complete) : `<div class="fc-bars" role="img" aria-label="${esc(comparisonLabel(metric, home, away))}">${barRow(metric, home, 'home', scale, complete)}${barRow(metric, away, 'away', scale, complete)}</div>`}
      <p class="fc-scale">${metric.percent ? 'مقياس النسبة: من 0 إلى 100%' : 'طول الشريط للمقارنة داخل هذا المؤشر فقط'}</p>
      ${!complete ? '<p class="fc-missing">بيانات هذا المؤشر غير مكتملة لدى المصدر؛ لا تُقدَّر القيم الناقصة.</p>' : ''}
    </article>`;
  }).join('\n');
}

export function renderFixtureCharts(rows, reviewed = '') {
  // A missing final UEFA value is a build error, not an invitation to substitute ESPN.
  for (const metric of CHART_METRICS) {
    const values = valuesFor(metric, rows);
    if (values.home === null || values.away === null) throw new Error(`Missing official chart values: ${metric.key}`);
  }
  return `<div class="fc-heading"><div><span class="fc-eyebrow">مقارنة بصرية بين الفريقين</span><h3 id="fixture-charts-title">التحليل بالأرقام</h3><p>رسوم للمقارنة بين الفريقين، بأرقام ظاهرة دائماً إلى جانب الرسم.</p></div><span class="fc-source-badge" data-chart-badge>أرقام نهائية</span></div>
    <div class="fc-controls" data-chart-controls hidden>
      <div class="fc-control-line"><span class="fc-control-label">عرض الأرقام</span><div class="fc-button-group" role="group" aria-label="طريقة عرض أرقام الرسوم"><button type="button" data-chart-source="uefa" aria-pressed="true">أرقام نهائية</button><button type="button" data-chart-source="espn" aria-pressed="false">تحديث تلقائي</button></div></div>
      <div class="fc-control-line"><span class="fc-control-label">المؤشرات</span><div class="fc-button-group" role="group" aria-label="تصفية مؤشرات الرسوم"><button type="button" data-chart-filter="all" aria-pressed="true">كل المؤشرات</button><button type="button" data-chart-filter="attack" aria-pressed="false">الهجوم</button><button type="button" data-chart-filter="passing" aria-pressed="false">التمرير والاستحواذ</button><button type="button" data-chart-filter="defence" aria-pressed="false">الدفاع والانضباط</button></div></div>
      <div class="fc-control-line"><span class="fc-control-label">إبراز فريق</span><div class="fc-button-group fc-legend" role="group" aria-label="إبراز رسوم فريق"><button type="button" data-chart-highlight="home" aria-pressed="false"><i class="fc-dot" aria-hidden="true"></i>${HOME}</button><button type="button" data-chart-highlight="away" aria-pressed="false"><i class="fc-dot" aria-hidden="true"></i>${AWAY}</button></div></div>
    </div>
    <p class="fc-status" data-chart-status role="status" aria-live="polite">المعروض أرقام المباراة النهائية، المراجعة في ${esc(reviewed)}.</p>
    <p class="fc-context">التحليل النصي يعتمد الأرقام النهائية. اختيار التحديث التلقائي يغيّر الرسوم فقط، ولا يُعدّل الملخص أو الجداول النهائية أو نص التحليل. الأرقام المفقودة لا تُستكمل من قراءة أخرى.</p>
    <div class="fc-grid" data-chart-cards>${renderChartCards(rows)}</div>
    <p class="fc-provenance" data-chart-provenance>مقياس المقارنة مستقل لكل مؤشر؛ التحديث التلقائي لا يستبدل الجداول النهائية.</p>
    <p class="fc-context" data-chart-static-note>الرسوم والأرقام النهائية ظاهرة دون JavaScript. التصفية والتحديث التلقائي تحسينان اختياريان عند تفعيله.</p>`;
}

function readOfficialRows(root) {
  const rows = {};
  root.querySelectorAll('#uefa-stats [data-stat]').forEach(row => {
    const cells = row.querySelectorAll('td');
    rows[row.dataset.stat] = { home: cells[0]?.textContent.trim(), away: cells[1]?.textContent.trim() };
  });
  return rows;
}

export function espnChartRows(snapshot) {
  const rows = {};
  // Scheduled/unknown events have no usable match statistics, even if an API sends zeros.
  if (!snapshot || snapshot.state === 'scheduled') return rows;
  for (const metric of CHART_METRICS) {
    rows[metric.key] = {
      home: snapshot.home?.[metric.espn]?.value ?? null,
      away: snapshot.away?.[metric.espn]?.value ?? null,
    };
  }
  return rows;
}

export function initFixtureCharts() {
  const root = document.getElementById('analysis-charts');
  if (!root || root.dataset.enhanced === 'true') return;
  const container = root.querySelector('[data-chart-cards]');
  const status = root.querySelector('[data-chart-status]');
  const badge = root.querySelector('[data-chart-badge]');
  const provenance = root.querySelector('[data-chart-provenance]');
  if (!container || !status || !badge || !provenance) return;

  const official = readOfficialRows(document);
  const originalStatus = status.textContent;
  const originalProvenance = provenance.innerHTML;
  let source = 'uefa';
  let filter = 'all';
  let highlight = '';
  let snapshot = window.__smFixtureChartSnapshot;
  let previousCards = renderChartCards(official);
  let frame;
  const time = new Intl.DateTimeFormat('ar-EG', { timeZone: 'Africa/Cairo', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

  const animate = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bounds = root.getBoundingClientRect();
    if (bounds.bottom < 0 || bounds.top > window.innerHeight) return;
    container.classList.remove('fc-animate');
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(() => { frame = window.requestAnimationFrame(() => container.classList.add('fc-animate')); });
  };
  const applyFilter = () => {
    container.querySelectorAll('.fc-card').forEach(card => { card.hidden = filter !== 'all' && card.dataset.chartGroup !== filter; });
    root.querySelectorAll('[data-chart-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.chartFilter === filter)));
  };
  const update = () => {
    const rows = source === 'uefa' ? official : espnChartRows(snapshot);
    const cards = renderChartCards(rows);
    if (cards !== previousCards) {
      container.innerHTML = cards;
      previousCards = cards;
      applyFilter();
      animate();
    }
    root.dataset.source = source;
    root.querySelectorAll('[data-chart-source]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.chartSource === source)));
    if (source === 'uefa') {
      badge.textContent = 'أرقام نهائية';
      root.dataset.feedState = 'official';
      status.textContent = originalStatus;
      provenance.innerHTML = originalProvenance;
      return;
    }
    const hasValues = CHART_METRICS.some(metric => {
      const values = valuesFor(metric, rows);
      return values.home !== null || values.away !== null;
    });
    const failed = snapshot?.stale || ['error', 'offline', 'not-found', 'missing-stats'].includes(snapshot?.state);
    root.dataset.feedState = failed ? 'stale' : snapshot?.state || 'loading';
    badge.textContent = failed ? 'تعذّر التحديث' : snapshot?.state === 'live' ? 'المباراة جارية' : 'تحديث تلقائي';
    const message = typeof snapshot?.message === 'string' ? snapshot.message : 'في انتظار استجابة جدول المباريات';
    const date = snapshot?.checkedAt ? new Date(snapshot.checkedAt) : null;
    const checked = date && Number.isFinite(date.getTime()) ? ` · آخر قراءة إحصائية: ${time.format(date)} بتوقيت القاهرة` : '';
    status.textContent = `${message}${failed && hasValues ? ' · المعروض آخر أرقام مؤكدة وقد تكون قديمة' : ''}${!hasValues ? ' · لا تتوفر أرقام إحصائية مؤكدة للرسوم' : ''}${checked}`;
    provenance.textContent = 'تُراجع الأرقام كل دقيقة أثناء ظهور الصفحة واتصالها، عبر طلب جدول المباريات نفسه. لا توجد طلبات إضافية للرسوم، ولا تُستكمل القيم الناقصة من الأرقام النهائية.';
  };

  root.querySelector('[data-chart-controls]').hidden = false;
  // Keep the static explanation until enhancement actually succeeds, including
  // when scripts are blocked by browser policy rather than the HTML parser.
  const staticNote = root.querySelector('[data-chart-static-note]');
  if (staticNote) staticNote.hidden = true;
  root.dataset.enhanced = 'true';
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || !root.contains(button)) return;
    if (button.dataset.chartSource) {
      source = button.dataset.chartSource === 'espn' ? 'espn' : 'uefa';
      update();
    } else if (button.dataset.chartFilter) {
      filter = button.dataset.chartFilter;
      applyFilter();
      animate();
    } else if (button.dataset.chartHighlight) {
      highlight = highlight === button.dataset.chartHighlight ? '' : button.dataset.chartHighlight;
      root.dataset.highlight = highlight;
      root.querySelectorAll('[data-chart-highlight]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.chartHighlight === highlight)));
    }
  });
  document.addEventListener('sm:fixture-statistics', event => {
    if (event.detail?.source !== 'espn') return;
    snapshot = event.detail;
    if (source === 'espn') update();
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { animate(); observer.disconnect(); }
    }, { threshold: 0.08 });
    observer.observe(root);
  }
  update();
}

if (typeof document !== 'undefined') initFixtureCharts();
