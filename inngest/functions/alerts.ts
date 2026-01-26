import { inngest } from '../client';

/**
 * Visibility Change Alert Function
 * Triggered when brand visibility changes significantly
 */
export const visibilityAlertFunction = inngest.createFunction(
  {
    id: 'visibility-change-alert',
    name: 'Visibility Change Alert',
    retries: 3,
  },
  { event: 'alert/visibility.changed' },
  async ({ event, step }) => {
    const { brandId, previousScore, currentScore, changePercent, userId } = event.data;

    // Determine alert severity
    const severity = await step.run('determine-severity', async () => {
      const absChange = Math.abs(changePercent);

      if (absChange >= 20) return 'critical';
      if (absChange >= 10) return 'warning';
      return 'info';
    });

    // Step 1: Fetch user notification preferences
    const userPrefs = await step.run('fetch-user-preferences', async () => {
      console.log(`Fetching notification preferences for user: ${userId}`);
      // TODO: Fetch from Supabase
      return {
        emailEnabled: true,
        pushEnabled: false,
        slackEnabled: false,
        minSeverity: 'warning' as 'info' | 'warning' | 'critical',
      };
    });

    // Check if we should send notification based on severity
    const shouldNotify = await step.run('check-notification-threshold', async () => {
      const severityLevels = { info: 0, warning: 1, critical: 2 };
      return severityLevels[severity] >= severityLevels[userPrefs.minSeverity];
    });

    if (!shouldNotify) {
      return {
        success: true,
        notified: false,
        reason: 'Below notification threshold',
      };
    }

    // Step 2: Prepare notification content
    const notificationContent = await step.run('prepare-notification', async () => {
      const direction = changePercent > 0 ? 'increased' : 'decreased';

      return {
        title: `Brand Visibility ${direction.charAt(0).toUpperCase() + direction.slice(1)}`,
        body: `Your brand visibility has ${direction} by ${Math.abs(changePercent).toFixed(1)}%. Previous: ${previousScore.toFixed(1)}, Current: ${currentScore.toFixed(1)}`,
        severity,
        brandId,
        data: {
          previousScore,
          currentScore,
          changePercent,
        },
      };
    });

    // Step 3: Send notifications based on preferences
    const notificationResults = {
      email: false,
      push: false,
      slack: false,
    };

    if (userPrefs.emailEnabled) {
      await step.run('send-email-notification', async () => {
        console.log('Sending email notification:', notificationContent.title);
        // TODO: Integrate with email service (e.g., Resend, SendGrid)
        notificationResults.email = true;
        return { sent: true };
      });
    }

    if (userPrefs.pushEnabled) {
      await step.run('send-push-notification', async () => {
        console.log('Sending push notification:', notificationContent.title);
        // TODO: Integrate with push notification service
        notificationResults.push = true;
        return { sent: true };
      });
    }

    if (userPrefs.slackEnabled) {
      await step.run('send-slack-notification', async () => {
        console.log('Sending Slack notification:', notificationContent.title);
        // TODO: Integrate with Slack webhook
        notificationResults.slack = true;
        return { sent: true };
      });
    }

    // Step 4: Log notification
    await step.run('log-notification', async () => {
      console.log('Logging notification to database');
      // TODO: Store in Supabase notifications table
      return { logged: true };
    });

    return {
      success: true,
      notified: true,
      severity,
      channels: notificationResults,
      content: notificationContent,
    };
  }
);

/**
 * Check for Visibility Anomalies
 * Runs every hour to detect unusual visibility changes
 */
export const visibilityAnomalyCheckFunction = inngest.createFunction(
  {
    id: 'visibility-anomaly-check',
    name: 'Visibility Anomaly Check',
  },
  { cron: 'TZ=Asia/Seoul 0 * * * *' },
  async ({ step }) => {
    // Fetch recent scans with significant changes
    const anomalies = await step.run('detect-anomalies', async () => {
      console.log('Checking for visibility anomalies');
      // TODO: Query Supabase for brands with >10% change in last hour
      return [] as Array<{
        brandId: string;
        userId: string;
        previousScore: number;
        currentScore: number;
        changePercent: number;
      }>;
    });

    // Trigger alerts for each anomaly
    if (anomalies.length > 0) {
      await step.sendEvent(
        'trigger-anomaly-alerts',
        anomalies.map((anomaly) => ({
          name: 'alert/visibility.changed' as const,
          data: anomaly,
        }))
      );
    }

    return {
      success: true,
      anomaliesDetected: anomalies.length,
      checkedAt: new Date().toISOString(),
    };
  }
);
