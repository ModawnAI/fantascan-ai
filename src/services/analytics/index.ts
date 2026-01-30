/**
 * Analytics Services Index
 * Exports all analytics-related services
 */

// Trend calculation
export {
  calculateTrend,
  calculateProviderTrends,
  calculateSOVTrend,
} from './trends';

// Share of Voice
export {
  calculateShareOfVoice,
  compareSOV,
  generateSOVInsights,
} from './share-of-voice';

// Citation extraction
export {
  extractCitations,
  analyzeCitationPatterns,
  checkBrandCitations,
} from './citations';

// Recommendations
export {
  generateRecommendations,
} from './recommendations';

// Alerts
export {
  checkAlerts,
  getDefaultAlertConfigs,
  formatAlertForDisplay,
} from './alerts';

// Hallucination detection
export {
  checkHallucination,
  extractBrandFacts,
  generateHallucinationReport,
} from './hallucination';
