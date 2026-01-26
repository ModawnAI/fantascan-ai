'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import { EnvelopeSimple, Lock, ArrowRight, Eye, EyeSlash } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { GlowingButton } from '@/components/ui/moving-border';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('이메일 또는 비밀번호가 올바르지 않습니다');
        } else {
          setError(error.message);
        }
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('로그인 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Logo & Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-center space-y-4"
      >
        <Link href="/" className="inline-block">
          <h1 className="text-4xl font-bold">
            <span className="text-primary-500">판타스캔</span>
            <span className="text-white"> AI</span>
          </h1>
        </Link>
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-white">로그인</h2>
          <p className="text-white/60">계정에 로그인하여 브랜드 가시성을 분석하세요</p>
        </div>
      </motion.div>

      {/* Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative"
      >
        {/* Glass card background */}
        <div className="absolute inset-0 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10" />

        <form onSubmit={handleSubmit} className="relative p-8 space-y-6">
          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl"
            >
              {error}
            </motion.div>
          )}

          {/* Email Input */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-white/80">
              이메일
            </label>
            <div className="relative">
              <EnvelopeSimple
                size={20}
                weight="duotone"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
              />
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-white/80">
              비밀번호
            </label>
            <div className="relative">
              <Lock
                size={20}
                weight="duotone"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
              />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full pl-12 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
              >
                {showPassword ? (
                  <EyeSlash size={20} weight="duotone" />
                ) : (
                  <Eye size={20} weight="duotone" />
                )}
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
            >
              비밀번호를 잊으셨나요?
            </Link>
          </div>

          {/* Submit Button */}
          <GlowingButton className="w-full">
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 text-base font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:bg-primary-500/50 rounded-full transition-colors"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  로그인
                  <ArrowRight size={20} weight="bold" />
                </>
              )}
            </button>
          </GlowingButton>
        </form>
      </motion.div>

      {/* Sign Up Link */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="text-center text-white/60"
      >
        계정이 없으신가요?{' '}
        <Link
          href="/signup"
          className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
        >
          회원가입
        </Link>
      </motion.p>
    </div>
  );
}
