'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield, Zap, Lock } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#313338] text-[#dbdee1] p-6 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center max-w-2xl space-y-6"
      >
        <motion.div 
          whileHover={{ scale: 1.05, rotate: 2 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-[#5865f2] text-white font-bold text-3xl shadow-2xl mb-2"
        >
          MC
        </motion.div>

        <h1 className="text-5xl font-extrabold text-white tracking-tight">
          MeshChat
        </h1>
        
        <p className="text-[#949ba4] text-lg max-w-lg mx-auto">
          A zero-trust, end-to-end encrypted real-time community chat platform built for secure communications.
        </p>

        {/* Feature Highlights Pills */}
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <div className="flex items-center space-x-1.5 bg-[#2b2d31] border border-[#3f4147] px-3 py-1.5 rounded-full text-xs text-[#dbdee1]">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero-Knowledge Relay</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-[#2b2d31] border border-[#3f4147] px-3 py-1.5 rounded-full text-xs text-[#dbdee1]">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Real-Time WebSockets</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-[#2b2d31] border border-[#3f4147] px-3 py-1.5 rounded-full text-xs text-[#dbdee1]">
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Web Crypto E2EE</span>
          </div>
        </div>

        <div className="flex justify-center space-x-4 pt-6">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/login"
              className="rounded-lg bg-[#5865f2] px-8 py-3.5 text-white font-medium hover:bg-[#4752c4] transition-colors shadow-lg inline-block"
            >
              Log In
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/register"
              className="rounded-lg bg-[#2b2d31] border border-[#3f4147] px-8 py-3.5 text-white font-medium hover:bg-[#35373c] transition-colors inline-block"
            >
              Register
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}