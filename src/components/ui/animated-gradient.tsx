'use client';

import { motion } from 'motion/react';

interface AnimatedGradientTextProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedGradientText({ children, className = '' }: AnimatedGradientTextProps) {
  return (
    <motion.span
      className={`bg-gradient-to-r from-primary-500 via-primary-400 to-primary-600 bg-clip-text text-transparent inline-block ${className}`}
      style={{ backgroundSize: '200% auto' }}
      animate={{
        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
      }}
      transition={{
        duration: 5,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      {children}
    </motion.span>
  );
}

interface GlowingBadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function GlowingBadge({ children, className = '' }: GlowingBadgeProps) {
  return (
    <motion.div
      className={`relative inline-flex items-center justify-center ${className}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="absolute inset-0 rounded-full bg-primary-500/20"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 0.2, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <span className="relative px-4 py-1.5 rounded-full bg-primary-50 border border-primary-200 text-primary-600 text-sm font-medium">
        {children}
      </span>
    </motion.div>
  );
}
