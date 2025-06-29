/*
  # Fix organization RLS policies

  1. Changes
    - Removes the policy that allows any authenticated user to create organizations
    - Ensures super admins can manage organizations
    - Ensures users can read their own organization
  
  This migration uses conditional logic to check if policies exist before creating them
  to avoid "policy already exists" errors.
*/

-- Drop the existing policy if it exists
DROP POLICY IF EXISTS "Authenticated users can create organizations during signup" ON organizations;

-- Check if the super admin policy exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organizations' 
    AND policyname = 'Super admins can manage organizations'
  ) THEN
    -- Add a policy that allows super admins to manage organizations
    EXECUTE 'CREATE POLICY "Super admins can manage organizations"
      ON organizations
      FOR ALL
      TO authenticated
      USING (get_my_user_role() = ''super_admin'')
      WITH CHECK (get_my_user_role() = ''super_admin'')';
  END IF;
END
$$;

-- Check if the user read policy exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organizations' 
    AND policyname = 'Users can read their organization'
  ) THEN
    -- Add a policy that allows users to read their organization
    EXECUTE 'CREATE POLICY "Users can read their organization"
      ON organizations
      FOR SELECT
      TO authenticated
      USING (id = get_my_organization_id())';
  END IF;
END
$$;