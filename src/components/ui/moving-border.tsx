'use client';

import { useState } from 'react';
import { motion } from 'motion/react';

interface MovingBorderButtonProps {
  children: React.ReactNode;
  duration?: number;
  className?: string;
  containerClassName?: string;
  borderRadius?: string;
  onClick?: () => void;
}

export function MovingBorderButton({
  children,
  duration = 2000,
  className = '',
  containerClassName = '',
  borderRadius = '1.5rem',
  onClick,
}: MovingBorderButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      className={`relative p-[2px] overflow-hidden ${containerClassName}`}
      style={{ borderRadius }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-primary-500 to-primary-600"
        style={{ borderRadius }}
        animate={{
          rotate: isHovered ? 360 : 0,
        }}
        transition={{
          duration: duration / 1000,
          repeat: isHovered ? Infinity : 0,
          ease: 'linear',
        }}
      />
      <motion.div
        className="absolute inset-0 opacity-0"
        style={{
          borderRadius,
          background: `conic-gradient(from 0deg, transparent, #FF8C42, transparent)`,
        }}
        animate={{
          opacity: isHovered ? 1 : 0,
          rotate: isHovered ? 360 : 0,
        }}
        transition={{
          duration: duration / 1000,
          repeat: isHovered ? Infinity : 0,
          ease: 'linear',
        }}
      />
      <div
        className={`relative bg-white ${className}`}
        style={{ borderRadius: `calc(${borderRadius} - 2px)` }}
      >
        {children}
      </div>
    </button>
  );
}

interface GlowingButtonProps {
  children: React.ReactNode;
  className?: string;
}

export function GlowingButton({ children, className = '' }: GlowingButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 opacity-75 blur-lg"
        animate={{
          opacity: isHovered ? 1 : 0.5,
          scale: isHovered ? 1.05 : 1,
        }}
        transition={{ duration: 0.3 }}
      />
      <div className="relative">{children}</div>
    </motion.div>
  );
}
