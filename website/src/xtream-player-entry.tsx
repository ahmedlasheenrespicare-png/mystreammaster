import { createRoot } from 'react-dom/client';
import XtreamPlayer from './components/XtreamPlayer';
import { initializeMotionPreference } from './lib/motion-preference';
import './index.css';
initializeMotionPreference();
createRoot(document.getElementById('root')!).render(<XtreamPlayer />);
