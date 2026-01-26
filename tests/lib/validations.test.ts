import { describe, it, expect } from 'vitest';
import {
  validate,
  createBrandSchema,
  updateBrandSchema,
  getBrandsQuerySchema,
  createScanSchema,
} from '@/lib/validations';
import { ValidationError } from '@/lib/errors';

describe('Brand Validation Schemas', () => {
  describe('createBrandSchema', () => {
    it('should validate a valid brand creation request', () => {
      const validData = {
        name: 'Test Brand',
        description: 'A test brand description',
        industry: 'saas',
        keywords: ['keyword1', 'keyword2'],
        competitors: ['competitor1'],
        isPrimary: false,
      };

      const result = validate(createBrandSchema, validData);
      expect(result.name).toBe('Test Brand');
      expect(result.industry).toBe('saas');
      expect(result.keywords).toEqual(['keyword1', 'keyword2']);
    });

    it('should apply defaults for optional fields', () => {
      const minimalData = {
        name: 'Test Brand',
        industry: 'fintech',
      };

      const result = validate(createBrandSchema, minimalData);
      expect(result.keywords).toEqual([]);
      expect(result.competitors).toEqual([]);
      expect(result.isPrimary).toBe(false);
    });

    it('should reject empty brand name', () => {
      const invalidData = {
        name: '',
        industry: 'saas',
      };

      expect(() => validate(createBrandSchema, invalidData)).toThrow(ValidationError);
    });

    it('should reject invalid industry', () => {
      const invalidData = {
        name: 'Test Brand',
        industry: 'invalid_industry',
      };

      expect(() => validate(createBrandSchema, invalidData)).toThrow(ValidationError);
    });

    it('should reject too many keywords', () => {
      const invalidData = {
        name: 'Test Brand',
        industry: 'saas',
        keywords: Array(21).fill('keyword'),
      };

      expect(() => validate(createBrandSchema, invalidData)).toThrow(ValidationError);
    });

    it('should reject too many competitors', () => {
      const invalidData = {
        name: 'Test Brand',
        industry: 'saas',
        competitors: Array(11).fill('competitor'),
      };

      expect(() => validate(createBrandSchema, invalidData)).toThrow(ValidationError);
    });
  });

  describe('updateBrandSchema', () => {
    it('should validate partial update with id', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Updated Brand Name',
      };

      const result = validate(updateBrandSchema, validData);
      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.name).toBe('Updated Brand Name');
    });

    it('should reject invalid UUID', () => {
      const invalidData = {
        id: 'not-a-uuid',
        name: 'Updated Brand Name',
      };

      expect(() => validate(updateBrandSchema, invalidData)).toThrow(ValidationError);
    });
  });

  describe('getBrandsQuerySchema', () => {
    it('should apply default pagination values', () => {
      const result = validate(getBrandsQuerySchema, {});
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    it('should coerce string values to numbers', () => {
      const result = validate(getBrandsQuerySchema, {
        limit: '25',
        offset: '10',
      });
      expect(result.limit).toBe(25);
      expect(result.offset).toBe(10);
    });

    it('should validate industry filter', () => {
      const result = validate(getBrandsQuerySchema, {
        industry: 'ecommerce',
      });
      expect(result.industry).toBe('ecommerce');
    });
  });
});

describe('Scan Validation Schemas', () => {
  describe('createScanSchema', () => {
    it('should validate a valid scan creation request', () => {
      const validData = {
        brandId: '123e4567-e89b-12d3-a456-426614174000',
        query: 'What are the best fintech apps?',
        providers: ['openai', 'claude'],
      };

      const result = validate(createScanSchema, validData);
      expect(result.brandId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.providers).toContain('openai');
    });

    it('should reject empty query', () => {
      const invalidData = {
        brandId: '123e4567-e89b-12d3-a456-426614174000',
        query: '',
        providers: ['openai'],
      };

      expect(() => validate(createScanSchema, invalidData)).toThrow(ValidationError);
    });

    it('should reject empty providers array', () => {
      const invalidData = {
        brandId: '123e4567-e89b-12d3-a456-426614174000',
        query: 'Test query',
        providers: [],
      };

      expect(() => validate(createScanSchema, invalidData)).toThrow(ValidationError);
    });

    it('should reject invalid provider', () => {
      const invalidData = {
        brandId: '123e4567-e89b-12d3-a456-426614174000',
        query: 'Test query',
        providers: ['invalid_provider'],
      };

      expect(() => validate(createScanSchema, invalidData)).toThrow(ValidationError);
    });
  });
});
