'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/app/components/Input';
import { Button } from '@/app/components/Button';
import { apiClient } from '@/lib/api-client';
import { 
  Lock, User, Eye, EyeOff, ArrowRight, 
  ShieldCheck, PieChart, Ticket, Users, 
  TrendingUp, Globe, 
  CreditCard, Wallet, Building2,
  CheckCircle2
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.login(username, password);
      
      if (!response.token) {
        throw new Error('Invalid response from server');
      }

      apiClient.setToken(response.token);
      
      // Store user info securely
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('authToken', response.token);

      // Redirect based on role
      if (response.user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white overflow-hidden">
      {/* Left Side - Brand & Doodles */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-16 text-white">
        {/* Doodles Background - Professional Banking Theme */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden">
            {/* Floating Icons Pattern */}
            <ShieldCheck className="absolute top-[10%] left-[10%] w-32 h-32 -rotate-12" />
            <PieChart className="absolute top-[20%] right-[15%] w-24 h-24 rotate-12" />
            <Ticket className="absolute bottom-[30%] left-[20%] w-40 h-40 -rotate-6" />
            <Users className="absolute top-[40%] left-[5%] w-20 h-20 rotate-45" />
            <Wallet className="absolute bottom-[15%] right-[10%] w-32 h-32 -rotate-12" />
            <Building2 className="absolute top-[5%] right-[5%] w-28 h-28 rotate-6" />
            <CreditCard className="absolute bottom-[40%] right-[30%] w-24 h-24 rotate-12" />
            <TrendingUp className="absolute top-[50%] left-[40%] w-36 h-36 -rotate-6" />
            <Globe className="absolute bottom-[5%] left-[5%] w-28 h-28 rotate-12" />
            
            {/* Geometric Accents */}
            <div className="absolute top-1/4 left-0 w-full h-px bg-linear-to-r from-transparent via-white/20 to-transparent transform -rotate-45"></div>
            <div className="absolute bottom-1/3 right-0 w-full h-px bg-linear-to-r from-transparent via-white/20 to-transparent transform rotate-45"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        </div>
        
        {/* Brand Header */}
        <div className="relative z-10">
            <div className="flex items-center gap-3 text-2xl font-bold mb-2 tracking-tight">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/50">
                    <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <span>Secure<span className="text-blue-400">Support</span></span>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide uppercase ml-1">Banking Grade Ticketing</p>
        </div>

        {/* Hero Text */}
        <div className="relative z-10 max-w-lg">
            <h1 className="text-5xl font-bold leading-tight mb-6 tracking-tight">
                Secure, Reliable, <br/>
                <span className="text-blue-400">Professional.</span>
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed">
                Access the centralized banking support portal. Manage tickets, track requests, and ensure seamless operations with enterprise-grade security.
            </p>
            
            <div className="mt-8 flex gap-4">
                <div className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700/50">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span>End-to-End Encrypted</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700/50">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span>24/7 Availability</span>
                </div>
            </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50/50">
        <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
            {/* Mobile Logo (visible only on small screens) */}
            <div className="lg:hidden flex justify-center mb-8">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                    <ShieldCheck className="w-7 h-7 text-white" />
                </div>
            </div>

            <div className="text-center lg:text-left">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome Back</h2>
                <p className="text-slate-500 mt-2">Please enter your credentials to access your account.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 mt-8">
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-5">
                <div className="relative group">
                  <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">Username</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none">
                        <User className="w-5 h-5" />
                    </div>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                        required
                    />
                  </div>
                </div>

                <div className="relative group">
                  <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">Password</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none">
                        <Lock className="w-5 h-5" />
                    </div>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full rounded-full! py-4 text-lg font-semibold shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 hover:-translate-y-0.5 transition-all duration-200"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign In <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </Button>
            </form>
        </div>
      </div>
    </div>
  );
}
