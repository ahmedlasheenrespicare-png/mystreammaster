import { useEffect, useRef, useState } from "react";
import CarouselControls from "./CarouselControls";
import LeagueIconBadge from "./LeagueIconBadge";
import { useCarousel } from "./useCarousel";
import {
  refreshLiveLeaguesStandings,
  useLiveStandingsMap,
  type LiveLeagueRecord,
} from "../lib/live-standings";
import "./league-carousel.css";
import "./league-stats.css";

/* ==========================================================================
   شريط «إحصائيات البطولات» — كرت مختصر لكل بطولة في دوّارة بنفس نمط شريط
   الروابط الذي يعلوه (نفس الآلية من useCarousel ونفس أدوات التنقّل).
   --------------------------------------------------------------------------
   قواعد البيانات هنا نفس قواعد قسم «جدول الترتيب» في صفحات البطولات:
   • يشترك مع شريط «صفحات البطولات» في مخزن الترتيب الحيّ الموحّد
     (live-standings.ts): طلب واحد لكل بطولة من /standings.php يُحدّث
     الشريطين معاً عبر validateStandings وstandingsRates (الجدول القابل للفرز).
   • الجلب **حيّ عند الظهور**: لا يُطلب /standings.php إلا حين يصل الزائر إلى
     القسم فعلاً (IntersectionObserver)، ويُعاد كل REFRESH_MS ما دام القسم
     ظاهراً والصفحة مفتوحة ومتصلة.
   • لا تُستبدل قراءة أحدث بقراءة أقدم، والفشل يُبقي آخر أرقام مؤكَّدة.
========================================================================== */

/* تحديث الترتيب أبطأ من المباريات: خمس دقائق تكفي ولا تُنهِك الوسيط */
const REFRESH_MS = 300_000;

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

interface LeagueStatSummary {
  status: LiveLeagueRecord["status"];
  stale: boolean;
  season: number | null;
  bestAttack: { name: string; value: number }[];
  bestDefence: { name: string; value: number }[];
  totalGoals: number | null;
}

function summarizeRecord(record: LiveLeagueRecord | undefined): LeagueStatSummary | undefined {
  if (!record) return undefined;
  const rates = record.rates;
  const lead = (
    teams: { name?: string; attack: number | null; defence: number | null }[],
    field: "attack" | "defence",
  ) =>
    teams
      .map((team) => ({ name: team.name ?? "", value: team[field] }))
      .filter((team): team is { name: string; value: number } => typeof team.value === "number")
      .slice(0, 2);

  return {
    status: record.status,
    stale: record.stale,
    season: record.table?.season ?? null,
    bestAttack: rates ? lead(rates.bestAttack, "attack") : [],
    bestDefence: rates ? lead(rates.bestDefence, "defence") : [],
    totalGoals: rates?.league.totalGoals ?? null,
  };
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
  const liveMap = useLiveStandingsMap();

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

    const refresh = async () => {
      if (disposed || working || document.hidden || !navigator.onLine) return;
      working = true;
      controller = new AbortController();
      try {
        await refreshLiveLeaguesStandings(leagues, controller.signal);
      } finally {
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
            const stat = item.standingsLeagueId
              ? summarizeRecord(liveMap[item.standingsLeagueId])
              : undefined;
            return (
              <article
                key={item.href}
                className="league-stats-card"
                data-league={item.standingsLeagueId ?? ""}
                data-stat-status={stat?.status ?? "idle"}
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

function StatValue({
  value,
  unit,
  status,
}: {
  value: string | number | null;
  unit: string;
  status: LiveLeagueRecord["status"];
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
