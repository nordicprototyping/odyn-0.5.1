/*
  # Organization Invitations Schema

  1. New Tables
    - `organization_invitations`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key to organizations)
      - `invited_email` (text)
      - `invitation_code` (text, unique)
      - `invited_by_user_id` (uuid, foreign key to auth.users)
      - `role` (user_role, default 'user')
      - `expires_at` (timestamptz)
      - `status` (enum: pending, accepted, expired, cancelled)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on organization_invitations table
    - Add policies for role-based access control
    - Admins can manage invitations for their organization
    - Users can view invitations sent to their email

  3. Functions and Triggers
    - Auto-update timestamp trigger
    - Auto-expire invitations trigger
    - Performance indexes
*/

-- Create custom type for invitation status
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status') THEN
    CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');
  END IF;
END $$;

-- Create organization_invitations table
CREATE TABLE IF NOT EXISTS organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  invitation_code text UNIQUE NOT NULL,
  invited_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'user',
  expires_at timestamptz NOT NULL,
  status invitation_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for organization_invitations
CREATE POLICY "Admins can manage invitations for their organization"
  ON organization_invitations
  FOR ALL
  TO authenticated
  USING (
    organization_id = get_my_organization_id() AND
    get_my_user_role() IN ('admin', 'super_admin')
  )
  WITH CHECK (
    organization_id = get_my_organization_id() AND
    get_my_user_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Users can view invitations sent to their email"
  ON organization_invitations
  FOR SELECT
  TO authenticated
  USING (
    invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Create trigger for updated_at
CREATE TRIGGER update_organization_invitations_updated_at
  BEFORE UPDATE ON organization_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically expire invitations
CREATE OR REPLACE FUNCTION auto_expire_invitations()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE organization_invitations
  SET status = 'expired'
  WHERE expires_at < now() AND status = 'pending';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run auto_expire_invitations function periodically
CREATE OR REPLACE FUNCTION create_auto_expire_trigger()
RETURNS void AS $$
BEGIN
  -- Drop the trigger if it exists
  DROP TRIGGER IF EXISTS trigger_auto_expire_invitations ON organization_invitations;
  
  -- Create the trigger
  CREATE TRIGGER trigger_auto_expire_invitations
  AFTER INSERT OR UPDATE ON organization_invitations
  EXECUTE FUNCTION auto_expire_invitations();
END;
$$ LANGUAGE plpgsql;

-- Call the function to create the trigger
SELECT create_auto_expire_trigger();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organization_invitations_organization_id ON organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_invited_email ON organization_invitations(invited_email);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_invitation_code ON organization_invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_status ON organization_invitations(status);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_expires_at ON organization_invitations(expires_at);