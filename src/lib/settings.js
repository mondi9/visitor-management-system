import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const DEFAULT_DURATION = '30 Minutes';
export const DEFAULT_BADGE_FOOTER = 'Powered by VisitorPro Management';

// Loads the shared appSettings/general document used across the kiosk
// (default visit duration, organization branding) and the admin console.
// The kiosk runs without a login, so firestore.rules allows public reads.
export const getAppSettings = async () => {
  try {
    const snap = await getDoc(doc(db, 'appSettings', 'general'));
    return snap.exists() ? snap.data() : {};
  } catch (err) {
    console.error('Failed to load app settings:', err);
    return {};
  }
};