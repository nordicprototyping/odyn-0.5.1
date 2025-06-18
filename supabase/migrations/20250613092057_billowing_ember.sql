/*
  # Add Mitigations Column to Existing Tables

  1. Schema Changes
    - Add `mitigations` column (jsonb) to all relevant tables
    - Set default value to empty array
    - Add indexes for performance

  2. Tables Updated
    - `assets`
    - `personnel_details`
    - `incident_reports`
    - `travel_plans`
    - `risks`

  3. Performance
    - Add GIN indexes for JSONB columns to enable efficient querying
*/

-- Add mitigations column to assets table
ALTER TABLE assets ADD COLUMN IF NOT EXISTS mitigations jsonb DEFAULT '[]'::jsonb;

-- Add mitigations column to personnel_details table
ALTER TABLE personnel_details ADD COLUMN IF NOT EXISTS mitigations jsonb DEFAULT '[]'::jsonb;

-- Add mitigations column to incident_reports table
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS mitigations jsonb DEFAULT '[]'::jsonb;

-- Add mitigations column to travel_plans table
ALTER TABLE travel_plans ADD COLUMN IF NOT EXISTS mitigations jsonb DEFAULT '[]'::jsonb;

-- Add mitigations column to risks table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'risks' AND table_schema = 'public') THEN
    ALTER TABLE risks ADD COLUMN IF NOT EXISTS mitigations jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Create GIN indexes for efficient JSONB querying
CREATE INDEX IF NOT EXISTS idx_assets_mitigations ON assets USING GIN(mitigations);
CREATE INDEX IF NOT EXISTS idx_personnel_details_mitigations ON personnel_details USING GIN(mitigations);
CREATE INDEX IF NOT EXISTS idx_incident_reports_mitigations ON incident_reports USING GIN(mitigations);
CREATE INDEX IF NOT EXISTS idx_travel_plans_mitigations ON travel_plans USING GIN(mitigations);

-- Create index for risks table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'risks' AND table_schema = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_risks_mitigations ON risks USING GIN(mitigations);
  END IF;
END $$;