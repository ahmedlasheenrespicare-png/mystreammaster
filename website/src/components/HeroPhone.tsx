import { useState } from 'react';
import './hero-phone.css';

/* Adapted from ashif_6672 / wise-ape-51 (variation of mobinkakei), MIT.
   https://uiverse.io/ashif_6672/wise-ape-51
   A visual phone demo, not a real device status or music player. */
function PhoneIcon({ kind }: { kind: 'weather' | 'camera' | 'flash' | 'call' | 'chat' | 'search' | 'music' }) {
  const paths = {
    weather: 'M7 17a4 4 0 0 1-1-7.9A6 6 0 0 1 18 8a4.5 4.5 0 0 1 0 9H7Z',
    camera: 'M4 7h4l2-3h4l2 3h4v13H4V7ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    flash: 'm13 2-9 12h7l-1 8L21 9h-8l1-7Z',
    call: 'm5 3 4 4-2 3c1 3 4 6 7 7l3-2 4 4-2 3C10 23 1 14 2 5l3-2Z',
    chat: 'M21 11a9 8 0 0 1-9 8H7l-5 3 2-6a8 8 0 1 1 17-5ZM7 11h.01M12 11h.01M17 11h.01',
    search: 'M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0Zm-1 5 6 6',
    music: 'M9 18V5l12-3v13M9 9l12-3M9 18c0 2-6 4-6 1s6-4 6-1Zm12-3c0 2-6 4-6 1s6-4 6-1Z',
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]} /></svg>;
}

export function HeroPhone() {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      className="hero-phone"
      data-open={open}
      data-hero-phone=""
      aria-label="عرض تطبيقات نموذج الهاتف"
      aria-pressed={open}
      onClick={() => setOpen(value => !value)}
    >
      <span className="sr-only">نموذج توضيحي تفاعلي؛ اضغط للتبديل بين شاشة القفل والتطبيقات.</span>
      <span className="hero-phone-screen" aria-hidden="true" dir="ltr">
        <span className="hero-phone-wallpaper" />
        <span className="hero-phone-orb hero-phone-orb--purple" />
        <span className="hero-phone-orb hero-phone-orb--cyan" />
        <span className="hero-phone-status"><span>9:41</span><span className="hero-phone-indicators"><svg viewBox="0 0 24 24"><path d="M3 20h18V2L3 20Z" /></svg><svg viewBox="0 0 24 24"><path d="M2 5h17v14H2V5Zm18 5h3v4h-3v-4Z" /></svg></span></span>
        <span className="hero-phone-lock">
          <span className="hero-phone-date">TUESDAY, 10 DEC</span>
          <span className="hero-phone-time">09:41</span>
          <span className="hero-phone-shortcuts"><span><PhoneIcon kind="flash" /></span><span><PhoneIcon kind="camera" /></span></span>
          <span className="hero-phone-home-bar" />
        </span>
        <span className="hero-phone-apps">
          <span className="hero-phone-grid">
            <span className="hero-phone-app hero-phone-app--weather"><PhoneIcon kind="weather" /></span>
            <span className="hero-phone-app hero-phone-app--calendar"><small>Tue</small><span>10</span></span>
            <span className="hero-phone-app hero-phone-app--photos"><span /></span>
            <span className="hero-phone-app hero-phone-app--camera"><PhoneIcon kind="camera" /></span>
          </span>
          <span className="hero-phone-dock">
            <span className="hero-phone-app hero-phone-app--call"><PhoneIcon kind="call" /></span>
            <span className="hero-phone-app hero-phone-app--chat"><PhoneIcon kind="chat" /></span>
            <span className="hero-phone-app hero-phone-app--search"><PhoneIcon kind="search" /></span>
          </span>
        </span>
      </span>
      <span className="hero-phone-shine" aria-hidden="true" />
      <span className="hero-phone-island" aria-hidden="true" dir="ltr">
        <span className="hero-phone-music"><span className="hero-phone-album"><PhoneIcon kind="music" /></span><span><strong>Playing Music</strong><small>Artist Name</small></span><span className="hero-phone-equalizer"><i /><i /><i /></span></span>
      </span>
      <span className="hero-phone-side hero-phone-side--power" aria-hidden="true" />
      <span className="hero-phone-side hero-phone-side--mute" aria-hidden="true" />
      <span className="hero-phone-side hero-phone-side--up" aria-hidden="true" />
      <span className="hero-phone-side hero-phone-side--down" aria-hidden="true" />
    </button>
  );
}
