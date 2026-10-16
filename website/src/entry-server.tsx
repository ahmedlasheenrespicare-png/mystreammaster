import { renderToString } from "react-dom/server";
import App from "./App";
import { RouterProvider } from "./router";
import { getSeo, type SeoMeta } from "./seo";
import { BLOG_POSTS } from "./content/posts";
import { landingRoutes } from "./content/competitions";
import { PRICING_PLANS } from "./data";
import { CHANNEL_CATEGORY_PAGES } from "./content/channel-categories";
import { matchCenterRouteIds } from "./content/match-center.mjs";

/* كل مسارات الموقع — يستخدمها سكربت البناء المسبق ليعرف ما الذي يجب رسمه */
export function getAllRoutes(): string[] {
  return [
    "/",
    "/en", "/en/nova", "/en/istar", "/en/moka", "/en/faq",
    "/channels",
    ...CHANNEL_CATEGORY_PAGES.map((category) => `/channels/${category.slug}`),
    "/matches", "/store", "/servers", "/cart", "/faq", "/trial",
    "/blog",
    ...BLOG_POSTS.map((p) => `/blog/${p.slug}`),
    ...PRICING_PLANS.map((p) => `/${p.serverCode}`),
    ...landingRoutes(),
    ...matchCenterRouteIds(),
  ];
}

/* شجرة التطبيق لمسار واحد — تُستخدم للرسم على الخادم ولاختبار الترطيب */
export function renderTree(path: string) {
  return (
    <RouterProvider initialPath={path}>
      <App />
    </RouterProvider>
  );
}

/* رسم صفحة واحدة إلى HTML نصي — لا يُستخدم أي شيء من المتصفح هنا */
export function renderPage(path: string): { html: string; seo: SeoMeta } {
  return { html: renderToString(renderTree(path)), seo: getSeo(path) };
}
