import { useState, useEffect } from 'react';
import { X, HelpCircle, UserPlus, ScanFace, Printer, CheckCircle2, Info } from 'lucide-react';

const STORAGE_KEY = 'vms.onboardingSeen';

const STEPS = [
  {
    icon: <UserPlus size={20} className="text-blue-500" />,
    title: 'Pick your type',
    text: 'New visitors fill in their details; returning visitors can use the fast check-in by searching their saved profile.',
  },
  {
    icon: <ScanFace size={20} className="text-emerald-500" />,
    title: 'Photo capture',
    text: 'The camera opens automatically. Place your face in the frame — the photo is taken on its own after a 3-2-1 countdown. No camera? Tap "Capture Photo" or continue without one.',
  },
  {
    icon: <Printer size={20} className="text-amber-500" />,
    title: 'Get your badge',
    text: 'A digital badge with your unique number is generated instantly. Print it at the kiosk and show it at security.',
  },
  {
    icon: <CheckCircle2 size={20} className="text-indigo-500" />,
    title: 'Confirmations',
    text: 'Your confirmation email includes your badge number. Staff can extend or check you out from the admin portal.',
  },
];

const OnboardingGuide = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY) === 'true';
    if (!seen) {
      localStorage.setItem(STORAGE_KEY, 'true');
      const timer = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  const handleToggle = () => setOpen((prev) => !prev);

  return (
    <>
      <button
        onClick={handleToggle}
        className="z-20 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium transition-colors"
      >
        <HelpCircle size={16} />
        How it works
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(11,25,44,0.80)', backdropFilter: 'blur(6px)' }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-[#0B192C] px-8 py-6 flex items-center justify-between relative overflow-hidden">
              <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-blue-800/30 blur-2xl pointer-events-none" />
              <div className="flex items-center space-x-3 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                  <Info size={20} className="text-blue-300" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Welcome to the Kiosk</h2>
                  <p className="text-blue-300 text-sm">Get checked in in under a minute</p>
                </div>
              </div>
              <button
                onClick={handleToggle}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors relative z-10"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-8 py-6 space-y-5">
              {STEPS.map((step, i) => (
                <div key={i} className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    {step.icon}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">
                      <span className="text-slate-400 font-semibold mr-1.5">{i + 1}.</span>{step.title}
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">This guide shows once and can be reopened anytime.</p>
              <button
                onClick={handleToggle}
                className="px-5 py-2.5 bg-[#0B192C] hover:bg-[#14294a] text-white text-sm font-bold rounded-xl transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OnboardingGuide;