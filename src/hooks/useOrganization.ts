import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';

type Organization = Database['public']['Tables']['organizations']['Row'];
type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

export function useOrganization(profile: UserProfile | null) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganization = useCallback(async (organizationId: string): Promise<Organization | null> => {
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
  }, []);

  useEffect(() => {
    const loadOrganization = async () => {
      setLoading(true);
      setError(null);
      
      if (!profile || !profile.organization_id) {
        setOrganization(null);
        setLoading(false);
        return;
      }
      
      try {
        const org = await fetchOrganization(profile.organization_id);
        setOrganization(org);
      } catch (err) {
        console.error('Error loading organization:', err);
        setError('Failed to load organization');
      } finally {
        setLoading(false);
      }
    };
    
    loadOrganization();
  }, [profile, fetchOrganization]);

  const refreshOrganization = useCallback(async () => {
    if (!profile || !profile.organization_id) return null;
    
    setLoading(true);
    try {
      const org = await fetchOrganization(profile.organization_id);
      setOrganization(org);
      return org;
    } catch (err) {
      console.error('Error refreshing organization:', err);
      setError('Failed to refresh organization');
      return null;
    } finally {
      setLoading(false);
    }
  }, [profile, fetchOrganization]);

  const updateOrganization = useCallback(async (updates: Partial<Organization>): Promise<Organization | null> => {
    if (!profile?.organization_id || !organization) return null;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', profile.organization_id)
        .select()
        .single();
      
      if (error) throw error;
      
      setOrganization(data);
      return data;
    } catch (err) {
      console.error('Error updating organization:', err);
      setError('Failed to update organization');
      return null;
    } finally {
      setLoading(false);
    }
  }, [profile, organization]);

  return {
    organization,
    loading,
    error,
    refreshOrganization,
    updateOrganization
  };
}