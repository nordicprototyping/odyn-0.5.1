/*
  # Update Personnel Details Schema

  1. Schema Changes
    - Add date_of_birth column to personnel_details
    - Add work_asset_id column to personnel_details (reference to assets table)
    - Update emergency_contact structure to include address, city, country, coordinates
  
  2. Data Migration
    - Update existing records with sample date_of_birth values
    - Enhance emergency_contact data with address information
    - Try to match work_location with asset names for work_asset_id
*/

-- Add date_of_birth column to personnel_details
ALTER TABLE personnel_details ADD COLUMN IF NOT EXISTS date_of_birth date;

-- Add work_asset_id column to personnel_details
ALTER TABLE personnel_details ADD COLUMN IF NOT EXISTS work_asset_id uuid REFERENCES assets(id) ON DELETE SET NULL;

-- Create index for work_asset_id
CREATE INDEX IF NOT EXISTS idx_personnel_details_work_asset_id ON personnel_details(work_asset_id);

-- Update existing records to set work_asset_id based on work_location
-- This is a best-effort migration that tries to match work_location with asset names
DO $$
DECLARE
  person record;
  matching_asset_id uuid;
BEGIN
  FOR person IN SELECT id, work_location FROM personnel_details LOOP
    -- Try to find a matching asset by name
    SELECT id INTO matching_asset_id 
    FROM assets 
    WHERE name ILIKE person.work_location || '%' 
    LIMIT 1;
    
    -- Update the record if a match was found
    IF matching_asset_id IS NOT NULL THEN
      UPDATE personnel_details 
      SET work_asset_id = matching_asset_id 
      WHERE id = person.id;
    END IF;
  END LOOP;
END $$;

-- Update sample data with date_of_birth
UPDATE personnel_details
SET date_of_birth = CASE
  WHEN name = 'Sarah Chen' THEN '1985-04-15'
  WHEN name = 'Marcus Rodriguez' THEN '1978-09-22'
  WHEN name = 'Dr. Elena Volkov' THEN '1982-11-03'
  WHEN name = 'James Mitchell' THEN '1990-06-12'
  WHEN name = 'Aisha Patel' THEN '1995-02-28'
  WHEN name = 'Robert Kim' THEN '1988-07-19'
  ELSE '1990-01-01'
END
WHERE date_of_birth IS NULL;

-- Update emergency_contact for Sarah Chen
UPDATE personnel_details
SET emergency_contact = jsonb_build_object(
  'name', emergency_contact->>'name',
  'phone', emergency_contact->>'phone',
  'relationship', emergency_contact->>'relationship',
  'address', '123 Family Street',
  'city', 'Singapore',
  'country', 'Singapore',
  'coordinates', jsonb_build_array(103.8198, 1.3521)
)
WHERE name = 'Sarah Chen';

-- Update emergency_contact for Marcus Rodriguez
UPDATE personnel_details
SET emergency_contact = jsonb_build_object(
  'name', emergency_contact->>'name',
  'phone', emergency_contact->>'phone',
  'relationship', emergency_contact->>'relationship',
  'address', '456 Home Avenue',
  'city', 'Miami',
  'country', 'United States',
  'coordinates', jsonb_build_array(-80.1918, 25.7617)
)
WHERE name = 'Marcus Rodriguez';

-- Update emergency_contact for Dr. Elena Volkov
UPDATE personnel_details
SET emergency_contact = jsonb_build_object(
  'name', emergency_contact->>'name',
  'phone', emergency_contact->>'phone',
  'relationship', emergency_contact->>'relationship',
  'address', '789 Relative Road',
  'city', 'Kiev',
  'country', 'Ukraine',
  'coordinates', jsonb_build_array(30.5234, 50.4501)
)
WHERE name = 'Dr. Elena Volkov';

-- Update emergency_contact for James Mitchell
UPDATE personnel_details
SET emergency_contact = jsonb_build_object(
  'name', emergency_contact->>'name',
  'phone', emergency_contact->>'phone',
  'relationship', emergency_contact->>'relationship',
  'address', '321 Contact Lane',
  'city', 'London',
  'country', 'United Kingdom',
  'coordinates', jsonb_build_array(-0.1276, 51.5074)
)
WHERE name = 'James Mitchell';

-- Update emergency_contact for Aisha Patel
UPDATE personnel_details
SET emergency_contact = jsonb_build_object(
  'name', emergency_contact->>'name',
  'phone', emergency_contact->>'phone',
  'relationship', emergency_contact->>'relationship',
  'address', '654 Family Circle',
  'city', 'Mumbai',
  'country', 'India',
  'coordinates', jsonb_build_array(72.8777, 19.0760)
)
WHERE name = 'Aisha Patel';

-- Update emergency_contact for Robert Kim
UPDATE personnel_details
SET emergency_contact = jsonb_build_object(
  'name', emergency_contact->>'name',
  'phone', emergency_contact->>'phone',
  'relationship', emergency_contact->>'relationship',
  'address', '987 Relation Street',
  'city', 'Seoul',
  'country', 'South Korea',
  'coordinates', jsonb_build_array(126.9780, 37.5665)
)
WHERE name = 'Robert Kim';

-- Update any remaining personnel with default emergency contact structure
UPDATE personnel_details
SET emergency_contact = jsonb_build_object(
  'name', COALESCE(emergency_contact->>'name', ''),
  'phone', COALESCE(emergency_contact->>'phone', ''),
  'relationship', COALESCE(emergency_contact->>'relationship', ''),
  'address', '',
  'city', '',
  'country', '',
  'coordinates', jsonb_build_array(0, 0)
)
WHERE emergency_contact->>'address' IS NULL;