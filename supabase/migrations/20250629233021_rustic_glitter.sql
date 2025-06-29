/*
  # Fix Organization Creation RLS Policy

  1. Problem
    - Current RLS policy only allows super_admins to create organizations
    - New users can't sign up because they need an organization first
    - Creates chicken-and-egg problem during user registration

  2. Solution
    - Add policy to allow authenticated users to create organizations during signup
    - This enables the initial organization creation for new users
    - Existing super admin policy remains for ongoing management

  3. Security
    - Policy is restricted to authenticated users only
    - Maintains security while enabling user registration flow
*/

-- Add policy to allow authenticated users to create organizations
-- This is needed for the initial signup flow where users create their first organization
CREATE POLICY "Authenticated users can create organizations during signup"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);