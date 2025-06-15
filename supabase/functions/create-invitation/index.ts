import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { v4 as uuidv4 } from 'npm:uuid@9.0.0';

// Define types for invitation request and response
interface CreateInvitationRequest {
  email: string;
  organizationId: string;
  role?: 'user' | 'manager' | 'admin';
  expiresInDays?: number;
}

interface CreateInvitationResponse {
  success: boolean;
  invitation?: {
    id: string;
    code: string;
    email: string;
    expiresAt: string;
  };
  error?: string;
}

// Define constants
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Helper function to generate a secure invitation code
function generateInvitationCode(): string {
  // Generate a UUID and remove hyphens
  const uuid = uuidv4().replace(/-/g, '');
  
  // Take the first 16 characters and convert to base64
  const base64 = btoa(uuid.substring(0, 16));
  
  // Remove any non-alphanumeric characters and trim to 12 characters
  return base64.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
}

// Helper function to log audit event
async function logAuditEvent(userId: string, organizationId: string, action: string, details: any) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      organization_id: organizationId,
      action,
      resource_type: 'invitation',
      details,
    });
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
}

// Main handler function
Deno.serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Get user profile to check role
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !userProfile) {
      return new Response(JSON.stringify({ error: 'User profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Check if user has admin or super_admin role
    if (!['admin', 'super_admin'].includes(userProfile.role)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions to create invitations' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Parse request body
    const requestData: CreateInvitationRequest = await req.json();
    
    // Validate request
    if (!requestData.email || !requestData.organizationId) {
      return new Response(JSON.stringify({ error: 'Email and organizationId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requestData.email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Check if user belongs to the organization they're inviting to
    if (userProfile.organization_id !== requestData.organizationId) {
      return new Response(JSON.stringify({ error: 'You can only invite users to your own organization' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Check if organization exists
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', requestData.organizationId)
      .single();
    
    if (orgError || !organization) {
      return new Response(JSON.stringify({ error: 'Organization not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Check if invitation already exists for this email in this organization
    const { data: existingInvitation, error: invitationError } = await supabase
      .from('organization_invitations')
      .select('id, status')
      .eq('organization_id', requestData.organizationId)
      .eq('invited_email', requestData.email)
      .eq('status', 'pending')
      .maybeSingle();
    
    if (existingInvitation) {
      return new Response(JSON.stringify({ 
        error: 'An invitation has already been sent to this email address',
        invitation: {
          id: existingInvitation.id,
          email: requestData.email
        }
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Check if user already exists in the organization
    const { data: existingUser, error: userError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('organization_id', requestData.organizationId)
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'User is already a member of this organization' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Generate invitation code
    const invitationCode = generateInvitationCode();
    
    // Set expiration date (default to 7 days if not specified)
    const expiresInDays = requestData.expiresInDays || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    
    // Create invitation
    const { data: invitation, error: createError } = await supabase
      .from('organization_invitations')
      .insert({
        organization_id: requestData.organizationId,
        invited_email: requestData.email,
        invitation_code: invitationCode,
        invited_by_user_id: user.id,
        role: requestData.role || 'user',
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single();
    
    if (createError || !invitation) {
      return new Response(JSON.stringify({ error: 'Failed to create invitation' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Log audit event
    await logAuditEvent(user.id, requestData.organizationId, 'invitation_created', {
      invitation_id: invitation.id,
      invited_email: requestData.email,
      role: requestData.role || 'user'
    });
    
    // Return success response
    const response: CreateInvitationResponse = {
      success: true,
      invitation: {
        id: invitation.id,
        code: invitation.invitation_code,
        email: invitation.invited_email,
        expiresAt: invitation.expires_at
      }
    };
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error processing request:', error);
    
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});