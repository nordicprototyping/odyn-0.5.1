-- This migration modifies the RLS policies for organizations table
-- We're removing the policy that allows any authenticated user to create organizations
-- Instead, we'll use a dedicated Edge Function with service role access

-- Drop the existing policy if it exists
DROP POLICY IF EXISTS "Authenticated users can create organizations during signup" ON organizations;

-- Add a policy that allows super admins to manage organizations
CREATE POLICY "Super admins can manage organizations"
  ON organizations
  FOR ALL
  TO authenticated
  USING (get_my_user_role() = 'super_admin')
  WITH CHECK (get_my_user_role() = 'super_admin');

-- Add a policy that allows users to read their organization
CREATE POLICY "Users can read their organization"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (id = get_my_organization_id());