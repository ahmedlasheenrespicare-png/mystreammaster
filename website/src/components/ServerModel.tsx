import { useEffect, useRef, useState } from 'react';
import './server-model.css';

type ServerModelProps = { server: 'nova' | 'x' };

/** Decorative enhancement: the original logo remains if JavaScript or WebGL fails. */
export default function ServerModel({ server }: ServerModelProps) {
  const container = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setMounted(false);
    setReady(false);
    const el = container.current;
    if (!el) return;
    let visible = false;
    const sendState = () => frame.current?.contentWindow?.postMessage({type: 'server-card-active', active: visible}, location.origin);
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow || event.data?.type !== 'server-card-ready' || event.data.server !== server) return;
      setReady(true);
      sendState();
    };
    window.addEventListener('message', onMessage);
    if (!('IntersectionObserver' in window)) { visible = true; setMounted(true); }
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) setMounted(true);
      sendState();
    }, {rootMargin: '180px'}) : null;
    observer?.observe(el);
    return () => { observer?.disconnect(); window.removeEventListener('message', onMessage); };
  }, [server]);

  return <div className="plan-server-model" data-server={server} ref={container} aria-hidden="true">
    <div className="plan-server-model__halo" />
    <img className="plan-server-model__fallback" src={server === 'nova' ? '/images/brand/nova-ticket.png' : '/images/brand/xtv-mark.png'} alt="" width="217" height="132" loading="lazy" decoding="async" style={{opacity: ready ? 0 : 1}} />
    {mounted && <iframe ref={frame} className="plan-server-model__frame" src={`/_assets/server-3d/card.html?logo=${server}&card=1`} title="" tabIndex={-1} aria-hidden="true" style={{opacity: ready ? 1 : 0}} />}
  </div>;
}
