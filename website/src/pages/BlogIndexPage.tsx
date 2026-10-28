import legacyPosts from "../content/legacy-posts.json";
import { BLOG_POSTS } from "../content/posts";
import { to } from "../config";
import { IconArrowUpRight, IconClock } from "../components/Icons";

/* فهرس المدوّنة — /blog : روابط داخلية قوية لمحركات البحث وللزائر */
export default function BlogIndexPage() {
  return (
    <div className="bg-[#faf9f6] pt-[114px] md:pt-[132px] pb-20">
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="text-[12.5px] font-bold text-black/40 mb-5" aria-label="مسار التصفح">
          <a href={to("")} className="hover:text-black transition">الرئيسية</a>
          <span className="mx-2">/</span>
          <span className="text-black/70">المدوّنة</span>
        </nav>

        <h1 className="font-display font-black tracking-tight leading-[1.15] text-[34px] md:text-[50px]">
          الأدلة التقنية ومقالات التشغيل
        </h1>
        <p className="mt-4 max-w-[680px] text-[15.5px] text-black/60 font-medium leading-relaxed">
          شروحات مفصّلة حول دقة الفيديو، سرعات الإنترنت، إعداد تطبيقات الشاشات الذكية، ومعايير
          المشاهدة القانونية.
        </p>

        <div className="mt-10 space-y-4">
          {BLOG_POSTS.map((post) => (
            <a
              key={post.slug}
              href={to(`blog/${post.slug}/`)}
              className="group block rounded-[24px] border border-black/10 bg-white p-6 sm:p-7 hover:border-black transition"
            >
              <div className="flex items-center gap-3 text-[11.5px] font-black text-black/45">
                <span className="bg-[#d8ff3e] text-black px-2.5 py-1 rounded-full">{post.category}</span>
                {!post.hideMeta && (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <IconClock className="w-3.5 h-3.5" /> {post.readingMinutes} دقائق قراءة
                    </span>
                    <time dateTime={post.date} className="font-latin">
                      {post.date}
                    </time>
                  </>
                )}
              </div>
              <h2 className="mt-3 font-display font-black text-[20px] sm:text-[24px] tracking-tight leading-snug group-hover:text-[#2b4eff] transition">
                {post.title}
              </h2>
              <p className="mt-2 text-[14px] text-black/60 leading-relaxed font-medium">
                {post.description}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-black text-[#2b4eff]">
                اقرأ المقال كاملاً <IconArrowUpRight className="w-4 h-4" />
              </span>
            </a>
          ))}
        </div>

        <section className="mt-12">
          <h2 className="font-display text-3xl font-black mb-6">المزيد من مكتبة ستريم ماستر</h2>
          <div className="grid sm:grid-cols-2 gap-4">{legacyPosts.map(post => <a key={post.slug} href={to(`blog/${post.slug}/`)} className="rounded-3xl border border-black/10 bg-white p-6 hover:border-black transition"><h3 className="font-display text-xl font-black">{post.title}</h3><p className="mt-3 text-sm text-black/60 leading-relaxed">{post.description}</p><span className="inline-block mt-4 text-[#2b4eff] font-bold">اقرأ المقال ←</span></a>)}</div>
        </section>
        <div className="mt-12 rounded-[24px] border border-black/10 bg-white p-6">
          <h2 className="font-display font-black text-[19px]">هل تحتاج مساعدة مباشرة؟</h2>
          <p className="mt-2 text-[14px] text-black/55 font-medium">
            فريق الدعم يجيب على أسئلة التشغيل والتفعيل طوال اليوم — أو تصفّح{" "}
            <a href={to("#pricing")} className="font-black text-[#2b4eff] underline underline-offset-4">
              الباقات
            </a>{" "}
            و
            <a href={to("channels/")} className="font-black text-[#2b4eff] underline underline-offset-4">
              قائمة القنوات
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
