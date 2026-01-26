// Centralized error handling for Fantascan AI

export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

// Authentication Errors
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super('UNAUTHORIZED', 401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super('FORBIDDEN', 403, message);
  }
}

// Resource Errors
export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super('NOT_FOUND', 404, `${resource} not found`);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super('CONFLICT', 409, message);
  }
}

// Business Logic Errors
export class InsufficientCreditsError extends AppError {
  constructor(required: number, available: number) {
    super('INSUFFICIENT_CREDITS', 402, 'Not enough credits', {
      required,
      available,
    });
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super('RATE_LIMIT_EXCEEDED', 429, 'Too many requests', {
      retryAfter,
    });
  }
}

export class QuotaExceededError extends AppError {
  constructor(resource: string) {
    super('QUOTA_EXCEEDED', 429, `${resource} quota exceeded`);
  }
}

// Validation Errors
export class ValidationError extends AppError {
  constructor(errors: Record<string, string[]>) {
    super('VALIDATION_ERROR', 400, 'Validation failed', { errors });
  }
}

// Provider Errors
export class ProviderError extends AppError {
  constructor(provider: string, message: string, details?: Record<string, unknown>) {
    super('PROVIDER_ERROR', 502, `${provider}: ${message}`, details);
  }
}

export class ProviderTimeoutError extends AppError {
  public readonly provider: string;
  public readonly timeoutMs: number;

  constructor(provider: string, timeoutMs: number) {
    super('PROVIDER_TIMEOUT', 504, `${provider} request timed out`, {
      provider,
      timeoutMs,
    });
    this.provider = provider;
    this.timeoutMs = timeoutMs;
  }
}

// Internal Errors
export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super('INTERNAL_ERROR', 500, message);
  }
}

export class DatabaseError extends AppError {
  constructor(operation: string, details?: Record<string, unknown>) {
    super('DATABASE_ERROR', 500, `Database ${operation} failed`, details);
  }
}

// Error type guard
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

// Error response helper
export function errorResponse(error: unknown): { json: object; status: number } {
  if (isAppError(error)) {
    return {
      json: error.toJSON(),
      status: error.statusCode,
    };
  }

  // Log unexpected errors
  console.error('Unexpected error:', error);

  return {
    json: { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    status: 500,
  };
}
