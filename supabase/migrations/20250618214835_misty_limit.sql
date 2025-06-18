/*
  # Add location fields to incident_reports table

  1. New Columns
    - `location_asset_id` (uuid, nullable) - Reference to an asset where the incident occurred
    - `location_coordinates` (jsonb, nullable) - Geographical coordinates of the incident location
    - `involved_personnel_ids` (uuid[], nullable) - Array of personnel IDs involved in the incident
  
  2. Foreign Keys
    - Add foreign key from `location_asset_id` to `assets(id)` with ON DELETE SET NULL
  
  3. Indexes
    - Add index on `location_asset_id` for faster lookups
    - Add index on `location_coordinates` using GIN for JSON querying
    - Add index on `involved_personnel_ids` using GIN for array querying
*/

-- Add new columns to incident_reports table
ALTER TABLE incident_reports 
ADD COLUMN IF NOT EXISTS location_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS location_coordinates JSONB,
ADD COLUMN IF NOT EXISTS involved_personnel_ids UUID[];

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_incident_reports_location_asset_id ON incident_reports(location_asset_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_location_coordinates ON incident_reports USING GIN(location_coordinates);
CREATE INDEX IF NOT EXISTS idx_incident_reports_involved_personnel_ids ON incident_reports USING GIN(involved_personnel_ids);

-- Update RLS policies to include new columns
-- No need to modify existing policies as they're based on organization_id and user roles,
-- which still apply to the new columns