import { useState, useEffect, useCallback } from 'react';
import { supabase, Database } from '../lib/supabase';
import { useAuth } from './useAuth';

type TravelPlan = Database['public']['Tables']['travel_plans']['Row'];
type TravelPlanInsert = Database['public']['Tables']['travel_plans']['Insert'];
type TravelPlanUpdate = Database['public']['Tables']['travel_plans']['Update'];

export function useTravelPlans() {
  const [travelPlans, setTravelPlans] = useState<TravelPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();

  const fetchTravelPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('travel_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setTravelPlans(data || []);
    } catch (err) {
      console.error('Error fetching travel plans:', err);
      setError('Failed to load travel plan data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTravelPlans();
  }, [fetchTravelPlans]);

  const addTravelPlan = async (travelPlanData: TravelPlanInsert) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('travel_plans')
        .insert([travelPlanData])
        .select();

      if (error) {
        throw error;
      }

      setTravelPlans(prev => [...(data || []), ...prev]);
      return data?.[0] || null;
    } catch (err) {
      console.error('Error adding travel plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to add travel plan');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateTravelPlan = async (id: string, travelPlanData: TravelPlanUpdate) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('travel_plans')
        .update(travelPlanData)
        .eq('id', id)
        .select();

      if (error) {
        throw error;
      }

      setTravelPlans(prev => prev.map(plan => plan.id === id ? (data?.[0] || plan) : plan));
      return data?.[0] || null;
    } catch (err) {
      console.error('Error updating travel plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to update travel plan');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteTravelPlan = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('travel_plans')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setTravelPlans(prev => prev.filter(plan => plan.id !== id));
    } catch (err) {
      console.error('Error deleting travel plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete travel plan');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logAuditEvent = async (action: string, resourceId?: string, details?: Record<string, any>) => {
    if (!profile?.organization_id) {
      console.warn('Cannot log audit event: no organization ID available');
      return;
    }
    
    try {
      const { error } = await supabase.from('audit_logs').insert({
        user_id: user?.id || null,
        organization_id: profile.organization_id,
        action,
        resource_type: 'travel_plan',
        resource_id: resourceId,
        details,
        ip_address: null,
        user_agent: navigator.userAgent
      });

      if (error) {
        console.error('Error logging audit event:', error);
      }
    } catch (error) {
      console.error('Unexpected error logging audit event:', error);
    }
  };

  return {
    travelPlans,
    loading,
    error,
    fetchTravelPlans,
    addTravelPlan,
    updateTravelPlan,
    deleteTravelPlan,
    logAuditEvent
  };
}