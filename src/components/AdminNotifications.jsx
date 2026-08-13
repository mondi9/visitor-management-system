import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import {
  Bell, Loader2, AlertCircle, Send, MailCheck, Clock, UserCheck,
  Info, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import AdminLayout from './AdminLayout';
import { getVisitStatus, toDate } from '../lib/visitUtils';
import { isEmailConfigured } from '../lib/email';

const AdminNotifications = () => {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'visitors'), orderBy('checkInTime', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setVisitors(snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          checkInTime: toDate(data.checkInTime),
          expectedCheckoutTime: toDate(data.expectedCheckoutTime),
        };
      }));
      setLoading(false);
    }, (err) => {
      console.error('Firestore error:', err);
      setLoading(false);
      setActionError('Could not load notifications data. Check your Firestore rules.');
    });

    const timer = setInterval(() => setNow(new Date()), 5000);
    return () => { unsub(); clearInterval(timer); };
  }, []);

  const expiringSoon = visitors
    .filter((v) => getVisitStatus(v, now) === 'Expiring Soon')
    .filter((v) => !v.reminderSent);
  const expired = visitors
    .filter((v) => getVisitStatus(v, now) === 'Expired')
    .filter((v) => !v.expiredEmailSent);
  const alreadyNotified = visitors.filter((v) => v.reminderSent || v.expiredEmailSent).length;

  const emailConfig = isEmailConfigured();

  return (
    <AdminLayout
      title="Notifications"
      subtitle="Expiry alerts and reminder activity"
      icon={<Bell size={20} className="text-amber-600" />}
    >
      {actionError && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r flex items-start space-x-3">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm">{actionError}</p>
        </div>
      )}

      <div className={`mb-6 p-4 rounded-xl flex items-start space-x-3 border ${
        emailConfig ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'
      }`}>
        {emailConfig ? <MailCheck size={18} className="flex-shrink-0 mt-0.5" /> : <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />}
        <p className="text-sm">
          {emailConfig
            ? 'Email reminders are enabled. Visitors and their hosts are notified at the 15-minute warning and when the visit expires.'
            : 'Email reminders are disabled — EmailJS credentials are not set. Add VITE_EMAILJS_* variables and redeploy to enable automatic notifications.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium mb-1">15-Min Warning Pending</p>
            <p className="text-3xl font-bold text-amber-600">{expiringSoon.length}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
            <Clock size={22} className="text-amber-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium mb-1">Expiry Alerts Pending</p>
            <p className="text-3xl font-bold text-rose-600">{expired.length}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
            <AlertTriangle size={22} className="text-rose-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium mb-1">Already Notified</p>
            <p className="text-3xl font-bold text-emerald-600">{alreadyNotified}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <Send size={22} className="text-emerald-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center space-x-3">
          <h2 className="font-bold text-slate-800">Automatic Status Emails</h2>
          <Info size={15} className="text-slate-400" />
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={16} className="text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">On check-in</p>
              <p className="text-xs text-slate-500 mt-0.5">
                The visitor receives their confirmation with the badge number (via the kiosk) and, when configured, the host is alerted.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Clock size={16} className="text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">15 minutes before expiry</p>
              <p className="text-xs text-slate-500 mt-0.5">
                StayMonitor sends a "your visit expires soon" reminder to the visitor and host, then records reminderSent on the visit.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={16} className="text-rose-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">On expiry</p>
              <p className="text-xs text-slate-500 mt-0.5">
                An "your visit has expired" alert is sent once, marked with expiredEmailSent to avoid duplicates.
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 size={28} className="animate-spin mr-3" />
          <span className="font-medium">Loading visitors…</span>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-6">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Visitors Needing Attention</h2>
            <span className="text-xs font-semibold text-slate-400">{expiringSoon.length + expired.length}</span>
          </div>

          {(expiringSoon.length === 0 && expired.length === 0) ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No visitors currently need a reminder or expiry alert.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/70">
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Visitor</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden md:table-cell">Check-In</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden md:table-cell">Expected Checkout</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Type</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...expired, ...expiringSoon].map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800 text-sm">{v.name}</p>
                        <p className="text-xs text-slate-400">{v.badgeNumber || ''}</p>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="text-sm text-slate-600 whitespace-nowrap">{v.checkInTime ? format(v.checkInTime, 'hh:mm a') : '—'}</span>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="text-sm text-slate-600 whitespace-nowrap">{v.expectedCheckoutTime ? format(v.expectedCheckoutTime, 'MMM d, hh:mm a') : '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase ${
                          getVisitStatus(v, now) === 'Expired'
                            ? 'bg-rose-50 text-rose-600'
                            : 'bg-amber-50 text-amber-600'
                        }`}>
                          {getVisitStatus(v, now)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {v.reminderSent || v.expiredEmailSent ? (
                          <span className="inline-flex items-center text-xs text-emerald-600 font-semibold">
                            <MailCheck size={14} className="mr-1" /> Emailed
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs text-slate-500 font-medium">
                            <UserCheck size={14} className="mr-1" /> Awaiting
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminNotifications;