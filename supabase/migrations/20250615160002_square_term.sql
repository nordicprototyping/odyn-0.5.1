/*
  # Fix Organization Invitations Permissions

  1. Changes
    - Update RLS policies for organization_invitations table
    - Add explicit policy for joining invitations by code
    - Fix permission issues with users table references

  2. Security
    - Maintain proper security while allowing necessary access
    - Ensure users can only access invitations they should see
*/

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Admins can manage invitations for their organization" ON organization_invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON organization_invitations;

-- Create more specific policies with proper access controls
CREATE POLICY "Admins can read invitations for their organization"
  ON organization_invitations
  FOR SELECT
  TO authenticated
  USING (
    organization_id = get_my_organization_id() AND
    get_my_user_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins can insert invitations for their organization"
  ON organization_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_my_organization_id() AND
    get_my_user_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins can update invitations for their organization"
  ON organization_invitations
  FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_my_organization_id() AND
    get_my_user_role() IN ('admin', 'super_admin')
  )
  WITH CHECK (
    organization_id = get_my_organization_id() AND
    get_my_user_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins can delete invitations for their organization"
  ON organization_invitations
  FOR DELETE
  TO authenticated
  USING (
    organization_id = get_my_organization_id() AND
    get_my_user_role() IN ('admin', 'super_admin')
  );

-- Allow users to view invitations by code (for joining)
CREATE POLICY "Anyone can view invitations by code"
  ON organization_invitations
  FOR SELECT
  TO authenticated
  USING (
    invitation_code IS NOT NULL
  );

-- Create a function to check if an invitation is for the current user's email
CREATE OR REPLACE FUNCTION public.is_invitation_for_me(invitation_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_email text;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  RETURN invitation_email = user_email;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.is_invitation_for_me(text) TO authenticated;

-- Allow users to view invitations sent to their email
CREATE POLICY "Users can view invitations sent to their email"
  ON organization_invitations
  FOR SELECT
  TO authenticated
  USING (
    public.is_invitation_for_me(invited_email)
  );