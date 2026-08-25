'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { setupUserEncryption } from '@/utils/crypto';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Lock, Mail, KeyRound, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Login failed');

      setAuth(data.token, data.user);
      await setupUserEncryption(data.user.id, data.token);

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#313338] px-4">
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-md bg-[#2b2d31] p-8 rounded-2xl shadow-2xl border border-[#3f4147] text-[#dbdee1]"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#5865f2] text-white shadow-lg mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome Back</h1>
          <p className="text-sm text-[#949ba4] mt-1">Log in to your encrypted mesh workspace</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#949ba4] mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-[#949ba4]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full rounded-lg bg-[#1e1f22] pl-10 pr-4 py-3 text-white placeholder-[#6d6f78] text-sm focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#949ba4] mb-2">Password</label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-[#949ba4]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full rounded-lg bg-[#1e1f22] pl-10 pr-4 py-3 text-white placeholder-[#6d6f78] text-sm focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 rounded-lg bg-[#5865f2] py-3.5 text-white font-medium hover:bg-[#4752c4] transition-colors flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50"
          >
            <span>{isLoading ? 'Decrypting Session...' : 'Log In'}</span>
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </motion.button>
        </form>

        <p className="text-xs text-[#949ba4] text-center mt-6">
          Need an account?{' '}
          <Link href="/register" className="text-[#5865f2] hover:underline font-medium">
            Register
          </Link>
        </p>
      </motion.div>
    </div>
  );
}