/*
  # AI Token Usage Tracking Schema

  1. New Tables
    - `ai_token_usage`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key to organizations)
      - `total_tokens` (bigint)
      - `last_used` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `ai_usage_logs`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key to organizations)
      - `user_id` (uuid, foreign key to auth.users, optional)
      - `operation_type` (text)
      - `tokens_used` (integer)
      - `timestamp` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for admin access
    - Add indexes for performance

  3. Organization Settings Update
    - Add AI settings to organization settings schema
*/

-- Create ai_token_usage table
CREATE TABLE IF NOT EXISTS ai_token_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  total_tokens bigint NOT NULL DEFAULT 0,
  last_used timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create ai_usage_logs table
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  operation_type text NOT NULL,
  tokens_used integer NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE ai_token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for ai_token_usage
CREATE POLICY "Admins can read token usage"
  ON ai_token_usage
  FOR SELECT
  TO authenticated
  USING (
    organization_id = get_my_organization_id() AND
    get_my_user_role() IN ('admin', 'super_admin')
  );

-- Create policies for ai_usage_logs
CREATE POLICY "Admins can read usage logs"
  ON ai_usage_logs
  FOR SELECT
  TO authenticated
  USING (
    organization_id = get_my_organization_id() AND
    get_my_user_role() IN ('admin', 'super_admin')
  );

-- Create trigger for ai_token_usage updated_at
CREATE TRIGGER update_ai_token_usage_updated_at
  BEFORE UPDATE ON ai_token_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_organization_id ON ai_token_usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_organization_id ON ai_usage_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_timestamp ON ai_usage_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_operation_type ON ai_usage_logs(operation_type);

-- Update organizations table to include AI settings in the default settings
UPDATE organizations
SET settings = jsonb_set(
  settings,
  '{ai}',
  '{"enabled": true, "model": "gpt-4", "tokenLimit": 1000000, "settings": {"temperature": 0.7, "contextWindow": 8000, "responseLength": "medium"}, "notifications": {"approachingLimit": true, "limitThreshold": 80, "weeklyUsageReport": true}}',
  true
)
WHERE settings -> 'ai' IS NULL;

-- Insert sample data for testing
INSERT INTO ai_token_usage (organization_id, total_tokens, last_used)
SELECT 
  id as organization_id,
  floor(random() * 500000) as total_tokens,
  now() - (random() * interval '7 days') as last_used
FROM organizations
ON CONFLICT (organization_id) DO NOTHING;

-- Insert sample usage logs
INSERT INTO ai_usage_logs (organization_id, user_id, operation_type, tokens_used, timestamp)
SELECT
  o.id as organization_id,
  (SELECT id FROM auth.users ORDER BY random() LIMIT 1) as user_id,
  (ARRAY['asset', 'personnel', 'travel', 'incident', 'risk', 'organization', 'mitigation'])[floor(random() * 7 + 1)] as operation_type,
  floor(random() * 2000) as tokens_used,
  now() - (random() * interval '30 days') as timestamp
FROM organizations o
CROSS JOIN generate_series(1, 50) -- 50 sample logs per organization
ON CONFLICT DO NOTHING;