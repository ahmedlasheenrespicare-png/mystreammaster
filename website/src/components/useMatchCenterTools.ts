import { useCallback, useMemo, useRef, useState } from 'react';
import { eventKey, type MatchEvent } from '../lib/match-center.mjs';

export interface MatchCenterTools {
  selectedEventKey: string | null;
  /** الحدث المختار نفسه من أحداث القراءة الحالية، أو `null` إن لم يعد موجوداً. */
  selectedEvent: MatchEvent | null;
  selectEvent: (key: string | null) => void;
  /** آخر طلب إظهار على الشريط — يقرأه الملعب فيمرّر التركيز إلى العلامة. */
  reveal: { key: string; nonce: number } | null;
  revealEvent: (key: string) => void;
}

export interface UseMatchCenterToolsInput {
  events?: MatchEvent[] | null;
  /** معرّف المباراة: نفس بصمة `eventKey` المستعملة في طبقة العقد. */
  matchId: string;
}

export function useMatchCenterTools({ events, matchId }: UseMatchCenterToolsInput): MatchCenterTools {
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{ key: string; nonce: number } | null>(null);
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

  return {
    selectedEventKey,
    selectedEvent,
    selectEvent,
    reveal,
    revealEvent,
  };
}
