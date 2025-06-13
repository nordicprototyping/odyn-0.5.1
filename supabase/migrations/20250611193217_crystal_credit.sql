-- This migration file addresses the "infinite recursion detected in policy for relation 'user_profiles'" error.
-- It removes an unnecessary policy and introduces a SECURITY DEFINER function to safely check user roles within RLS policies.

-- Create custom types (if not already created by previous migrations)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'manager', 'user');
  END IF;
END $$;

-- Create user_profiles table (if not already created by previous migrations)
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  role user_role DEFAULT 'user' NOT NULL,
  full_name text NOT NULL,
  department text,
  phone text,
  two_factor_enabled boolean DEFAULT false NOT NULL,
  two_factor_secret text,
  backup_codes text[],
  last_login timestamptz,
  failed_login_attempts integer DEFAULT 0 NOT NULL,
  account_locked_until timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create audit_logs table (if not already created by previous migrations)
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security (if not already enabled)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Remove the problematic "System can insert profiles" policy
-- This policy is not needed as the handle_new_user trigger (which is SECURITY DEFINER) handles initial profile creation.
DROP POLICY IF EXISTS "System can insert profiles" ON public.user_profiles;

-- Create a SECURITY DEFINER function to get the current user's role
-- This function bypasses RLS to safely retrieve the user's role for policy evaluation.
CREATE OR REPLACE FUNCTION public.get_my_user_role()
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_role_val user_role;
BEGIN
  SELECT role INTO user_role_val FROM public.user_profiles WHERE user_id = auth.uid();
  RETURN user_role_val;
END;
$$;

-- Grant execution to authenticated users for the new function
GRANT EXECUTE ON FUNCTION public.get_my_user_role() TO authenticated;

-- Update policies for user_profiles to use the new function
-- Users can read own profile (re-create to ensure order/consistency if needed, though it's unchanged)
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update own profile (re-create to ensure order/consistency if needed, though it's unchanged)
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all profiles (updated to use get_my_user_role)
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
CREATE POLICY "Admins can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_user_role() IN ('admin', 'super_admin')
  );

-- Admins can update user profiles (updated to use get_my_user_role)
DROP POLICY IF EXISTS "Admins can update user profiles" ON user_profiles;
CREATE POLICY "Admins can update user profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    public.get_my_user_role() IN ('admin', 'super_admin')
  );

-- Create policies for audit_logs (re-create to ensure order/consistency if needed)
DROP POLICY IF EXISTS "Admins can read audit logs" ON audit_logs;
CREATE POLICY "Admins can read audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_user_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "System can insert audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create function to automatically update updated_at timestamp (if not already created)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for user_profiles (if not already created)
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create user profile on signup (if not already created)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ language plpgsql security definer;

-- Create trigger for new user signup (if not already created)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance (if not already created)
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);