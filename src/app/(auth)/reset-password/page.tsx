'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  Lock,
  ArrowRight,
  Eye,
  EyeSlash,
  CheckCircle,
  Warning,
} from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { GlowingButton } from '@/components/ui/moving-border';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsValidSession(!!session);
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch {
      setError('비밀번호 변경 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <div className="flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Invalid session state
  if (!isValidSession) {
    return (
      <div className="space-y-8">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center"
        >
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-bold">
              <span className="text-primary-500">판타스캔</span>
              <span className="text-white"> AI</span>
            </h1>
          </Link>
        </motion.div>

        {/* Expired Session Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10" />
          <div className="relative p-8 text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3, type: 'spring' }}
              className="mx-auto w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center"
            >
              <Warning size={40} weight="fill" className="text-yellow-400" />
            </motion.div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">세션이 만료되었습니다</h2>
              <p className="text-white/60">
                비밀번호 재설정 링크가 만료되었습니다.
                <br />
                다시 요청해주세요.
              </p>
            </div>
            <GlowingButton className="w-full">
              <button
                onClick={() => router.push('/forgot-password')}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 text-base font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-full transition-colors"
              >
                다시 요청하기
                <ArrowRight size={20} weight="bold" />
              </button>
            </GlowingButton>
          </div>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="space-y-8">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center"
        >
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-bold">
              <span className="text-primary-500">판타스캔</span>
              <span className="text-white"> AI</span>
            </h1>
          </Link>
        </motion.div>

        {/* Success Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10" />
          <div className="relative p-8 text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3, type: 'spring' }}
              className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center"
            >
              <CheckCircle size={40} weight="fill" className="text-green-400" />
            </motion.div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">비밀번호가 변경되었습니다!</h2>
              <p className="text-white/60">잠시 후 로그인 페이지로 이동합니다...</p>
            </div>
            <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto" />
          </div>
        </motion.div>
      </div>
    );
  }

  // Main form
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
          <h2 className="text-2xl font-semibold text-white">새 비밀번호 설정</h2>
          <p className="text-white/60">새로운 비밀번호를 입력해주세요</p>
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

        <form onSubmit={handleSubmit} className="relative p-8 space-y-5">
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

          {/* New Password Input */}
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-white/80">
              새 비밀번호
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
                placeholder="6자 이상"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
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

          {/* Confirm Password Input */}
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/80">
              비밀번호 확인
            </label>
            <div className="relative">
              <Lock
                size={20}
                weight="duotone"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
              />
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="비밀번호를 다시 입력하세요"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300"
              />
            </div>
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
                  비밀번호 변경
                  <ArrowRight size={20} weight="bold" />
                </>
              )}
            </button>
          </GlowingButton>
        </form>
      </motion.div>

      {/* Login Link */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="text-center text-white/60"
      >
        비밀번호가 기억나셨나요?{' '}
        <Link
          href="/login"
          className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
        >
          로그인
        </Link>
      </motion.p>
    </div>
  );
}
