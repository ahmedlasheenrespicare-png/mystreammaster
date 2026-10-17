import { useCallback, useRef } from 'react';
import { TABS, type TabId } from '../lib/match-center.mjs';

/*
 * A single shared tablist for every fixture. Only panels with renderable data
 * are passed in; keyboard navigation therefore never lands on a hidden tab.
 * In RTL, ArrowLeft advances in reading order (the next DOM tab).
 */

export interface MatchCenterTabsProps {
  activeTab: TabId;
  onChoose: (tab: TabId) => void;
  tabs?: TabId[];
  describeTab?: (tab: TabId) => string | null;
}

export default function MatchCenterTabs({ activeTab, onChoose, tabs, describeTab }: MatchCenterTabsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const visibleTabs = TABS.filter(tab => !tabs || tabs.includes(tab.id));
  const visibleIds = visibleTabs.map(tab => tab.id);

  const focusTab = useCallback((tab: TabId) => {
    const node = listRef.current?.querySelector<HTMLButtonElement>(`[data-tab="${tab}"]`);
    node?.focus();
  }, []);

  const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (visibleIds.length === 0) return;
    const currentIndex = visibleIds.indexOf(activeTab);
    let target: TabId | null = null;
    switch (event.key) {
      case 'ArrowLeft': {
        const index = currentIndex < 0 ? 0 : (currentIndex + 1) % visibleIds.length;
        target = visibleIds[index];
        break;
      }
      case 'ArrowRight': {
        const index = currentIndex < 0 ? 0 : (currentIndex - 1 + visibleIds.length) % visibleIds.length;
        target = visibleIds[index];
        break;
      }
      case 'Home': target = visibleIds[0]; break;
      case 'End': target = visibleIds[visibleIds.length - 1]; break;
      default: return;
    }
    event.preventDefault();
    onChoose(target);
    focusTab(target);
  }, [activeTab, onChoose, focusTab, visibleIds]);

  if (visibleTabs.length === 0) return null;

  return (
    <div
      className="mc-tabs"
      role="tablist"
      aria-label="أقسام مركز المباراة"
      ref={listRef}
      onKeyDown={onKeyDown}
    >
      {visibleTabs.map(tab => {
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
