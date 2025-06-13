/*
  # Multi-Tenancy Implementation with Organizations

  1. New Tables
    - `organizations`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `plan_type` (text)
      - `settings` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Schema Changes
    - Add `organization_id` to all tenant-aware tables
    - Update all RLS policies to filter by organization
    - Create helper functions for organization context

  3. Data Migration
    - Create default organization
    - Migrate existing data to default organization
    - Make organization_id NOT NULL after migration

  4. Security
    - Enable RLS on organizations table
    - Update all existing RLS policies to include organization filtering
    - Create organization-aware helper functions
*/

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  plan_type text NOT NULL DEFAULT 'starter',
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security on organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Create trigger for organizations updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add organization_id columns to all tenant-aware tables (nullable initially)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE personnel_details ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE travel_plans ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Check if risks table exists and add organization_id if it does
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'risks' AND table_schema = 'public') THEN
    ALTER TABLE risks ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create or update default organization for existing data
INSERT INTO organizations (name, plan_type, settings)
VALUES ('Default Organization', 'enterprise', '{"features": {"all": true}}')
ON CONFLICT (name) DO NOTHING;

-- Get the default organization ID and update all tables
DO $$
DECLARE
  default_org_id uuid;
BEGIN
  SELECT id INTO default_org_id FROM organizations WHERE name = 'Default Organization';
  
  -- Update user_profiles with default organization
  UPDATE user_profiles 
  SET organization_id = default_org_id 
  WHERE organization_id IS NULL;
  
  -- Update personnel_details with default organization
  UPDATE personnel_details 
  SET organization_id = default_org_id 
  WHERE organization_id IS NULL;
  
  -- Update incident_reports with default organization
  UPDATE incident_reports 
  SET organization_id = default_org_id 
  WHERE organization_id IS NULL;
  
  -- Update assets with default organization
  UPDATE assets 
  SET organization_id = default_org_id 
  WHERE organization_id IS NULL;
  
  -- Update travel_plans with default organization
  UPDATE travel_plans 
  SET organization_id = default_org_id 
  WHERE organization_id IS NULL;
  
  -- Update audit_logs with default organization
  UPDATE audit_logs 
  SET organization_id = default_org_id 
  WHERE organization_id IS NULL;
  
  -- Update risks table if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'risks' AND table_schema = 'public') THEN
    EXECUTE 'UPDATE risks SET organization_id = $1 WHERE organization_id IS NULL' USING default_org_id;
  END IF;
END $$;

-- Make organization_id NOT NULL after populating existing data
ALTER TABLE user_profiles ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE personnel_details ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE incident_reports ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE assets ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE travel_plans ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN organization_id SET NOT NULL;

-- Make risks.organization_id NOT NULL if table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'risks' AND table_schema = 'public') THEN
    ALTER TABLE risks ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;

-- Create function to get current user's organization ID
CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  org_id uuid;
BEGIN
  SELECT organization_id INTO org_id FROM public.user_profiles WHERE user_id = auth.uid();
  RETURN org_id;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_organization_id() TO authenticated;

-- Update handle_new_user function to assign organization
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  default_org_id uuid;
BEGIN
  -- Get or create default organization
  SELECT id INTO default_org_id FROM organizations WHERE name = 'Default Organization';
  
  -- If no default organization exists, create one
  IF default_org_id IS NULL THEN
    INSERT INTO organizations (name, plan_type, settings)
    VALUES ('Default Organization', 'enterprise', '{"features": {"all": true}}')
    RETURNING id INTO default_org_id;
  END IF;
  
  -- Create user profile with organization
  INSERT INTO public.user_profiles (user_id, full_name, organization_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    default_org_id
  );
  RETURN NEW;
END;
$$ language plpgsql security definer;

-- Create policies for organizations
CREATE POLICY "Users can read their organization"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    id = public.get_my_organization_id()
  );

CREATE POLICY "Super admins can manage organizations"
  ON organizations
  FOR ALL
  TO authenticated
  USING (public.get_my_user_role() = 'super_admin')
  WITH CHECK (public.get_my_user_role() = 'super_admin');

-- Update RLS policies for user_profiles
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND organization_id = public.get_my_organization_id());

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND organization_id = public.get_my_organization_id())
  WITH CHECK (auth.uid() = user_id AND organization_id = public.get_my_organization_id());

DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
CREATE POLICY "Admins can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_user_role() IN ('admin', 'super_admin') AND 
    organization_id = public.get_my_organization_id()
  );

DROP POLICY IF EXISTS "Admins can update user profiles" ON user_profiles;
CREATE POLICY "Admins can update user profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    public.get_my_user_role() IN ('admin', 'super_admin') AND 
    organization_id = public.get_my_organization_id()
  );

-- Update RLS policies for personnel_details
DROP POLICY IF EXISTS "Admins can read all personnel" ON personnel_details;
CREATE POLICY "Admins can read all personnel"
  ON personnel_details
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_user_role() IN ('admin', 'super_admin') AND
    organization_id = public.get_my_organization_id()
  );

DROP POLICY IF EXISTS "Admins can insert personnel" ON personnel_details;
CREATE POLICY "Admins can insert personnel"
  ON personnel_details
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_user_role() IN ('admin', 'super_admin') AND
    organization_id = public.get_my_organization_id()
  );

DROP POLICY IF EXISTS "Admins can update personnel" ON personnel_details;
CREATE POLICY "Admins can update personnel"
  ON personnel_details
  FOR UPDATE
  TO authenticated
  USING (
    public.get_my_user_role() IN ('admin', 'super_admin') AND
    organization_id = public.get_my_organization_id()
  );

DROP POLICY IF EXISTS "Admins can delete personnel" ON personnel_details;
CREATE POLICY "Admins can delete personnel"
  ON personnel_details
  FOR DELETE
  TO authenticated
  USING (
    public.get_my_user_role() IN ('admin', 'super_admin') AND
    organization_id = public.get_my_organization_id()
  );

-- Update RLS policies for incident_reports
DROP POLICY IF EXISTS "Users can read own incidents" ON incident_reports;
CREATE POLICY "Users can read own incidents"
  ON incident_reports
  FOR SELECT
  TO authenticated
  USING (
    reporter_user_id = auth.uid() AND
    organization_id = public.get_my_organization_id()
  );

DROP POLICY IF EXISTS "Admins can read all incidents" ON incident_reports;
CREATE POLICY "Admins can read all incidents"
  ON incident_reports
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_user_role() IN ('admin', 'super_admin', 'manager') AND
    organization_id = public.get_my_organization_id()
  );

DROP POLICY IF EXISTS "Authenticated users can create incidents" ON incident_reports;
CREATE POLICY "Authenticated users can create incidents"
  ON incident_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.get_my_organization_id());

DROP POLICY IF EXISTS "Admins can update all incidents" ON incident_reports;
CREATE POLICY "Admins can update all incidents"
  ON incident_reports
  FOR UPDATE
  TO authenticated
  USING (
    public.get_my_user_role() IN ('admin', 'super_admin') AND
    organization_id = public.get_my_organization_id()
  );

DROP POLICY IF EXISTS "Managers can update department incidents" ON incident_reports;
CREATE POLICY "Managers can update department incidents"
  ON incident_reports
  FOR UPDATE
  TO authenticated
  USING (
    public.get_my_user_role() = 'manager' AND 
    organization_id = public.get_my_organization_id() AND
    (department IN (
      SELECT up.department FROM user_profiles up 
      WHERE up.user_id = auth.uid() AND up.organization_id = public.get_my_organization_id()
    ) OR assigned_to IN (
      SELECT up.full_name FROM user_profiles up 
      WHERE up.user_id = auth.uid() AND up.organization_id = public.get_my_organization_id()
    ))
  );

DROP POLICY IF EXISTS "Admins can delete incidents" ON incident_reports;
CREATE POLICY "Admins can delete incidents"
  ON incident_reports
  FOR DELETE
  TO authenticated
  USING (
    public.get_my_user_role() IN ('admin', 'super_admin') AND
    organization_id = public.get_my_organization_id()
  );

-- Update RLS policies for assets
DROP POLICY IF EXISTS "Users can read assets" ON assets;
CREATE POLICY "Users can read assets"
  ON assets
  FOR SELECT
  TO authenticated
  USING (organization_id = public.get_my_organization_id());

DROP POLICY IF EXISTS "Managers can read department assets" ON assets;
CREATE POLICY "Managers can read department assets"
  ON assets
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_user_role() = 'manager' AND 
    organization_id = public.get_my_organization_id() AND
    (responsible_officer->>'department' IN (
      SELECT up.department FROM user_profiles up 
      WHERE up.user_id = auth.uid() AND up.organization_id = public.get_my_organization_id()
    ))
  );

DROP POLICY IF EXISTS "Admins can read all assets" ON assets;
CREATE POLICY "Admins can read all assets"
  ON assets
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_user_role() IN ('admin', 'super_admin') AND
    organization_id = public.get_my_organization_id()
  );

DROP POLICY IF EXISTS "Admins can insert assets" ON assets;
CREATE POLICY "Admins can insert assets"
  ON assets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_user_role() IN ('admin', 'super_admin') AND
    organization_id = public.get_my_organization_id()
  );

DROP POLICY IF EXISTS "Admins can update assets" ON assets;
CREATE POLICY "Admins can update assets"
  ON assets
  FOR UPDATE
  TO authenticated
  USING (
    public.get_my_user_role() IN ('admin', 'super_admin') AND
    organization_id = public.get_my_organization_id()
  );

DROP POLICY IF EXISTS "Admins can delete assets" ON assets;
CREATE POLICY "Admins can delete assets"
  ON assets
  FOR DELETE
  TO authenticated
  USING (
    public.get_my_user_role() IN ('admin', 'super_admin') AND
    organization_id = public.get_my_organization_id()
  );

-- Update RLS policies for travel_plans
DROP POLICY IF EXISTS "Users can read own travel plans" ON travel_plans;
CREATE POLICY "Users can read own travel plans"
  ON travel_plans
  FOR SELECT
  TO authenticated
  USING (
    traveler_user_id = auth.uid() AND
    organization_id = public.get_my_organization_id()
  );

DROP POLICY IF EXISTS "Managers can read department travel plans" ON travel_plans;
CREATE POLICY "Managers can read department travel plans"
  ON travel_plans
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_user_role() = 'manager' AND 
    organization_id = public.get_my_organization_id() AND
    traveler_department IN (
      SELECT up.department FROM user_profiles up 
      WHERE up.user_id = auth.uid() AND up.organization_id = public.get_my_organization_id()
    )
  );

DROP POLICY IF EXISTS "Admins can read all travel plans" ON travel_plans;
CREATE POLICY "Admins can read all travel plans"
  ON travel_plans
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_user_role() IN ('admin', 'super_admin') AND
    organization_id = public.get_my_organization_id()
  );

DROP POLICY IF EXISTS "Authenticated users can create travel plans" ON travel_plans;
CREATE POLICY "Authenticated users can create travel plans"
  ON travel_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.get_my_organization_id());

DROP POLICY IF EXISTS "Admins can update all travel plans" ON travel_plans;
CREATE POLICY "Admins can update all travel plans"
  ON travel_plans
  FOR UPDATE
  TO authenticated
  USING (
    public.get_my_user_role() IN ('admin', 'super_admin') AND
    organization_id = public.get_my_organization_id()
  );

DROP POLICY IF EXISTS "Managers can update department travel plans" ON travel_plans;
CREATE POLICY "Managers can update department travel plans"
  ON travel_plans
  FOR UPDATE
  TO authenticated
  USING (
    public.get_my_user_role() = 'manager' AND 
    organization_id = public.get_my_organization_id() AND
    traveler_department IN (
      SELECT up.department FROM user_profiles up 
      WHERE up.user_id = auth.uid() AND up.organization_id = public.get_my_organization_id()
    )
  );

DROP POLICY IF EXISTS "Users can update own travel plans" ON travel_plans;
CREATE POLICY "Users can update own travel plans"
  ON travel_plans
  FOR UPDATE
  TO authenticated
  USING (
    traveler_user_id = auth.uid() AND
    organization_id = public.get_my_organization_id()
  )
  WITH CHECK (
    traveler_user_id = auth.uid() AND
    organization_id = public.get_my_organization_id()
  );

DROP POLICY IF EXISTS "Admins can delete travel plans" ON travel_plans;
CREATE POLICY "Admins can delete travel plans"
  ON travel_plans
  FOR DELETE
  TO authenticated
  USING (
    public.get_my_user_role() IN ('admin', 'super_admin') AND
    organization_id = public.get_my_organization_id()
  );

-- Update RLS policies for audit_logs
DROP POLICY IF EXISTS "Admins can read audit logs" ON audit_logs;
CREATE POLICY "Admins can read audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_user_role() IN ('admin', 'super_admin') AND
    organization_id = public.get_my_organization_id()
  );

DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "System can insert audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.get_my_organization_id());

-- Update RLS policies for risks table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'risks' AND table_schema = 'public') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can read risks they own or identified" ON risks;
    DROP POLICY IF EXISTS "Managers can read all risks" ON risks;
    DROP POLICY IF EXISTS "Authenticated users can create risks" ON risks;
    DROP POLICY IF EXISTS "Users can update risks they own" ON risks;
    DROP POLICY IF EXISTS "Managers can update department risks" ON risks;
    DROP POLICY IF EXISTS "Admins can delete risks" ON risks;
    
    -- Create new organization-aware policies
    EXECUTE 'CREATE POLICY "Users can read risks they own or identified"
      ON risks
      FOR SELECT
      TO authenticated
      USING (
        (owner_user_id = auth.uid() OR identified_by_user_id = auth.uid()) AND
        organization_id = public.get_my_organization_id()
      )';
    
    EXECUTE 'CREATE POLICY "Managers can read all risks"
      ON risks
      FOR SELECT
      TO authenticated
      USING (
        public.get_my_user_role() IN (''manager'', ''admin'', ''super_admin'') AND
        organization_id = public.get_my_organization_id()
      )';
    
    EXECUTE 'CREATE POLICY "Authenticated users can create risks"
      ON risks
      FOR INSERT
      TO authenticated
      WITH CHECK (organization_id = public.get_my_organization_id())';
    
    EXECUTE 'CREATE POLICY "Users can update risks they own"
      ON risks
      FOR UPDATE
      TO authenticated
      USING (
        (owner_user_id = auth.uid() OR identified_by_user_id = auth.uid()) AND
        organization_id = public.get_my_organization_id()
      )';
    
    EXECUTE 'CREATE POLICY "Managers can update department risks"
      ON risks
      FOR UPDATE
      TO authenticated
      USING (
        public.get_my_user_role() IN (''manager'', ''admin'', ''super_admin'') AND
        organization_id = public.get_my_organization_id() AND
        (department IN (
          SELECT up.department FROM user_profiles up 
          WHERE up.user_id = auth.uid() AND up.organization_id = public.get_my_organization_id()
        ) OR public.get_my_user_role() IN (''admin'', ''super_admin''))
      )';
    
    EXECUTE 'CREATE POLICY "Admins can delete risks"
      ON risks
      FOR DELETE
      TO authenticated
      USING (
        public.get_my_user_role() IN (''admin'', ''super_admin'') AND
        organization_id = public.get_my_organization_id()
      )';
  END IF;
END $$;

-- Create indexes for organization_id columns
CREATE INDEX IF NOT EXISTS idx_user_profiles_organization_id ON user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_personnel_details_organization_id ON personnel_details(organization_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_organization_id ON incident_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_organization_id ON assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_travel_plans_organization_id ON travel_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);

-- Create index for risks table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'risks' AND table_schema = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_risks_organization_id ON risks(organization_id);
  END IF;
END $$;