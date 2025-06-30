import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Database } from '../lib/supabase';
import * as authService from '../services/authService';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
type Organization = Database['public']['Tables']['organizations']['Row'];

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  organization: Organization | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error?: string; requiresTwoFactor?: boolean }>;
  signUp: (email: string, password: string, fullName: string, organizationId?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
  verifyTwoFactor: (token: string) => Promise<{ error?: string }>;
  setupTwoFactor: () => Promise<{ secret: string; qrCode: string; backupCodes: string[] }>;
  enableTwoFactor: (token: string) => Promise<{ error?: string; backupCodes: string[] }>;
  disableTwoFactor: (password: string)=> Promise<{ error?: string }>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string | string[]) => boolean;
  refreshProfile: () => Promise<void>;
  joinOrganization: (invitationCode: string) => Promise<{ error?: string; organization?: { id: string; name: string } }>;
  getInvitationDetails: (invitationCode: string) => Promise<{ error?: string; organizationId?: string; organizationName?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Role-based permissions
const ROLE_PERMISSIONS = {
  super_admin: [
    'users.create', 'users.read', 'users.update', 'users.delete',
    'roles.assign', 'roles.revoke',
    'assets.create', 'assets.read', 'assets.update', 'assets.delete',
    'incidents.create', 'incidents.read', 'incidents.update', 'incidents.delete',
    'risks.create', 'risks.read', 'risks.update', 'risks.delete',
    'personnel.create', 'personnel.read', 'personnel.update', 'personnel.delete',
    'travel.create', 'travel.read', 'travel.update', 'travel.delete',
    'audit.read', 'system.configure',
    'organizations.create', 'organizations.read', 'organizations.update', 'organizations.delete',
    'mitigations.create', 'mitigations.read', 'mitigations.update', 'mitigations.delete'
  ],
  admin: [
    'users.read', 'users.update', 'users.create',
    'assets.create', 'assets.read', 'assets.update', 'assets.delete',
    'incidents.create', 'incidents.read', 'incidents.update', 'incidents.delete',
    'risks.create', 'risks.read', 'risks.update', 'risks.delete',
    'personnel.create', 'personnel.read', 'personnel.update', 'personnel.delete',
    'travel.create', 'travel.read', 'travel.update', 'travel.delete',
    'audit.read',
    'organizations.read',
    'mitigations.create', 'mitigations.read', 'mitigations.update', 'mitigations.delete'
  ],
  manager: [
    'assets.read', 'assets.update',
    'incidents.create', 'incidents.read', 'incidents.update',
    'risks.create', 'risks.read', 'risks.update',
    'personnel.read', 'personnel.update',
    'travel.create', 'travel.read', 'travel.update',
    'mitigations.read', 'mitigations.create'
  ],
  user: [
    'assets.read',
    'incidents.read',
    'risks.read',
    'personnel.read',
    'travel.create', 'travel.read',
    'mitigations.read'
  ]
};

// Helper function to wait for a specified duration
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthChange = async (event?: string, session?: Session | null) => {
      console.log('🔐 Auth state changed:', { event, sessionExists: !!session, userId: session?.user?.id });
      setLoading(true);
      
      try {
        console.log('🔄 Setting session and user state');
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('👤 User found in session:', { userId: session.user.id, email: session.user.email });
          console.log('🔍 Fetching user profile for:', session.user.id);
          const fetchedProfile = await fetchUserProfile(session.user.id);
          console.log('👤 Profile fetched:', { 
            success: !!fetchedProfile, 
            profileId: fetchedProfile?.id,
            role: fetchedProfile?.role,
            orgId: fetchedProfile?.organization_id
          });
          setProfile(fetchedProfile);
          
          if (fetchedProfile?.organization_id) {
            console.log('🏢 Fetching organization:', fetchedProfile.organization_id);
            const fetchedOrganization = await fetchOrganization(fetchedProfile.organization_id);
            console.log('🏢 Organization fetched:', { 
              success: !!fetchedOrganization, 
              name: fetchedOrganization?.name,
              planType: fetchedOrganization?.plan_type
            });
            setOrganization(fetchedOrganization);
          } else {
            console.log('⚠️ No organization_id in profile, cannot fetch organization');
            setOrganization(null);
          }
          
          // Log authentication events only after profile is loaded
          if (event && fetchedProfile?.organization_id) {
            console.log('📝 Logging audit event:', { event, userId: session.user.id, orgId: fetchedProfile.organization_id });
            await logAuditEvent(event, session.user.id, fetchedProfile.organization_id);
          }
        } else {
          // Log logout before clearing profile
          if (event === 'SIGNED_OUT' && user?.id && profile?.organization_id) {
            console.log('📝 Logging logout event before clearing profile');
            await logAuditEvent('logout', user.id, profile.organization_id);
          }
          console.log('🚫 No user in session, clearing profile and organization');
          setProfile(null);
          setOrganization(null);
        }
      } catch (error) {
        console.error('❌ Error handling auth change:', error);
      } finally {
        console.log('✅ Auth state processing complete, setting loading to false');
        setLoading(false);
      }
    };

    // Get initial session
    console.log('🔄 Getting initial session');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔄 Initial session retrieved:', { exists: !!session, userId: session?.user?.id });
      handleAuthChange(undefined, session);
    });

    // Listen for auth changes
    console.log('👂 Setting up auth state change listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string, retryCount = 0): Promise<UserProfile | null> => {
    const maxRetries = 10; // Increased from 5 to 10
    const retryDelay = 800; // Increased from 500ms to 800ms
    const queryTimeout = 5000; // 5 second timeout for the query

    console.log(`🔍 Fetching user profile (attempt ${retryCount + 1}/${maxRetries + 1})`, { userId });

    try {
      // Create a promise that rejects after the timeout
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), queryTimeout);
      });

      // Wrap the Supabase query in a nested try-catch to catch any errors specifically from the query
      try {
        console.log('🔍 About to execute Supabase query for user profile:', { userId });
        
        // Log the query parameters
        console.log('Query parameters:', {
          table: 'user_profiles',
          select: '*',
          filter: { field: 'user_id', value: userId }
        });
        
        // Execute the query with explicit error handling and timeout
        let result;
        try {
          // Race the query against the timeout
          result = await Promise.race([
            supabase
              .from('user_profiles')
              .select('*')
              .eq('user_id', userId)
              .single(),
            timeoutPromise
          ]);
          
          // Log the raw result to see exactly what's coming back
          console.log('Raw Supabase query result:', result);
        } catch (queryExecutionError) {
          if (queryExecutionError.message === 'Query timeout') {
            console.warn('⏱️ Supabase query timed out after', queryTimeout, 'ms');
            
            // If we haven't exceeded max retries, try again
            if (retryCount < maxRetries) {
              console.log(`⚠️ Query timed out, retrying... (attempt ${retryCount + 1}/${maxRetries})`);
              await wait(retryDelay);
              return fetchUserProfile(userId, retryCount + 1);
            }
            
            console.error('❌ Maximum retries reached after query timeouts');
            return null;
          }
          
          console.error('❌ Error executing Supabase query:', queryExecutionError);
          throw queryExecutionError;
        }
        
        const { data, error } = result;

        console.log('Supabase fetchUserProfile data:', data); // Added logging
        console.log('Supabase fetchUserProfile error:', error); // Added logging

        if (error) {
          // If no profile found and we haven't exceeded max retries, try again
          if (error.code === 'PGRST116' && retryCount < maxRetries) {
            console.log(`⚠️ Profile not found, retrying... (attempt ${retryCount + 1}/${maxRetries})`, { userId });
            await wait(retryDelay);
            return fetchUserProfile(userId, retryCount + 1);
          }
          
          // If it's a different error or we've exceeded retries, log and return null
          if (error.code !== 'PGRST116') {
            console.error('❌ Error fetching user profile:', error);
          } else {
            console.warn('⚠️ Profile not found after maximum retries. User may need to complete signup process.');
          }
          console.log('🔚 fetchUserProfile: Returning null due to error path.'); // Added this line
          return null;
        }
        
        // If we get here, we have a successful response but data might still be null
        if (!data) {
          console.warn('⚠️ No profile data found for user:', userId);
          
          // If we haven't exceeded max retries, try again
          if (retryCount < maxRetries) {
            console.log(`⚠️ No profile data, retrying... (attempt ${retryCount + 1}/${maxRetries})`);
            await wait(retryDelay);
            return fetchUserProfile(userId, retryCount + 1);
          }
          
          return null;
        }
        
        console.log('✅ User profile found:', { 
          profileId: data.id, 
          role: data.role, 
          orgId: data.organization_id,
          fullName: data.full_name,
          department: data.department
        });
        console.log('✅ fetchUserProfile: Returning data successfully.'); // Added this line
        return data;
      } catch (queryError) {
        // This will catch any errors thrown directly by the Supabase query
        console.error('❌ Error in Supabase query:', queryError);
        throw queryError; // Re-throw to be caught by the outer catch
      }
    } catch (error) {
      console.error('❌ Unexpected error fetching user profile:', error);
      
      // Retry on unexpected errors too, but only a few times
      if (retryCount < 3) {
        console.log(`🔄 Retrying after unexpected error (attempt ${retryCount + 1}/3)`);
        await wait(retryDelay);
        return fetchUserProfile(userId, retryCount + 1);
      }
      
      console.log('🔚 fetchUserProfile: Returning null due to unexpected error after retries.'); // Added this line
      return null;
    }
  };

  const fetchOrganization = async (organizationId: string): Promise<Organization | null> => {
    console.log('🔍 Fetching organization:', { organizationId });
    try {
      console.log('🔍 Executing Supabase query for organization');
      let result;
      try {
        result = await supabase
          .from('organizations')
          .select('*')
          .eq('id', organizationId)
          .single();
        
        console.log('Raw organization query result:', result);
      } catch (queryError) {
        console.error('❌ Error executing organization query:', queryError);
        throw queryError;
      }

      const { data, error } = result;
      
      console.log('Organization query data:', data);
      console.log('Organization query error:', error);

      if (error) {
        console.error('❌ Error fetching organization:', error);
        return null;
      }
      
      console.log('✅ Organization found:', { 
        id: data.id,
        name: data.name, 
        planType: data.plan_type,
        createdAt: data.created_at
      });
      return data;
    } catch (error) {
      console.error('❌ Unexpected error fetching organization:', error);
      return null;
    }
  };

  const logAuditEvent = async (action: string, userId?: string, organizationId?: string, details?: Record<string, any>) => {
    // Use the provided organizationId or fall back to profile's organization_id
    const orgId = organizationId || profile?.organization_id;
    
    if (!orgId) {
      console.warn('⚠️ Cannot log audit event: no organization ID available');
      return;
    }
    
    try {
      console.log('📝 Logging audit event:', { action, userId, orgId });
      const clientIP = await authService.getClientIP();
      
      const { error } = await supabase.from('audit_logs').insert({
        user_id: userId || null,
        organization_id: orgId,
        action,
        details,
        ip_address: clientIP,
        user_agent: navigator.userAgent
      });

      if (error) {
        console.error('❌ Error logging audit event:', error);
      } else {
        console.log('✅ Audit event logged successfully');
      }
    } catch (error) {
      console.error('❌ Unexpected error logging audit event:', error);
    }
  };

  const signIn = async (email: string, password: string, rememberMe = false) => {
    console.log('🔑 useAuth: Attempting sign in:', { email, rememberMe });
    
    const { data, error } = await authService.signInWithPassword(email, password);
    
    if (error) {
      console.warn('❌ useAuth: Login failed:', error);
      return { error };
    }
    
    if (data?.requiresTwoFactor) {
      console.log('🔒 useAuth: 2FA required, returning to UI');
      return { requiresTwoFactor: true };
    }
    
    console.log('✅ useAuth: Sign in successful');
    return {};
  };

  const signUp = async (email: string, password: string, fullName: string, organizationId?: string) => {
    console.log('📝 useAuth: Attempting sign up:', { email, fullName, hasOrganizationId: !!organizationId });
    
    const { data, error } = await authService.signUp(email, password, fullName, organizationId);
    
    if (error) {
      console.warn('❌ useAuth: Signup failed:', error);
      return { error };
    }
    
    console.log('✅ useAuth: Sign up successful');
    return {};
  };

  const signOut = async () => {
    console.log('🚪 useAuth: Signing out');
    
    if (user && profile?.organization_id) {
      console.log('📝 useAuth: Logging sign out event before actual sign out');
      await logAuditEvent('logout', user.id, profile.organization_id);
    }
    
    await authService.signOut();
    console.log('✅ useAuth: Sign out completed');
  };

  const resetPassword = async (email: string) => {
    console.log('🔄 useAuth: Requesting password reset:', { email });
    
    const { error } = await authService.resetPassword(email);
    
    if (error) {
      console.warn('❌ useAuth: Password reset request failed:', error);
      return { error };
    }
    
    console.log('✅ useAuth: Password reset email sent');
    return {};
  };

  const updatePassword = async (password: string) => {
    console.log('🔄 useAuth: Updating password');
    
    const { error } = await authService.updatePassword(password);
    
    if (error) {
      console.warn('❌ useAuth: Password update failed:', error);
      return { error };
    }
    
    console.log('✅ useAuth: Password updated successfully');
    
    if (profile?.organization_id) {
      await logAuditEvent('password_updated', user?.id, profile.organization_id);
    }
    
    return {};
  };

  const verifyTwoFactor = async (token: string) => {
    console.log('🔒 useAuth: Verifying 2FA token');
    
    const { error } = await authService.verifyTwoFactor(token);
    
    if (error) {
      console.warn('❌ useAuth: 2FA verification failed:', error);
      return { error };
    }
    
    console.log('✅ useAuth: 2FA verification successful');
    return {};
  };

  const setupTwoFactor = async () => {
    console.log('🔒 useAuth: Setting up 2FA');
    
    const { data, error } = await authService.setupTwoFactor();
    
    if (error || !data) {
      console.error('❌ useAuth: Error setting up 2FA:', error);
      throw new Error('Failed to set up two-factor authentication');
    }
    
    console.log('✅ useAuth: 2FA setup successful');
    return data;
  };

  const enableTwoFactor = async (token: string) => {
    console.log('🔒 useAuth: Enabling 2FA');
    
    if (!user) {
      console.warn('❌ useAuth: Cannot enable 2FA: no user logged in');
      return { error: 'You must be logged in to enable 2FA' };
    }
    
    const { data, error } = await authService.enableTwoFactor(user.id, token);
    
    if (error || !data) {
      console.error('❌ useAuth: Error enabling 2FA:', error);
      return { error: error || 'Failed to enable two-factor authentication' };
    }
    
    console.log('✅ useAuth: 2FA enabled successfully');
    
    if (profile?.organization_id) {
      await logAuditEvent('two_factor_enabled', user.id, profile.organization_id);
    }
    
    await refreshProfile();
    
    return { backupCodes: data.backupCodes };
  };

  const disableTwoFactor = async (password: string) => {
    console.log('🔒 useAuth: Disabling 2FA');
    
    if (!user) {
      console.warn('❌ useAuth: Cannot disable 2FA: no user logged in');
      return { error: 'You must be logged in to disable 2FA' };
    }
    
    const { error } = await authService.disableTwoFactor(user.id, password);
    
    if (error) {
      console.error('❌ useAuth: Error disabling 2FA:', error);
      return { error };
    }
    
    console.log('✅ useAuth: 2FA disabled successfully');
    
    if (profile?.organization_id) {
      await logAuditEvent('two_factor_disabled', user.id, profile.organization_id);
    }
    
    await refreshProfile();
    
    return {};
  };

  const getInvitationDetails = async (invitationCode: string) => {
    console.log('🔍 useAuth: Getting invitation details for code:', invitationCode);
    
    const { data, error } = await authService.getInvitationDetails(invitationCode);
    
    if (error || !data) {
      console.warn('❌ useAuth: Error fetching invitation details:', error);
      return { error: error || 'Invalid or expired invitation code' };
    }
    
    console.log('✅ useAuth: Invitation details found');
    
    return {
      organizationId: data.organizationId,
      organizationName: data.organizationName
    };
  };

  const joinOrganization = async (invitationCode: string) => {
    console.log('🏢 useAuth: Joining organization with code:', invitationCode);
    
    if (!user) {
      console.warn('❌ useAuth: Cannot join organization: user not logged in');
      return { error: 'You must be logged in to join an organization' };
    }
    
    // Get the current session
    console.log('🔍 useAuth: Getting current session for API call');
    const { data: sessionData } = await authService.getSession();
    const accessToken = sessionData?.access_token;
    
    if (!accessToken) {
      console.warn('❌ useAuth: No access token available for API call');
      return { error: 'No access token available' };
    }
    
    const { data, error } = await authService.joinOrganization(invitationCode, accessToken);
    
    if (error || !data) {
      console.warn('❌ useAuth: Failed to join organization:', error);
      return { error: error || 'Failed to join organization' };
    }
    
    console.log('✅ useAuth: Successfully joined organization:', data.organization);
    
    // Refresh user profile to get updated organization
    await refreshProfile();
    
    return { 
      organization: data.organization
    };
  };

  const hasPermission = (permission: string): boolean => {
    if (!profile) return false;
    const rolePermissions = ROLE_PERMISSIONS[profile.role] || [];
    return rolePermissions.includes(permission);
  };

  const hasRole = (role: string | string[]): boolean => {
    if (!profile) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(profile.role);
  };

  const refreshProfile = async () => {
    if (user) {
      console.log('🔄 useAuth: Refreshing user profile:', user.id);
      setLoading(true);
      try {
        console.log('🔍 useAuth: Fetching updated profile data');
        const fetchedProfile = await fetchUserProfile(user.id);
        console.log('👤 useAuth: Profile refreshed:', { 
          success: !!fetchedProfile, 
          profileId: fetchedProfile?.id,
          role: fetchedProfile?.role,
          orgId: fetchedProfile?.organization_id
        });
        setProfile(fetchedProfile);
        
        if (fetchedProfile?.organization_id) {
          console.log('🏢 useAuth: Refreshing organization:', fetchedProfile.organization_id);
          const fetchedOrganization = await fetchOrganization(fetchedProfile.organization_id);
          console.log('🏢 useAuth: Organization refreshed:', { 
            success: !!fetchedOrganization, 
            name: fetchedOrganization?.name,
            planType: fetchedOrganization?.plan_type
          });
          setOrganization(fetchedOrganization);
        } else {
          console.log('⚠️ useAuth: No organization_id in refreshed profile');
          setOrganization(null);
        }
      } catch (error) {
        console.error('❌ useAuth: Error refreshing profile:', error);
      } finally {
        console.log('✅ useAuth: Profile refresh complete, setting loading to false');
        setLoading(false);
      }
    } else {
      console.warn('⚠️ useAuth: Cannot refresh profile: no user logged in');
    }
  };

  const value = {
    user,
    profile,
    organization,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    verifyTwoFactor,
    setupTwoFactor,
    enableTwoFactor,
    disableTwoFactor,
    hasPermission,
    hasRole,
    refreshProfile,
    joinOrganization,
    getInvitationDetails
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};