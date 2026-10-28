/**
 * أيقونات ورموز فيكتور ملوّنة معبّرة للمنسدلة العلوية (المقترح د — التوأم المتناظر بالأوسمة)،
 * مصمّمة بنفس روح وباليت أيقونات المنسدلة السفلية (.lc-detail):
 * الأزرق الملكي (#2b4eff)، الذهبي الدافئ (#f59e0b / #fcd34d)، الزمردي (#10b981)،
 * والبرتقالي الناري (#f97316)، بلا رموز إيموجي خام.
 */

/** مرمى بشبكة وكرة ذهبية متوهجة تعبّر عن «إجمالي الأهداف» */
export function GoalsNetBurstIcon({ className = "lc-top-twin-net" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
      {/* قوائم المرمى */}
      <path
        d="M4.5 24.5V8.5C4.5 7.4 5.4 6.5 6.5 6.5H25.5C26.6 6.5 27.5 7.4 27.5 8.5V24.5"
        stroke="#191d26"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* خيوط الشبكة */}
      <path
        d="M5.5 11.5H26.5M5.5 16H26.5M5.5 20.5H26.5M10.5 7.5V24M16 7.5V24M21.5 7.5V24"
        stroke="#94a3b8"
        strokeWidth="1.05"
        strokeOpacity="0.7"
      />
      {/* هالة هدف ذهبية */}
      <circle cx="20" cy="18.5" r="7.2" fill="#fef3c7" />
      <circle cx="20" cy="18.5" r="5.6" fill="#fbbf24" stroke="#d97706" strokeWidth="1.3" />
      {/* نجمة التسجيل داخل الكرة الذهبية */}
      <path
        d="M20 14.7L21.15 17.05L23.75 17.42L21.87 19.25L22.31 21.84L20 20.62L17.69 21.84L18.13 19.25L16.25 17.42L18.85 17.05L20 14.7Z"
        fill="#ffffff"
      />
      {/* وميض علوي أزرق */}
      <path d="M27.5 4.2L29.2 2.8M29.6 6.8L31.2 6.4" stroke="#2b4eff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** وسام الحذاء الذهبي الهجومي بشريط أزرق وبرتقالي — توأم وسام الميدالية في المنسدلة السفلية */
export function GoldenBootMedalIcon({
  className = "lc-top-medal-icon",
  idSuffix = "0",
}: {
  className?: string;
  idSuffix?: string;
}) {
  const gradId = `lcBootGold-${idSuffix}`;
  return (
    <svg className={className} viewBox="0 0 36 36" fill="none" aria-hidden="true" focusable="false">
      <path d="M12 3.5H17.2L19.6 12H14.5L12 3.5Z" fill="#2b4eff" />
      <path d="M24 3.5H18.8L16.4 12H21.5L24 3.5Z" fill="#f97316" />
      <circle cx="18" cy="21" r="11" fill={`url(#${gradId})`} stroke="#d97706" strokeWidth="1.3" />
      <path
        d="M12.2 22.8L15.8 16.2L18.4 18.5L22.8 19.6C24.1 19.9 24.8 21 24.6 22.2L24.4 23.2H12.2V22.8Z"
        fill="#191d26"
      />
      <path d="M13.2 24.8H23.8" stroke="#2b4eff" strokeWidth="2" strokeLinecap="round" />
      <defs>
        <linearGradient id={gradId} x1="10" y1="10" x2="26" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fde68a" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** وسام الدرع الزمردي الذهبي بشريط ملكي — توأم موازٍ لـ «أقوى دفاع» */
export function GuardianShieldMedalIcon({
  className = "lc-top-medal-icon",
  idSuffix = "0",
}: {
  className?: string;
  idSuffix?: string;
}) {
  const gradId = `lcShieldEmerald-${idSuffix}`;
  return (
    <svg className={className} viewBox="0 0 36 36" fill="none" aria-hidden="true" focusable="false">
      <path d="M12 3.5H17.2L19.6 12H14.5L12 3.5Z" fill="#10b981" />
      <path d="M24 3.5H18.8L16.4 12H21.5L24 3.5Z" fill="#60a5fa" />
      <circle cx="18" cy="21" r="11" fill={`url(#${gradId})`} stroke="#059669" strokeWidth="1.3" />
      <path
        d="M18 13.8L23.5 16V20.4C23.5 23.9 21.1 26.6 18 27.8C14.9 26.6 12.5 23.9 12.5 20.4V16L18 13.8Z"
        fill="#fcd34d"
      />
      <path
        d="M15.8 20.6L17.4 22.2L20.4 19"
        stroke="#065f46"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id={gradId} x1="10" y1="10" x2="26" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ecfdf5" />
          <stop offset="1" stopColor="#a7f3d0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** رمز مواجهة ماسي يتوسّط الهجوم والدفاع في المقترح (د) */
export function MiniDuelDiamond() {
  return (
    <svg className="lc-duel-diamond" viewBox="0 0 16 44" fill="none" aria-hidden="true">
      <line x1="8" y1="2" x2="8" y2="15" stroke="rgba(25,29,38,0.14)" strokeWidth="1" />
      <path d="M8 17L12.5 22L8 27L3.5 22L8 17Z" fill="#faf7ee" stroke="#2b4eff" strokeWidth="1.2" />
      <circle cx="8" cy="22" r="1.6" fill="#f59e0b" />
      <line x1="8" y1="29" x2="8" y2="42" stroke="rgba(25,29,38,0.14)" strokeWidth="1" />
    </svg>
  );
}
