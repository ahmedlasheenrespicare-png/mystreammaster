import Hero from "../components/Hero";
import ContentTicker from "../components/ContentTicker";
import WordBand from "../components/WordBand";
import LivePlayer from "../components/LivePlayer";
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

/* الصفحة الرئيسية — كل أقسام الموقع التسويقية في مكانها كما كانت */
export default function HomePage({
  currency,
  onCurrencyChange,
  onAddToCart,
  highlightedPlanId,
  onOpenTrial,
  onSelectPlan,
}: HomePageProps) {
  return (
    <>
      <Hero onOpenTrial={onOpenTrial} />
      <ContentTicker />
      <WordBand />
      <LivePlayer onOpenTrial={onOpenTrial} />
      <XtreamPlayer />
      <Pricing
        currentCurrency={currency}
        onCurrencyChange={onCurrencyChange}
        onAddToCart={onAddToCart}
        highlightedPlanId={highlightedPlanId}
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
