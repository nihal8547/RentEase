import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Building2,
  ShieldCheck,
  TrendingUp,
  Users,
  ChevronLeft,
  Mail,
  Lock,
  User,
  Briefcase,
  Hash,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import api from '../lib/api';
import toast from 'react-hot-toast';

type ViewMode = 'login' | 'register' | 'forgot_password';

/* ── Decorative SVG background pattern ── */
const GridPattern: React.FC = () => (
  <svg
    className="absolute inset-0 w-full h-full opacity-[0.06]"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)" />
  </svg>
);

const features = [
  { icon: Building2,   text: 'Multi-property portfolio management' },
  { icon: TrendingUp,  text: 'Real-time revenue & occupancy KPIs' },
  { icon: Users,       text: 'Tenant lifecycle & lease automation' },
  { icon: ShieldCheck, text: 'Tawtheeq (MOJ) integration & PDC vault' },
];

/* ── Reusable input row ── */
interface FieldProps {
  label: string;
  icon: React.ElementType;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoComplete?: string;
  mono?: boolean;
  suffix?: React.ReactNode;
}
const Field: React.FC<FieldProps> = ({
  label, icon: Icon, type = 'text', placeholder, value, onChange,
  required, autoComplete, mono, suffix,
}) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold text-ink-600 tracking-wide">
      {label}
    </label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none">
        <Icon size={14} />
      </span>
      <input
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full pl-9 ${suffix ? 'pr-10' : 'pr-3'} py-2.5 text-sm bg-sand-050 border border-line rounded-xl text-ink-900 placeholder:text-ink-300
          focus:outline-none focus:border-maroon-700 focus:bg-white focus:ring-2 focus:ring-maroon-700/10
          hover:border-ink-200 transition-all ${mono ? 'font-mono' : ''}`}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          {suffix}
        </span>
      )}
    </div>
  </div>
);

export const LoginView: React.FC = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || '/';
  const isExpired = new URLSearchParams(location.search).get('expired') === 'true';
  const { setAuth } = useAuthStore();

  const [viewMode, setViewMode]       = useState<ViewMode>('login');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [agencyName, setAgencyName]   = useState('');
  const [crNumber, setCrNumber]       = useState('');
  const [name, setName]               = useState('');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const switchMode = (mode: ViewMode) => { setViewMode(mode); setError(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (viewMode === 'register') {
        const res = await api.post('/auth/register', {
          agencyName,
          crNumber,
          name,
          email,
          password,
        });
        setAuth(res.data.accessToken || res.data.token, { ...res.data.user, role: res.data.role }, res.data.agency);
      } else if (viewMode === 'login') {
        const res = await api.post('/auth/login', { email, password });
        setAuth(res.data.accessToken || res.data.token, { ...res.data.user, role: res.data.role }, res.data.agency);
      } else if (viewMode === 'forgot_password') {
        const res = await api.post('/auth/forgot-password', { email });
        toast.success(res.data.message || `Reset link sent to ${email}`);
        switchMode('login');
        return;
      }
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message ||
        (err?.code === 'ERR_NETWORK' ? 'Unable to reach server. Check your connection.' : 'Invalid credentials. Please try again.');
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<ViewMode, { heading: string; sub: string }> = {
    login:           { heading: 'Welcome back',          sub: 'Sign in to your agency portal'  },
    register:        { heading: 'Register your agency',  sub: 'Set up your RentEase workspace' },
    forgot_password: { heading: 'Reset your password',   sub: 'We\'ll email you a secure link' },
  };

  return (
    <div className="min-h-screen flex">
      {/* ──────────── Left brand panel ──────────── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] shrink-0 flex-col relative bg-maroon-900 overflow-hidden">
        <GridPattern />

        {/* Gold top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-gold-500 via-gold-300 to-gold-500" style={{ background: 'linear-gradient(to right, #00B4D8, #90E0EF, #00B4D8)' }} />

        {/* Decorative circle glow */}
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-maroon-700/40 blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -right-20 w-64 h-64 rounded-full bg-gold-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full px-10 py-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-auto">
            <div className="w-10 h-10 rounded-xl bg-maroon-700 border border-gold-500/50 flex items-center justify-center shadow-lg">
              <span className="font-bold text-gold-300 text-lg leading-none">R</span>
            </div>
            <div>
              <span className="font-bold text-white text-lg tracking-tight leading-none block">RentEase</span>
              <span className="text-gold-300/70 text-[11px] font-mono tracking-widest">QATAR · PropTech</span>
            </div>
          </div>

          {/* Hero copy */}
          <div className="my-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/8 border border-white/10 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
              <span className="text-xs text-white/70 font-medium">Trusted by agencies in Doha &amp; Qatar</span>
            </div>

            <h2 className="text-3xl font-bold text-white leading-tight tracking-tight">
              Property management<br />
              <span className="text-gold-300">done right.</span>
            </h2>
            <p className="text-sm text-white/50 mt-3 leading-relaxed max-w-xs">
              The all-in-one platform built for Qatar's real estate market — from leases and PDC vaults to Tawtheeq filings.
            </p>

            {/* Feature list */}
            <div className="mt-8 space-y-3.5">
              {features.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center shrink-0">
                    <Icon size={14} className="text-gold-300" />
                  </div>
                  <span className="text-xs text-white/65">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-8 border-t border-white/8 flex items-center justify-between">
            <span className="text-[11px] text-white/30">© 2025 RentEase</span>
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={11} className="text-emerald-400" />
              <span className="text-[11px] text-white/30">256-bit encrypted</span>
            </div>
          </div>
        </div>
      </div>

      {/* ──────────── Right form panel ──────────── */}
      <div className="flex-1 flex flex-col justify-center items-center bg-sand-050 px-6 py-10 overflow-y-auto">
        {/* Mobile logo (shows only on small screens) */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-maroon-900 border border-gold-500/40 flex items-center justify-center">
            <span className="font-bold text-gold-300 text-base">R</span>
          </div>
          <span className="font-bold text-ink-900 text-lg">RentEase</span>
        </div>

        <div className="w-full max-w-[420px]">
          {/* Heading */}
          <div className="mb-7 animate-fade-in">
            {viewMode === 'forgot_password' && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-900 transition-colors mb-4"
              >
                <ChevronLeft size={14} /> Back to sign in
              </button>
            )}
            <h1 className="text-2xl font-bold text-ink-900 tracking-tight">
              {titles[viewMode].heading}
            </h1>
            <p className="text-sm text-ink-400 mt-1">{titles[viewMode].sub}</p>
          </div>

          {/* Tab switcher (login / register only) */}
          {viewMode !== 'forgot_password' && (
            <div className="flex gap-1 p-1 bg-sand-100 rounded-xl mb-6 animate-fade-in">
              {(['login', 'register'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => switchMode(mode)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    viewMode === mode
                      ? 'bg-white text-ink-900 shadow-sm border border-line'
                      : 'text-ink-400 hover:text-ink-700'
                  }`}
                >
                  {mode === 'login' ? 'Sign In' : 'Register Agency'}
                </button>
              ))}
            </div>
          )}

          {/* Alerts */}
          {isExpired && (
            <div className="mb-4 flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-amber-100 border border-amber-600/20 text-amber-700 text-xs font-medium animate-fade-in">
              <ShieldCheck size={14} className="mt-0.5 shrink-0" />
              Your session expired. Please sign in again.
            </div>
          )}
          {error && (
            <div className="mb-4 px-3.5 py-3 rounded-xl bg-ruby-100 border border-ruby-600/20 text-ruby-700 text-xs animate-fade-in">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in stagger-1">
            {viewMode === 'register' && (
              <>
                <Field
                  label="Agency Commercial Name"
                  icon={Briefcase}
                  placeholder="e.g. Al Rayyan Real Estate W.L.L."
                  value={agencyName}
                  onChange={setAgencyName}
                  required
                />
                <Field
                  label="Qatar CR Number"
                  icon={Hash}
                  placeholder="e.g. 104829/QA"
                  value={crNumber}
                  onChange={setCrNumber}
                  required
                  mono
                />
                <Field
                  label="Owner / Administrator Name"
                  icon={User}
                  placeholder="e.g. Tariq Al-Mansoor"
                  value={name}
                  onChange={setName}
                  required
                />
              </>
            )}

            <Field
              label="Email Address"
              icon={Mail}
              type="email"
              placeholder="you@agency.qa"
              value={email}
              onChange={setEmail}
              required
              autoComplete="email"
            />

            {viewMode !== 'forgot_password' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-ink-600 tracking-wide">
                    Password
                  </label>
                  {viewMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot_password')}
                      className="text-xs text-maroon-700 hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none">
                    <Lock size={14} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete={viewMode === 'login' ? 'current-password' : 'new-password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 text-sm bg-sand-050 border border-line rounded-xl text-ink-900 placeholder:text-ink-300 font-mono
                      focus:outline-none focus:border-maroon-700 focus:bg-white focus:ring-2 focus:ring-maroon-700/10
                      hover:border-ink-200 transition-all"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 transition-colors"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-maroon-700 hover:bg-maroon-600 active:bg-maroon-800
                  text-white text-sm font-semibold shadow-sm hover:shadow-md
                  focus:outline-none focus:ring-2 focus:ring-maroon-700 focus:ring-offset-2
                  disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 relative"
              >
                {loading ? (
                  <svg className="w-4 h-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : (
                  <>
                    <span>
                      {viewMode === 'register'        ? 'Create Agency Account'
                        : viewMode === 'forgot_password' ? 'Send Reset Link'
                        : 'Sign In to Portal'}
                    </span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Trust footnote */}
          <div className="mt-8 flex items-center justify-center gap-4 text-[11px] text-ink-300">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={11} className="text-emerald-500" />
              SSL secured
            </span>
            <span>·</span>
            <span>Qatar-hosted data</span>
            <span>·</span>
            <span>PDPA compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
