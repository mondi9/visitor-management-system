import { useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { getVisitStatus, toDate } from '../lib/visitUtils';
import { sendVisitEmail, sendHostEmail, isEmailConfigured } from '../lib/email';
import { useAuth } from '../context/AuthContext';

const CHECK_INTERVAL_MS = 30000;

const REMINDER_MESSAGE_VISITOR = 'Your visit will expire in 15 minutes.';
const REMINDER_MESSAGE_HOST = "Your visitor's approved duration will expire in 15 minutes.";
const EXPIRED_MESSAGE_VISITOR = 'Your approved visit duration has expired.';
const EXPIRED_MESSAGE_HOST = 'Visitor duration has been exceeded.';

const StayMonitor = () => {
  const running = useRef(false);
  const { user } = useAuth();

  useEffect(() => {
    // Only staff with a signed-in session may update the reminders; run the
    // monitor just for them so the kiosk does not trigger permission errors.
    if (!user) return undefined;
    if (!isEmailConfigured()) {
      console.warn('StayMonitor: EmailJS is not configured — reminders and expiry alerts are disabled.');
    }

    const handleIndividual = async (snapshotDoc) => {
      const data = snapshotDoc.data();
      const expected = data.expectedCheckoutTime;
      if (!expected) return;
      if (data.status === 'Checked Out' || data.checkOutTime) return;

      const visitor = { ...data, expectedCheckoutTime: toDate(expected), checkInTime: toDate(data.checkInTime) };
      const status = getVisitStatus(visitor);
      const ref = doc(db, 'visitors', snapshotDoc.id);

      if (status === 'Expiring Soon' && !data.reminderSent) {
        await Promise.allSettled([
          sendVisitEmail(visitor, { message: REMINDER_MESSAGE_VISITOR }),
          visitor.hostEmail
            ? sendHostEmail(visitor, { message: REMINDER_MESSAGE_HOST })
            : Promise.resolve(false),
        ]);
        await updateDoc(ref, { reminderSent: true, reminderSentAt: new Date() });
      } else if (status === 'Expired' && !data.expiredEmailSent) {
        await Promise.allSettled([
          sendVisitEmail(visitor, { message: EXPIRED_MESSAGE_VISITOR }),
          visitor.hostEmail
            ? sendHostEmail(visitor, { message: EXPIRED_MESSAGE_HOST })
            : Promise.resolve(false),
        ]);
        await updateDoc(ref, { expiredEmailSent: true, expiredEmailSentAt: new Date() });
      }
    };

    const runCheck = async () => {
      if (running.current) return;
      running.current = true;
      try {
        const q = query(collection(db, 'visitors'), where('status', '==', 'Active'));
        const snapshot = await getDocs(q);
        await Promise.allSettled(snapshot.docs.map(handleIndividual));
      } catch (err) {
        console.error('StayMonitor: failed to check visitor expiry:', err);
      } finally {
        running.current = false;
      }
    };

    runCheck();
    const interval = setInterval(runCheck, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user]);

  return null;
};

export default StayMonitor;