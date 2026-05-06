import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Search, UserCheck, UserX, Clock, Filter, LayoutDashboard, LogOut, Loader2, Calendar, Menu, Shield, Users } from 'lucide-react';
import { format } from 'date-fns';
import Sidebar from './Sidebar';

const AdminDashboard = () => {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'visitors'), orderBy('checkInTime', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const visitorData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        checkInTime: doc.data().checkInTime?.toDate(),
        checkOutTime: doc.data().checkOutTime?.toDate(),
      }));
      setVisitors(visitorData);
      setLoading(false);
    }, (err) => {
      console.error("Firestore error:", err);
      setError('Please check your Firebase configuration and Firestore rules.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCheckOut = async (visitorId) => {
    try {
      const visitorRef = doc(db, 'visitors', visitorId);
      await updateDoc(visitorRef, {
        status: 'Checked Out',
        checkOutTime: serverTimestamp()
      });
    } catch (err) {
      console.error("Error checking out:", err);
    }
  };

  const filteredVisitors = visitors.filter(visitor => {
    const matchesName = visitor.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = !filterDate || (visitor.checkInTime && format(visitor.checkInTime, 'yyyy-MM-dd') === filterDate);
    return matchesName && matchesDate;
  });

  const inputStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
  };

  return (
    <div className="flex min-h-screen font-sans pt-16" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <Shield size={20} className="text-white" />
            </div>
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>SecurePass Admin</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-xl transition-colors"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-subtle)' }}
          >
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-in fade-in duration-700">
          <div className="max-w-7xl mx-auto space-y-8">

            {/* Header (Desktop) */}
            <div className="hidden lg:flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center space-x-4">
                <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-200/30">
                  <LayoutDashboard size={28} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Visitor Overview</h1>
                  <p className="font-medium text-sm" style={{ color: 'var(--text-muted)' }}>Real-time tracking & management</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="px-4 py-2 rounded-xl border font-bold flex items-center space-x-2 text-emerald-500"
                  style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)' }}
                >
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span>{visitors.filter(v => v.status === 'Active').length} Active Visitors</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-6 rounded-2xl border flex items-center space-x-3 text-rose-500"
                style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)' }}
              >
                <UserX size={24} />
                <p className="font-medium">{error}</p>
              </div>
            )}

            {/* Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Visitors', value: visitors.length, icon: <Users size={20} />, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
                { label: 'Active Now', value: visitors.filter(v => v.status === 'Active').length, icon: <UserCheck size={20} />, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
                {
                  label: "Today's Check-ins",
                  value: visitors.filter(v => v.checkInTime && format(v.checkInTime, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length,
                  icon: <Clock size={20} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'
                },
                { label: 'Checked Out', value: visitors.filter(v => v.status === 'Checked Out').length, icon: <LogOut size={20} />, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
              ].map((stat, i) => (
                <div key={i} className="p-6 rounded-3xl border transition-all hover:scale-[1.02]"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                >
                  <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                    {stat.label}
                  </p>
                  <div className="flex items-end justify-between">
                    <h3 className="text-3xl font-black" style={{ color: stat.color }}>{stat.value}</h3>
                    <div className="p-2 rounded-xl" style={{ background: stat.bg, color: stat.color }}>{stat.icon}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2" size={20} style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search by visitor name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl outline-none font-medium transition-all"
                  style={{ ...inputStyle, boxShadow: '0 1px 4px var(--shadow-color)' }}
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2" size={20} style={{ color: 'var(--text-muted)' }} />
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl outline-none font-medium transition-all"
                  style={{ ...inputStyle, boxShadow: '0 1px 4px var(--shadow-color)' }}
                />
              </div>
              <button
                onClick={() => { setSearchTerm(''); setFilterDate(''); }}
                className="py-4 rounded-2xl font-bold border-2 border-dashed transition-all flex items-center justify-center space-x-2"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
              >
                <Filter size={18} />
                <span>Reset Filters</span>
              </button>
            </div>

            {/* Table */}
            <div className="rounded-3xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              {loading ? (
                <div className="p-20 flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="animate-spin text-indigo-500" size={48} />
                  <p className="font-medium text-lg" style={{ color: 'var(--text-muted)' }}>Synchronizing secure data...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)' }}>
                        {['Visitor Info', 'Visit Details', 'Check-In/Out', 'Status', 'Actions'].map(h => (
                          <th key={h} className="px-6 py-5 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVisitors.map((visitor) => (
                        <tr key={visitor.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td className="px-6 py-5">
                            <div className="flex items-center space-x-3">
                              {visitor.photo ? (
                                <img src={visitor.photo} alt={visitor.name} className="w-11 h-11 object-cover rounded-2xl border" style={{ borderColor: 'var(--border-color)' }} />
                              ) : (
                                <div className="w-11 h-11 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 font-black text-lg">
                                  {visitor.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{visitor.name}</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{visitor.phone}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{visitor.purpose}</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Host: <span className="text-indigo-400 font-bold">{visitor.hostName}</span></p>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center space-x-2 text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                              <Clock size={14} className="text-indigo-400" />
                              <span>{visitor.checkInTime ? format(visitor.checkInTime, 'HH:mm') : '--:--'}</span>
                              <span style={{ color: 'var(--text-muted)' }}>→</span>
                              <span style={{ color: visitor.checkOutTime ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                                {visitor.checkOutTime ? format(visitor.checkOutTime, 'HH:mm') : 'Active'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider`}
                              style={{
                                background: visitor.status === 'Active' ? 'rgba(16,185,129,0.15)' : 'var(--bg-subtle)',
                                color: visitor.status === 'Active' ? '#10b981' : 'var(--text-muted)',
                                border: `1px solid ${visitor.status === 'Active' ? 'rgba(16,185,129,0.3)' : 'var(--border-color)'}`,
                              }}
                            >
                              {visitor.status === 'Active' ? 'Active' : 'Completed'}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            {visitor.status === 'Active' ? (
                              <button
                                onClick={() => handleCheckOut(visitor.id)}
                                className="flex items-center space-x-2 px-4 py-2.5 font-bold rounded-2xl transition-all text-rose-500 hover:bg-rose-500/10 border"
                                style={{ borderColor: 'rgba(239,68,68,0.2)' }}
                              >
                                <LogOut size={16} />
                                <span className="text-xs">Check-out</span>
                              </button>
                            ) : (
                              <span className="text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-xl font-bold border"
                                style={{ color: 'var(--text-muted)', background: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}
                              >
                                Logged Out
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredVisitors.length === 0 && (
                        <tr>
                          <td colSpan="5" className="px-6 py-24 text-center">
                            <div className="flex flex-col items-center justify-center space-y-3">
                              <div className="p-4 rounded-full" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                                <Search size={48} />
                              </div>
                              <p className="font-bold text-lg" style={{ color: 'var(--text-secondary)' }}>No matches found</p>
                              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Try adjusting your filters or search term</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
