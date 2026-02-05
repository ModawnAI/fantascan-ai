export * from './tours';

// Current tour version - increment when tours are significantly updated
export const TOUR_VERSION = 1;

// Local storage key for quick access (backup for DB)
export const ONBOARDING_STORAGE_KEY = 'fantascan_onboarding_status';

export interface OnboardingStatus {
  completed: boolean;
  completedAt: string | null;
  lastViewedAt: string | null;
  tourVersion: number;
  skipped: boolean;
  completedTours: string[];
}

export const getDefaultOnboardingStatus = (): OnboardingStatus => ({
  completed: false,
  completedAt: null,
  lastViewedAt: null,
  tourVersion: TOUR_VERSION,
  skipped: false,
  completedTours: [],
});

// Save to local storage as backup
export const saveOnboardingToStorage = (status: OnboardingStatus): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(status));
  }
};

// Load from local storage
export const loadOnboardingFromStorage = (): OnboardingStatus | null => {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored) as OnboardingStatus;
  } catch {
    return null;
  }
};
