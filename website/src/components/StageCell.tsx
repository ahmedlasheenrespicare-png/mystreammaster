import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type Hls from "hls.js";
import type { CSSProperties, ReactNode } from "react";
import { loadHls } from "../hls";
import { loadMpegts } from "../mpegts";
import { aspectStyle, isHlsCandidateUrl, isTsStreamUrl } from "../lib/xtream.mjs";
import type { Stream, XtreamMode } from "../lib/xtream.mjs";

/* ==========================================================================
   خلية تشغيل مستقلة — تُشغّل مرشّحين متسلسلين (hls.js لـ m3u8، mpegts.js
   لـ TS الخام، ثم التشغيل الأصلي) مع سقوط تلقائي بين المسارات والمسارات.
   المشغّل الرئيسي و«عدة الشاشات» يستخدمان نفس الخلية:
   • active = الخلية الحاملة للصوت وأزرار التحكم (نقرة واحدة تنقل الصوت)
   • muted  = كتم الصوت (الخلية غير النشطة تُكتم دائماً)
   ======================================================================== */

export interface PlayCandidate {
  url: string;
  native?: boolean;
  label: string;
  mode?: XtreamMode;
  isLive?: boolean;
}

export interface CellTracks {
  audio: { index: number; label: string }[];
  subs: { index: number; label: string }[];
  audioIndex: number;
  subIndex: number;
}

export interface CellState {
  status: string;
  error: string;
  levels: { index: number; label: string }[];
  levelIndex: number;
  tracks: CellTracks;
  buffer: number;
}

export interface ViewItem {
  stream: Stream;
  candidates: PlayCandidate[];
  /** رقم قناة Xtream المباشرة — لجلب EPG */
  epgStreamId?: number;
  /** قناة بأرشيف (tv_archive) — تُفعَّل أزرار إعادة البث */
  catchupStreamId?: number;
  /** مفتاح متابعة المشاهدة (فيلم/حلقة) */
  resumeKey?: string;
  /** بث مباشر (قناة) — يفعّل أزرار القناة السابقة/التالية ودرج القنوات */
  live?: boolean;
  /** ترجمة مرفوعة محلياً (blob URL) */
  uploadedSub?: string;
}

export interface StageCellHandle {
  setLevel(index: number): void;
  setAudioTrack(index: number): void;
  setSubtitleTrack(index: number): void;
  enableUploadedSubtitle(): void;
  seekBy(seconds: number): void;
  adjustVolume(delta: number): void;
  togglePlay(): void;
  isPlaying(): boolean;
  getVideo(): HTMLVideoElement | null;
}

interface StageCellProps {
  item: ViewItem | null;
  active: boolean;
  muted: boolean;
  aspect: string;
  resumeAt: number;
  placeholder?: ReactNode;
  onState: (patch: Partial<CellState>) => void;
  onMutedChange: (muted: boolean) => void;
  onPreferredMode: (mode: XtreamMode | undefined) => void;
  onUnmute: () => void;
  onSaveResume: (key: string, seconds: number) => void;
}

const EMPTY_TRACKS: CellTracks = { audio: [], subs: [], audioIndex: -1, subIndex: -1 };
const FINAL_ERROR = "تعذر تشغيل القناة عبر كل المسارات — جرّب قناة أخرى أو أعد المحاولة بعد لحظات.";

const StageCell = forwardRef<StageCellHandle, StageCellProps>(function StageCell(props, ref) {
  const { item, active, muted, aspect, placeholder } = props;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mpegtsRef = useRef<{ destroy(): void } | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [buffer, setBuffer] = useState(0);

  /* أحدث نسخة من Handlers — أحداث التشغيل تأتي بعد الـcommit */
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });

  const tracksRef = useRef<CellTracks>(EMPTY_TRACKS);
  const levelIndexRef = useRef(-1);

  const applyTracks = (patch: Partial<CellTracks>) => {
    tracksRef.current = { ...tracksRef.current, ...patch };
    propsRef.current.onState({ tracks: tracksRef.current });
  };
  const applyLevelIndex = (next: number) => {
    levelIndexRef.current = next;
    propsRef.current.onState({ levelIndex: next });
  };

  /* تصفير لوحة الخلية عند تغيّر المُشغَّل */
  useEffect(() => {
    setStatus("");
    setError("");
    tracksRef.current = EMPTY_TRACKS;
    levelIndexRef.current = -1;
    propsRef.current.onState({ status: "", error: "", levels: [], levelIndex: -1, tracks: EMPTY_TRACKS });
  }, [item]);

  /* ============ محرك التشغيل: مرحّلات المرشّحين مع سقوط تلقائي ============ */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let attempt = 0;
    let cancelled = false;
    let watchdog: number | undefined;
    let nativeHandler: (() => void) | null = null;
    let playingHandler: (() => void) | null = null;
    let HlsLib: typeof Hls | null = null;
    let hlsLoadFailed = false;
    let mpegtsLoadFailed = false;
    const candidates = item?.candidates ?? [];

    const clearWatchdog = () => {
      if (watchdog !== undefined) {
        window.clearTimeout(watchdog);
        watchdog = undefined;
      }
    };
    const detachNative = () => {
      if (nativeHandler) {
        video.removeEventListener("error", nativeHandler);
        nativeHandler = null;
      }
      if (playingHandler) {
        video.removeEventListener("playing", playingHandler);
        playingHandler = null;
      }
      video.onplaying = null;
    };
    const destroyPlayers = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (mpegtsRef.current) {
        try {
          mpegtsRef.current.destroy();
        } catch {
          /* تجاهل */
        }
        mpegtsRef.current = null;
      }
    };
    let lastStatus: string | null = null;
    const setStatusBoth = (msg: string) => {
      if (lastStatus === msg) return;
      lastStatus = msg;
      setStatus(msg);
      propsRef.current.onState({ status: msg, error: "" });
    };
    const succeed = (cand: PlayCandidate) => {
      clearWatchdog();
      setStatusBoth("");
      propsRef.current.onPreferredMode(cand.mode);
    };
    const failAll = () => {
      setStatusBoth("");
      setError(FINAL_ERROR);
      propsRef.current.onState({ status: "", error: FINAL_ERROR });
    };

    const tryNext = () => {
      if (cancelled) return;
      detachNative();
      clearWatchdog();

      if (attempt >= candidates.length) {
        if (item) failAll();
        return;
      }
      const cand = candidates[attempt];
      if (!cand) {
        if (item) failAll();
        return;
      }
      const wantsHls = !cand.native && isHlsCandidateUrl(cand.url) && !hlsLoadFailed;
      const wantsMpegts = !cand.native && !wantsHls && isTsStreamUrl(cand.url) && !mpegtsLoadFailed;

      setStatusBoth(
        attempt === 0
          ? `⚡ جاري الاتصال بسيرفر القناة (${cand.label})…`
          : `🔄 جاري التبديل تلقائياً إلى ${cand.label} (${attempt + 1}/${candidates.length})…`,
      );

      /* مكتبة hls.js تُحمَّل عند أول تشغيل فقط (توفير حجم الصفحة) */
      if (wantsHls && !HlsLib) {
        loadHls()
          .then((lib) => {
            if (cancelled) return;
            HlsLib = lib;
            tryNext();
          })
          .catch(() => {
            if (cancelled) return;
            hlsLoadFailed = true;
            tryNext();
          });
        watchdog = window.setTimeout(() => {
          if (cancelled || HlsLib || hlsLoadFailed) return;
          hlsLoadFailed = true;
          tryNext();
        }, 10000);
        return;
      }

      /* mpegts.js لروابط MPEG-TS الخام (.ts) — البث غير المغلّف بـ HLS */
      if (wantsMpegts) {
        loadMpegts()
          .then((lib) => {
            if (cancelled) return;
            if (!lib.isSupported()) {
              mpegtsLoadFailed = true;
              tryNext();
              return;
            }
            attempt++;
            let player;
            try {
              player = lib.createPlayer(
                {
                  type: "mse",
                  isLive: cand.isLive !== false,
                  cors: true,
                  hasAudio: true,
                  hasVideo: true,
                  url: cand.url,
                },
                {
                  enableWorker: true,
                  enableStashBuffer: true,
                  stashInitialSize: 128,
                  liveBufferLatencyChasing: false,
                },
              );
            } catch {
              tryNext();
              return;
            }
            mpegtsRef.current = player;
            playingHandler = () => succeed(cand);
            video.addEventListener("playing", playingHandler);
            try {
              player.attachMediaElement(video);
              player.load();
              Promise.resolve(player.play()).catch(() => {
                video.muted = true;
                propsRef.current.onMutedChange(true);
                video.play().catch(() => {
                  /* سيضغط المستخدم زر التشغيل */
                });
              });
            } catch {
              tryNext();
              return;
            }
            player.on(lib.Events.ERROR, () => {
              if (cancelled) return;
              destroyPlayers();
              tryNext();
            });
            watchdog = window.setTimeout(() => {
              if (cancelled) return;
              destroyPlayers();
              tryNext();
            }, 12000);
          })
          .catch(() => {
            if (cancelled) return;
            mpegtsLoadFailed = true;
            tryNext();
          });
        return;
      }

      attempt++; /* استهلكنا هذا المرشّح */

      if (wantsHls && HlsLib?.isSupported()) {
        let mediaRecovered = false;
        const hls = new HlsLib({
          enableWorker: true,
          startFragPrefetch: true,
          lowLatencyMode: cand.isLive !== false,
          maxBufferLength: cand.isLive === false ? 120 : 30,
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
        hlsRef.current = hls;
        hls.loadSource(cand.url);
        hls.attachMedia(video);
        hls.on(HlsLib.Events.MANIFEST_PARSED, () => {
          if (cancelled) return;
          succeed(cand);
          const nextLevels = hls.levels.map((level, index) => ({
            index,
            label: level.height ? `${level.height}p` : level.name || `جودة ${index + 1}`,
          }));
          applyLevelIndex(-1);
          propsRef.current.onState({ levels: nextLevels });
          video.muted = propsRef.current.muted;
          video.play().catch(() => {
            video.muted = true;
            propsRef.current.onMutedChange(true);
            video.play().catch(() => {
              /* سيضغط المستخدم زر التشغيل */
            });
          });
        });
        hls.on(HlsLib.Events.AUDIO_TRACKS_UPDATED, () => {
          const audio = hls.audioTracks.map((t, index) => ({
            index,
            label: t.name || t.lang || `صوت ${index + 1}`,
          }));
          if (hls.audioTrack === -1 && audio.length > 0) hls.audioTrack = 0;
          applyTracks({ audio, audioIndex: hls.audioTrack });
        });
        hls.on(HlsLib.Events.AUDIO_TRACK_SWITCHED, () => {
          applyTracks({ audioIndex: hls.audioTrack });
        });
        hls.on(HlsLib.Events.SUBTITLE_TRACKS_UPDATED, () => {
          const subs = hls.subtitleTracks.map((t, index) => ({
            index,
            label: t.name || t.lang || `ترجمة ${index + 1}`,
          }));
          applyTracks({ subs, subIndex: hls.subtitleTrack });
        });
        hls.on(HlsLib.Events.SUBTITLE_TRACK_SWITCH, () => {
          applyTracks({ subIndex: hls.subtitleTrack });
        });
        hls.on(HlsLib.Events.LEVEL_SWITCHED, (_e, data) => {
          /* -1 = تلقائي (يختار hls.js الأفضل حسب سرعة الشبكة) — لا نلمسه */
          if (typeof data?.level === "number" && data.level >= 0 && levelIndexRef.current !== -1) {
            applyLevelIndex(data.level);
          }
        });
        hls.on(HlsLib.Events.ERROR, (_e, data) => {
          if (cancelled || !data.fatal) return;
          if (data.type === HlsLib?.ErrorTypes.MEDIA_ERROR && !mediaRecovered) {
            mediaRecovered = true;
            setStatusBoth("جاري تصحيح البث…");
            hls.recoverMediaError();
            return;
          }
          hls.destroy();
          if (hlsRef.current === hls) hlsRef.current = null;
          tryNext();
        });
        watchdog = window.setTimeout(() => {
          if (cancelled) return;
          hls.destroy();
          if (hlsRef.current === hls) hlsRef.current = null;
          tryNext();
        }, 12000);
      } else {
        /* تشغيل أصلي في وسم الفيديو (mp4/mkv وسفاري/الجوال) — لا يحتاج CORS */
        video.src = cand.url;
        video.load();
        video.muted = propsRef.current.muted;
        video.play().catch(() => {
          video.muted = true;
          propsRef.current.onMutedChange(true);
          video.play().catch(() => {
            /* تجاهل */
          });
        });
        applyLevelIndex(-1);
        propsRef.current.onState({ levels: [] });
        nativeHandler = () => tryNext();
        video.addEventListener("error", nativeHandler);
        video.onplaying = () => succeed(cand);
        watchdog = window.setTimeout(() => {
          if (!cancelled && video.readyState < 2) tryNext();
        }, 12000);
      }
    };

    /* استئناف المشاهدة عند فتح فيلم/حلقة */
    const onMeta = () => {
      const at = propsRef.current.resumeAt;
      if (at > 15 && video.currentTime < 5) video.currentTime = at;
    };
    video.addEventListener("loadedmetadata", onMeta);

    if (candidates.length > 0) tryNext();

    return () => {
      cancelled = true;
      detachNative();
      clearWatchdog();
      video.removeEventListener("loadedmetadata", onMeta);
      video.pause();
      destroyPlayers();
      video.removeAttribute("src");
      try {
        video.load();
      } catch {
        /* تجاهل */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  /* الصوت: خلية غير نشطة تُكتم دائماً، والنشطة تتبع زر الكتم العام */
  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = muted;
  }, [muted, item]);

  /* متابعة المشاهدة: حفظ الموضع كل 5 ثوانٍ لأفلام/حلقات فقط */
  const resumeKey = item?.resumeKey;
  useEffect(() => {
    if (!resumeKey) return;
    const iv = window.setInterval(() => {
      const v = videoRef.current;
      if (v && v.currentTime > 15 && !v.paused && !v.ended) {
        propsRef.current.onSaveResume(resumeKey, v.currentTime);
      }
    }, 5000);
    return () => window.clearInterval(iv);
  }, [resumeKey]);

  /* مراقبة البافر (Buffer) — مطابق لصفحة البث المباشر، ونشر للتغيير فقط
     (وأيضاً للخلية النشطة فقط) حتى لا يُعاد رسم المشغّل كاملاً كل ثانية */
  useEffect(() => {
    let lastPublished = -1;
    const iv = window.setInterval(() => {
      const v = videoRef.current;
      let next = 0;
      if (v && v.buffered.length > 0) {
        try {
          next = Math.round(Math.max(0, v.buffered.end(v.buffered.length - 1) - v.currentTime) * 10) / 10;
        } catch {
          next = 0;
        }
      }
      setBuffer(next);
      if (propsRef.current.active && next !== lastPublished) {
        lastPublished = next;
        propsRef.current.onState({ buffer: next });
      }
    }, 1000);
    return () => window.clearInterval(iv);
  }, []);

  useImperativeHandle(
    ref,
    (): StageCellHandle => ({
      setLevel: (index) => applyLevelIndex(index),
      setAudioTrack: (index) => {
        if (hlsRef.current) hlsRef.current.audioTrack = index;
        const v = videoRef.current as (HTMLVideoElement & {
          audioTracks?: { length: number; [i: number]: { enabled: boolean } };
        }) | null;
        if (v?.audioTracks) {
          try {
            const list = v.audioTracks;
            for (let i = 0; i < list.length; i += 1) list[i].enabled = i === index;
          } catch {
            /* تجاهل */
          }
        }
        applyTracks({ audioIndex: index });
      },
      setSubtitleTrack: (index) => {
        if (hlsRef.current) hlsRef.current.subtitleTrack = index;
        const v = videoRef.current;
        if (v) {
          for (const t of Array.from(v.textTracks)) t.mode = "disabled";
        }
        applyTracks({ subIndex: index });
      },
      enableUploadedSubtitle: () => {
        const v = videoRef.current;
        if (!v) return;
        if (hlsRef.current) hlsRef.current.subtitleTrack = -1;
        for (const t of Array.from(v.textTracks)) {
          t.mode = t.kind === "subtitles" && t.label === "ترجمة مرفوعة" ? "showing" : "disabled";
        }
        applyTracks({ subIndex: -2 });
      },
      seekBy: (seconds) => {
        const v = videoRef.current;
        if (v && Number.isFinite(v.duration) && v.duration > 0) {
          v.currentTime = Math.max(0, Math.min(v.duration - 0.5, v.currentTime + seconds));
        }
      },
      adjustVolume: (delta) => {
        const v = videoRef.current;
        if (!v) return;
        const next = Math.min(1, Math.max(0, Math.round((v.volume + delta) * 100) / 100));
        v.volume = next;
        if (next > 0 && v.muted) {
          v.muted = false;
          propsRef.current.onMutedChange(false);
        }
      },
      togglePlay: () => {
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) v.play().catch(() => {});
        else v.pause();
      },
      isPlaying: () => {
        const v = videoRef.current;
        return !!v && !v.paused && !v.ended && v.readyState >= 2;
      },
      getVideo: () => videoRef.current,
    }),
    [],
  );

  const style = aspectStyle(aspect) as CSSProperties;

  return (
    <div
      data-testid="stage-cell"
      className={`relative w-full aspect-video bg-black overflow-hidden ${active ? "ring-2 ring-[#d8ff3e] ring-inset" : ""}`}
    >
      <video
        ref={videoRef}
        controls
        playsInline
        preload="auto"
        className="w-full h-full bg-black"
        style={style}
        onVolumeChange={() => {
          const v = videoRef.current;
          if (v && propsRef.current.active) propsRef.current.onMutedChange(v.muted);
        }}
      >
        {item?.uploadedSub && (
          <track key={item.uploadedSub} kind="subtitles" label="ترجمة مرفوعة" src={item.uploadedSub} srcLang="ar" />
        )}
      </video>

      {!item && placeholder}

      {active && status && !error && (
        <div
          data-testid="stream-status"
          className="absolute top-4 inset-x-0 mx-auto w-fit max-w-[90%] glass-dark text-[#d8ff3e] border border-white/15 text-xs font-bold px-4 py-1.5 rounded-full text-center z-20 animate-pulse-soft pointer-events-none"
        >
          {status}
        </div>
      )}

      {active && error && (
        <div className="absolute top-4 inset-x-0 mx-auto w-fit max-w-[90%] bg-[#ff5c4d]/90 text-white text-xs font-black px-4 py-2 rounded-full text-center z-20">
          {error}
        </div>
      )}

      {active && item && muted && !error && (
        <button
          type="button"
          data-testid="unmute-button"
          onClick={() => propsRef.current.onUnmute()}
          className="absolute top-4 end-4 z-20 bg-[#d8ff3e] hover:bg-white text-black font-black text-xs px-3.5 py-1.5 rounded-full shadow-xl transition-all animate-pulse-soft cursor-pointer"
        >
          🔊 اضغط لتشغيل الصوت
        </button>
      )}

      {item && (
        <div
          className={`absolute ${active ? "top-4 start-4" : "top-2 start-2"} flex items-center gap-2 pointer-events-none z-10 max-w-[calc(100%-1rem)]`}
        >
          <div className="glass-dark border border-white/15 px-3 py-1 rounded-xl flex items-center gap-2 max-w-full">
            <span className="w-2 h-2 rounded-full bg-[#ff5c4d] animate-pulse-soft shrink-0" />
            <span className={`font-black truncate ${active ? "text-[13px]" : "text-[11px]"}`}>{item.stream.name}</span>
          </div>
          {active && buffer > 0 && (
            <span
              data-testid="buffer-badge"
              className="bg-[#0b0b0f]/80 text-[#3effe0] text-[10.5px] font-black px-2.5 py-1 rounded-full backdrop-blur-md border border-[#3effe0]/30"
            >
              ⚡ بافر: {buffer}s
            </span>
          )}
        </div>
      )}
    </div>
  );
});

export default StageCell;
