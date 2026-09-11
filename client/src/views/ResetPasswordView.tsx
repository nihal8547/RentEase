import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import api from '../lib/api';
import { Button } from '../components/ui/button';

export const ResetPasswordView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: password,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sand-050 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white border border-line rounded shadow-lg overflow-hidden animate-fade-in">
        <div className="bg-maroon-900 p-6 text-white text-center border-b border-gold-500/40">
          <div className="w-12 h-12 rounded bg-maroon-700 border border-gold-500 mx-auto flex items-center justify-center mb-3 shadow-inner">
            <span className="font-serif font-bold text-gold-300 text-2xl">R</span>
          </div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">RentEase</h1>
          <p className="text-xs text-white/70 mt-1">Set Your New Password</p>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-ink-900 mb-2">Password Reset Complete</h2>
              <p className="text-sm text-ink-600">You can now sign in with your new password. Redirecting to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {error && (
                <div className="p-2.5 rounded bg-ruby-100 text-ruby-600 border border-ruby-600/30">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-ink-600 font-semibold mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
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

              <div>
                <label className="block text-ink-600 font-semibold mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 border border-line rounded focus:outline-none focus:border-maroon-700 font-mono"
                  />
                </div>
              </div>

              <Button
                variant="primary"
                type="submit"
                disabled={!password || !confirmPassword}
                isLoading={loading}
                className="w-full mt-2 py-2.5 flex items-center justify-center gap-1.5"
              >
                <span>Reset Password</span>
                <ArrowRight size={14} />
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordView;
