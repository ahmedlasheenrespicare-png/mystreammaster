import { useEffect, useRef, useState } from "react";
import CarouselControls from "./CarouselControls";
import LeagueIconBadge from "./LeagueIconBadge";
import { useCarousel } from "./useCarousel";
import snapshot from "../content/standings-snapshot.json";
import { standingsRates } from "../lib/fixtures-archive.mjs";
import {
  leagueStandingsByLeague,
  standingsUrl,
  validateStandings,
} from "../lib/standings.mjs";
import "./league-carousel.css";
import "./league-stats.css";

/* ==========================================================================
   شريط «إحصائيات البطولات» — كرت مختصر لكل بطولة في دوّارة بنفس نمط شريط
   الروابط الذي يعلوه (نفس الآلية من useCarousel ونفس أدوات التنقّل).
   --------------------------------------------------------------------------
   قواعد البيانات هنا نفس قواعد قسم «جدول الترتيب» في صفحات البطولات:
   • لا رقم يُحسب إلا من جدول ترتيب متحقق منه: validateStandings ترفض أي رد
     غير مستوفٍ للشروط، وstandingsRates تحسب المعدلات من الأهداف ÷ الملعوب.
   • المحتوى الأول من لقطة البناء المراجَعة (standings-snapshot.json) — نفس
     اللقطة التي تبدأ بها صفحات البطولات — فتظهر الأرقام في HTML دون انتظار
     JavaScript، ثم يتولاها التحديث الحيّ.
   • الجلب **حيّ عند الظهور**: لا يُطلب /standings.php إلا حين يصل الزائر إلى
     القسم فعلاً (IntersectionObserver)، ويُعاد كل REFRESH_MS ما دام القسم
     ظاهراً والصفحة مفتوحة ومتصلة.
   • لا تُستبدل قراءة أحدث بقراءة أقدم، والفشل يُبقي آخر أرقام مؤكَّدة؛
     وحالة القراءة (قديمة/فاشلة) محمولة في خصائص `data-stat-*` على الكرت لا
     في سطر نصي تحته — الكرت مختصر، والمقاييس نفسها تعرض «غير متاح» حين لا
     تتوفّر قراءة صحيحة أصلاً.
========================================================================== */

/* تحديث الترتيب أبطأ من المباريات: خمس دقائق تكفي ولا تُنهِك الوسيط */
const REFRESH_MS = 300_000;
const ABORT_MS = 12_000;
const CACHE_STALE_HEADER = "X-Standings-Cache";

export interface LeagueStatsItem {
  /** رابط صفحة البطولة — عنوان الكرت */
  href: string;
  /** اسم البطولة المختصر */
  name: string;
  /** معرّف البطولة لدى مصدر المباريات — مفتاح الأيقونة */
  leagueId: string;
  /** معرّف البطولة لدى مصدر الترتيب (قد يختلف: sau.1 مباريات وksa.1 ترتيب) */
  standingsLeagueId: string | null;
}

/** إحصائيات بطولة واحدة بعد التحقق والحساب — بلا أي رقم مخمَّن */
interface LeagueStat {
  status: "idle" | "loading" | "ready" | "failed";
  stale: boolean;
  season: number | null;
  fetchedAt: string | null;
  code?: string;
  /** أعلى معدل تسجيل — قد يتعادل فيه أكثر من فريق فيُعرض الأول بالترتيب */
  bestAttack: { name: string; value: number }[];
  /** أقل معدل استقبال */
  bestDefence: { name: string; value: number }[];
  totalGoals: number | null;
}

const EMPTY: LeagueStat = {
  status: "idle",
  stale: false,
  season: null,
  fetchedAt: null,
  bestAttack: [],
  bestDefence: [],
  totalGoals: null,
};

/* ملخّص كرت من جدول متحقق منه: اسم الفريق والمعدل وإجمالي الأهداف فقط —
   بلا تصنيف تكتيكي ولا جدول فرق، فالكرت مختصر بحكم موضعه في الصفحة. */
function summarize(table: ReturnType<typeof validateStandings>): LeagueStat {
  const rates = standingsRates(table.entries);
  const lead = (
    teams: { name?: string; attack: number | null; defence: number | null }[],
    field: "attack" | "defence",
  ) =>
    teams
      .map((team) => ({ name: team.name ?? "", value: team[field] }))
      .filter((team): team is { name: string; value: number } => typeof team.value === "number")
      .slice(0, 2);
  return {
    status: "ready",
    stale: table.stale === true,
    season: table.season,
    fetchedAt: table.fetchedAt,
    bestAttack: lead(rates.bestAttack, "attack"),
    bestDefence: lead(rates.bestDefence, "defence"),
    totalGoals: rates.league.totalGoals,
  };
}

/* اللقطة المراجَعة مصدر البداية: تُمرَّر في نفس التحقق (validateStandings)
   الذي يمرّ به ردّ الوسيط، فلا فرق في الصرامة بين ما يُرسم وما يُجلب. */
function fromSnapshot(league: string): LeagueStat | null {
  try {
    return summarize(leagueStandingsByLeague(snapshot, league));
  } catch {
    return null;
  }
}

function readCode(body: unknown, status: number): string {
  const code = (body as { code?: unknown } | null)?.code;
  if (typeof code === "string" && /^[A-Z0-9_]{3,40}$/.test(code)) return code;
  return `HTTP_${status}`;
}

interface Props {
  items: LeagueStatsItem[];
  title?: string;
  label?: string;
}

export default function LeagueStatsCarousel({
  items,
  title = "إحصائيات البطولات",
  label = "إحصائيات البطولات",
}: Props) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const carousel = useCarousel({ count: items.length, label });
  const [visible, setVisible] = useState(false);
  const [stats, setStats] = useState<Record<string, LeagueStat>>(() => {
    const initial: Record<string, LeagueStat> = {};
    for (const item of items) {
      if (!item.standingsLeagueId) continue;
      const stat = fromSnapshot(item.standingsLeagueId);
      if (stat) initial[item.standingsLeagueId] = stat;
    }
    return initial;
  });

  /* الجلب عند الظهور فقط: ثمانية طلبات في لحظة فتح الصفحة عبء بلا مقابل،
     والزائر الذي لا يصل إلى القسم لا يحتاج أرقامه أصلاً. */
  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const leagues = items
    .map((item) => item.standingsLeagueId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  useEffect(() => {
    if (!visible) return;
    if (!leagues.length) return;
    let disposed = false;
    let working = false;
    let controller: AbortController | undefined;

    const read = async (league: string) => {
      const response = await fetch(standingsUrl(league), {
        signal: controller?.signal,
        cache: "no-store",
        credentials: "omit",
        headers: { Accept: "application/json" },
      });
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      if (!response.ok || (body as { ok?: unknown } | null)?.ok !== true) {
        throw new Error(readCode(body, response.status));
      }
      const table = validateStandings(body, league);
      const next = summarize(table);
      if (table.stale || response.headers.get(CACHE_STALE_HEADER) === "STALE") next.stale = true;
      return next;
    };

    const refresh = async () => {
      if (disposed || working || document.hidden || !navigator.onLine) return;
      working = true;
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), ABORT_MS);
      try {
        const results = await Promise.allSettled(leagues.map(read));
        if (disposed) return;
        setStats((current) => {
          const next = { ...current };
          results.forEach((result, index) => {
            const league = leagues[index];
            if (result.status === "fulfilled") {
              const confirmed = next[league];
              /* لا تُستبدل قراءة أحدث بقراءة أقدم — نفس حكم صفحات البطولات */
              if (
                confirmed?.fetchedAt &&
                result.value.fetchedAt &&
                Date.parse(result.value.fetchedAt) < Date.parse(confirmed.fetchedAt)
              ) {
                return;
              }
              next[league] = result.value;
            } else {
              const code =
                result.reason instanceof Error ? result.reason.message : "UNAVAILABLE";
              /* القراءة السابقة تبقى ظاهرة مع وسم «قديمة»: الأرقام القديمة
                 المعلَنة خير من فراغ، والفشل لا يُخفى. */
              next[league] = previous(next[league], code);
            }
          });
          return next;
        });
      } finally {
        window.clearTimeout(timeout);
        working = false;
      }
    };

    void refresh();
    const timer = window.setInterval(() => {
      if (!document.hidden && navigator.onLine) void refresh();
    }, REFRESH_MS);
    const resume = () => {
      if (!document.hidden && navigator.onLine) void refresh();
    };
    document.addEventListener("visibilitychange", resume);
    return () => {
      disposed = true;
      controller?.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", resume);
    };
    /* `leagues` مصفوفة جديدة كل رسم: المفتاح الثابت هو محتواها */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, leagues.join(",")]);

  return (
    <section
      ref={sectionRef}
      className="league-carousel league-stats"
      aria-labelledby="league-stats-title"
      aria-roledescription="carousel"
      {...carousel.rootProps}
      data-fetched={visible ? "true" : "false"}
    >
      <div className="league-carousel-head">
        <strong id="league-stats-title">{title}</strong>
        <span className="league-carousel-count" aria-hidden="true">
          {items.length} بطولة
        </span>
      </div>

      <div className="league-carousel-viewport" {...carousel.viewportProps}>
        <div className="league-carousel-track" {...carousel.trackProps}>
          {items.map((item, index) => {
            const stat = item.standingsLeagueId ? stats[item.standingsLeagueId] : undefined;
            return (
              <article
                key={item.href}
                className="league-stats-card"
                data-league={item.standingsLeagueId ?? ""}
                data-stat-status={stat?.status ?? "idle"}
                /* حالة القراءة تُحمل في خاصية لا في نص: الكرت مختصر بلا سطر
                   قراءة، والقديم يُمَيَّز آلياً (اختبارات/تشخيص) بلا إطالة. */
                data-stat-stale={stat?.stale ? "true" : "false"}
              >
                <a
                  className="league-stats-link"
                  href={item.href}
                  draggable={false}
                  onFocus={() => carousel.goToIndex(index)}
                >
                  <LeagueIconBadge leagueId={item.leagueId} />
                  <span className="league-stats-name" title={item.name}>
                    {item.name}
                  </span>
                </a>

                <dl className="league-stats-metrics">
                  <div className="league-stats-metric" data-stat-metric="best-attack">
                    <dt>أقوى هجوم</dt>
                    <dd>
                      <StatValue
                        value={
                          stat?.bestAttack.length ? stat.bestAttack[0].value.toFixed(2) : null
                        }
                        unit="هدف/مباراة"
                        status={stat?.status ?? "idle"}
                      />
                      <span
                        className="league-stats-team"
                        data-stat-team
                        title={stat?.bestAttack.length ? stat.bestAttack[0].name : undefined}
                      >
                        {stat?.bestAttack.length ? stat.bestAttack[0].name : "—"}
                      </span>
                    </dd>
                  </div>
                  <div className="league-stats-metric" data-stat-metric="best-defence">
                    <dt>أقوى دفاع</dt>
                    <dd>
                      <StatValue
                        value={
                          stat?.bestDefence.length ? stat.bestDefence[0].value.toFixed(2) : null
                        }
                        unit="هدف/مباراة"
                        status={stat?.status ?? "idle"}
                      />
                      <span
                        className="league-stats-team"
                        data-stat-team
                        title={stat?.bestDefence.length ? stat.bestDefence[0].name : undefined}
                      >
                        {stat?.bestDefence.length ? stat.bestDefence[0].name : "—"}
                      </span>
                    </dd>
                  </div>
                  <div className="league-stats-metric" data-stat-metric="total-goals">
                    <dt>إجمالي الأهداف</dt>
                    <dd>
                      <StatValue
                        value={stat?.totalGoals ?? null}
                        unit="هدفاً"
                        status={stat?.status ?? "idle"}
                      />
                      <span className="league-stats-team" data-stat-team>
                        {stat?.season ? `موسم ${stat.season}` : "—"}
                      </span>
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      </div>

      <CarouselControls
        page={carousel.page}
        pages={carousel.pages}
        onStep={carousel.go}
        onSelect={carousel.setPage}
        dotsLabel="صفحات كروت الإحصائيات"
        nextLabel="البطولات التالية"
        prevLabel="البطولات السابقة"
      />
    </section>
  );
}

/* القراءة الفاشلة تُبقي آخر أرقام مؤكَّدة (وسم «قديمة»)، أو تعلن «غير متاح»
   إن لم يسبق أن وصلت قراءة صحيحة — ولا قيمة تُخترع في الحالتين. */
function previous(current: LeagueStat | undefined, code: string): LeagueStat {
  if (current && current.status === "ready") {
    return { ...current, stale: true, code };
  }
  return { ...EMPTY, status: "failed", code };
}

/* رقم أو «غير متاح» — ولا فرق بين نقص البيانات وبطء الجلب في العرض: الحالة
   تُحمل في `data-stat-status` ليقرأها الاختبار والأنماط، لا ليُخترع رقم. */
function StatValue({
  value,
  unit,
  status,
}: {
  value: string | number | null;
  unit: string;
  status: LeagueStat["status"];
}) {
  if (value === null || value === "") {
    return (
      <span className="league-stats-value is-empty" data-stat-value>
        {status === "failed" ? "غير متاح" : "—"}
      </span>
    );
  }
  return (
    <span className="league-stats-value" data-stat-value>
      <bdi dir="ltr">{typeof value === "number" ? value.toLocaleString("en-US") : value}</bdi>
      <span className="league-stats-unit">{unit}</span>
    </span>
  );
}
