import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Database } from '../lib/supabase';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
type Organization = Database['public']['Tables']['organizations']['Row'];

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  organization: Organization | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error?: string; requiresTwoFactor?: boolean }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
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
      setLoading(true);
      
      try {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const fetchedProfile = await fetchUserProfile(session.user.id);
          setProfile(fetchedProfile);
          
          if (fetchedProfile?.organization_id) {
            const fetchedOrganization = await fetchOrganization(fetchedProfile.organization_id);
            setOrganization(fetchedOrganization);
          }
          
          // Log authentication events only after profile is loaded
          if (event && fetchedProfile?.organization_id) {
            await logAuditEvent(event, session.user.id, fetchedProfile.organization_id);
          }
        } else {
          // Log logout before clearing profile
          if (event === 'SIGNED_OUT' && user?.id && profile?.organization_id) {
            await logAuditEvent('logout', user.id, profile.organization_id);
          }
          setProfile(null);
          setOrganization(null);
        }
      } catch (error) {
        console.error('Error handling auth change:', error);
      } finally {
        setLoading(false);
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(undefined, session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string, retryCount = 0): Promise<UserProfile | null> => {
    const maxRetries = 5;
    const retryDelay = 500; // 500ms delay between retries

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no profile found and we haven't exceeded max retries, try again
        if (error.code === 'PGRST116' && retryCount < maxRetries) {
          console.log(`Profile not found, retrying... (attempt ${retryCount + 1}/${maxRetries})`);
          await wait(retryDelay);
          return fetchUserProfile(userId, retryCount + 1);
        }
        
        // If it's a different error or we've exceeded retries, log and return null
        if (error.code !== 'PGRST116') {
          console.error('Error fetching user profile:', error);
        } else {
          console.warn('Profile not found after maximum retries. User may need to complete signup process.');
        }
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Unexpected error fetching user profile:', error);
      
      // Retry on unexpected errors too, but only a few times
      if (retryCount < 3) {
        await wait(retryDelay);
        return fetchUserProfile(userId, retryCount + 1);
      }
      
      return null;
    }
  };

  const fetchOrganization = async (organizationId: string): Promise<Organization | null> => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (error) {
        console.error('Error fetching organization:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Unexpected error fetching organization:', error);
      return null;
    }
  };

  const logAuditEvent = async (action: string, userId?: string, organizationId?: string, details?: Record<string, any>) => {
    // Use the provided organizationId or fall back to profile's organization_id
    const orgId = organizationId || profile?.organization_id;
    
    if (!orgId) {
      console.warn('Cannot log audit event: no organization ID available');
      return;
    }
    
    try {
      const { error } = await supabase.from('audit_logs').insert({
        user_id: userId || null,
        organization_id: orgId,
        action,
        details,
        ip_address: await getClientIP(),
        user_agent: navigator.userAgent
      });

      if (error) {
        console.error('Error logging audit event:', error);
      }
    } catch (error) {
      console.error('Unexpected error logging audit event:', error);
    }
  };

  const getClientIP = async (): Promise<string | null> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return null;
    }
  };

  const signIn = async (email: string, password: string, rememberMe = false) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Don't log failed login attempts to audit_logs since we don't have organization context yet
        console.warn('Login failed:', error.message);
        return { error: error.message };
      }

      if (data.user) {
        // Reset failed login attempts on successful login
        await supabase
          .from('user_profiles')
          .update({
            failed_login_attempts: 0,
            account_locked_until: null,
            last_login: new Date().toISOString()
          })
          .eq('user_id', data.user.id);

        // Check if 2FA is enabled
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('two_factor_enabled')
          .eq('user_id', data.user.id)
          .single();

        if (profile?.two_factor_enabled) {
          // Sign out temporarily until 2FA is verified
          await supabase.auth.signOut();
          return { requiresTwoFactor: true };
        }
      }

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });

      if (error) {
        console.warn('Signup failed:', error.message);
        return { error: error.message };
      }

      // Note: We can't log signup events to audit_logs here because the user profile
      // and organization haven't been created yet. This will be handled by the
      // database trigger or signup completion process.

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        return { error: error.message };
      }

      // Don't log password reset requests since we don't have user/org context
      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        return { error: error.message };
      }

      if (profile?.organization_id) {
        await logAuditEvent('password_updated', user?.id, profile.organization_id);
      }
      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  };

  const verifyTwoFactor = async (token: string) => {
    // Implementation would verify TOTP token
    // This is a simplified version
    return { error: undefined };
  };

  const setupTwoFactor = async () => {
    // Implementation would generate TOTP secret and QR code
    // This is a simplified version
    const secret = 'JBSWY3DPEHPK3PXP'; // Example secret
    const qrCode = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const backupCodes = ['123456', '789012', '345678', '901234', '567890'];
    
    return { secret, qrCode, backupCodes };
  };

  const enableTwoFactor = async (token: string) => {
    try {
      // Verify token first (implementation needed)
      
      const backupCodes = Array.from({ length: 10 }, () => 
        Math.random().toString(36).substring(2, 8).toUpperCase()
      );

      await supabase
        .from('user_profiles')
        .update({
          two_factor_enabled: true,
          backup_codes: backupCodes
        })
        .eq('user_id', user?.id);

      if (profile?.organization_id) {
        await logAuditEvent('two_factor_enabled', user?.id, profile.organization_id);
      }
      await refreshProfile();
      
      return { backupCodes };
    } catch (error) {
      return { error: 'Failed to enable two-factor authentication' };
    }
  };

  const disableTwoFactor = async (password: string) => {
    try {
      // Verify password first
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password
      });

      if (authError) {
        return { error: 'Invalid password' };
      }

      await supabase
        .from('user_profiles')
        .update({
          two_factor_enabled: false,
          two_factor_secret: null,
          backup_codes: null
        })
        .eq('user_id', user?.id);

      if (profile?.organization_id) {
        await logAuditEvent('two_factor_disabled', user?.id, profile.organization_id);
      }
      await refreshProfile();
      
      return {};
    } catch (error) {
      return { error: 'Failed to disable two-factor authentication' };
    }
  };

  const joinOrganization = async (invitationCode: string) => {
    try {
      if (!user) {
        return { error: 'You must be logged in to join an organization' };
      }

      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      if (!accessToken) {
        return { error: 'No access token available' };
      }

      // Call the accept-invitation edge function
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
        return { error: result.error || 'Failed to join organization' };
      }

      // Refresh user profile to get updated organization
      await refreshProfile();
      
      return { 
        organization: result.organization
      };
    } catch (error) {
      console.error('Error joining organization:', error);
      return { error: 'An unexpected error occurred while joining the organization' };
    }
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
      setLoading(true);
      try {
        const fetchedProfile = await fetchUserProfile(user.id);
        setProfile(fetchedProfile);
        
        if (fetchedProfile?.organization_id) {
          const fetchedOrganization = await fetchOrganization(fetchedProfile.organization_id);
          setOrganization(fetchedOrganization);
        }
      } finally {
        setLoading(false);
      }
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
    joinOrganization
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};