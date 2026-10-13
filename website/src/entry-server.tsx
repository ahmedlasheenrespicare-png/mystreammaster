import { renderToString } from "react-dom/server";
import App from "./App";
import { RouterProvider } from "./router";
import { getSeo, type SeoMeta } from "./seo";
import { BLOG_POSTS } from "./content/posts";
import { PRICING_PLANS } from "./data";

/* كل مسارات الموقع — يستخدمها سكربت البناء المسبق ليعرف ما الذي يجب رسمه */
export function getAllRoutes(): string[] {
  return [
    "/",
    "/channels", "/store", "/servers", "/cart", "/faq",
    ...PRICING_PLANS.map((p) => `/servers/${p.serverCode}`),
    "/blog",
    ...BLOG_POSTS.map((p) => `/blog/${p.slug}`),
    ...PRICING_PLANS.map((p) => `/${p.serverCode}`),
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
