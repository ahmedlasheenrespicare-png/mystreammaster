import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Match } from '../lib/matches.mjs';
import { CrownClashSlide, clashSummary, type FeaturedClash } from './LeagueTicketCard';
import './crown-match-fullscreen.css';

export function CrownFullscreen({ label, closeLabel, glow, children, onClose }: {
  label: string; closeLabel: string; glow: string; children: ReactNode; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const opener = document.activeElement as HTMLElement | null;
    const scrollY = window.scrollY;
    const body = document.body;
    const previous = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow };
    body.style.position = 'fixed'; body.style.top = `-${scrollY}px`;
    body.style.width = '100%'; body.style.overflow = 'hidden';
    dialog.showModal();
    return () => {
      dialog.close();
      Object.assign(body.style, previous);
      window.scrollTo({ top: scrollY, behavior: 'instant' });
      opener?.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(<dialog ref={ref} className="crown-match-fullscreen" style={{ "--hs-glow": glow } as CSSProperties} aria-label={label} onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={event => {
    // The card is read-only; its only control is Close. Keep Tab inside even
    // on browsers that otherwise move focus into browser chrome.
    if (event.key === 'Tab') {
      event.preventDefault();
      ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
    }
  }}>
    <button type="button" className="crown-match-fullscreen-close" onClick={onClose} autoFocus aria-label={closeLabel}>✕</button>
    {children}
  </dialog>, document.body);
}

/** Match cards and league cards share one accessible top-layer shell. */
export default function CrownMatchFullscreen({ clash, match, glow, onClose }: {
  clash: FeaturedClash; match: Match | null; glow: string; onClose: () => void;
}) {
  return <CrownFullscreen label={`عرض المواجهة: ${clash.home.name} و${clash.away.name}`} closeLabel="إغلاق عرض المواجهة" glow={glow} onClose={onClose}>
    <span className="sr-only">{clashSummary(match, clash)}</span>
    <CrownClashSlide clash={clash} match={match} active />
  </CrownFullscreen>;
}
