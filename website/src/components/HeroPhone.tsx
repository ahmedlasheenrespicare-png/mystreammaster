import { useEffect, useId, useState } from 'react';
import './hero-phone.css';
import { ServerIcon } from './ServerIcon';
import { IconPlay } from './Icons';

/* Adapted from ashif_6672 / wise-ape-51 (variation of mobinkakei), MIT.
   https://uiverse.io/ashif_6672/wise-ape-51
   Visual phone demo with a real Cairo clock; no real device status or music player. */
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

const PHONE_SERVERS = [
  { code: 'nova', label: 'نوفا' },
  { code: 'istar', label: 'إيستار' },
  { code: 'moka', label: 'موكا' },
  { code: 'x', label: 'X' },
] as const;

function PhoneServers() {
  return (
    <span className="hero-phone-servers" dir="rtl">
      {PHONE_SERVERS.map(server => (
        <span key={server.code} className="hero-phone-server" data-phone-server={server.code}>
          <ServerIcon code={server.code} size={28} />
          <span className="hero-phone-server-label">{server.label}</span>
        </span>
      ))}
    </span>
  );
}

export function HeroPhone() {
  const [open, setOpen] = useState(false);
  const descriptionId = useId();
  // Client-only initialization keeps prerendered HTML and hydration identical.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const refresh = () => setNow(new Date());
    refresh();
    const timer = window.setInterval(refresh, 1000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  const time = now ? new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(now) : '—:—';
  const date = now ? new Intl.DateTimeFormat('ar-EG', {
    timeZone: 'Africa/Cairo', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(now) : '…';
  const description = "استكشف خيارات المشاهدة، واطّلع على تفاصيل الخدمة ومتطلبات التشغيل قبل اختيار الباقة المناسبة لك.";
  return (
    <button
      type="button"
      className="hero-phone"
      data-open={open}
      data-hero-phone=""
      aria-label="عرض تطبيقات نموذج الهاتف"
      aria-pressed={open}
      aria-describedby={descriptionId}
      onClick={() => setOpen(value => !value)}
    >
      <span className="sr-only">نموذج توضيحي تفاعلي يعرض شعارات نوفا وإيستار وموكا وX؛ اضغط للتبديل بين شاشة القفل والتطبيقات.</span>
      <span id={descriptionId} className="sr-only">{description}</span>
      <span className="hero-phone-screen" aria-hidden="true" dir="ltr">
        <span className="hero-phone-wallpaper" />
        <span className="hero-phone-orb hero-phone-orb--lime" />
        <span className="hero-phone-orb hero-phone-orb--olive" />
        <span className="hero-phone-status"><span data-phone-status-time="">{time}</span><span className="hero-phone-indicators"><svg viewBox="0 0 24 24"><path d="M3 20h18V2L3 20Z" /></svg><svg viewBox="0 0 24 24"><path d="M2 5h17v14H2V5Zm18 5h3v4h-3v-4Z" /></svg></span></span>
        <span className="hero-phone-lock">
          <span className="hero-phone-date" dir="rtl" title="بتوقيت القاهرة">{date}</span>
          <span className="hero-phone-time" dir="ltr" title="بتوقيت القاهرة">{time}</span>
          <PhoneServers />
          <span className="hero-phone-notification" dir="rtl">
            <span className="hero-phone-notification-heading">
              <span className="hero-phone-notification-logo"><IconPlay /></span>
              <strong>ستريم ماستر</strong>
              <small>الآن</small>
            </span>
            <span className="hero-phone-notification-copy">{description}</span>
          </span>
          <span className="hero-phone-shortcuts"><span><PhoneIcon kind="flash" /></span><span><PhoneIcon kind="camera" /></span></span>
          <span className="hero-phone-home-bar" />
        </span>
        <span className="hero-phone-apps">
          <span className="hero-phone-app-rows">
            <span className="hero-phone-grid">
              <span className="hero-phone-app hero-phone-app--weather"><PhoneIcon kind="weather" /></span>
              <span className="hero-phone-app hero-phone-app--calendar"><small>Tue</small><span>10</span></span>
              <span className="hero-phone-app hero-phone-app--photos"><span /></span>
              <span className="hero-phone-app hero-phone-app--camera"><PhoneIcon kind="camera" /></span>
            </span>
            <PhoneServers />
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
