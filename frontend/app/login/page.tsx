'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { setupUserEncryption } from '@/utils/crypto';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#313338] text-[#dbdee1]">
      <div className="w-full max-w-md rounded-lg bg-[#313338] p-8 shadow-2xl border border-[#232428]">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Welcome back!</h1>
          <p className="text-sm text-[#949ba4] mt-2">We're so excited to see you again!</p>
        </div>

        {error && (
          <div className="mb-4 rounded bg-[#f23f43]/10 border border-[#f23f43] p-3 text-sm text-[#f23f43]">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#949ba4] mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded bg-[#1e1f22] p-3 text-white border-none focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#949ba4] mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded bg-[#1e1f22] p-3 text-white border-none focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded bg-[#5865f2] py-3 text-white font-medium hover:bg-[#4752c4] transition-colors"
          >
            Log In
          </button>
        </form>

        <p className="mt-4 text-sm text-[#949ba4]">
          Need an account?{' '}
          <Link href="/register" className="text-[#00a8fc] hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}