import { useEffect, useState } from "react";
import {
  LEAGUES,
  dayInZone,
  dayLabel,
  kickoff,
  matchesForDay,
  readScoreboardResponse,
  scoreboardUrl,
  type Match,
} from "../lib/matches.mjs";
import { to } from "../config";
import { FEATURED_NEWS } from "../content/featured-news";
import "./league-ticket.css";
import "./hero-side-tickets.css";

/* ==========================================================================
   تذكرتا جانبي الهيرو — يمين التذكرة الرئيسية: مباريات اليوم،
   يسارها: آخر الأخبار
   --------------------------------------------------------------------------
   • الشكل نفسه الذي تحمله تذكرة الهيرو الرئيسية (league-ticket.css): الإطار
     المضيء الشعاعي، اللوح الداكن، نقطة الضوء، الشعاع المموّه والخطوط
     المتقاطعة — بلا أي هوية بصرية جديدة.
   • المحتوى كلّه من مصادر الموقع نفسها ولا يُكتب يدوياً هنا:
       - مباريات اليوم: /scoreboard.php عبر lib/matches.mjs نفسه الذي تقرأ
         منه صفحة /matches/ وقسم «أخبار مميزة»، بتوقيت القاهرة. لا فرقَ
         ولا نتيجةَ ولا ملعباً يُخترع: الفريقان والوقت والنتيجة والحالة
         كلّها من المصدر، وعند تعذّره يُقال ذلك صريحاً بلا بديل وهمي.
       - الأخبار: content/featured-news.ts وحده (FEATURED_NEWS)، وكل بطاقة
         رابط إلى صفحة الخبر الداخلية نفسها.
   • كلاهما بلا أرقام أو وعود إضافية، والروابط تعمل بالكيبورد ولها تسميات
     مقروءة لقارئ الشاشة.
   ========================================================================== */

const HOME_ZONE = "Africa/Cairo";
/* كم مباراة تظهر داخل التذكرة اليمنى (الارتفاع محسوب لها: 3 صفوف) */
const MAX_ROWS = 3;

/* ترتيب العرض: المباشر أولاً، ثم لم تبدأ (بالتوقيت)، ثم المنتهية — المعلومة
   الأهمّ للمشاهد أولاً، ولا يتغيّر ترتيب الصفوف داخل المجموعة الواحدة */
function rank(match: Match): number {
  if (match.state === "live") return 0;
  if (match.state === "scheduled") return 1;
  return 2;
}

type TodayState =
  | { status: "loading"; matches: Match[] }
  | { status: "ready"; matches: Match[] }
  | { status: "error"; matches: Match[] };

/* نفس نمط جلب قسم «أخبار مميزة»: scoreboard.php لكل بطولة، Promise.allSettled،
   وإلغاء تلقائي بعد 15 ثانية — لكن ليوم واحد هو اليوم بتوقيت القاهرة */
function useTodayMatches(): TodayState {
  const [state, setState] = useState<TodayState>({ status: "loading", matches: [] });

  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    const day = dayInZone(new Date(), HOME_ZONE);

    const jobs = LEAGUES.map(async entry => {
      const response = await fetch(scoreboardUrl(entry.id, day), { signal: controller.signal, cache: "no-store" });
      return readScoreboardResponse(response, entry);
    });

    Promise.allSettled(jobs).then(results => {
      window.clearTimeout(timeout);
      if (disposed) return;
      const seen = new Set<string>();
      const matches: Match[] = [];
      let failed = 0;
      for (const result of results) {
        if (result.status !== "fulfilled") {
          failed += 1;
          continue;
        }
        for (const match of matchesForDay(result.value.matches as Match[], day, HOME_ZONE)) {
          if (seen.has(match.id)) continue;
          seen.add(match.id);
          matches.push(match);
        }
      }
      matches.sort((a, b) => rank(a) - rank(b) || Date.parse(a.date) - Date.parse(b.date) || a.id.localeCompare(b.id));
      setState({ status: failed === results.length ? "error" : "ready", matches });
    });

    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  return state;
}

/* عدد الأخبار بصيغة عربية سليمة (خبر واحد / خبران / 3 أخبار) */
function newsCountCaption(count: number): string {
  if (count === 0) return "";
  if (count === 1) return "خبر واحد";
  if (count === 2) return "خبران";
  return `${count} أخبار`;
}

function leagueName(id: string): string {
  return LEAGUES.find(league => league.id === id)?.name ?? "";
}

/* هيكل التذكرة المشترك — نفس طبقات league-ticket.css بالضبط */
function SideTicketShell({
  className = "",
  ariaLabel,
  children,
}: {
  className?: string;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={ariaLabel} className={`hero-side-ticket ${className}`}>
      <div className="league-ticket-bg league-ticket-holographic" aria-hidden="true">
        <span className="league-ticket-ray" />
        <span className="league-ticket-line league-ticket-line--top" />
        <span className="league-ticket-line league-ticket-line--bottom" />
        <span className="league-ticket-line league-ticket-line--left" />
        <span className="league-ticket-line league-ticket-line--right" />
      </div>
      <span className="league-ticket-symbol" aria-hidden="true" />
      <div className="hero-side-ticket-inner">{children}</div>
    </section>
  );
}

function SideTicketHead({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1 rounded-full bg-[#d8ff3e] px-2 py-0.5 text-[11px] font-black text-[#0b0b0f] lg:text-[10px]">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#0b0b0f]" />
        {title}
      </span>
      <span className="min-w-0 truncate text-[10px] font-bold text-white/65 lg:text-[9.5px]">{meta}</span>
    </div>
  );
}

/* --------------------------------------------------------------------------
   تذكرة يمين التذكرة الرئيسية — مباريات اليوم
   (حالة المباراة ونصّها من المصدر: مباشر / انتهت / لم تبدأ + التوقيت)
   -------------------------------------------------------------------------- */
export function HeroTodayMatchesTicket({ className = "" }: { className?: string }) {
  const { status, matches } = useTodayMatches();
  const today = dayInZone(new Date(), HOME_ZONE);
  const shown = matches.slice(0, MAX_ROWS);
  const rest = matches.length - shown.length;

  return (
    <SideTicketShell ariaLabel="مباريات اليوم" className={className}>
      <SideTicketHead title="مباريات اليوم" meta={dayLabel(today)} />

      <div className="mt-1 min-h-0 flex-1 overflow-hidden">
        {status === "loading" && (
          <p className="text-[12px] font-bold leading-relaxed text-white/45 lg:text-[10px]">جارٍ تحديث مواعيد اليوم…</p>
        )}

        {status === "error" && (
          <div className="text-[12px] font-bold leading-relaxed text-white/55 lg:text-[10px]">
            <p>تعذّر تحديث مواعيد اليوم الآن.</p>
            <a className="mt-1 inline-block font-black text-[#d8ff3e]" href={to("matches/")}>
              افتح صفحة المواعيد
            </a>
          </div>
        )}

        {status === "ready" && shown.length === 0 && (
          <div className="text-[12px] font-bold leading-relaxed text-white/55 lg:text-[10px]">
            <p>لا مباريات في البطولات المتابَعة اليوم.</p>
            <a className="mt-1 inline-block font-black text-[#d8ff3e]" href={to("matches/")}>
              كل المواعيد القادمة
            </a>
          </div>
        )}

        {shown.length > 0 && (
          <ul className="space-y-1">
            {shown.map(match => (
              <li key={match.id}>
                <a
                  href={to("matches/")}
                  className="block rounded-lg border border-white/[0.12] bg-[#0b0b0f]/45 px-2 py-1.5 transition-colors hover:border-[#d8ff3e]/50 hover:bg-[#0b0b0f]/70"
                >
                  <span className="flex items-center justify-between gap-1 text-[10px] font-bold text-white/60 lg:text-[9.5px]">
                    <span className="min-w-0 truncate">{leagueName(match.league)}</span>
                    {match.state === "live" ? (
                      <span className="inline-flex shrink-0 items-center gap-1 font-black text-[#ff6b5c]">
                        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#ff6b5c]" />
                        مباشر
                      </span>
                    ) : match.state === "finished" ? (
                      <span className="shrink-0 font-black text-white/55">انتهت</span>
                    ) : (
                      <span dir="ltr" className="shrink-0 font-black tabular-nums text-white/70">
                        {kickoff(match.date, HOME_ZONE)}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-1 text-[13px] font-black leading-tight lg:text-[11px]">
                    <span className="min-w-0 truncate">{match.home.name}</span>
                    {match.home.score != null && (
                      <span dir="ltr" className="shrink-0 tabular-nums text-white/70">
                        {match.home.score}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center justify-between gap-1 text-[13px] font-black leading-tight lg:text-[11px]">
                    <span className="min-w-0 truncate">{match.away.name}</span>
                    {match.away.score != null && (
                      <span dir="ltr" className="shrink-0 tabular-nums text-white/70">
                        {match.away.score}
                      </span>
                    )}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/10 pt-1.5 text-[10.5px] font-bold lg:text-[9.5px]">
        {rest > 0 ? <span className="text-white/45">و{rest} أخرى</span> : <span className="text-white/45">توقيت القاهرة</span>}
        <a className="shrink-0 font-black text-[#d8ff3e]" href={to("matches/")}>
          كل المواعيد
        </a>
      </div>
    </SideTicketShell>
  );
}

/* --------------------------------------------------------------------------
   تذكرة يسار التذكرة الرئيسية — آخر الأخبار
   (FEATURED_NEWS وحدها: العنوان والتصنيف والتاريخ من الملف نفسه)
   -------------------------------------------------------------------------- */
export function HeroNewsTicket({ className = "" }: { className?: string }) {
  const items = FEATURED_NEWS.slice(0, 2);

  return (
    <SideTicketShell ariaLabel="آخر الأخبار" className={className}>
      <SideTicketHead title="آخر الأخبار" meta={newsCountCaption(FEATURED_NEWS.length)} />

      <div className="mt-1 flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
        {items.map(item => (
          <a
            key={item.href}
            href={to(item.href)}
            className="flex flex-1 flex-col rounded-lg border border-white/[0.12] bg-[#0b0b0f]/45 px-2 py-1.5 transition-colors hover:border-[#d8ff3e]/50 hover:bg-[#0b0b0f]/70"
          >
            <span className="flex items-center justify-between gap-1 text-[10px] font-bold text-white/60 lg:text-[9.5px]">
              <span className="min-w-0 truncate">{item.category}</span>
              <span className="shrink-0">{item.dateLabel}</span>
            </span>
            <span className="mt-1 block line-clamp-2 text-[13px] font-black leading-snug lg:text-[11px]">{item.title}</span>
            {item.score && (
              <span dir="ltr" className="mt-auto block pt-1 text-[10.5px] font-black tabular-nums text-white/55 lg:text-[9.5px]">
                {item.score}
              </span>
            )}
          </a>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/10 pt-1.5 text-[10.5px] font-bold lg:text-[9.5px]">
        <span className="text-white/45">أخبار ومقالات الموقع</span>
        <a className="shrink-0 font-black text-[#d8ff3e]" href={to("blog/")}>
          المزيد
        </a>
      </div>
    </SideTicketShell>
  );
}
