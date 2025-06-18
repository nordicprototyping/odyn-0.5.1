/*
  # Update Risk Categories for Physical Risks

  1. Schema Changes
    - Update the risk_category enum to focus on physical risks
    - Add mitigations support to risks table
    - Update existing data to map to new categories

  2. Data Migration
    - Map existing risk categories to new physical risk categories
    - Ensure data integrity during migration
*/

-- Create a temporary type for the new risk categories
CREATE TYPE risk_category_new AS ENUM (
  'physical_security_vulnerabilities',
  'environmental_hazards',
  'natural_disasters',
  'infrastructure_failure',
  'personnel_safety_security',
  'asset_damage_loss'
);

-- Create a function to migrate the data
CREATE OR REPLACE FUNCTION migrate_risk_categories() RETURNS void AS $$
DECLARE
  risk_record RECORD;
BEGIN
  -- For each risk, update the category
  FOR risk_record IN SELECT id, category FROM risks LOOP
    -- Map old categories to new physical risk categories
    UPDATE risks 
    SET category = CASE
      WHEN risk_record.category = 'security' THEN 'physical_security_vulnerabilities'::risk_category_new
      WHEN risk_record.category = 'environmental' THEN 'environmental_hazards'::risk_category_new
      WHEN risk_record.category = 'operational' THEN 'infrastructure_failure'::risk_category_new
      WHEN risk_record.category = 'compliance' THEN 'physical_security_vulnerabilities'::risk_category_new
      WHEN risk_record.category = 'strategic' THEN 'personnel_safety_security'::risk_category_new
      WHEN risk_record.category = 'technical' THEN 'infrastructure_failure'::risk_category_new
      WHEN risk_record.category = 'financial' THEN 'asset_damage_loss'::risk_category_new
      WHEN risk_record.category = 'reputational' THEN 'personnel_safety_security'::risk_category_new
      ELSE 'physical_security_vulnerabilities'::risk_category_new -- Default fallback
    END
    WHERE id = risk_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a temporary column for the new category type
ALTER TABLE risks ADD COLUMN temp_category risk_category_new;

-- Update the temporary column with mapped values
UPDATE risks 
SET temp_category = CASE
  WHEN category = 'security' THEN 'physical_security_vulnerabilities'::risk_category_new
  WHEN category = 'environmental' THEN 'environmental_hazards'::risk_category_new
  WHEN category = 'operational' THEN 'infrastructure_failure'::risk_category_new
  WHEN category = 'compliance' THEN 'physical_security_vulnerabilities'::risk_category_new
  WHEN category = 'strategic' THEN 'personnel_safety_security'::risk_category_new
  WHEN category = 'technical' THEN 'infrastructure_failure'::risk_category_new
  WHEN category = 'financial' THEN 'asset_damage_loss'::risk_category_new
  WHEN category = 'reputational' THEN 'personnel_safety_security'::risk_category_new
  ELSE 'physical_security_vulnerabilities'::risk_category_new -- Default fallback
END;

-- Drop the old category column and rename the temporary column
ALTER TABLE risks DROP COLUMN category;
ALTER TABLE risks RENAME COLUMN temp_category TO category;

-- Drop the old type and rename the new one
DROP TYPE risk_category;
ALTER TYPE risk_category_new RENAME TO risk_category;

-- Update the risk_score calculation function to handle the new categories
CREATE OR REPLACE FUNCTION update_risk_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.risk_score := calculate_risk_score(NEW.impact, NEW.likelihood);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;