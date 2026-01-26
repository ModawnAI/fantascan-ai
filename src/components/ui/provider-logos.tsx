'use client';

import { motion } from 'motion/react';

interface ProviderLogoProps {
  className?: string;
}

const providers = [
  { name: 'ChatGPT', color: '#10A37F', initial: 'G' },
  { name: 'Gemini', color: '#4285F4', initial: 'G' },
  { name: 'Claude', color: '#D97706', initial: 'C' },
  { name: 'Grok', color: '#000000', initial: 'X' },
  { name: 'Perplexity', color: '#20B8CD', initial: 'P' },
  { name: 'Google', color: '#EA4335', initial: 'G' },
];

export function ProviderLogos({ className = '' }: ProviderLogoProps) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-8 ${className}`}>
      {providers.map((provider, index) => (
        <motion.div
          key={provider.name}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className="flex flex-col items-center gap-3 group"
        >
          <motion.div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg transition-transform group-hover:scale-110"
            style={{ backgroundColor: provider.color }}
            whileHover={{ y: -4 }}
          >
            {provider.initial}
          </motion.div>
          <span className="text-sm text-gray-500 font-medium">{provider.name}</span>
        </motion.div>
      ))}
    </div>
  );
}

export function ProviderLogosInline({ className = '' }: ProviderLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {providers.map((provider, index) => (
        <motion.div
          key={provider.name}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-md hover:scale-110 transition-transform"
          style={{ backgroundColor: provider.color }}
          title={provider.name}
        >
          {provider.initial}
        </motion.div>
      ))}
    </div>
  );
}
