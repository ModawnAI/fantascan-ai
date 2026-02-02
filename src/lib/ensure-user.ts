import type { SupabaseClient, User } from '@supabase/supabase-js';
import { logger } from './logger';

/**
 * Ensures a user record exists in the public.users table.
 * This is a fallback mechanism in case the auth trigger hasn't run
 * or for existing users who don't have a public.users record.
 * 
 * @param supabase - The Supabase client
 * @param user - The authenticated user from auth.getUser()
 * @returns true if user exists or was created, false on error
 */
export async function ensureUserExists(
  supabase: SupabaseClient,
  user: User
): Promise<boolean> {
  try {
    // Check if user record already exists
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existingUser) {
      return true;
    }

    // If not found (PGRST116 = no rows returned), create the record
    if (selectError?.code === 'PGRST116' || !existingUser) {
      const { error: insertError } = await supabase.from('users').insert({
        id: user.id,
        email: user.email || '',
        full_name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          '',
        plan: 'free',
        credits: 100,
      });

      // Ignore duplicate key errors (user was created by another request)
      if (insertError && !insertError.message.includes('duplicate')) {
        logger.error('Failed to create user record', insertError, { userId: user.id });
        return false;
      }

      logger.info('Created user record', { userId: user.id });
      return true;
    }

    // Other errors
    if (selectError) {
      logger.error('Error checking user record', selectError, { userId: user.id });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('ensureUserExists error', error, { userId: user.id });
    return false;
  }
}
