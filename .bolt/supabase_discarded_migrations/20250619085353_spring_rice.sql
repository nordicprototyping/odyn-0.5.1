/*
  # Update Risk Category Enum Values

  1. Database Changes
    - Update the risk_category enum to match application values
    - Update existing risks table to use the new enum values
    - Ensure compatibility with existing data

  2. Security
    - Maintain existing RLS policies
    - No changes to permissions
*/

-- First, add the new enum values that the application expects
ALTER TYPE risk_category ADD VALUE IF NOT EXISTS 'physical_security_vulnerabilities';
ALTER TYPE risk_category ADD VALUE IF NOT EXISTS 'environmental_hazards';
ALTER TYPE risk_category ADD VALUE IF NOT EXISTS 'natural_disasters';
ALTER TYPE risk_category ADD VALUE IF NOT EXISTS 'infrastructure_failure';
ALTER TYPE risk_category ADD VALUE IF NOT EXISTS 'personnel_safety_security';
ALTER TYPE risk_category ADD VALUE IF NOT EXISTS 'asset_damage_loss';

-- Update the risks table column to use the correct enum values
-- Note: We need to handle any existing data that might use the old enum values
DO $$
BEGIN
  -- Update any existing risks that might have old category values
  UPDATE risks SET category = 'physical_security_vulnerabilities'::risk_category 
  WHERE category::text IN ('security', 'operational');
  
  UPDATE risks SET category = 'environmental_hazards'::risk_category 
  WHERE category::text = 'environmental';
  
  UPDATE risks SET category = 'infrastructure_failure'::risk_category 
  WHERE category::text = 'technical';
  
  UPDATE risks SET category = 'personnel_safety_security'::risk_category 
  WHERE category::text IN ('compliance', 'reputational');
  
  -- Set default for any remaining unmapped categories
  UPDATE risks SET category = 'physical_security_vulnerabilities'::risk_category 
  WHERE category::text IN ('financial', 'strategic');
END $$;