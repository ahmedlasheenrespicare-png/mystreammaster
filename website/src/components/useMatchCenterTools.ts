import { useCallback, useMemo, useRef, useState } from 'react';
import { eventKey, type MatchEvent } from '../lib/match-center.mjs';

/* ==========================================================================
   حالة مشتركة بين لوحتين: الحدث المختار، والانتقال إليه على الشريط، وربط
   ملاحظة المحلل بحدث.
   --------------------------------------------------------------------------
   لماذا هي خارج المكوّنات؟ لأن المطلوب «إتاحة الوصول إلى الحدث المقابل على
   الشريط الزمني» من قسم التحليل، والعكس صحيح: اختيار علامة على الملعب يجب أن
   يُظهر تفاصيلها في التحليل. لو بقيت الحالة داخل `PitchEvents` (كما كانت) لَمَا
   عرف قسم التحليل شيئاً عنها، ولو نُسخت إلى كل لوحة لصارت حالَتان تختلِفان
   عند أول تحديث.

   الواجهة لا تعرف `fetch` ولا تقرّر حالة مباراة؛ هذه الحالة تفاعلية بحتة.
   `onOpenNotes` جسرٌ لتبويب دفتر المحلل يبقى في الصفحة لأنها صاحبة الاختيار.
========================================================================== */

export interface MatchCenterNoteDraft {
  /** الحدث الذي طُلب ربط الملاحظة به، أو `null` لربط بدقيقة. */
  event: MatchEvent | null;
  /** عدّاد الطلب: نفس الحدث مرتان = طلبان، فيُعاد التوجيه والتركيز. */
  nonce: number;
}

export interface MatchCenterTools {
  selectedEventKey: string | null;
  /** الحدث المختار نفسه من أحداث القراءة الحالية، أو `null` إن لم يعد موجوداً. */
  selectedEvent: MatchEvent | null;
  selectEvent: (key: string | null) => void;
  /** آخر طلب إظهار على الشريط — يقرأه الملعب فيمرّر التركيز إلى العلامة. */
  reveal: { key: string; nonce: number } | null;
  revealEvent: (key: string) => void;
  noteDraft: MatchCenterNoteDraft | null;
  requestNoteDraft: (event: MatchEvent | null) => void;
  clearNoteDraft: () => void;
}

export interface UseMatchCenterToolsInput {
  events?: MatchEvent[] | null;
  /** معرّف المباراة: نفس بصمة `eventKey` المستعملة في طبقة العقد. */
  matchId: string;
  onOpenNotes?: () => void;
}

export function useMatchCenterTools({ events, matchId, onOpenNotes }: UseMatchCenterToolsInput): MatchCenterTools {
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{ key: string; nonce: number } | null>(null);
  const [noteDraft, setNoteDraft] = useState<MatchCenterNoteDraft | null>(null);
  const nonceRef = useRef(0);

  const selectedEvent = useMemo(() => {
    if (!selectedEventKey) return null;
    const list = Array.isArray(events) ? events : [];
    return list.find(event => eventKey(matchId, event) === selectedEventKey) ?? null;
  }, [selectedEventKey, matchId, events]);

  const selectEvent = useCallback((key: string | null) => {
    /* اختيارٌ ثانٍ لنفس الحدث يُلغيه: الزرّ على الملعب وفي القائمة «يُثبِّت ويحرّر». */
    setSelectedEventKey(current => (key === null || current === key ? null : key));
  }, []);

  const revealEvent = useCallback((key: string) => {
    nonceRef.current += 1;
    setSelectedEventKey(key);
    setReveal({ key, nonce: nonceRef.current });
  }, []);

  const requestNoteDraft = useCallback((event: MatchEvent | null) => {
    nonceRef.current += 1;
    setNoteDraft({ event, nonce: nonceRef.current });
    onOpenNotes?.();
  }, [onOpenNotes]);

  const clearNoteDraft = useCallback(() => setNoteDraft(current => (current ? null : current)), []);

  return {
    selectedEventKey,
    selectedEvent,
    selectEvent,
    reveal,
    revealEvent,
    noteDraft,
    requestNoteDraft,
    clearNoteDraft,
  };
}
