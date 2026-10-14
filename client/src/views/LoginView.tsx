import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import toast from 'react-hot-toast';

type ViewMode = 'login' | 'register' | 'forgot_password';

export const LoginView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  const isExpired = new URLSearchParams(location.search).get('expired') === 'true';
  const { setAuth } = useAuthStore();

  const [viewMode, setViewMode] = useState<ViewMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [crNumber, setCrNumber] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (viewMode === 'register') {
        const res = await api.post('/auth/register', { agencyName, crNumber, name, email, password });
        setAuth(res.data.token, res.data.user, res.data.agency);
      } else if (viewMode === 'login') {
        const res = await api.post('/auth/login', { email, password });
        setAuth(res.data.token, res.data.user, res.data.agency);
      } else if (viewMode === 'forgot_password') {
        const res = await api.post('/auth/forgot-password', { email });
        toast.success(res.data.message || `Reset instructions sent to ${email}`);
        setViewMode('login');
        return;
      }
      navigate(from, { replace: true });
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        (err?.code === 'ERR_NETWORK'
          ? 'Unable to reach server. Check your connection.'
          : 'Invalid credentials. Please try again.');
      setError(Array.isArray(message) ? message[0] : message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 text-sm border border-line rounded-lg bg-white text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-maroon-700 focus:ring-2 focus:ring-maroon-700/10 transition-all";

  return (
    <div className="min-h-screen bg-sand-050 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-[400px]">
        {/* ── Brand Mark ── */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-maroon-900 border border-gold-500/40 mx-auto flex items-center justify-center mb-4 shadow-lg">
            <span className="font-bold text-gold-300 text-2xl">R</span>
          </div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">RentEase</h1>
          <p className="text-xs text-ink-400 mt-1">Qatar Property &amp; Tenant Management</p>
        </div>

        {/* ── Card ── */}
        <div className="bg-white border border-line rounded-2xl shadow-md overflow-hidden animate-fade-in stagger-1">
          {/* Tab bar */}
          {viewMode !== 'forgot_password' ? (
            <div className="flex border-b border-line">
              {(['login', 'register'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => { setViewMode(mode); setError(''); }}
                  className={`flex-1 py-3 text-xs font-semibold transition-colors relative ${
                    viewMode === mode
                      ? 'text-maroon-700'
                      : 'text-ink-400 hover:text-ink-600'
                  }`}
                >
                  {mode === 'login' ? 'Sign In' : 'Register Agency'}
                  {viewMode === mode && (
                    <span className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-maroon-700 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-6 pt-5 pb-4 border-b border-line">
              <h2 className="text-base font-semibold text-ink-900">Reset Password</h2>
              <p className="text-xs text-ink-400 mt-0.5">Enter your email to receive reset instructions.</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {isExpired && (
              <div className="px-3 py-2.5 rounded-lg bg-amber-100 text-amber-700 border border-amber-600/20 text-xs font-medium text-center">
                Your session has expired. Please sign in again.
              </div>
            )}
            {error && (
              <div className="px-3 py-2.5 rounded-lg bg-ruby-100 text-ruby-700 border border-ruby-600/20 text-xs">
                {error}
              </div>
            )}

            {viewMode === 'register' && (
              <>
                <div>
                  <label className="form-label">Agency Commercial Name</label>
                  <input type="text" required placeholder="e.g. Al Rayyan Real Estate W.L.L." value={agencyName} onChange={(e) => setAgencyName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="form-label">Qatar CR Number</label>
                  <input type="text" required placeholder="e.g. 104829/QA" value={crNumber} onChange={(e) => setCrNumber(e.target.value)} className={`${inputClass} font-mono`} />
                </div>
                <div>
                  <label className="form-label">Owner / Administrator Name</label>
                  <input type="text" required placeholder="e.g. Tariq Al-Mansoor" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
                </div>
              </>
            )}

            <div>
              <label className="form-label">Email Address</label>
              <input type="email" required autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>

            {viewMode !== 'forgot_password' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="form-label !mb-0">Password</label>
                  {viewMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setViewMode('forgot_password'); setError(''); }}
                      className="text-2xs text-maroon-700 hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete={viewMode === 'login' ? 'current-password' : 'new-password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClass} pr-10 font-mono`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            )}

            <Button
              variant="primary"
              type="submit"
              isLoading={loading}
              size="lg"
              className="w-full mt-2"
            >
              <span>
                {viewMode === 'register' ? 'Create Agency Account'
                  : viewMode === 'forgot_password' ? 'Send Reset Link'
                  : 'Sign In'}
              </span>
              <ArrowRight size={15} />
            </Button>

            {viewMode === 'forgot_password' && (
              <button
                type="button"
                onClick={() => { setViewMode('login'); setError(''); }}
                className="w-full text-xs text-ink-400 hover:text-ink-900 transition-colors text-center py-1"
              >
                ← Back to sign in
              </button>
            )}
          </form>
        </div>

        <p className="text-center text-2xs text-ink-400 mt-6">
          © 2025 RentEase · Qatar PropTech
        </p>
      </div>
    </div>
  );
};

export default LoginView;
