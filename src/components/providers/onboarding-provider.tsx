'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import {
  getTourSteps,
  getTourIdFromPath,
  getDriverConfig,
  type TourId,
} from '@/lib/onboarding/tours';
import {
  TOUR_VERSION,
  type OnboardingStatus,
  getDefaultOnboardingStatus,
  saveOnboardingToStorage,
  loadOnboardingFromStorage,
} from '@/lib/onboarding';
import { createClient } from '@/lib/supabase/client';

interface OnboardingContextValue {
  isLoading: boolean;
  status: OnboardingStatus;
  currentTourId: TourId | null;
  startTour: (tourId?: TourId) => void;
  restartTour: (tourId?: TourId) => void;
  skipTour: () => void;
  completeTour: (tourId: TourId) => void;
  hasCompletedTour: (tourId: TourId) => boolean;
  resetOnboarding: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<OnboardingStatus>(getDefaultOnboardingStatus());
  const [driverInstance, setDriverInstance] = useState<Driver | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const currentTourId = getTourIdFromPath(pathname);

  // Fetch onboarding status from database
  useEffect(() => {
    const fetchStatus = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      setUserId(user.id);

      // Try to get from database first
      const { data: onboardingData } = await supabase
        .from('user_onboarding')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (onboardingData) {
        const dbStatus: OnboardingStatus = {
          completed: !!onboardingData.completed_at,
          completedAt: onboardingData.completed_at,
          lastViewedAt: onboardingData.last_viewed_at,
          tourVersion: onboardingData.tour_version,
          skipped: onboardingData.skipped,
          completedTours: onboardingData.completed_tours || [],
        };
        setStatus(dbStatus);
        saveOnboardingToStorage(dbStatus);
      } else {
        // Check local storage as backup
        const localStatus = loadOnboardingFromStorage();
        if (localStatus) {
          setStatus(localStatus);
        }
        
        // Create initial record in database
        await supabase.from('user_onboarding').insert({
          user_id: user.id,
          tour_version: TOUR_VERSION,
        });
      }

      setIsLoading(false);
    };

    fetchStatus();
  }, []);

  // Initialize driver.js with custom styling
  useEffect(() => {
    // Inject custom CSS for glass card design
    const styleId = 'fantascan-driver-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .fantascan-driver-popover {
          background: rgba(23, 23, 23, 0.95) !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
          border: 1px solid rgba(249, 115, 22, 0.3) !important;
          border-radius: 16px !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) !important;
          color: #ffffff !important;
          max-width: 400px !important;
        }
        
        .fantascan-driver-popover .driver-popover-title {
          font-size: 18px !important;
          font-weight: 700 !important;
          color: #f97316 !important;
          margin-bottom: 12px !important;
          padding-bottom: 12px !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        
        .fantascan-driver-popover .driver-popover-description {
          font-size: 14px !important;
          line-height: 1.7 !important;
          color: rgba(255, 255, 255, 0.9) !important;
        }
        
        .fantascan-driver-popover .driver-popover-description p {
          margin-bottom: 8px !important;
        }
        
        .fantascan-driver-popover .driver-popover-description ul {
          margin: 12px 0 !important;
          padding-left: 20px !important;
          list-style-type: none !important;
        }
        
        .fantascan-driver-popover .driver-popover-description ul li {
          position: relative;
          margin-bottom: 8px !important;
          padding-left: 16px !important;
        }
        
        .fantascan-driver-popover .driver-popover-description ul li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 8px;
          width: 6px;
          height: 6px;
          background: #f97316;
          border-radius: 50%;
        }
        
        .fantascan-driver-popover .driver-popover-description ul ul li::before {
          background: rgba(249, 115, 22, 0.5);
          width: 4px;
          height: 4px;
          top: 9px;
        }
        
        .fantascan-driver-popover .driver-popover-description strong {
          color: #f97316 !important;
          font-weight: 600 !important;
        }
        
        .fantascan-driver-popover .driver-popover-progress-text {
          color: rgba(255, 255, 255, 0.5) !important;
          font-size: 12px !important;
        }
        
        .fantascan-driver-popover .driver-popover-navigation-btns {
          gap: 8px !important;
        }
        
        .fantascan-driver-popover .driver-popover-navigation-btns button {
          padding: 8px 16px !important;
          border-radius: 8px !important;
          font-size: 13px !important;
          font-weight: 500 !important;
          transition: all 0.2s ease !important;
        }
        
        .fantascan-driver-popover .driver-popover-prev-btn {
          background: rgba(255, 255, 255, 0.1) !important;
          color: rgba(255, 255, 255, 0.8) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        
        .fantascan-driver-popover .driver-popover-prev-btn:hover {
          background: rgba(255, 255, 255, 0.15) !important;
          color: #ffffff !important;
        }
        
        .fantascan-driver-popover .driver-popover-next-btn,
        .fantascan-driver-popover .driver-popover-done-btn {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%) !important;
          color: #ffffff !important;
          border: none !important;
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3) !important;
        }
        
        .fantascan-driver-popover .driver-popover-next-btn:hover,
        .fantascan-driver-popover .driver-popover-done-btn:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 6px 16px rgba(249, 115, 22, 0.4) !important;
        }
        
        .fantascan-driver-popover .driver-popover-close-btn {
          color: rgba(255, 255, 255, 0.5) !important;
          transition: color 0.2s ease !important;
        }
        
        .fantascan-driver-popover .driver-popover-close-btn:hover {
          color: #ffffff !important;
        }
        
        .fantascan-driver-popover .driver-popover-arrow {
          border-color: rgba(23, 23, 23, 0.95) !important;
        }
        
        .fantascan-driver-popover .driver-popover-arrow-side-left {
          border-right-color: rgba(249, 115, 22, 0.3) !important;
        }
        
        .fantascan-driver-popover .driver-popover-arrow-side-right {
          border-left-color: rgba(249, 115, 22, 0.3) !important;
        }
        
        .fantascan-driver-popover .driver-popover-arrow-side-top {
          border-bottom-color: rgba(249, 115, 22, 0.3) !important;
        }
        
        .fantascan-driver-popover .driver-popover-arrow-side-bottom {
          border-top-color: rgba(249, 115, 22, 0.3) !important;
        }
        
        .driver-overlay {
          background-color: rgba(0, 0, 0, 0.75) !important;
        }
        
        .driver-active-element {
          box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.4) !important;
          border-radius: 12px !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Save status to database
  const saveStatusToDb = useCallback(async (newStatus: OnboardingStatus) => {
    if (!userId) return;

    const supabase = createClient();
    await supabase
      .from('user_onboarding')
      .update({
        completed_at: newStatus.completed ? new Date().toISOString() : null,
        last_viewed_at: new Date().toISOString(),
        tour_version: newStatus.tourVersion,
        skipped: newStatus.skipped,
        completed_tours: newStatus.completedTours,
      })
      .eq('user_id', userId);
  }, [userId]);

  // Start tour
  const startTour = useCallback((tourId?: TourId) => {
    const targetTourId = tourId || currentTourId;
    if (!targetTourId) return;

    const steps = getTourSteps(targetTourId);
    if (steps.length === 0) return;

    // Destroy existing driver if any
    if (driverInstance) {
      driverInstance.destroy();
    }

    const newDriver = driver({
      ...getDriverConfig(),
      steps,
      onDestroyStarted: () => {
        if (newDriver.hasNextStep()) {
          // User is closing the tour early
          const newStatus: OnboardingStatus = {
            ...status,
            lastViewedAt: new Date().toISOString(),
          };
          setStatus(newStatus);
          saveOnboardingToStorage(newStatus);
          saveStatusToDb(newStatus);
        }
        newDriver.destroy();
      },
      onDestroyed: () => {
        setDriverInstance(null);
      },
    });

    setDriverInstance(newDriver);
    
    // Small delay to ensure DOM elements are ready
    setTimeout(() => {
      newDriver.drive();
    }, 100);
  }, [currentTourId, driverInstance, status, saveStatusToDb]);

  // Restart tour (force start even if completed)
  const restartTour = useCallback((tourId?: TourId) => {
    startTour(tourId);
  }, [startTour]);

  // Skip tour
  const skipTour = useCallback(() => {
    if (driverInstance) {
      driverInstance.destroy();
    }

    const newStatus: OnboardingStatus = {
      ...status,
      skipped: true,
      lastViewedAt: new Date().toISOString(),
    };
    
    setStatus(newStatus);
    saveOnboardingToStorage(newStatus);
    saveStatusToDb(newStatus);
  }, [driverInstance, status, saveStatusToDb]);

  // Complete tour
  const completeTour = useCallback((tourId: TourId) => {
    const completedTours = status.completedTours.includes(tourId)
      ? status.completedTours
      : [...status.completedTours, tourId];

    const allToursCompleted = ['dashboard', 'scan', 'results', 'settings'].every(
      (t) => completedTours.includes(t)
    );

    const newStatus: OnboardingStatus = {
      ...status,
      completed: allToursCompleted,
      completedAt: allToursCompleted ? new Date().toISOString() : status.completedAt,
      lastViewedAt: new Date().toISOString(),
      completedTours,
    };

    setStatus(newStatus);
    saveOnboardingToStorage(newStatus);
    saveStatusToDb(newStatus);
  }, [status, saveStatusToDb]);

  // Check if tour is completed
  const hasCompletedTour = useCallback((tourId: TourId) => {
    return status.completedTours.includes(tourId);
  }, [status.completedTours]);

  // Reset onboarding
  const resetOnboarding = useCallback(async () => {
    const newStatus = getDefaultOnboardingStatus();
    setStatus(newStatus);
    saveOnboardingToStorage(newStatus);

    if (userId) {
      const supabase = createClient();
      await supabase
        .from('user_onboarding')
        .update({
          completed_at: null,
          last_viewed_at: new Date().toISOString(),
          tour_version: TOUR_VERSION,
          skipped: false,
          completed_tours: [],
        })
        .eq('user_id', userId);
    }
  }, [userId]);

  // Auto-start tour for new users on dashboard
  useEffect(() => {
    if (isLoading) return;
    if (status.completed || status.skipped) return;
    if (!currentTourId) return;
    if (status.completedTours.includes(currentTourId)) return;

    // Only auto-start on dashboard for first-time users
    if (currentTourId === 'dashboard' && !status.lastViewedAt) {
      // Delay to ensure page is fully loaded
      const timer = setTimeout(() => {
        startTour('dashboard');
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isLoading, status, currentTourId, startTour]);

  const value: OnboardingContextValue = {
    isLoading,
    status,
    currentTourId,
    startTour,
    restartTour,
    skipTour,
    completeTour,
    hasCompletedTour,
    resetOnboarding,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}
