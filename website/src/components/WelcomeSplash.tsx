import { motionReduced } from "../lib/motion-preference";
import { useCallback, useEffect, useState } from "react";
import { BrandNewtStage } from "./BrandNewtStage";

const SESSION_KEY = "sm_welcome_intro_v1";

/** شاشة ترحيبية سينمائية سريعة عند فتح الصفحة الرئيسية (مرة واحدة في الجلسة،
    مع تخطٍّ تلقائي لزواحف البحث وأدوات الفحص وتفضيل تقليل الحركة). */
export default function WelcomeSplash({ activeRoute }: { activeRoute: string }) {
  const [phase, setPhase] = useState<"hidden" | "visible" | "leaving">("hidden");

  const dismiss = useCallback(() => {
    setPhase((cur) => (cur === "visible" ? "leaving" : cur));
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore private mode */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const normalized = activeRoute.replace(/\/+$/, "") || "/";
    if (normalized !== "/") return;

    const params = new URLSearchParams(window.location.search);
    const forceSplash = params.get("splash") === "1";

    if (!forceSplash) {
      if (params.has("nosplash") || params.has("trial") || window.location.hash) return;
      if (navigator.webdriver) return;
      if (/bot|crawl|spider|slurp|lighthouse|pagespeed|gtmetrix/i.test(navigator.userAgent)) return;
      if (motionReduced()) return;
      try {
        if (sessionStorage.getItem(SESSION_KEY) === "1") return;
      } catch {
        /* ignore */
      }
    }

    setPhase("visible");
    const leaveTimer = window.setTimeout(() => {
      dismiss();
    }, 2800);

    return () => window.clearTimeout(leaveTimer);
  }, [activeRoute, dismiss]);

  useEffect(() => {
    if (phase !== "leaving") return;
    const removeTimer = window.setTimeout(() => setPhase("hidden"), 460);
    return () => window.clearTimeout(removeTimer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "visible") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, dismiss]);

  if (phase === "hidden") return null;

  return (
    <div
      data-testid="welcome-splash"
      role="region"
      aria-label="شاشة ترحيب ستريم ماستر"
      onClick={dismiss}
      className={`sm-welcome-splash${phase === "leaving" ? " sm-welcome-splash--leaving" : ""}`}
    >
      <button
        type="button"
        data-testid="welcome-splash-skip"
        onClick={(e) => {
          e.stopPropagation();
          dismiss();
        }}
        className="sm-welcome-splash__skip"
      >
        تخطي الدخول ←
      </button>
      <BrandNewtStage variant="splash" hold />
    </div>
  );
}
