/*
  # Create Risks Management Table

  1. New Tables
    - `risks`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `category` (enum: operational, financial, strategic, compliance, security, technical, environmental, reputational)
      - `status` (enum: identified, assessed, mitigated, monitoring, closed)
      - `impact` (enum: very_low, low, medium, high, very_high)
      - `likelihood` (enum: very_low, low, medium, high, very_high)
      - `risk_score` (integer, calculated from impact * likelihood)
      - `mitigation_plan` (text)
      - `owner_user_id` (uuid, foreign key to auth.users)
      - `identified_by_user_id` (uuid, foreign key to auth.users)
      - `department` (text)
      - `due_date` (timestamptz, optional)
      - `last_reviewed_at` (timestamptz, optional)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on risks table
    - Add policies for role-based access control
    - Admins can manage all risks
    - Managers can read all and update their department risks
    - Users can read risks they own or identified

  3. Functions and Triggers
    - Auto-update timestamp trigger
    - Performance indexes
*/

-- Create custom types for risks
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_category') THEN
    CREATE TYPE risk_category AS ENUM ('operational', 'financial', 'strategic', 'compliance', 'security', 'technical', 'environmental', 'reputational');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_status') THEN
    CREATE TYPE risk_status AS ENUM ('identified', 'assessed', 'mitigated', 'monitoring', 'closed');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_impact_level') THEN
    CREATE TYPE risk_impact_level AS ENUM ('very_low', 'low', 'medium', 'high', 'very_high');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_likelihood_level') THEN
    CREATE TYPE risk_likelihood_level AS ENUM ('very_low', 'low', 'medium', 'high', 'very_high');
  END IF;
END $$;

-- Create risks table
CREATE TABLE IF NOT EXISTS risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category risk_category NOT NULL,
  status risk_status NOT NULL DEFAULT 'identified',
  impact risk_impact_level NOT NULL,
  likelihood risk_likelihood_level NOT NULL,
  risk_score integer NOT NULL DEFAULT 1,
  mitigation_plan text,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  identified_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  department text,
  due_date timestamptz,
  last_reviewed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;

-- Create policies for risks
CREATE POLICY "Users can read risks they own or identified"
  ON risks
  FOR SELECT
  TO authenticated
  USING (
    owner_user_id = auth.uid() OR 
    identified_by_user_id = auth.uid()
  );

CREATE POLICY "Managers can read all risks"
  ON risks
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_user_role() IN ('manager', 'admin', 'super_admin')
  );

CREATE POLICY "Authenticated users can create risks"
  ON risks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update risks they own"
  ON risks
  FOR UPDATE
  TO authenticated
  USING (
    owner_user_id = auth.uid() OR 
    identified_by_user_id = auth.uid()
  );

CREATE POLICY "Managers can update department risks"
  ON risks
  FOR UPDATE
  TO authenticated
  USING (
    public.get_my_user_role() IN ('manager', 'admin', 'super_admin') AND
    (department IN (
      SELECT up.department FROM user_profiles up 
      WHERE up.user_id = auth.uid()
    ) OR public.get_my_user_role() IN ('admin', 'super_admin'))
  );

CREATE POLICY "Admins can delete risks"
  ON risks
  FOR DELETE
  TO authenticated
  USING (
    public.get_my_user_role() IN ('admin', 'super_admin')
  );

-- Create function to calculate risk score
CREATE OR REPLACE FUNCTION calculate_risk_score(impact_level risk_impact_level, likelihood_level risk_likelihood_level)
RETURNS integer AS $$
DECLARE
  impact_value integer;
  likelihood_value integer;
BEGIN
  -- Convert impact level to numeric value
  CASE impact_level
    WHEN 'very_low' THEN impact_value := 1;
    WHEN 'low' THEN impact_value := 2;
    WHEN 'medium' THEN impact_value := 3;
    WHEN 'high' THEN impact_value := 4;
    WHEN 'very_high' THEN impact_value := 5;
  END CASE;
  
  -- Convert likelihood level to numeric value
  CASE likelihood_level
    WHEN 'very_low' THEN likelihood_value := 1;
    WHEN 'low' THEN likelihood_value := 2;
    WHEN 'medium' THEN likelihood_value := 3;
    WHEN 'high' THEN likelihood_value := 4;
    WHEN 'very_high' THEN likelihood_value := 5;
  END CASE;
  
  RETURN impact_value * likelihood_value;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate risk score
CREATE OR REPLACE FUNCTION update_risk_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.risk_score := calculate_risk_score(NEW.impact, NEW.likelihood);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_risk_score_trigger
  BEFORE INSERT OR UPDATE ON risks
  FOR EACH ROW
  EXECUTE FUNCTION update_risk_score();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_risks_category ON risks(category);
CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);
CREATE INDEX IF NOT EXISTS idx_risks_risk_score ON risks(risk_score);
CREATE INDEX IF NOT EXISTS idx_risks_owner_user_id ON risks(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_risks_identified_by_user_id ON risks(identified_by_user_id);
CREATE INDEX IF NOT EXISTS idx_risks_department ON risks(department);
CREATE INDEX IF NOT EXISTS idx_risks_due_date ON risks(due_date);
CREATE INDEX IF NOT EXISTS idx_risks_created_at ON risks(created_at);

-- Insert sample data
INSERT INTO risks (
  title, description, category, status, impact, likelihood, mitigation_plan,
  owner_user_id, identified_by_user_id, department, due_date, last_reviewed_at
) VALUES 
(
  'Cyber Attack on Critical Infrastructure',
  'Potential for sophisticated cyber attacks targeting our data centers and network infrastructure, which could result in data breaches, service disruptions, and significant financial losses.',
  'security',
  'mitigated',
  'very_high',
  'high',
  'Implemented multi-layered security architecture including advanced firewalls, intrusion detection systems, regular security audits, employee training programs, and incident response procedures. Continuous monitoring and threat intelligence integration.',
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  'IT Security',
  '2024-03-15T00:00:00Z',
  '2024-01-10T14:30:00Z'
),
(
  'Geopolitical Instability in Key Markets',
  'Rising political tensions and potential conflicts in regions where we have significant operations could impact personnel safety, asset security, and business continuity.',
  'strategic',
  'monitoring',
  'high',
  'medium',
  'Established comprehensive risk monitoring protocols, developed evacuation procedures, maintained strong relationships with local authorities and embassies, and created contingency plans for rapid personnel relocation.',
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  'Field Operations',
  '2024-02-28T00:00:00Z',
  '2024-01-08T10:15:00Z'
),
(
  'Supply Chain Disruption',
  'Potential disruptions to critical supply chains due to natural disasters, political instability, or economic factors could impact our ability to maintain operations and deliver services.',
  'operational',
  'assessed',
  'medium',
  'medium',
  'Diversified supplier base across multiple geographic regions, established alternative supply routes, maintained strategic inventory reserves, and developed supplier risk assessment protocols.',
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  'Operations',
  '2024-04-01T00:00:00Z',
  '2024-01-05T16:45:00Z'
),
(
  'Regulatory Compliance Changes',
  'New and evolving regulations in data protection, security standards, and international trade could require significant operational changes and compliance investments.',
  'compliance',
  'identified',
  'medium',
  'high',
  'Established dedicated compliance team, implemented regular regulatory monitoring, engaged with legal experts, and developed flexible compliance frameworks that can adapt to changing requirements.',
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  'Legal & Compliance',
  '2024-05-15T00:00:00Z',
  NULL
),
(
  'Key Personnel Departure',
  'Loss of critical personnel with specialized knowledge and security clearances could impact operational capabilities and create knowledge gaps in sensitive areas.',
  'operational',
  'mitigated',
  'high',
  'low',
  'Implemented comprehensive knowledge management systems, cross-training programs, succession planning, competitive retention packages, and detailed documentation of critical processes.',
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  'HR',
  '2024-06-30T00:00:00Z',
  '2024-01-12T09:30:00Z'
);