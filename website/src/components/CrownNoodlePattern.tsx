import { useEffect, useRef, useState, type CSSProperties } from 'react';
import './crown-noodle-pattern.css';

/** The original 800×600 CSS scene is scaled into the 20×35 pattern tile. */
export default function CrownNoodlePattern() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ columns: 0, rows: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ columns: Math.max(1, Math.floor(el.clientWidth / 20)), rows: Math.ceil(el.clientHeight / 35) });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const occupied = new Set<number>();
  for (let index = 0; index < size.columns * size.rows; index++) {
    const hash = Math.imul(index + 1, 2654435761) >>> 0;
    const hasLeft = index % size.columns !== 0 && occupied.has(index - 1);
    const hasAbove = occupied.has(index - size.columns);
    if (hash % 11 < 8 && !hasLeft && !hasAbove) occupied.add(index);
  }
  return <div className="hs-noodle-tiles" ref={ref} aria-hidden="true">
    {Array.from({ length: size.columns * size.rows }, (_, index) => <div className="hs-noodle-tile" key={index} style={{ '--noodle-delay': `-${((index * 7919 + 3571) % 22000) / 1000}s` } as CSSProperties}>
      {occupied.has(index) && <div className="hs-noodle-frame">
        <div className="scene1">
          <div className="boy">
            <div className="boy__head"><div className="boy__hair" /><div className="boy__eyes" /><div className="boy__mouth" /><div className="boy__cheeks" /></div>
            <div className="noodle" /><div className="boy__leftArm"><div className="chopsticks" /></div>
          </div>
          <div className="plate" /><div className="rightArm" />
        </div>
      </div>}
    </div>)}
  </div>;
}
