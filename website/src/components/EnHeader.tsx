import { to, WHATSAPP_NUMBER } from "../config";
import { EN_PAGES } from "../navigation.mjs";
import { counterpartHref } from "../i18n";
import { useRouter } from "../router";
import { IconPlay } from "./Icons";

/* ترويسة النسخة الإنجليزية — كبسولة عائمة بنفس هوية الموقع، بتنقل مبسّط
   بين الصفحات التجارية الإنجليزية الخمس ومبدّل للعربية. */
export default function EnHeader() {
  const { path } = useRouter();

  return (
    <header className="fixed top-0 inset-x-0 z-[55] pt-4">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <nav
          aria-label="Main menu"
          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-2xl px-4 sm:px-6 py-3 bg-white/85 backdrop-blur-xl border border-black/10 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)]"
        >
          <a href={to("en/")} className="flex items-center gap-2.5 shrink-0" aria-label="Stream Master Pro — home">
            <span className="w-9 h-9 rounded-xl bg-[#0b0b0f] text-[#d8ff3e] grid place-items-center">
              <IconPlay className="w-4 h-4 ml-0.5" />
            </span>
            <span className="font-display font-black text-[19px] tracking-tight leading-none">
              Stream Master
              <span className="block text-[9px] font-sans font-bold tracking-[0.22em] uppercase text-black/50">
                Stream Master Pro
              </span>
            </span>
          </a>

          <div className="flex flex-wrap items-center gap-1 text-[13.5px] font-bold">
            {EN_PAGES.map((p) => {
              const target = `/${p.href.replace(/\/$/, "")}` || "/en";
              const active = path === target || (target === "/en" && path === "/en");
              return (
                <a
                  key={p.href}
                  href={to(p.href)}
                  aria-current={active ? "page" : undefined}
                  className={`px-3 py-2 rounded-full transition ${
                    active ? "bg-black/[0.07]" : "hover:bg-black/[0.06]"
                  }`}
                >
                  {p.label}
                </a>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={to(counterpartHref(path))}
              hrefLang="ar"
              className="h-10 inline-flex items-center rounded-full border border-black/10 bg-white px-3.5 text-[12.5px] font-black hover:border-black transition"
            >
              العربية
            </a>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hello, I would like to know more about the technical activation packages")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center bg-[#0b0b0f] text-white text-[13px] font-black px-4 py-2.5 rounded-full hover:opacity-85 transition"
            >
              Order activation
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
