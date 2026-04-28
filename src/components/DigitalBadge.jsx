import { CheckCircle, Calendar, User, Briefcase, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

const DigitalBadge = ({ visitor, onBack }) => {
  if (!visitor) return null;

  return (
    <div className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-8 duration-500">
      <div className="bg-emerald-500 p-10 text-white text-center relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-black/10 rounded-full blur-2xl"></div>
        
        <div className="relative z-10">
          <div className="bg-white text-emerald-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl ring-4 ring-emerald-400">
            <CheckCircle size={48} />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight">Visitor Badge</h2>
          <p className="text-emerald-50 mt-2 font-medium">Successfully Checked In</p>
        </div>
      </div>

      <div className="p-8 space-y-8 bg-slate-50/50">
        <div className="space-y-6">
          <div className="flex items-center space-x-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
              <User size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Visitor Name</p>
              <p className="text-lg font-bold text-slate-800">{visitor.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center space-x-2 text-indigo-600 mb-1">
                <Briefcase size={16} />
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Purpose</p>
              </div>
              <p className="text-md font-bold text-slate-800">{visitor.purpose}</p>
            </div>
            <div className="flex flex-col p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center space-x-2 text-indigo-600 mb-1">
                <User size={16} />
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Host</p>
              </div>
              <p className="text-md font-bold text-slate-800">{visitor.hostName}</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Arrival Time</p>
                <p className="text-md font-bold text-slate-800">
                  {format(visitor.checkInTime, 'MMM d, h:mm a')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={onBack}
            className="w-full py-4 px-6 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center space-x-2 transition-all transform active:scale-95 shadow-lg shadow-slate-200"
          >
            <ArrowLeft size={18} />
            <span>New Check-In</span>
          </button>
        </div>
      </div>
      
      <div className="bg-slate-100 p-4 text-center">
        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-[0.2em]">
          Powered by VisitorPro Management
        </p>
      </div>
    </div>
  );
};

export default DigitalBadge;
