import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/scans/route';

// Valid UUIDs for testing
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_BRAND_ID = '550e8400-e29b-41d4-a716-446655440001';
const TEST_SCAN_ID = '550e8400-e29b-41d4-a716-446655440002';

// Helper to create chainable mock
function createChainableMock(finalResult: unknown) {
  const chainMethods = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    single: vi.fn(),
    then: vi.fn(),
  };

  // Make each method return the chain object for chaining
  Object.keys(chainMethods).forEach((key) => {
    if (key === 'then') {
      // Make the chain thenable (awaitable) with the final result
      chainMethods[key].mockImplementation((resolve: (value: unknown) => void) => {
        resolve(finalResult);
      });
    } else {
      chainMethods[key].mockReturnValue(chainMethods);
    }
  });

  return chainMethods;
}

// Mock the Supabase server client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

// Mock Inngest
vi.mock('@inngest/index', () => ({
  inngest: {
    send: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock rate limiter
vi.mock('@/lib/rate-limit', () => ({
  rateLimiters: {
    scan: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Scans API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/scans', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/scans');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('UNAUTHORIZED');
    });

    it('returns scans list for authenticated user', async () => {
      const mockUser = { id: TEST_USER_ID, email: 'test@example.com' };
      const mockScans = [
        {
          id: TEST_SCAN_ID,
          brand_id: TEST_BRAND_ID,
          status: 'completed',
          providers: ['gemini', 'openai'],
          total_queries: 2,
          completed_queries: 2,
          credits_used: 3,
          created_at: '2024-01-01T00:00:00Z',
          completed_at: '2024-01-01T00:01:00Z',
        },
      ];

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockQuery = createChainableMock({
        data: mockScans,
        error: null,
        count: 1,
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new NextRequest('http://localhost:3000/api/scans');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.scans).toEqual(mockScans);
      expect(data.pagination).toBeDefined();
    });

    it('filters scans by brandId when provided', async () => {
      const mockUser = { id: TEST_USER_ID, email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockQuery = createChainableMock({
        data: [],
        error: null,
        count: 0,
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new NextRequest(
        `http://localhost:3000/api/scans?brandId=${TEST_BRAND_ID}`
      );
      await GET(request);

      // eq is called for user_id first, then for brand_id
      expect(mockQuery.eq).toHaveBeenCalledWith('brand_id', TEST_BRAND_ID);
    });

    it('filters scans by status when provided', async () => {
      const mockUser = { id: TEST_USER_ID, email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockQuery = createChainableMock({
        data: [],
        error: null,
        count: 0,
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new NextRequest(
        'http://localhost:3000/api/scans?status=completed'
      );
      await GET(request);

      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'completed');
    });
  });

  describe('POST /api/scans', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/scans', {
        method: 'POST',
        body: JSON.stringify({
          brandId: TEST_BRAND_ID,
          query: 'test query',
          providers: ['gemini'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('UNAUTHORIZED');
    });

    it('returns 404 when brand not found', async () => {
      const mockUser = { id: TEST_USER_ID, email: 'test@example.com' };
      const nonExistentBrandId = '550e8400-e29b-41d4-a716-446655449999';

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: 'Not found' },
        })
      );

      const request = new NextRequest('http://localhost:3000/api/scans', {
        method: 'POST',
        body: JSON.stringify({
          brandId: nonExistentBrandId,
          query: 'test query',
          providers: ['gemini'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('NOT_FOUND');
    });

    it('returns insufficient credits error when user has no credits', async () => {
      const mockUser = { id: TEST_USER_ID, email: 'test@example.com' };
      const mockBrand = { id: TEST_BRAND_ID, user_id: TEST_USER_ID };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock different tables returning different results
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'brands') {
          return createChainableMock({
            data: mockBrand,
            error: null,
          });
        }
        if (table === 'users') {
          return createChainableMock({
            data: { credits_remaining: 0 },
            error: null,
          });
        }
        return createChainableMock({ data: null, error: null });
      });

      const request = new NextRequest('http://localhost:3000/api/scans', {
        method: 'POST',
        body: JSON.stringify({
          brandId: TEST_BRAND_ID,
          query: 'test query',
          providers: ['gemini', 'openai'], // Would cost credits
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(402);
      expect(data.error).toBe('INSUFFICIENT_CREDITS');
    });

    it('returns validation error for missing required fields', async () => {
      const mockUser = { id: TEST_USER_ID, email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/scans', {
        method: 'POST',
        body: JSON.stringify({
          // Missing brandId, query, providers
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('returns validation error for invalid provider', async () => {
      const mockUser = { id: TEST_USER_ID, email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/scans', {
        method: 'POST',
        body: JSON.stringify({
          brandId: TEST_BRAND_ID,
          query: 'test query',
          providers: ['invalid-provider'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('returns validation error for invalid brandId format', async () => {
      const mockUser = { id: TEST_USER_ID, email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/scans', {
        method: 'POST',
        body: JSON.stringify({
          brandId: 'not-a-uuid',
          query: 'test query',
          providers: ['gemini'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });
  });
});
