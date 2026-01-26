// Sentry client-side configuration for Fantascan AI
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Enable Session Replay in production
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry
  debug: false,

  // Don't send errors in development
  enabled: process.env.NODE_ENV === 'production',

  // Configure environment
  environment: process.env.NODE_ENV,

  // Set a release identifier
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'development',

  // Configure integrations
  integrations: [
    Sentry.replayIntegration({
      // Mask all text content
      maskAllText: true,
      // Block all media elements
      blockAllMedia: true,
    }),
    // Browser tracing for performance
    Sentry.browserTracingIntegration(),
    // Browser profiling for detailed performance analysis
    Sentry.browserProfilingIntegration(),
  ],

  // Enable profiling for traces
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Ignore certain errors
  ignoreErrors: [
    // Browser extensions
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    // Network errors
    'Failed to fetch',
    'NetworkError',
    'Load failed',
    // Third-party scripts
    /^Script error\.?$/,
  ],

  // Don't send PII data
  beforeSend(event) {
    // Sanitize user data
    if (event.user) {
      delete event.user.ip_address;
    }
    return event;
  },
});
