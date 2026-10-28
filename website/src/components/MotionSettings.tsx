import { useEffect, useState } from 'react';
import { getMotionPreference, initializeMotionPreference, setMotionPreference, type MotionPreference } from '../lib/motion-preference';

export default function MotionSettings({ english = false }: { english?: boolean }) {
  const [value, setValue] = useState<MotionPreference>('auto');
  useEffect(() => {
    const sync = () => { initializeMotionPreference(); setValue(getMotionPreference()); };
    sync();
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  return <label className="motion-settings" dir={english ? 'ltr' : 'rtl'}>
    <span>{english ? 'Animations' : 'الحركات'}</span>
    <select aria-label={english ? 'Site animations' : 'حركات الموقع'} value={value} onChange={e => {
      const next = e.target.value as MotionPreference;
      setMotionPreference(next); setValue(next);
    }}>
      <option value="auto">{english ? 'Device setting' : 'حسب إعداد الجهاز'}</option>
      <option value="on">{english ? 'On' : 'تشغيل'}</option>
      <option value="off">{english ? 'Off' : 'إيقاف'}</option>
    </select>
  </label>;
}
