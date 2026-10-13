import { memo, useMemo, useRef, useState } from "react";
import destinations from "../official-destinations.json";
import { IconSearch, IconTv } from "./Icons";
import "./watch-guide.css";

const categories = ["الكل", "أخبار", "رياضة", "وثائقيات", "ترفيه", "منصات", "أفلام", "أطفال", "موسيقى", "دينية"];

function ExternalIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M14 3h7v7M21 3 10 14M10 3H3v18h18v-7" /></svg>;
}

/** First-party destination directory only: no media, embedded players, tracking or stream fetches. */
function WatchGuide() {
  const [selected, setSelected] = useState(destinations[0]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("الكل");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return destinations.filter(channel =>
      (category === "الكل" || channel.cat === category) &&
      `${channel.name} ${channel.english}`.toLocaleLowerCase().includes(search)
    );
  }, [query, category]);

  return (
    // Retain the existing anchor so previously published links keep working.
    <section id="live-player" className="wg-section" aria-labelledby="watch-guide-heading">
      <div className="wg-container">
        <div className="wg-heading">
          <p className="wg-eyebrow">اكتشف وجهتك للمشاهدة</p>
          <h2 id="watch-guide-heading">دليلك إلى <span>المشاهدة الرسمية</span></h2>
          <p className="wg-intro">استكشف القنوات المفتوحة والمنصات المدفوعة، وانتقل إلى مواقعها الرسمية<br /> للاطّلاع على خيارات المشاهدة وشروطها.</p>
        </div>
        <div className="wg-layout">
          <div className="wg-main">
            <div className="wg-card">
              <div className="wg-browser">
                <div className="wg-dots" aria-hidden="true"><i /><i /><i /></div>
                <div className="wg-address"><span>streammasterstore.com / watch-guide</span></div>
                <span className="wg-badge">دليل روابط</span>
              </div>
              <div className="wg-screen">
                <div className="wg-screen-label"><span>وجهة خارج الموقع ↗</span><span>{selected.cat}{selected.paid ? " · خدمة مدفوعة" : ""}</span></div>
                <div className="wg-details" aria-live="polite" aria-atomic="true">
                  <span className="wg-mini-label">تعرّف على خيارات الجهة المقدّمة</span>
                  <h2 id="watch-guide-selected-name">{selected.name}</h2>
                  <p className="wg-description">{selected.description}</p>
                  <a className="wg-official" href={selected.url} target="_blank" rel="noopener noreferrer" aria-label={`انتقل إلى الموقع الرسمي: ${selected.name} (يفتح في تبويب جديد)`}>
                    انتقل إلى الموقع الرسمي <span aria-hidden="true">↗</span>
                  </a>
                  <div className="wg-domain"><span aria-hidden="true">⌁</span><span>{new URL(selected.url).hostname}</span></div>
                </div>
                <div className="wg-graphic" aria-hidden="true">
                  <div className="wg-ring" /><div className="wg-ring wg-r2" /><div className="wg-ring wg-r3" /><i className="wg-orb" />
                  <div className="wg-monogram"><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="32" cy="32" r="24" /><ellipse cx="32" cy="32" rx="11" ry="24" /><path d="M9 24h46M9 40h46M8 32h48M32 8v48" /></svg></div>
                  <span className="wg-art-note">DISCOVER · VISIT · EXPLORE</span>
                </div>
                <div className="wg-screen-bottom"><span>لا يتم تشغيل أو استضافة البث في هذا القسم</span><span>OFFICIAL DESTINATIONS</span></div>
              </div>
              <div className="wg-trust">
                <span><ExternalIcon />روابط للمواقع الرسمية</span>
                <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v6m0 3v1" /></svg>شروط الجهة المقدّمة</span>
                <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2" /><path d="m4 3 16 18M8 21h8M12 17v4" /></svg>دون بث داخل الموقع</span>
              </div>
            </div>
            <div className="wg-banner">
              <div><strong>اختر وجهتك… وتعرّف على شروطها</strong><p>قد تختلف خيارات المشاهدة والرسوم بحسب الجهة ومنطقتك.</p></div>
              <button type="button" className="wg-banner-button" onClick={() => dialogRef.current?.showModal()}>كيف يعمل الدليل؟ ↗</button>
            </div>
          </div>
          <aside className="wg-sidebar" aria-label="دليل القنوات والمنصات">
            <div className="wg-side-head">
              <div className="wg-side-title"><h3><IconTv />القنوات والمنصات</h3><span>استكشف ↗</span></div>
              <div className="wg-search"><IconSearch /><input type="search" value={query} onChange={event => setQuery(event.target.value)} aria-label="ابحث عن قناة أو منصة" placeholder="ابحث: beIN، MBC، Netflix..." /></div>
              <div className="wg-filters" role="group" aria-label="التصنيفات">
                {categories.map(item => <button type="button" key={item} className={`wg-filter${category === item ? " wg-active" : ""}`} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
              </div>
            </div>
            <div className="wg-list">
              {filtered.length === 0 ? <p className="wg-empty" role="status">لا توجد نتائج مطابقة لبحثك.</p> : filtered.map(channel => (
                <button type="button" key={channel.name} className={`wg-item${selected.name === channel.name ? " wg-selected" : ""}`} aria-pressed={selected.name === channel.name} onClick={() => setSelected(channel)}>
                  <span className="wg-item-icon" aria-hidden="true">{channel.icon}</span>
                  <span className="wg-item-text"><strong>{channel.name}</strong><small>{channel.cat} · {channel.paid ? "خدمة مدفوعة" : channel.destination}</small></span>
                  <ExternalIcon />
                </button>
              ))}
            </div>
            <div className="wg-side-footer">اختر جهة لعرض معلوماتها ورابط موقعها</div>
          </aside>
        </div>
        <p className="wg-disclaimer">هذا القسم دليل روابط فقط؛ لا يستضيف الموقع البث أو يشغّله. توافر المشاهدة ورسومها يخضعان لشروط الجهة المقدّمة ومنطقتك.<br />يشمل الدليل وجهات مجانية ومدفوعة؛ وقد يفتح الرابط موقع الشبكة المالكة. الإدراج لا يدل على شراكة أو اعتماد من الجهات المذكورة.</p>
      </div>
      <dialog className="wg-dialog" ref={dialogRef} aria-labelledby="watch-guide-help-title">
        <h2 id="watch-guide-help-title">وجهتك تبدأ من هنا</h2>
        <p>١. ابحث عن قناة أو اختر تصنيفًا.<br />٢. اختر الجهة للاطّلاع على وصفها.<br />٣. اضغط «انتقل إلى الموقع الرسمي» لفتح موقع الجهة في تبويب جديد.</p>
        <p>لا يحتوي هذا القسم على مشغّل فيديو أو روابط بث. أسماء الجهات للعرض التعريفي، ومجانية المشاهدة أو رسومها لا تُفترض من وجودها في الدليل. بعض بطاقات القنوات تفتح موقع الشبكة المالكة وليس صفحة تشغيل مباشرة.</p>
        <button type="button" onClick={() => dialogRef.current?.close()}>فهمت</button>
      </dialog>
    </section>
  );
}

export default memo(WatchGuide);
