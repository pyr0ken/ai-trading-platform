'use client';

import React, { useState } from 'react';
import {
  Shield,
  Lock,
  User,
  UserPlus,
  LogIn,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';

export const TeamLoginPage: React.FC = () => {
  const { login, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    if (password.length < 4) {
      setErrorMsg('Password must be at least 4 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const res = await login(username, password);
        if (!res.success) {
          setErrorMsg(res.error || 'Invalid username or password.');
        }
      } else {
        const res = await signUp(username, password);
        if (!res.success) {
          setErrorMsg(res.error || 'Registration failed. Please try again.');
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#040406] text-[#e2e3e9] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-mono select-none">
      {/* Grid Pattern & Atmosphere Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#121317_1px,transparent_1px),linear-gradient(to_bottom,#121317_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_60%,transparent_100%)] opacity-60 pointer-events-none" />

      {/* Glow Orbs */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-[#cc9166]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#ae9357]/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Container Box */}
      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* System Status Ribbon */}
        <div className="flex items-center justify-between px-4 py-2 rounded-full bg-[#0b0c10]/80 border border-[#1c1d22] text-[10px] text-[#9194a1] backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-bold text-[#e2e3e9]">SUPABASE ENGINE ONLINE</span>
          </div>
          <div className="flex items-center gap-1 text-[#5e616e]">
            <Activity className="w-3 h-3 text-[#cc9166]" />
            <span>INSTITUTIONAL QUANT</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-[#0b0c10]/90 backdrop-blur-xl border border-[#1c1d22] hover:border-[#cc9166]/40 rounded-[24px] p-6 sm:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.8)] space-y-6 transition-all duration-300">
          {/* Brand Header */}
          <div className="text-center space-y-2.5 border-b border-[#1c1d22] pb-6">
            <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-gradient-to-b from-[#cc9166]/20 to-[#cc9166]/5 border border-[#cc9166]/30 text-[#cc9166] mb-1 shadow-[0_0_25px_rgba(204,145,102,0.2)]">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#ffffff] font-sans">
                STEEP QUANT <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#cc9166] via-[#e2b897] to-[#ae9357]">AI PLATFORM</span>
              </h1>
              <p className="text-xs text-[#9194a1] mt-1 font-mono">3-Trader Workspace • Realtime Supabase Sync</p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-[#121317] border border-[#1c1d22] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-[#1c1d22] text-[#cc9166] border border-[#cc9166]/40 shadow-[0_0_10px_rgba(204,145,102,0.15)] font-semibold'
                  : 'text-[#5e616e] hover:text-[#e2e3e9]'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? 'bg-[#1c1d22] text-[#cc9166] border border-[#cc9166]/40 shadow-[0_0_10px_rgba(204,145,102,0.15)] font-semibold'
                  : 'text-[#5e616e] hover:text-[#e2e3e9]'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register Account</span>
            </button>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/60 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in zoom-in-95 duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-mono">{errorMsg}</span>
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-[#9194a1] font-semibold flex items-center justify-between">
                <span>Username</span>
                <span className="text-[10px] text-[#5e616e]">e.g. trader, alex, reza</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5e616e]" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="username"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl font-mono text-xs focus:outline-none transition-all placeholder:text-[#3e414e] ${
                    errorMsg
                      ? 'bg-rose-950/20 border border-rose-500/60 focus:border-rose-400 text-rose-100'
                      : 'bg-[#121317] border border-[#1c1d22] focus:border-[#cc9166] focus:ring-1 focus:ring-[#cc9166] text-[#ffffff]'
                  }`}
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-[#9194a1] font-semibold block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5e616e]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-10 py-3 rounded-xl font-mono text-xs focus:outline-none transition-all placeholder:text-[#3e414e] ${
                    errorMsg
                      ? 'bg-rose-950/20 border border-rose-500/60 focus:border-rose-400 text-rose-100'
                      : 'bg-[#121317] border border-[#1c1d22] focus:border-[#cc9166] focus:ring-1 focus:ring-[#cc9166] text-[#ffffff]'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5e616e] hover:text-[#e2e3e9] transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#cc9166] via-[#d4a27a] to-[#ae9357] text-[#08080a] font-bold text-xs hover:brightness-110 active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-[0_0_25px_rgba(204,145,102,0.3)] flex items-center justify-center gap-2 disabled:opacity-50 mt-3"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#08080a] border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In to Workspace' : 'Create & Register Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security & Feature Badges */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1c1d22] text-[10px] text-[#9194a1] text-center">
            <div className="p-2 rounded-lg bg-[#121317] border border-[#1c1d22] flex flex-col items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#cc9166]" />
              <span>RLS Protected</span>
            </div>
            <div className="p-2 rounded-lg bg-[#121317] border border-[#1c1d22] flex flex-col items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Realtime Sync</span>
            </div>
            <div className="p-2 rounded-lg bg-[#121317] border border-[#1c1d22] flex flex-col items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>$10K Portfolio</span>
            </div>
          </div>
        </div>

        {/* Footer Notice */}
        <p className="text-center text-[11px] text-[#5e616e]">
          Steep Quant AI Trading Platform • Version 0.1.0
        </p>
      </div>
    </div>
  );
};
