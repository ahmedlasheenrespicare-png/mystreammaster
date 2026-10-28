export type MotionPreference = 'auto' | 'on' | 'off';
const KEY = 'sm-motion-preference';
const EVENT = 'sm-motion-change';
export function getMotionPreference(): MotionPreference {
  if (typeof window === 'undefined') return 'auto';
  try {
    const value = localStorage.getItem(KEY);
    return value === 'on' || value === 'off' ? value : 'auto';
  } catch { return 'auto'; }
}
export function motionReduced(): boolean {
  if (typeof window === 'undefined') return false;
  const preference = document.documentElement.dataset.motion ?? getMotionPreference();
  return preference === 'off' || (preference !== 'on' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}
export function initializeMotionPreference() {
  document.documentElement.dataset.motion = getMotionPreference();
}
export function setMotionPreference(value: MotionPreference) {
  try { localStorage.setItem(KEY, value); } catch { /* Session-only when storage is blocked. */ }
  document.documentElement.dataset.motion = value;
  window.dispatchEvent(new Event(EVENT));
}
/** Effective media query: native system preference plus the visitor's override. */
export function motionMedia() {
  const native = window.matchMedia('(prefers-reduced-motion: reduce)');
  return {
    get matches() { return motionReduced(); },
    addEventListener(_type: 'change', listener: () => void) {
      native.addEventListener('change', listener);
      window.addEventListener(EVENT, listener);
    },
    removeEventListener(_type: 'change', listener: () => void) {
      native.removeEventListener('change', listener);
      window.removeEventListener(EVENT, listener);
    },
  };
}
