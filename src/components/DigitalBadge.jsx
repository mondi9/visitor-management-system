import { CheckCircle, Calendar, User, Briefcase, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

const DigitalBadge = ({ visitor, onBack }) => {
  if (!visitor) return null;

  return (
    <div className="max-w-md mx-auto rounded-3xl shadow-2xl overflow-hidden border animate-in slide-in-from-bottom-8 duration-500"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
    >
      {/* Header */}
      <div className="bg-emerald-500 p-10 text-white text-center relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-black/10 rounded-full blur-2xl"></div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="relative mb-6">
            {visitor.photo ? (
              <img src={visitor.photo} alt="Visitor" className="w-24 h-24 rounded-full object-cover shadow-xl ring-4 ring-emerald-400 bg-white" />
            ) : (
              <div className="bg-white text-emerald-600 w-24 h-24 rounded-full flex items-center justify-center shadow-xl ring-4 ring-emerald-400">
                <img src="/logo.png" alt="SecurePass Logo" className="w-16 h-16 rounded-xl" />
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 bg-white p-1.5 rounded-lg shadow-md border">
              <img src="/logo.png" alt="Logo Icon" className="w-5 h-5 rounded-sm" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight">Visitor Badge</h2>
          <p className="text-emerald-50 mt-2 font-medium">Successfully Checked In</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-8 space-y-8" style={{ background: 'var(--bg-subtle)' }}>
        <div className="space-y-6">

          <div className="flex items-center space-x-4 p-4 rounded-2xl shadow-sm border"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          >
            <div className="p-3 rounded-xl text-indigo-400" style={{ background: 'var(--accent-light)' }}>
              <User size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Visitor Name</p>
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{visitor.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: <Briefcase size={16} />, label: 'Purpose', value: visitor.purpose },
              { icon: <User size={16} />, label: 'Host', value: visitor.hostName },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex flex-col p-4 rounded-2xl shadow-sm border"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              >
                <div className="flex items-center space-x-2 mb-1 text-indigo-400">
                  {icon}
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
                </div>
                <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
              </div>
            ))}
          </div>

            <div className="flex items-center justify-between p-4 rounded-2xl shadow-sm border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg text-emerald-500" style={{ background: 'rgba(16,185,129,0.1)' }}>
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Arrival Time</p>
                  <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                    {format(visitor.checkInTime, 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
              {visitor.expiryTime && (
                <div className="text-right border-l pl-4" style={{ borderColor: 'var(--border-color)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Expires</p>
                  <p className="font-bold text-rose-500">
                    {format(visitor.expiryTime, 'h:mm a')}
                  </p>
                </div>
              )}
            </div>
        </div>

        <div className="pt-4 flex gap-3">
          <button
            onClick={() => window.print()}
            className="flex-1 py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center space-x-2 transition-all transform active:scale-95 shadow-lg shadow-indigo-200/30"
          >
            <CheckCircle size={18} />
            <span>Print Badge</span>
          </button>
          <button
            onClick={onBack}
            className="flex-1 py-4 px-6 font-bold rounded-xl flex items-center justify-center space-x-2 transition-all transform active:scale-95 border"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
          >
            <ArrowLeft size={18} />
            <span>New Check-In</span>
          </button>
        </div>
      </div>

      <div className="p-4 text-center border-t" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
        <p className="text-[10px] font-medium uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
          Powered by VisitorPro Management
        </p>
      </div>
    </div>
  );
};

export default DigitalBadge;
