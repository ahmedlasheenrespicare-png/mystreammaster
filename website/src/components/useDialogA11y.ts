/* ==========================================================================
   إتاحة النوافذ المنبثقة (Dialog) — منطق مشترك بين السلة ونافذة التجربة
   --------------------------------------------------------------------------
   يوفّر:
   • إغلاقاً بمفتاح Escape
   • حبس التركيز داخل النافذة (Focus trap) — لا يخرج Tab إلى الصفحة خلفها
   • تركيزاً أولياً على أول عنصر قابل للتركيز (أو [data-autofocus])
   • قفل تمرير الخلفية أثناء الفتح
   • إعادة التركيز إلى العنصر الذي فتح النافذة بعد إغلاقها
   ملاحظة: كل الأثر داخل useEffect → لا يعمل وقت الرسم المسبق (SSR).
========================================================================== */

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableIn(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    /* نتجاهل العناصر المخفية (offsetParent يساوي null عند الإخفاء) */
    (el) => el.offsetParent !== null || el === document.activeElement
  );
}

export function useDialogA11y(
  isOpen: boolean,
  onClose: () => void,
  panelRef: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = (document.activeElement as HTMLElement | null) ?? null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const nodes = focusableIn(panel);
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const inside = !!active && panel.contains(active);

      if (e.shiftKey) {
        if (!inside || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (!inside || active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);

    /* قفل تمرير الخلفية */
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    /* التركيز الأولي داخل النافذة */
    const raf =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame(() => {
            const panel = panelRef.current;
            if (!panel || panel.contains(document.activeElement)) return;
            const auto =
              panel.querySelector<HTMLElement>("[data-autofocus]") || focusableIn(panel)[0];
            auto?.focus();
          })
        : 0;

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (raf) cancelAnimationFrame(raf);
      /* نُعيد التركيز لمكانه الأصلي حتى لا يضيع مستخدم لوحة المفاتيح */
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose, panelRef]);
}
