import { useState } from 'react';
import './hero-laptop.css';

/* Adapted from Ashon-G / kind-bat-54, Uiverse.io, MIT.
   https://uiverse.io/Ashon-G/kind-bat-54
   Scoped CSS illustration: assembly sequence, loading screen and keyboard.
   The loading bar is decorative, not an actual network status. */
export function HeroLaptop() {
  const [replay, setReplay] = useState(0);
  return (
    <button type="button" className="hero-laptop" data-hero-laptop="" aria-label="إعادة حركة نموذج اللابتوب" onClick={() => setReplay(value => value + 1)}>
      <span className="hero-laptop-model" key={replay} aria-hidden="true" dir="ltr">
        <span className="hero-laptop-lid">
          <span className="hero-laptop-display">
            <span className="hero-laptop-brand">STREAM<br /><strong>MASTER</strong><i /></span>
            <span className="hero-laptop-loading" />
          </span>
        </span>
        <span className="hero-laptop-base">
          <span className="hero-laptop-keyboard">
            <span className="hero-laptop-keys">
              <span className="hero-laptop-touchbar" />
              <span className="hero-laptop-keyrow">{Array.from({ length: 11 }, (_, i) => <i key={i} />)}</span>
              <span className="hero-laptop-bottomrow">{Array.from({ length: 7 }, (_, i) => <i key={i} />)}</span>
            </span>
          </span>
        </span>
      </span>
    </button>
  );
}
