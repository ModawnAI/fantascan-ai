'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';

interface HoverCardItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  link?: string;
}

interface HoverEffectProps {
  items: HoverCardItem[];
  className?: string;
}

export function HoverEffect({ items, className = '' }: HoverEffectProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {items.map((item, idx) => {
        const Wrapper = item.link ? Link : 'div';
        return (
          <Wrapper
            key={idx}
            href={item.link || '#'}
            className="relative group block p-2 h-full w-full"
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <AnimatePresence>
              {hoveredIndex === idx && (
                <motion.span
                  className="absolute inset-0 h-full w-full bg-primary-500/10 block rounded-2xl"
                  layoutId="hoverBackground"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 1,
                    transition: { duration: 0.15 },
                  }}
                  exit={{
                    opacity: 0,
                    transition: { duration: 0.15, delay: 0.2 },
                  }}
                />
              )}
            </AnimatePresence>
            <Card>
              <div className="flex items-start gap-4">
                <CardIcon>{item.icon}</CardIcon>
                <div className="flex-1 min-w-0">
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </div>
              </div>
            </Card>
          </Wrapper>
        );
      })}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl h-full w-full p-6 overflow-hidden bg-white border border-gray-200 group-hover:border-primary-300 relative z-20 transition-colors duration-300 shadow-sm hover:shadow-md">
      {children}
    </div>
  );
}

function CardIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 shrink-0">
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-gray-900 font-semibold tracking-tight text-lg mb-1">
      {children}
    </h4>
  );
}

function CardDescription({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-gray-500 text-sm leading-relaxed">
      {children}
    </p>
  );
}
