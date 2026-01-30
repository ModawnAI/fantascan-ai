'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Export, FileText, FileCsv, FileHtml, CircleNotch } from '@phosphor-icons/react';

interface ExportButtonProps {
  brandId: string;
}

export function ExportButton({ brandId }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = async (format: 'html' | 'text' | 'csv') => {
    setIsExporting(format);
    
    try {
      const response = await fetch(`/api/reports?brandId=${brandId}&format=${format}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || `report.${format}`;
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setIsOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      alert('내보내기에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setIsExporting(null);
    }
  };

  const exportOptions = [
    { format: 'html' as const, label: 'HTML 보고서', icon: FileHtml, description: '웹 브라우저에서 볼 수 있는 보고서' },
    { format: 'text' as const, label: '텍스트 보고서', icon: FileText, description: '간단한 텍스트 형식 보고서' },
    { format: 'csv' as const, label: 'CSV 데이터', icon: FileCsv, description: '엑셀에서 열 수 있는 데이터' },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white/70 hover:text-white transition-colors"
      >
        <Export size={16} weight="duotone" />
        <span>내보내기</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-64 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
          >
            <div className="p-2">
              {exportOptions.map((option) => {
                const Icon = option.icon;
                const isLoading = isExporting === option.format;
                
                return (
                  <button
                    key={option.format}
                    onClick={() => handleExport(option.format)}
                    disabled={!!isExporting}
                    className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="p-2 bg-white/5 rounded-lg">
                      {isLoading ? (
                        <CircleNotch size={20} className="text-orange-400 animate-spin" />
                      ) : (
                        <Icon size={20} className="text-orange-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{option.label}</p>
                      <p className="text-xs text-white/50">{option.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
