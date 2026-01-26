'use client';

import useSWR, { mutate, useSWRConfig } from 'swr';
import useSWRMutation from 'swr/mutation';
import { API, fetcher, postFetcher, getPaginatedKey } from '@/lib/swr';
import type { Brand, IndustryType } from '@/types/database';
import { useCallback } from 'react';

interface BrandsResponse {
  brands: Brand[];
  pagination: {
    limit: number;
    offset: number;
    total: number | null;
  };
}

interface BrandParams {
  limit?: number;
  offset?: number;
  industry?: IndustryType;
  [key: string]: string | number | undefined;
}

interface CreateBrandInput {
  name: string;
  description?: string;
  industry: IndustryType;
  keywords: string[];
  competitors: string[];
  isPrimary?: boolean;
}

interface UpdateBrandInput {
  name?: string;
  description?: string;
  industry?: IndustryType;
  keywords?: string[];
  competitors?: string[];
  isPrimary?: boolean;
}

/**
 * Hook for fetching all brands with pagination
 */
export function useBrands(params: BrandParams = {}) {
  const key = getPaginatedKey(API.brands, params);

  const { data, error, isLoading, isValidating } = useSWR<BrandsResponse>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  return {
    brands: data?.brands ?? [],
    pagination: data?.pagination,
    isLoading,
    isValidating,
    error,
    mutate: () => mutate(key),
  };
}

/**
 * Hook for fetching a single brand
 */
export function useBrand(id: string | null) {
  const { data, error, isLoading, isValidating } = useSWR<{ brand: Brand }>(
    id ? API.brand(id) : null,
    fetcher
  );

  return {
    brand: data?.brand,
    isLoading,
    isValidating,
    error,
    mutate: () => id && mutate(API.brand(id)),
  };
}

/**
 * Hook for creating a brand with optimistic updates
 */
export function useCreateBrand() {
  const { cache } = useSWRConfig();

  const { trigger, isMutating, error, data, reset } = useSWRMutation<
    { brand: Brand },
    Error,
    string,
    CreateBrandInput
  >(API.brands, (url, { arg }) => postFetcher(url, arg));

  const createBrand = useCallback(
    async (input: CreateBrandInput) => {
      // Create optimistic brand
      const optimisticBrand: Brand = {
        id: `temp-${Date.now()}`,
        user_id: '',
        name: input.name,
        description: input.description || null,
        industry: input.industry,
        keywords: input.keywords,
        competitors: input.competitors,
        is_primary: input.isPrimary || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Get all cache keys that match brands list
      const brandsListKey = API.brands;

      // Optimistically update all brand list caches
      await mutate(
        (key) => typeof key === 'string' && key.startsWith(brandsListKey),
        (current: BrandsResponse | undefined) => {
          if (!current) return current;
          return {
            ...current,
            brands: [optimisticBrand, ...current.brands],
            pagination: {
              ...current.pagination,
              total: current.pagination.total ? current.pagination.total + 1 : 1,
            },
          };
        },
        { revalidate: false }
      );

      try {
        const result = await trigger(input);

        // Replace optimistic brand with real data
        await mutate(
          (key) => typeof key === 'string' && key.startsWith(brandsListKey),
          (current: BrandsResponse | undefined) => {
            if (!current) return current;
            return {
              ...current,
              brands: current.brands.map((b) =>
                b.id === optimisticBrand.id ? result?.brand ?? b : b
              ),
            };
          },
          { revalidate: true }
        );

        return result;
      } catch (err) {
        // Rollback on error
        await mutate(
          (key) => typeof key === 'string' && key.startsWith(brandsListKey),
          (current: BrandsResponse | undefined) => {
            if (!current) return current;
            return {
              ...current,
              brands: current.brands.filter((b) => b.id !== optimisticBrand.id),
              pagination: {
                ...current.pagination,
                total: current.pagination.total ? current.pagination.total - 1 : 0,
              },
            };
          },
          { revalidate: true }
        );
        throw err;
      }
    },
    [trigger]
  );

  return {
    createBrand,
    isCreating: isMutating,
    error,
    data,
    reset,
  };
}

/**
 * Hook for updating a brand with optimistic updates
 */
export function useUpdateBrand(id: string) {
  const { trigger, isMutating, error, data, reset } = useSWRMutation<
    { brand: Brand },
    Error,
    string,
    UpdateBrandInput
  >(API.brand(id), (url, { arg }) =>
    fetcher(url, { method: 'PATCH', body: JSON.stringify(arg) })
  );

  const updateBrand = useCallback(
    async (input: UpdateBrandInput) => {
      const brandKey = API.brand(id);
      const brandsListKey = API.brands;

      // Store previous data for rollback
      let previousBrand: Brand | undefined;

      // Optimistically update the single brand cache
      await mutate(
        brandKey,
        (current: { brand: Brand } | undefined) => {
          if (!current) return current;
          previousBrand = current.brand;
          return {
            brand: {
              ...current.brand,
              ...input,
              is_primary: input.isPrimary ?? current.brand.is_primary,
              updated_at: new Date().toISOString(),
            },
          };
        },
        { revalidate: false }
      );

      // Optimistically update brand in list caches
      await mutate(
        (key) => typeof key === 'string' && key.startsWith(brandsListKey),
        (current: BrandsResponse | undefined) => {
          if (!current) return current;
          return {
            ...current,
            brands: current.brands.map((b) =>
              b.id === id
                ? {
                    ...b,
                    ...input,
                    is_primary: input.isPrimary ?? b.is_primary,
                    updated_at: new Date().toISOString(),
                  }
                : b
            ),
          };
        },
        { revalidate: false }
      );

      try {
        const result = await trigger(input);

        // Update with real data
        await mutate(brandKey, result, { revalidate: false });
        await mutate(
          (key) => typeof key === 'string' && key.startsWith(brandsListKey),
          undefined,
          { revalidate: true }
        );

        return result;
      } catch (err) {
        // Rollback on error
        if (previousBrand) {
          await mutate(brandKey, { brand: previousBrand }, { revalidate: true });
        }
        await mutate(
          (key) => typeof key === 'string' && key.startsWith(brandsListKey),
          undefined,
          { revalidate: true }
        );
        throw err;
      }
    },
    [id, trigger]
  );

  return {
    updateBrand,
    isUpdating: isMutating,
    error,
    data,
    reset,
  };
}

/**
 * Hook for deleting a brand with optimistic updates
 */
export function useDeleteBrand(id: string) {
  const { trigger, isMutating, error, reset } = useSWRMutation(
    API.brand(id),
    (url) => fetcher(url, { method: 'DELETE' })
  );

  const deleteBrand = useCallback(async () => {
    const brandsListKey = API.brands;

    // Store deleted brand for rollback
    let deletedBrand: Brand | undefined;
    let deletedIndex = -1;

    // Optimistically remove from list caches
    await mutate(
      (key) => typeof key === 'string' && key.startsWith(brandsListKey),
      (current: BrandsResponse | undefined) => {
        if (!current) return current;
        const index = current.brands.findIndex((b) => b.id === id);
        if (index !== -1) {
          deletedBrand = current.brands[index];
          deletedIndex = index;
        }
        return {
          ...current,
          brands: current.brands.filter((b) => b.id !== id),
          pagination: {
            ...current.pagination,
            total: current.pagination.total ? current.pagination.total - 1 : 0,
          },
        };
      },
      { revalidate: false }
    );

    try {
      await trigger();
      // Clear single brand cache
      await mutate(API.brand(id), undefined, { revalidate: false });
    } catch (err) {
      // Rollback on error - restore deleted brand
      if (deletedBrand) {
        await mutate(
          (key) => typeof key === 'string' && key.startsWith(brandsListKey),
          (current: BrandsResponse | undefined) => {
            if (!current) return current;
            const brands = [...current.brands];
            brands.splice(deletedIndex, 0, deletedBrand!);
            return {
              ...current,
              brands,
              pagination: {
                ...current.pagination,
                total: current.pagination.total ? current.pagination.total + 1 : 1,
              },
            };
          },
          { revalidate: true }
        );
      }
      throw err;
    }
  }, [id, trigger]);

  return {
    deleteBrand,
    isDeleting: isMutating,
    error,
    reset,
  };
}

/**
 * Prefetch brands data
 */
export function prefetchBrands(params: BrandParams = {}) {
  const key = getPaginatedKey(API.brands, params);
  return mutate(key, fetcher(key));
}
