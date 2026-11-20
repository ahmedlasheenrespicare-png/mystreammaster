export type Day = 'yesterday' | 'today' | 'tomorrow' | 'live';

export function DayButtons({ selected, onSelect }: { selected: Day | null; onSelect: (day: Day) => void }) {
  return <div className="hs-day-tabs" role="group" aria-label="اختيار يوم المباريات">
    {([['yesterday', 'أمس'], ['today', 'اليوم'], ['tomorrow', 'غداً'], ['live', 'مباشر']] as const).map(([day, label]) => <button key={day} type="button" aria-pressed={selected === day} onClick={() => onSelect(day)}><span className="hs-crown-tab-content"><svg className="hs-crown-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{day === 'live' ? <><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/></> : <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/><circle cx="12" cy="15" r="1" fill="currentColor" stroke="none"/></>}</svg><span>{label}</span></span></button>)}
  </div>;
}

