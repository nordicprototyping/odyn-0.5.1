/*
  # Create notifications table

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `organization_id` (uuid, references organizations)
      - `type` (text, enum: alert, info, success, warning)
      - `title` (text)
      - `message` (text)
      - `category` (text, enum: security, personnel, travel, system, incident, risk, asset, audit)
      - `priority` (text, enum: low, medium, high, critical)
      - `read` (boolean, default false)
      - `resource_type` (text, nullable)
      - `resource_id` (uuid, nullable)
      - `created_at` (timestamp with time zone, default now())
  2. Security
    - Enable RLS on `notifications` table
    - Add policies for users to read their own notifications
    - Add policies for admins to read all notifications in their organization
    - Add policies for users to mark their own notifications as read
    - Add policies for admins to manage all notifications in their organization
*/

-- Create the notifications table
CREATE TABLE public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- User who receives the notification (can be null for system-wide)
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    type text NOT NULL CHECK (type IN ('alert', 'info', 'success', 'warning')),
    title text NOT NULL,
    message text NOT NULL,
    category text NOT NULL CHECK (category IN ('security', 'personnel', 'travel', 'system', 'incident', 'risk', 'asset', 'audit')),
    priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    read boolean DEFAULT FALSE NOT NULL,
    resource_type text, -- e.g., 'risk', 'travel_plan', 'incident'
    resource_id uuid,   -- ID of the linked resource
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX idx_notifications_organization_id ON public.notifications (organization_id);
CREATE INDEX idx_notifications_read ON public.notifications (read);
CREATE INDEX idx_notifications_created_at ON public.notifications (created_at DESC);
CREATE INDEX idx_notifications_priority ON public.notifications (priority);

-- Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy for SELECT: Users can read their own notifications or all notifications within their organization if they are an admin/super_admin
CREATE POLICY "Users can read their own notifications or all within their organization if admin"
ON public.notifications FOR SELECT
TO authenticated
USING (
    (user_id = auth.uid() AND organization_id = get_my_organization_id()) OR
    (get_my_user_role() IN ('admin', 'super_admin') AND organization_id = get_my_organization_id())
);

-- RLS Policy for INSERT: Authenticated users can create notifications for their organization
CREATE POLICY "Authenticated users can create notifications for their organization"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (organization_id = get_my_organization_id());

-- RLS Policy for UPDATE: Users can mark their own notifications as read; Admins can update any notification within their organization
CREATE POLICY "Users can update their own notifications or all within their organization if admin"
ON public.notifications FOR UPDATE
TO authenticated
USING (
    (user_id = auth.uid() AND organization_id = get_my_organization_id()) OR
    (get_my_user_role() IN ('admin', 'super_admin') AND organization_id = get_my_organization_id())
)
WITH CHECK (
    (user_id = auth.uid() AND organization_id = get_my_organization_id()) OR
    (get_my_user_role() IN ('admin', 'super_admin') AND organization_id = get_my_organization_id())
);

-- RLS Policy for DELETE: Admins can delete notifications within their organization
CREATE POLICY "Admins can delete notifications within their organization"
ON public.notifications FOR DELETE
TO authenticated
USING (get_my_user_role() IN ('admin', 'super_admin') AND organization_id = get_my_organization_id());