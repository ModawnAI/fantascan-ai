'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { EnvelopeSimple, ArrowRight, ArrowLeft, CheckCircle } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { GlowingButton } from '@/components/ui/moving-border';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);
    } catch {
      setError('비밀번호 재설정 요청 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
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
              <h2 className="text-xl font-semibold text-white">이메일을 확인하세요</h2>
              <p className="text-white/60">
                {email}로 비밀번호 재설정 링크를 보냈습니다.
                <br />
                이메일을 확인하고 링크를 클릭하세요.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 font-medium transition-colors"
            >
              <ArrowLeft size={16} weight="bold" />
              로그인으로 돌아가기
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

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
          <h2 className="text-2xl font-semibold text-white">비밀번호 재설정</h2>
          <p className="text-white/60">가입하신 이메일 주소를 입력해주세요</p>
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
                  재설정 링크 받기
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
