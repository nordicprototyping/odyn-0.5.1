/*
  # Create incident_reports table

  1. New Tables
    - `incident_reports`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `date_time` (timestamptz)
      - `severity` (enum: Low, Medium, High, Critical)
      - `location` (text)
      - `department` (text)
      - `involved_parties` (text array)
      - `immediate_actions` (text)
      - `reporter_user_id` (uuid, foreign key to auth.users)
      - `reporter_name` (text)
      - `reporter_email` (text)
      - `reporter_phone` (text)
      - `status` (enum: Open, In Progress, Closed)
      - `assigned_to` (text)
      - `documents` (text array)
      - `timeline` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `incident_reports` table
    - Add policies for role-based access control
    - Users can read incidents they reported
    - Admins can read/update all incidents
    - All authenticated users can create incidents

  3. Performance
    - Add indexes for common query patterns
    - Add trigger for automatic timestamp updates
*/

-- Create custom types for incident reports
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_severity') THEN
    CREATE TYPE incident_severity AS ENUM ('Low', 'Medium', 'High', 'Critical');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_status') THEN
    CREATE TYPE incident_status AS ENUM ('Open', 'In Progress', 'Closed');
  END IF;
END $$;

-- Create incident_reports table
CREATE TABLE IF NOT EXISTS incident_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  date_time timestamptz NOT NULL,
  severity incident_severity NOT NULL DEFAULT 'Medium',
  location text NOT NULL,
  department text NOT NULL,
  involved_parties text[] DEFAULT '{}',
  immediate_actions text,
  reporter_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_name text NOT NULL,
  reporter_email text NOT NULL,
  reporter_phone text,
  status incident_status NOT NULL DEFAULT 'Open',
  assigned_to text,
  documents text[] DEFAULT '{}',
  timeline jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for incident_reports
CREATE POLICY "Users can read own incidents"
  ON incident_reports
  FOR SELECT
  TO authenticated
  USING (reporter_user_id = auth.uid());

CREATE POLICY "Admins can read all incidents"
  ON incident_reports
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_user_role() IN ('admin', 'super_admin', 'manager')
  );

CREATE POLICY "Authenticated users can create incidents"
  ON incident_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update all incidents"
  ON incident_reports
  FOR UPDATE
  TO authenticated
  USING (
    public.get_my_user_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Managers can update department incidents"
  ON incident_reports
  FOR UPDATE
  TO authenticated
  USING (
    public.get_my_user_role() = 'manager' AND 
    (department IN (
      SELECT up.department FROM user_profiles up 
      WHERE up.user_id = auth.uid()
    ) OR assigned_to IN (
      SELECT up.full_name FROM user_profiles up 
      WHERE up.user_id = auth.uid()
    ))
  );

CREATE POLICY "Admins can delete incidents"
  ON incident_reports
  FOR DELETE
  TO authenticated
  USING (
    public.get_my_user_role() IN ('admin', 'super_admin')
  );

-- Create trigger for updated_at
CREATE TRIGGER update_incident_reports_updated_at
  BEFORE UPDATE ON incident_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_incident_reports_date_time ON incident_reports(date_time);
CREATE INDEX IF NOT EXISTS idx_incident_reports_severity ON incident_reports(severity);
CREATE INDEX IF NOT EXISTS idx_incident_reports_status ON incident_reports(status);
CREATE INDEX IF NOT EXISTS idx_incident_reports_department ON incident_reports(department);
CREATE INDEX IF NOT EXISTS idx_incident_reports_reporter_user_id ON incident_reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_created_at ON incident_reports(created_at);

-- Insert sample data
INSERT INTO incident_reports (
  title, description, date_time, severity, location, department, 
  involved_parties, immediate_actions, reporter_name, reporter_email, 
  reporter_phone, status, assigned_to, documents, timeline
) VALUES 
(
  'Unauthorized Access Attempt',
  'Multiple failed login attempts detected from suspicious IP address targeting executive accounts.',
  '2024-01-10T14:30:00Z',
  'High',
  'Singapore HQ - Server Room',
  'IT Security',
  ARRAY['Sarah Chen', 'IT Security Team'],
  'IP blocked, accounts secured, investigation initiated',
  'John Smith',
  'john.smith@company.com',
  '+65-9123-4567',
  'In Progress',
  'Sarah Chen',
  ARRAY['security_logs.pdf', 'ip_analysis.xlsx'],
  '[
    {"timestamp": "2024-01-10T14:30:00Z", "action": "Incident reported", "user": "John Smith"},
    {"timestamp": "2024-01-10T14:45:00Z", "action": "Investigation started", "user": "Sarah Chen"},
    {"timestamp": "2024-01-10T15:00:00Z", "action": "IP address blocked", "user": "IT Security Team"}
  ]'::jsonb
),
(
  'Physical Security Breach',
  'Tailgating incident at main entrance - unauthorized individual followed employee into secure area.',
  '2024-01-09T09:15:00Z',
  'Critical',
  'London HQ - Main Entrance',
  'Physical Security',
  ARRAY['Security Guard', 'Unknown Individual', 'James Mitchell'],
  'Area secured, individual escorted out, security footage reviewed',
  'Security Control Room',
  'security@company.com',
  '+44-20-7123-4567',
  'Closed',
  'James Mitchell',
  ARRAY['cctv_footage.mp4', 'incident_report.pdf'],
  '[
    {"timestamp": "2024-01-09T09:15:00Z", "action": "Incident detected", "user": "Security System"},
    {"timestamp": "2024-01-09T09:20:00Z", "action": "Security team dispatched", "user": "Control Room"},
    {"timestamp": "2024-01-09T09:30:00Z", "action": "Individual removed", "user": "James Mitchell"},
    {"timestamp": "2024-01-09T10:00:00Z", "action": "Investigation completed", "user": "James Mitchell"},
    {"timestamp": "2024-01-09T16:00:00Z", "action": "Incident closed", "user": "James Mitchell"}
  ]'::jsonb
),
(
  'Data Exfiltration Attempt',
  'Unusual data transfer patterns detected from employee workstation to external cloud storage.',
  '2024-01-08T16:45:00Z',
  'High',
  'Remote - Kiev Office',
  'Data Security',
  ARRAY['Dr. Elena Volkov', 'Data Security Team'],
  'Network access restricted, workstation isolated, forensic analysis initiated',
  'Automated Security System',
  'alerts@company.com',
  'N/A',
  'In Progress',
  'Data Security Team',
  ARRAY['network_logs.txt', 'forensic_report.pdf'],
  '[
    {"timestamp": "2024-01-08T16:45:00Z", "action": "Anomaly detected", "user": "Security System"},
    {"timestamp": "2024-01-08T17:00:00Z", "action": "Network access restricted", "user": "Data Security Team"},
    {"timestamp": "2024-01-08T17:30:00Z", "action": "Forensic analysis started", "user": "Data Security Team"}
  ]'::jsonb
),
(
  'Suspicious Package Delivery',
  'Unscheduled package delivery with no sender information received at reception.',
  '2024-01-07T11:20:00Z',
  'Medium',
  'Mumbai Office - Reception',
  'Physical Security',
  ARRAY['Reception Staff', 'Security Team'],
  'Package isolated, bomb squad contacted, area evacuated',
  'Reception Desk',
  'reception.mumbai@company.com',
  '+91-22-1234-5678',
  'Closed',
  'Local Security Team',
  ARRAY['package_photos.jpg', 'bomb_squad_report.pdf'],
  '[
    {"timestamp": "2024-01-07T11:20:00Z", "action": "Package received", "user": "Reception Staff"},
    {"timestamp": "2024-01-07T11:25:00Z", "action": "Security alerted", "user": "Reception Staff"},
    {"timestamp": "2024-01-07T11:30:00Z", "action": "Area evacuated", "user": "Security Team"},
    {"timestamp": "2024-01-07T12:00:00Z", "action": "Bomb squad arrived", "user": "Local Authorities"},
    {"timestamp": "2024-01-07T13:00:00Z", "action": "Package cleared - false alarm", "user": "Bomb Squad"},
    {"timestamp": "2024-01-07T14:00:00Z", "action": "Incident closed", "user": "Security Team"}
  ]'::jsonb
);