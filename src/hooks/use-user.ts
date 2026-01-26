'use client';

import useSWR, { mutate } from 'swr';
import useSWRMutation from 'swr/mutation';
import { API, fetcher } from '@/lib/swr';
import type { User } from '@/types/database';
import { useCallback } from 'react';

interface UserResponse {
  user: User;
}

interface UpdateUserInput {
  companyName?: string;
}

/**
 * Hook for fetching the current user profile
 */
export function useUser() {
  const { data, error, isLoading, isValidating } = useSWR<UserResponse>(
    API.user,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // Cache for 30 seconds
      errorRetryCount: 2,
    }
  );

  return {
    user: data?.user,
    isLoading,
    isValidating,
    error,
    isAuthenticated: !!data?.user,
    mutate: () => mutate(API.user),
  };
}

/**
 * Hook for updating user profile with optimistic updates
 */
export function useUpdateUser() {
  const { trigger, isMutating, error, data, reset } = useSWRMutation<
    UserResponse,
    Error,
    string,
    UpdateUserInput
  >(API.user, (url, { arg }) =>
    fetcher(url, { method: 'PATCH', body: JSON.stringify(arg) })
  );

  const updateUser = useCallback(
    async (input: UpdateUserInput) => {
      // Store previous user for rollback
      let previousUser: User | undefined;

      // Optimistically update user cache
      await mutate(
        API.user,
        (current: UserResponse | undefined) => {
          if (!current) return current;
          previousUser = current.user;
          return {
            user: {
              ...current.user,
              full_name: input.companyName ?? current.user.full_name,
              updated_at: new Date().toISOString(),
            },
          };
        },
        { revalidate: false }
      );

      try {
        const result = await trigger(input);
        // Update with real data
        await mutate(API.user, result, { revalidate: false });
        return result;
      } catch (err) {
        // Rollback on error
        if (previousUser) {
          await mutate(API.user, { user: previousUser }, { revalidate: true });
        }
        throw err;
      }
    },
    [trigger]
  );

  return {
    updateUser,
    isUpdating: isMutating,
    error,
    data,
    reset,
  };
}

/**
 * Hook for user credits/subscription info
 */
export function useUserCredits() {
  const { data, error, isLoading } = useSWR<{ credits: number; plan: string }>(
    `${API.user}/credits`,
    fetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 60000, // Refresh every minute
    }
  );

  return {
    credits: data?.credits ?? 0,
    plan: data?.plan ?? 'free',
    isLoading,
    error,
    mutate: () => mutate(`${API.user}/credits`),
  };
}

/**
 * Prefetch user data
 */
export function prefetchUser() {
  return mutate(API.user, fetcher(API.user));
}
