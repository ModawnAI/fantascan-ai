/**
 * Comprehensive Report Service
 * Generates detailed SEO/AEO/GEO analysis reports
 */

import type { 
  Brand, 
  ProviderType,
  TrendPeriod,
} from '@/types/database';

export interface ComprehensiveReportInput {
  brand: Brand;
  periodStart: Date;
  periodEnd: Date;
  visibilityData: {
    currentScore: number;
    previousScore: number;
    trend: 'up' | 'down' | 'stable';
    trendPercent: number;
    aiScore: number;
    seoScore: number;
    providerScores: Record<ProviderType, number>;
  };
  keywordData: Array<{
    keyword: string;
    score: number;
    trend: 'up' | 'down' | 'stable';
    providerBreakdown: Record<ProviderType, number>;
  }>;
  competitorData: Array<{
    name: string;
    score: number;
    shareOfVoice: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  recommendations: Array<{
    priority: 'critical' | 'high' | 'medium' | 'low';
    type: 'immediate' | 'shortTerm' | 'longTerm';
    title: string;
    description: string;
    expectedImpact: string;
    actionItems: string[];
  }>;
  scanStats: {
    totalScans: number;
    totalQueries: number;
    avgResponseTime: number;
  };
}

export interface ComprehensiveReport {
  header: {
    brandName: string;
    reportPeriod: { start: string; end: string };
    generatedAt: string;
    reportId: string;
  };
  executiveSummary: {
    overallScore: number;
    scoreChange: number;
    keyFindings: string[];
    topRecommendations: string[];
    healthStatus: 'excellent' | 'good' | 'fair' | 'poor';
  };
  sections: {
    visibilityOverview: {
      currentScore: number;
      previousScore: number;
      trend: { direction: 'up' | 'down' | 'stable'; percent: number };
      aiScore: number;
      seoScore: number;
      providerBreakdown: Array<{
        provider: string;
        score: number;
        status: 'strong' | 'moderate' | 'weak';
      }>;
    };
    keywordAnalysis: {
      topPerforming: Array<{ keyword: string; score: number; bestProvider: string }>;
      underperforming: Array<{ keyword: string; score: number; issue: string }>;
      newOpportunities: string[];
    };
    competitorAnalysis: {
      shareOfVoice: Array<{ name: string; percentage: number; change: number }>;
      competitorStrengths: Array<{ competitor: string; strength: string }>;
      gapsToAddress: string[];
    };
    providerDeepDive: Record<string, {
      score: number;
      status: string;
      mentions: number;
      sentiment: { positive: number; neutral: number; negative: number };
      recommendations: string[];
    }>;
    recommendations: {
      immediate: Array<{ title: string; description: string; impact: string }>;
      shortTerm: Array<{ title: string; description: string; impact: string }>;
      longTerm: Array<{ title: string; description: string; impact: string }>;
    };
    nextSteps: {
      prioritizedActions: Array<{ action: string; deadline: string; owner: string }>;
      scheduledScans: Array<{ type: string; frequency: string; nextRun: string }>;
    };
  };
}

/**
 * Generate a comprehensive report from input data
 */
export function generateComprehensiveReport(
  input: ComprehensiveReportInput
): ComprehensiveReport {
  const { brand, periodStart, periodEnd, visibilityData, keywordData, competitorData, recommendations } = input;
  
  // Determine health status
  const healthStatus = getHealthStatus(visibilityData.currentScore);
  
  // Generate key findings
  const keyFindings = generateKeyFindings(input);
  
  // Get top recommendations
  const topRecommendations = recommendations
    .filter(r => r.priority === 'critical' || r.priority === 'high')
    .slice(0, 3)
    .map(r => r.title);
  
  // Provider breakdown
  const providerBreakdown = Object.entries(visibilityData.providerScores).map(([provider, score]) => ({
    provider,
    score,
    status: score >= 70 ? 'strong' as const : score >= 40 ? 'moderate' as const : 'weak' as const,
  }));
  
  // Keyword analysis
  const sortedKeywords = [...keywordData].sort((a, b) => b.score - a.score);
  const topPerforming = sortedKeywords.slice(0, 5).map(k => ({
    keyword: k.keyword,
    score: k.score,
    bestProvider: Object.entries(k.providerBreakdown)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A',
  }));
  const underperforming = sortedKeywords.slice(-3).map(k => ({
    keyword: k.keyword,
    score: k.score,
    issue: getKeywordIssue(k.score, k.providerBreakdown),
  }));
  
  // Competitor analysis
  const shareOfVoice = competitorData.map(c => ({
    name: c.name,
    percentage: c.shareOfVoice,
    change: c.trend === 'up' ? 5 : c.trend === 'down' ? -5 : 0,
  }));
  
  const competitorStrengths = competitorData
    .filter(c => c.score > visibilityData.currentScore)
    .map(c => ({
      competitor: c.name,
      strength: getCompetitorStrength(c, visibilityData.currentScore),
    }));
  
  const gapsToAddress = identifyGaps(input);
  
  // Provider deep dive
  const providerDeepDive: ComprehensiveReport['sections']['providerDeepDive'] = {};
  for (const [provider, score] of Object.entries(visibilityData.providerScores)) {
    providerDeepDive[provider] = {
      score,
      status: score >= 70 ? '강함' : score >= 40 ? '보통' : '약함',
      mentions: Math.round(score / 20), // Simplified
      sentiment: { positive: 60, neutral: 30, negative: 10 },
      recommendations: getProviderRecommendations(provider, score),
    };
  }
  
  // Group recommendations by type
  const immediateRecs = recommendations.filter(r => r.type === 'immediate');
  const shortTermRecs = recommendations.filter(r => r.type === 'shortTerm');
  const longTermRecs = recommendations.filter(r => r.type === 'longTerm');
  
  return {
    header: {
      brandName: brand.name,
      reportPeriod: {
        start: periodStart.toISOString().split('T')[0],
        end: periodEnd.toISOString().split('T')[0],
      },
      generatedAt: new Date().toISOString(),
      reportId: `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
    executiveSummary: {
      overallScore: visibilityData.currentScore,
      scoreChange: visibilityData.currentScore - visibilityData.previousScore,
      keyFindings,
      topRecommendations,
      healthStatus,
    },
    sections: {
      visibilityOverview: {
        currentScore: visibilityData.currentScore,
        previousScore: visibilityData.previousScore,
        trend: {
          direction: visibilityData.trend,
          percent: visibilityData.trendPercent,
        },
        aiScore: visibilityData.aiScore,
        seoScore: visibilityData.seoScore,
        providerBreakdown,
      },
      keywordAnalysis: {
        topPerforming,
        underperforming,
        newOpportunities: generateKeywordOpportunities(keywordData),
      },
      competitorAnalysis: {
        shareOfVoice,
        competitorStrengths,
        gapsToAddress,
      },
      providerDeepDive,
      recommendations: {
        immediate: immediateRecs.map(r => ({
          title: r.title,
          description: r.description,
          impact: r.expectedImpact,
        })),
        shortTerm: shortTermRecs.map(r => ({
          title: r.title,
          description: r.description,
          impact: r.expectedImpact,
        })),
        longTerm: longTermRecs.map(r => ({
          title: r.title,
          description: r.description,
          impact: r.expectedImpact,
        })),
      },
      nextSteps: {
        prioritizedActions: generatePrioritizedActions(recommendations),
        scheduledScans: [
          { type: '일간 스캔', frequency: '매일', nextRun: getNextDayISOString() },
          { type: '주간 리포트', frequency: '매주 월요일', nextRun: getNextMondayISOString() },
        ],
      },
    },
  };
}

// Helper functions
function getHealthStatus(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

function generateKeyFindings(input: ComprehensiveReportInput): string[] {
  const findings: string[] = [];
  const { visibilityData, keywordData, competitorData } = input;
  
  // Score finding
  if (visibilityData.trend === 'up') {
    findings.push(`가시성 점수가 ${visibilityData.trendPercent}% 상승했습니다`);
  } else if (visibilityData.trend === 'down') {
    findings.push(`가시성 점수가 ${Math.abs(visibilityData.trendPercent)}% 하락했습니다`);
  }
  
  // AI vs SEO comparison
  if (visibilityData.aiScore > visibilityData.seoScore + 10) {
    findings.push('AI 엔진에서의 노출이 검색 엔진보다 높습니다');
  } else if (visibilityData.seoScore > visibilityData.aiScore + 10) {
    findings.push('검색 엔진에서의 노출이 AI 엔진보다 높습니다');
  }
  
  // Top keyword finding
  const topKeyword = keywordData.sort((a, b) => b.score - a.score)[0];
  if (topKeyword && topKeyword.score >= 70) {
    findings.push(`"${topKeyword.keyword}" 키워드에서 강한 노출을 보이고 있습니다`);
  }
  
  // Competitor finding
  const leadingCompetitor = competitorData.find(c => c.shareOfVoice > 30);
  if (leadingCompetitor) {
    findings.push(`${leadingCompetitor.name}이(가) 시장 점유율 ${leadingCompetitor.shareOfVoice}%로 선두입니다`);
  }
  
  return findings.slice(0, 4);
}

function getKeywordIssue(score: number, breakdown: Record<ProviderType, number>): string {
  if (score < 20) return '대부분의 AI 엔진에서 노출되지 않음';
  
  const lowProviders = Object.entries(breakdown)
    .filter(([, s]) => s < 30)
    .map(([p]) => p);
  
  if (lowProviders.length > 2) {
    return `${lowProviders.slice(0, 2).join(', ')} 등에서 노출 부족`;
  }
  
  return '전반적인 노출 개선 필요';
}

function getCompetitorStrength(competitor: { name: string; score: number }, ourScore: number): string {
  const diff = competitor.score - ourScore;
  if (diff > 20) return '전반적인 AI 가시성에서 크게 앞섬';
  if (diff > 10) return 'AI 검색 결과에서 더 자주 언급됨';
  return '특정 키워드에서 우위';
}

function identifyGaps(input: ComprehensiveReportInput): string[] {
  const gaps: string[] = [];
  const { visibilityData, keywordData } = input;
  
  // Provider gaps
  for (const [provider, score] of Object.entries(visibilityData.providerScores)) {
    if (score < 30) {
      gaps.push(`${getProviderDisplayName(provider)}에서의 가시성 개선 필요`);
    }
  }
  
  // Keyword gaps
  const weakKeywords = keywordData.filter(k => k.score < 40);
  if (weakKeywords.length > 0) {
    gaps.push(`${weakKeywords.length}개 키워드에서 노출 부족`);
  }
  
  return gaps.slice(0, 5);
}

function getProviderRecommendations(provider: string, score: number): string[] {
  const recs: string[] = [];
  
  if (score < 30) {
    recs.push('콘텐츠에 더 많은 구조화된 데이터 추가 필요');
    recs.push('FAQ 섹션 확충으로 답변 가능성 향상');
  } else if (score < 60) {
    recs.push('기존 콘텐츠의 권위성 강화');
    recs.push('관련 토픽 클러스터 구축');
  } else {
    recs.push('현재 수준 유지 및 모니터링');
  }
  
  return recs;
}

function getProviderDisplayName(provider: string): string {
  const names: Record<string, string> = {
    openai: 'ChatGPT',
    gemini: 'Gemini',
    anthropic: 'Claude',
    perplexity: 'Perplexity',
    grok: 'Grok',
    google_search: 'Google',
  };
  return names[provider] || provider;
}

function generateKeywordOpportunities(keywords: ComprehensiveReportInput['keywordData']): string[] {
  // Find keywords with potential (medium score but rising)
  const opportunities = keywords
    .filter(k => k.score >= 30 && k.score < 60 && k.trend === 'up')
    .map(k => `"${k.keyword}" 집중 최적화 기회`);
  
  return opportunities.slice(0, 3);
}

function generatePrioritizedActions(recommendations: ComprehensiveReportInput['recommendations']): Array<{ action: string; deadline: string; owner: string }> {
  return recommendations
    .filter(r => r.priority === 'critical' || r.priority === 'high')
    .slice(0, 5)
    .map((r, i) => ({
      action: r.title,
      deadline: getDeadlineFromPriority(r.priority, i),
      owner: 'SEO 팀',
    }));
}

function getDeadlineFromPriority(priority: string, index: number): string {
  const now = new Date();
  const days = priority === 'critical' ? 3 + index : priority === 'high' ? 7 + index : 14 + index;
  now.setDate(now.getDate() + days);
  return now.toISOString().split('T')[0];
}

function getNextDayISOString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(6, 0, 0, 0);
  return tomorrow.toISOString();
}

function getNextMondayISOString(): string {
  const now = new Date();
  const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
  now.setDate(now.getDate() + daysUntilMonday);
  now.setHours(9, 0, 0, 0);
  return now.toISOString();
}

/**
 * Convert comprehensive report to HTML
 */
export function reportToHTML(report: ComprehensiveReport): string {
  const { header, executiveSummary, sections } = report;
  
  const statusColors = {
    excellent: '#22c55e',
    good: '#3b82f6',
    fair: '#eab308',
    poor: '#ef4444',
  };
  
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${header.brandName} - 종합 AI 가시성 리포트</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Pretendard', -apple-system, sans-serif; background: #0f0f0f; color: #fff; line-height: 1.6; }
    .container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 48px; }
    .header h1 { font-size: 28px; margin-bottom: 8px; background: linear-gradient(135deg, #f97316, #fb923c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .header .meta { color: #888; font-size: 14px; }
    .summary { background: rgba(255,255,255,0.05); border-radius: 16px; padding: 32px; margin-bottom: 32px; border: 1px solid rgba(255,255,255,0.1); }
    .summary-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .score-display { text-align: center; }
    .score-value { font-size: 64px; font-weight: bold; color: ${statusColors[executiveSummary.healthStatus]}; }
    .score-change { color: ${executiveSummary.scoreChange >= 0 ? '#22c55e' : '#ef4444'}; font-size: 18px; margin-top: 4px; }
    .status-badge { padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; background: ${statusColors[executiveSummary.healthStatus]}20; color: ${statusColors[executiveSummary.healthStatus]}; }
    .findings { display: grid; gap: 12px; }
    .finding { padding: 12px 16px; background: rgba(255,255,255,0.03); border-radius: 8px; border-left: 3px solid #f97316; }
    .section { margin-bottom: 32px; }
    .section h2 { font-size: 20px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #f97316; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .card { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; border: 1px solid rgba(255,255,255,0.1); }
    .card h3 { font-size: 14px; color: #888; margin-bottom: 12px; }
    .metric { font-size: 32px; font-weight: bold; margin-bottom: 8px; }
    .provider-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .provider-name { width: 100px; font-size: 14px; }
    .bar-track { flex: 1; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s; }
    .bar-fill.strong { background: #22c55e; }
    .bar-fill.moderate { background: #eab308; }
    .bar-fill.weak { background: #ef4444; }
    .provider-score { width: 40px; text-align: right; font-weight: 600; }
    .recommendation { padding: 16px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 12px; }
    .recommendation h4 { font-size: 15px; margin-bottom: 8px; }
    .recommendation p { font-size: 13px; color: #999; margin-bottom: 8px; }
    .impact { font-size: 12px; color: #f97316; }
    .priority { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-right: 8px; }
    .priority.immediate { background: #ef444420; color: #ef4444; }
    .priority.shortTerm { background: #eab30820; color: #eab308; }
    .priority.longTerm { background: #3b82f620; color: #3b82f6; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${header.brandName} AI 가시성 종합 리포트</h1>
      <div class="meta">
        분석 기간: ${header.reportPeriod.start} ~ ${header.reportPeriod.end} | 
        생성: ${new Date(header.generatedAt).toLocaleString('ko-KR')}
      </div>
    </div>
    
    <div class="summary">
      <div class="summary-header">
        <div class="score-display">
          <div class="score-value">${executiveSummary.overallScore}</div>
          <div class="score-change">${executiveSummary.scoreChange >= 0 ? '+' : ''}${executiveSummary.scoreChange}점</div>
        </div>
        <div class="status-badge">${getStatusLabel(executiveSummary.healthStatus)}</div>
      </div>
      <div class="findings">
        ${executiveSummary.keyFindings.map(f => `<div class="finding">${f}</div>`).join('')}
      </div>
    </div>
    
    <div class="section">
      <h2>가시성 개요</h2>
      <div class="grid-2">
        <div class="card">
          <h3>AI 점수</h3>
          <div class="metric" style="color: #3b82f6;">${sections.visibilityOverview.aiScore}</div>
        </div>
        <div class="card">
          <h3>SEO 점수</h3>
          <div class="metric" style="color: #22c55e;">${sections.visibilityOverview.seoScore}</div>
        </div>
      </div>
      <div class="card" style="margin-top: 20px;">
        <h3>AI 제공자별 점수</h3>
        ${sections.visibilityOverview.providerBreakdown.map(p => `
          <div class="provider-bar">
            <div class="provider-name">${getProviderDisplayName(p.provider)}</div>
            <div class="bar-track">
              <div class="bar-fill ${p.status}" style="width: ${p.score}%;"></div>
            </div>
            <div class="provider-score">${p.score}</div>
          </div>
        `).join('')}
      </div>
    </div>
    
    <div class="section">
      <h2>개선 권장사항</h2>
      ${sections.recommendations.immediate.length > 0 ? `
        <h3 style="font-size: 14px; color: #ef4444; margin-bottom: 12px;">즉시 실행</h3>
        ${sections.recommendations.immediate.map(r => `
          <div class="recommendation">
            <span class="priority immediate">긴급</span>
            <h4>${r.title}</h4>
            <p>${r.description}</p>
            <div class="impact">예상 효과: ${r.impact}</div>
          </div>
        `).join('')}
      ` : ''}
      ${sections.recommendations.shortTerm.length > 0 ? `
        <h3 style="font-size: 14px; color: #eab308; margin: 20px 0 12px;">1-2주 내 실행</h3>
        ${sections.recommendations.shortTerm.map(r => `
          <div class="recommendation">
            <span class="priority shortTerm">단기</span>
            <h4>${r.title}</h4>
            <p>${r.description}</p>
            <div class="impact">예상 효과: ${r.impact}</div>
          </div>
        `).join('')}
      ` : ''}
    </div>
    
    <div class="footer">
      <p>리포트 ID: ${header.reportId}</p>
      <p>본 리포트는 판타스캔 AI에서 자동 생성되었습니다.</p>
    </div>
  </div>
</body>
</html>
`;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    excellent: '우수',
    good: '양호',
    fair: '보통',
    poor: '미흡',
  };
  return labels[status] || status;
}
