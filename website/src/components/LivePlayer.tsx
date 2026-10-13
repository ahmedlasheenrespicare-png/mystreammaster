import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Hls from "hls.js";
import { canPlayNativeHls, loadHls } from "../hls";
import { FEATURED_CHANNELS, type ChannelItem } from "../data";
import { PROXY_BASE, to } from "../config";
/* قارئ قائمة kora-live.m3u8 — في ملف JS مستقل لأن اختباراته في scripts/test-playlist.mjs */
import { parseKoraPlaylist } from "../lib/koraPlaylist.mjs";
import {
  IconCheck,
  IconClock,
  IconPlay,
  IconSearch,
  IconShieldCheck,
  IconTv,
  IconZap,
} from "./Icons";
import { Reveal } from "./motion";

export type { ChannelItem } from "../data";

/* ترتيب التصنيفات المفضّل في الواجهة — أي تصنيف غير مذكور هنا يُلحق تلقائياً
   بالترتيب الأبجدي، فلا تختفي أي قناة من الأزرار مهما تغيّر ملف channels.json */
const PREFERRED_CATEGORY_ORDER = [
  "قنوات MBC",
  /* تصنيف البث المعاد (قناة 786431 من kora-live.m3u8) — يوضع في المقدمة
     حتى يظهر زرّه بجانب التصنيف الافتراضي لا في آخر القائمة */
  "مباريات مباشرة",
  "رياضية",
  "إخبارية",
  "عربية",
  "مصرية",
  "أفلام",
  "منوعات",
  "عالمية",
  "وثائقية",
  "دينية",
  "أطفال",
  "موسيقى",
];

// ====== وسيط البث: مواجهة حجب بعض الشبكات لسيرفرات القنوات ======
// بعض مزودي الإنترنت (خصوصاً في مصر) يحجبون سيرفرات بث معينة.
// عند فشل الاتصال المباشر يتم التبديل تلقائياً لأول وسيط يعمل من القائمة.

/* ⚙️⚙️⚙️ روابط الوسيط — تُجرّب بالترتيب عند فشل الاتصال المباشر ⚙️⚙️⚙️ */
const PROXY_BASES: string[] = ["/proxy.php", PROXY_BASE]; // ✅ الوسيط الرسمي — Cloudflare Workers (يُعرَّف في src/config.ts)

/* تجربة وسيط فوراً بدون تعديل الكود — أضف للرابط:  ?proxy=https://xxx.workers.dev
   (يُحفظ للجلسة الحالية فقط — مفيد للاختبار قبل التفعيل الدائم)
   ⚠️ أمان: لا نقبل أي رابط وسيط من الرابط — فقط نطاقات حسابنا نفسه،
   حتى لا يستطيع طرف خارجي تمرير فيديو الزائر عبر سيرفر يتحكم به. */
const OWNED_PROXY_PATTERN =
  /^https:\/\/[a-z0-9-]+\.(ahmedlasheenrespicare\.workers\.dev|ahmedlasheenrespicare-png\.deno\.net)$/i;

function isTrustedProxy(value: string): boolean {
  return OWNED_PROXY_PATTERN.test(value.trim().replace(/\/+$/, ""));
}

function resolveProxyBases(): string[] {
  try {
    const p = new URLSearchParams(window.location.search).get("proxy");
    if (p && isTrustedProxy(p)) {
      const clean = p.trim().replace(/\/+$/, "");
      sessionStorage.setItem("smp-proxy", clean);
      return [clean, ...PROXY_BASES];
    }
    const saved = sessionStorage.getItem("smp-proxy");
    if (saved && isTrustedProxy(saved)) return [saved, ...PROXY_BASES];
  } catch {
    /* بيئة بدون sessionStorage — تجاهل */
  }
  return PROXY_BASES;
}
const ACTIVE_PROXY_BASES = resolveProxyBases();

// تحويل رابط القناة إلى رابط الوسيط
// - سيرفر MBC الرئيسي: مساره المخصص المباشر (الأسرع)
// - أي سيرفر آخر: المسار العام /h/<السيرفر>/<المسار> — يعمل لكل قنوات القائمة
function getProxyUrl(base: string, url: string): string {
  if (base.endsWith(".php")) return `${base}?url=${encodeURIComponent(url)}`;
  if (url.startsWith("https://shd-gcp-live.edgenextcdn.net/")) {
    return base + url.slice("https://shd-gcp-live.edgenextcdn.net".length);
  }
  const m = url.match(/^https:\/\/([^/]+)(\/.*)?$/);
  if (m) {
    return `${base}/h/${m[1]}${m[2] || "/"}`;
  }
  return url; // روابط غير مدعومة تبقى كما هي
}

// ذاكرة الجلسة: رقم الوسيط الناجح لشبكة هذا الزائر (0 = مباشر) — يُحفظ حتى التنقل بين القنوات
let needsProxySession: number | null = null;

/* نفق ngrok (البث المعاد من جهاز صاحب الموقع): أي طلب مباشر من متصفح يستلم
   صفحة تحذير HTML بدل البث، فالوصول المباشر لا ينجح أبداً — الوسيط وحده يتخطاها
   بإرسال ترويسة ngrok-skip-browser-warning (انظر proxy/worker.js) */
const NGROK_HOST_RE = /(^|\.)ngrok(-free)?\.(dev|app|io|com)$/i;

function isNgrokUrl(url: string): boolean {
  try {
    return NGROK_HOST_RE.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

interface LivePlayerProps {
  onOpenTrial: () => void;
}

/* دمج قائمتين بلا تكرار للرابط — قنوات M3U أولاً ثم قنوات channels.json */
function mergeChannels(first: ChannelItem[], second: ChannelItem[]): ChannelItem[] {
  const seen = new Set<string>();
  const out: ChannelItem[] = [];
  for (const c of [...first, ...second]) {
    if (seen.has(c.url)) continue;
    seen.add(c.url);
    out.push(c);
  }
  return out;
}

function LivePlayerInner({ onOpenTrial }: LivePlayerProps) {
  /* مصدران منفصلان للقنوات:
     • m3uChannels  — قنوات ملف kora-live.m3u8 (مثل 786431) — لا تُستبدل أبداً بتحميل channels.json
     • baseChannels — قنوات channels.json (أو القنوات المميّزة قبل تحميلها)
     القائمة المعروضة = دمج المصدرين، فتبقى قنوات M3U ظاهرة بعد تحميل channels.json */
  const [m3uChannels, setM3uChannels] = useState<ChannelItem[]>([]);
  const [baseChannels, setBaseChannels] = useState<ChannelItem[]>(FEATURED_CHANNELS);
  /* هل اختار الزائر قناة أو تصنيفاً بنفسه؟ لو نعم لا نُغيّر اختياره تلقائياً */
  const userPickedRef = useRef(false);
  const channels = useMemo(
    () => mergeChannels(m3uChannels, baseChannels),
    [m3uChannels, baseChannels]
  );
  const [selectedChannel, setSelectedChannel] = useState<ChannelItem>(FEATURED_CHANNELS[0]);

  // --- تحميل قنوات M3U المباشرة من kora-live.m3u8 (يتحدث كل 15 دقيقة) ---
  useEffect(() => {
    const loadM3u = async () => {
      try {
        const res = await fetch(to("kora-live.m3u8"), {cache: "no-store"});
        if (!res.ok) return;
        const text = await res.text();

        /* استخراج القنوات: نفس القارئ المختبَر في scripts/test-playlist.mjs */
        const parsed = parseKoraPlaylist(text);

        /* نستبدل قائمة M3U كاملة بأحدث نسخة (التوكنات تتجدد)، ونحتفظ بها مستقلة
           عن channels.json — فلا تختفي القنوات عند تحميل القائمة الكاملة لاحقاً */
        if (parsed.length > 0) {
          setM3uChannels(parsed);
          /* كان التصنيف المختار «قنوات MBC» بينما قناة البث المعاد (786431) في
             تصنيف «مباريات مباشرة» → القناة موجودة في البيانات لكنها لا تظهر في
             القائمة حتى يبحث عنها الزائر بنفسه. الآن ننتقل تلقائياً إلى تصنيف
             القناة ونختارها — إلا لو كان الزائر قد اختار قناة/تصنيفاً بالفعل */
          if (!userPickedRef.current) {
            setSelectedCategory(parsed[0].cat);
            setSelectedChannel(parsed[0]);
          }
        }
      } catch {
        /* فشل الشبكة: نُبقي آخر قائمة ناجحة */
      }
    };
    loadM3u();
    const id = setInterval(loadM3u, 5*60*1000); // حدّث كل 5 دقائق
    return ()=> clearInterval(id);
  }, []);
  const [selectedCategory, setSelectedCategory] = useState<string>("قنوات MBC");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [bufferSec, setBufferSec] = useState<number>(0);
  const [proxyIdx, setProxyIdx] = useState<number>(needsProxySession ?? 0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);

  /* تحميل قائمة القنوات الكاملة (~173KB) — عند الاقتراب من المشغّل فقط،
     فلا يدفع ثمنها من لم يصل للقسم أصلاً. المسار من config.to (يتبع مسار النشر). */
  const fullListRequested = useRef(false);
  const loadFullChannels = useCallback(() => {
    if (fullListRequested.current) return;
    fullListRequested.current = true;
    fetch(to("channels.json"))
      .then((res) => res.json())
      .then((data) => {
        if (!data || !Array.isArray(data.channels)) return;
        /* تنقية البيانات: أي عنصر ناقص يُتجاهل بدل أن يُسقط الواجهة */
        const clean: ChannelItem[] = (data.channels as Record<string, unknown>[])
          .map((c) => ({
            name: String(c?.name ?? "").trim(),
            logo: String(c?.logo ?? "📺"),
            url: String(c?.url ?? "").trim(),
            cat: String(c?.cat ?? "منوعات").trim() || "منوعات",
          }))
          .filter((c) => c.name !== "" && c.url !== "");
        /* يحدّث قائمة channels.json فقط — قنوات M3U محفوظة في m3uChannels ولا تُمسح */
        if (clean.length > 0) setBaseChannels(clean);
      })
      .catch(() => {
        // Fallback to FEATURED_CHANNELS
      });
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      loadFullChannels();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          loadFullChannels();
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" } /* نبدأ التحميل قبل ظهور القسم بقليل */
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadFullChannels]);

  // Monitor playback buffer health in real-time
  useEffect(() => {
    const interval = setInterval(() => {
      const v = videoRef.current;
      if (v && v.buffered.length > 0) {
        try {
          const current = v.currentTime;
          const end = v.buffered.end(v.buffered.length - 1);
          const diff = Math.max(0, end - current);
          setBufferSec(Math.round(diff * 10) / 10);
        } catch {
          // Ignore
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize and switch ultra-fast HLS stream
  useEffect(() => {
    /* كل القنوات (بما فيها قنوات M3U مثل 786431) تُشغَّل من رابطها مباشرة عبر <video> + hls.js */
    const video = videoRef.current;
    if (!video || !selectedChannel.url) return;

    // هل هذه القناة من النوع القابل للتمرير عبر الوسيط؟
    const canProxy = ACTIVE_PROXY_BASES.length > 0 && getProxyUrl(ACTIVE_PROXY_BASES[0], selectedChannel.url) !== selectedChannel.url;

    /* رابط ngrok مباشر = صفحة تحذير HTML دائماً (انظر proxy/worker.js)، فلا معنى
       لتجربة الاتصال المباشر وانتظار مهلة الفشل — نبدأ من الوسيط فوراً */
    const mustUseProxy = canProxy && isNgrokUrl(selectedChannel.url);
    const activeProxyIdx = mustUseProxy ? Math.max(1, proxyIdx) : proxyIdx;

    const playbackUrl = activeProxyIdx > 0 && canProxy
      ? getProxyUrl(ACTIVE_PROXY_BASES[activeProxyIdx - 1], selectedChannel.url)
      : selectedChannel.url;

    setIsLoading(true);
    setStatusMsg(
      activeProxyIdx > 0 && canProxy
        ? `🔄 جاري الاتصال عبر الوسيط ${activeProxyIdx}/${ACTIVE_PROXY_BASES.length}...`
        : "⚡ جاري الاتصال فائق السرعة بسيرفر القناة..."
    );

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    let manifestParsed = false;
    let switchTimer: number | undefined;

    // التبديل التلقائي للوسيط التالي (يُستدعى عند اكتشاف حجب الشبكة أو وسيط متوقف)
    const switchToProxy = (): boolean => {
      if (canProxy && activeProxyIdx < ACTIVE_PROXY_BASES.length) {
        needsProxySession = activeProxyIdx + 1;
        setProxyIdx(activeProxyIdx + 1);
        return true;
      }
      return false;
    };

    // مؤقت أمان: لو الرابط المباشر لم يستجب خلال 6 ثوانٍ (شبكة تحجب السيرفر) → بدّل للوسيط
    if (canProxy && activeProxyIdx === 0) {
      switchTimer = window.setTimeout(() => {
        if (!manifestParsed) switchToProxy();
      }, 6000);
    }

    /* تشغيل أصلي (سفاري/الجوال) لا يحتاج تحميل أي مكتبة */
    const startNative = () => {
      video.src = playbackUrl;
      video.muted = isMuted;
      video.addEventListener("loadedmetadata", () => {
        manifestParsed = true;
        setIsLoading(false);
        setStatusMsg("");
        video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      });
      video.addEventListener("error", () => {
        switchToProxy();
      }, { once: true });
    };

    /* hls.js تُحمَّل عند الطلب — أول تشغيل فقط (توفير ~460KB على كل زيارة) */
    let disposed = false;
    loadHls()
      .then((HlsLib) => {
        if (disposed) return;

        if (HlsLib.isSupported()) {
          const hls = new HlsLib({
            enableWorker: true,
            startFragPrefetch: true,
            lowLatencyMode: true,
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            backBufferLength: 30,
            liveSyncDurationCount: 3,
            liveMaxLatencyDurationCount: 6,
            fragLoadingTimeOut: 15000,
            manifestLoadingTimeOut: 10000,
            levelLoadingTimeOut: 10000,
            autoStartLoad: true,
            capLevelToPlayerSize: false,
          });

          hls.loadSource(playbackUrl);
          hls.attachMedia(video);

          hls.on(HlsLib.Events.MANIFEST_PARSED, () => {
            manifestParsed = true;
            setIsLoading(false);
            setStatusMsg("");

            // Autoplay with muted fallback to bypass browser policy
            video.muted = isMuted;
            video
              .play()
              .then(() => {
                setIsPlaying(true);
              })
              .catch(() => {
                // If browser blocked unmuted autoplay, mute and play
                video.muted = true;
                setIsMuted(true);
                video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
              });
          });

          hls.on(HlsLib.Events.AUDIO_TRACKS_UPDATED, (_event, data) => {
            if (data.audioTracks && data.audioTracks.length > 0 && hls.audioTrack === -1) {
              hls.audioTrack = 0;
            }
          });

          hls.on(HlsLib.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              switch (data.type) {
                case HlsLib.ErrorTypes.NETWORK_ERROR:
                  // الشبكة تحجب السيرفر المباشر؟ → بدّل للوسيط قبل محاولة إعادة الاتصال
                  if (switchToProxy()) break;
                  setStatusMsg("جاري الاتصال بالسيرفر الاحتياطي...");
                  hls.startLoad();
                  break;
                case HlsLib.ErrorTypes.MEDIA_ERROR:
                  setStatusMsg("جاري تصحيح البث...");
                  hls.recoverMediaError();
                  break;
                default:
                  setIsLoading(false);
                  setStatusMsg("تعذر تشغيل هذه القناة حالياً — جرب قناة أخرى");
                  hls.destroy();
                  break;
              }
            }
          });

          hlsRef.current = hls;
        } else if (canPlayNativeHls(video)) {
          // Native Apple Safari HLS
          startNative();
        } else {
          setIsLoading(false);
          setStatusMsg("متصفحك لا يدعم تشغيل هذه القناة — جرّب Chrome أو Safari أو متصفح الجوال.");
        }
      })
      .catch(() => {
        /* فشل تحميل المكتبة (شبكة/حجب) → نجرّب التشغيل الأصلي كحل أخير */
        if (disposed) return;
        if (canPlayNativeHls(video)) startNative();
        else {
          setIsLoading(false);
          setStatusMsg("تعذر تحميل مشغل البث — تحقق من اتصالك ثم أعد المحاولة");
        }
      });

    return () => {
      disposed = true;
      if (switchTimer !== undefined) {
        window.clearTimeout(switchTimer);
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [selectedChannel, proxyIdx]);

  // Handle Play Overlay Click
  const handlePlayClick = () => {
    loadFullChannels(); /* شبكة أمان لو لم يعمل IntersectionObserver */
    if (videoRef.current) {
      videoRef.current.muted = false;
      setIsMuted(false);
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Handle Unmute
  const handleUnmute = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
  };

  // Categories list — تُبنى من البيانات نفسها حتى لا تختفي أي قناة من الواجهة
  const categories = useMemo(() => {
    const found = new Set(channels.map((c) => c.cat));
    const preferred = PREFERRED_CATEGORY_ORDER.filter((c) => found.has(c));
    const extra = [...found]
      .filter((c) => !PREFERRED_CATEGORY_ORDER.includes(c))
      .sort((a, b) => a.localeCompare(b, "ar"));
    const list = [...preferred, ...extra];
    /* «الكل» في الموضع الثاني بجانب التصنيف الافتراضي */
    return list.length > 0 ? [list[0], "الكل", ...list.slice(1)] : ["الكل"];
  }, [channels]);

  /* لو اختفى التصنيف المختار بعد تحميل بيانات جديدة نرجع إلى «الكل» */
  useEffect(() => {
    if (!categories.includes(selectedCategory)) setSelectedCategory("الكل");
  }, [categories, selectedCategory]);

  // Filtered channels
  const filteredChannels = channels.filter((c) => {
    const matchesCat = selectedCategory === "الكل" || c.cat === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = q === "" || c.name.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <section
      id="live-player"
      ref={sectionRef}
      className="py-20 md:py-28 bg-white border-y border-black/10 relative overflow-hidden"
    >
      <div className="max-w-[1400px] mx-auto px-5 relative">
        {/* الترويسة */}
        <Reveal variant="up" className="text-center max-w-[760px] mx-auto mb-12 md:mb-16">
          <p className="text-[12px] font-black tracking-[0.25em] uppercase text-[#ff5c4d] mb-4 flex items-center justify-center gap-2">
            <span className="w-8 h-[2px] bg-[#ff5c4d] inline-block" /> بث مباشر مجاني
          </p>
          <h2 className="font-display font-black tracking-tight leading-[1.15] text-[36px] md:text-[56px]">
            شاهد القنوات المفتوحة الآن — <span className="font-serif italic font-normal">مجانًا</span>
          </h2>
          <p className="mt-4 text-[15px] md:text-[16.5px] text-black/60 font-medium leading-relaxed">
            قنوات مفتوحة تُشاهد مباشرة من المتصفح بجودة 1080p بدون تقطيع —
            جرّب التغطية قبل اختيار باقتك.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* المشغل الرئيسي */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <Reveal variant="zoom" threshold={0.15}>
            <div className="relative rounded-[24px] overflow-hidden border border-black/10 bg-white shadow-[0_50px_100px_-40px_rgba(0,0,0,0.4)]">
              {/* شريط المتصفح */}
              <div className="flex items-center gap-2 px-5 h-12 border-b border-black/10 bg-[#f7f6f2]">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                  <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
                  <span className="w-3 h-3 rounded-full bg-[#28c840]" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-white border border-black/10 rounded-full px-4 py-1 text-[12px] font-bold text-black/60 flex items-center gap-2 max-w-sm w-full justify-center">
                    <span className="w-2 h-2 rounded-full bg-[#ff5c4d] animate-pulse-soft" />
                    stream-master.pro / live
                  </div>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-black bg-[#ff5c4d] text-white px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> مباشر
                </span>
              </div>

              {/* منطقة الفيديو */}
              <div className="relative aspect-video w-full bg-black group">
                <video
                  ref={videoRef}
                  controls
                  playsInline
                  preload="auto"
                  className="w-full h-full object-contain bg-black"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onVolumeChange={() => {
                    if (videoRef.current) {
                      setIsMuted(videoRef.current.muted);
                    }
                  }}
                />

                {/* رسالة الحالة */}
                {statusMsg && (
                  <div className="absolute top-4 inset-x-0 mx-auto w-fit glass-dark text-[#d8ff3e] border border-white/15 text-xs font-bold px-4 py-1.5 rounded-full z-20 animate-pulse-soft">
                    {statusMsg}
                  </div>
                )}

                {/* زر التشغيل الكبير */}
                {!isPlaying && !isLoading && (
                  <div
                    onClick={handlePlayClick}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px] cursor-pointer z-10"
                  >
                    <button
                      className="flex h-20 w-20 items-center justify-center rounded-full bg-[#0b0b0f] hover:bg-[#2b4eff] text-white shadow-2xl ring-4 ring-white/25 transition-all hover:scale-110 cursor-pointer"
                      aria-label="تشغيل البث"
                    >
                      <IconPlay className="h-8 w-8 mr-1" />
                    </button>
                  </div>
                )}

                {/* زر تشغيل الصوت */}
                {isPlaying && isMuted && (
                  <button
                    onClick={handleUnmute}
                    className="absolute top-4 end-4 z-20 bg-[#d8ff3e] hover:bg-white text-black font-black text-xs px-3.5 py-1.5 rounded-full shadow-xl transition-all animate-pulse-soft cursor-pointer"
                  >
                    🔊 اضغط لتشغيل الصوت
                  </button>
                )}

                {/* شارات البث */}
                <div className="absolute top-4 start-4 flex items-center gap-2 pointer-events-none z-10">
                  <span className="bg-[#ff5c4d] text-white text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-md">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse" /> مباشر 1080p
                  </span>
                  <span className="glass-dark text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                    {selectedChannel.cat}
                  </span>
                  {bufferSec > 0 && (
                    <span className="bg-[#0b0b0f]/80 text-[#3effe0] text-[10.5px] font-black px-2.5 py-0.5 rounded-full backdrop-blur-md border border-[#3effe0]/30">
                      ⚡ بافر: {bufferSec}s
                    </span>
                  )}
                </div>

                {/* شريط معلومات القناة */}
                <div className="absolute bottom-14 start-4 end-4 pointer-events-none z-10 flex items-center justify-between">
                  <div className="glass-dark border border-white/15 px-3.5 py-1.5 rounded-xl flex items-center gap-2 shadow-lg">
                    <span className="text-xl">{selectedChannel.logo}</span>
                    <div className="text-right">
                      <span className="text-[13.5px] font-black text-white block leading-tight">
                        {selectedChannel.name}
                      </span>
                      <span className="text-[10.5px] text-[#3effe0] font-bold block">
                        ✓ سريعة التحميل • سيرفر HLS مباشر
                      </span>
                    </div>
                  </div>
                  <div className="glass-dark border border-white/15 px-3 py-1.5 rounded-xl text-[11px] font-black text-[#d8ff3e] hidden sm:block">
                    EdgeNext CDN • 50fps
                  </div>
                </div>
              </div>

              {/* سطر الثقة داخل الكرت */}
              <div className="flex items-center justify-center gap-4 sm:gap-6 py-3.5 border-t border-black/10 bg-white text-[11.5px] font-bold text-black/60">
                <span className="flex items-center gap-1.5">
                  <IconShieldCheck className="w-4 h-4 text-[#16a34a]" /> ضمان كامل
                </span>
                <span className="flex items-center gap-1.5">
                  <IconZap className="w-4 h-4 text-[#ff5c4d]" /> تفعيل خلال 5 دقائق
                </span>
                <span className="flex items-center gap-1.5">
                  <IconClock className="w-4 h-4 text-[#2b4eff]" /> دعم 24/7
                </span>
              </div>
            </div>
            </Reveal>

            {/* شريط الاشتراكات الرسمية الليموني — على طريقة شريط Salient */}
            <Reveal variant="up" delay={150}>
            <div className="rounded-[24px] bg-[#d8ff3e] border border-black/10 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="font-display font-black text-[16px] sm:text-[18px] tracking-tight flex items-center gap-2.5 text-center sm:text-right">
                <IconTv className="w-5 h-5 shrink-0" />
                القنوات المشفّرة (beIN / SSC / Shahid VIP) تُشاهد عبر اشتراكاتها الرسمية فقط
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="/watch-legal.html"
                  className="btn-slide slide-royal bg-black text-white font-black px-5 py-2.5 rounded-full text-[13px]"
                >
                  قارن الخيارات الرسمية
                </a>
                <button
                  onClick={onOpenTrial}
                  className="border-2 border-black/20 text-black font-black px-4 py-2 rounded-full text-[12.5px] hover:border-black transition cursor-pointer"
                >
                  تجربة مجانية
                </button>
              </div>
            </div>
            </Reveal>
          </div>

          {/* الشريط الجانبي — قائمة القنوات */}
          <Reveal variant="end" delay={200} threshold={0.1} className="lg:col-span-4">
          <div className="rounded-[24px] bg-white border border-black/10 overflow-hidden shadow-[0_30px_60px_-30px_rgba(0,0,0,0.25)] flex flex-col h-[560px]">
            {/* الرأس والبحث */}
            <div className="p-4 border-b border-black/10 space-y-3 bg-[#faf9f6]">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-black flex items-center gap-2">
                  <IconTv className="w-4 h-4 text-[#2b4eff]" /> قائمة القنوات
                  <span className="text-black/40 font-latin">({filteredChannels.length})</span>
                </h3>
                <span className="text-[11px] font-black bg-[#d8ff3e] text-black px-2 py-0.5 rounded-full">
                  سريعة ⚡
                </span>
              </div>

              <div className="relative">
                <IconSearch className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-black/35" />
                <input
                  type="text"
                  placeholder="ابحث عن قناة (مثال: MBC Masr، دراما، 1)..."
                  value={searchQuery}
                  onChange={(e) => {
                    loadFullChannels(); /* البحث يحتاج القائمة الكاملة */
                    setSearchQuery(e.target.value);
                  }}
                  className="w-full rounded-full bg-white border border-black/10 ps-10 pe-3 py-2.5 text-[13px] font-medium placeholder:text-black/35 focus:border-[#2b4eff] focus:outline-none transition"
                />
              </div>

              {/* تصنيفات على شكل حبوب */}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 text-[11px] font-bold">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      userPickedRef.current = true;
                      setSelectedCategory(cat);
                    }}
                    className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-[#0b0b0f] text-white font-black"
                        : "bg-white text-black/50 border border-black/10 hover:border-black hover:text-black"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* القنوات */}
            <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
              {filteredChannels.length === 0 ? (
                <div className="p-8 text-center text-black/40 text-[13px] font-bold">
                  لا توجد قنوات مطابقة لبحثك.
                </div>
              ) : (
                filteredChannels.map((ch, idx) => {
                  const isActive = selectedChannel.name === ch.name;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        userPickedRef.current = true;
                        setSelectedChannel(ch);
                        setIsPlaying(false);
                      }}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-right transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#2b4eff]/10 border border-[#2b4eff]/40"
                          : "border border-transparent hover:bg-black/[0.04]"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg border ${
                          isActive ? "bg-[#0b0b0f] border-[#0b0b0f]" : "bg-[#f4f3ef] border-black/10"
                        }`}
                      >
                        {ch.logo}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-[13px] font-bold block truncate ${
                            isActive ? "text-[#2b4eff] font-black" : "text-black/80"
                          }`}
                        >
                          {ch.name}
                        </span>
                        <span className="text-[11px] text-black/40 block mt-0.5">{ch.cat}</span>
                      </div>
                      <span
                        className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                          isActive ? "bg-[#ff5c4d] animate-pulse-soft" : "bg-[#3effe0]"
                        }`}
                      />
                    </button>
                  );
                })
              )}
            </div>
          </div>
          </Reveal>
        </div>

        {/* ملاحظة أسفل المشغل */}
        <p className="mt-6 text-center text-[12px] text-black/40 font-medium">
          <IconCheck className="w-3.5 h-3.5 inline-block text-[#16a34a] mr-1" />
          القنوات المعروضة هنا قنوات مفتوحة من مصادرها الرسمية.
          الاشتراكات الرسمية للمحتوى المشفّر في صفحة «المشاهدة القانونية».
        </p>
      </div>
    </section>
  );
}

/* onOpenTrial مرجع ثابت (useCallback في App) → memo يمنع إعادة رسم المشغل
   وإعادة تحميل البث عند أي تغيير حالة غير متعلق بالمشغل. */
const LivePlayer = memo(LivePlayerInner);
export default LivePlayer;
