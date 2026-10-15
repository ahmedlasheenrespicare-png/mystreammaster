import { SUPPORT_EMAIL, to, WHATSAPP_DISPLAY, WHATSAPP_NUMBER } from "../config";
import { EN_PAGES } from "../navigation.mjs";
import { IconPlay } from "./Icons";

/* تذييل النسخة الإنجليزية — هوية الوسيط التقني وروابط الصفحات الإنجليزية
   والصفحات القانونية (بالعربية حالياً) مع توضيح ذلك. */
export default function EnFooter() {
  return (
    <footer className="bg-[#0b0b0f] text-white mt-auto">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-14 grid gap-10 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <a href={to("en/")} className="flex items-center gap-2.5" aria-label="Stream Master Pro — home">
            <span className="w-9 h-9 rounded-xl bg-[#d8ff3e] text-black grid place-items-center">
              <IconPlay className="w-4 h-4 ml-0.5" />
            </span>
            <span className="font-display font-black text-[19px] tracking-tight leading-none">
              Stream Master
              <span className="block text-[9px] font-sans font-bold tracking-[0.22em] uppercase text-white/50">
                Stream Master Pro
              </span>
            </span>
          </a>
          <p className="mt-5 text-[13.5px] leading-[1.9] text-white/55 max-w-[420px]">
            Stream Master Pro is a technical intermediary only. Our service is a
            technical activation and linking package, streaming player setup and an
            official viewing guide. We do not host, stream or rebroadcast any content,
            and we do not sell channels or broadcasts. Subscription data is issued by
            independent external providers.
          </p>
          <p className="mt-5 text-[13.5px] font-bold">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#d8ff3e] hover:text-white transition"
            >
              WhatsApp: {WHATSAPP_DISPLAY}
            </a>
            <span className="mx-3 text-white/25">·</span>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#d8ff3e] hover:text-white transition">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>

        <nav aria-label="English pages">
          <h2 className="text-[12px] font-black tracking-[0.22em] uppercase text-white/40">
            English pages
          </h2>
          <ul className="mt-4 space-y-2.5 text-[14px] font-bold">
            {EN_PAGES.map((p) => (
              <li key={p.href}>
                <a href={to(p.href)} className="text-white/70 hover:text-white transition">
                  {p.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Help and legal">
          <h2 className="text-[12px] font-black tracking-[0.22em] uppercase text-white/40">
            Help &amp; legal
          </h2>
          <ul className="mt-4 space-y-2.5 text-[14px] font-bold">
            <li>
              <a href={to("watch-legal.html")} className="text-white/70 hover:text-white transition">
                Official viewing guide
              </a>
            </li>
            <li>
              <a href={to("refund/")} className="text-white/70 hover:text-white transition">
                Refund policy <span className="text-white/40 font-medium">(in Arabic)</span>
              </a>
            </li>
            <li>
              <a href={to("terms/")} className="text-white/70 hover:text-white transition">
                Terms of use <span className="text-white/40 font-medium">(in Arabic)</span>
              </a>
            </li>
            <li>
              <a href={to("privacy/")} className="text-white/70 hover:text-white transition">
                Privacy policy <span className="text-white/40 font-medium">(in Arabic)</span>
              </a>
            </li>
            <li>
              <a href={to("")} hrefLang="ar" className="text-white/70 hover:text-white transition">
                Arabic homepage — العربية
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-5 text-[12.5px] text-white/40">
          © 2026 Stream Master Pro. Encrypted content is available only through official
          subscriptions from the rights holders.
        </p>
      </div>
    </footer>
  );
}
