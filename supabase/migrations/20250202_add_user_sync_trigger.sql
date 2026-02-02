-- Migration: Add User Sync Trigger
-- Description: Automatically creates a user record when someone signs up via Supabase Auth
-- Date: 2025-02-02

-- ============================================================
-- FUNCTION: Handle New User Signup
-- ============================================================
-- This function is called when a new user signs up via Supabase Auth
-- It creates a corresponding record in the public.users table

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, plan, credits, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'free',
    100,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRIGGER: On Auth User Created
-- ============================================================
-- Drop the trigger if it already exists to avoid errors
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- BACKFILL: Sync Existing Auth Users to Public Users
-- ============================================================
-- This ensures all existing auth users have a corresponding public user record

INSERT INTO public.users (id, email, full_name, plan, credits, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  'free',
  100,
  COALESCE(au.created_at, NOW()),
  NOW()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- UPDATE RLS POLICY: Allow users to insert their own record
-- ============================================================
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own record" ON users;

-- Allow users to insert their own record (needed for fallback in code)
CREATE POLICY "Users can insert their own record"
  ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);
