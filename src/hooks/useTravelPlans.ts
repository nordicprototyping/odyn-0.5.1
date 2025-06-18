import { useCallback } from 'react';
import { Database } from '../lib/supabase';
import { useSupabaseCRUD } from './useSupabaseCRUD';
import { AuditService } from '../services/auditService';

type TravelPlan = Database['public']['Tables']['travel_plans']['Row'];
type TravelPlanInsert = Database['public']['Tables']['travel_plans']['Insert'];
type TravelPlanUpdate = Database['public']['Tables']['travel_plans']['Update'];

export function useTravelPlans() {
  const {
    data: travelPlans,
    loading,
    error,
    fetchData,
    addItem,
    updateItem,
    deleteItem
  } = useSupabaseCRUD<TravelPlan, TravelPlanInsert, TravelPlanUpdate>('travel_plans', {
    defaultQueryOptions: {
      columns: 'id, traveler_name, traveler_employee_id, traveler_department, traveler_clearance_level, destination, origin, departure_date, return_date, purpose, status, risk_assessment, mitigations',
      order: { column: 'created_at', ascending: false }
    }
  });

  const fetchTravelPlans = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const addTravelPlan = useCallback(async (travelPlanData: TravelPlanInsert) => {
    try {
      const newTravelPlan = await addItem(travelPlanData);
      
      // Log the travel plan creation in audit logs
      if (newTravelPlan) {
        await AuditService.logTravel('travel_plan_created', newTravelPlan.id, { 
          traveler_name: travelPlanData.traveler_name,
          destination: travelPlanData.destination,
          departure_date: travelPlanData.departure_date,
          status: travelPlanData.status || 'pending'
        });
      }
      
      return newTravelPlan;
    } catch (err) {
      console.error('Error adding travel plan:', err);
      throw err;
    }
  }, [addItem]);

  const updateTravelPlan = useCallback(async (id: string, travelPlanData: TravelPlanUpdate) => {
    try {
      const updatedTravelPlan = await updateItem(id, travelPlanData);
      
      // Log the travel plan update in audit logs
      if (updatedTravelPlan) {
        await AuditService.logTravel('travel_plan_updated', updatedTravelPlan.id, { 
          traveler_name: travelPlanData.traveler_name || updatedTravelPlan.traveler_name,
          destination: travelPlanData.destination || updatedTravelPlan.destination,
          status: travelPlanData.status || updatedTravelPlan.status,
          updated_fields: Object.keys(travelPlanData).filter(k => k !== 'id' && k !== 'organization_id')
        });
      }
      
      return updatedTravelPlan;
    } catch (err) {
      console.error('Error updating travel plan:', err);
      throw err;
    }
  }, [updateItem]);

  const deleteTravelPlan = useCallback(async (id: string) => {
    try {
      // Get travel plan details before deletion for audit log
      const travelPlan = travelPlans.find(tp => tp.id === id);
      
      await deleteItem(id);
      
      // Log the travel plan deletion in audit logs
      if (travelPlan) {
        await AuditService.logTravel('travel_plan_deleted', id, { 
          traveler_name: travelPlan.traveler_name,
          destination: travelPlan.destination,
          deleted_at: new Date().toISOString()
        });
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting travel plan:', err);
      throw err;
    }
  }, [travelPlans, deleteItem]);

  return {
    travelPlans,
    loading,
    error,
    fetchTravelPlans,
    addTravelPlan,
    updateTravelPlan,
    deleteTravelPlan,
    logAuditEvent: AuditService.logTravel // Keep for backward compatibility
  };
}