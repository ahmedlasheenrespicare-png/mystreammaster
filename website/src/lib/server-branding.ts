import type { PricingPlan } from "../data";

export interface ServerWatermark {
  src: string;
  width: number;
  height: number;
}

/** Shared provider logos and watermark sizing for catalog and plan-detail cards. */
export const SERVER_WATERMARKS: Record<PricingPlan["serverCode"], ServerWatermark> = {
  nova: { src: "/images/brand/nova-ticket.png", width: 217, height: 132 },
  istar: { src: "/images/brand/istar-ticket.png", width: 144, height: 72 },
  moka: { src: "/images/brand/moka-ticket.png", width: 296, height: 296 },
  x: { src: "/images/brand/xtv-ticket.png", width: 172, height: 112 },
};

/* نسخة العلامة بخلفية شفافة — للعرض على خلفية داكنة بلا صندوق أبيض.
   شعار X وحده صورة معتمة (ملفّه JPEG أصلاً) بخلفية حمراء غامقة، فاستُخرج
   منه `xtv-mark.png` بمفتاح ألفا بلونين (احمرار/بياض) بدل صندوق أبيض خلفه.
   الملف الأصلي يبقى للعلامة المائية في بطاقات الأسعار. */
export const SERVER_MARK_SRC: Partial<Record<PricingPlan["serverCode"], string>> = {
  x: "/images/brand/xtv-mark.png",
};

export const SERVER_WATERMARK_CLASS =
  "pointer-events-none absolute left-4 top-8 z-[1] w-40 sm:w-48 h-auto object-contain opacity-[0.14] mix-blend-screen select-none";
