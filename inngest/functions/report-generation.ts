import { inngest } from '../client';

/**
 * Report Generation Function
 * Triggered when a report is requested
 */
export const reportGenerationFunction = inngest.createFunction(
  {
    id: 'report-generation',
    name: 'Generate Visibility Report',
    retries: 2,
  },
  { event: 'report/generate.requested' },
  async ({ event, step }) => {
    const { brandId, userId, reportType, dateRange } = event.data;

    // Step 1: Fetch historical scan data
    const scanData = await step.run('fetch-scan-data', async () => {
      console.log(`Fetching scan data for brand: ${brandId}`);
      // TODO: Query Supabase for historical scans
      return [] as Array<{
        scanId: string;
        aeoScore: number;
        geoScore: number;
        seoScore: number;
        overallScore: number;
        timestamp: string;
      }>;
    });

    // Step 2: Calculate trends and statistics
    const statistics = await step.run('calculate-statistics', async () => {
      console.log('Calculating report statistics');
      // TODO: Implement statistics calculation
      return {
        averageScore: 0,
        trend: 'stable' as 'up' | 'down' | 'stable',
        changePercent: 0,
        topKeywords: [] as string[],
        recommendations: [] as string[],
      };
    });

    // Step 3: Generate report content
    const reportContent = await step.run('generate-report', async () => {
      console.log('Generating report content');
      // TODO: Use LLM to generate report narrative
      return {
        summary: '',
        sections: [] as Array<{ title: string; content: string }>,
        charts: [] as Array<{ type: string; data: unknown }>,
      };
    });

    // Step 4: Store report
    const report = await step.run('store-report', async () => {
      console.log('Storing report to Supabase');
      // TODO: Store in Supabase
      return {
        reportId: `report_${Date.now()}`,
        brandId,
        userId,
        reportType,
        dateRange,
        statistics,
        content: reportContent,
        generatedAt: new Date().toISOString(),
      };
    });

    // Step 5: Send notification
    await step.run('notify-user', async () => {
      console.log(`Notifying user ${userId} of report completion`);
      // TODO: Send notification via email or push
      return { notified: true };
    });

    return {
      success: true,
      reportId: report.reportId,
      generatedAt: report.generatedAt,
    };
  }
);

/**
 * Scheduled Weekly Report
 * Runs every Monday at 9 AM KST
 */
export const scheduledWeeklyReportFunction = inngest.createFunction(
  {
    id: 'scheduled-weekly-report',
    name: 'Scheduled Weekly Report Generation',
  },
  { cron: 'TZ=Asia/Seoul 0 9 * * 1' },
  async ({ step }) => {
    // Fetch all users with weekly report enabled
    const users = await step.run('fetch-report-users', async () => {
      console.log('Fetching users with weekly reports enabled');
      // TODO: Query Supabase for users with weekly reports
      return [] as Array<{
        userId: string;
        brandIds: string[];
      }>;
    });

    // Calculate date range for last week
    const dateRange = await step.run('calculate-date-range', async () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
      };
    });

    // Trigger reports for each user's brands
    const reportEvents = users.flatMap((user) =>
      user.brandIds.map((brandId) => ({
        name: 'report/generate.requested' as const,
        data: {
          brandId,
          userId: user.userId,
          reportType: 'weekly' as const,
          dateRange,
        },
      }))
    );

    if (reportEvents.length > 0) {
      await step.sendEvent('trigger-weekly-reports', reportEvents);
    }

    return {
      success: true,
      reportsTriggered: reportEvents.length,
      dateRange,
    };
  }
);
