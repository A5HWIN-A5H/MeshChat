'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#313338] text-[#dbdee1] p-6">
      <div className="text-center max-w-xl space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#5865f2] text-white font-bold text-2xl shadow-lg mb-2">
          MC
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">
          Welcome to MeshChat
        </h1>
        <p className="text-[#949ba4] text-base">
          A secure, real-time, encrypted communication platform built for communities.
        </p>
        <div className="flex justify-center space-x-4 pt-4">
          <Link
            href="/login"
            className="rounded bg-[#5865f2] px-6 py-3 text-white font-medium hover:bg-[#4752c4] transition-colors"
          >
            Log In
          </Link>
          <Link
            href="/register"
            className="rounded bg-[#2b2d31] border border-[#3f4147] px-6 py-3 text-white font-medium hover:bg-[#35373c] transition-colors"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}