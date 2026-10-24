import { useRef, type TouchEvent, type MouseEvent } from 'react';

/** Horizontal touch gestures only; leave page scrolling and ordinary taps intact. */
export function useTicketSwipe(onStep: (delta: number) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const suppressUntil = useRef(0);
  return {
    onTouchStart(event: TouchEvent<HTMLElement>) {
      start.current = event.touches.length === 1
        ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
    },
    onTouchMove(event: TouchEvent<HTMLElement>) {
      if (event.touches.length !== 1) start.current = null;
    },
    onTouchCancel() { start.current = null; },
    onTouchEnd(event: TouchEvent<HTMLElement>) {
      const origin = start.current;
      start.current = null;
      if (!origin || !event.changedTouches[0]) return;
      const dx = event.changedTouches[0].clientX - origin.x;
      const dy = event.changedTouches[0].clientY - origin.y;
      if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy) * 1.25) return;
      suppressUntil.current = Date.now() + 500;
      // RTL: swipe right to advance, left to return.
      onStep(dx > 0 ? 1 : -1);
    },
    onClickCapture(event: MouseEvent<HTMLElement>) {
      if (Date.now() < suppressUntil.current) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
  };
}
