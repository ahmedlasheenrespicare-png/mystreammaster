import { HeroTelevision } from "./HeroTelevision";
import { HeroPhone } from "./HeroPhone";
import "./hero-television.css";
import "./hero-phone.css";

/* ==========================================================================
   نموذج الجوال والتلفاز — نفس مكوّنَي الصفحة الرئيسية بلا أي تغيير
   --------------------------------------------------------------------------
   يُستعمل في الهيرو (Hero.tsx) وقبل جسم المقالات (BlogPostPage.tsx)، فيبقى
   الشكل والتفاعل (ساعة القاهرة، تبديل واجهة التلفاز، ونقاط السيرفرات) واحداً
   في المكانين، وأي تعديل لاحق يسري على الاثنين معاً.
   ========================================================================== */

export default function DeviceStage({ className = "" }: { className?: string }) {
  return (
    <div className={`hero-phone-stage ${className}`.trim()} aria-label="نموذج تلفاز وجوال توضيحي">
      <HeroTelevision />
      <HeroPhone />
    </div>
  );
}
