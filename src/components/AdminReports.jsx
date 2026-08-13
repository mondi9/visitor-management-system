import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import {
  FileText, Download, Loader2, Users, UserCheck, LogOut,
  TrendingUp, AlertCircle, Building2
} from 'lucide-react';
import { format } from 'date-fns';
import AdminLayout from './AdminLayout';
import { getVisitStatus, toDate } from '../lib/visitUtils';

const AdminReports = () => {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now] = useState(() => new Date());
  const [exporting, setExporting] = useState(false);
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
          checkOutTime: toDate(data.checkOutTime),
          expectedCheckoutTime: toDate(data.expectedCheckoutTime),
        };
      }));
      setLoading(false);
    }, (err) => {
      console.error('Firestore error:', err);
      setLoading(false);
      setActionError('Could not load reports data. Check your Firestore rules.');
    });
    return () => unsub();
  }, []);

  const today = format(now, 'yyyy-MM-dd');
  const todayVisits = visitors.filter((v) => v.checkInTime && format(v.checkInTime, 'yyyy-MM-dd') === today);
  const activeNow = visitors.filter((v) => getVisitStatus(v, now) === 'Active').length;
  const checkedOut = visitors.filter((v) => v.status === 'Checked Out').length;
  const expired = visitors.filter((v) => getVisitStatus(v, now) === 'Expired').length;

  // Purpose distribution
  const purposeCounts = visitors.reduce((acc, v) => {
    const key = v.purpose || 'Other';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const purposes = Object.entries(purposeCounts).sort((a, b) => b[1] - a[1]);

  // Weekly trend (last 7 days)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));
    const key = format(d, 'yyyy-MM-dd');
    return {
      date: format(d, 'EEE'),
      count: visitors.filter((v) => v.checkInTime && format(v.checkInTime, 'yyyy-MM-dd') === key).length,
    };
  });
  const maxDay = Math.max(...last7.map((d) => d.count), 1);

  const handleExport = () => {
    setExporting(true);
    try {
      const header = [
        'Badge Number', 'Name', 'Type', 'Company', 'Phone', 'Email',
        'Purpose', 'Host Name', 'Host Email', 'Check In Time', 'Expected Checkout',
        'Check Out Time', 'Status', 'Duration',
      ];
      const rows = visitors.map((v) => [
        v.badgeNumber || '', v.name || '', v.type || 'visitor', v.company || '',
        v.phone || '', v.email || '', v.purpose || '', v.hostName || '',
        v.hostEmail || '', v.checkInTime ? format(v.checkInTime, 'yyyy-MM-dd HH:mm:ss') : '',
        v.expectedCheckoutTime ? format(v.expectedCheckoutTime, 'yyyy-MM-dd HH:mm:ss') : '',
        v.checkOutTime ? format(v.checkOutTime, 'yyyy-MM-dd HH:mm:ss') : '',
        getVisitStatus(v, now), v.duration || '',
      ]);
      const escape = (cell) => `"${String(cell).replace(/"/g, '""')}"`;
      const csv = [header, ...rows].map((row) => row.map(escape).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `visitors-report-${today}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      setActionError('Failed to generate the CSV export.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminLayout
      title="Reports"
      subtitle="Visitor analytics and data exports"
      icon={<FileText size={20} className="text-purple-600" />}
    >
      {actionError && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r flex items-start space-x-3">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm">{actionError}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 size={28} className="animate-spin mr-3" />
          <span className="font-medium">Calculating reports…</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium mb-1">All-Time Visitors</p>
                <p className="text-3xl font-bold text-slate-800">{visitors.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <Users size={22} className="text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium mb-1">Today</p>
                <p className="text-3xl font-bold text-slate-800">{todayVisits.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                <TrendingUp size={22} className="text-emerald-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium mb-1">Checked Out</p>
                <p className="text-3xl font-bold text-slate-800">{checkedOut}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
                <LogOut size={22} className="text-purple-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium mb-1">On-Site / Expired</p>
                <p className="text-3xl font-bold text-slate-800">{activeNow} / {expired}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
                <UserCheck size={22} className="text-rose-500" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Weekly trend */}
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-5">Visitors Last 7 Days</h3>
              <div className="flex items-end justify-between h-44 gap-3">
                {last7.map((day) => (
                  <div key={day.date} className="flex flex-col items-center flex-1">
                    <div className="w-full flex items-end justify-center rounded-t-lg bg-blue-600/80"
                      style={{ height: `${Math.max((day.count / maxDay) * 100, 4)}%` }}
                    >
                    </div>
                    <div className="py-1 text-[10px] text-slate-400 mt-1">{day.date}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-2 text-xs text-slate-400">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-blue-600/80 inline-block" /> visits</span>
              </div>
            </div>

            {/* Purpose distribution */}
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-5">Visitors by Purpose</h3>
              {purposes.length === 0 ? (
                <p className="text-sm text-slate-400">No data yet.</p>
              ) : (
                <div className="space-y-3">
                  {purposes.slice(0, 6).map(([purpose, count]) => {
                    const pct = Math.round((count / visitors.length) * 100);
                    return (
                      <div key={purpose}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-slate-600 flex items-center gap-1.5">
                            <Building2 size={13} className="text-slate-400" /> {purpose}
                          </span>
                          <span className="font-bold text-slate-800">{count} <span className="text-xs text-slate-400 font-medium">({pct}%)</span></span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Export */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-800">Export Visitor Data</h3>
              <p className="text-sm text-slate-500 mt-1">
                Download all visitor records as a CSV file ({visitors.length} rows) for analysis or archival.
              </p>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting || visitors.length === 0}
              className="inline-flex items-center justify-center px-5 py-3 bg-[#0B192C] hover:bg-[#14294a] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {exporting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Download size={16} className="mr-2" />}
              {exporting ? 'Preparing…' : 'Export CSV'}
            </button>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminReports;