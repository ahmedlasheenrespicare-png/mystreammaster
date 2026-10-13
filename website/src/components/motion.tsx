import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/* =========================================================================
   محرك حركة على طراز Salient — بدون أي مكتبات خارجية
   كشف عند التمرير + بارالاكس + كشف بسطر + ستارة صور + بارالاكس الماوس
========================================================================== */

/* خطاف: هل دخل العنصر الشاشة؟ (مرة واحدة) */
export function useInViewOnce<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, inView };
}

/*
   الكشف المتتابع — بديل أنيميشنات المدخل في Salient
   up: ينزلق من الأسفل (الافتراضي) | start/end: من جهة البداية/النهاية
   zoom: يكبر | blur: يتوضح | clip: ستارة | fade: تلاشي فقط
*/
export function Reveal({
  variant = "up",
  delay = 0,
  duration,
  className = "",
  style,
  children,
  threshold = 0.2,
}: {
  variant?: "up" | "start" | "end" | "zoom" | "blur" | "clip" | "fade";
  delay?: number;
  duration?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  threshold?: number;
}) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(threshold);
  return (
    <div
      ref={ref}
      className={`rv rv-${variant} ${inView ? "rv-in" : ""} ${className}`}
      style={{
        transitionDelay: `${delay}ms`,
        ...(duration ? { transitionDuration: `${duration}ms` } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* كشف صورة بستارة من الأسفل للأعلى + زوم داخلي — توقيع Salient للصور */
export function RevealImage({
  src,
  alt = "",
  className = "",
  imgClassName = "",
  delay = 0,
  eager = false,
  threshold = 0.2,
}: {
  src: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  delay?: number;
  eager?: boolean;
  threshold?: number;
}) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(threshold);
  return (
    <div
      ref={ref}
      className={`rv rv-clip rv-img ${inView ? "rv-in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} className={imgClassName} />
    </div>
  );
}

/* ظهور سطر بسطر من خلف قناع — عناوين Salient الضخمة */
export function LineReveal({
  lines,
  className = "",
  lineClassName = "",
  delay = 0,
  step = 110,
  threshold = 0.4,
}: {
  lines: ReactNode[];
  className?: string;
  lineClassName?: string;
  delay?: number;
  step?: number;
  threshold?: number;
}) {
  const { ref, inView } = useInViewOnce<HTMLSpanElement>(threshold);
  return (
    <span ref={ref} className={`block ${className}`}>
      {lines.map((l, i) => (
        <span key={i} className={`lr ${inView ? "lr-in" : ""}`}>
          <span className={`block ${lineClassName}`} style={{ transitionDelay: `${delay + i * step}ms` }}>
            {l}
          </span>
        </span>
      ))}
    </span>
  );
}

/* بارالاكس مرتبط بالسكرول — يتحرك بسرعة مختلفة عن الصفحة (معطّل على الموبايل) */
export function Parallax({
  speed = 0.12,
  className = "",
  children,
}: {
  speed?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.innerWidth < 768) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const center = r.top + r.height / 2 - window.innerHeight / 2;
      el.style.transform = `translate3d(0, ${(-center * speed).toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [speed]);

  return <div ref={ref} className={className}>{children}</div>;
}

/* بارالاكس الماوس — للشارات العائمة حول الهيرو */
export function MouseParallax({
  factor = 0.025,
  className = "",
  children,
}: {
  factor?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.innerWidth < 768) return;

    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const loop = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      el.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
      if (Math.abs(tx - cx) > 0.15 || Math.abs(ty - cy) > 0.15) raf = requestAnimationFrame(loop);
      else raf = 0;
    };
    const onMove = (e: MouseEvent) => {
      tx = (e.clientX - window.innerWidth / 2) * factor;
      ty = (e.clientY - window.innerHeight / 2) * factor;
      if (!raf) raf = requestAnimationFrame(loop);
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [factor]);

  return <div ref={ref} className={className}>{children}</div>;
}

/* شريط تقدم القراءة أعلى الصفحة — يكبر مع السكرول من اليمين لليسار */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;
      el.style.transform = `scaleX(${p.toFixed(4)})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="fixed top-0 inset-x-0 z-[70] h-[3px] pointer-events-none" aria-hidden="true">
      <div
        ref={ref}
        className="h-full bg-gradient-to-l from-[#2b4eff] via-[#7c5cff] to-[#d8ff3e] origin-right"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}

/* =========================================================================
   التمرير الناعم — إحساس سكرول Salient الزبدى (نسخة مصغرة بلا مكتبات)
   - يعترض عجلة الفأرة وينعم الحركة بـ rAF + lerp
   - معطّل على اللمس وعند تفضيل تقليل الحركة
   - لا يعترض التمرير داخل العناصر القابلة للتمرير (السلة، قائمة القنوات)
   - ينقّر روابط # لتمريرها بنعاسية بدل القفز
========================================================================== */
/* التمرير الناعم معطّل افتراضياً:
   اعتراض عجلة الفأرة يخالف توقعات المستخدم (وخاصة إن كان يستخدم لوحة مفاتيح أو
   جهازاً بمؤشر دقيق)، ويسبب جِدْلاً مع تمرير اللمس. لتفعيله أضف ?smooth=1 للرابط
   أو نفّذ: localStorage.setItem("smp-smooth", "1") — ويبقى محترماً لتفضيل تقليل الحركة. */
export function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduced || coarse || window.innerWidth < 768) return;

    let enabled = false;
    try {
      const q = new URLSearchParams(window.location.search).get("smooth");
      if (q === "1") localStorage.setItem("smp-smooth", "1");
      if (q === "0") localStorage.removeItem("smp-smooth");
      enabled = localStorage.getItem("smp-smooth") === "1";
    } catch {
      enabled = false;
    }
    if (!enabled) return;

    let target = window.scrollY;
    let current = target;
    let raf = 0;

    const running = () => raf !== 0;

    const loop = () => {
      current += (target - current) * 0.1;
      if (Math.abs(target - current) < 0.5) {
        current = target;
        window.scrollTo(0, current);
        raf = 0;
        return;
      }
      window.scrollTo(0, current);
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // تكبير/تصغير المتصفح
      if (e.defaultPrevented) return;
      // اترك التمرير الداخلي للعناصر القابلة للتمرير يعمل طبيعياً
      const t = e.target as HTMLElement | null;
      if (t && t.closest(".overflow-y-auto, .overflow-auto, [data-no-smooth]")) return;

      e.preventDefault();
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (!running()) current = window.scrollY;
      target = Math.max(0, Math.min(max, target + e.deltaY));
      start();
    };

    const onClickAnchor = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const id = a.getAttribute("href")!.slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      const y = el.getBoundingClientRect().top + window.scrollY - 90;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      target = Math.max(0, Math.min(max, y));
      if (!running()) current = window.scrollY;
      start();
    };

    // أوقف النعومة عند أي تمرير برمجي خارجي (سحب شريط التمرير، Home/End...)
    const onNativeScroll = () => {
      if (!running()) {
        target = window.scrollY;
        current = window.scrollY;
      }
    };

    document.documentElement.style.scrollBehavior = "auto";
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("click", onClickAnchor);
    window.addEventListener("scroll", onNativeScroll, { passive: true });

    return () => {
      document.documentElement.style.scrollBehavior = "";
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("click", onClickAnchor);
      window.removeEventListener("scroll", onNativeScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
