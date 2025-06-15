import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

// Define types for invitation request and response
interface AcceptInvitationRequest {
  invitationCode: string;
}

interface AcceptInvitationResponse {
  success: boolean;
  organization?: {
    id: string;
    name: string;
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
    
    // Parse request body
    const requestData: AcceptInvitationRequest = await req.json();
    
    // Validate request
    if (!requestData.invitationCode) {
      return new Response(JSON.stringify({ error: 'Invitation code is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Find the invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('organization_invitations')
      .select('id, organization_id, invited_email, role, status, expires_at')
      .eq('invitation_code', requestData.invitationCode)
      .single();
    
    if (invitationError || !invitation) {
      return new Response(JSON.stringify({ error: 'Invalid invitation code' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      return new Response(JSON.stringify({ error: `Invitation is ${invitation.status}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      // Update invitation status to expired
      await supabase
        .from('organization_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);
      
      return new Response(JSON.stringify({ error: 'Invitation has expired' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Check if the user's email matches the invited email
    if (user.email !== invitation.invited_email) {
      return new Response(JSON.stringify({ 
        error: 'This invitation was sent to a different email address. Please log in with the email address that received the invitation.' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Get the organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', invitation.organization_id)
      .single();
    
    if (orgError || !organization) {
      return new Response(JSON.stringify({ error: 'Organization not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Check if user already has a profile
    const { data: existingProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, organization_id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    // Begin transaction
    // Note: We're using multiple operations since Supabase Edge Functions don't support true transactions
    
    // 1. Update invitation status to accepted
    const { error: updateInvitationError } = await supabase
      .from('organization_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id);
    
    if (updateInvitationError) {
      return new Response(JSON.stringify({ error: 'Failed to update invitation status' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // 2. Update or create user profile
    let profileUpdateError = null;
    
    if (existingProfile) {
      // Update existing profile
      const { error } = await supabase
        .from('user_profiles')
        .update({
          organization_id: invitation.organization_id,
          role: invitation.role
        })
        .eq('id', existingProfile.id);
      
      profileUpdateError = error;
    } else {
      // Create new profile
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          organization_id: invitation.organization_id,
          role: invitation.role,
          full_name: user.user_metadata.full_name || user.email?.split('@')[0] || 'User'
        });
      
      profileUpdateError = error;
    }
    
    if (profileUpdateError) {
      return new Response(JSON.stringify({ error: 'Failed to update user profile' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Log audit event
    await logAuditEvent(user.id, invitation.organization_id, 'invitation_accepted', {
      invitation_id: invitation.id,
      invited_email: invitation.invited_email,
      role: invitation.role
    });
    
    // Return success response
    const response: AcceptInvitationResponse = {
      success: true,
      organization: {
        id: organization.id,
        name: organization.name
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