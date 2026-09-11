import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import {
  ClipboardList, Plus, Loader2, CalendarClock, Clock, UserPlus, BadgeCheck, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import HostLayout from './HostLayout';
import ExtendVisitModal from './ExtendVisitModal';
import { useAuth } from '../context/AuthContext';
import { getVisitStatus, toDate, STATUS_STYLES } from '../lib/visitUtils';

const HostDashboard = () => {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [extendVisitor, setExtendVisitor] = useState(null);

  useEffect(() => {
    if (!user) return undefined;
    const q = query(collection(db, 'visitors'), where('registeredBy', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          registrationTime: toDate(data.registrationTime),
          expectedArrivalTime: toDate(data.expectedArrivalTime),
          expectedCheckoutTime: toDate(data.expectedCheckoutTime),
        };
      });
      list.sort((a, b) => (b.registrationTime?.getTime() || 0) - (a.registrationTime?.getTime() || 0));
      setRegistrations(list);
      setLoading(false);
    }, (err) => {
      console.error('Host dashboard read error:', err);
      setLoading(false);
      setError('Could not load your registrations. Check your connection and that the Host security rules are deployed.');
    });
    return () => unsub();
  }, [user]);

  const preRegistered = registrations.filter((r) => r.status === 'Pre-Registered').length;

  return (
    <HostLayout
      title="My Registrations"
      subtitle="Visitors you have booked ahead of their arrival"
    >
      {extendVisitor && (
        <ExtendVisitModal
          visitor={extendVisitor}
          onClose={() => setExtendVisitor(null)}
          onExtended={() => setExtendVisitor(null)}
        />
      )}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r flex items-start space-x-3">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium mb-1">Total Registrations</p>
            <p className="text-3xl font-bold text-slate-800">{registrations.length}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center">
            <ClipboardList size={22} className="text-teal-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium mb-1">Pre-Registered</p>
            <p className="text-3xl font-bold text-blue-600">{preRegistered}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
            <CalendarClock size={22} className="text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium mb-1">Checked In / Out</p>
            <p className="text-3xl font-bold text-slate-800">{registrations.length - preRegistered}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <BadgeCheck size={22} className="text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Register CTA */}
      <div className="mb-8 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-800">Register a new visitor</h3>
          <p className="text-sm text-slate-500 mt-1">
            Book a visitor ahead of their arrival. A unique badge number is generated for each visit.
          </p>
        </div>
        <Link
          to="/host/register"
          className="inline-flex items-center justify-center px-5 py-3 bg-[#0B192C] hover:bg-[#14294a] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus size={16} className="mr-1.5" /> Register Visitor
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">All Registrations</h2>
          <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{registrations.length}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 size={28} className="animate-spin mr-3" />
            <span className="font-medium">Loading registrations…</span>
          </div>
        ) : registrations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <UserPlus size={44} className="mb-3 text-slate-200" />
            <p className="font-semibold text-slate-500 mb-1">No registrations yet</p>
            <p className="text-sm text-slate-400 text-center max-w-xs">
              Register your first visitor and they will appear here with their badge number.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/70">
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Badge Number</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Visitor</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden md:table-cell">Purpose</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden lg:table-cell">Expected Arrival</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden lg:table-cell">Expected Checkout</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden md:table-cell">Registered</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registrations.map((reg) => {
                  const status = getVisitStatus(reg);
                  return (
                    <tr key={reg.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-blue-600 font-bold text-sm">{reg.badgeNumber || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800 text-sm">{reg.name}</p>
                        <p className="text-xs text-slate-400">{reg.company || reg.email || ''}</p>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="text-sm text-slate-600">{reg.purpose || '—'}</span>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <span className="text-sm text-slate-600 whitespace-nowrap flex items-center gap-1">
                          <Clock size={12} className="text-slate-400" />
                          {reg.expectedArrivalTime ? format(reg.expectedArrivalTime, 'MMM d, hh:mm a') : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <span className="text-sm text-slate-600 whitespace-nowrap">
                          {reg.expectedCheckoutTime ? format(reg.expectedCheckoutTime, 'MMM d, hh:mm a') : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase ${STATUS_STYLES[status] || 'bg-slate-100 text-slate-500'}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="text-sm text-slate-600 whitespace-nowrap">
                          {reg.registrationTime ? format(reg.registrationTime, 'MMM d, hh:mm a') : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {status !== 'Pre-Registered' && status !== 'Checked Out' ? (
                          <button
                            onClick={() => setExtendVisitor(reg)}
                            className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-bold transition-colors"
                          >
                            Extend Visit
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">{status === 'Checked Out' ? 'Completed' : 'Awaiting arrival'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </HostLayout>
  );
};

export default HostDashboard;