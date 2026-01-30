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
  ChartLineUp,
  MagnifyingGlass,
  Robot,
  CheckCircle,
  Star,
  Quotes,
  Question,
  CaretDown,
  Warning,
  Lightbulb,
  Ranking,
  Browsers,
  ChatCircleDots,
} from '@phosphor-icons/react';
import { GoogleGeminiEffect } from '@/components/ui/google-gemini-effect';
import { HoverEffect } from '@/components/ui/card-hover-effect';
import { AnimatedGradientText, GlowingBadge } from '@/components/ui/animated-gradient';
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid';
import { ProviderLogos } from '@/components/ui/provider-logos';
import { GlowingButton } from '@/components/ui/moving-border';

// Problem/Solution Data
const problems = [
  {
    icon: <Warning size={32} weight="duotone" className="text-red-500" />,
    title: '기존 SEO만으로는 부족합니다',
    description: '검색 시장의 40%가 AI로 이동 중. 전통적인 SEO만으로는 더 이상 충분하지 않습니다.',
  },
  {
    icon: <MagnifyingGlass size={32} weight="duotone" className="text-red-500" />,
    title: 'AI가 추천하지 않으면 존재하지 않는 것',
    description: 'ChatGPT, Gemini, Perplexity에서 브랜드가 언급되지 않으면 잠재 고객을 잃고 있습니다.',
  },
  {
    icon: <Browsers size={32} weight="duotone" className="text-red-500" />,
    title: '경쟁사는 이미 시작했습니다',
    description: '선도 기업들은 이미 AEO/GEO 전략을 수립하고 AI 검색 시장을 선점하고 있습니다.',
  },
];

const solutions = [
  {
    icon: <Robot size={32} weight="duotone" className="text-primary-500" />,
    title: '6개 AI 플랫폼 실시간 모니터링',
    description: 'ChatGPT, Gemini, Claude, Perplexity, Grok, Google에서 브랜드 언급을 추적합니다.',
  },
  {
    icon: <ChartLineUp size={32} weight="duotone" className="text-primary-500" />,
    title: '가시성 점수 & 트렌드 분석',
    description: '경쟁사 대비 AI 가시성을 수치화하고 시간에 따른 변화를 추적합니다.',
  },
  {
    icon: <Lightbulb size={32} weight="duotone" className="text-primary-500" />,
    title: '실행 가능한 인사이트',
    description: 'AI가 생성한 맞춤형 콘텐츠 전략과 개선 권고사항을 제공합니다.',
  },
];

// Feature items
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

// How it works steps
const howItWorks = [
  {
    step: 1,
    title: '브랜드 등록',
    description: '브랜드명, 업계, 키워드, 경쟁사 정보를 입력하세요.',
    icon: <Target size={28} weight="duotone" />,
  },
  {
    step: 2,
    title: 'AI 스캔 실행',
    description: '6개 AI 플랫폼에 업계별 맞춤 쿼리를 자동으로 전송합니다.',
    icon: <MagnifyingGlass size={28} weight="duotone" />,
  },
  {
    step: 3,
    title: '결과 분석',
    description: '가시성 점수, 경쟁사 비교, 감성 분석 결과를 확인하세요.',
    icon: <ChartLineUp size={28} weight="duotone" />,
  },
  {
    step: 4,
    title: '전략 수립',
    description: 'AI 인사이트를 바탕으로 콘텐츠 전략을 최적화하세요.',
    icon: <Lightbulb size={28} weight="duotone" />,
  },
];

// Stats
const stats = [
  { value: '6개', label: 'AI 플랫폼 지원' },
  { value: '80+', label: '업계별 쿼리 템플릿' },
  { value: '실시간', label: '모니터링 알림' },
  { value: '2분', label: '평균 분석 시간' },
];

// Testimonials
const testimonials = [
  {
    quote: '판타스캔 덕분에 AI 검색에서 경쟁사보다 먼저 언급되기 시작했습니다. 마케팅 ROI가 크게 개선됐어요.',
    author: '김민수',
    role: '스타트업 CMO',
    avatar: '🧑‍💼',
  },
  {
    quote: 'AEO/GEO가 뭔지도 몰랐는데, 판타스캔이 쉽게 설명해주고 바로 적용할 수 있는 인사이트를 줍니다.',
    author: '이지영',
    role: '이커머스 마케터',
    avatar: '👩‍💻',
  },
  {
    quote: '경쟁사 분석 기능이 정말 유용해요. AI가 어떤 브랜드를 더 많이 추천하는지 한눈에 파악됩니다.',
    author: '박준혁',
    role: 'SaaS 마케팅 팀장',
    avatar: '👨‍💼',
  },
];

// FAQ
const faqs = [
  {
    question: 'AEO와 GEO가 무엇인가요?',
    answer: 'AEO(AI Engine Optimization)는 ChatGPT, Gemini 등 AI 챗봇에서 브랜드가 추천되도록 최적화하는 전략입니다. GEO(Generative Engine Optimization)는 AI가 생성하는 답변에 브랜드가 포함되도록 콘텐츠를 최적화하는 것입니다.',
  },
  {
    question: '어떤 AI 플랫폼을 지원하나요?',
    answer: 'ChatGPT(OpenAI), Gemini(Google), Claude(Anthropic), Perplexity, Grok(X), 그리고 Google 검색까지 6개 주요 플랫폼을 지원합니다.',
  },
  {
    question: '분석에 얼마나 걸리나요?',
    answer: '브랜드 등록 후 첫 스캔은 평균 2분 이내에 완료됩니다. 모든 AI 플랫폼에 동시에 쿼리를 보내고 결과를 취합합니다.',
  },
  {
    question: '무료 체험은 어떻게 하나요?',
    answer: '회원가입 후 100 크레딧이 무료로 제공됩니다. 1회 스캔에 약 10-15 크레딧이 소요되므로 6-10회 무료 분석이 가능합니다.',
  },
  {
    question: '경쟁사 분석도 가능한가요?',
    answer: '네, 최대 5개의 경쟁사를 등록하고 AI 가시성을 비교 분석할 수 있습니다. Share of Voice(점유율) 차트로 시각화됩니다.',
  },
];

// FAQ Item component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 flex items-center justify-between text-left hover:text-primary-600 transition-colors"
      >
        <span className="font-medium text-gray-900 pr-4">{question}</span>
        <CaretDown
          size={20}
          weight="bold"
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <motion.div
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <p className="pb-5 text-gray-600 leading-relaxed">{answer}</p>
      </motion.div>
    </div>
  );
}

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

      {/* Problem Section */}
      <section className="py-20 lg:py-28 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-2 bg-red-500/10 text-red-400 rounded-full text-sm font-medium mb-4">
              🚨 새로운 시대, 새로운 과제
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
              AI가 검색을 바꾸고 있습니다
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              더 이상 Google만 생각하면 안 됩니다. 소비자들은 이미 ChatGPT와 Gemini에게 추천을 받고 있습니다.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {problems.map((problem, index) => (
              <motion.div
                key={problem.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 lg:p-8"
              >
                <div className="mb-4">{problem.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{problem.title}</h3>
                <p className="text-gray-400">{problem.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-2 bg-primary-50 text-primary-600 rounded-full text-sm font-medium mb-4">
              ✨ 판타스캔이 해결합니다
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              AI 시대의 <span className="text-primary-500">브랜드 가시성</span>을 확보하세요
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              6개 AI 플랫폼에서 브랜드가 어떻게 언급되는지 실시간으로 추적하고 전략을 수립하세요.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {solutions.map((solution, index) => (
              <motion.div
                key={solution.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gradient-to-b from-primary-50 to-white border border-primary-100 rounded-2xl p-6 lg:p-8 hover:shadow-lg hover:shadow-primary-100/50 transition-shadow"
              >
                <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
                  {solution.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{solution.title}</h3>
                <p className="text-gray-600">{solution.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-primary-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl lg:text-5xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-primary-100">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 lg:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              <span className="text-primary-500">4단계</span>로 시작하세요
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              복잡한 설정 없이 2분 만에 AI 가시성 분석을 시작할 수 있습니다
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6 lg:gap-4">
            {howItWorks.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="relative"
              >
                {/* Connector line */}
                {index < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary-300 to-primary-100" />
                )}
                <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm hover:shadow-md transition-shadow relative z-10">
                  <div className="w-10 h-10 bg-primary-500 text-white rounded-full flex items-center justify-center font-bold text-lg mb-4">
                    {step.step}
                  </div>
                  <div className="text-primary-500 mb-3">{step.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600 text-sm">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-28 bg-white">
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
      <section className="py-20 lg:py-28 bg-gray-50">
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

      {/* Testimonials Section */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              고객들의 이야기
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              판타스캔을 통해 AI 시대의 브랜드 전략을 수립한 고객들의 후기입니다
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gray-50 rounded-2xl p-6 lg:p-8 relative"
              >
                <Quotes size={40} weight="fill" className="text-primary-200 absolute top-6 right-6" />
                <p className="text-gray-700 mb-6 relative z-10 leading-relaxed">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-2xl">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.author}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 lg:py-28 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              자주 묻는 질문
            </h2>
            <p className="text-lg text-gray-500">
              AEO/GEO와 판타스캔에 대해 궁금한 점을 확인하세요
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm"
          >
            {faqs.map((faq) => (
              <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28 bg-gradient-to-br from-primary-500 to-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
              AI 시대의 브랜드 전략,<br />지금 시작하세요
            </h2>
            <p className="text-lg text-white/80 mb-4">
              무료 100 크레딧으로 6-10회 스캔을 체험하세요
            </p>
            <p className="text-sm text-white/60 mb-10">
              신용카드 없이 • 즉시 시작 • 언제든 취소 가능
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-10 py-4 text-lg font-semibold text-primary-600 bg-white hover:bg-gray-100 rounded-full transition-colors shadow-xl hover:shadow-2xl"
              >
                무료로 시작하기
                <ArrowRight size={20} weight="bold" />
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white/90 border-2 border-white/30 hover:border-white/50 hover:bg-white/10 rounded-full transition-all"
              >
                더 알아보기
              </Link>
            </div>
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
