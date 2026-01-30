/**
 * Alert Service
 * Manages alert generation, delivery, and tracking
 */

import type { Alert, AlertConfig, AlertType, AlertSeverity } from '@/types/database';

interface AlertCheckInput {
  brandId: string;
  userId: string;
  currentScore: number;
  previousScore: number | null;
  currentSOV: Record<string, number>;
  previousSOV: Record<string, number> | null;
  currentSentiment: { positive: number; neutral: number; negative: number };
  previousSentiment: { positive: number; neutral: number; negative: number } | null;
  hasNewCitation: boolean;
  hasHallucination: boolean;
  hallucinationDetails?: string;
}

interface GeneratedAlert {
  alert_type: AlertType;
  title: string;
  message: string;
  severity: AlertSeverity;
  data: Record<string, unknown>;
}

/**
 * Check if any alerts should be triggered based on scan results
 */
export function checkAlerts(
  configs: AlertConfig[],
  input: AlertCheckInput
): GeneratedAlert[] {
  const alerts: GeneratedAlert[] = [];
  
  configs.filter(c => c.is_active).forEach(config => {
    const alert = checkSingleAlertConfig(config, input);
    if (alert) {
      alerts.push(alert);
    }
  });
  
  return alerts;
}

/**
 * Check a single alert configuration
 */
function checkSingleAlertConfig(
  config: AlertConfig,
  input: AlertCheckInput
): GeneratedAlert | null {
  const { alert_type, threshold } = config;
  
  switch (alert_type) {
    case 'visibility_drop':
      return checkVisibilityDrop(input, threshold);
    case 'visibility_spike':
      return checkVisibilitySpike(input, threshold);
    case 'competitor_spike':
      return checkCompetitorSpike(input, threshold);
    case 'sentiment_shift':
      return checkSentimentShift(input, threshold);
    case 'first_citation':
      return checkFirstCitation(input);
    case 'hallucination_detected':
      return checkHallucination(input);
    default:
      return null;
  }
}

/**
 * Check for visibility score drop
 */
function checkVisibilityDrop(
  input: AlertCheckInput,
  threshold: AlertConfig['threshold']
): GeneratedAlert | null {
  const { currentScore, previousScore } = input;
  
  if (previousScore === null) return null;
  
  const dropPercentage = ((previousScore - currentScore) / previousScore) * 100;
  const thresholdPercent = threshold.percentage || 10;
  
  if (dropPercentage >= thresholdPercent) {
    return {
      alert_type: 'visibility_drop',
      title: 'AI 가시성 점수 하락 감지',
      message: `가시성 점수가 ${previousScore}점에서 ${currentScore}점으로 ${dropPercentage.toFixed(1)}% 하락했습니다.`,
      severity: dropPercentage >= 20 ? 'critical' : 'warning',
      data: {
        previous_score: previousScore,
        current_score: currentScore,
        drop_percentage: dropPercentage,
      },
    };
  }
  
  return null;
}

/**
 * Check for visibility score spike
 */
function checkVisibilitySpike(
  input: AlertCheckInput,
  threshold: AlertConfig['threshold']
): GeneratedAlert | null {
  const { currentScore, previousScore } = input;
  
  if (previousScore === null || previousScore === 0) return null;
  
  const spikePercentage = ((currentScore - previousScore) / previousScore) * 100;
  const thresholdPercent = threshold.percentage || 10;
  
  if (spikePercentage >= thresholdPercent) {
    return {
      alert_type: 'visibility_spike',
      title: 'AI 가시성 점수 상승!',
      message: `가시성 점수가 ${previousScore}점에서 ${currentScore}점으로 ${spikePercentage.toFixed(1)}% 상승했습니다!`,
      severity: 'info',
      data: {
        previous_score: previousScore,
        current_score: currentScore,
        spike_percentage: spikePercentage,
      },
    };
  }
  
  return null;
}

/**
 * Check for competitor visibility spike
 */
function checkCompetitorSpike(
  input: AlertCheckInput,
  threshold: AlertConfig['threshold']
): GeneratedAlert | null {
  const { currentSOV, previousSOV } = input;
  
  if (!previousSOV) return null;
  
  const thresholdPercent = threshold.percentage || 15;
  
  for (const [competitor, currentPercent] of Object.entries(currentSOV)) {
    const previousPercent = previousSOV[competitor] || 0;
    
    if (previousPercent > 0) {
      const spikePercentage = ((currentPercent - previousPercent) / previousPercent) * 100;
      
      if (spikePercentage >= thresholdPercent) {
        return {
          alert_type: 'competitor_spike',
          title: `경쟁사 ${competitor} 점유율 급상승`,
          message: `${competitor}의 AI 검색 점유율이 ${previousPercent.toFixed(1)}%에서 ${currentPercent.toFixed(1)}%로 ${spikePercentage.toFixed(1)}% 상승했습니다. 대응이 필요합니다.`,
          severity: 'warning',
          data: {
            competitor,
            previous_sov: previousPercent,
            current_sov: currentPercent,
            spike_percentage: spikePercentage,
          },
        };
      }
    }
  }
  
  return null;
}

/**
 * Check for sentiment shift
 */
function checkSentimentShift(
  input: AlertCheckInput,
  threshold: AlertConfig['threshold']
): GeneratedAlert | null {
  const { currentSentiment, previousSentiment } = input;
  
  if (!previousSentiment) return null;
  
  const thresholdPercent = threshold.percentage || 20;
  
  // Check for increase in negative sentiment
  const prevNegativeRate = previousSentiment.negative / 
    (previousSentiment.positive + previousSentiment.neutral + previousSentiment.negative || 1);
  const currNegativeRate = currentSentiment.negative / 
    (currentSentiment.positive + currentSentiment.neutral + currentSentiment.negative || 1);
  
  const negativeIncrease = (currNegativeRate - prevNegativeRate) * 100;
  
  if (negativeIncrease >= thresholdPercent) {
    return {
      alert_type: 'sentiment_shift',
      title: '부정적 감정 증가 감지',
      message: `AI 응답에서 부정적 감정이 ${negativeIncrease.toFixed(1)}%p 증가했습니다. 브랜드 이미지 관리가 필요합니다.`,
      severity: negativeIncrease >= 30 ? 'critical' : 'warning',
      data: {
        previous_sentiment: previousSentiment,
        current_sentiment: currentSentiment,
        negative_increase: negativeIncrease,
      },
    };
  }
  
  return null;
}

/**
 * Check for first citation
 */
function checkFirstCitation(input: AlertCheckInput): GeneratedAlert | null {
  if (input.hasNewCitation) {
    return {
      alert_type: 'first_citation',
      title: '새로운 인용 발견!',
      message: 'AI 응답에서 브랜드 웹사이트가 새롭게 인용되었습니다.',
      severity: 'info',
      data: {
        has_citation: true,
      },
    };
  }
  
  return null;
}

/**
 * Check for hallucination
 */
function checkHallucination(input: AlertCheckInput): GeneratedAlert | null {
  if (input.hasHallucination) {
    return {
      alert_type: 'hallucination_detected',
      title: 'AI 환각(Hallucination) 감지',
      message: `AI가 브랜드에 대해 부정확한 정보를 제공하고 있습니다: ${input.hallucinationDetails || '상세 내용 확인 필요'}`,
      severity: 'critical',
      data: {
        hallucination_details: input.hallucinationDetails,
      },
    };
  }
  
  return null;
}

/**
 * Get default alert configurations for a new user
 */
export function getDefaultAlertConfigs(
  userId: string,
  brandId: string
): Omit<AlertConfig, 'id' | 'created_at' | 'updated_at'>[] {
  return [
    {
      user_id: userId,
      brand_id: brandId,
      alert_type: 'visibility_drop',
      threshold: { percentage: 10, direction: 'down' },
      channels: ['in_app'],
      webhook_url: null,
      is_active: true,
    },
    {
      user_id: userId,
      brand_id: brandId,
      alert_type: 'competitor_spike',
      threshold: { percentage: 15, direction: 'up' },
      channels: ['in_app'],
      webhook_url: null,
      is_active: true,
    },
    {
      user_id: userId,
      brand_id: brandId,
      alert_type: 'sentiment_shift',
      threshold: { percentage: 20, direction: 'up' },
      channels: ['in_app'],
      webhook_url: null,
      is_active: true,
    },
    {
      user_id: userId,
      brand_id: brandId,
      alert_type: 'hallucination_detected',
      threshold: {},
      channels: ['in_app', 'email'],
      webhook_url: null,
      is_active: true,
    },
  ];
}

/**
 * Format alert for display
 */
export function formatAlertForDisplay(alert: Alert): {
  icon: string;
  color: string;
  timeAgo: string;
} {
  const icons: Record<AlertType, string> = {
    visibility_drop: '📉',
    visibility_spike: '📈',
    competitor_spike: '⚠️',
    new_mention: '✨',
    sentiment_shift: '😟',
    first_citation: '🔗',
    hallucination_detected: '🚨',
  };
  
  const colors: Record<AlertSeverity, string> = {
    info: 'text-blue-400',
    warning: 'text-yellow-400',
    critical: 'text-red-400',
  };
  
  const now = new Date();
  const alertTime = new Date(alert.triggered_at);
  const diffMs = now.getTime() - alertTime.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  let timeAgo: string;
  if (diffMins < 1) {
    timeAgo = '방금 전';
  } else if (diffMins < 60) {
    timeAgo = `${diffMins}분 전`;
  } else if (diffHours < 24) {
    timeAgo = `${diffHours}시간 전`;
  } else {
    timeAgo = `${diffDays}일 전`;
  }
  
  return {
    icon: icons[alert.alert_type] || '📌',
    color: colors[alert.severity],
    timeAgo,
  };
}
