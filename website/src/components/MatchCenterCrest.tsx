import { useEffect, useState } from 'react';
import { safeLogoUrl } from '../lib/match-center.mjs';

/* شعار الفريق كما يرسله المصدر (`https://` وحده — البند 4)، وإلا الحرفان
   الأولان من اسمه. مكوّن واحد للملعب ولرؤوس مجموعات الأرقام حتى يسقط الشعار
   المكسور إلى البديل نفسه في المكانين. */

export function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

export default function TeamCrest({ logo, name, className, size }: {
  logo: string | null | undefined;
  name: string;
  className: string;
  size: number;
}) {
  const [failed, setFailed] = useState(false);
  const safeLogo = safeLogoUrl(logo ?? null);
  useEffect(() => setFailed(false), [safeLogo]);

  if (safeLogo && !failed) {
    return (
      <img
        className={className}
        src={safeLogo}
        alt=""
        width={String(size)}
        height={String(size)}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }

  return <span className={className} aria-hidden="true">{monogram(name)}</span>;
}
