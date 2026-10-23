/* ==========================================================================
   غلاف <picture> لصور التذاكر الزخرفية
   --------------------------------------------------------------------------
   المشكلة: صور اللاعبين PNG بعرض 1654–2288 بكسل تُرسم في البطاقة بارتفاع
   222 بكسل فقط — 59 ميغابايت في المستودع و13.6 منها تُحمَّل في الرئيسية،
   وكلها كانت الأثقل في الصفحة.
   الحل: نسخة AVIF ونسخة WebP بالقياس الحقيقي (700 بكسل = 3× الارتفاع
   المعروض) مع بقاء PNG احتياطاً للمتصفحات القديمة — نفس نمط ShowcaseGrid.
   • لا يتغيّر التخطيط: <picture> يُرسم display:contents فتبقى الأنماط وموضع
     العنصر على <img> نفسه.
   • الصور زخرفية (alt="" + aria-hidden) فلا يُعلَن شيء لقارئ الشاشة.
   • لا مكتبة ولا اعتماد جديد: الملفات مولَّدة مسبقاً ومحفوظة في المستودع.
========================================================================== */
import type { ComponentProps } from "react";

const withExt = (src: string, ext: string) => src.replace(/\.(png|jpe?g)$/i, `.${ext}`);

/** <img> بخصائصه كاملة، مغلَّف بمصدرَي AVIF/WebP */
export function TicketImage({ src, ...rest }: ComponentProps<"img"> & { src: string }) {
  return (
    <picture>
      <source type="image/avif" srcSet={withExt(src, "avif")} />
      <source type="image/webp" srcSet={withExt(src, "webp")} />
      <img src={src} {...rest} />
    </picture>
  );
}
