/**
 * Report Generation Service
 * Generates reports for brand visibility analysis
 */

import type { 
  Brand, 
  Scan, 
  VisibilityHistory, 
  CompetitorAnalysis,
  ContentRecommendation,
  Citation,
} from '@/types/database';

export interface ReportData {
  brand: Brand;
  scan: Scan;
  history: VisibilityHistory[];
  competitors: CompetitorAnalysis[];
  recommendations: ContentRecommendation[];
  citations: Citation[];
  generatedAt: string;
}

export interface ReportSection {
  title: string;
  content: string;
}

/**
 * Generate a text-based report (can be converted to PDF)
 */
export function generateTextReport(data: ReportData): string {
  const { brand, scan, history, competitors, recommendations, citations } = data;
  
  const sections: ReportSection[] = [];
  
  // Header
  sections.push({
    title: '',
    content: `
================================================================================
                      ${brand.name} AI 가시성 분석 보고서
================================================================================

생성일시: ${new Date(data.generatedAt).toLocaleString('ko-KR')}
브랜드: ${brand.name}
산업: ${getIndustryName(brand.industry)}
`,
  });
  
  // Executive Summary
  sections.push({
    title: '요약',
    content: `
--------------------------------------------------------------------------------
                               요약
--------------------------------------------------------------------------------

• 현재 AI 가시성 점수: ${scan.visibility_score ?? 0}/100
• AI 엔진 노출율: ${scan.mentions_count}/${scan.total_providers} (${Math.round((scan.mentions_count / scan.total_providers) * 100)}%)
• 스캔 일시: ${scan.completed_at ? new Date(scan.completed_at).toLocaleString('ko-KR') : '진행 중'}
`,
  });
  
  // Trend Analysis
  if (history.length > 1) {
    const latestScore = history[0]?.visibility_score ?? 0;
    const previousScore = history[1]?.visibility_score ?? 0;
    const trend = latestScore - previousScore;
    const trendText = trend > 0 ? `+${trend}점 상승 📈` : trend < 0 ? `${trend}점 하락 📉` : '변동 없음 ➡️';
    
    sections.push({
      title: '추이 분석',
      content: `
--------------------------------------------------------------------------------
                             추이 분석
--------------------------------------------------------------------------------

최근 점수 변화: ${trendText}
• 현재: ${latestScore}점
• 이전: ${previousScore}점

최근 7일 기록:
${history.slice(0, 7).map(h => `  • ${new Date(h.recorded_at).toLocaleDateString('ko-KR')}: ${h.visibility_score}점`).join('\n')}
`,
    });
  }
  
  // Competitor Analysis
  if (competitors.length > 0) {
    sections.push({
      title: '경쟁사 분석',
      content: `
--------------------------------------------------------------------------------
                            경쟁사 분석
--------------------------------------------------------------------------------

${competitors.map(c => `
${c.competitor_name}
  • 가시성 점수: ${c.visibility_score}/100
  • 점유율 (SOV): ${c.share_of_voice}%
  • 언급 횟수: ${c.mentions_count}회
  • 평균 위치: ${c.average_position ? c.average_position.toFixed(1) : 'N/A'}
  • 감성 분석: 긍정 ${c.sentiment_positive}, 중립 ${c.sentiment_neutral}, 부정 ${c.sentiment_negative}
`).join('\n')}
`,
    });
  }
  
  // Citations
  if (citations.length > 0) {
    const domainCounts: Record<string, number> = {};
    citations.forEach(c => {
      if (c.source_domain) {
        domainCounts[c.source_domain] = (domainCounts[c.source_domain] || 0) + 1;
      }
    });
    
    const topDomains = Object.entries(domainCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    sections.push({
      title: '인용 소스 분석',
      content: `
--------------------------------------------------------------------------------
                           인용 소스 분석
--------------------------------------------------------------------------------

총 인용 수: ${citations.length}개

주요 인용 도메인:
${topDomains.map(([domain, count]) => `  • ${domain}: ${count}회`).join('\n')}
`,
    });
  }
  
  // Recommendations
  if (recommendations.length > 0) {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sorted = [...recommendations].sort((a, b) => 
      priorityOrder[a.priority] - priorityOrder[b.priority]
    );
    
    sections.push({
      title: '개선 권장사항',
      content: `
--------------------------------------------------------------------------------
                           개선 권장사항
--------------------------------------------------------------------------------

${sorted.map((rec, i) => `
${i + 1}. [${getPriorityLabel(rec.priority)}] ${rec.title}
   ${rec.description}
   
   실행 항목:
${rec.action_items.map(item => `     - ${item}`).join('\n')}
`).join('\n')}
`,
    });
  }
  
  // Footer
  sections.push({
    title: '',
    content: `
================================================================================
                      보고서 끝 - 판타스캔 AI
================================================================================

본 보고서는 판타스캔 AI에서 자동 생성되었습니다.
문의사항은 support@fantascan.ai로 연락 바랍니다.
`,
  });
  
  return sections.map(s => s.content).join('\n');
}

/**
 * Generate HTML report
 */
export function generateHTMLReport(data: ReportData): string {
  const { brand, scan, history, competitors, recommendations, citations } = data;
  
  const latestScore = scan.visibility_score ?? 0;
  const previousScore = history[1]?.visibility_score ?? 0;
  const trend = latestScore - previousScore;
  
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brand.name} AI 가시성 분석 보고서</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Pretendard', -apple-system, sans-serif; background: #0a0a0a; color: #fff; padding: 40px; }
    .container { max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .header h1 { font-size: 24px; margin-bottom: 8px; }
    .header .meta { color: rgba(255,255,255,0.5); font-size: 14px; }
    .section { margin-bottom: 32px; }
    .section h2 { font-size: 18px; color: #f97316; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .score-card { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; text-align: center; }
    .score { font-size: 48px; font-weight: bold; color: ${latestScore >= 70 ? '#4ade80' : latestScore >= 40 ? '#fbbf24' : '#f87171'}; }
    .trend { margin-top: 8px; color: ${trend > 0 ? '#4ade80' : trend < 0 ? '#f87171' : 'rgba(255,255,255,0.5)'}; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .stat-card { background: rgba(255,255,255,0.05); border-radius: 8px; padding: 16px; }
    .stat-card .label { font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 4px; }
    .stat-card .value { font-size: 20px; font-weight: bold; }
    .competitor-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .competitor-name { font-weight: 500; }
    .competitor-stats { color: rgba(255,255,255,0.7); }
    .recommendation { background: rgba(255,255,255,0.05); border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .recommendation .priority { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-bottom: 8px; }
    .priority-critical { background: rgba(239, 68, 68, 0.2); color: #f87171; }
    .priority-high { background: rgba(249, 115, 22, 0.2); color: #fb923c; }
    .priority-medium { background: rgba(250, 204, 21, 0.2); color: #facc15; }
    .priority-low { background: rgba(255, 255, 255, 0.1); color: rgba(255,255,255,0.5); }
    .recommendation h3 { font-size: 14px; margin-bottom: 8px; }
    .recommendation p { font-size: 13px; color: rgba(255,255,255,0.7); margin-bottom: 12px; }
    .recommendation ul { padding-left: 20px; }
    .recommendation li { font-size: 13px; color: rgba(255,255,255,0.6); margin-bottom: 4px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center; color: rgba(255,255,255,0.4); font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${brand.name} AI 가시성 분석 보고서</h1>
      <div class="meta">생성일: ${new Date(data.generatedAt).toLocaleString('ko-KR')} | 산업: ${getIndustryName(brand.industry)}</div>
    </div>
    
    <div class="section">
      <h2>가시성 점수</h2>
      <div class="score-card">
        <div class="score">${latestScore}<span style="font-size: 24px; color: rgba(255,255,255,0.5);">/100</span></div>
        <div class="trend">${trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} ${Math.abs(trend)}점 ${trend > 0 ? '상승' : trend < 0 ? '하락' : '변동 없음'}</div>
      </div>
      <div class="grid" style="margin-top: 16px;">
        <div class="stat-card">
          <div class="label">AI 노출율</div>
          <div class="value">${Math.round((scan.mentions_count / scan.total_providers) * 100)}%</div>
        </div>
        <div class="stat-card">
          <div class="label">노출 엔진 수</div>
          <div class="value">${scan.mentions_count}/${scan.total_providers}</div>
        </div>
      </div>
    </div>
    
    ${competitors.length > 0 ? `
    <div class="section">
      <h2>경쟁사 분석</h2>
      ${competitors.map(c => `
        <div class="competitor-row">
          <span class="competitor-name">${c.competitor_name}</span>
          <span class="competitor-stats">점수 ${c.visibility_score} | SOV ${c.share_of_voice}%</span>
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    ${recommendations.length > 0 ? `
    <div class="section">
      <h2>개선 권장사항</h2>
      ${recommendations.slice(0, 5).map(rec => `
        <div class="recommendation">
          <span class="priority priority-${rec.priority}">${getPriorityLabel(rec.priority)}</span>
          <h3>${rec.title}</h3>
          <p>${rec.description}</p>
          <ul>
            ${rec.action_items.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    <div class="footer">
      <p>본 보고서는 판타스캔 AI에서 자동 생성되었습니다.</p>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Generate CSV export data
 */
export function generateCSVExport(data: ReportData): string {
  const { brand, scan, history, competitors } = data;
  
  const rows: string[][] = [
    ['브랜드', '날짜', '가시성 점수', 'AI 점수', 'SEO 점수', '노출 수', '총 제공자'],
  ];
  
  // Add history data
  history.forEach(h => {
    rows.push([
      brand.name,
      new Date(h.recorded_at).toLocaleDateString('ko-KR'),
      h.visibility_score.toString(),
      h.ai_visibility_score.toString(),
      h.seo_visibility_score.toString(),
      h.mentions_count.toString(),
      h.total_providers.toString(),
    ]);
  });
  
  // Add current scan if not in history
  if (history.length === 0 || new Date(history[0].recorded_at).toDateString() !== new Date(scan.completed_at || '').toDateString()) {
    rows.push([
      brand.name,
      new Date(scan.completed_at || scan.created_at).toLocaleDateString('ko-KR'),
      (scan.visibility_score ?? 0).toString(),
      (scan.ai_visibility_score ?? 0).toString(),
      (scan.seo_visibility_score ?? 0).toString(),
      scan.mentions_count.toString(),
      scan.total_providers.toString(),
    ]);
  }
  
  // Add competitor section
  if (competitors.length > 0) {
    rows.push([]);
    rows.push(['경쟁사', '가시성 점수', '점유율', '언급 수', '평균 위치']);
    competitors.forEach(c => {
      rows.push([
        c.competitor_name,
        c.visibility_score.toString(),
        `${c.share_of_voice}%`,
        c.mentions_count.toString(),
        c.average_position?.toString() ?? 'N/A',
      ]);
    });
  }
  
  return rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
}

// Helper functions
function getIndustryName(industry: string): string {
  const names: Record<string, string> = {
    fintech: '핀테크',
    ecommerce: '이커머스',
    saas: 'SaaS',
    education: '교육',
    healthcare: '헬스케어',
    fnb: 'F&B',
    beauty: '뷰티',
    travel: '여행',
    realestate: '부동산',
    other: '기타',
  };
  return names[industry] || industry;
}

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    critical: '긴급',
    high: '높음',
    medium: '보통',
    low: '낮음',
  };
  return labels[priority] || priority;
}
