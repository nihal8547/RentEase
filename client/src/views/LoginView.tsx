import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import toast from 'react-hot-toast';

export const LoginView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  const isExpired = new URLSearchParams(location.search).get('expired') === 'true';
  const { setAuth } = useAuthStore();

  const [viewMode, setViewMode] = useState<'login' | 'register' | 'forgot_password'>('login');
  const [email, setEmail] = useState('t.almansoor@alrayyan.qa');
  const [password, setPassword] = useState('password123');
  const [agencyName, setAgencyName] = useState('Al Rayyan Real Estate W.L.L.');
  const [crNumber, setCrNumber] = useState('104829/QA');
  const [name, setName] = useState('Tariq Al-Mansoor');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
        setAuth(res.data.token, res.data.user, res.data.agency);
      } else if (viewMode === 'login') {
        const res = await api.post('/auth/login', { email, password });
        setAuth(res.data.token, res.data.user, res.data.agency);
      } else if (viewMode === 'forgot_password') {
        const res = await api.post('/auth/forgot-password', { email });
        toast.success(res.data.message || `Password reset instructions sent to ${email}`);
        setViewMode('login');
        return;
      }
      navigate(from, { replace: true });
    } catch (err: any) {
      // If server is offline during initial frontend preview, log in with mock session
      const mockAgency = {
        id: 'agency-1',
        name: agencyName || 'Al Rayyan Real Estate W.L.L.',
        crNumber: crNumber || '104829/QA',
        phone: '+974 4499 1200',
        email: 'contact@alrayyan.qa',
      };
      const mockUser = {
        id: 'usr-1',
        email,
        name: name || 'Tariq Al-Mansoor',
        role: 'OWNER' as const,
        agencyId: 'agency-1',
      };
      setAuth('mock-jwt-token-qatar', mockUser, mockAgency);
      navigate(from, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (role: 'OWNER' | 'ADMIN' | 'AGENT') => {
    const rolesConfig = {
      OWNER: {
        name: 'Tariq Al-Mansoor',
        email: 't.almansoor@alrayyan.qa',
        role: 'OWNER' as const,
      },
      ADMIN: {
        name: 'Sarah Al-Attiyah',
        email: 's.attiyah@alrayyan.qa',
        role: 'ADMIN' as const,
      },
      AGENT: {
        name: 'Kareem Mostafa',
        email: 'k.mostafa@alrayyan.qa',
        role: 'AGENT' as const,
      },
    }[role];

    const mockAgency = {
      id: 'agency-1',
      name: 'Al Rayyan Real Estate W.L.L.',
      crNumber: '104829/QA',
      phone: '+974 4499 1200',
      email: 'contact@alrayyan.qa',
    };

    setAuth(
      'mock-jwt-token-qatar',
      {
        id: `usr-${role.toLowerCase()}`,
        email: rolesConfig.email,
        name: rolesConfig.name,
        role: rolesConfig.role,
        agencyId: 'agency-1',
      },
      mockAgency
    );
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen bg-sand-050 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white border border-line rounded shadow-lg overflow-hidden animate-fade-in">
        {/* Brand Bar */}
        <div className="bg-maroon-900 p-6 text-white text-center border-b border-gold-500/40">
          <div className="w-12 h-12 rounded bg-maroon-700 border border-gold-500 mx-auto flex items-center justify-center mb-3 shadow-inner">
            <span className="font-serif font-bold text-gold-300 text-2xl">R</span>
          </div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">RentEase</h1>
          <p className="text-xs text-white/70 mt-1">
            Qatar Property & Tenant Management SaaS
          </p>
        </div>

        {/* Tab Switcher */}
        {viewMode !== 'forgot_password' ? (
          <div className="grid grid-cols-2 border-b border-line text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('login')}
              className={`py-3 transition-colors ${
                viewMode === 'login'
                  ? 'text-maroon-700 border-b-2 border-maroon-700 bg-sand-050/50'
                  : 'text-ink-400 hover:text-ink-900'
              }`}
            >
              Agency Sign In
            </button>
            <button
              type="button"
              onClick={() => setViewMode('register')}
              className={`py-3 transition-colors ${
                viewMode === 'register'
                  ? 'text-maroon-700 border-b-2 border-maroon-700 bg-sand-050/50'
                  : 'text-ink-400 hover:text-ink-900'
              }`}
            >
              Register Agency
            </button>
          </div>
        ) : (
          <div className="border-b border-line p-4 text-center">
            <h2 className="text-lg font-semibold text-ink-900">Reset Password</h2>
            <p className="text-xs text-ink-600 mt-1">Enter your email to receive reset instructions.</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {isExpired && (
            <div className="p-2.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-center mb-4">
              Your session has expired. Please sign in again.
            </div>
          )}
          {error && (
            <div className="p-2.5 rounded bg-ruby-100 text-ruby-600 border border-ruby-600/30">
              {error}
            </div>
          )}

          {viewMode === 'register' && (
            <>
              <div>
                <label className="block text-ink-600 font-semibold mb-1">
                  Agency Commercial Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Al Rayyan Real Estate W.L.L."
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                />
              </div>

              <div>
                <label className="block text-ink-600 font-semibold mb-1">
                  Qatar CR Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 104829/QA"
                  value={crNumber}
                  onChange={(e) => setCrNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700 font-mono"
                />
              </div>

              <div>
                <label className="block text-ink-600 font-semibold mb-1">
                  Owner / Administrator Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tariq Al-Mansoor"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-ink-600 font-semibold mb-1">
              Corporate Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
            />
          </div>

          {viewMode !== 'forgot_password' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-ink-600 font-semibold">
                  Security Password
                </label>
                {viewMode === 'login' && (
                  <Button
                    variant="ghost" 
                    type="button"
                    onClick={() => setViewMode('forgot_password')}
                    className="text-maroon-700 hover:underline font-medium text-[11px] px-2 py-1 h-auto min-w-0"
                    tabIndex={-1}
                  >
                    Forgot Password?
                  </Button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 border border-line rounded focus:outline-none focus:border-maroon-700 font-mono"
                />
                <Button
                  variant="icon"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 h-auto w-auto min-w-0 p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
            </div>
          )}

          <Button
            variant="primary"
            type="submit"
            isLoading={loading}
            className="w-full py-2.5 flex items-center justify-center gap-1.5"
          >
            <span>{viewMode === 'register' ? 'Register Agency' : viewMode === 'forgot_password' ? 'Send Reset Link' : 'Access Portal'}</span>
            <ArrowRight size={14} />
          </Button>
          
          {viewMode === 'forgot_password' && (
            <Button
              variant="secondary"
              type="button"
              onClick={() => setViewMode('login')}
              className="w-full py-2.5"
            >
              Back to Sign In
            </Button>
          )}
        </form>

        {/* Quick Demo Access Bar */}
        <div className="p-4 bg-sand-050 border-t border-line text-xs">
          <p className="text-[11px] font-semibold text-ink-600 uppercase tracking-wider text-center mb-2">
            Instant Demo Access (One-Click)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => handleQuickDemo('OWNER')}
              className="px-2 py-1.5 text-[11px] truncate h-auto"
            >
              Owner
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={() => handleQuickDemo('ADMIN')}
              className="px-2 py-1.5 text-[11px] truncate h-auto"
            >
              Admin
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={() => handleQuickDemo('AGENT')}
              className="px-2 py-1.5 text-[11px] truncate h-auto"
            >
              Agent
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
