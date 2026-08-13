import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import {
  Users, Search, Loader2, LogOut, Plus, AlertCircle,
  Clock, Phone, Mail, Building2, UserCheck
} from 'lucide-react';
import { format } from 'date-fns';
import AdminLayout from './AdminLayout';
import ExtendVisitModal from './ExtendVisitModal';
import { getVisitStatus, getRemainingMs, formatRemaining, STATUS_STYLES, toDate } from '../lib/visitUtils';

const STATUS_FILTERS = ['All', 'Active', 'Expiring Soon', 'Expired', 'Checked Out'];

const AdminVisitors = () => {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [checkingOutId, setCheckingOutId] = useState(null);
  const [extendVisitor, setExtendVisitor] = useState(null);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'visitors'), orderBy('checkInTime', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVisitors(snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          checkInTime: toDate(data.checkInTime),
          expectedCheckoutTime: toDate(data.expectedCheckoutTime),
          checkOutTime: toDate(data.checkOutTime),
        };
      }));
      setLoading(false);
    }, (err) => {
      console.error('Firestore error:', err);
      setLoading(false);
      setActionError('Could not load visitors. Check your connection and Firestore rules.');
    });

    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => { unsubscribe(); clearInterval(timer); };
  }, []);

  const handleCheckOut = async (visitorId) => {
    setCheckingOutId(visitorId);
    setActionError('');
    try {
      await updateDoc(doc(db, 'visitors', visitorId), {
        status: 'Checked Out',
        checkOutTime: serverTimestamp(),
      });
    } catch (err) {
      console.error('Check-out failed:', err);
      setActionError('Failed to check out the visitor. Please try again.');
    } finally {
      setCheckingOutId(null);
    }
  };

  const filtered = visitors.filter((v) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      v.name?.toLowerCase().includes(q) ||
      v.company?.toLowerCase().includes(q) ||
      v.badgeNumber?.toLowerCase().includes(q) ||
      v.hostName?.toLowerCase().includes(q) ||
      v.phone?.includes(q);
    const matchesStatus = statusFilter === 'All' || getVisitStatus(v, now) === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = visitors.filter((v) => getVisitStatus(v, now) === 'Active').length;
  const expiringCount = visitors.filter((v) => getVisitStatus(v, now) === 'Expiring Soon').length;
  const expiredCount = visitors.filter((v) => getVisitStatus(v, now) === 'Expired').length;

  return (
    <AdminLayout
      title="Visitors"
      subtitle="Every check-in on record, with live status"
      icon={<Users size={20} className="text-blue-600" />}
    >
      {extendVisitor && (
        <ExtendVisitModal
          visitor={extendVisitor}
          onClose={() => setExtendVisitor(null)}
          onExtended={() => setExtendVisitor(null)}
        />
      )}

      {actionError && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r flex items-start space-x-3">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm">{actionError}</p>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium mb-1">Total Records</p>
            <p className="text-3xl font-bold text-slate-800">{visitors.length}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
            <Users size={22} className="text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium mb-1">On-Site</p>
            <p className="text-3xl font-bold text-emerald-600">{activeCount}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <UserCheck size={22} className="text-emerald-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium mb-1">Expiring Soon</p>
            <p className="text-3xl font-bold text-amber-600">{expiringCount}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
            <Clock size={22} className="text-amber-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium mb-1">Expired</p>
            <p className="text-3xl font-bold text-rose-600">{expiredCount}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
            <AlertCircle size={22} className="text-rose-500" />
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, company, badge, host, phone…"
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === status
                    ? 'bg-[#0B192C] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 size={28} className="animate-spin mr-3" />
            <span className="font-medium">Loading visitors…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No visitors {searchQuery || statusFilter !== 'All' ? 'match your filters' : 'yet. Complete a check-in to see it here.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/70">
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Badge / Visitor</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden lg:table-cell">Company</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden md:table-cell">Host</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Check-In</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden md:table-cell">Remaining</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((visitor) => {
                  const status = getVisitStatus(visitor, now);
                  const remaining = getRemainingMs(visitor.expectedCheckoutTime, now);
                  const isCheckedOut = status === 'Checked Out';
                  return (
                    <tr key={visitor.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center flex-shrink-0">
                            {visitor.photoUrl
                              ? <img src={visitor.photoUrl} alt={visitor.name} className="w-full h-full object-cover" />
                              : <span className="font-bold text-slate-500 text-sm">{visitor.name?.charAt(0)}</span>}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{visitor.name}</p>
                            <p className="text-xs text-blue-600 font-semibold">{visitor.badgeNumber || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Building2 size={13} className="text-slate-400 flex-shrink-0" />
                          <span>{visitor.company || '—'}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{visitor.purpose || ''}</p>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <p className="text-sm font-medium text-slate-700">{visitor.hostName || '—'}</p>
                        {visitor.hostEmail && (
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail size={10} /> {visitor.hostEmail}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600 whitespace-nowrap">{visitor.checkInTime ? format(visitor.checkInTime, 'MMM d, hh:mm a') : '—'}</p>
                        {visitor.phone && (
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone size={10} /> {visitor.phone}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        {isCheckedOut ? (
                          <span className="text-xs text-slate-400">Checked out</span>
                        ) : (
                          <span className={`text-sm font-bold ${status === 'Expired' ? 'text-rose-500' : status === 'Expiring Soon' ? 'text-amber-600' : 'text-slate-700'}`}>
                            {formatRemaining(remaining)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase ${STATUS_STYLES[status] || 'bg-slate-100 text-slate-500'}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {!isCheckedOut && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setExtendVisitor(visitor)}
                              className="flex items-center px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-bold transition-colors"
                            >
                              <Plus size={14} className="mr-1" /> Extend
                            </button>
                            <button
                              onClick={() => handleCheckOut(visitor.id)}
                              disabled={checkingOutId === visitor.id}
                              className="flex items-center px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-xs font-bold transition-colors disabled:opacity-50"
                            >
                              {checkingOutId === visitor.id ? <Loader2 size={14} className="animate-spin mr-1" /> : <LogOut size={14} className="mr-1" />} Check Out
                            </button>
                          </div>
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
    </AdminLayout>
  );
};

export default AdminVisitors;