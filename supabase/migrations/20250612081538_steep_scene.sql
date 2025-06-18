/*
  # Personnel Management System

  1. New Tables
    - `personnel_details`
      - `id` (uuid, primary key)
      - `name` (text)
      - `employee_id` (text, unique)
      - `category` (text)
      - `department` (text)
      - `current_location` (jsonb)
      - `work_location` (text)
      - `clearance_level` (text)
      - `emergency_contact` (jsonb)
      - `travel_status` (jsonb)
      - `ai_risk_score` (jsonb)
      - `status` (text)
      - `last_seen` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on personnel_details table
    - Add policies for admin access
    - Add indexes for performance
*/

CREATE TABLE IF NOT EXISTS personnel_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  employee_id text UNIQUE NOT NULL,
  category text NOT NULL DEFAULT 'full-time',
  department text NOT NULL,
  current_location jsonb NOT NULL DEFAULT '{}',
  work_location text NOT NULL,
  clearance_level text NOT NULL DEFAULT 'Unclassified',
  emergency_contact jsonb NOT NULL DEFAULT '{}',
  travel_status jsonb NOT NULL DEFAULT '{}',
  ai_risk_score jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  last_seen text NOT NULL DEFAULT 'Just now',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE personnel_details ENABLE ROW LEVEL SECURITY;

-- Create policies for personnel_details
CREATE POLICY "Admins can read all personnel"
  ON personnel_details
  FOR SELECT
  TO authenticated
  USING (get_my_user_role() = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]));

CREATE POLICY "Admins can insert personnel"
  ON personnel_details
  FOR INSERT
  TO authenticated
  WITH CHECK (get_my_user_role() = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]));

CREATE POLICY "Admins can update personnel"
  ON personnel_details
  FOR UPDATE
  TO authenticated
  USING (get_my_user_role() = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]));

CREATE POLICY "Admins can delete personnel"
  ON personnel_details
  FOR DELETE
  TO authenticated
  USING (get_my_user_role() = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]));

-- Create trigger for updated_at
CREATE TRIGGER update_personnel_details_updated_at
  BEFORE UPDATE ON personnel_details
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_personnel_details_employee_id ON personnel_details(employee_id);
CREATE INDEX IF NOT EXISTS idx_personnel_details_department ON personnel_details(department);
CREATE INDEX IF NOT EXISTS idx_personnel_details_category ON personnel_details(category);
CREATE INDEX IF NOT EXISTS idx_personnel_details_status ON personnel_details(status);
CREATE INDEX IF NOT EXISTS idx_personnel_details_created_at ON personnel_details(created_at);

-- Insert sample data
INSERT INTO personnel_details (
  name, employee_id, category, department, current_location, work_location, 
  clearance_level, emergency_contact, travel_status, ai_risk_score, status, last_seen
) VALUES 
(
  'Sarah Chen',
  'EMP-001',
  'executive',
  'Security Operations',
  '{"city": "Singapore", "country": "Singapore", "coordinates": [103.8198, 1.3521]}',
  'Singapore HQ',
  'Top Secret',
  '{"name": "Michael Chen", "phone": "+65-9123-4567", "relationship": "Spouse"}',
  '{"current": "Singapore", "isActive": false, "authorization": "approved"}',
  '{"overall": 15, "components": {"behavioralRisk": 8, "travelRisk": 5, "accessRisk": 25, "complianceRisk": 2, "geographicRisk": 10}, "trend": "stable", "lastUpdated": "2024-01-10T14:30:00Z", "confidence": 94, "predictions": {"nextWeek": 16, "nextMonth": 18}}',
  'active',
  '2 min ago'
),
(
  'Marcus Rodriguez',
  'EMP-002',
  'field',
  'Field Operations',
  '{"city": "Ankara", "country": "Turkey", "coordinates": [32.8597, 39.9334]}',
  'Embassy Ankara',
  'Secret',
  '{"name": "Maria Rodriguez", "phone": "+1-555-0123", "relationship": "Wife"}',
  '{"current": "Ankara", "isActive": true, "destination": "Istanbul", "returnDate": "2024-01-15", "authorization": "approved"}',
  '{"overall": 78, "components": {"behavioralRisk": 45, "travelRisk": 85, "accessRisk": 60, "complianceRisk": 25, "geographicRisk": 90}, "trend": "deteriorating", "lastUpdated": "2024-01-10T14:15:00Z", "confidence": 87, "predictions": {"nextWeek": 82, "nextMonth": 75}}',
  'on-mission',
  '15 min ago'
),
(
  'Dr. Elena Volkov',
  'CON-003',
  'contractor',
  'Risk Analysis',
  '{"city": "Kiev", "country": "Ukraine", "coordinates": [30.5234, 50.4501]}',
  'Remote',
  'Confidential',
  '{"name": "Viktor Volkov", "phone": "+380-44-123-4567", "relationship": "Brother"}',
  '{"current": "Kiev", "isActive": false, "authorization": "approved"}',
  '{"overall": 85, "components": {"behavioralRisk": 30, "travelRisk": 70, "accessRisk": 40, "complianceRisk": 35, "geographicRisk": 95}, "trend": "stable", "lastUpdated": "2024-01-10T13:45:00Z", "confidence": 91, "predictions": {"nextWeek": 83, "nextMonth": 80}}',
  'active',
  '5 min ago'
),
(
  'James Mitchell',
  'EMP-004',
  'full-time',
  'Transport Security',
  '{"city": "London", "country": "United Kingdom", "coordinates": [-0.1276, 51.5074]}',
  'London HQ',
  'Secret',
  '{"name": "Emma Mitchell", "phone": "+44-20-7123-4567", "relationship": "Wife"}',
  '{"current": "En route to Paris", "isActive": true, "destination": "Paris", "returnDate": "2024-01-12", "authorization": "approved"}',
  '{"overall": 32, "components": {"behavioralRisk": 15, "travelRisk": 40, "accessRisk": 35, "complianceRisk": 8, "geographicRisk": 20}, "trend": "improving", "lastUpdated": "2024-01-10T12:00:00Z", "confidence": 89, "predictions": {"nextWeek": 28, "nextMonth": 25}}',
  'in-transit',
  '1 hour ago'
),
(
  'Aisha Patel',
  'TMP-005',
  'temporary',
  'IT Security',
  '{"city": "Mumbai", "country": "India", "coordinates": [72.8777, 19.0760]}',
  'Mumbai Office',
  'Confidential',
  '{"name": "Raj Patel", "phone": "+91-22-1234-5678", "relationship": "Father"}',
  '{"current": "Mumbai", "isActive": false, "authorization": "approved"}',
  '{"overall": 45, "components": {"behavioralRisk": 25, "travelRisk": 30, "accessRisk": 50, "complianceRisk": 40, "geographicRisk": 55}, "trend": "stable", "lastUpdated": "2024-01-10T11:30:00Z", "confidence": 76, "predictions": {"nextWeek": 47, "nextMonth": 42}}',
  'active',
  '30 min ago'
),
(
  'Robert Kim',
  'REM-006',
  'remote',
  'Cyber Intelligence',
  '{"city": "Seoul", "country": "South Korea", "coordinates": [126.9780, 37.5665]}',
  'Remote',
  'Top Secret',
  '{"name": "Lisa Kim", "phone": "+82-2-1234-5678", "relationship": "Sister"}',
  '{"current": "Seoul", "isActive": false, "authorization": "approved"}',
  '{"overall": 12, "components": {"behavioralRisk": 5, "travelRisk": 8, "accessRisk": 20, "complianceRisk": 3, "geographicRisk": 15}, "trend": "improving", "lastUpdated": "2024-01-10T14:00:00Z", "confidence": 96, "predictions": {"nextWeek": 10, "nextMonth": 8}}',
  'active',
  '10 min ago'
);