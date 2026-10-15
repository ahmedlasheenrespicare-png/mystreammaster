import { useCallback, useEffect, useState } from "react";
import { readCart, saveCart } from "./cart-storage";
import Pricing from "./components/Pricing";
import ServersComparison from "./components/ServersComparison";
import Header from "./components/Header";
import FloatingActions from "./components/FloatingActions";
import Footer from "./components/Footer";
import TrialModal from "./components/TrialModal";
import CartModal, { CartItem } from "./components/CartModal";
import { useRouter } from "./router";
import { applySeoToDocument } from "./seo";
import HomePage from "./pages/HomePage";
import ChannelsPage from "./pages/ChannelsPage";
import MatchesPage from "./pages/MatchesPage";
import LeagueLandingPage from "./pages/LeagueLandingPage";
import TeamLandingPage from "./pages/TeamLandingPage";
import PlanPage from "./pages/PlanPage";
import BlogIndexPage from "./pages/BlogIndexPage";
import BlogPostPage from "./pages/BlogPostPage";
import NotFoundPage from "./pages/NotFoundPage";
import FaqPage from "./pages/FaqPage";
import TrialPage from "./pages/TrialPage";
import EnHomePage from "./pages/EnHomePage";
import EnPlanPage from "./pages/EnPlanPage";
import EnFaqPage from "./pages/EnFaqPage";
import EnHeader from "./components/EnHeader";
import EnFooter from "./components/EnFooter";
import { isEnPath } from "./i18n";
import { BLOG_POSTS } from "./content/posts";
import { LEAGUE_LANDINGS, TEAM_LANDINGS } from "./content/competitions";
import { PRICING_PLANS, PricingPlan } from "./data";
import { ScrollProgress, SmoothScroll } from "./components/motion";

export default function App() {
  const { path } = useRouter();
  const [currency, setCurrency] = useState<string>("USD");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isTrialOpen, setIsTrialOpen] = useState(false);
  const [highlightedPlanId, setHighlightedPlanId] = useState<string | undefined>(undefined);

  useEffect(() => {
    setCartItems(readCart());
    setCartReady(true);
    if (new URLSearchParams(location.search).has("trial")) setIsTrialOpen(true);
    const onStorage = () => setCartItems(readCart());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  useEffect(() => { if (cartReady) saveCart(cartItems); }, [cartItems, cartReady]);

  /* تحديث وسوم الرأس (العنوان والوصف وcanonical) مع كل تنقّل داخل الموقع */
  useEffect(() => {
    applySeoToDocument(path);
  }, [path]);

  /* مرجع ثابت للدوال — يمنع إعادة رسم الأقسام الثقيلة (المشغلات) عند كل تغيير حالة */
  const openTrial = useCallback(() => setIsTrialOpen(true), []);
  const closeTrial = useCallback(() => setIsTrialOpen(false), []);
  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const handleAddToCart = useCallback(
    (plan: PricingPlan, months: "3" | "6" | "12" | "24", price: number) => {
      setCartItems((prev) => [
        ...prev,
        { id: `${plan.id}-${months}-${Date.now()}`, plan, months, price, currency },
      ]);
      setIsCartOpen(true);
    },
    [currency]
  );

  const handleRemoveCartItem = useCallback((id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleClearCart = useCallback(() => setCartItems([]), []);

  const handleSelectPlanFromFinder = useCallback((planId: string) => {
    setHighlightedPlanId(planId);
    const el = document.getElementById("pricing");
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }, []);

  /* ===== توجيه الصفحات ===== */
  const enPlan = PRICING_PLANS.find((p) => path === `/en/${p.serverCode}`);
  const plan = PRICING_PLANS.find((p) => path === `/${p.serverCode}`);
  const post = BLOG_POSTS.find((p) => path === `/blog/${p.slug}`);
  const leagueLanding = LEAGUE_LANDINGS.find((l) => path === `/matches/${l.slug}`);
  const teamLanding = TEAM_LANDINGS.find((t) => path === `/world-cup-2026/${t.slug}`);

  let page;
  if (path === "/en") {
    page = <EnHomePage />;
  } else if (enPlan) {
    page = <EnPlanPage plan={enPlan} />;
  } else if (path === "/en/faq") {
    page = <EnFaqPage />;
  } else if (path === "/") {
    page = (
      <HomePage
        currency={currency}
        onCurrencyChange={setCurrency}
        onAddToCart={handleAddToCart}
        highlightedPlanId={highlightedPlanId}
        onOpenTrial={openTrial}
        onSelectPlan={handleSelectPlanFromFinder}
      />
    );
  } else if (path === "/store" || path === "/servers") {
    page = <div className="pt-[140px]"><nav className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 text-[12.5px] font-bold text-black/40 pt-6" aria-label="مسار التصفح"><a href="/" className="hover:text-black transition">الرئيسية</a><span className="mx-2">/</span><span className="text-black/70">{path === "/store" ? "المتجر" : "السيرفرات والباقات"}</span></nav><h1 className="text-center font-display text-4xl font-black pt-8">باقات ستريم ماستر</h1><Pricing currentCurrency={currency} onCurrencyChange={setCurrency} onAddToCart={handleAddToCart} />{path === "/servers" && <ServersComparison />}</div>;
  } else if (path === "/faq") {
    page = <FaqPage />;
  } else if (path === "/trial") {
    page = <TrialPage onOpenTrial={openTrial} />;
  } else if (path === "/cart") {
    page = <section className="pt-[180px] pb-24 px-5 text-center max-w-3xl mx-auto"><p className="text-[#2b4eff] font-bold mb-4">طلب التفعيل التقني يبدأ هنا</p><h1 className="font-display text-5xl font-black">سلة المشتريات</h1><p className="my-6 text-black/60">راجع الباقات المختارة وأكمل طلبك مع فريقنا عبر واتساب.</p><button onClick={openCart} className="rounded-full bg-[#0b0b0f] text-[#d8ff3e] font-bold px-8 py-4">عرض السلة ({cartItems.length})</button><a href="/store/" className="inline-block mx-4 font-bold underline">متابعة التسوق</a></section>;
  } else if (leagueLanding) {
    page = <LeagueLandingPage landing={leagueLanding} />;
  } else if (teamLanding) {
    page = <TeamLandingPage landing={teamLanding} />;
  } else if (path === "/matches") {
    page = <MatchesPage />;
  } else if (path === "/channels") {
    page = <ChannelsPage />;
  } else if (path === "/blog") {
    page = <BlogIndexPage />;
  } else if (post) {
    page = <BlogPostPage post={post} />;
  } else if (plan) {
    /* العملة تُمرَّر من هنا (مصدر واحد) — وإلا أضاف المستخدم باقة بسعر عملة
       صفحة الباقة بينما تُسجَّل في السلة بعملة أخرى (خطأ سعري حقيقي). */
    page = (
      <PlanPage
        plan={plan}
        currency={currency}
        onCurrencyChange={setCurrency}
        onOpenTrial={openTrial}
        onAddToCart={handleAddToCart}
      />
    );
  } else {
    page = <NotFoundPage />;
  }

  return (
    <div
      className="min-h-screen bg-[#faf9f6] text-[#0b0b0f] flex flex-col font-sans selection:bg-[#0b0b0f] selection:text-[#d8ff3e]"
      dir={isEnPath(path) ? "ltr" : "rtl"}
    >
      <ScrollProgress />
      <SmoothScroll />

      {isEnPath(path) ? (
        <EnHeader />
      ) : (
        <Header
          currentCurrency={currency}
          onCurrencyChange={setCurrency}
          cartCount={cartItems.length}
          onOpenCart={openCart}
          onOpenTrial={openTrial}
        />
      )}

      <a href="#main-content" className="skip-link">{isEnPath(path) ? "Skip to content" : "تخطي إلى المحتوى"}</a>
      <main id="main-content" className="flex-1">{page}</main>

      {isEnPath(path) ? <EnFooter /> : <Footer onOpenTrial={openTrial} />}
      <FloatingActions onOpenTrial={openTrial} />

      <TrialModal isOpen={isTrialOpen} onClose={closeTrial} />

      <CartModal
        isOpen={isCartOpen}
        onClose={closeCart}
        items={cartItems}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        currentCurrency={currency}
      />
    </div>
  );
}
