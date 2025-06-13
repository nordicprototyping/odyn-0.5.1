/*
  # Travel Plans Management Schema

  1. New Tables
    - `travel_plans`
      - `id` (uuid, primary key)
      - `traveler_user_id` (uuid, foreign key to auth.users, nullable)
      - `traveler_name` (text)
      - `traveler_employee_id` (text)
      - `traveler_department` (text)
      - `traveler_clearance_level` (text)
      - `destination` (jsonb)
      - `origin` (jsonb)
      - `departure_date` (timestamptz)
      - `return_date` (timestamptz)
      - `purpose` (text)
      - `status` (enum: pending, approved, denied, in-progress, completed, cancelled)
      - `risk_assessment` (jsonb)
      - `approver` (text, nullable)
      - `emergency_contacts` (jsonb)
      - `itinerary` (jsonb)
      - `documents` (text array)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on travel_plans table
    - Add policies for role-based access control
    - Users can read their own travel plans
    - Managers can read department travel plans
    - Admins can read all travel plans
    - Authenticated users can create travel plans
    - Admins and managers can update travel plans

  3. Functions and Triggers
    - Auto-update timestamp trigger
    - Performance indexes
*/

-- Create custom types for travel plans
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'travel_plan_status') THEN
    CREATE TYPE travel_plan_status AS ENUM ('pending', 'approved', 'denied', 'in-progress', 'completed', 'cancelled');
  END IF;
END $$;

-- Create travel_plans table
CREATE TABLE IF NOT EXISTS travel_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  traveler_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  traveler_name text NOT NULL,
  traveler_employee_id text NOT NULL,
  traveler_department text NOT NULL,
  traveler_clearance_level text NOT NULL,
  destination jsonb NOT NULL DEFAULT '{}',
  origin jsonb NOT NULL DEFAULT '{}',
  departure_date timestamptz NOT NULL,
  return_date timestamptz NOT NULL,
  purpose text NOT NULL,
  status travel_plan_status NOT NULL DEFAULT 'pending',
  risk_assessment jsonb NOT NULL DEFAULT '{}',
  approver text,
  emergency_contacts jsonb NOT NULL DEFAULT '{}',
  itinerary jsonb NOT NULL DEFAULT '{}',
  documents text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE travel_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for travel_plans
CREATE POLICY "Users can read own travel plans"
  ON travel_plans
  FOR SELECT
  TO authenticated
  USING (traveler_user_id = auth.uid());

CREATE POLICY "Managers can read department travel plans"
  ON travel_plans
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_user_role() = 'manager' AND 
    traveler_department IN (
      SELECT up.department FROM user_profiles up 
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all travel plans"
  ON travel_plans
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_user_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Authenticated users can create travel plans"
  ON travel_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update all travel plans"
  ON travel_plans
  FOR UPDATE
  TO authenticated
  USING (
    public.get_my_user_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Managers can update department travel plans"
  ON travel_plans
  FOR UPDATE
  TO authenticated
  USING (
    public.get_my_user_role() = 'manager' AND 
    traveler_department IN (
      SELECT up.department FROM user_profiles up 
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own travel plans"
  ON travel_plans
  FOR UPDATE
  TO authenticated
  USING (traveler_user_id = auth.uid())
  WITH CHECK (traveler_user_id = auth.uid());

CREATE POLICY "Admins can delete travel plans"
  ON travel_plans
  FOR DELETE
  TO authenticated
  USING (
    public.get_my_user_role() IN ('admin', 'super_admin')
  );

-- Create trigger for updated_at
CREATE TRIGGER update_travel_plans_updated_at
  BEFORE UPDATE ON travel_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_travel_plans_traveler_user_id ON travel_plans(traveler_user_id);
CREATE INDEX IF NOT EXISTS idx_travel_plans_traveler_department ON travel_plans(traveler_department);
CREATE INDEX IF NOT EXISTS idx_travel_plans_status ON travel_plans(status);
CREATE INDEX IF NOT EXISTS idx_travel_plans_departure_date ON travel_plans(departure_date);
CREATE INDEX IF NOT EXISTS idx_travel_plans_return_date ON travel_plans(return_date);
CREATE INDEX IF NOT EXISTS idx_travel_plans_created_at ON travel_plans(created_at);
CREATE INDEX IF NOT EXISTS idx_travel_plans_destination ON travel_plans USING GIN(destination);
CREATE INDEX IF NOT EXISTS idx_travel_plans_origin ON travel_plans USING GIN(origin);

-- Insert sample data
INSERT INTO travel_plans (
  traveler_name, traveler_employee_id, traveler_department, traveler_clearance_level,
  destination, origin, departure_date, return_date, purpose, status, risk_assessment,
  approver, emergency_contacts, itinerary, documents
) VALUES 
(
  'Marcus Rodriguez',
  'EMP-002',
  'Field Operations',
  'Secret',
  '{"city": "Istanbul", "country": "Turkey", "coordinates": [28.9784, 41.0082]}',
  '{"city": "Ankara", "country": "Turkey", "coordinates": [32.8597, 39.9334]}',
  '2024-01-15T09:00:00Z',
  '2024-01-18T18:00:00Z',
  'Security assessment of regional facilities',
  'approved',
  '{"overall": 65, "components": {"geopolitical": 70, "security": 75, "health": 30, "environmental": 40, "transportation": 60}, "aiConfidence": 87, "recommendations": ["Maintain low profile during transit", "Avoid public demonstrations", "Use secure communication channels", "Check in every 6 hours"]}',
  'Sarah Chen',
  '{"local": "+90-212-555-0123", "embassy": "+90-312-455-5555"}',
  '{"accommodation": "Secure corporate facility", "transportation": "Armored vehicle with driver", "meetings": ["Regional Security Chief", "Local Law Enforcement", "Facility Managers"]}',
  ARRAY['travel_authorization.pdf', 'security_briefing.pdf', 'emergency_protocols.pdf']
),
(
  'Dr. Elena Volkov',
  'CON-003',
  'Risk Analysis',
  'Confidential',
  '{"city": "Warsaw", "country": "Poland", "coordinates": [21.0122, 52.2297]}',
  '{"city": "Kiev", "country": "Ukraine", "coordinates": [30.5234, 50.4501]}',
  '2024-01-20T08:00:00Z',
  '2024-01-25T20:00:00Z',
  'Regional threat assessment conference',
  'pending',
  '{"overall": 85, "components": {"geopolitical": 90, "security": 85, "health": 45, "environmental": 35, "transportation": 80}, "aiConfidence": 92, "recommendations": ["Consider postponing due to regional tensions", "If travel proceeds, use diplomatic channels", "Arrange secure border crossing", "Maintain constant communication"]}',
  null,
  '{"local": "+48-22-555-0123", "embassy": "+48-22-628-3041"}',
  '{"accommodation": "Hotel Europejski (secure floor)", "transportation": "Diplomatic vehicle", "meetings": ["NATO Security Analysts", "Polish Intelligence", "EU Risk Assessment Team"]}',
  ARRAY['conference_invitation.pdf', 'diplomatic_clearance.pdf']
),
(
  'James Mitchell',
  'EMP-004',
  'Transport Security',
  'Secret',
  '{"city": "Paris", "country": "France", "coordinates": [2.3522, 48.8566]}',
  '{"city": "London", "country": "United Kingdom", "coordinates": [-0.1276, 51.5074]}',
  '2024-01-12T07:00:00Z',
  '2024-01-12T22:00:00Z',
  'Transport security protocol review',
  'in-progress',
  '{"overall": 25, "components": {"geopolitical": 15, "security": 30, "health": 20, "environmental": 10, "transportation": 35}, "aiConfidence": 94, "recommendations": ["Standard security protocols apply", "Monitor for transport strikes", "Use secure communication for sensitive discussions"]}',
  'Sarah Chen',
  '{"local": "+33-1-55-55-55-55", "embassy": "+33-1-43-12-22-22"}',
  '{"accommodation": "Day trip - no accommodation", "transportation": "Eurostar + secure ground transport", "meetings": ["French Transport Security", "EU Transport Officials"]}',
  ARRAY['meeting_agenda.pdf', 'transport_protocols.pdf']
),
(
  'Aisha Patel',
  'TMP-005',
  'IT Security',
  'Confidential',
  '{"city": "Dubai", "country": "United Arab Emirates", "coordinates": [55.2708, 25.2048]}',
  '{"city": "Mumbai", "country": "India", "coordinates": [72.8777, 19.0760]}',
  '2024-01-25T14:00:00Z',
  '2024-01-28T23:00:00Z',
  'Cybersecurity summit and vendor meetings',
  'approved',
  '{"overall": 35, "components": {"geopolitical": 40, "security": 35, "health": 25, "environmental": 30, "transportation": 45}, "aiConfidence": 89, "recommendations": ["Standard business travel protocols", "Secure handling of technical documents", "Use VPN for all communications", "Avoid discussing sensitive projects in public"]}',
  'Sarah Chen',
  '{"local": "+971-4-555-0123", "embassy": "+971-4-397-1222"}',
  '{"accommodation": "Burj Al Arab (executive floor)", "transportation": "Hotel shuttle + taxi", "meetings": ["Cybersecurity Vendors", "Regional IT Directors", "Security Consultants"]}',
  ARRAY['summit_agenda.pdf', 'vendor_list.pdf', 'nda_agreements.pdf']
);