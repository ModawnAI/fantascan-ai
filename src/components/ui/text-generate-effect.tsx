'use client';

import { useEffect, useState } from 'react';
import { motion, stagger, useAnimate } from 'motion/react';

interface TextGenerateEffectProps {
  words: string;
  className?: string;
  filter?: boolean;
  duration?: number;
}

export function TextGenerateEffect({
  words,
  className = '',
  filter = true,
  duration = 0.5,
}: TextGenerateEffectProps) {
  const [scope, animate] = useAnimate();
  const [isVisible, setIsVisible] = useState(false);
  const wordsArray = words.split(' ');

  useEffect(() => {
    setIsVisible(true);
    animate(
      'span',
      {
        opacity: 1,
        filter: filter ? 'blur(0px)' : 'none',
      },
      {
        duration: duration,
        delay: stagger(0.1),
      }
    );
  }, [animate, duration, filter]);

  return (
    <motion.p ref={scope} className={className}>
      {wordsArray.map((word, idx) => (
        <motion.span
          key={word + idx}
          className="inline-block opacity-0"
          style={{
            filter: filter ? 'blur(10px)' : 'none',
          }}
        >
          {word}&nbsp;
        </motion.span>
      ))}
    </motion.p>
  );
}
