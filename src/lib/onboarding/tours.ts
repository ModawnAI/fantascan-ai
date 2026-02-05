import type { DriveStep, Config } from 'driver.js';

export type TourId = 'dashboard' | 'scan' | 'results' | 'settings';

// Custom popover class for glass card design
export const POPOVER_CLASS = 'fantascan-driver-popover';

// Common driver.js configuration
export const getDriverConfig = (): Config => ({
  showProgress: true,
  showButtons: ['next', 'previous', 'close'],
  nextBtnText: '다음',
  prevBtnText: '이전',
  doneBtnText: '완료',
  progressText: '{{current}} / {{total}}',
  popoverClass: POPOVER_CLASS,
  overlayColor: 'rgba(0, 0, 0, 0.75)',
  stagePadding: 8,
  stageRadius: 12,
  allowClose: true,
  disableActiveInteraction: false,
  animate: true,
});

// Dashboard Tour Steps
export const dashboardTourSteps: DriveStep[] = [
  {
    popover: {
      title: '판타스캔 AI 대시보드에 오신 것을 환영합니다',
      description: `
        <p>이 대시보드는 AI 플랫폼에서 귀하의 브랜드 가시성을 종합적으로 분석하고 모니터링하는 중앙 허브입니다.</p>
        <ul style="margin-top: 12px; padding-left: 16px;">
          <li><strong>실시간 모니터링:</strong> ChatGPT, Gemini, Claude 등 주요 AI에서 브랜드 노출 현황 확인</li>
          <li><strong>트렌드 분석:</strong> 시간에 따른 가시성 변화 추적</li>
          <li><strong>경쟁사 비교:</strong> 업계 평균 및 경쟁사 대비 위치 파악</li>
          <li><strong>인사이트 제공:</strong> AI가 분석한 개선점과 기회 요소 확인</li>
        </ul>
        <p style="margin-top: 12px; color: #f97316;">지금부터 각 기능을 자세히 안내해 드리겠습니다.</p>
      `,
      side: 'over',
      align: 'center',
    },
  },
  {
    element: '#visibility-score',
    popover: {
      title: 'AI 가시성 점수',
      description: `
        <p><strong>AI 가시성 점수</strong>는 주요 AI 플랫폼에서 귀하의 브랜드가 얼마나 자주, 어떤 맥락에서 언급되는지를 종합적으로 측정한 핵심 지표입니다.</p>
        <ul style="margin-top: 12px; padding-left: 16px;">
          <li><strong>80-100점:</strong> 최상위 가시성 - AI가 귀하의 브랜드를 적극적으로 추천합니다</li>
          <li><strong>60-79점:</strong> 양호한 가시성 - 관련 쿼리에서 종종 언급되고 있습니다</li>
          <li><strong>40-59점:</strong> 개선 필요 - 경쟁사 대비 노출이 부족한 상태입니다</li>
          <li><strong>0-39점:</strong> 긴급 개선 필요 - AI가 브랜드를 거의 인식하지 못합니다</li>
        </ul>
        <p style="margin-top: 12px; font-size: 13px; opacity: 0.8;">AI 점수와 SEO 점수를 개별적으로 확인하여 각 영역의 최적화 현황을 파악할 수 있습니다.</p>
      `,
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#provider-grid',
    popover: {
      title: 'AI 제공자별 가시성',
      description: `
        <p>각 AI 플랫폼에서 귀하의 브랜드가 어떻게 인식되는지 한눈에 파악할 수 있습니다.</p>
        <ul style="margin-top: 12px; padding-left: 16px;">
          <li><strong>OpenAI (ChatGPT):</strong> 전 세계에서 가장 많이 사용되는 AI 어시스턴트</li>
          <li><strong>Google Gemini:</strong> 구글의 최신 멀티모달 AI 모델</li>
          <li><strong>Anthropic Claude:</strong> 안전성과 정확성에 초점을 맞춘 AI</li>
          <li><strong>Perplexity:</strong> AI 기반 검색 엔진으로 실시간 정보 제공</li>
          <li><strong>xAI Grok:</strong> 실시간 트위터/X 데이터를 활용하는 AI</li>
        </ul>
        <p style="margin-top: 12px; font-size: 13px; opacity: 0.8;">각 카드를 클릭하면 해당 AI에서의 상세 멘션 내용을 확인할 수 있습니다.</p>
      `,
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '#visibility-timeline',
    popover: {
      title: '가시성 추이 타임라인',
      description: `
        <p>지난 30일간 귀하의 브랜드 가시성이 어떻게 변화했는지 시각적으로 확인할 수 있습니다.</p>
        <ul style="margin-top: 12px; padding-left: 16px;">
          <li><strong>전체 점수:</strong> AI와 SEO를 통합한 종합 가시성 점수</li>
          <li><strong>AI 점수:</strong> AI 플랫폼에서의 브랜드 노출도</li>
          <li><strong>SEO 점수:</strong> 검색 엔진 최적화 현황</li>
        </ul>
        <p style="margin-top: 12px; font-size: 13px; opacity: 0.8;">급격한 변화가 있는 구간을 클릭하면 해당 시점의 스캔 결과를 상세히 확인할 수 있습니다. 마케팅 캠페인이나 콘텐츠 발행 후 변화를 추적해 보세요.</p>
      `,
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '#keyword-heatmap',
    popover: {
      title: '키워드 히트맵',
      description: `
        <p>귀하의 핵심 키워드가 각 AI 플랫폼에서 어떤 점수를 받고 있는지 히트맵으로 시각화합니다.</p>
        <ul style="margin-top: 12px; padding-left: 16px;">
          <li><strong>녹색 (높은 점수):</strong> 해당 키워드에서 강한 가시성을 보유</li>
          <li><strong>노란색 (중간 점수):</strong> 개선의 여지가 있는 영역</li>
          <li><strong>빨간색 (낮은 점수):</strong> 집중적인 최적화가 필요한 키워드</li>
        </ul>
        <p style="margin-top: 12px; font-size: 13px; opacity: 0.8;">경쟁이 심한 키워드보다는 중간 난이도의 키워드에서 먼저 가시성을 확보하는 전략을 추천합니다.</p>
      `,
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '#benchmark-comparison',
    popover: {
      title: '업계 벤치마크 비교',
      description: `
        <p>동일 업계의 다른 브랜드들과 비교하여 귀하의 현재 위치를 객관적으로 파악할 수 있습니다.</p>
        <ul style="margin-top: 12px; padding-left: 16px;">
          <li><strong>업계 평균:</strong> 해당 산업군의 평균 가시성 점수</li>
          <li><strong>상위 10%:</strong> 업계 최고 수준의 브랜드들이 달성한 점수</li>
          <li><strong>상위 25%:</strong> 우수한 성과를 내는 브랜드들의 기준점</li>
          <li><strong>백분위 순위:</strong> 업계 내 귀하의 상대적 위치</li>
        </ul>
        <p style="margin-top: 12px; font-size: 13px; opacity: 0.8;">경쟁사 분석을 통해 그들이 어떤 전략으로 높은 가시성을 확보했는지 인사이트를 얻을 수 있습니다.</p>
      `,
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '#quick-insights',
    popover: {
      title: '빠른 인사이트',
      description: `
        <p>AI가 분석한 귀하의 브랜드 가시성에 대한 핵심 인사이트를 빠르게 확인할 수 있습니다.</p>
        <ul style="margin-top: 12px; padding-left: 16px;">
          <li><strong>강점:</strong> AI가 귀하의 브랜드를 긍정적으로 인식하는 영역</li>
          <li><strong>약점:</strong> 개선이 필요한 부분과 경쟁사 대비 취약점</li>
          <li><strong>추천 액션:</strong> 가시성 향상을 위한 구체적인 실행 방안</li>
        </ul>
        <p style="margin-top: 12px; font-size: 13px; opacity: 0.8;">각 인사이트는 실제 AI 응답 분석을 기반으로 생성되며, 클릭하면 관련 상세 데이터를 확인할 수 있습니다.</p>
      `,
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '#query-templates',
    popover: {
      title: '쿼리 템플릿',
      description: `
        <p>귀하의 업종에 최적화된 AI 쿼리 템플릿을 제공합니다. 클릭 한 번으로 즉시 스캔을 시작할 수 있습니다.</p>
        <ul style="margin-top: 12px; padding-left: 16px;">
          <li><strong>업종별 최적화:</strong> 각 산업에서 자주 사용되는 검색 쿼리</li>
          <li><strong>의도 기반 분류:</strong> 정보 탐색, 비교, 구매 의도별 템플릿</li>
          <li><strong>원클릭 스캔:</strong> 템플릿 선택 즉시 스캔 시작 가능</li>
        </ul>
        <p style="margin-top: 12px; font-size: 13px; opacity: 0.8;">정기적으로 동일한 쿼리로 스캔하면 시간에 따른 가시성 변화를 정확하게 추적할 수 있습니다.</p>
      `,
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '#recent-scans',
    popover: {
      title: '최근 스캔 기록',
      description: `
        <p>최근에 실행한 스캔 결과를 한눈에 확인하고 상세 페이지로 이동할 수 있습니다.</p>
        <ul style="margin-top: 12px; padding-left: 16px;">
          <li><strong>상태 표시:</strong> 완료, 진행 중, 실패 등 스캔 상태 확인</li>
          <li><strong>점수 비교:</strong> 각 스캔의 가시성 점수를 빠르게 비교</li>
          <li><strong>상세 분석:</strong> 클릭하여 상세 결과 페이지로 이동</li>
        </ul>
        <p style="margin-top: 12px; font-size: 13px; opacity: 0.8;">새로운 스캔을 시작하려면 헤더의 "새 스캔" 버튼을 클릭하세요.</p>
      `,
      side: 'top',
      align: 'center',
    },
  },
  {
    popover: {
      title: '대시보드 투어 완료',
      description: `
        <p>축하합니다! 대시보드의 모든 기능을 살펴보았습니다.</p>
        <ul style="margin-top: 12px; padding-left: 16px;">
          <li>새 스캔을 시작하여 브랜드 가시성을 분석해 보세요</li>
          <li>정기적인 모니터링으로 트렌드를 추적하세요</li>
          <li>인사이트를 활용하여 가시성을 개선하세요</li>
        </ul>
        <p style="margin-top: 12px; color: #f97316;">화면 우측 하단의 도움말 버튼을 클릭하면 언제든 이 가이드를 다시 볼 수 있습니다.</p>
      `,
      side: 'over',
      align: 'center',
    },
  },
];

// Scan Wizard Tour Steps
export const scanTourSteps: DriveStep[] = [
  {
    popover: {
      title: '새 스캔 마법사',
      description: `
        <p>AI 가시성 스캔을 시작하는 단계별 마법사입니다. 간단한 4단계로 포괄적인 브랜드 분석을 실행할 수 있습니다.</p>
        <ul style="margin-top: 12px; padding-left: 16px;">
          <li><strong>1단계:</strong> 기본 쿼리 입력</li>
          <li><strong>2단계:</strong> 쿼리 확장 수준 선택</li>
          <li><strong>3단계:</strong> AI 제공자 선택</li>
          <li><strong>4단계:</strong> 스캔 시작 및 확인</li>
        </ul>
        <p style="margin-top: 12px; color: #f97316;">각 단계에서 최적의 선택을 할 수 있도록 안내해 드리겠습니다.</p>
      `,
      side: 'over',
      align: 'center',
    },
  },
  {
    element: '#query-input',
    popover: {
      title: '기본 쿼리 입력',
      description: `
        <p>사용자가 AI에게 물어볼 법한 질문을 입력하세요. 이 쿼리를 기반으로 AI들에게 동일한 질문을 던지고 브랜드 언급 여부를 분석합니다.</p>
        <ul style="margin-top: 12px; padding-left: 16px;">
          <li><strong>추천 형식:</strong> "서울에서 좋은 [업종] 추천해줘"</li>
          <li><strong>예시 1:</strong> "한국에서 인기있는 핀테크 앱 알려줘"</li>
          <li><strong>예시 2:</strong> "중소기업용 CRM 소프트웨어 비교해줘"</li>
          <li><strong>예시 3:</strong> "건강 관리 앱 중에서 어떤 게 좋아?"</li>
        </ul>
        <p style="margin-top: 12px; font-size: 13px; opacity: 0.8;">구체적이고 자연스러운 질문일수록 더 정확한 가시성 분석이 가능합니다.</p>
      `,
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#expansion-selector',
    popover: {
      title: '쿼리 확장 수준',
      description: `
        <p>입력한 기본 쿼리를 AI가 자동으로 다양한 변형으로 확장합니다. 확장 수준이 높을수록 더 포괄적인 분석이 가능하지만, 크레딧 소모도 증가합니다.</p>
        <ul style="margin-top: 12px; padding-left: 16px;">
          <li><strong>기본 (5개):</strong> 핵심 변형만 생성 - 빠른 점검에 적합</li>
          <li><strong>표준 (10개):</strong> 균형잡힌 분석 - 대부분의 경우 추천</li>
          <li><strong>심층 (20개):</strong> 상세한 분석 - 중요한 의사결정 전 사용</li>
          <li><strong>포괄 (30개):</strong> 최대 범위 분석 - 정밀 진단 필요시</li>
        </ul>
        <p style="margin-top: 12px; font-size: 13px; opacity: 0.8;">처음에는 "표준" 수준으로 시작하고, 필요에 따라 조정하는 것을 권장합니다.</p>
      `,
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '#provider-checkboxes',
    popover: {
      title: 'AI 제공자 선택',
      description: `
        <p>어떤 AI 플랫폼에서 브랜드 가시성을 확인할지 선택합니다. 각 AI는 서로 다른 데이터 소스와 알고리즘을 사용하므로 결과가 다를 수 있습니다.</p>
        <ul style="margin-top: 12px; padding-left: 16px;">
          <li><strong>전체 선택 추천:</strong> 가장 정확한 종합 분석 가능</li>
          <li><strong>비용 절감:</strong> 중요한 2-3개만 선택하여 크레딧 절약</li>
          <li><strong>목적별 선택:</strong>
            <ul style="margin-top: 4px; padding-left: 16px;">
              <li>일반 사용자 타겟: OpenAI, Google Gemini</li>
              <li>전문가/개발자 타겟: Anthropic Claude</li>
              <li>정보 검색 타겟: Perplexity</li>
            </ul>
          </li>
        </ul>
        <p style="margin-top: 12px; font-size: 13px; opacity: 0.8;">선택한 제공자 수에 따라 필요한 크레딧이 계산됩니다.</p>
      `,
      side: 'left',
      align: 'center',
    },
  },
  {
    element: '#credit-estimation',
    popover: {
      title: '크레딧 예상',
      description: `
        <p>현재 설정에 따른 예상 크레딧 소모량을 실시간으로 확인할 수 있습니다.</p>
        <ul style="margin-top: 12px; padding-left: 16px;">
          <li><strong>계산 공식:</strong> 쿼리 수 × 제공자 수 = 총 크레딧</li>
          <li><strong>보유 크레딧:</strong> 현재 계정에 남은 크레딧 표시</li>
          <li><strong>부족 시:</strong> 크레딧 충전 페이지로 이동 가능</li>
        </ul>
        <p style="margin-top: 12px; font-size: 13px; opacity: 0.8;">무료 플랜은 매월 100 크레딧이 제공됩니다. 더 많은 분석이 필요하면 Pro 플랜을 고려해 보세요.</p>
      `,
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '#start-scan-button',
    popover: {
      title: '스캔 시작',
      description: `
        <p>모든 설정을 확인한 후 이 버튼을 클릭하면 스캔이 시작됩니다.</p>
        <ul style="margin-top: 12px; padding-left: 16px;">
          <li><strong>예상 소요 시간:</strong> 쿼리 수에 따라 1-5분</li>
          <li><strong>진행 상황:</strong> 실시간 진행률 표시</li>
          <li><strong>완료 알림:</strong> 스캔 완료 시 알림 제공</li>
        </ul>
        <p style="margin-top: 12px; font-size: 13px; opacity: 0.8;">스캔 중에도 다른 페이지를 탐색할 수 있으며, 완료 시 결과 페이지로 안내됩니다.</p>
      `,
      side: 'top',
      align: 'end',
    },
  },
];

// Results Tour Steps
export const resultsTourSteps: DriveStep[] = [
  {
    popover: {
      title: '스캔 결과 분석',
      description: `
        <p>AI 가시성 스캔이 완료되었습니다. 이 페이지에서 상세한 분석 결과를 확인할 수 있습니다.</p>
        <ul style="margin-top: 12px; padding-left: 16px;">
          <li><strong>종합 점수:</strong> 전체 가시성 점수 및 등급</li>
          <li><strong>AI별 결과:</strong> 각 제공자의 응답 분석</li>
          <li><strong>멘션 분석:</strong> 브랜드 언급 컨텍스트 확인</li>
          <li><strong>인사이트:</strong> AI가 도출한 개선 포인트</li>
        </ul>
      `,
      side: 'over',
      align: 'center',
    },
  },
  {
    element: '#result-summary',
    popover: {
      title: '결과 요약',
      description: `
        <p>스캔 결과의 핵심 지표를 한눈에 확인할 수 있습니다.</p>
        <ul style="margin-top: 12px; padding-left: 16px;">
          <li><strong>가시성 점수:</strong> 0-100점 사이의 종합 점수</li>
          <li><strong>멘션 비율:</strong> 전체 쿼리 중 브랜드가 언급된 비율</li>
          <li><strong>감성 분석:</strong> 긍정/중립/부정 비율</li>
          <li><strong>변화 추이:</strong> 이전 스캔 대비 변화</li>
        </ul>
        <p style="margin-top: 12px; font-size: 13px; opacity: 0.8;">점수 옆의 트렌드 화살표로 상승/하락 추세를 빠르게 파악하세요.</p>
      `,
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#mentions-list',
    popover: {
      title: '멘션 목록',
      description: `
        <p>AI가 귀하의 브랜드를 언급한 모든 응답을 상세히 확인할 수 있습니다.</p>
        <ul style="margin-top: 12px; padding-left: 16px;">
          <li><strong>원문 확인:</strong> AI의 전체 응답 텍스트 보기</li>
          <li><strong>컨텍스트 분석:</strong> 어떤 맥락에서 언급되었는지 파악</li>
          <li><strong>감성 태그:</strong> 각 멘션의 긍정/부정 판단</li>
          <li><strong>경쟁사 동반 언급:</strong> 함께 언급된 경쟁 브랜드 확인</li>
        </ul>
        <p style="margin-top: 12px; font-size: 13px; opacity: 0.8;">긍정적인 멘션이 많을수록 AI가 브랜드를 신뢰할만한 옵션으로 인식하고 있음을 의미합니다.</p>
      `,
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '#competitor-analysis',
    popover: {
      title: '경쟁사 분석',
      description: `
        <p>동일한 쿼리에서 경쟁사들이 어떻게 언급되었는지 비교 분석합니다.</p>
        <ul style="margin-top: 12px; padding-left: 16px;">
          <li><strong>언급 빈도:</strong> 경쟁사별 멘션 횟수 비교</li>
          <li><strong>포지셔닝:</strong> 1순위/2순위/3순위 추천 분포</li>
          <li><strong>강점 비교:</strong> AI가 인식하는 각 브랜드의 장점</li>
        </ul>
        <p style="margin-top: 12px; font-size: 13px; opacity: 0.8;">경쟁사가 언급되는 맥락을 분석하면 차별화 전략을 수립하는 데 도움이 됩니다.</p>
      `,
      side: 'right',
      align: 'center',
    },
  },
  {
    element: '#ai-insights',
    popover: {
      title: 'AI 인사이트',
      description: `
        <p>스캔 결과를 기반으로 AI가 자동 생성한 인사이트와 추천 사항입니다.</p>
        <ul style="margin-top: 12px; padding-left: 16px;">
          <li><strong>강점 분석:</strong> AI가 브랜드의 장점으로 인식하는 요소</li>
          <li><strong>개선 필요:</strong> 가시성 향상을 위해 보완해야 할 영역</li>
          <li><strong>기회 요소:</strong> 아직 활용되지 않은 성장 잠재력</li>
          <li><strong>위협 요인:</strong> 주의가 필요한 경쟁 환경 변화</li>
        </ul>
        <p style="margin-top: 12px; font-size: 13px; opacity: 0.8;">각 인사이트에는 구체적인 실행 방안이 포함되어 있습니다.</p>
      `,
      side: 'top',
      align: 'center',
    },
  },
];

// Settings Tour Steps
export const settingsTourSteps: DriveStep[] = [
  {
    popover: {
      title: '설정',
      description: `
        <p>판타스캔 AI의 모든 설정을 관리할 수 있습니다.</p>
        <ul style="margin-top: 12px; padding-left: 16px;">
          <li><strong>브랜드 관리:</strong> 브랜드 정보 및 경쟁사 설정</li>
          <li><strong>알림 설정:</strong> 이메일 및 푸시 알림 관리</li>
          <li><strong>API 설정:</strong> 외부 API 키 관리</li>
          <li><strong>계정 관리:</strong> 프로필 및 구독 정보</li>
        </ul>
      `,
      side: 'over',
      align: 'center',
    },
  },
  {
    element: '#brand-settings',
    popover: {
      title: '브랜드 설정',
      description: `
        <p>스캔에 사용되는 브랜드 정보를 관리합니다.</p>
        <ul style="margin-top: 12px; padding-left: 16px;">
          <li><strong>브랜드명:</strong> AI가 인식할 정확한 브랜드 이름</li>
          <li><strong>대체 이름:</strong> 약어, 별칭 등 추가 인식 키워드</li>
          <li><strong>업종:</strong> 벤치마크 비교를 위한 산업 분류</li>
          <li><strong>경쟁사:</strong> 비교 분석할 경쟁 브랜드 목록</li>
        </ul>
        <p style="margin-top: 12px; font-size: 13px; opacity: 0.8;">정확한 브랜드 정보 입력이 분석 정확도를 높이는 핵심입니다.</p>
      `,
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '#notification-settings',
    popover: {
      title: '알림 설정',
      description: `
        <p>중요한 변화가 있을 때 알림을 받을 방법을 설정합니다.</p>
        <ul style="margin-top: 12px; padding-left: 16px;">
          <li><strong>스캔 완료:</strong> 스캔이 완료되면 알림</li>
          <li><strong>점수 변화:</strong> 가시성 점수가 크게 변동하면 알림</li>
          <li><strong>주간 리포트:</strong> 매주 요약 리포트 수신</li>
          <li><strong>긴급 알림:</strong> 급격한 순위 하락 시 즉시 알림</li>
        </ul>
      `,
      side: 'left',
      align: 'center',
    },
  },
];

// Get tour by ID
export const getTourSteps = (tourId: TourId): DriveStep[] => {
  switch (tourId) {
    case 'dashboard':
      return dashboardTourSteps;
    case 'scan':
      return scanTourSteps;
    case 'results':
      return resultsTourSteps;
    case 'settings':
      return settingsTourSteps;
    default:
      return [];
  }
};

// Get tour ID from pathname
export const getTourIdFromPath = (pathname: string): TourId | null => {
  if (pathname === '/dashboard' || pathname === '/') {
    return 'dashboard';
  }
  if (pathname.startsWith('/scan/new')) {
    return 'scan';
  }
  if (pathname.match(/^\/scan\/[^/]+$/)) {
    return 'results';
  }
  if (pathname.startsWith('/settings')) {
    return 'settings';
  }
  return null;
};
