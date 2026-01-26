import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/brands/route';

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

// Mock rate limiter
vi.mock('@/lib/rate-limit', () => ({
  rateLimiters: {
    brand: vi.fn(),
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

describe('Brands API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/brands', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/brands');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('UNAUTHORIZED');
    });

    it('returns brands list for authenticated user', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockBrands = [
        {
          id: 'brand-1',
          name: 'Test Brand',
          industry: 'saas',
          is_primary: true,
          keywords: ['keyword1'],
          competitors: ['competitor1'],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockQuery = createChainableMock({
        data: mockBrands,
        error: null,
        count: 1,
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new NextRequest('http://localhost:3000/api/brands');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.brands).toEqual(mockBrands);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.total).toBe(1);
    });

    it('filters brands by industry when provided', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

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
        'http://localhost:3000/api/brands?industry=saas'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Verify eq was called with industry filter
      expect(mockQuery.eq).toHaveBeenCalledWith('industry', 'saas');
    });

    it('handles pagination parameters', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

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
        'http://localhost:3000/api/brands?limit=5&offset=10'
      );
      await GET(request);

      expect(mockQuery.range).toHaveBeenCalledWith(10, 14);
    });
  });

  describe('POST /api/brands', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/brands', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Brand',
          industry: 'saas',
          keywords: ['keyword1'],
          competitors: ['competitor1'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('UNAUTHORIZED');
    });

    it('creates a new brand successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockBrand = {
        id: 'brand-new',
        user_id: mockUser.id,
        name: 'New Brand',
        industry: 'fintech',
        keywords: ['banking', 'finance'],
        competitors: ['competitor1'],
        is_primary: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // First call: count check
      // Second call: insert
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Count check query
          return createChainableMock({
            count: 0,
            error: null,
          });
        } else {
          // Insert query
          return createChainableMock({
            data: mockBrand,
            error: null,
          });
        }
      });

      const request = new NextRequest('http://localhost:3000/api/brands', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Brand',
          industry: 'fintech',
          keywords: ['banking', 'finance'],
          competitors: ['competitor1'],
          isPrimary: false,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.brand).toBeDefined();
    });

    it('returns validation error for invalid industry', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/brands', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Brand',
          industry: 'invalid-industry',
          keywords: ['keyword1'],
          competitors: [],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('returns validation error for missing required fields', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/brands', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Brand',
          // Missing industry, keywords, competitors
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('returns conflict error when max brands reached', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock count check returning max limit
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          count: 10, // MAX_BRANDS_PER_USER
          error: null,
        })
      );

      const request = new NextRequest('http://localhost:3000/api/brands', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Brand',
          industry: 'saas',
          keywords: ['keyword1'],
          competitors: ['competitor1'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('CONFLICT');
    });
  });
});
