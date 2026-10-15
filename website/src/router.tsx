/* ==========================================================================
   موجّه (Router) خفيف بلا مكتبات خارجية
   --------------------------------------------------------------------------
   لماذا مكتوب يدوياً؟
   • الموقع صغير (أقل من 12 مساراً) ولا يحتاج مزايا مكتبة كاملة
   • يعمل على الخادم (SSR/Prerender) وعلى المتصفح بنفس الكود
   • الروابط تبقى <a href="..."> عادية داخل HTML المُولَّد — وهذا هو الأفضل
     لمحركات البحث، والتنقّل السريع يتم باعتراض الضغط فقط
========================================================================== */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PRICING_PLANS } from "./data";
import { BLOG_POSTS } from "./content/posts";
import { landingRoutes } from "./content/competitions";
import { BASE } from "./config";

interface RouterValue {
  /** المسار مُطبَّعاً بلا بادئة النشر وبلا شرطة أخيرة: "/", "/nova", "/blog/xxx" */
  path: string;
  /** معاملات البحث في الرابط الحالي */
  search: string;
  navigate: (target: string, opts?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterValue>({
  path: "/",
  search: "",
  navigate: () => {},
});

/* إزالة بادئة النشر + تطبيع الشكل حتى نقارن المسارات بثبات.
   المسارات العربية تصل مشفّرة من المتصفح، فتفك ترميزها هنا ليتطابق
   مع السلاجات النصية في APP_PATHS وقوائم المحتوى. */
export function normalizePath(pathname: string): string {
  const base = BASE.replace(/\/+$/, ""); /* "" أو "/serverproject" */
  let out = pathname;
  try {
    out = decodeURI(out);
  } catch {
    /* مسار غير صالح الترميز — نستخدمه كما هو */
  }
  if (base && out.startsWith(base)) out = out.slice(base.length);
  out = `/${out.replace(/^\/+/, "")}`;
  out = out.replace(/index\.html$/, "");
  if (out.length > 1) out = out.replace(/\/+$/, "");
  return out || "/";
}

const APP_PATHS = new Set(["/", "/channels", "/matches", "/blog", "/store", "/servers", "/cart", "/faq", "/trial",
  "/en", "/en/faq",
  ...PRICING_PLANS.map(p => `/${p.serverCode}`),
  ...PRICING_PLANS.map(p => `/en/${p.serverCode}`),
  ...BLOG_POSTS.map(p => `/blog/${p.slug}`),
  ...landingRoutes()]);

function currentLocation() {
  if (typeof window === "undefined") return { path: "/", search: "" };
  return {
    path: normalizePath(window.location.pathname),
    search: window.location.search,
  };
}

/* التمرير إلى عنصر مع احتساب ارتفاع الشريط العلوي الثابت */
function scrollToElement(id: string) {
  const el = document.getElementById(id);
  if (!el) return false;
  const y = el.getBoundingClientRect().top + window.scrollY - 90;
  window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  return true;
}

export function RouterProvider({
  children,
  initialPath,
}: {
  children: ReactNode;
  /** يُستخدم في وقت البناء (Prerender) فقط */
  initialPath?: string;
}) {
  const [state, setState] = useState(() =>
    initialPath !== undefined
      ? { path: normalizePath(initialPath), search: "" }
      : currentLocation()
  );

  const navigate = useCallback((target: string, opts?: { replace?: boolean }) => {
    if (typeof window === "undefined") return;

    /* الهدف قد يكون رابطاً داخلياً كاملاً أو مساراً أو مرساة (#pricing) */
    const url = new URL(target, window.location.href);
    const internal = url.origin === window.location.origin;
    if (!internal) {
      window.location.href = url.href;
      return;
    }

    if (!APP_PATHS.has(normalizePath(url.pathname))) {
      window.location.assign(url.href);
      return;
    }
    const next = { path: normalizePath(url.pathname), search: url.search };
    if (next.path === normalizePath(window.location.pathname) && url.hash) {
      /* نفس الصفحة: تمرير للمرساة فقط */
      history.replaceState(null, "", url.hash);
      if (!scrollToElement(url.hash.slice(1))) window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (next.path === normalizePath(window.location.pathname) && !url.hash) {
      /* نفس الصفحة بلا مرساة (مثل الشعار أو "الصفحة الرئيسية" من /#pricing): للأعلى */
      history.replaceState(null, "", `${url.pathname}${url.search}`);
      setState(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const href = `${url.pathname}${url.search}${url.hash}`;
    if (opts?.replace) history.replaceState(null, "", href);
    else history.pushState(null, "", href);
    setState(next);
  }, []);

  /* زر الرجوع/التقدم */
  useEffect(() => {
    const onPop = () => {
      setState(currentLocation());
      const hash = window.location.hash;
      if (hash) window.setTimeout(() => scrollToElement(hash.slice(1)), 60);
      else window.scrollTo({ top: 0 });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /* اعتراض الضغط على الروابط الداخلية — تنقّل فوري بلا إعادة تحميل */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement | null)?.closest?.("a[href]") as
        | HTMLAnchorElement
        | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const raw = anchor.getAttribute("href") || "";

      /* روابط خارجية أو غير http */
      if (/^(https?:)?\/\//i.test(raw) || /^(mailto:|tel:|whatsapp:)/i.test(raw)) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;

      /* مرساة داخل نفس الصفحة (أو مرساة في الصفحة الرئيسية من صفحة أخرى) */
      if (raw.startsWith("#")) {
        const id = raw.slice(1);
        if (!id) return;
        const isHome = normalizePath(window.location.pathname) === "/";
        if (!isHome && !document.getElementById(id)) {
          /* المرساة تخصّ الصفحة الرئيسية → ننتقل إليها أولاً */
          e.preventDefault();
          navigate(`${BASE}${raw}`);
          return;
        }
        e.preventDefault();
        history.replaceState(null, "", raw);
        scrollToElement(id);
        return;
      }

      /* روابط داخلية للموقع */
      const base = BASE.replace(/\/+$/, "");
      const isInternal =
        url.pathname === BASE ||
        url.pathname === base ||
        url.pathname.startsWith(`${base}/`) ||
        url.pathname.startsWith(BASE);

      if (!isInternal || !APP_PATHS.has(normalizePath(decodeURI(url.pathname)))) return;
      if (url.href === window.location.href) {
        /* نفس الرابط الحالي: نعيد التمرير للمرساة (أو لأعلى الصفحة) بدل تجاهل الضغط */
        e.preventDefault();
        if (!url.hash || !scrollToElement(url.hash.slice(1))) window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      e.preventDefault();
      navigate(url.pathname + url.search + url.hash);
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [navigate]);

  /* عند تغيير المسار: تمرير للأعلى أو إلى المرساة المطلوبة */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash) {
      const raf = requestAnimationFrame(() => scrollToElement(hash.slice(1)));
      return () => cancelAnimationFrame(raf);
    }
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [state.path]);

  const value = useMemo<RouterValue>(
    () => ({ path: state.path, search: state.search, navigate }),
    [state.path, state.search, navigate]
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterValue {
  return useContext(RouterContext);
}
