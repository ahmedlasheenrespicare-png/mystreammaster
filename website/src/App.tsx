import "./mobile-rendering.css";
import MotionSettings from "./components/MotionSettings";
import { useCallback, useEffect, useState } from "react";
import { readCart, saveCart } from "./cart-storage";
import Pricing from "./components/Pricing";
import ServersComparison from "./components/ServersComparison";
import { UnifiedHeader, UnifiedFooter } from "./components/UnifiedShell";
import FloatingActions from "./components/FloatingActions";
import TrialModal from "./components/TrialModal";
import CartModal, { CartItem } from "./components/CartModal";
import WelcomeSplash from "./components/WelcomeSplash";
import { useRouter } from "./router";
import { applySeoToDocument } from "./seo";
import HomePage from "./pages/HomePage";
import ChannelsPage from "./pages/ChannelsPage";
import ChannelCategoryPage from "./pages/ChannelCategoryPage";
import MatchesPage from "./pages/MatchesPage";
import LeagueLandingPage from "./pages/LeagueLandingPage";
import MatchCenterPage from "./pages/MatchCenterPage";
import MatchCenterHubPage from "./pages/MatchCenterHubPage";
import TeamLandingPage from "./pages/TeamLandingPage";
import ClubLandingPage from "./pages/ClubLandingPage";
import PlanPage from "./pages/PlanPage";
import BlogIndexPage from "./pages/BlogIndexPage";
import BlogPostPage from "./pages/BlogPostPage";
import NotFoundPage from "./pages/NotFoundPage";
import FaqPage from "./pages/FaqPage";
import TrialPage from "./pages/TrialPage";
import EnHomePage from "./pages/EnHomePage";
import EnPlanPage from "./pages/EnPlanPage";
import EnFaqPage from "./pages/EnFaqPage";
import { isEnPath } from "./i18n";
import { BLOG_POSTS } from "./content/posts";
import { CLUB_LANDINGS, LEAGUE_LANDINGS, TEAM_LANDINGS } from "./content/competitions";
import { CHANNEL_CATEGORY_PAGES } from "./content/channel-categories";
import { matchByRoute } from "./content/match-center.mjs";
import { PRICING_PLANS, PricingPlan } from "./data";
import { ScrollProgress, SmoothScroll } from "./components/motion";
import { trackSiteEvent } from "./lib/analytics";

export default function App() {
  const { path } = useRouter();
  const [currency, setCurrency] = useState<string>("USD");
  const [currencyReady, setCurrencyReady] = useState(false);
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
  useEffect(() => {
    try {
      const value = localStorage.getItem('sm-reference-currency');
      if (value && ['USD', 'SAR', 'EGP', 'AED', 'KWD'].includes(value)) setCurrency(value);
    } catch { /* Storage may be unavailable. */ }
    setCurrencyReady(true);
  }, []);
  useEffect(() => {
    if (!currencyReady) return;
    try { localStorage.setItem('sm-reference-currency', currency); } catch { /* Use this session only. */ }
  }, [currency, currencyReady]);

  /* تحديث وسوم الرأس (العنوان والوصف وcanonical) مع كل تنقّل داخل الموقع */
  useEffect(() => {
    applySeoToDocument(path);
  }, [path]);

  /* قياس انتقال زائر المباريات/الأخبار إلى صفحات التجربة أو الباقات، دون
     تغيير أي نص أو معرّف GA4. يُسجَّل المسار المصدر فقط، بلا query strings. */
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element
        ? event.target
        : event.target instanceof Node
          ? event.target.parentElement
          : null;
      const link = target?.closest<HTMLAnchorElement>("a[href]");
      if (!link) return;

      let destination: URL;
      try {
        destination = new URL(link.href, window.location.href);
      } catch {
        return;
      }
      if (destination.origin !== window.location.origin) return;

      const destinationPath = destination.pathname.replace(/\/+$/, "") || "/";
      const plan = PRICING_PLANS.find(({ serverCode }) =>
        destinationPath === `/${serverCode}` || destinationPath === `/en/${serverCode}`
      );
      const ctaType = destinationPath === "/trial"
        ? "trial"
        : plan
          ? "plan"
          : destinationPath === "/store" || destination.hash === "#pricing"
            ? "pricing"
            : null;
      if (!ctaType) return;

      trackSiteEvent("commercial_cta_click", {
        cta_type: ctaType,
        cta_location: "link",
        source_path: path,
        target_path: `${destinationPath}${destination.hash}`,
        ...(plan ? { plan_code: plan.serverCode } : {}),
      });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [path]);

  /* مرجع ثابت للدوال — يمنع إعادة رسم الأقسام الثقيلة (المشغلات) عند كل تغيير حالة */
  const openTrial = useCallback(() => {
    trackSiteEvent("commercial_cta_click", {
      cta_type: "trial",
      cta_location: "trial_modal",
      source_path: path,
      target_path: "trial_modal",
    });
    setIsTrialOpen(true);
  }, [path]);
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
  /* مركز المباراة: /matches/{البطولة}/{المباراة} — ثلاثة مقاطع، فلا يتقاطع
     مع مسار هبوط البطولة ذي المقطعين. */
  const matchCenter = matchByRoute(path);
  const leagueLanding = LEAGUE_LANDINGS.find((l) => path === `/matches/${l.slug}`);
  const teamLanding = TEAM_LANDINGS.find((t) => path === `/world-cup-2026/${t.slug}`);
  const clubLanding = CLUB_LANDINGS.find((c) => path === `/teams/${c.slug}`);
  const channelCategory = CHANNEL_CATEGORY_PAGES.find((category) => path === `/channels/${category.slug}`);

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
    const isComparison = path === "/servers";
    page = (
      <div className="pt-[104px]">
        <nav className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 text-[12.5px] font-bold text-black/40 pt-6" aria-label="مسار التصفح">
          <a href="/" className="hover:text-black transition">الرئيسية</a><span className="mx-2">/</span><span className="text-black/70">{isComparison ? "السيرفرات والباقات" : "المتجر"}</span>
        </nav>
        <div className="text-center max-w-3xl mx-auto px-5 pt-8">
          <h1 className="font-display text-4xl font-black">{isComparison ? "مقارنة السيرفرات والباقات" : "اشتراك IPTV وباقات التفعيل"}</h1>
          <p className="mt-4 text-black/60 leading-relaxed">
            {isComparison
              ? "قارن نوفا وإيستار وموكا وX بحسب المواصفات المعروضة، ثم راجع تفاصيل الباقة والسعر المناسبين لك قبل الطلب."
              : "تصفّح باقات نوفا وإيستار وموكا وX، واختر المدة والعملة لمراجعة السعر قبل إضافة الباقة إلى السلة."}
          </p>
          <a className="inline-block mt-4 text-[#2b4eff] font-bold underline underline-offset-4" href={isComparison ? "#servers-compare" : "/servers/"}>
            {isComparison ? "انتقل إلى جدول المقارنة" : "قارن السيرفرات قبل اختيار الباقة"}
          </a>
        </div>
        <Pricing currentCurrency={currency} onCurrencyChange={setCurrency} onAddToCart={handleAddToCart} />
        {isComparison && <ServersComparison />}
      </div>
    );
  } else if (path === "/faq") {
    page = <FaqPage />;
  } else if (path === "/trial") {
    page = <TrialPage onOpenTrial={openTrial} />;
  } else if (path === "/cart") {
    page = <section className="pt-[144px] pb-24 px-5 text-center max-w-3xl mx-auto"><p className="text-[#2b4eff] font-bold mb-4">طلب التفعيل التقني يبدأ هنا</p><h1 className="font-display text-5xl font-black">سلة المشتريات</h1><p className="my-6 text-black/60">راجع الباقات المختارة وأكمل طلبك مع فريقنا عبر واتساب.</p><button onClick={openCart} className="rounded-full bg-[#0b0b0f] text-[#d8ff3e] font-bold px-8 py-4">عرض السلة ({cartItems.length})</button><a href="/store/" className="inline-block mx-4 font-bold underline">متابعة التسوق</a></section>;
  } else if (matchCenter) {
    page = <MatchCenterPage match={matchCenter} />;
  } else if (path === "/match-center") {
    page = <MatchCenterHubPage />;
  } else if (leagueLanding) {
    page = <LeagueLandingPage landing={leagueLanding} />;
  } else if (teamLanding) {
    page = <TeamLandingPage landing={teamLanding} />;
  } else if (clubLanding) {
    page = <ClubLandingPage landing={clubLanding} />;
  } else if (path === "/matches") {
    page = <MatchesPage />;
  } else if (channelCategory) {
    page = <ChannelCategoryPage category={channelCategory} />;
  } else if (path === "/channels") {
    page = <ChannelsPage />;
  } else if (path === "/blog") {
    page = <BlogIndexPage />;
  } else if (post) {
    /* العملة من الهيدر: أسعار كروت المقال وجدوله تتبع اختيار الزائر */
    page = <BlogPostPage post={post} currency={currency} />;
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
      className="min-h-screen bg-[#f5ece8] text-[#0b0b0f] flex flex-col font-sans selection:bg-[#0b0b0f] selection:text-[#d8ff3e]"
      dir={isEnPath(path) ? "ltr" : "rtl"}
    >
      <MotionSettings english={isEnPath(path)} />
      <ScrollProgress />
      <SmoothScroll />
      {!isEnPath(path) && <WelcomeSplash activeRoute={path} />}

      <UnifiedHeader path={path} currency={currency} onCurrencyChange={setCurrency} cartCount={cartItems.length} cartOpen={isCartOpen} onOpenCart={openCart} />

      <a href="#main-content" className="skip-link">{isEnPath(path) ? "Skip to content" : "تخطي إلى المحتوى"}</a>
      <main id="main-content" className="flex-1">{page}</main>

      <UnifiedFooter english={isEnPath(path)} />
      <FloatingActions onOpenTrial={openTrial} />

      <TrialModal key={plan?.serverCode ?? "default"} initialServer={plan?.serverCode} isOpen={isTrialOpen} onClose={closeTrial} />

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
