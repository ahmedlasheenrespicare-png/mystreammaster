import { useEffect } from "react";
import Hero from "../components/Hero";
import HeroValueCards from "../components/HeroValueCards";
// import FeaturedNewsCards from "../components/FeaturedNewsCards"; // مؤقتاً
import LibrarySection from "../components/LibrarySection";
import ContentTicker from "../components/ContentTicker";
import WordBand from "../components/WordBand";
import WatchGuide from "../components/WatchGuide";
import XtreamPlayer from "../components/XtreamPlayer";
import Pricing from "../components/Pricing";
import ServerFinder from "../components/ServerFinder";
import ServersComparison from "../components/ServersComparison";
import ChannelShowcase from "../components/ChannelShowcase";
import SetupGuide from "../components/SetupGuide";
import ShowcaseGrid from "../components/ShowcaseGrid";
import BlogTeaser from "../components/BlogTeaser";
import Testimonials from "../components/Testimonials";
import FAQ from "../components/FAQ";
import { PricingPlan } from "../data";

interface HomePageProps {
  currency: string;
  onCurrencyChange: (code: string) => void;
  onAddToCart: (plan: PricingPlan, months: "3" | "6" | "12" | "24", price: number) => void;
  highlightedPlanId?: string;
  onOpenTrial: () => void;
  onSelectPlan: (planId: string) => void;
}

/* ==========================================================================
   التمرير إلى القسم المطلوب عند فتح رابط فيه #hash
   --------------------------------------------------------------------------
   المتصفح ينفّذ تمرير الـhash قبل اكتمال التخطيط (خطوط/صور/أقسام تُرسم عند
   التحميل) فيبقى الزائر في أعلى الصفحة أحياناً. نعيد المحاولة بعد أول إطار
   وبعد اكتمال التحميل، فلا تفشل روابط الأقسام المباشرة (#faq، #xtream …).
========================================================================== */
function useHashScroll() {
  useEffect(() => {
    if (typeof window === "undefined" || !window.location.hash) return;
    const scroll = () => {
      const el = document.getElementById(window.location.hash.replace(/^#/, ""));
      /* "instant" تتجاوز scroll-behavior:smooth — القفز لرابط قسم يجب أن يصل فوراً
         لا أن ينساب على آلاف البكسلات فيصل الزائر متأخراً أو لا يصل */
      if (el) el.scrollIntoView({ block: "start", behavior: "instant" });
    };
    const raf = window.requestAnimationFrame(scroll);
    const timers = [250, 900, 1800].map((ms) => window.setTimeout(scroll, ms));
    window.addEventListener("load", scroll);
    return () => {
      window.cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("load", scroll);
    };
  }, []);
}

/* الصفحة الرئيسية — كل أقسام الموقع التسويقية في مكانها كما كانت */
export default function HomePage({
  currency,
  onCurrencyChange,
  onAddToCart,
  highlightedPlanId,
  onOpenTrial,
  onSelectPlan,
}: HomePageProps) {
  useHashScroll();

  return (
    <>
      <Hero onOpenTrial={onOpenTrial} />
      {/* أقسام خرجت من الهيرو في إعادة هيكلته: بطاقات القيمة ثم قسم المكتبة
          الداكن — بنفس ترتيبهما السابق (البطاقات قبل القسم الداكن) */}
      <HeroValueCards onOpenTrial={onOpenTrial} />
      {/* مؤقتاً: قسم الأخبار مخفي — أعد السطر التالي لإظهاره */}
      {/* <FeaturedNewsCards /> */}
      <LibrarySection />
      <ContentTicker />
      <WordBand />
      <WatchGuide />
      <XtreamPlayer />
      <Pricing
        currentCurrency={currency}
        onCurrencyChange={onCurrencyChange}
        onAddToCart={onAddToCart}
        highlightedPlanId={highlightedPlanId}
        homepageCardDesign
      />
      <ServerFinder onSelectPlan={onSelectPlan} onOpenTrial={onOpenTrial} />
      <ServersComparison />
      <ChannelShowcase />
      <SetupGuide />
      <ShowcaseGrid />
      <BlogTeaser />
      <Testimonials />
      <FAQ />
    </>
  );
}
