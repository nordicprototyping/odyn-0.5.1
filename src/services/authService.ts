import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

/**
 * Service for handling authentication-related operations with Supabase
 */
export interface AuthResponse<T = any> {
  data: T | null;
  error: string | null;
}

/**
 * Sign in with email and password
 */
export async function signInWithPassword(email: string, password: string): Promise<AuthResponse<{ user: User | null; session: Session | null; requiresTwoFactor?: boolean }>> {
  try {
    console.log('🔑 AuthService: Attempting sign in:', { email });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.warn('❌ AuthService: Login failed:', error.message);
      return { data: null, error: error.message };
    }

    console.log('✅ AuthService: Sign in successful:', { userId: data.user?.id, email: data.user?.email });
    
    // Check if 2FA is enabled for this user
    if (data.user) {
      console.log('🔍 AuthService: Checking if 2FA is enabled for user');
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('two_factor_enabled')
        .eq('user_id', data.user.id)
        .single();

      if (profileError) {
        console.warn('❌ AuthService: Error checking 2FA status:', profileError.message);
      } else if (profile?.two_factor_enabled) {
        console.log('🔒 AuthService: 2FA is enabled, signing out temporarily');
        // Sign out temporarily until 2FA is verified
        await supabase.auth.signOut();
        return { data: { user: null, session: null, requiresTwoFactor: true }, error: null };
      } else {
        console.log('🔓 AuthService: 2FA is not enabled, proceeding with login');
        
        // Reset failed login attempts on successful login
        await supabase
          .from('user_profiles')
          .update({
            failed_login_attempts: 0,
            account_locked_until: null,
            last_login: new Date().toISOString()
          })
          .eq('user_id', data.user.id);
      }
    }

    return { data: { user: data.user, session: data.session }, error: null };
  } catch (error) {
    console.error('❌ AuthService: Unexpected error during sign in:', error);
    return { data: null, error: 'An unexpected error occurred during sign in' };
  }
}

/**
 * Sign up with email, password, and additional user data
 */
export async function signUp(
  email: string, 
  password: string, 
  fullName: string, 
  organizationId?: string
): Promise<AuthResponse<User>> {
  try {
    console.log('📝 AuthService: Attempting sign up:', { email, fullName, hasOrganizationId: !!organizationId });
    
    // Prepare user metadata
    const userData: any = {
      full_name: fullName,
      organization_id: organizationId,
      role: organizationId ? 'user' : 'admin' // User becomes admin of their own organization
    };

    console.log('📝 AuthService: Signing up user with metadata:', userData);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    });

    if (error) {
      console.warn('❌ AuthService: Signup failed:', error.message);
      return { data: null, error: error.message };
    }

    console.log('✅ AuthService: Sign up successful:', { 
      userId: data.user?.id, 
      email: data.user?.email,
      fullName: data.user?.user_metadata?.full_name,
      organizationId: data.user?.user_metadata?.organization_id,
      role: data.user?.user_metadata?.role
    });

    return { data: data.user, error: null };
  } catch (error) {
    console.error('❌ AuthService: Unexpected error during sign up:', error);
    return { data: null, error: 'An unexpected error occurred during sign up' };
  }
}

/**
 * Create a new organization for a user
 */
export async function createOrganizationForUser(fullName: string): Promise<AuthResponse<string>> {
  try {
    console.log('🏢 AuthService: Creating new organization for user:', { fullName });
    
    // Extract organization name from user's full name
    const organizationName = `${fullName}'s Organization`;
    
    const { data, error } = await supabase
      .from('organizations')
      .insert({
        name: organizationName,
        plan_type: 'starter',
        settings: {}
      })
      .select()
      .single();

    if (error) {
      console.error('❌ AuthService: Error creating organization:', error);
      return { data: null, error: 'Failed to create organization' };
    }

    console.log('✅ AuthService: Organization created successfully:', { 
      id: data.id, 
      name: data.name 
    });
    return { data: data.id, error: null };
  } catch (error) {
    console.error('❌ AuthService: Unexpected error creating organization:', error);
    return { data: null, error: 'An unexpected error occurred creating organization' };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<AuthResponse<null>> {
  try {
    console.log('🚪 AuthService: Signing out');
    await supabase.auth.signOut();
    console.log('✅ AuthService: Sign out completed');
    return { data: null, error: null };
  } catch (error) {
    console.error('❌ AuthService: Error during sign out:', error);
    return { data: null, error: 'Failed to sign out' };
  }
}

/**
 * Reset password for a user
 */
export async function resetPassword(email: string, redirectUrl?: string): Promise<AuthResponse<null>> {
  try {
    console.log('🔄 AuthService: Requesting password reset:', { email });
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl || `${window.location.origin}/reset-password`
    });

    if (error) {
      console.warn('❌ AuthService: Password reset request failed:', error.message);
      return { data: null, error: error.message };
    }

    console.log('✅ AuthService: Password reset email sent');
    return { data: null, error: null };
  } catch (error) {
    console.error('❌ AuthService: Unexpected error during password reset:', error);
    return { data: null, error: 'An unexpected error occurred during password reset' };
  }
}

/**
 * Update user password
 */
export async function updatePassword(password: string): Promise<AuthResponse<null>> {
  try {
    console.log('🔄 AuthService: Updating password');
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      console.warn('❌ AuthService: Password update failed:', error.message);
      return { data: null, error: error.message };
    }

    console.log('✅ AuthService: Password updated successfully');
    return { data: null, error: null };
  } catch (error) {
    console.error('❌ AuthService: Unexpected error during password update:', error);
    return { data: null, error: 'An unexpected error occurred during password update' };
  }
}

/**
 * Get the current session
 */
export async function getSession(): Promise<AuthResponse<Session>> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data.session, error: null };
  } catch (error) {
    console.error('❌ AuthService: Error getting session:', error);
    return { data: null, error: 'Failed to get session' };
  }
}

/**
 * Get the current user
 */
export async function getUser(): Promise<AuthResponse<User>> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data.user, error: null };
  } catch (error) {
    console.error('❌ AuthService: Error getting user:', error);
    return { data: null, error: 'Failed to get user' };
  }
}

/**
 * Verify two-factor authentication code
 * Note: This is a simplified implementation
 */
export async function verifyTwoFactor(token: string): Promise<AuthResponse<null>> {
  try {
    console.log('🔒 AuthService: Verifying 2FA token');
    // In a real implementation, this would verify the TOTP token
    // For now, we'll just return success
    return { data: null, error: null };
  } catch (error) {
    console.error('❌ AuthService: Error verifying 2FA token:', error);
    return { data: null, error: 'Failed to verify 2FA token' };
  }
}

/**
 * Set up two-factor authentication
 * Note: This is a simplified implementation
 */
export async function setupTwoFactor(): Promise<AuthResponse<{ secret: string; qrCode: string; backupCodes: string[] }>> {
  try {
    console.log('🔒 AuthService: Setting up 2FA');
    // In a real implementation, this would generate a TOTP secret and QR code
    const secret = 'JBSWY3DPEHPK3PXP'; // Example secret
    const qrCode = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const backupCodes = ['123456', '789012', '345678', '901234', '567890'];
    
    return { 
      data: { secret, qrCode, backupCodes }, 
      error: null 
    };
  } catch (error) {
    console.error('❌ AuthService: Error setting up 2FA:', error);
    return { data: null, error: 'Failed to set up 2FA' };
  }
}

/**
 * Enable two-factor authentication
 */
export async function enableTwoFactor(userId: string, token: string): Promise<AuthResponse<{ backupCodes: string[] }>> {
  try {
    console.log('🔒 AuthService: Enabling 2FA');
    // In a real implementation, this would verify the token first
    
    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 8).toUpperCase()
    );

    console.log('🔄 AuthService: Updating user profile with 2FA settings');
    const { error } = await supabase
      .from('user_profiles')
      .update({
        two_factor_enabled: true,
        backup_codes: backupCodes
      })
      .eq('user_id', userId);

    if (error) {
      console.error('❌ AuthService: Error updating user profile:', error);
      return { data: null, error: 'Failed to enable 2FA' };
    }

    console.log('✅ AuthService: 2FA enabled successfully');
    return { data: { backupCodes }, error: null };
  } catch (error) {
    console.error('❌ AuthService: Error enabling 2FA:', error);
    return { data: null, error: 'Failed to enable 2FA' };
  }
}

/**
 * Disable two-factor authentication
 */
export async function disableTwoFactor(userId: string, password: string): Promise<AuthResponse<null>> {
  try {
    console.log('🔒 AuthService: Disabling 2FA');
    
    // Get user email
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return { data: null, error: 'User not found' };
    }
    
    // Verify password
    console.log('🔍 AuthService: Verifying password before disabling 2FA');
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: userData.user.email || '',
      password
    });

    if (authError) {
      console.warn('❌ AuthService: Invalid password when disabling 2FA');
      return { data: null, error: 'Invalid password' };
    }

    console.log('🔄 AuthService: Updating user profile to disable 2FA');
    const { error } = await supabase
      .from('user_profiles')
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        backup_codes: null
      })
      .eq('user_id', userId);

    if (error) {
      console.error('❌ AuthService: Error updating user profile:', error);
      return { data: null, error: 'Failed to disable 2FA' };
    }

    console.log('✅ AuthService: 2FA disabled successfully');
    return { data: null, error: null };
  } catch (error) {
    console.error('❌ AuthService: Error disabling 2FA:', error);
    return { data: null, error: 'Failed to disable 2FA' };
  }
}

/**
 * Get invitation details
 */
export async function getInvitationDetails(invitationCode: string): Promise<AuthResponse<{ organizationId: string; organizationName: string }>> {
  try {
    console.log('🔍 AuthService: Getting invitation details for code:', invitationCode);
    const { data, error } = await supabase
      .from('organization_invitations')
      .select(`
        organization_id,
        organizations!inner(name)
      `)
      .eq('invitation_code', invitationCode)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) {
      console.warn('❌ AuthService: Error fetching invitation details:', error.message);
      return { data: null, error: 'Invalid or expired invitation code' };
    }

    console.log('✅ AuthService: Invitation details found:', { 
      organizationId: data.organization_id,
      organizationName: data.organizations.name
    });

    return {
      data: {
        organizationId: data.organization_id,
        organizationName: data.organizations.name
      },
      error: null
    };
  } catch (error) {
    console.error('❌ AuthService: Unexpected error fetching invitation details:', error);
    return { data: null, error: 'An unexpected error occurred' };
  }
}

/**
 * Join an organization using an invitation code
 */
export async function joinOrganization(invitationCode: string, accessToken: string): Promise<AuthResponse<{ organization: { id: string; name: string } }>> {
  try {
    console.log('🏢 AuthService: Joining organization with code:', invitationCode);
    
    if (!accessToken) {
      console.warn('❌ AuthService: No access token available for API call');
      return { data: null, error: 'No access token available' };
    }

    // Call the accept-invitation edge function
    console.log('🔄 AuthService: Calling accept-invitation edge function');
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-invitation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        invitationCode
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.warn('❌ AuthService: Failed to join organization:', result.error);
      return { data: null, error: result.error || 'Failed to join organization' };
    }

    console.log('✅ AuthService: Successfully joined organization:', result.organization);
    return { 
      data: { 
        organization: result.organization 
      }, 
      error: null 
    };
  } catch (error) {
    console.error('❌ AuthService: Error joining organization:', error);
    return { data: null, error: 'An unexpected error occurred while joining the organization' };
  }
}

/**
 * Get client IP address
 */
export async function getClientIP(): Promise<string | null> {
  try {
    console.log('🔍 AuthService: Attempting to get client IP');
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    console.log('✅ AuthService: Client IP retrieved:', data.ip);
    return data.ip;
  } catch (error) {
    console.error('❌ AuthService: Error getting client IP:', error);
    return null;
  }
}