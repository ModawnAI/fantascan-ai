import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    database: HealthCheck;
    environment: HealthCheck;
  };
}

interface HealthCheck {
  status: 'pass' | 'fail';
  latencyMs?: number;
  message?: string;
}

export async function GET() {
  const startTime = Date.now();
  const checks: HealthStatus['checks'] = {
    database: { status: 'fail' },
    environment: { status: 'fail' },
  };

  // Check environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'OPENAI_API_KEY',
  ];

  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );

  if (missingEnvVars.length === 0) {
    checks.environment = { status: 'pass' };
  } else {
    checks.environment = {
      status: 'fail',
      message: `Missing: ${missingEnvVars.join(', ')}`,
    };
  }

  // Check database connection
  try {
    const dbStart = Date.now();
    const supabase = await createClient();

    // Simple query to verify connection
    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    const latencyMs = Date.now() - dbStart;

    if (error) {
      checks.database = {
        status: 'fail',
        latencyMs,
        message: error.message,
      };
    } else {
      checks.database = {
        status: 'pass',
        latencyMs,
      };
    }
  } catch (error) {
    checks.database = {
      status: 'fail',
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }

  // Determine overall status
  const allChecks = Object.values(checks);
  const failedChecks = allChecks.filter((c) => c.status === 'fail');

  let overallStatus: HealthStatus['status'];
  if (failedChecks.length === 0) {
    overallStatus = 'healthy';
  } else if (failedChecks.length < allChecks.length) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'unhealthy';
  }

  const healthStatus: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    checks,
  };

  const statusCode = overallStatus === 'healthy' ? 200 : 503;

  if (overallStatus !== 'healthy') {
    logger.warn('Health check degraded/unhealthy', {
      status: overallStatus,
      checks,
      durationMs: Date.now() - startTime,
    });
  }

  return NextResponse.json(healthStatus, { status: statusCode });
}
