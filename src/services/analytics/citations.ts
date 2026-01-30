/**
 * Citation Extraction Service
 * Extracts and analyzes citations from AI responses
 */

import type { Citation, ProviderType } from '@/types/database';

interface CitationExtractionInput {
  responseText: string;
  provider: ProviderType;
  scanId: string;
  scanResultId: string;
  brandId: string;
}

interface ExtractedCitation {
  source_url: string;
  source_domain: string | null;
  source_title: string | null;
  citation_context: string | null;
  position_in_response: number;
}

/**
 * Extract citations from an AI response
 */
export function extractCitations(input: CitationExtractionInput): Omit<Citation, 'id' | 'created_at'>[] {
  const { responseText, provider, scanId, scanResultId, brandId } = input;
  
  const extractedCitations: ExtractedCitation[] = [];
  
  // Different extraction strategies based on provider
  switch (provider) {
    case 'perplexity':
      extractedCitations.push(...extractPerplexityCitations(responseText));
      break;
    case 'google_search':
      extractedCitations.push(...extractGoogleCitations(responseText));
      break;
    default:
      // For LLMs, try to extract any URLs mentioned
      extractedCitations.push(...extractGeneralCitations(responseText));
  }
  
  // Convert to Citation format
  return extractedCitations.map(citation => ({
    scan_result_id: scanResultId,
    scan_id: scanId,
    brand_id: brandId,
    provider,
    ...citation,
  }));
}

/**
 * Extract citations from Perplexity responses
 * Perplexity typically includes numbered citations like [1], [2], etc.
 */
function extractPerplexityCitations(text: string): ExtractedCitation[] {
  const citations: ExtractedCitation[] = [];
  
  // Pattern 1: Markdown links [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let match;
  let position = 0;
  
  while ((match = markdownLinkRegex.exec(text)) !== null) {
    const url = match[2];
    const title = match[1];
    const context = extractContext(text, match.index);
    
    citations.push({
      source_url: url,
      source_domain: extractDomain(url),
      source_title: title,
      citation_context: context,
      position_in_response: position++,
    });
  }
  
  // Pattern 2: Plain URLs
  const urlRegex = /(?<![(\[])(https?:\/\/[^\s<>\])"']+)/g;
  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[1];
    // Skip if already captured as markdown link
    if (citations.some(c => c.source_url === url)) continue;
    
    const context = extractContext(text, match.index);
    
    citations.push({
      source_url: url,
      source_domain: extractDomain(url),
      source_title: null,
      citation_context: context,
      position_in_response: position++,
    });
  }
  
  // Pattern 3: Citation references like [1], [2] with sources section
  const sourcesSection = text.match(/(?:Sources?|References?|출처)[:\s]*([\s\S]*?)(?:\n\n|$)/i);
  if (sourcesSection) {
    const sourceLines = sourcesSection[1].split('\n').filter(line => line.trim());
    sourceLines.forEach((line, _index) => {
      const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        const url = urlMatch[1];
        if (!citations.some(c => c.source_url === url)) {
          citations.push({
            source_url: url,
            source_domain: extractDomain(url),
            source_title: line.replace(urlMatch[0], '').trim() || null,
            citation_context: null,
            position_in_response: position++,
          });
        }
      }
    });
  }
  
  return citations;
}

/**
 * Extract citations from Google Search results
 */
function extractGoogleCitations(text: string): ExtractedCitation[] {
  const citations: ExtractedCitation[] = [];
  
  // Google search results typically follow format:
  // 1. Title
  // Snippet
  // URL: https://...
  const resultPattern = /(\d+)\.\s*([^\n]+)\n([^\n]+)\nURL:\s*(https?:\/\/[^\s]+)/g;
  let match;
  let position = 0;
  
  while ((match = resultPattern.exec(text)) !== null) {
    citations.push({
      source_url: match[4],
      source_domain: extractDomain(match[4]),
      source_title: match[2].trim(),
      citation_context: match[3].trim(),
      position_in_response: position++,
    });
  }
  
  // Fallback: just extract URLs
  if (citations.length === 0) {
    const urlRegex = /(https?:\/\/[^\s<>\])"']+)/g;
    while ((match = urlRegex.exec(text)) !== null) {
      citations.push({
        source_url: match[1],
        source_domain: extractDomain(match[1]),
        source_title: null,
        citation_context: extractContext(text, match.index),
        position_in_response: position++,
      });
    }
  }
  
  return citations;
}

/**
 * Extract citations from general LLM responses
 */
function extractGeneralCitations(text: string): ExtractedCitation[] {
  const citations: ExtractedCitation[] = [];
  
  // Extract any URLs found in the text
  const urlRegex = /(https?:\/\/[^\s<>\])"']+)/g;
  let match;
  let position = 0;
  
  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[1].replace(/[.,;:!?)]+$/, ''); // Clean trailing punctuation
    
    citations.push({
      source_url: url,
      source_domain: extractDomain(url),
      source_title: null,
      citation_context: extractContext(text, match.index),
      position_in_response: position++,
    });
  }
  
  return citations;
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Extract surrounding context for a citation
 */
function extractContext(text: string, position: number, contextLength: number = 150): string {
  const start = Math.max(0, position - contextLength / 2);
  const end = Math.min(text.length, position + contextLength / 2);
  
  let context = text.slice(start, end).trim();
  
  // Add ellipsis if truncated
  if (start > 0) context = '...' + context;
  if (end < text.length) context = context + '...';
  
  return context;
}

/**
 * Analyze citation patterns
 */
export function analyzeCitationPatterns(citations: Citation[]): {
  topDomains: Array<{ domain: string; count: number }>;
  providerCitationCounts: Record<string, number>;
  totalCitations: number;
} {
  // Count by domain
  const domainCounts: Record<string, number> = {};
  citations.forEach(c => {
    if (c.source_domain) {
      domainCounts[c.source_domain] = (domainCounts[c.source_domain] || 0) + 1;
    }
  });
  
  const topDomains = Object.entries(domainCounts)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Count by provider
  const providerCounts: Record<string, number> = {};
  citations.forEach(c => {
    providerCounts[c.provider] = (providerCounts[c.provider] || 0) + 1;
  });
  
  return {
    topDomains,
    providerCitationCounts: providerCounts,
    totalCitations: citations.length,
  };
}

/**
 * Check if brand's website is being cited
 */
export function checkBrandCitations(
  citations: Citation[],
  brandDomains: string[]
): {
  isBrandCited: boolean;
  brandCitations: Citation[];
  competitorCitations: Citation[];
} {
  const normalizedBrandDomains = brandDomains.map(d => d.toLowerCase().replace(/^www\./, ''));
  
  const brandCitations = citations.filter(c => 
    c.source_domain && normalizedBrandDomains.includes(c.source_domain.toLowerCase())
  );
  
  const competitorCitations = citations.filter(c =>
    c.source_domain && !normalizedBrandDomains.includes(c.source_domain.toLowerCase())
  );
  
  return {
    isBrandCited: brandCitations.length > 0,
    brandCitations,
    competitorCitations,
  };
}
