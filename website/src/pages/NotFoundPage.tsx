import { PRICING_PLANS } from "../data";
import { to } from "../config";
import { BLOG_POSTS } from "../content/posts";
import { IconArrowUpRight } from "../components/Icons";

/* صفحة 404 — تُبنى أيضاً كملف dist/404.html ليستخدمها GitHub Pages للمسارات غير الموجودة */
export default function NotFoundPage() {
  return (
    <div className="bg-[#faf9f6] pt-[150px] md:pt-[168px] pb-24">
      <div className="max-w-[760px] mx-auto px-5 text-center">
        <p className="font-display font-black text-[70px] md:text-[110px] leading-none text-black/10 font-latin">
          404
        </p>
        <h1 className="mt-2 font-display font-black tracking-tight text-[30px] md:text-[42px]">
          هذه الصفحة غير موجودة
        </h1>
        <p className="mt-3 text-[15px] text-black/55 font-medium leading-relaxed">
          ربما تغيّر الرابط أو حُذفت الصفحة. من هنا يمكنك الوصول إلى أهم ما في الموقع:
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href={to("")}
            className="btn-slide slide-royal inline-flex items-center gap-2 bg-[#0b0b0f] text-white font-black text-[14px] px-7 py-3.5 rounded-full"
          >
            الصفحة الرئيسية
          </a>
          <a
            href={to("channels/")}
            className="inline-flex items-center gap-2 bg-white border border-black/15 font-black text-[14px] px-7 py-3.5 rounded-full hover:border-black transition"
          >
            كل القنوات
          </a>
        </div>

        <div className="mt-10 grid sm:grid-cols-2 gap-3 text-right">
          <div className="rounded-2xl border border-black/10 bg-white p-5">
            <h2 className="font-black text-[14.5px]">الباقات والسيرفرات</h2>
            <ul className="mt-3 space-y-2">
              {PRICING_PLANS.map((p) => (
                <li key={p.id}>
                  <a
                    href={to(`${p.serverCode}/`)}
                    className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-black/65 hover:text-[#2b4eff] transition"
                  >
                    <IconArrowUpRight className="w-3.5 h-3.5" />
                    {p.serverName.split("(")[0].trim()}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-5">
            <h2 className="font-black text-[14.5px]">مقالات قد تفيدك</h2>
            <ul className="mt-3 space-y-2">
              {BLOG_POSTS.map((p) => (
                <li key={p.slug}>
                  <a
                    href={to(`blog/${p.slug}/`)}
                    className="inline-flex items-start gap-1.5 text-[13.5px] font-bold text-black/65 hover:text-[#2b4eff] transition"
                  >
                    <IconArrowUpRight className="w-3.5 h-3.5 mt-1 shrink-0" />
                    <span>{p.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
