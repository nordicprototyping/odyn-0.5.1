import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

// Define types for request and response
interface CreateOrgAndAdminRequest {
  email: string;
  password: string;
  fullName: string;
}

interface CreateOrgAndAdminResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
  };
  organization?: {
    id: string;
    name: string;
  };
  error?: string;
}

// Define constants
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Create Supabase client with service role key (bypasses RLS)
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
      resource_type: 'organization',
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
    // Parse request body
    const requestData: CreateOrgAndAdminRequest = await req.json();
    
    // Validate request
    if (!requestData.email || !requestData.password || !requestData.fullName) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Email, password, and full name are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requestData.email)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid email format' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Step 1: Create the organization
    console.log('Creating organization for:', requestData.fullName);
    const organizationName = `${requestData.fullName}'s Organization`;
    
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: organizationName,
        plan_type: 'starter',
        settings: {}
      })
      .select()
      .single();
    
    if (orgError) {
      console.error('Error creating organization:', orgError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to create organization: ' + orgError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('Organization created:', organization.id);
    
    // Step 2: Create the user with auth.signUp
    console.log('Creating user:', requestData.email);
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: requestData.email,
      password: requestData.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: requestData.fullName,
        organization_id: organization.id,
        role: 'admin' // User becomes admin of their own organization
      }
    });
    
    if (authError || !authData.user) {
      // If user creation fails, delete the organization to avoid orphaned data
      await supabase
        .from('organizations')
        .delete()
        .eq('id', organization.id);
      
      console.error('Error creating user:', authError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to create user: ' + (authError?.message || 'Unknown error') 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('User created:', authData.user.id);
    
    // Step 3: Create user profile
    console.log('Creating user profile');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        organization_id: organization.id,
        role: 'admin',
        full_name: requestData.fullName
      })
      .select()
      .single();
    
    if (profileError) {
      console.error('Error creating user profile:', profileError);
      // We don't want to roll back here as the user has been created
      // The handle_new_user trigger should eventually create the profile
      console.warn('Continuing despite profile creation error - trigger should handle it');
    } else {
      console.log('User profile created:', profile.id);
    }
    
    // Step 4: Log audit event
    await logAuditEvent(
      authData.user.id, 
      organization.id, 
      'organization_created', 
      {
        organization_name: organizationName,
        user_email: requestData.email,
        user_name: requestData.fullName
      }
    );
    
    // Return success response
    return new Response(JSON.stringify({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email
      },
      organization: {
        id: organization.id,
        name: organization.name
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error processing request:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});