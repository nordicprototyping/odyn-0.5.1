/*
  # Update Personnel Details Schema

  1. Schema Changes
    - Add `date_of_birth` (date) column to personnel_details
    - Add `work_asset_id` (uuid, foreign key to assets) column to personnel_details
    - Update emergency_contact to include address fields
    - Keep employee_id as mandatory (NOT NULL)

  2. Data Migration
    - Update existing records to maintain data integrity
    - Set default values for new columns

  3. Indexes
    - Add index for work_asset_id for better join performance
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

-- Update sample data with date_of_birth and enhanced emergency_contact
UPDATE personnel_details
SET 
  date_of_birth = CASE
    WHEN name = 'Sarah Chen' THEN '1985-04-15'
    WHEN name = 'Marcus Rodriguez' THEN '1978-09-22'
    WHEN name = 'Dr. Elena Volkov' THEN '1982-11-03'
    WHEN name = 'James Mitchell' THEN '1990-06-12'
    WHEN name = 'Aisha Patel' THEN '1995-02-28'
    WHEN name = 'Robert Kim' THEN '1988-07-19'
    ELSE '1990-01-01'
  END,
  emergency_contact = jsonb_set(
    jsonb_set(
      emergency_contact, 
      '{address}', 
      CASE
        WHEN name = 'Sarah Chen' THEN '"123 Family Street"'
        WHEN name = 'Marcus Rodriguez' THEN '"456 Home Avenue"'
        WHEN name = 'Dr. Elena Volkov' THEN '"789 Relative Road"'
        WHEN name = 'James Mitchell' THEN '"321 Contact Lane"'
        WHEN name = 'Aisha Patel' THEN '"654 Family Circle"'
        WHEN name = 'Robert Kim' THEN '"987 Relation Street"'
        ELSE '""'
      END
    ),
    '{city}',
    CASE
      WHEN name = 'Sarah Chen' THEN '"Singapore"'
      WHEN name = 'Marcus Rodriguez' THEN '"Miami"'
      WHEN name = 'Dr. Elena Volkov' THEN '"Kiev"'
      WHEN name = 'James Mitchell' THEN '"London"'
      WHEN name = 'Aisha Patel' THEN '"Mumbai"'
      WHEN name = 'Robert Kim' THEN '"Seoul"'
      ELSE '""'
    END
  )
WHERE date_of_birth IS NULL;

-- Further update emergency_contact with country and coordinates
UPDATE personnel_details
SET 
  emergency_contact = jsonb_set(
    jsonb_set(
      emergency_contact, 
      '{country}', 
      CASE
        WHEN name = 'Sarah Chen' THEN '"Singapore"'
        WHEN name = 'Marcus Rodriguez' THEN '"United States"'
        WHEN name = 'Dr. Elena Volkov' THEN '"Ukraine"'
        WHEN name = 'James Mitchell' THEN '"United Kingdom"'
        WHEN name = 'Aisha Patel' THEN '"India"'
        WHEN name = 'Robert Kim' THEN '"South Korea"'
        ELSE '""'
      END
    ),
    '{coordinates}',
    CASE
      WHEN name = 'Sarah Chen' THEN '[103.8198, 1.3521]'
      WHEN name = 'Marcus Rodriguez' THEN '[-80.1918, 25.7617]'
      WHEN name = 'Dr. Elena Volkov' THEN '[30.5234, 50.4501]'
      WHEN name = 'James Mitchell' THEN '[-0.1276, 51.5074]'
      WHEN name = 'Aisha Patel' THEN '[72.8777, 19.0760]'
      WHEN name = 'Robert Kim' THEN '[126.9780, 37.5665]'
      ELSE '[0, 0]'
    END
  )
WHERE emergency_contact->>'country' IS NULL;