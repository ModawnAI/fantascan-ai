import { describe, it, expect } from 'vitest';
import {
  AppError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InsufficientCreditsError,
  RateLimitError,
  ValidationError,
  ProviderError,
  ProviderTimeoutError,
  DatabaseError,
  InternalError,
  isAppError,
  errorResponse,
} from '@/lib/errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with all properties', () => {
      const error = new AppError('TEST_ERROR', 400, 'Test message', { key: 'value' });

      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Test message');
      expect(error.details).toEqual({ key: 'value' });
    });

    it('should convert to JSON correctly', () => {
      const error = new AppError('TEST_ERROR', 400, 'Test message', { key: 'value' });
      const json = error.toJSON();

      expect(json).toEqual({
        error: 'TEST_ERROR',
        message: 'Test message',
        details: { key: 'value' },
      });
    });
  });

  describe('UnauthorizedError', () => {
    it('should have correct status code and message', () => {
      const error = new UnauthorizedError();

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Authentication required');
    });

    it('should accept custom message', () => {
      const error = new UnauthorizedError('Custom auth message');
      expect(error.message).toBe('Custom auth message');
    });
  });

  describe('ForbiddenError', () => {
    it('should have correct status code', () => {
      const error = new ForbiddenError();

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });
  });

  describe('NotFoundError', () => {
    it('should include resource name in message', () => {
      const error = new NotFoundError('Brand');

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Brand not found');
    });
  });

  describe('ConflictError', () => {
    it('should have correct status code', () => {
      const error = new ConflictError('Resource already exists');

      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });
  });

  describe('InsufficientCreditsError', () => {
    it('should include credit details', () => {
      const error = new InsufficientCreditsError(10, 5);

      expect(error.statusCode).toBe(402);
      expect(error.details).toEqual({ required: 10, available: 5 });
    });
  });

  describe('RateLimitError', () => {
    it('should include retry after', () => {
      const error = new RateLimitError(60);

      expect(error.statusCode).toBe(429);
      expect(error.details).toEqual({ retryAfter: 60 });
    });
  });

  describe('ValidationError', () => {
    it('should include validation errors', () => {
      const errors = { name: ['Required'], email: ['Invalid format'] };
      const error = new ValidationError(errors);

      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ errors });
    });
  });

  describe('ProviderError', () => {
    it('should include provider name', () => {
      const error = new ProviderError('openai', 'API limit reached');

      expect(error.statusCode).toBe(502);
      expect(error.message).toBe('openai: API limit reached');
    });
  });

  describe('ProviderTimeoutError', () => {
    it('should include timeout details', () => {
      const error = new ProviderTimeoutError('claude', 30000);

      expect(error.statusCode).toBe(504);
      expect(error.details).toEqual({ provider: 'claude', timeoutMs: 30000 });
    });
  });

  describe('DatabaseError', () => {
    it('should include operation name', () => {
      const error = new DatabaseError('insert');

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Database insert failed');
    });
  });

  describe('InternalError', () => {
    it('should have default message', () => {
      const error = new InternalError();

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Internal server error');
    });
  });
});

describe('isAppError', () => {
  it('should return true for AppError instances', () => {
    expect(isAppError(new AppError('TEST', 400, 'Test'))).toBe(true);
    expect(isAppError(new UnauthorizedError())).toBe(true);
    expect(isAppError(new ValidationError({}))).toBe(true);
  });

  it('should return false for regular errors', () => {
    expect(isAppError(new Error('Test'))).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
    expect(isAppError('string error')).toBe(false);
  });
});

describe('errorResponse', () => {
  it('should handle AppError correctly', () => {
    const error = new NotFoundError('User');
    const response = errorResponse(error);

    expect(response.status).toBe(404);
    expect(response.json).toEqual({
      error: 'NOT_FOUND',
      message: 'User not found',
      details: undefined,
    });
  });

  it('should handle unknown errors as internal error', () => {
    const error = new Error('Unknown error');
    const response = errorResponse(error);

    expect(response.status).toBe(500);
    expect(response.json).toEqual({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    });
  });

  it('should handle non-Error values', () => {
    const response = errorResponse('string error');

    expect(response.status).toBe(500);
  });
});
