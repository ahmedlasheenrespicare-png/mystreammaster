// Read-only pre-merge identity probe. No archive writes, no credentials, no aliases.
import fs from 'node:fs/promises';
const day = new Date().toISOString().slice(0, 10).replaceAll('-', '');
const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/sau.1/scoreboard?dates=${day}&limit=500`;
const report = { probedAt: new Date().toISOString(), requestedId: 'sau.1', url, verified: false };
try {
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  report.http = response.status;
  if (!response.ok) throw new Error(`UPSTREAM_HTTP_${response.status}`);
  const raw = await response.json();
  report.leagues = (raw.leagues ?? []).map(l => ({ id: l.id, uid: l.uid, slug: l.slug, name: l.name }));
  report.events = Array.isArray(raw.events) ? raw.events.length : null;
  report.verified = report.leagues.length === 1 && report.leagues[0].slug === 'sau.1' && Number.isInteger(report.events) && report.events > 0 && report.events < 500;
  if (!report.verified) report.code = 'SOURCE_NOT_VERIFIED_DO_NOT_SWITCH_LIVE_PROVIDER';
} catch (e) {
  report.code = /^UPSTREAM_HTTP_\d+$/.test(e.message) ? e.message : 'UPSTREAM_NETWORK_OR_INVALID_JSON';
}
await fs.mkdir('website/.fixtures-out', { recursive: true });
await fs.writeFile('website/.fixtures-out/saudi-probe.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
console.log('::notice title=Saudi fixture source probe::' + JSON.stringify(report).replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A'));
// A failed probe is an explicit warning, not permission to use another slug.
if (!report.verified) console.log('::warning::Saudi replacement not verified; retain source blocker in PR.');
