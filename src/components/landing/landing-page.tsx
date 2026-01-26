'use client';

import React from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import Link from 'next/link';
import {
  Eye,
  Brain,
  Target,
  TrendUp,
  Users,
  Lightning,
  Shield,
  Clock,
  ArrowRight,
  Sparkle,
} from '@phosphor-icons/react';
import { GoogleGeminiEffect } from '@/components/ui/google-gemini-effect';
import { HoverEffect } from '@/components/ui/card-hover-effect';
import { AnimatedGradientText, GlowingBadge } from '@/components/ui/animated-gradient';
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid';
import { ProviderLogos } from '@/components/ui/provider-logos';
import { GlowingButton } from '@/components/ui/moving-border';

const features = [
  {
    title: 'AI 가시성 분석',
    description: '6개 주요 AI 플랫폼에서 브랜드 언급을 실시간으로 추적하고 분석합니다.',
    icon: <Eye size={24} weight="duotone" />,
  },
  {
    title: '경쟁사 비교',
    description: '경쟁 브랜드와의 AI 가시성을 비교하고 시장 내 포지션을 파악하세요.',
    icon: <Users size={24} weight="duotone" />,
  },
  {
    title: '트렌드 추적',
    description: '시간에 따른 브랜드 가시성 변화와 성장 추이를 모니터링합니다.',
    icon: <TrendUp size={24} weight="duotone" />,
  },
  {
    title: '감성 분석',
    description: 'AI가 당신의 브랜드를 긍정적, 부정적, 중립적으로 언급하는지 분석합니다.',
    icon: <Brain size={24} weight="duotone" />,
  },
  {
    title: '업계별 맞춤 쿼리',
    description: '80개 이상의 업계별 맞춤 검색 쿼리 템플릿을 제공합니다.',
    icon: <Target size={24} weight="duotone" />,
  },
  {
    title: '전략적 인사이트',
    description: 'AI가 생성한 실행 가능한 인사이트로 브랜드 전략을 최적화하세요.',
    icon: <Sparkle size={24} weight="duotone" />,
  },
];

const benefitItems = [
  {
    title: '빠른 분석',
    description: '몇 분 안에 6개 AI 플랫폼에서 브랜드 가시성을 분석합니다.',
    icon: <Lightning size={24} weight="duotone" />,
    index: 0,
  },
  {
    title: '정확한 데이터',
    description: '실제 AI 응답을 기반으로 한 신뢰할 수 있는 데이터를 제공합니다.',
    icon: <Shield size={24} weight="duotone" />,
    index: 1,
  },
  {
    title: '실시간 모니터링',
    description: '브랜드 가시성 변화를 실시간으로 추적하고 알림을 받으세요.',
    icon: <Clock size={24} weight="duotone" />,
    index: 2,
  },
];

export function LandingPage() {
  const ref = React.useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const pathLengthFirst = useTransform(scrollYProgress, [0, 0.8], [0.2, 1.2]);
  const pathLengthSecond = useTransform(scrollYProgress, [0, 0.8], [0.15, 1.2]);
  const pathLengthThird = useTransform(scrollYProgress, [0, 0.8], [0.1, 1.2]);
  const pathLengthFourth = useTransform(scrollYProgress, [0, 0.8], [0.05, 1.2]);
  const pathLengthFifth = useTransform(scrollYProgress, [0, 0.8], [0, 1.2]);

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section with Scroll Animation */}
      <div
        ref={ref}
        className="h-[200vh] bg-black w-full relative overflow-clip"
      >
        <div className="sticky top-0 h-screen">
          <GoogleGeminiEffect
            pathLengths={[
              pathLengthFirst,
              pathLengthSecond,
              pathLengthThird,
              pathLengthFourth,
              pathLengthFifth,
            ]}
            badge="AEO/GEO 최적화 솔루션"
            title="판타스캔 AI"
            description="AI 시대의 브랜드 가시성 모니터링"
          />

          {/* CTA Section - Positioned at bottom of hero */}
          <div className="absolute bottom-[15vh] sm:bottom-[12vh] md:bottom-20 left-0 right-0 z-20 flex flex-col items-center justify-center gap-4 sm:gap-6 px-4">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1 }}
              className="text-sm sm:text-base text-neutral-400 text-center max-w-lg"
            >
              ChatGPT, Gemini, Claude, Perplexity 등 주요 AI 플랫폼에서
              <br className="hidden sm:block" />
              당신의 브랜드가 어떻게 언급되는지 추적하세요
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <GlowingButton>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base sm:text-lg font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-full transition-colors"
                >
                  무료로 시작하기
                  <ArrowRight size={20} weight="bold" />
                </Link>
              </GlowingButton>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-8 py-4 text-base sm:text-lg font-medium text-white/80 bg-white/10 border border-white/20 hover:border-white/40 hover:bg-white/20 rounded-full transition-all duration-300"
              >
                로그인
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section className="py-20 lg:py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              <span className="text-primary-500">AEO/GEO</span> 최적화를 위한 모든 것
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              AI 검색 엔진 최적화(AEO)와 생성형 엔진 최적화(GEO)를 위한 종합적인 분석 도구
            </p>
          </motion.div>

          <HoverEffect items={features} className="max-w-6xl mx-auto" />
        </div>
      </section>

      {/* Provider Section */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              6개 주요 AI 플랫폼 지원
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              가장 많이 사용되는 AI 플랫폼에서 브랜드 가시성을 통합 분석합니다
            </p>
          </motion.div>

          <ProviderLogos className="max-w-4xl mx-auto" />
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 lg:py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              왜 <AnimatedGradientText>판타스캔 AI</AnimatedGradientText>인가요?
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              빠르고, 정확하고, 실시간으로 브랜드 가시성을 모니터링하세요
            </p>
          </motion.div>

          <BentoGrid className="max-w-5xl mx-auto">
            {benefitItems.map((item) => (
              <BentoGridItem
                key={item.title}
                title={item.title}
                description={item.description}
                icon={item.icon}
                index={item.index}
              />
            ))}
          </BentoGrid>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 bg-gradient-to-br from-primary-500 to-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
              지금 바로 시작하세요
            </h2>
            <p className="text-lg text-white/80 mb-10">
              무료 체험으로 AI 시대의 브랜드 가시성을 확인해보세요
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 text-lg font-semibold text-primary-600 bg-white hover:bg-gray-100 rounded-full transition-colors shadow-xl hover:shadow-2xl"
            >
              무료로 시작하기
              <ArrowRight size={20} weight="bold" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8">
            {/* Top Row */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-2xl font-bold">
                <span className="text-primary-500">판타스캔</span>
                <span className="text-white"> AI</span>
              </div>
              <div className="flex gap-8">
                <Link href="/terms" className="text-gray-400 hover:text-white transition-colors text-sm">
                  이용약관
                </Link>
                <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors text-sm">
                  개인정보처리방침
                </Link>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-800" />

            {/* Bottom Row - Company Info */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
              <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
                <span className="font-medium text-gray-400">(주)플로우오에스</span>
                <span className="hidden md:inline text-gray-700">|</span>
                <span>대표 안희창</span>
              </div>
              <p className="text-center md:text-right">
                서울특별시 서초구 강남대로 53길 8, 6층 6-162호
              </p>
            </div>

            {/* Copyright */}
            <p className="text-gray-500 text-xs text-center">
              © 2026 FlowOS Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
