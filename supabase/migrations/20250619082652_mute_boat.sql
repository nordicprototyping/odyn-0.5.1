/*
  # Add AI-generated risk fields

  1. New Columns
    - `is_ai_generated` (boolean, default FALSE) - Flag indicating if the risk was automatically detected by AI
    - `source_asset_id` (uuid, nullable) - Reference to an asset that is the source of this risk
    - `source_personnel_id` (uuid, nullable) - Reference to personnel that is the source of this risk
    - `source_incident_id` (uuid, nullable) - Reference to an incident that is the source of this risk
    - `source_travel_plan_id` (uuid, nullable) - Reference to a travel plan that is the source of this risk
    - `ai_confidence` (integer, nullable) - AI confidence score for this risk (0-100)
    - `ai_detection_date` (timestamp with time zone, nullable) - When the AI detected this risk
  
  2. Foreign Keys
    - Add foreign key from `source_asset_id` to `assets(id)` with ON DELETE SET NULL
    - Add foreign key from `source_personnel_id` to `personnel_details(id)` with ON DELETE SET NULL
    - Add foreign key from `source_incident_id` to `incident_reports(id)` with ON DELETE SET NULL
    - Add foreign key from `source_travel_plan_id` to `travel_plans(id)` with ON DELETE SET NULL
  
  3. Indexes
    - Add index on `is_ai_generated` for filtering AI vs. manual risks
    - Add indexes on all source ID columns for faster lookups
*/

-- Add new columns to risks table
ALTER TABLE risks 
ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS source_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_personnel_id UUID REFERENCES personnel_details(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_incident_id UUID REFERENCES incident_reports(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_travel_plan_id UUID REFERENCES travel_plans(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS ai_confidence INTEGER,
ADD COLUMN IF NOT EXISTS ai_detection_date TIMESTAMPTZ;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_risks_is_ai_generated ON risks(is_ai_generated);
CREATE INDEX IF NOT EXISTS idx_risks_source_asset_id ON risks(source_asset_id);
CREATE INDEX IF NOT EXISTS idx_risks_source_personnel_id ON risks(source_personnel_id);
CREATE INDEX IF NOT EXISTS idx_risks_source_incident_id ON risks(source_incident_id);
CREATE INDEX IF NOT EXISTS idx_risks_source_travel_plan_id ON risks(source_travel_plan_id);
CREATE INDEX IF NOT EXISTS idx_risks_ai_detection_date ON risks(ai_detection_date);