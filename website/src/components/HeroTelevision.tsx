import { useState, type ReactNode } from 'react';
import { IconPlay } from './Icons';
import { ServerIcon } from './ServerIcon';
import './hero-television.css';
import './brand-newt35.css';
import { to } from '../config';

const TV_SERVERS = [
  { code: 'nova', name: 'نوفا' },
  { code: 'istar', name: 'إيستار' },
  { code: 'moka', name: 'موكا' },
  { code: 'x', name: 'X' },
] as const;

/** CSS-only device illustration; the screen is a demo, not an actual player. */
export function HeroTelevision({ onActivate, headline }: { onActivate?: () => void; headline?: ReactNode }) {
  const [apps, setApps] = useState(false);
  return (
    <div className="hero-tv" data-hero-tv="">
      <button
        type="button"
        className="hero-tv-frame"
        data-apps={apps}
        aria-label="عرض السيرفرات في نموذج التلفاز"
        aria-pressed={apps}
        onClick={() => {
          onActivate?.();
          setApps(value => !value);
        }}
      >
        <span className="sr-only">نموذج تلفاز توضيحي؛ اضغط للتبديل بين الواجهة الترحيبية والسيرفرات.</span>
        <span className="hero-tv-display" aria-hidden="true" dir="rtl">
          <span className="hero-tv-aurora" />
          <span className="hero-tv-orbit hero-tv-orbit--one" />
          <span className="hero-tv-orbit hero-tv-orbit--two" />
          <span className="hero-tv-topbar">
            <span className="hero-tv-wordmark">
              <span className="sm-tv-crab-mini">
                <span className="sm-tv-crab-mini__word">
                  <span className="sm-tv-crab-mini__tile" data-sup="4K">ست</span>
                  <span className="sm-tv-crab-mini__rest">ريم</span>
                </span>{" "}
                <span className="sm-tv-crab-mini__word">
                  <span className="sm-tv-crab-mini__tile" data-sup="99">ما</span>
                  <span className="sm-tv-crab-mini__rest">ستر</span>
                </span>
              </span>
            </span>
            <span className="hero-tv-demo">واجهة توضيحية</span>
          </span>
          <span className="hero-tv-welcome">
            <span className="hero-tv-welcome-gallery">
              <span className="hero-tv-football-art">
                <img src={to('images/players/esp-mbappe.webp')} alt="" loading="lazy" decoding="async" draggable={false} />
                <img src={to('images/players/eng-haaland-header.png')} alt="" loading="lazy" decoding="async" draggable={false} />
                <img src={to('images/players/esp-yamal.webp')} alt="" loading="lazy" decoding="async" draggable={false} />
                <img src={to('images/players/ger-kane.webp')} alt="" loading="lazy" decoding="async" draggable={false} />
                <img src={to('images/players/fra-dembele.webp')} alt="" loading="lazy" decoding="async" draggable={false} />
              </span>
            <img className="hero-tv-welcome-art" src={to('images/cinema/superman-batman-stark.png')} alt="" loading="lazy" decoding="async" draggable={false} />
            </span>
            <span className="hero-tv-welcome-copy">
            <span className="hero-tv-eyebrow">عالمك على شاشة أكبر</span>
            {headline ?? <strong>متعة المشاهدة<br /><em>تبدأ هنا.</em></strong>}
            <span className="hero-tv-caption">تعرّف على خيارات السيرفرات</span>
            <span className="hero-tv-prompt"><IconPlay /> استكشف الواجهة</span>
            </span>
          </span>
          <span className="hero-tv-apps">
            <span className="hero-tv-eyebrow">خيارات المشاهدة</span>
            <strong>اختر سيرفرك</strong>
            <span className="hero-tv-server-grid">
              {TV_SERVERS.map(server => (
                <span key={server.code} className="hero-tv-server" data-tv-server={server.code}>
                  <ServerIcon code={server.code} size={34} />
                  <span>{server.name}</span>
                </span>
              ))}
            </span>
          </span>
          <span className="hero-tv-bottom"><span>STREAM MASTER PRO</span><span className="hero-tv-pagination"><i className={!apps ? 'is-active' : ''} /><i className={apps ? 'is-active' : ''} /></span></span>
          <span className="hero-tv-reflection" />
        </span>
        <span className="hero-tv-chin" aria-hidden="true"><span>STREAM MASTER</span><i /></span>
      </button>
      <span className="hero-tv-neck" aria-hidden="true" />
      <span className="hero-tv-base" aria-hidden="true" />
      <span className="hero-tv-floor-shadow" aria-hidden="true" />
    </div>
  );
}
