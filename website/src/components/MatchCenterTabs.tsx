import { useCallback, useRef } from 'react';
import { TABS, nextTabId, type TabId } from '../lib/match-center.mjs';

/* ==========================================================================
   تبويبات مركز المباراة — البندان 5 و10
   --------------------------------------------------------------------------
   `tablist` / `tab` / `tabpanel` بمفردات ARIA الصحيحة، وترتيب منطقي سليم في
   RTL. في RTL أول عنصر في DOM هو **الأيمن** بصرياً، وترتيب القراءة العربي
   يتقدم نحو اليسار، لذلك:
     ArrowLeft  ← التبويب التالي   (nextTabId +1)
     ArrowRight ← التبويب السابق   (nextTabId -1)
   وهو ما توصي به ARIA للاتجاه من اليمين إلى اليسار، وما تختبره طبقة العقد.

   البند 5: «لا يُنتزع الزائر من تبويب اختاره». الاختيار يخص الزائر وحده؛
   تغيّر الحالة أو وصول هدف لا يغيّر `activeTab` لأن `resolveTab` في الخطّاف
   تُقدّم اختيار الزائر على التبويب الافتراضي.

   البند 10: «لا سرقة تركيز ولا فرض تمرير عند التحديث». لذلك لا `focus()`
   إلا استجابةً لضغطة سهم من الزائر نفسه، ولا `scrollIntoView` إطلاقاً.
========================================================================== */

export interface MatchCenterTabsProps {
  activeTab: TabId;
  onChoose: (tab: TabId) => void;
  /** يُعطّل التبويب الذي لا يملك ما يعرضه، مع بقاء سبب التعطيل معلناً. */
  describeTab?: (tab: TabId) => string | null;
}

export default function MatchCenterTabs({ activeTab, onChoose, describeTab }: MatchCenterTabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const focusTab = useCallback((tab: TabId) => {
    const node = listRef.current?.querySelector<HTMLButtonElement>(`[data-tab="${tab}"]`);
    node?.focus();
  }, []);

  const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    let target: TabId | null = null;
    switch (event.key) {
      case 'ArrowLeft': target = nextTabId(activeTab, 'next'); break;
      case 'ArrowRight': target = nextTabId(activeTab, 'previous'); break;
      case 'Home': target = TABS[0].id; break;
      case 'End': target = TABS[TABS.length - 1].id; break;
      default: return;
    }
    event.preventDefault();
    onChoose(target);
    focusTab(target);
  }, [activeTab, onChoose, focusTab]);

  return (
    <div
      className="mc-tabs"
      role="tablist"
      aria-label="أقسام مركز المباراة"
      ref={listRef}
      onKeyDown={onKeyDown}
    >
      {TABS.map(tab => {
        const selected = tab.id === activeTab;
        const hint = describeTab?.(tab.id) ?? null;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`mc-tab-${tab.id}`}
            data-tab={tab.id}
            aria-selected={selected}
            aria-controls={`mc-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            className="mc-tab"
            title={hint ?? undefined}
            onClick={() => onChoose(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
