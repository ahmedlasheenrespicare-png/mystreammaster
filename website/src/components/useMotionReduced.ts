import { useSyncExternalStore } from 'react';
import { motionMedia, motionReduced } from '../lib/motion-preference';
function subscribe(listener: () => void) {
  const media = motionMedia();
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}
export function useMotionReduced() {
  return useSyncExternalStore(subscribe, motionReduced, () => false);
}
