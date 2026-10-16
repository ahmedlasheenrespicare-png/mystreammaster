import {
  MATCH_ZONES,
  buildComparison,
  dayLabelInZone,
  formatInZone,
  isResultOfficial,
  kickoffLabel,
  mergeH2h,
  type Comparison,
  type MatchDefinition,
  type MatchEvent,
  type MatchLineups,
  type MatchSnapshot,
  type MatchStatus,
  type ScoredPlayer,
} from '../lib/match-center.mjs';
import MatchCenterRadar from './MatchCenterRadar';

/* ==========================================================================
   تبويبات مركز المباراة الخمسة — البنود 6 و7 و8 و9 و12
   --------------------------------------------------------------------------
   قاعدة واحدة تحكم الخمسة: **لا تُملأ خانة لم يرسل المصدر محتواها**. الناقص
   «غير متاح»، وغير المعلن «لم يُعلن بعد»، والصفر الحقيقي وحده هو الذي يُعرض
   صفراً. والتفريق بينهما مسؤولية كل تبويب، لا مسؤولية تنسيق عام.

   البند 12: لا يُنشأ تحليل تحريري آلياً، ولا تُنسب آراء إلى أشخاص بلا مادة
   منشورة موثقة. لذلك «بعد المباراة» يعرض حقائق مبنية على أحداث موثقة فقط.
========================================================================== */

export interface PanelProps {
  match: MatchDefinition;
  snapshot: MatchSnapshot | null;
  status: MatchStatus | null;
  /** `0` قبل التركيب — فلا يُرسم ما يحتاج ساعة في HTML الثابت. */
  now: number;
}

/** خانة ناقصة — البندان 6 و8. */
function Unavailable({ title, note }: { title: string; note?: string }) {
  return (
    <p className="mc-unavailable">
      <strong>{title}</strong>
      {note}
    </p>
  );
}

/* ─────────────────────────── 1) معاينة ─────────────────────────── */

export function PreviewPanel({ match, snapshot, status, now }: PanelProps) {
  const code = status?.code ?? 'scheduled';
  const started = code !== 'scheduled' && code !== 'postponed' && code !== 'delayed' && code !== 'canceled';

  /* البند 9: قبل اللقاء تُستخدم بيانات متجانسة لنفس المسابقة والفترة مع ذكر
     حجم العينة. وحتى يؤكد الفحص مفتاح المقاييس الأربعة وفترة عينتها
     (التقرير §12.5) لا تُرسم مقارنة، فتُعرض الرسالة بدل مضلع مضلِّل. */
  const comparison: Comparison = buildComparison(
    (snapshot?.seasonComparison ?? []).map(metric => ({ ...metric, mode: 'season' as const })),
    { mode: 'season', sample: snapshot?.seasonSample ?? null, provider: snapshot?.provider ?? null },
  );

  return (
    <div>
      <h2>معاينة المباراة</h2>
      <p>
        {match.competitionName}
        {match.season ? ` · موسم ${match.season}` : ''}
        {match.round ? ` · الجولة ${match.round}` : ''}
      </p>

      <dl className="mc-meta-facts" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '10px 18px', margin: '0 0 16px', padding: 0 }}>
        <div>
          <dt style={{ color: 'var(--mc-muted)', fontSize: '.72rem' }}>الموعد بتوقيت القاهرة</dt>
          <dd style={{ margin: 0, fontWeight: 800 }}>
            {kickoffLabel(match.kickoffUtc, 'Africa/Cairo')} — {dayLabelInZone(match.kickoffUtc, 'Africa/Cairo')}
          </dd>
        </div>
        <div>
          <dt style={{ color: 'var(--mc-muted)', fontSize: '.72rem' }}>الموعد بتوقيت مكة</dt>
          <dd style={{ margin: 0, fontWeight: 800 }}>{kickoffLabel(match.kickoffUtc, 'Asia/Riyadh')}</dd>
        </div>
        <div>
          <dt style={{ color: 'var(--mc-muted)', fontSize: '.72rem' }}>الملعب</dt>
          <dd style={{ margin: 0, fontWeight: 800 }} dir="auto">{match.venue ?? 'غير متاح'}</dd>
        </div>
        <div>
          <dt style={{ color: 'var(--mc-muted)', fontSize: '.72rem' }}>موعد المصدر (UTC)</dt>
          <dd style={{ margin: 0 }} className="mc-num" dir="ltr">{match.kickoffUtc}</dd>
        </div>
      </dl>

      {/* البند 6: «لم تبدأ» ولا تُعرض 0–0 نتيجةً مؤكدة قبل البداية. */}
      {!started && (
        <Unavailable
          title="لم تبدأ"
          note={`تبدأ الساعة ${kickoffLabel(match.kickoffUtc, 'Africa/Cairo')} بتوقيت القاهرة. لا تُعرض نتيجة قبل تأكيد المصدر بداية المباراة، ولا يقلبها العدّاد إلى «مباشر» من نفسه.`}
        />
      )}

      {(code === 'postponed' || code === 'delayed' || code === 'canceled') && (
        <Unavailable title={status?.label ?? 'الحالة غير محددة من المصدر'} note="الحالة من المصدر كما هي؛ لا يُستنتج موعد جديد ولا نتيجة." />
      )}

      <h3>مقارنة قبل اللقاء</h3>
      <MatchCenterRadar comparison={comparison} homeName={match.home.name} awayName={match.away.name} />

      <h3>الترتيب</h3>
      <p className="mc-note">
        يُعرض ترتيب {match.competitionName} من مصدر مشترك للمباريات الثلاث، ويُحدَّث بمعدل أقل من
        نتيجة المباراة حتى لا يتضاعف الطلب. إن تعذّرت قراءته تبقى الخانة «غير متاح» ولا يُعرض ترتيب قديم
        على أنه الحالي.
      </p>

      {now > 0 && (
        <p className="mc-note">
          المناطق الزمنية المعروضة: {MATCH_ZONES.join('، ')}. تُحسب عبر `Intl` بمناطق IANA، فلا تُضاف
          إزاحة ثابتة — القاهرة نفسها +03:00 في أكتوبر و+02:00 في نوفمبر.
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────── 2) المواجهات ─────────────────────────── */

export function HistoryPanel({ match, snapshot, status }: PanelProps) {
  /* البند 8: بعد تأكيد النهاية تُدخل هذه المباراة في آخر ثلاث مواجهات بلا
     تكرار. والبند 6: قبل اكتمالها لا تُدرج. `mergeH2h` تفعل الاثنين، وتشترط
     نتيجة رسمية — فمباراة أُلغيت بعد بدايتها «مكتملة» لكنها بلا نتيجة رسمية. */
  const official = isResultOfficial(status, snapshot?.score ?? null);
  const self = official && snapshot?.score
    ? {
      fixtureId: match.externalIds.espn ?? null,
      date: match.kickoffUtc,
      competition: match.competitionName,
      year: match.season ?? null,
      friendly: false,
      completed: true,
      home: match.home.name,
      away: match.away.name,
      homeGoals: snapshot.score.home,
      awayGoals: snapshot.score.away,
    }
    : null;

  const entries = mergeH2h(snapshot?.h2h ?? [], self, 3);

  return (
    <div>
      <h2>المواجهات السابقة</h2>
      <p>آخر ثلاث مواجهات مكتملة بين الفريقين، بنتيجة رسمية من المصدر.</p>

      {entries.length === 0 ? (
        <Unavailable
          title="غير متاح"
          note="لم يرسل المصدر مواجهات سابقة لهذه المباراة حتى لحظة القراءة، فلا يُختلق سجل ولا تُستنتج نتائج من أسماء الفرق."
        />
      ) : (
        <div className="mc-table-wrap">
          <table className="mc-table">
            <caption>المواجهات المكتملة — الوديات مستبعدة إن ميّزها المصدر</caption>
            <thead>
              <tr>
                <th scope="col">التاريخ</th>
                <th scope="col">المسابقة</th>
                <th scope="col">المواجهة</th>
                <th scope="col">النتيجة</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={entry.fixtureId ? `id-${entry.fixtureId}` : `${entry.date}-${index}`}>
                  <td className="mc-num">{formatInZone(entry.date, 'Africa/Cairo', { year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
                  <td>{entry.competition ?? 'غير متاح'}</td>
                  <td>{entry.home} × {entry.away}</td>
                  <td className="mc-num">
                    {entry.homeGoals ?? '—'} – {entry.awayGoals ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!official && (
        <p className="mc-note">
          هذه المباراة غير مُدرجة أعلاه: لا تُضاف إلى السجل قبل أن يؤكد المصدر نهايتها بنتيجة رسمية،
          فتظهر مواجهة بلا نتيجة أو تُخرج مواجهة صحيحة من الثلاث.
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────── 3) التشكيلات ─────────────────────────── */

function LineupSide({ name, side, provisionalNote }: { name: string; side: MatchLineups['home']; provisionalNote?: string }) {
  const list: ScoredPlayer[] = side.starters?.length ? side.starters : [];
  return (
    <section aria-labelledby={`mc-lineup-${name}`}>
      <h3 id={`mc-lineup-${name}`}>
        {name}
        {side.formation ? <span className="mc-team-tag"> · {side.formation}</span> : null}
      </h3>
      {/* البند 6: التشكيل المتوقع يجب أن يُوصف صراحةً بأنه متوقع. */}
      {!side.confirmed && <p className="mc-warning">تشكيل متوقع — لم يؤكده المصدر. الأسماء المتوقعة لا تُعرض كأنها مؤكدة.</p>}
      {side.coach && <p className="mc-note">المدرب: {side.coach}</p>}
      {provisionalNote && <p className="mc-note">{provisionalNote}</p>}
      {list.length === 0 ? (
        <Unavailable title="لم يُعلن بعد" />
      ) : (
        <ol className="mc-events">
          {list.map((player, index) => (
            <li className="mc-event" key={player.id ?? `${player.name}-${index}`}>
              <span className="mc-event-minute">{index + 1}</span>
              <span className="mc-event-body">
                {player.name}
                {player.rating !== null && player.rating !== undefined && (
                  <small>التقييم: <span className="mc-num">{new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(player.rating)}</span>{player.provisional ? ' (قابل للتغير)' : ''}</small>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function LineupsPanel({ match, snapshot }: PanelProps) {
  const lineups = snapshot?.lineups ?? null;

  return (
    <div>
      <h2>التشكيلات</h2>
      <p>تُعرض التشكيلات حين يؤكدها المصدر فقط، ولا يُخمَّن اسم لاعب.</p>

      {lineups?.announcedAt && (
        <p className="mc-note">
          أعلنها المصدر: <span className="mc-num">{formatInZone(lineups.announcedAt, 'Africa/Cairo', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}</span> بتوقيت القاهرة.
        </p>
      )}

      {!lineups ? (
        <>
          <Unavailable
            title="لم يُعلن بعد"
            note="لم يرسل المصدر تشكيلاً معلناً لهذه المباراة. لا تُعرض قائمة الفريق بديلاً عن التشكيل، ولا تُخمَّن أسماء."
          />
          <Unavailable
            title="تقييمات اللاعبين: غير متاح"
            note="المصدر المرتبط حالياً (ESPN) لا يوفّر تقييمات اللاعبين إطلاقاً، فهذه الخانة تبقى «غير متاح» بصفة نهائية لا معلّقة — ولا يُستعاض عنها بأرقام من مصدر آخر في نفس المقارنة."
          />
        </>
      ) : (
        <div style={{ display: 'grid', gap: 18 }}>
          <LineupSide name={match.home.name} side={lineups.home} />
          <LineupSide name={match.away.name} side={lineups.away} />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── 4) مباشر ─────────────────────────── */

const EVENT_KIND: Record<string, string> = {
  goal: 'goal', penalty: 'goal', own_goal: 'goal',
  yellow_card: 'card', red_card: 'card',
};

function eventKind(event: MatchEvent): string {
  if (event.cancelled) return 'cancelled';
  return EVENT_KIND[event.type] ?? 'other';
}

function eventTitle(event: MatchEvent): string {
  const labels: Record<string, string> = {
    goal: 'هدف', penalty: 'هدف من ركلة جزاء', own_goal: 'هدف عكسي', missed_penalty: 'ركلة جزاء مهدرة',
    yellow_card: 'بطاقة صفراء', red_card: 'بطاقة حمراء', substitution: 'تبديل',
    var_cancelled: 'مراجعة فيديو — إلغاء', var_confirmed: 'مراجعة فيديو — تأكيد', other: 'حدث',
  };
  return labels[event.type] ?? event.type;
}

export function LivePanel({ match, snapshot, status }: PanelProps) {
  const events = snapshot?.events ?? [];
  const statistics = snapshot?.statistics ?? null;
  const code = status?.code ?? 'scheduled';

  return (
    <div>
      <h2>مباشر</h2>
      <p>
        {status ? status.label : 'في انتظار أول قراءة من المصدر'}
        {/* البند 7: الوقت المعروض من المصدر، لا محسوباً محلياً من موعد البداية. */}
        {status?.clock ? <> · <span className="mc-num" dir="ltr">{status.clock}</span></> : null}
        {status?.period ? <> · الشوط <span className="mc-num">{new Intl.NumberFormat('ar-EG').format(status.period)}</span></> : null}
      </p>

      {code === 'scheduled' && (
        <Unavailable
          title="لم تبدأ"
          note="لا أحداث ولا إحصائيات قبل بداية المباراة. النتيجة لا تُعرض 0–0 لأن المصدر لم يؤكدها بعد."
        />
      )}

      {code === 'halftime' && <p className="mc-warning">استراحة بين الشوطين — الوقت متوقف عند {status?.clock ?? '—'}.</p>}
      {code === 'suspended' && <p className="mc-warning">المباراة متوقفة مؤقتاً. هذه حالة مستقلة عن النهاية، ولا تُعلن نتيجة نهائية.</p>}
      {code === 'delayed' && <p className="mc-warning">بداية متأخرة. الحالة من المصدر كما هي.</p>}

      <h3>أحداث المباراة</h3>
      {events.length === 0 ? (
        <Unavailable
          title="غير متاح"
          note="لم يرسل المصدر أحداثاً لهذه المباراة بعد. لا تُختلق أهداف ولا بطاقات، ولا يُستنتج حدث من تغيّر النتيجة وحده."
        />
      ) : (
        <ol className="mc-events">
          {events.map((event, index) => (
            <li className="mc-event" data-kind={eventKind(event)} key={event.id ?? `${event.type}-${event.minute}-${index}`}>
              <span className="mc-event-minute">
                {event.minute ?? '—'}{event.extraMinute !== null && event.extraMinute !== undefined ? `+${event.extraMinute}` : ''}
              </span>
              <span className="mc-event-body">
                {eventTitle(event)}
                {event.cancelled ? ' — أُلغي بعد مراجعة الفيديو' : ''}
                <small>
                  {[event.team, event.player?.name, event.relatedPlayer ? `بدلاً من ${event.relatedPlayer.name}` : null, event.detail]
                    .filter(Boolean).join(' · ') || 'تفاصيل غير متاحة'}
                </small>
              </span>
            </li>
          ))}
        </ol>
      )}

      <h3>إحصائيات المباراة</h3>
      {!statistics || statistics.length === 0 ? (
        <Unavailable
          title="غير متاح"
          note="لم يؤكد المصدر إحصائيات لهذه المباراة، فلا تُعرض أصفار بدلها ولا تُشتق من الأحداث."
        />
      ) : (
        <div className="mc-table-wrap">
          <table className="mc-table">
            <caption>أرقام المباراة كما أرسلها المصدر</caption>
            <thead>
              <tr><th scope="col">{match.home.name}</th><th scope="col">الإحصائية</th><th scope="col">{match.away.name}</th></tr>
            </thead>
            <tbody>
              {statistics.map(stat => (
                <tr key={stat.key}>
                  <td data-side="home">{stat.home ?? 'غير متاح'}</td>
                  <th scope="row">{stat.label}{stat.unit ? ` (${stat.unit})` : ''}</th>
                  <td data-side="away">{stat.away ?? 'غير متاح'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── 5) بعد المباراة ───────────────────────── */

export function ReportPanel({ match, snapshot, status }: PanelProps) {
  /* البند 8: لا يُعرض تقرير نهائي إلا بعد أن يؤكد المصدر النهاية. */
  const official = isResultOfficial(status, snapshot?.score ?? null);
  const events = snapshot?.events ?? [];
  const statistics = snapshot?.statistics ?? null;
  const ratings = snapshot?.ratings ?? null;
  const readAt = snapshot?.readAt ?? null;

  if (!official) {
    return (
      <div>
        <h2>بعد المباراة</h2>
        <Unavailable
          title={status?.code === 'abandoned' ? 'أُلغيت بعد بدايتها' : 'لم تنتهِ المباراة بعد'}
          note="لا يُعرض تقرير نهائي قبل أن يؤكد المصدر انتهاء المباراة بنتيجة رسمية. مرور 90 دقيقة على الساعة لا يعني النهاية."
        />
      </div>
    );
  }

  const goals = events.filter(event => ['goal', 'penalty', 'own_goal'].includes(event.type));
  const cancelled = events.filter(event => event.cancelled);
  const cards = events.filter(event => event.type === 'yellow_card' || event.type === 'red_card');

  return (
    <div>
      <h2>بعد المباراة</h2>
      <p>
        النتيجة النهائية: <b className="mc-num">{snapshot?.score?.home ?? '—'} – {snapshot?.score?.away ?? '—'}</b>
        {readAt && <> · قُرئت <span className="mc-num">{formatInZone(readAt, 'Africa/Cairo', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}</span> بتوقيت القاهرة</>}
      </p>

      {/* البند 8: «الحقائق» تُبنى من أحداث موثقة. لا تحليل تحريري آلي ولا
          آراء منسوبة لأشخاص — البند 12 يمنع ذلك صراحة. */}
      <h3>حقائق من أحداث المباراة</h3>
      {goals.length === 0 && cancelled.length === 0 && cards.length === 0 ? (
        <Unavailable title="غير متاح" note="لم يرسل المصدر أحداثاً موثقة تُبنى عليها الحقائق." />
      ) : (
        <ul className="mc-events">
          {goals.map((event, index) => (
            <li className="mc-event" data-kind="goal" key={event.id ?? `g-${index}`}>
              <span className="mc-event-minute">{event.minute ?? '—'}</span>
              <span className="mc-event-body">
                {eventTitle(event)} — {event.team ?? 'فريق غير محدد من المصدر'}
                {event.player?.name ? <small>{event.player.name}</small> : null}
              </span>
            </li>
          ))}
          {cancelled.map((event, index) => (
            <li className="mc-event" data-kind="cancelled" key={`c-${event.id ?? index}`}>
              <span className="mc-event-minute">{event.minute ?? '—'}</span>
              <span className="mc-event-body">هدف أُلغي بعد مراجعة الفيديو<small>{event.team ?? ''} {event.player?.name ?? ''}</small></span>
            </li>
          ))}
          {cards.length > 0 && (
            <li className="mc-event" data-kind="card">
              <span className="mc-event-minute">—</span>
              <span className="mc-event-body">
                بطاقات: <span className="mc-num">{new Intl.NumberFormat('ar-EG').format(cards.filter(c => c.type === 'yellow_card').length)}</span> صفراء،
                {' '}<span className="mc-num">{new Intl.NumberFormat('ar-EG').format(cards.filter(c => c.type === 'red_card').length)}</span> حمراء
              </span>
            </li>
          )}
        </ul>
      )}

      <h3>الإحصائيات النهائية</h3>
      {!statistics || statistics.length === 0 ? (
        <Unavailable title="غير متاح" note="لم يرسل المصدر إحصائيات. القيمة الناقصة تبقى «غير متاح» ولا تُعرض صفراً." />
      ) : (
        <div className="mc-table-wrap">
          <table className="mc-table">
            <caption>إحصائيات المباراة النهائية</caption>
            <thead>
              <tr><th scope="col">{match.home.name}</th><th scope="col">الإحصائية</th><th scope="col">{match.away.name}</th></tr>
            </thead>
            <tbody>
              {statistics.map(stat => (
                <tr key={stat.key}>
                  <td data-side="home">{stat.home ?? 'غير متاح'}</td>
                  <th scope="row">{stat.label}{stat.unit ? ` (${stat.unit})` : ''}</th>
                  <td data-side="away">{stat.away ?? 'غير متاح'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3>تقييمات اللاعبين</h3>
      {!ratings || ratings.length === 0 ? (
        <Unavailable
          title="غير متاح"
          note="المصدر المرتبط حالياً لا يوفّر تقييمات لاعبين. لا تُحسب تقييمات بديلة من الأحداث، ولا تُخلط بأرقام من مصدر آخر."
        />
      ) : (
        <ul className="mc-events">
          {ratings.map((player, index) => (
            <li className="mc-event" key={player.id ?? `${player.name}-${index}`}>
              <span className="mc-event-minute">{player.rating !== null ? new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(player.rating) : '—'}</span>
              <span className="mc-event-body">{player.name}{player.rating === null && <small>التقييم غير متاح</small>}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const PANELS = {
  preview: PreviewPanel,
  history: HistoryPanel,
  lineups: LineupsPanel,
  live: LivePanel,
  report: ReportPanel,
} as const;
