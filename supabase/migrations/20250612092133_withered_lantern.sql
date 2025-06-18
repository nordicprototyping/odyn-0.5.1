/*
  # Create Assets Table

  1. New Tables
    - `assets`
      - `id` (uuid, primary key)
      - `name` (text)
      - `type` (enum: building, facility, vehicle, equipment, data-center, embassy)
      - `location` (jsonb) - stores address, city, country, coordinates
      - `status` (enum: secure, alert, maintenance, offline, compromised)
      - `personnel` (jsonb) - stores current, capacity, authorized personnel
      - `ai_risk_score` (jsonb) - stores overall score, components, trend, predictions
      - `security_systems` (jsonb) - stores CCTV, access control, alarms, etc.
      - `compliance` (jsonb) - stores audit dates, score, issues
      - `incidents` (jsonb) - stores total, last incident, severity
      - `responsible_officer` (jsonb) - stores name, email, phone
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on assets table
    - Add policies for role-based access control
    - Admins can manage all assets
    - Managers can read assets in their department
    - Users can read assets

  3. Performance
    - Add indexes for common queries
    - Add trigger for automatic timestamp updates
*/

-- Create custom types for assets
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_type') THEN
    CREATE TYPE asset_type AS ENUM ('building', 'facility', 'vehicle', 'equipment', 'data-center', 'embassy');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_status') THEN
    CREATE TYPE asset_status AS ENUM ('secure', 'alert', 'maintenance', 'offline', 'compromised');
  END IF;
END $$;

-- Create assets table
CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type asset_type NOT NULL,
  location jsonb NOT NULL DEFAULT '{}',
  status asset_status NOT NULL DEFAULT 'secure',
  personnel jsonb NOT NULL DEFAULT '{}',
  ai_risk_score jsonb NOT NULL DEFAULT '{}',
  security_systems jsonb NOT NULL DEFAULT '{}',
  compliance jsonb NOT NULL DEFAULT '{}',
  incidents jsonb NOT NULL DEFAULT '{}',
  responsible_officer jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Create policies for assets
CREATE POLICY "Users can read assets"
  ON assets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can read department assets"
  ON assets
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_user_role() = 'manager' AND 
    (responsible_officer->>'department' IN (
      SELECT up.department FROM user_profiles up 
      WHERE up.user_id = auth.uid()
    ))
  );

CREATE POLICY "Admins can read all assets"
  ON assets
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_user_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins can insert assets"
  ON assets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_user_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins can update assets"
  ON assets
  FOR UPDATE
  TO authenticated
  USING (
    public.get_my_user_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins can delete assets"
  ON assets
  FOR DELETE
  TO authenticated
  USING (
    public.get_my_user_role() IN ('admin', 'super_admin')
  );

-- Create trigger for updated_at
CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at);
CREATE INDEX IF NOT EXISTS idx_assets_location ON assets USING GIN(location);
CREATE INDEX IF NOT EXISTS idx_assets_responsible_officer ON assets USING GIN(responsible_officer);

-- Insert sample data
INSERT INTO assets (
  name, type, location, status, personnel, ai_risk_score, security_systems, 
  compliance, incidents, responsible_officer
) VALUES 
(
  'Embassy Compound A',
  'embassy',
  '{"address": "123 Diplomatic Avenue", "city": "Ankara", "country": "Turkey", "coordinates": [32.8597, 39.9334]}',
  'secure',
  '{"current": 24, "capacity": 50, "authorized": ["EMP-001", "EMP-002", "EMP-003"]}',
  '{"overall": 18, "components": {"physicalSecurity": 12, "cyberSecurity": 25, "accessControl": 8, "environmentalRisk": 15, "personnelRisk": 20}, "trend": "stable", "lastUpdated": "2024-01-10T14:30:00Z", "confidence": 92, "predictions": {"nextWeek": 19, "nextMonth": 16}}',
  '{"cctv": {"status": "online", "coverage": 95}, "accessControl": {"status": "online", "zones": 12}, "alarms": {"status": "online", "sensors": 48}, "fireSupression": {"status": "online", "coverage": 100}, "networkSecurity": {"status": "online", "threats": 2}}',
  '{"lastAudit": "2024-01-01", "nextAudit": "2024-04-01", "score": 94, "issues": []}',
  '{"total": 1, "lastIncident": "2024-01-05", "severity": "low"}',
  '{"name": "Marcus Rodriguez", "email": "marcus.rodriguez@company.com", "phone": "+90-312-123-4567", "department": "Field Operations"}'
),
(
  'Corporate HQ - London',
  'building',
  '{"address": "456 Business District", "city": "London", "country": "United Kingdom", "coordinates": [-0.1276, 51.5074]}',
  'alert',
  '{"current": 156, "capacity": 200, "authorized": ["EMP-004", "EMP-005", "EMP-006"]}',
  '{"overall": 72, "components": {"physicalSecurity": 45, "cyberSecurity": 85, "accessControl": 60, "environmentalRisk": 30, "personnelRisk": 80}, "trend": "deteriorating", "lastUpdated": "2024-01-10T14:15:00Z", "confidence": 88, "predictions": {"nextWeek": 76, "nextMonth": 68}}',
  '{"cctv": {"status": "online", "coverage": 88}, "accessControl": {"status": "maintenance", "zones": 25}, "alarms": {"status": "online", "sensors": 120}, "fireSupression": {"status": "online", "coverage": 100}, "networkSecurity": {"status": "online", "threats": 15}}',
  '{"lastAudit": "2023-12-15", "nextAudit": "2024-03-15", "score": 87, "issues": ["Access control system outdated", "Network security gaps"]}',
  '{"total": 5, "lastIncident": "2024-01-08", "severity": "medium"}',
  '{"name": "James Mitchell", "email": "james.mitchell@company.com", "phone": "+44-20-7123-4567", "department": "Transport Security"}'
),
(
  'Manufacturing Plant',
  'facility',
  '{"address": "789 Industrial Zone", "city": "Mumbai", "country": "India", "coordinates": [72.8777, 19.0760]}',
  'secure',
  '{"current": 89, "capacity": 150, "authorized": ["TMP-005", "EMP-007", "EMP-008"]}',
  '{"overall": 45, "components": {"physicalSecurity": 35, "cyberSecurity": 55, "accessControl": 40, "environmentalRisk": 60, "personnelRisk": 35}, "trend": "improving", "lastUpdated": "2024-01-10T13:45:00Z", "confidence": 85, "predictions": {"nextWeek": 42, "nextMonth": 38}}',
  '{"cctv": {"status": "online", "coverage": 75}, "accessControl": {"status": "online", "zones": 8}, "alarms": {"status": "online", "sensors": 65}, "fireSupression": {"status": "online", "coverage": 90}, "networkSecurity": {"status": "online", "threats": 8}}',
  '{"lastAudit": "2024-01-10", "nextAudit": "2024-04-10", "score": 91, "issues": ["Environmental monitoring needs upgrade"]}',
  '{"total": 2, "lastIncident": "2023-12-20", "severity": "low"}',
  '{"name": "Aisha Patel", "email": "aisha.patel@company.com", "phone": "+91-22-1234-5678", "department": "IT Security"}'
),
(
  'Data Center Alpha',
  'data-center',
  '{"address": "321 Tech Park", "city": "Singapore", "country": "Singapore", "coordinates": [103.8198, 1.3521]}',
  'maintenance',
  '{"current": 12, "capacity": 20, "authorized": ["EMP-001", "REM-006", "EMP-009"]}',
  '{"overall": 22, "components": {"physicalSecurity": 15, "cyberSecurity": 30, "accessControl": 10, "environmentalRisk": 25, "personnelRisk": 18}, "trend": "stable", "lastUpdated": "2024-01-10T12:00:00Z", "confidence": 94, "predictions": {"nextWeek": 24, "nextMonth": 20}}',
  '{"cctv": {"status": "online", "coverage": 100}, "accessControl": {"status": "online", "zones": 6}, "alarms": {"status": "maintenance", "sensors": 32}, "fireSupression": {"status": "online", "coverage": 100}, "networkSecurity": {"status": "online", "threats": 1}}',
  '{"lastAudit": "2024-01-08", "nextAudit": "2024-04-08", "score": 96, "issues": []}',
  '{"total": 0, "lastIncident": "None", "severity": "low"}',
  '{"name": "Sarah Chen", "email": "sarah.chen@company.com", "phone": "+65-9123-4567", "department": "Security Operations"}'
);