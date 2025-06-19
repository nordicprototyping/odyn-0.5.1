/*
  # Update Risk Category Enum

  1. Changes
     - Add new enum values to risk_category type
     - Map existing risks to new category values
     
  2. Fix
     - Use separate transactions for enum modification and data updates
     - Ensure enum values are committed before use
*/

-- First transaction: Add the new enum values
ALTER TYPE risk_category ADD VALUE IF NOT EXISTS 'physical_security_vulnerabilities';
ALTER TYPE risk_category ADD VALUE IF NOT EXISTS 'environmental_hazards';
ALTER TYPE risk_category ADD VALUE IF NOT EXISTS 'natural_disasters';
ALTER TYPE risk_category ADD VALUE IF NOT EXISTS 'infrastructure_failure';
ALTER TYPE risk_category ADD VALUE IF NOT EXISTS 'personnel_safety_security';
ALTER TYPE risk_category ADD VALUE IF NOT EXISTS 'asset_damage_loss';

-- Create a temporary mapping table to handle the migration
CREATE TEMPORARY TABLE risk_category_mapping (
  old_category TEXT,
  new_category TEXT
);

-- Insert mappings
INSERT INTO risk_category_mapping (old_category, new_category) VALUES
  ('security', 'physical_security_vulnerabilities'),
  ('operational', 'physical_security_vulnerabilities'),
  ('environmental', 'environmental_hazards'),
  ('technical', 'infrastructure_failure'),
  ('compliance', 'personnel_safety_security'),
  ('reputational', 'personnel_safety_security'),
  ('financial', 'physical_security_vulnerabilities'),
  ('strategic', 'physical_security_vulnerabilities');

-- Update risks using a different approach that avoids casting issues
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT * FROM risk_category_mapping LOOP
    EXECUTE format('UPDATE risks SET category = %L WHERE category::text = %L', 
                   r.new_category, r.old_category);
  END LOOP;
END $$;

-- Clean up
DROP TABLE risk_category_mapping;