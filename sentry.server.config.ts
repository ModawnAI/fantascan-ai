// Sentry server-side configuration for Fantascan AI
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry
  debug: false,

  // Don't send errors in development
  enabled: process.env.NODE_ENV === 'production',

  // Configure environment
  environment: process.env.NODE_ENV,

  // Set a release identifier
  release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',

  // Spotlight (Sentry for Development)
  spotlight: process.env.NODE_ENV === 'development',

  // Profile settings
  profilesSampleRate: 0.1,

  // Ignore certain errors
  ignoreErrors: [
    // Common non-actionable errors
    'ECONNRESET',
    'ETIMEDOUT',
    'socket hang up',
  ],
});
