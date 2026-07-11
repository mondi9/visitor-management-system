import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Search, UserCheck, UserX, Clock, LogOut, Loader2, Calendar, Menu, Users, Timer, Plus, AlertTriangle, Bell, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { format, differenceInMinutes, addMinutes } from 'date-fns';
import Sidebar from './Sidebar';

const AdminDashboard = () => {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const q = query(collection(db, 'visitors'), orderBy('checkInTime', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const visitorData = snapshot.docs.map(doc => {
        const data = doc.data();
        const checkInTime = data.checkInTime?.toDate();
        const expiryTime = data.expiryTime?.toDate();
        const checkOutTime = data.checkOutTime?.toDate();

        let status = data.status;
        if (status === 'Active' && expiryTime && new Date() > expiryTime) {
          status = 'Overstayed';
        }

        return {
          id: doc.id,
          ...data,
          checkInTime,
          expiryTime,
          checkOutTime,
          status
        };
      });
      setVisitors(visitorData);
      setLoading(false);
    }, (err) => {
      console.error("Firestore error:", err);
      setLoading(false);
    });

    const timer = setInterval(() => setCurrentTime(new Date()), 60000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  const totalVisitors = visitors.length;
  const activeNow = visitors.filter(v => v.status === 'Active').length;
  const checkedInToday = visitors.filter(v => v.checkInTime && format(v.checkInTime, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length;
  const checkedOutToday = visitors.filter(v => v.status === 'Checked Out' && v.checkOutTime && format(v.checkOutTime, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length;

  return (
    <div className="flex h-screen bg-[#f4f7f6] overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navigation */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="mr-4 lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-[#0B192C]">Dashboard</h1>
              <p className="text-sm text-slate-500">Welcome back, Admin</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-600">
              <Calendar size={16} />
              <span>{format(new Date(), 'dd MMM yyyy')}</span>
            </div>
            <button className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          {/* Top Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total Visitors</p>
                <div className="flex items-baseline space-x-3">
                  <h2 className="text-3xl font-bold text-slate-800">{totalVisitors}</h2>
                  <span className="flex items-center text-xs font-semibold text-emerald-500"><ArrowUpRight size={14} className="mr-0.5"/> 12%</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">vs yesterday</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Users size={24} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Currently On-Site</p>
                <div className="flex items-baseline space-x-3">
                  <h2 className="text-3xl font-bold text-slate-800">{activeNow}</h2>
                  <span className="flex items-center text-xs font-semibold text-emerald-500"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span> Live</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">across all facilities</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <UserCheck size={24} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Checked In Today</p>
                <div className="flex items-baseline space-x-3">
                  <h2 className="text-3xl font-bold text-slate-800">{checkedInToday}</h2>
                  <span className="flex items-center text-xs font-semibold text-emerald-500"><ArrowUpRight size={14} className="mr-0.5"/> 8%</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">vs yesterday</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                <Activity size={24} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Checked Out Today</p>
                <div className="flex items-baseline space-x-3">
                  <h2 className="text-3xl font-bold text-slate-800">{checkedOutToday}</h2>
                  <span className="flex items-center text-xs font-semibold text-rose-500"><ArrowDownRight size={14} className="mr-0.5"/> 5%</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">vs yesterday</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
                <LogOut size={24} />
              </div>
            </div>
          </div>

          {/* Middle Row Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm lg:col-span-1">
              <h3 className="font-bold text-slate-800 mb-4">Visitor Trend (This Week)</h3>
              <div className="h-48 w-full border-b border-l border-slate-200 relative flex items-end">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <polyline fill="none" stroke="#2563eb" strokeWidth="2" points="0,80 20,40 40,60 60,20 80,50 100,10" />
                  <circle cx="20" cy="40" r="2" fill="#2563eb" />
                  <circle cx="40" cy="60" r="2" fill="#2563eb" />
                  <circle cx="60" cy="20" r="2" fill="#2563eb" />
                  <circle cx="80" cy="50" r="2" fill="#2563eb" />
                </svg>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">Visitors by Purpose</h3>
              <div className="flex flex-col items-center justify-center h-48">
                <div className="w-32 h-32 rounded-full border-[16px] border-[#2563eb] border-t-emerald-400 border-l-purple-400 relative flex items-center justify-center mb-4">
                  <div className="text-center">
                    <span className="block text-2xl font-bold text-slate-800">{totalVisitors}</span>
                    <span className="text-[10px] text-slate-400 uppercase">Total</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">Top Visiting Hosts</h3>
              <div className="space-y-4">
                {[
                  { name: 'Adewale Okafor', visits: 18, init: 'AO', bg: 'bg-blue-100 text-blue-600' },
                  { name: 'Funmi Adebayo', visits: 15, init: 'FA', bg: 'bg-purple-100 text-purple-600' },
                  { name: 'Michael Johnson', visits: 12, init: 'MJ', bg: 'bg-emerald-100 text-emerald-600' },
                  { name: 'Bola Ahmed', visits: 10, init: 'BA', bg: 'bg-orange-100 text-orange-600' }
                ].map((host, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${host.bg}`}>
                        {host.init}
                      </div>
                      <span className="text-sm font-medium text-slate-700">{host.name}</span>
                    </div>
                    <span className="font-bold text-slate-800">{host.visits}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm lg:col-span-2 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Recent Visitors</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Name</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Visiting</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Check-In</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visitors.slice(0, 5).map((visitor) => (
                      <tr key={visitor.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold">
                              {visitor.photo ? <img src={visitor.photo} alt="" className="w-full h-full object-cover"/> : visitor.name.charAt(0)}
                            </div>
                            <span className="text-sm font-semibold text-slate-700">{visitor.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-sm text-slate-600">{visitor.hostName || '-'}</span>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-sm text-slate-600">{visitor.checkInTime ? format(visitor.checkInTime, 'hh:mm a') : '-'}</span>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase ${
                            visitor.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {visitor.status === 'Active' ? 'On-site' : 'Checked Out'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {visitors.length === 0 && (
                      <tr><td colSpan={4} className="p-8 text-center text-slate-400 text-sm">No visitors found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Site Summary</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <UserCheck size={18} className="text-slate-400" />
                    <span className="text-sm text-slate-600">Employees on-site</span>
                  </div>
                  <span className="font-bold text-slate-800">256</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Users size={18} className="text-slate-400" />
                    <span className="text-sm text-slate-600">Contractors on-site</span>
                  </div>
                  <span className="font-bold text-slate-800">18</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Calendar size={18} className="text-slate-400" />
                    <span className="text-sm text-slate-600">Expected Visitors</span>
                  </div>
                  <span className="font-bold text-slate-800">22</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <LogOut size={18} className="text-slate-400" />
                    <span className="text-sm text-slate-600">Deliveries Today</span>
                  </div>
                  <span className="font-bold text-slate-800">9</span>
                </div>
              </div>
            </div>
          </div>
          
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
