import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { getResumeAt, hashPin, isValidPin, verifyPin } from "../lib/xtream.mjs";
import type {
  Category,
  EpgInfo,
  PinState,
  ResumeMap,
  SeriesEpisode,
  SeriesInfo,
  Stream,
  VodInfo,
} from "../lib/xtream.mjs";
import { IconClose, IconPlay, IconSearch, IconStar, IconTv } from "./Icons";

/* ==========================================================================
   لوحات محتوى المشغّل: الأفلام، المسلسلات، بطاقات التفاصيل، القفل الأبوي،
   درج القنوات داخل الشاشة، وشريط دليل البرامج (EPG) — مكوّنات عرضية
   تستقبل بياناتها ودوالها من XtreamPlayer.
   ======================================================================== */

/* -------------------------- بطاقة إعلام (فيلم/مسلسل) ---------------------- */

function MediaCard({ item, onPick, badge }: { item: Stream; onPick: () => void; badge?: string }) {
  return (
    <button
      type="button"
      data-testid="media-card"
      onClick={onPick}
      className="group text-right rounded-xl overflow-hidden bg-black/[0.04] border border-black/10 hover:border-[#2b4eff] transition cursor-pointer"
    >
      <span className="block relative aspect-[2/3] bg-[#0b0b0f]">
        {item.icon ? (
          <img
            src={item.icon}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-black/30 text-3xl font-black">
            {item.name.charAt(0)}
          </span>
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition grid place-items-center">
          <span className="w-10 h-10 rounded-full bg-[#d8ff3e] text-black grid place-items-center">
            <IconPlay className="w-5 h-5 mr-0.5" />
          </span>
        </span>
        {badge && (
          <span className="absolute top-1.5 start-1.5 bg-[#2b4eff] text-white text-[9.5px] font-black px-1.5 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </span>
      <span className="block px-2 py-2">
        <span className="block text-[11.5px] font-black text-black/85 line-clamp-2 leading-snug">{item.name}</span>
        {typeof item.rating === "number" && item.rating > 0 && (
          <span className="flex items-center gap-1 text-[10px] font-black text-[#e67e22] mt-1">
            <IconStar className="w-3 h-3" fill="currentColor" stroke="currentColor" strokeWidth={1.5} />
            {item.rating.toFixed(1)}
          </span>
        )}
      </span>
    </button>
  );
}

/* --------------------------- لوح القوائم (أفخم/مسلسلات) -------------------- */

export interface MediaPanelProps {
  items: Stream[];
  categories: Category[];
  loading: boolean;
  loaded: boolean;
  error: string;
  query: string;
  onQuery: (value: string) => void;
  catId: string;
  onCat: (id: string) => void;
  searchPlaceholder: string;
  heading: string;
  loadedCount: number;
  shown: number;
  onMore: () => void;
  onPick: (item: Stream) => void;
  emptyText: string;
  gridId?: string;
}

export function MediaPanel({
  items,
  categories,
  loading,
  loaded,
  error,
  query,
  onQuery,
  catId,
  onCat,
  searchPlaceholder,
  heading,
  loadedCount,
  shown,
  onMore,
  onPick,
  emptyText,
  gridId,
}: MediaPanelProps) {
  const page = useMemo(() => items.slice(0, shown), [items, shown]);
  return (
    <>
      <div className="p-4 border-b border-black/10 bg-[#faf9f6] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-black flex items-center gap-2">
            <IconTv className="w-4 h-4 text-[#2b4eff]" /> {heading}
          </h3>
          <span className="text-[11px] font-black bg-[#d8ff3e] px-2 py-0.5 rounded-full">
            {(loadedCount || items.length).toLocaleString("en-US")}
          </span>
        </div>
        <div className="relative">
          <IconSearch className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-black/35" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-full rounded-full bg-white border border-black/10 ps-10 pe-3 py-2.5 text-[13px] font-medium placeholder:text-black/35 focus:border-[#2b4eff] focus:outline-none transition"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 text-[11px] font-bold">
          <button
            type="button"
            data-testid="category-all"
            onClick={() => {
              onCat("");
              onQuery("");
            }}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer ${
              !catId && !query ? "bg-[#0b0b0f] text-white font-black" : "bg-white text-black/50 border border-black/10 hover:border-black"
            }`}
          >
            الكل
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              data-testid={`category-${c.id}`}
              onClick={() => {
                onCat(c.id);
                onQuery("");
              }}
              className={`px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer ${
                catId === c.id && !query ? "bg-[#0b0b0f] text-white font-black" : "bg-white text-black/50 border border-black/10 hover:border-black"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div data-testid={gridId} className="flex-1 overflow-y-auto no-scrollbar p-3">
        {loading ? (
          <div className="p-8 text-center text-black/50 text-[13px] font-bold flex flex-col items-center gap-3">
            <span className="w-7 h-7 border-2 border-black/15 border-t-[#2b4eff] rounded-full animate-spin" />
            جاري تحميل المحتوى…
          </div>
        ) : error ? (
          <div className="p-6 text-center text-[12.5px] font-bold text-[#c0392b] bg-[#ff5c4d]/10 rounded-2xl">{error}</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-black/40 text-[13px] font-bold">
            {loaded ? emptyText : "اضغط لتحديث القائمة."}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2.5">
              {page.map((item) => (
                <MediaCard key={`${item.id}-${item.name}`} item={item} onPick={() => onPick(item)} />
              ))}
            </div>
            {items.length > shown && (
              <div className="text-center mt-3">
                <button
                  type="button"
                  data-testid="load-more"
                  onClick={onMore}
                  className="text-[12px] font-black bg-[#0b0b0f] text-white px-5 py-2 rounded-full hover:bg-[#2b4eff] transition cursor-pointer"
                >
                  عرض المزيد ({(items.length - shown).toLocaleString("en-US")})
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

/* --------------------------- نافذة تفاصيل الفيلم -------------------------- */

function ModalShell({ children, onClose, testId }: { children: ReactNode; onClose: () => void; testId: string }) {
  if (typeof document === "undefined" || !document.body) return null;
  return createPortal(
    <div
      data-testid={testId}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[760px] max-h-[86vh] overflow-y-auto rounded-[26px] bg-white text-[#0b0b0f] p-5 sm:p-7 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export interface VodDialogProps {
  name: string;
  detail: VodInfo | null;
  loading: boolean;
  error: string;
  resumeAt: number;
  onClose: () => void;
  onPlay: () => void;
}

export function VodDialog({ name, detail, loading, error, resumeAt, onClose, onPlay }: VodDialogProps) {
  return (
    <ModalShell testId="vod-dialog" onClose={onClose}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="font-display font-black text-[20px] leading-tight">{detail?.name || name}</h3>
        <button
          type="button"
          data-testid="dialog-close"
          onClick={onClose}
          aria-label="إغلاق"
          className="w-9 h-9 grid place-items-center rounded-full bg-black/5 hover:bg-black/10 cursor-pointer shrink-0"
        >
          <IconClose className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-black/50 text-[13px] font-bold flex flex-col items-center gap-3">
          <span className="w-7 h-7 border-2 border-black/15 border-t-[#2b4eff] rounded-full animate-spin" />
          جاري تحميل بيانات الفيلم…
        </div>
      ) : error ? (
        <div className="py-6 text-center text-[13px] font-bold text-[#c0392b]">{error}</div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="w-full sm:w-[190px] shrink-0">
            <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-[#0b0b0f]">
              {detail?.poster ? (
                <img src={detail.poster} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center text-white/30 text-4xl font-black">
                  {name.charAt(0)}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 space-y-3">
            {detail && detail.rating > 0 && (
              <div className="flex items-center gap-1.5 text-[14px] font-black text-[#e67e22]">
                <IconStar className="w-4 h-4" fill="currentColor" stroke="currentColor" strokeWidth={1.5} />
                {detail.rating.toFixed(1)} / 10
              </div>
            )}
            <div className="flex flex-wrap gap-2 text-[11.5px] font-black">
              {detail?.genre && <span className="bg-black/5 rounded-full px-3 py-1">{detail.genre}</span>}
              {detail?.duration && <span className="bg-black/5 rounded-full px-3 py-1">⏱ {detail.duration}</span>}
              {detail?.release && <span className="bg-black/5 rounded-full px-3 py-1">{detail.release}</span>}
            </div>
            {detail?.plot && <p className="text-[13.5px] font-medium leading-relaxed text-black/70">{detail.plot}</p>}
            {detail?.cast && (
              <p className="text-[12.5px] font-bold text-black/55">
                <span className="font-black text-black/70">طاقم التمثيل: </span>
                {detail.cast}
              </p>
            )}
            <div className="flex flex-wrap gap-2.5 pt-2">
              <button
                type="button"
                data-testid="vod-play"
                onClick={onPlay}
                className="inline-flex items-center gap-2 bg-[#0b0b0f] text-white text-[13.5px] font-black px-6 py-3 rounded-full hover:bg-[#2b4eff] transition cursor-pointer"
              >
                <IconPlay className="w-4 h-4" /> {resumeAt > 15 ? "متابعة المشاهدة" : "تشغيل الفيلم"}
              </button>
              {resumeAt > 15 && (
                <button
                  type="button"
                  onClick={onPlay}
                  className="text-[12.5px] font-black border border-black/15 px-4 py-3 rounded-full hover:border-black cursor-pointer"
                >
                  من البداية
                </button>
              )}
              {detail?.trailer && (
                <a
                  href={detail.trailer}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12.5px] font-black text-[#2b4eff] border border-[#2b4eff]/30 px-4 py-3 rounded-full hover:bg-[#2b4eff]/5"
                >
                  ▶ إعلان الفيلم
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

/* -------------------------- نافذة مسلسل (مواسم/حلقات) -------------------- */

export interface SeriesDialogProps {
  name: string;
  info: SeriesInfo | null;
  loading: boolean;
  error: string;
  resumeMap: ResumeMap;
  activeKey: string;
  onClose: () => void;
  onPlayEpisode: (episode: SeriesEpisode, seasonNum: number, label: string) => void;
}

export function SeriesDialog({ name, info, loading, error, resumeMap, activeKey, onClose, onPlayEpisode }: SeriesDialogProps) {
  const [seasonNum, setSeasonNum] = useState<number | null>(null);
  const seasons = info?.seasons ?? [];
  const currentNum = seasonNum ?? seasons[0]?.num ?? null;
  const season = seasons.find((s) => s.num === currentNum) ?? seasons[0] ?? null;

  return (
    <ModalShell testId="series-dialog" onClose={onClose}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="font-display font-black text-[20px] leading-tight">{info?.name || name}</h3>
        <button
          type="button"
          data-testid="dialog-close"
          onClick={onClose}
          aria-label="إغلاق"
          className="w-9 h-9 grid place-items-center rounded-full bg-black/5 hover:bg-black/10 cursor-pointer shrink-0"
        >
          <IconClose className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-black/50 text-[13px] font-bold flex flex-col items-center gap-3">
          <span className="w-7 h-7 border-2 border-black/15 border-t-[#2b4eff] rounded-full animate-spin" />
          جاري تحميل المواسم والحلقات…
        </div>
      ) : error ? (
        <div className="py-6 text-center text-[13px] font-bold text-[#c0392b]">{error}</div>
      ) : (
        <div className="space-y-4">
          {info?.plot && <p className="text-[13.5px] font-medium leading-relaxed text-black/70">{info.plot}</p>}
          <div className="flex flex-wrap items-center gap-2 text-[11.5px] font-black">
            {info && info.rating > 0 && (
              <span className="inline-flex items-center gap-1 text-[#e67e22]">
                <IconStar className="w-3.5 h-3.5" fill="currentColor" stroke="currentColor" strokeWidth={1.5} />
                {info.rating.toFixed(1)}
              </span>
            )}
            {seasons.map((s) => (
              <button
                key={s.num}
                type="button"
                data-testid={`season-${s.num}`}
                onClick={() => setSeasonNum(s.num)}
                className={`px-3 py-1.5 rounded-full cursor-pointer transition ${
                  s.num === season?.num ? "bg-[#2b4eff] text-white font-black" : "bg-black/5 text-black/60 hover:bg-black/10"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          <div className="max-h-[45vh] overflow-y-auto rounded-2xl border border-black/10 divide-y divide-black/5">
            {(season?.episodes ?? []).map((ep) => {
              const key = `e:${ep.id}`;
              const resumeAt = getResumeAt(resumeMap, key);
              const isActive = activeKey === key;
              return (
                <button
                  key={ep.id || ep.num}
                  type="button"
                  data-testid="episode-row"
                  onClick={() =>
                    onPlayEpisode(ep, season?.num ?? 1, `${info?.name || name} — ${season?.name ?? ""} ${ep.title}`)
                  }
                  className={`w-full flex items-center gap-3 px-4 py-3 text-right transition cursor-pointer ${
                    isActive ? "bg-[#2b4eff]/10" : "hover:bg-black/[0.04]"
                  }`}
                >
                  <span
                    className={`w-9 h-9 shrink-0 rounded-lg grid place-items-center text-[12px] font-black ${
                      isActive ? "bg-[#0b0b0f] text-[#d8ff3e]" : "bg-[#f4f3ef] text-black/60"
                    }`}
                  >
                    {ep.num}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-black truncate">{ep.title}</span>
                    {ep.duration && <span className="block text-[11px] font-bold text-black/45">{ep.duration}</span>}
                  </span>
                  {resumeAt > 15 && (
                    <span className="text-[10.5px] font-black bg-[#d8ff3e] px-2 py-1 rounded-full shrink-0">
                      متابعة
                    </span>
                  )}
                  <span className="w-8 h-8 shrink-0 rounded-full bg-[#0b0b0f] text-white grid place-items-center">
                    <IconPlay className="w-3.5 h-3.5 mr-0.5" />
                  </span>
                </button>
              );
            })}
            {(season?.episodes ?? []).length === 0 && (
              <div className="p-6 text-center text-black/40 text-[13px] font-bold">لا توجد حلقات في هذا الموسم.</div>
            )}
          </div>
        </div>
      )}
    </ModalShell>
  );
}

/* ------------------------------ القفل الأبوي ------------------------------ */

export interface PinDialogProps {
  mode: "setup" | "unlock";
  state: PinState | null;
  targets: { key: string; label: string; group: string }[];
  unlockLabel: string;
  onClose: () => void;
  onVerify: (pin: string) => boolean;
  onSave: (next: PinState) => void;
  onClear: () => void;
}

export function PinDialog({ mode, state, targets, unlockLabel, onClose, onVerify, onSave, onClear }: PinDialogProps) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [verified, setVerified] = useState(false);
  const [locked, setLocked] = useState<string[]>(state?.locked ?? []);
  const [err, setErr] = useState("");

  const manage = mode === "setup" && !!state;

  const submit = () => {
    setErr("");
    if (manage && !verified) {
      if (!verifyPin(state?.pin ?? "", pin)) {
        setErr("الرمز غير صحيح — حاول مرة أخرى.");
        return;
      }
      setVerified(true);
      setPin("");
      return;
    }
    if (mode === "unlock") {
      if (!onVerify(pin)) {
        setErr("الرمز غير صحيح — حاول مرة أخرى.");
        return;
      }
      onClose();
      return;
    }
    /* إنشاء رمز جديد */
    if (!isValidPin(pin)) {
      setErr("أدخل 4 أرقام فقط.");
      return;
    }
    if (pin !== confirm) {
      setErr("الرمزان غير متطابقين.");
      return;
    }
    onSave({ pin: hashPin(pin), locked });
    onClose();
  };

  return (
    <ModalShell testId="pin-dialog" onClose={onClose}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="font-display font-black text-[18px]">
          {mode === "unlock" ? `القفل الأبوي — ${unlockLabel}` : manage ? "إدارة القفل الأبوي" : "تعيين رمز القفل الأبوي"}
        </h3>
        <button
          type="button"
          data-testid="dialog-close"
          onClick={onClose}
          aria-label="إغلاق"
          className="w-9 h-9 grid place-items-center rounded-full bg-black/5 hover:bg-black/10 cursor-pointer shrink-0"
        >
          <IconClose className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {(!manage || verified) && mode === "setup" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12.5px] font-black text-black/70 mb-1.5">رمز من 4 أرقام</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                data-testid="pin-input"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                dir="ltr"
                className="w-full rounded-2xl border border-black/10 bg-[#faf9f6] px-3.5 py-3 text-[16px] font-black tracking-[0.5em] text-center focus:border-[#2b4eff] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[12.5px] font-black text-black/70 mb-1.5">تأكيد الرمز</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                data-testid="pin-confirm"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
                dir="ltr"
                className="w-full rounded-2xl border border-black/10 bg-[#faf9f6] px-3.5 py-3 text-[16px] font-black tracking-[0.5em] text-center focus:border-[#2b4eff] focus:outline-none"
              />
            </div>
          </div>
        )}

        {(mode === "unlock" || (manage && !verified)) && (
          <div>
            <label className="block text-[12.5px] font-black text-black/70 mb-1.5">أدخل الرمز</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              data-testid="pin-input"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              dir="ltr"
              className="w-full rounded-2xl border border-black/10 bg-[#faf9f6] px-3.5 py-3 text-[16px] font-black tracking-[0.5em] text-center focus:border-[#2b4eff] focus:outline-none"
            />
          </div>
        )}

        {mode === "setup" && verified && (
          <div className="space-y-2">
            <p className="text-[12.5px] font-black text-black/70">اختر التصنيفات المراد قفلها:</p>
            <div className="max-h-[30vh] overflow-y-auto rounded-2xl border border-black/10 p-2 space-y-1">
              {targets.length === 0 && <p className="text-[12px] font-bold text-black/40 p-2">لا توجد تصنيفات بعد.</p>}
              {targets.map((t) => (
                <label key={t.key} className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-black/[0.04] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={locked.includes(t.key)}
                    onChange={() =>
                      setLocked((prev) => (prev.includes(t.key) ? prev.filter((k) => k !== t.key) : [...prev, t.key]))
                    }
                    className="w-4 h-4 accent-[#2b4eff]"
                  />
                  <span className="text-[12.5px] font-bold flex-1">{t.label}</span>
                  <span className="text-[10.5px] font-black text-black/35">{t.group}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {err && <p className="text-[12.5px] font-black text-[#c0392b]" data-testid="pin-error">{err}</p>}

        <div className="flex flex-wrap gap-2.5 pt-1">
          <button
            type="button"
            data-testid="pin-submit"
            onClick={submit}
            className="bg-[#0b0b0f] text-white text-[13.5px] font-black px-6 py-2.5 rounded-full hover:bg-[#2b4eff] transition cursor-pointer"
          >
            {mode === "unlock" ? "فتح" : manage && !verified ? "تحقق" : "حفظ"}
          </button>
          {manage && verified && (
            <button
              type="button"
              onClick={() => {
                onClear();
                onClose();
              }}
              className="text-[12.5px] font-black text-[#c0392b] border border-[#c0392b]/30 px-4 py-2.5 rounded-full hover:bg-[#c0392b]/5 cursor-pointer"
            >
              إزالة القفل بالكامل
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-[12.5px] font-black text-black/50 px-4 py-2.5 rounded-full hover:bg-black/5 cursor-pointer"
          >
            إلغاء
          </button>
        </div>
        <p className="text-[11px] font-bold text-black/40 leading-relaxed">
          الرمز يُحفظ مشفّراً (Hash) في متصفحك فقط ولا يُرسل لأي جهة. يُطلب الرمز عند فتح تصنيف مقفل.
        </p>
      </div>
    </ModalShell>
  );
}

/* ------------------------- درج القنوات داخل الشاشة ------------------------ */

export interface ChannelDrawerProps {
  streams: Stream[];
  currentKey: string;
  epgNowTitle: string;
  onPick: (stream: Stream) => void;
  onClose: () => void;
}

export function ChannelDrawer({ streams, currentKey, epgNowTitle, onPick, onClose }: ChannelDrawerProps) {
  return (
    <div className="absolute inset-0 z-40 bg-[#0b0b0f]/95 backdrop-blur-md flex flex-col" data-testid="channel-drawer">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h4 className="text-[14px] font-black flex items-center gap-2">
          <IconTv className="w-4 h-4 text-[#d8ff3e]" /> قنواتي ({streams.length.toLocaleString("en-US")})
          {epgNowTitle && <span className="text-[11px] font-bold text-[#3effe0] truncate max-w-[40vw]">• {epgNowTitle}</span>}
        </h4>
        <button
          type="button"
          data-testid="drawer-close"
          onClick={onClose}
          aria-label="إغلاق القائمة"
          className="w-9 h-9 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
        >
          <IconClose className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar py-2">
        {streams.map((ch) => {
          const isActive = streamKeyOf(ch) === currentKey;
          return (
            <button
              key={`${ch.catId}-${ch.id}-${ch.name}`}
              type="button"
              data-testid="drawer-row"
              onClick={() => onPick(ch)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-right transition cursor-pointer ${
                isActive ? "bg-[#d8ff3e]/15 text-[#d8ff3e]" : "text-white/80 hover:bg-white/5"
              }`}
            >
              <span className="w-8 text-[11px] font-black text-white/40 shrink-0" dir="ltr">
                {ch.num || ch.id}
              </span>
              <span className="text-[13px] font-bold truncate flex-1">{ch.name}</span>
              {isActive && <span className="w-2 h-2 rounded-full bg-[#ff5c4d] animate-pulse-soft shrink-0" />}
            </button>
          );
        })}
        {streams.length === 0 && <div className="p-6 text-center text-white/40 text-[13px] font-bold">لا توجد قنوات.</div>}
      </div>
    </div>
  );
}

function streamKeyOf(stream: Stream): string {
  return `${stream.catId || ""}:${stream.id}`;
}

/* ------------------------ شريط دليل البرامج (EPG) ------------------------ */

export function EpgBar({ epg }: { epg: EpgInfo | null }) {
  if (!epg || (!epg.now && !epg.next)) return null;
  const clock = (ts: number) => {
    if (!ts) return "";
    const d = new Date(ts * 1000);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  return (
    <div
      data-testid="epg-bar"
      className="rounded-2xl bg-white/[0.05] border border-white/10 px-5 py-3.5 space-y-2.5"
    >
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <p className="text-[13px] font-black">
          {epg.now?.title ? (
            <>
              يعرض الآن: <span className="text-[#d8ff3e]">{epg.now.title}</span>
              {epg.now.startTs > 0 && epg.now.endTs > 0 && (
                <span className="text-white/45 font-bold text-[12px]">
                  {" "}
                  ({clock(epg.now.startTs)} - {clock(epg.now.endTs)})
                </span>
              )}
            </>
          ) : (
            <span className="text-white/50">لا يوجد دليل برامج لهذه القناة</span>
          )}
        </p>
        {epg.next?.title && (
          <p className="text-[12.5px] font-bold text-white/60">
            التالي: <span className="text-white/85">{epg.next.title}</span>
            {epg.next.startTs > 0 && <span className="text-white/40"> — {clock(epg.next.startTs)}</span>}
          </p>
        )}
      </div>
      {epg.now && typeof epg.progress === "number" && (
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#2b4eff] to-[#d8ff3e] transition-all"
            style={{ width: `${Math.round(epg.progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
