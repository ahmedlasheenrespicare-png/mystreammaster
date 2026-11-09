import { useId } from "react";

/** Decorative pitch shared only by match card bodies; each SVG filter gets a unique ID. */
export default function CrownPitchBackground() {
  const filterId = `crown-grass-${useId().replace(/:/g, "")}`;
  return <span className="hs-crown-match-pitch" aria-hidden="true">
        <div className="hs-crown-floor" aria-hidden="true">
        <svg className="hs-crown-grass" viewBox="0 0 1200 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
          <defs>
            <filter id={filterId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency="0.42 0.68" numOctaves="3" seed="7" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
          </defs>
          <rect className="hs-crown-grass-grain" width="1200" height="420" filter={`url(#${filterId})`} />
        </svg>
        <svg className="hs-crown-pitch" viewBox="0 0 1200 420" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <g className="hs-crown-pitch-markings" fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke">
            <rect className="hs-crown-pitch-boundary" x="80" y="20" width="1040" height="380" />
            <path className="hs-crown-pitch-line" d="M600 20V400" />
            <circle className="hs-crown-pitch-center-circle" cx="600" cy="210" r="58" />
            <path className="hs-crown-pitch-area" d="M80 100H230V320H80 M1120 100H970V320H1120" />
            <path className="hs-crown-pitch-goal-area" d="M80 158H140V262H80 M1120 158H1060V262H1120" />
            <path className="hs-crown-pitch-penalty-arc" d="M230 170 A58 58 0 0 1 230 250 M970 170 A58 58 0 0 0 970 250" />
          </g>
          <g className="hs-crown-pitch-spots" fill="currentColor">
            <circle cx="600" cy="210" r="3" /><circle cx="182" cy="210" r="3" /><circle cx="1018" cy="210" r="3" />
          </g>
        </svg>
        </div>
        <div className="hs-crown-side-light" aria-hidden="true" />
        <div className="hs-crown-tint" aria-hidden="true" />
  </span>;
}
