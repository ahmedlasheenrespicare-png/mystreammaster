import { useEffect, useState } from 'react';
import { archiveTeamStats, cleanTeamName, validateArchive, type FixturesArchive } from '../lib/fixtures-archive.mjs';

// Build-time local JSON only. This component never fetches a provider or archive URL.
// Lazy per-file chunks prevent bundling all 12 leagues' archives into the main client JS bundle.
const lazyModules = import.meta.glob('../content/fixtures-archive/*/*.json', { import: 'default' });

function readInitialLeagueArchives(league: string): FixturesArchive[] {
  const ssrValues = (globalThis as { __SM_SSR_ARCHIVES__?: unknown[] }).__SM_SSR_ARCHIVES__;
  if (Array.isArray(ssrValues)) {
    return ssrValues
      .flatMap((value) => {
        try { return [validateArchive(value)]; } catch { return []; }
      })
      .filter((a) => a.league === league)
      .sort((a, b) => b.season.localeCompare(a.season));
  }
  if (typeof document !== 'undefined') {
    const el = document.querySelector(`script[data-archive-payload="${league}"]`);
    if (el?.textContent) {
      try {
        const parsed = JSON.parse(el.textContent);
        if (Array.isArray(parsed)) {
          return parsed
            .flatMap((value) => {
              try { return [validateArchive(value)]; } catch { return []; }
            })
            .filter((a) => a.league === league)
            .sort((a, b) => b.season.localeCompare(a.season));
        }
      } catch {
        /* ignore malformed inline payload */
      }
    }
  }
  return [];
}

const display = (v: number | null | undefined) => (v === null || v === undefined ? 'غير متاح' : String(v));
const statuses = {
  scheduled: 'مجدولة',
  live: 'جارية وقت الجلب',
  finished: 'منتهية',
  postponed: 'مؤجلة',
  cancelled: 'ملغاة',
  suspended: 'متوقفة',
  unknown: 'غير متاح',
};

export default function LeagueArchive({ league }: { league: string }) {
  const [available, setAvailable] = useState<FixturesArchive[]>(() => readInitialLeagueArchives(league));
  const [season, setSeason] = useState(() => available[0]?.season ?? '');

  useEffect(() => {
    const fromDom = readInitialLeagueArchives(league);
    if (fromDom.length > 0) {
      setAvailable(fromDom);
      setSeason((prev) => (fromDom.some((a) => a.season === prev) ? prev : fromDom[0]?.season ?? ''));
      return;
    }
    let cancelled = false;
    const loaders = Object.entries(lazyModules).filter(([key]) => key.includes(`/fixtures-archive/${league}/`));
    if (!loaders.length) {
      setAvailable([]);
      setSeason('');
      return;
    }
    void Promise.all(loaders.map(([, load]) => load().catch(() => null))).then((values) => {
      if (cancelled) return;
      const valid = values
        .flatMap((v) => {
          try { return [validateArchive(v)]; } catch { return []; }
        })
        .filter((a) => a.league === league)
        .sort((a, b) => b.season.localeCompare(a.season));
      setAvailable(valid);
      setSeason((prev) => (valid.some((a) => a.season === prev) ? prev : valid[0]?.season ?? ''));
    });
    return () => {
      cancelled = true;
    };
  }, [league]);

  const archive = available.find((a) => a.season === season) ?? available[0];
  const stats = archive ? archiveTeamStats(archive.matches) : [];
  const id = `archive-${league.replace(/\./g, '-')}`;

  /* القسم مخفي بطلب صريح (hidden = display:none): لأنه تفاعلي (محدّد
     موسم وجداول بروابط) فالإخفاء البصري يترك روابطه قابلة للتركيز
     خفيةً — والسمة تُبقي محتواه وبياناته في HTML (حِمل الأرشيف
     data-archive-payload الذي تغذّى منه بطاقة المعدلات سليم). */
  return (
    <section className="landing-section league-standings" hidden aria-labelledby={`${id}-title`} data-league-archive={league}>
      {available.length > 0 && (
        <script
          type="application/json"
          data-archive-payload={league}
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(available).replace(/</g, '\\u003c'),
          }}
        />
      )}
      <h2 id={`${id}-title`}>أرشيف المباريات والإحصائيات</h2>
      <p className="landing-notice">
        عرض من ملفات محلية، دون طلب بيانات خارجية. الإحصائيات تخص المباريات المنتهية ذات النتيجة المتوفرة في الأرشيف فقط، وليست إجمالي الموسم. سلاسل الفوز واللاهزيمة تخص التسلسل المخزن وقد تكون أقصر من السلسلة الفعلية.
      </p>
      {!archive ? (
        <p>غير متاح — لم تصل نسخة موثّقة لهذه البطولة بعد.</p>
      ) : (
        <>
          <label htmlFor={`${id}-season`}>الموسم </label>
          <select id={`${id}-season`} value={archive.season} onChange={(e) => setSeason(e.target.value)}>
            {available.map((a) => (
              <option key={a.season} value={a.season}>{a.season}</option>
            ))}
          </select>
          <p>
            نطاق البيانات المخزنة (UTC): <bdi>{archive.matches[0].date}</bdi> — <bdi>{archive.matches[archive.matches.length - 1].date}</bdi>. آخر تغير محفوظ:{' '}
            <bdi>{archive.matches.reduce((latest, m) => (m.fetchedAt > latest ? m.fetchedAt : latest), '')}</bdi>
          </p>
          <div className="ls-scroll" role="region" aria-label="إحصائيات النتائج المخزنة" tabIndex={0}>
            <table className="ls-table">
              <caption>أداء الفرق ضمن الأرشيف فقط — ف/ت/خ: فوز، تعادل، خسارة</caption>
              <thead>
                <tr>
                  {['الفريق', 'لعب', 'داخل الملعب: لعب · ف/ت/خ · له/عليه', 'خارج الملعب: لعب · ف/ت/خ · له/عليه', 'شباك نظيفة', 'سلسلة الفوز الحالية', 'سلسلة اللاهزيمة الحالية'].map((h) => (
                    <th scope="col" key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.map((t) => (
                  <tr key={t.id}>
                    <th scope="row"><bdi dir="auto">{cleanTeamName(t.name)}</bdi></th>
                    <td>{t.played}</td>
                    {(['home', 'away'] as const).map((side) => (
                      <td key={side}>
                        {t[side].played ? `${t[side].played} · ${t[side].wins}/${t[side].draws}/${t[side].losses} · ${t[side].goalsFor}/${t[side].goalsAgainst}` : 'غير متاح'}
                      </td>
                    ))}
                    <td>{t.cleanSheets}</td>
                    <td>{display(t.winningStreak)}</td>
                    <td>{display(t.unbeatenStreak)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!stats.length && <p>إحصائيات النتائج: غير متاح.</p>}
          <details>
            <summary>المباريات والحضور وإحصائيات المباراة ({archive.matches.length})</summary>
            <p>
              قد يرسل المصدر حضوراً بقيمة صفر قبل المباراة؛ الصفر هنا قيمة المصدر وليس تأكيداً للحضور الفعلي. الاستحواذ والتسديدات ودقة التمرير بالترتيب: المضيف / الضيف.
            </p>
            <div className="ls-scroll" role="region" aria-label="المباريات المؤرشفة" tabIndex={0}>
              <table className="ls-table">
                <caption>المواعيد UTC، والنتائج والإحصائيات كما توفرت من المصدر</caption>
                <thead>
                  <tr>
                    {['التاريخ UTC', 'المباراة', 'النتيجة', 'الحالة', 'الحضور', 'الاستحواذ %', 'التسديدات', 'دقة التمرير %', 'المصدر / تاريخ حفظ التغير'].map((h) => (
                      <th key={h} scope="col">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {archive.matches.map((m) => (
                    <tr key={m.id}>
                      <td><bdi>{m.date}</bdi></td>
                      <th scope="row">
                        <bdi dir="auto">{cleanTeamName(m.home.name)}</bdi> — <bdi dir="auto">{cleanTeamName(m.away.name)}</bdi>
                      </th>
                      <td>{display(m.score.home)} / {display(m.score.away)}</td>
                      <td>{statuses[m.status]}</td>
                      <td>{display(m.attendance)}</td>
                      {(['possession', 'shots', 'passAccuracy'] as const).map((k) => (
                        <td key={k}>{display(m.statistics?.home[k])} / {display(m.statistics?.away[k])}</td>
                      ))}
                      <td>
                        {m.source.provider}
                        <br />
                        <bdi>{m.fetchedAt}</bdi>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
