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
      
      // Log the travel plan creation in audit logs
      if (data?.[0]) {
        await logAuditEvent('travel_plan_created', data[0].id, { 
          traveler_name: travelPlanData.traveler_name,
          destination: travelPlanData.destination,
          departure_date: travelPlanData.departure_date,
          status: travelPlanData.status || 'pending'
        });
      }
      
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
      
      // Log the travel plan update in audit logs
      if (data?.[0]) {
        await logAuditEvent('travel_plan_updated', data[0].id, { 
          traveler_name: travelPlanData.traveler_name || data[0].traveler_name,
          destination: travelPlanData.destination || data[0].destination,
          status: travelPlanData.status || data[0].status,
          updated_fields: Object.keys(travelPlanData).filter(k => k !== 'id' && k !== 'organization_id')
        });
      }
      
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
      
      // Get travel plan details before deletion for audit log
      const { data: planToDelete } = await supabase
        .from('travel_plans')
        .select('traveler_name, destination')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('travel_plans')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setTravelPlans(prev => prev.filter(plan => plan.id !== id));
      
      // Log the travel plan deletion in audit logs
      if (planToDelete) {
        await logAuditEvent('travel_plan_deleted', id, { 
          traveler_name: planToDelete.traveler_name,
          destination: planToDelete.destination,
          deleted_at: new Date().toISOString()
        });
      }
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