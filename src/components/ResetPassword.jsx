import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Shield, KeyRound, CheckCircle2, AlertCircle, Loader2, XCircle, ArrowLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ResetPassword = () => {
  const { confirmResetPassword } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oobCode = searchParams.get('oobCode');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const codeValid = Boolean(oobCode);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await confirmResetPassword(oobCode, password);
      setSuccess(true);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(
        err?.code === 'auth/invalid-action-code'
          ? 'This reset link is invalid or has already been used.'
          : err?.code === 'auth/expired-action-code'
            ? 'This reset link has expired. Request a new one from the login screen.'
            : err?.code === 'auth/weak-password'
              ? 'Password must be at least 6 characters.'
              : err?.code === 'auth/network-request-failed'
                ? 'Network error. Check your connection and try again.'
                : 'Could not reset your password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B192C] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] rounded-full bg-blue-900 blur-3xl"></div>
        <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-indigo-900 blur-3xl"></div>
      </div>

      <div className="z-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/20 flex items-center space-x-3">
            <Shield size={26} className="text-blue-300" />
            <span className="font-bold text-2xl text-white tracking-tight">VMS Admin</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-8 pt-7 pb-5 border-b border-slate-100">
            <h1 className="text-xl font-bold text-slate-800 mb-1">
              {success ? 'Password Updated' : codeValid ? 'Choose a New Password' : 'Invalid Reset Link'}
            </h1>
            <p className="text-sm text-slate-500">
              {success
                ? 'Your password has been changed. Sign in with your new password.'
                : codeValid
                  ? 'Enter a new password for your admin account.'
                  : 'The link you opened is missing or invalid.'}
            </p>
          </div>

          <div className="p-8">
            {success ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 rounded-r flex items-start space-x-3">
                  <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
                  <p className="text-sm">Password updated successfully.</p>
                </div>
                <button
                  onClick={() => navigate('/admin')}
                  className="w-full py-3.5 rounded-xl bg-[#0B192C] hover:bg-[#14294a] text-white font-bold flex items-center justify-center transition-all"
                >
                  <KeyRound size={18} className="mr-2" /> Sign In
                </button>
              </div>
            ) : codeValid ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                {error && (
                  <div className="p-3.5 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r flex items-start space-x-3">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-[#0B192C] hover:bg-[#14294a] text-white font-bold flex items-center justify-center transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : <KeyRound size={18} className="mr-2" />}
                  {loading ? 'Updating…' : 'Update Password'}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border-l-4 border-amber-500 text-amber-700 rounded-r flex items-start space-x-3">
                  <XCircle size={18} className="flex-shrink-0 mt-0.5" />
                  <p className="text-sm">
                    No, or an invalid, reset code was found in this link. Request a new one from the login screen.
                  </p>
                </div>
                <Link
                  to="/admin"
                  className="w-full py-3.5 rounded-xl bg-[#0B192C] hover:bg-[#14294a] text-white font-bold flex items-center justify-center transition-colors"
                >
                  Back to Login
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <Link to="/" className="text-blue-400/70 hover:text-blue-300 text-sm font-medium flex items-center gap-1.5 transition-colors">
            <ArrowLeft size={16} /> Back to check-in kiosk
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;