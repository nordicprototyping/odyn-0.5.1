/*
  # Create mitigations table

  1. New Tables
    - `mitigations`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key to organizations)
      - `name` (text, required)
      - `description` (text, optional)
      - `category` (text, required - asset, personnel, incident, travel, risk, general)
      - `default_risk_reduction_score` (integer, default 0)
      - `is_custom` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `mitigations` table
    - Add policies for authenticated users to manage mitigations within their organization

  3. Indexes
    - Add indexes for performance on commonly queried columns
*/

CREATE TABLE IF NOT EXISTS public.mitigations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    category text NOT NULL,
    default_risk_reduction_score integer NOT NULL DEFAULT 0,
    is_custom boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.mitigations ENABLE ROW LEVEL SECURITY;

-- Add check constraint for category values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'mitigations' AND constraint_name = 'check_category_enum'
  ) THEN
    ALTER TABLE public.mitigations
    ADD CONSTRAINT check_category_enum CHECK (category IN ('asset', 'personnel', 'incident', 'travel', 'risk', 'general'));
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mitigations_organization_id ON public.mitigations(organization_id);
CREATE INDEX IF NOT EXISTS idx_mitigations_category ON public.mitigations(category);
CREATE INDEX IF NOT EXISTS idx_mitigations_is_custom ON public.mitigations(is_custom);
CREATE INDEX IF NOT EXISTS idx_mitigations_created_at ON public.mitigations(created_at);

-- Create trigger for updated_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'update_mitigations_updated_at'
  ) THEN
    CREATE TRIGGER update_mitigations_updated_at
    BEFORE UPDATE ON public.mitigations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- RLS Policies
CREATE POLICY "Users can read mitigations in their organization"
  ON public.mitigations
  FOR SELECT
  TO authenticated
  USING (organization_id = get_my_organization_id());

CREATE POLICY "Users can create mitigations in their organization"
  ON public.mitigations
  FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_my_organization_id());

CREATE POLICY "Users can update mitigations in their organization"
  ON public.mitigations
  FOR UPDATE
  TO authenticated
  USING (organization_id = get_my_organization_id())
  WITH CHECK (organization_id = get_my_organization_id());

CREATE POLICY "Admins can delete mitigations in their organization"
  ON public.mitigations
  FOR DELETE
  TO authenticated
  USING (
    organization_id = get_my_organization_id() AND
    get_my_user_role() = ANY(ARRAY['admin'::user_role, 'super_admin'::user_role])
  );

-- Insert some default mitigations for each category
INSERT INTO public.mitigations (organization_id, name, description, category, default_risk_reduction_score, is_custom)
SELECT 
  o.id as organization_id,
  mitigation_data.name,
  mitigation_data.description,
  mitigation_data.category,
  mitigation_data.score,
  false as is_custom
FROM public.organizations o
CROSS JOIN (
  VALUES 
    -- Asset mitigations
    ('Access Control Systems', 'Implement card readers, biometric scanners, and multi-factor authentication', 'asset', 15),
    ('CCTV Surveillance', 'Install comprehensive video monitoring systems with recording capabilities', 'asset', 10),
    ('Physical Barriers', 'Deploy fencing, bollards, and security checkpoints', 'asset', 12),
    ('Security Guards', 'Station trained security personnel at critical locations', 'asset', 18),
    ('Intrusion Detection', 'Install motion sensors and alarm systems', 'asset', 14),
    
    -- Personnel mitigations
    ('Background Checks', 'Conduct thorough vetting of personnel before employment', 'personnel', 20),
    ('Security Training', 'Provide regular security awareness and protocol training', 'personnel', 15),
    ('Access Restrictions', 'Limit personnel access based on clearance levels and need-to-know', 'personnel', 12),
    ('Regular Reviews', 'Conduct periodic security clearance and access reviews', 'personnel', 10),
    ('Buddy System', 'Implement paired work arrangements for high-risk activities', 'personnel', 8),
    
    -- Incident mitigations
    ('Emergency Response Plan', 'Develop and maintain comprehensive incident response procedures', 'incident', 25),
    ('Communication Systems', 'Establish redundant communication channels for emergencies', 'incident', 15),
    ('Evacuation Procedures', 'Create and practice evacuation routes and assembly points', 'incident', 18),
    ('Medical Support', 'Ensure availability of first aid and medical emergency response', 'incident', 12),
    ('Incident Documentation', 'Implement systematic incident reporting and analysis', 'incident', 8),
    
    -- Travel mitigations
    ('Route Planning', 'Conduct thorough route analysis and risk assessment', 'travel', 15),
    ('Security Escorts', 'Provide trained security personnel for high-risk travel', 'travel', 20),
    ('Communication Protocols', 'Establish regular check-in procedures and emergency contacts', 'travel', 12),
    ('Local Intelligence', 'Gather current threat information for destination areas', 'travel', 18),
    ('Emergency Extraction', 'Prepare contingency plans for emergency evacuation', 'travel', 25),
    
    -- Risk mitigations
    ('Risk Assessment', 'Conduct regular comprehensive risk evaluations', 'risk', 15),
    ('Mitigation Planning', 'Develop specific action plans to address identified risks', 'risk', 20),
    ('Monitoring Systems', 'Implement continuous risk monitoring and alerting', 'risk', 12),
    ('Regular Reviews', 'Schedule periodic risk assessment updates and reviews', 'risk', 10),
    ('Contingency Planning', 'Prepare backup plans for high-probability risks', 'risk', 18),
    
    -- General mitigations
    ('Policy Development', 'Create comprehensive security policies and procedures', 'general', 12),
    ('Regular Audits', 'Conduct periodic security assessments and compliance checks', 'general', 15),
    ('Staff Training', 'Provide ongoing security education and awareness programs', 'general', 10),
    ('Technology Updates', 'Maintain current security systems and software', 'general', 8),
    ('Vendor Management', 'Implement security requirements for third-party providers', 'general', 12)
) AS mitigation_data(name, description, category, score)
WHERE NOT EXISTS (
  SELECT 1 FROM public.mitigations m 
  WHERE m.organization_id = o.id 
  AND m.name = mitigation_data.name 
  AND m.category = mitigation_data.category
);