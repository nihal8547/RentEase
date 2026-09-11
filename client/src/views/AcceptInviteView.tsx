import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Shield, ArrowRight, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/button';

export const AcceptInviteView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/users/accept-invite', {
        inviteToken: token,
        name,
        password,
      });
      return res.data;
    },
    onSuccess: (data) => {
      login(data.token, data.user, data.agency);
      navigate('/');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Invalid or expired invitation token.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setErrorMsg('No invitation token found in URL.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    acceptMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-sand-100 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-line overflow-hidden">
        {/* Header */}
        <div className="bg-maroon-900 p-8 text-white text-center border-b border-gold-500/30">
          <div className="w-12 h-12 rounded-xl bg-maroon-700 border border-gold-500 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <span className="font-serif font-bold text-gold-300 text-2xl">R</span>
          </div>
          <h2 className="font-serif text-2xl font-bold">Welcome to RentEase</h2>
          <p className="text-xs text-gold-300/80 mt-1">
            Accept Agency Invitation & Set Password
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-ruby-50 border border-ruby-200 text-ruby-700 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-ink-700 font-semibold mb-1">Your Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah Al-Attiyah"
              className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
            />
          </div>

          <div>
            <label className="block text-ink-700 font-semibold mb-1">Set Account Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
            />
          </div>

          <div>
            <label className="block text-ink-700 font-semibold mb-1">Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
            />
          </div>

          <div className="p-3 bg-sand-050 rounded-lg border border-line flex items-center gap-2 text-ink-600 text-[11px]">
            <Shield size={14} className="text-emerald-600 shrink-0" />
            <span>Encrypted with Qatar MOI compliant authentication protocols.</span>
          </div>

          <Button
            variant="primary"
            type="submit"
            isLoading={acceptMutation.isPending}
            className="w-full py-2.5 flex items-center justify-center gap-2 mt-2"
          >
            <span>{acceptMutation.isPending ? 'Activating...' : 'Activate & Enter Dashboard'}</span>
            <ArrowRight size={14} />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AcceptInviteView;
