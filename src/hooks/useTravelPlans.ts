import { useState, useEffect, useCallback } from 'react';
import { supabase, Database } from '../lib/supabase';
import { useAuth } from './useAuth';
import { createEventNotification } from '../services/notificationService';

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
        
        // Create notification for new travel plan
        const riskScore = (travelPlanData.risk_assessment as any)?.overall || 0;
        const priority = riskScore > 70 ? 'high' : riskScore > 30 ? 'medium' : 'low';
        
        // Notify admins about new travel plan
        await createEventNotification({
          organizationId: profile?.organization_id || '',
          userId: null, // Send to all users with appropriate permissions
          eventType: 'created',
          resourceType: 'travel_plan',
          resourceId: data[0].id,
          resourceName: `${travelPlanData.traveler_name}'s travel to ${(travelPlanData.destination as any)?.city || 'destination'}`,
          details: `New travel plan submitted for approval. Departure: ${new Date(travelPlanData.departure_date).toLocaleDateString()}.`,
          priority: priority as any
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

      // Get current travel plan data for comparison
      const { data: currentPlan } = await supabase
        .from('travel_plans')
        .select('status, traveler_name, traveler_user_id, destination')
        .eq('id', id)
        .single();

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
        
        // Create notification for status change
        if (currentPlan && travelPlanData.status && currentPlan.status !== travelPlanData.status) {
          const riskScore = ((data[0].risk_assessment as any)?.overall || 0);
          const priority = riskScore > 70 ? 'high' : riskScore > 30 ? 'medium' : 'low';
          
          // Determine event type based on status
          let eventType: 'approved' | 'rejected' | 'updated' | 'completed' = 'updated';
          if (travelPlanData.status === 'approved') eventType = 'approved';
          else if (travelPlanData.status === 'denied') eventType = 'rejected';
          else if (travelPlanData.status === 'completed') eventType = 'completed';
          
          // Notify the traveler about status change
          if (currentPlan.traveler_user_id) {
            await createEventNotification({
              organizationId: profile?.organization_id || '',
              userId: currentPlan.traveler_user_id,
              eventType,
              resourceType: 'travel_plan',
              resourceId: data[0].id,
              resourceName: `Travel to ${((currentPlan.destination as any)?.city || 'destination')}`,
              details: `Your travel plan has been ${travelPlanData.status}.`,
              priority: priority as any
            });
          }
        }
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
        .select('traveler_name, destination, traveler_user_id')
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
        
        // Create notification for travel plan deletion
        if (planToDelete.traveler_user_id) {
          await createEventNotification({
            organizationId: profile?.organization_id || '',
            userId: planToDelete.traveler_user_id,
            eventType: 'deleted',
            resourceType: 'travel_plan',
            resourceId: id,
            resourceName: `Travel to ${(planToDelete.destination as any)?.city || 'destination'}`,
            details: `Your travel plan has been deleted.`,
            priority: 'medium'
          });
        }
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