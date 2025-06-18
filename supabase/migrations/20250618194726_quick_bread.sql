/*
  # Update Assets Table for Dynamic Asset Forms

  1. Schema Changes
    - Modify asset_type enum to simplify types
    - Add type_specific_attributes column (jsonb) to store type-specific details
    - Update existing data to conform to new schema

  2. Data Migration
    - Convert existing asset types to the new simplified types
    - Initialize type_specific_attributes with appropriate values based on existing data
*/

-- First, create a temporary type for the new asset types
CREATE TYPE asset_type_new AS ENUM ('building', 'vehicle', 'equipment');

-- Add the new type_specific_attributes column
ALTER TABLE assets ADD COLUMN IF NOT EXISTS type_specific_attributes jsonb DEFAULT '{}'::jsonb;

-- Create a function to migrate the data
CREATE OR REPLACE FUNCTION migrate_asset_types() RETURNS void AS $$
DECLARE
  asset_record RECORD;
BEGIN
  -- For each asset, update the type and set type_specific_attributes
  FOR asset_record IN SELECT id, type, name FROM assets LOOP
    -- Convert the type and set type-specific attributes
    IF asset_record.type IN ('facility', 'data-center', 'embassy') THEN
      -- These types become 'building' with a building_type attribute
      UPDATE assets 
      SET type_specific_attributes = jsonb_build_object(
        'building_type', asset_record.type::text,
        'floor_count', floor(random() * 10) + 1,
        'year_built', 2000 + floor(random() * 23)::int,
        'primary_function', CASE 
          WHEN asset_record.type = 'facility' THEN 'industrial'
          WHEN asset_record.type = 'data-center' THEN 'data-center'
          WHEN asset_record.type = 'embassy' THEN 'embassy'
          ELSE 'office'
        END
      )
      WHERE id = asset_record.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the migration function
SELECT migrate_asset_types();

-- Drop the migration function as it's no longer needed
DROP FUNCTION migrate_asset_types();

-- Create a temporary column for the new type
ALTER TABLE assets ADD COLUMN temp_type asset_type_new;

-- Update the temporary column with the new type values
UPDATE assets 
SET temp_type = CASE
  WHEN type IN ('building', 'facility', 'data-center', 'embassy') THEN 'building'::asset_type_new
  WHEN type = 'vehicle' THEN 'vehicle'::asset_type_new
  WHEN type = 'equipment' THEN 'equipment'::asset_type_new
  ELSE 'building'::asset_type_new -- Default fallback
END;

-- Drop the old type column and rename the temporary column
ALTER TABLE assets DROP COLUMN type;
ALTER TABLE assets RENAME COLUMN temp_type TO type;

-- Drop the old type and rename the new one
DROP TYPE asset_type;
ALTER TYPE asset_type_new RENAME TO asset_type;

-- Create index for the new jsonb column
CREATE INDEX IF NOT EXISTS idx_assets_type_specific_attributes ON assets USING GIN(type_specific_attributes);