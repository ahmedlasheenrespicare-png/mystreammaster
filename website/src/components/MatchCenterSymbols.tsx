import type { EventSymbol } from '../lib/match-center.mjs';

/* ─────────── رموز الملعب: أشكال مرسومة، لا رموز تعبيرية ───────────
   البطاقة مستطيل بلونها، والهدف كرة، والتبديل سهمان، وVAR شارة. الشكل نفسه
   يميّز الحدث حتى بلا لون (وضع التباين العالي أو عمى الألوان)، والنص الكامل
   يحمله `aria-label` وشريط التفاصيل.

   تُصدَّر الأشكال من ملف واحد لأن موضعين يستهلكانها الآن: شريط الأحداث على
   الملعب، وقائمة الأحداث في قسم التحليل. نسخة ثانية من الرسم في مكوّن ثانٍ
   تعني رمزَين مختلفَين للحدث نفسه في الصفحة نفسها. */

function BallShape() {
  return (
    <g>
      <circle cx="12" cy="12" r="8.2" fill="#f6faff" stroke="#0b0f16" strokeWidth="1.1" />
      <path d="M12 7.4 15.3 9.8l-1.3 3.8h-4L8.7 9.8 12 7.4Z" fill="#0b0f16" />
      <circle cx="9.1" cy="6" r="1.15" fill="#0b0f16" />
      <circle cx="14.9" cy="6" r="1.15" fill="#0b0f16" />
      <circle cx="6.6" cy="15.2" r="1.35" fill="#0b0f16" />
      <circle cx="17.4" cy="15.2" r="1.35" fill="#0b0f16" />
    </g>
  );
}

export default function EventIcon({ symbol, className = 'mc-pitch-icon' }: { symbol: EventSymbol; className?: string }) {
  if (symbol === 'yellow-card' || symbol === 'red-card') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
        <rect
          x="8.4" y="3.2" width="7.6" height="17.6" rx="1.4"
          fill={symbol === 'yellow-card' ? '#ffd34d' : '#ff4d5e'}
          stroke="rgba(0,0,0,.35)" strokeWidth=".8" transform="rotate(8 12 12)"
        />
      </svg>
    );
  }

  if (symbol === 'substitution') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
        <path
          d="M4 8.6h12.3l-2.7-2.7M20 15.4H7.7l2.7 2.7"
          fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (symbol === 'var') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
        <rect x="2.2" y="7.2" width="19.6" height="9.6" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <text x="12" y="14.2" textAnchor="middle" fontSize="6.4" fontWeight="900" fontFamily="ui-sans-serif, system-ui" fill="currentColor">VAR</text>
      </svg>
    );
  }

  if (symbol === 'other') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="3.4" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <BallShape />
      {symbol === 'penalty' && (
        <g>
          <circle cx="18.1" cy="18" r="4.2" fill="#0b0f16" stroke="currentColor" strokeWidth="1" />
          <text x="18.1" y="20.1" textAnchor="middle" fontSize="5.4" fontWeight="900" fill="currentColor">P</text>
        </g>
      )}
      {symbol === 'missed-penalty' && (
        <path d="m16.4 15.6 4.2 4.2m0-4.2-4.2 4.2" stroke="#ff6b75" strokeWidth="1.9" strokeLinecap="round" />
      )}
      {symbol === 'own-goal' && (
        <path
          d="M17.8 8.2a5.2 5.2 0 1 0 1.5 5.4m-1.5-5.4.5-3.1m-.5 3.1-3.1-.4"
          fill="none" stroke="#ffd34d" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
