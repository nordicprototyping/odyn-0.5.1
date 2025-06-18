/*
  # Enhance Incident Reports Schema

  1. Schema Changes
    - Add `location_asset_id` (uuid, foreign key to assets) column to incident_reports
    - Add `location_coordinates` (point, nullable) column to incident_reports
    - Add `involved_personnel_ids` (uuid array, nullable) column to incident_reports
    - Update existing RLS policies to include the new columns

  2. Data Migration
    - Maintain existing data integrity
    - Set default values for new columns

  3. Indexes
    - Add indexes for better join performance
*/

-- Add new columns to incident_reports
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS location_asset_id uuid REFERENCES assets(id) ON DELETE SET NULL;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS location_coordinates float[] DEFAULT NULL;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS involved_personnel_ids uuid[] DEFAULT '{}';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_incident_reports_location_asset_id ON incident_reports(location_asset_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_involved_personnel_ids ON incident_reports USING GIN(involved_personnel_ids);

-- Update existing RLS policies to include the new columns
-- No need to modify the policies as they apply to the entire row
-- But we'll ensure they're still valid

-- Verify and recreate policies if needed
DO $$ 
BEGIN
  -- Check if policies exist and recreate them if needed
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'incident_reports' AND policyname = 'Users can read own incidents') THEN
    CREATE POLICY "Users can read own incidents"
      ON incident_reports
      FOR SELECT
      TO authenticated
      USING (
        reporter_user_id = auth.uid() AND
        organization_id = get_my_organization_id()
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'incident_reports' AND policyname = 'Admins can read all incidents') THEN
    CREATE POLICY "Admins can read all incidents"
      ON incident_reports
      FOR SELECT
      TO authenticated
      USING (
        get_my_user_role() IN ('admin', 'super_admin', 'manager') AND
        organization_id = get_my_organization_id()
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'incident_reports' AND policyname = 'Authenticated users can create incidents') THEN
    CREATE POLICY "Authenticated users can create incidents"
      ON incident_reports
      FOR INSERT
      TO authenticated
      WITH CHECK (organization_id = get_my_organization_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'incident_reports' AND policyname = 'Admins can update all incidents') THEN
    CREATE POLICY "Admins can update all incidents"
      ON incident_reports
      FOR UPDATE
      TO authenticated
      USING (
        get_my_user_role() IN ('admin', 'super_admin') AND
        organization_id = get_my_organization_id()
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'incident_reports' AND policyname = 'Managers can update department incidents') THEN
    CREATE POLICY "Managers can update department incidents"
      ON incident_reports
      FOR UPDATE
      TO authenticated
      USING (
        get_my_user_role() = 'manager' AND 
        organization_id = get_my_organization_id() AND
        (department IN (
          SELECT up.department FROM user_profiles up 
          WHERE up.user_id = auth.uid() AND up.organization_id = get_my_organization_id()
        ) OR assigned_to IN (
          SELECT up.full_name FROM user_profiles up 
          WHERE up.user_id = auth.uid() AND up.organization_id = get_my_organization_id()
        ))
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'incident_reports' AND policyname = 'Admins can delete incidents') THEN
    CREATE POLICY "Admins can delete incidents"
      ON incident_reports
      FOR DELETE
      TO authenticated
      USING (
        get_my_user_role() IN ('admin', 'super_admin') AND
        organization_id = get_my_organization_id()
      );
  END IF;
END $$;

-- Add a comment to the table to document the changes
COMMENT ON TABLE incident_reports IS 'Incident reports with enhanced location and personnel tracking';