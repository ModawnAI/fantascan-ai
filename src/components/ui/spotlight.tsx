'use client';

import { useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface SpotlightProps {
  className?: string;
  fill?: string;
}

export function Spotlight({ className = '', fill = 'white' }: SpotlightProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!divRef.current) return;
      const rect = divRef.current.getBoundingClientRect();
      setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleMouseEnter = () => setOpacity(1);
    const handleMouseLeave = () => setOpacity(0);

    const div = divRef.current;
    if (div) {
      div.addEventListener('mousemove', handleMouseMove);
      div.addEventListener('mouseenter', handleMouseEnter);
      div.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (div) {
        div.removeEventListener('mousemove', handleMouseMove);
        div.removeEventListener('mouseenter', handleMouseEnter);
        div.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  return (
    <div ref={divRef} className={`absolute inset-0 overflow-hidden ${className}`}>
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${fill}15, transparent 40%)`,
        }}
      />
    </div>
  );
}

export function SpotlightBackground({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-white ${className}`}>
      <Spotlight fill="#FF8C42" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-transparent" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
