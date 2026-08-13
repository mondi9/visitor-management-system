import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Loader2, AlertCircle, Info, UserPlus, LogIn, KeyRound, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminLogin = () => {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      // On success the route guard re-renders on auth state change.
    } catch (err) {
      console.error('Auth error:', err);
      const code = err?.code || '';
      setError(
        code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found'
          ? 'Incorrect email or password.'
          : code === 'auth/weak-password'
            ? 'Password must be at least 6 characters.'
            : code === 'auth/email-already-in-use'
              ? 'An account with this email already exists. Sign in instead.'
              : code === 'auth/network-request-failed'
                ? 'Network error. Check your connection and try again.'
                : code === 'auth/unauthorized-domain'
                  ? 'This domain is not authorized for Firebase Authentication. Add it in Firebase Console → Authentication → Settings → Authorized domains.'
                  : 'Could not complete the request. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setError('Enter the email for your account.');
      return;
    }
    setError('');
    setResetMessage('');
    setLoading(true);
    try {
      await resetPassword(resetEmail);
      setResetMessage('If an account exists for that email, a reset link has been sent. Open it to set a new password.');
    } catch (err) {
      console.error('Password reset error:', err);
      setError(
        err?.code === 'auth/user-not-found'
          ? 'No account is registered with that email.'
          : 'Could not send a reset link. Please try again.'
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
              {showReset ? 'Reset Password' : 'Admin Portal'}
            </h1>
            <p className="text-sm text-slate-500">
              {showReset
                ? 'Enter your account email and we will send a link to set a new password.'
                : mode === 'signin'
                  ? 'Sign in to manage visitors, hosts and reports.'
                  : 'Create a reception desk account.'}
            </p>
          </div>

          <div className="p-8">
            {showReset ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="admin@company.com"
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                {error && (
                  <div className="p-3.5 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r flex items-start space-x-3">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                {resetMessage && (
                  <div className="p-3.5 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 rounded-r flex items-start space-x-3">
                    <Mail size={16} className="flex-shrink-0 mt-0.5" />
                    <p className="text-sm">{resetMessage}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-[#0B192C] hover:bg-[#14294a] text-white font-bold flex items-center justify-center transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : <KeyRound size={18} className="mr-2" />}
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>

                <button
                  type="button"
                  onClick={() => { setShowReset(false); setError(''); setResetMessage(''); }}
                  className="w-full text-center text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  ← Back to sign in
                </button>
              </form>
            ) : (
              <>
                <div className="flex mb-6 bg-slate-100 rounded-xl p-1">
                  <button
                    onClick={() => { setMode('signin'); setError(''); }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-colors ${
                      mode === 'signin' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <LogIn size={15} /> Sign In
                  </button>
                  <button
                    onClick={() => { setMode('signup'); setError(''); }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-colors ${
                      mode === 'signup' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <UserPlus size={15} /> Create Account
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@company.com"
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    />
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => { setShowReset(true); setError(''); }}
                        className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>

                  {error && (
                    <div className="p-3.5 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r flex items-start space-x-3">
                      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{error}</p>
                    </div>
                  )}

                  {mode === 'signup' && (
                    <div className="p-3.5 bg-amber-50 border-l-4 border-amber-500 text-amber-700 rounded-r flex items-start space-x-3">
                      <Info size={16} className="flex-shrink-0 mt-0.5" />
                      <p className="text-sm">
                        New accounts are created as Receptionists. The first Super Admin account is set up in the Firebase Console, then promotes staff here.
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-[#0B192C] hover:bg-[#14294a] text-white font-bold flex items-center justify-center transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                    {loading
                      ? 'Please wait…'
                      : mode === 'signin'
                        ? 'Sign In'
                        : 'Create Account'}
                  </button>
                </form>
              </>
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

export default AdminLogin;