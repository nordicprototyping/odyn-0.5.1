/*
  # Update Risk Category Enum Values

  1. New Enum Values
    - Add new values to the risk_category enum type
    - Update existing risks to use the new categories
  
  2. Changes
    - Add 'physical_security_vulnerabilities', 'environmental_hazards', 'natural_disasters',
      'infrastructure_failure', 'personnel_safety_security', 'asset_damage_loss' to risk_category
    - Map existing risks to the new categories
*/

-- Add new columns for temporary storage
ALTER TABLE risks ADD COLUMN temp_category TEXT;

-- Store current category values as text
UPDATE risks SET temp_category = category::TEXT;

-- Drop the existing column that uses the enum
ALTER TABLE risks DROP COLUMN category;

-- Add the new enum values to the type
ALTER TYPE risk_category ADD VALUE 'physical_security_vulnerabilities';
ALTER TYPE risk_category ADD VALUE 'environmental_hazards';
ALTER TYPE risk_category ADD VALUE 'natural_disasters';
ALTER TYPE risk_category ADD VALUE 'infrastructure_failure';
ALTER TYPE risk_category ADD VALUE 'personnel_safety_security';
ALTER TYPE risk_category ADD VALUE 'asset_damage_loss';

-- Add the column back with the updated enum type
ALTER TABLE risks ADD COLUMN category risk_category;

-- Map old values to new values
UPDATE risks SET category = 'physical_security_vulnerabilities'::risk_category 
WHERE temp_category IN ('security', 'operational', 'financial', 'strategic');

UPDATE risks SET category = 'environmental_hazards'::risk_category 
WHERE temp_category = 'environmental';

UPDATE risks SET category = 'infrastructure_failure'::risk_category 
WHERE temp_category = 'technical';

UPDATE risks SET category = 'personnel_safety_security'::risk_category 
WHERE temp_category IN ('compliance', 'reputational');

-- Set a default for any unmapped categories
UPDATE risks SET category = 'physical_security_vulnerabilities'::risk_category 
WHERE category IS NULL;

-- Make the column NOT NULL again if it was before
ALTER TABLE risks ALTER COLUMN category SET NOT NULL;

-- Clean up the temporary column
ALTER TABLE risks DROP COLUMN temp_category;

-- Add new fields for AI-generated risks
ALTER TABLE risks ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS ai_confidence INTEGER;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS ai_detection_date TIMESTAMPTZ;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS source_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS source_personnel_id UUID REFERENCES personnel_details(id) ON DELETE SET NULL;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS source_incident_id UUID REFERENCES incident_reports(id) ON DELETE SET NULL;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS source_travel_plan_id UUID REFERENCES travel_plans(id) ON DELETE SET NULL;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_risks_is_ai_generated ON risks(is_ai_generated);
CREATE INDEX IF NOT EXISTS idx_risks_ai_detection_date ON risks(ai_detection_date);
CREATE INDEX IF NOT EXISTS idx_risks_source_asset_id ON risks(source_asset_id);
CREATE INDEX IF NOT EXISTS idx_risks_source_personnel_id ON risks(source_personnel_id);
CREATE INDEX IF NOT EXISTS idx_risks_source_incident_id ON risks(source_incident_id);
CREATE INDEX IF NOT EXISTS idx_risks_source_travel_plan_id ON risks(source_travel_plan_id);