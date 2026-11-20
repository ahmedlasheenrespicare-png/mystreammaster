import {createRoot} from 'react-dom/client';
import XtreamPlayer from './components/XtreamPlayer';
import {initializeMotionPreference,motionReduced} from './lib/motion-preference';
import './index.css';
import './m3u-player-embed.css';
function syncMotion(){initializeMotionPreference();document.documentElement.dataset.motionReduced=String(motionReduced());window.dispatchEvent(new Event('sm-motion-change'))}
syncMotion();
window.addEventListener('storage',event=>{if(event.key==='sm-motion-preference')syncMotion()});
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',syncMotion);
createRoot(document.getElementById('root')!).render(<XtreamPlayer m3uOnly />);
const root=document.getElementById('root')!;
const notify=()=>window.parent.postMessage({type:'sm-m3u-height',height:Math.ceil(root.getBoundingClientRect().height)},location.origin);
if(typeof ResizeObserver === 'function'){const observer=new ResizeObserver(notify);observer.observe(root)}else window.addEventListener('resize',notify,{passive:true});
window.addEventListener('load',notify);
