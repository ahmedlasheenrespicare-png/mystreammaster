import { useState } from 'react';
import { archiveTeamStats, validateArchive, type FixturesArchive } from '../lib/fixtures-archive.mjs';
// Build-time local JSON only. This component never fetches a provider or archive URL.
const modules = import.meta.glob('../content/fixtures-archive/*/*.json', { eager: true, import: 'default' });
const archives: FixturesArchive[] = Object.values(modules).flatMap(value => {
  try { return [validateArchive(value)]; } catch { return []; }
});
const display = (v: number | null | undefined) => v === null || v === undefined ? 'غير متاح' : String(v);
const statuses = { scheduled: 'مجدولة', live: 'جارية وقت الجلب', finished: 'منتهية', postponed: 'مؤجلة', cancelled: 'ملغاة', suspended: 'متوقفة', unknown: 'غير متاح' };
export default function LeagueArchive({ league }: { league: string }) {
  const available = archives.filter(a => a.league === league).sort((a,b) => b.season.localeCompare(a.season));
  const [season, setSeason] = useState(available[0]?.season ?? '');
  const archive = available.find(a => a.season === season);
  const stats = archive ? archiveTeamStats(archive.matches) : [];
  const id = `archive-${league.replace(/\./g, '-')}`;
  return <section className="landing-section league-standings" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>أرشيف المباريات والإحصائيات</h2>
    <p className="landing-notice">عرض من ملفات محلية، دون طلب بيانات خارجية. الإحصائيات تخص المباريات المنتهية ذات النتيجة المتوفرة في الأرشيف فقط، وليست إجمالي الموسم. سلاسل الفوز واللاهزيمة تخص التسلسل المخزن وقد تكون أقصر من السلسلة الفعلية.</p>
    {!archive ? <p>غير متاح — لم تصل نسخة موثّقة لهذه البطولة بعد.</p> : <>
      <label htmlFor={`${id}-season`}>الموسم </label>
      <select id={`${id}-season`} value={season} onChange={e => setSeason(e.target.value)}>{available.map(a => <option key={a.season}>{a.season}</option>)}</select>
      <p>نطاق البيانات المخزنة (UTC): <bdi>{archive.matches[0].date}</bdi> — <bdi>{archive.matches[archive.matches.length - 1].date}</bdi>. آخر تغير محفوظ: <bdi>{archive.matches.reduce((latest, m) => m.fetchedAt > latest ? m.fetchedAt : latest, '')}</bdi></p>
      <div className="ls-scroll" role="region" aria-label="إحصائيات النتائج المخزنة" tabIndex={0}>
        <table className="ls-table"><caption>أداء الفرق ضمن الأرشيف فقط — ف/ت/خ: فوز، تعادل، خسارة</caption>
          <thead><tr>{['الفريق', 'لعب', 'داخل الملعب: لعب · ف/ت/خ · له/عليه', 'خارج الملعب: لعب · ف/ت/خ · له/عليه', 'شباك نظيفة', 'سلسلة الفوز الحالية', 'سلسلة اللاهزيمة الحالية'].map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead>
          <tbody>{stats.map(t => <tr key={t.id}><th scope="row">{t.name}</th><td>{t.played}</td>{(['home', 'away'] as const).map(side => <td key={side}>{t[side].played ? `${t[side].played} · ${t[side].wins}/${t[side].draws}/${t[side].losses} · ${t[side].goalsFor}/${t[side].goalsAgainst}` : 'غير متاح'}</td>)}<td>{t.cleanSheets}</td><td>{display(t.winningStreak)}</td><td>{display(t.unbeatenStreak)}</td></tr>)}</tbody>
        </table>
      </div>
      {!stats.length && <p>إحصائيات النتائج: غير متاح.</p>}
      <details><summary>المباريات والحضور وإحصائيات المباراة ({archive.matches.length})</summary>
        <p>قد يرسل المصدر حضوراً بقيمة صفر قبل المباراة؛ الصفر هنا قيمة المصدر وليس تأكيداً للحضور الفعلي. الاستحواذ والتسديدات ودقة التمرير بالترتيب: المضيف / الضيف.</p>
        <div className="ls-scroll" role="region" aria-label="المباريات المؤرشفة" tabIndex={0}><table className="ls-table"><caption>المواعيد UTC، والنتائج والإحصائيات كما توفرت من المصدر</caption>
          <thead><tr>{['التاريخ UTC', 'المباراة', 'النتيجة', 'الحالة', 'الحضور', 'الاستحواذ %', 'التسديدات', 'دقة التمرير %', 'المصدر / تاريخ حفظ التغير'].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
          <tbody>{archive.matches.map(m => <tr key={m.id}><td><bdi>{m.date}</bdi></td><th scope="row">{m.home.name} — {m.away.name}</th><td>{display(m.score.home)} / {display(m.score.away)}</td><td>{statuses[m.status]}</td><td>{display(m.attendance)}</td>{(['possession', 'shots', 'passAccuracy'] as const).map(k => <td key={k}>{display(m.statistics?.home[k])} / {display(m.statistics?.away[k])}</td>)}<td>{m.source.provider}<br/><bdi>{m.fetchedAt}</bdi></td></tr>)}</tbody>
        </table></div>
      </details>
    </>}
  </section>;
}
