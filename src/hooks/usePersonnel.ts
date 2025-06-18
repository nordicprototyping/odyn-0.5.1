import { useCallback } from 'react';
import { Database } from '../lib/supabase';
import { useSupabaseCRUD } from './useSupabaseCRUD';
import { AuditService } from '../services/auditService';

type Personnel = Database['public']['Tables']['personnel_details']['Row'];
type PersonnelInsert = Database['public']['Tables']['personnel_details']['Insert'];
type PersonnelUpdate = Database['public']['Tables']['personnel_details']['Update'];

export function usePersonnel() {
  const {
    data: personnel,
    loading,
    error,
    fetchData,
    addItem,
    updateItem,
    deleteItem
  } = useSupabaseCRUD<Personnel, PersonnelInsert, PersonnelUpdate>('personnel_details', {
    defaultQueryOptions: {
      columns: 'id, name, employee_id, category, department, current_location, clearance_level, ai_risk_score, status, last_seen, work_asset_id, mitigations',
      order: { column: 'created_at', ascending: false }
    }
  });

  const fetchPersonnel = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const addPersonnel = useCallback(async (personnelData: PersonnelInsert) => {
    try {
      const newPersonnel = await addItem(personnelData);
      
      // Log the personnel creation in audit logs
      if (newPersonnel) {
        await AuditService.logPersonnel('personnel_created', newPersonnel.id, { 
          personnel_name: personnelData.name,
          employee_id: personnelData.employee_id,
          department: personnelData.department
        });
      }
      
      return newPersonnel;
    } catch (err) {
      console.error('Error adding personnel:', err);
      throw err;
    }
  }, [addItem]);

  const updatePersonnel = useCallback(async (id: string, personnelData: PersonnelUpdate) => {
    try {
      const updatedPersonnel = await updateItem(id, personnelData);
      
      // Log the personnel update in audit logs
      if (updatedPersonnel) {
        await AuditService.logPersonnel('personnel_updated', updatedPersonnel.id, { 
          personnel_name: personnelData.name || updatedPersonnel.name,
          employee_id: personnelData.employee_id || updatedPersonnel.employee_id,
          department: personnelData.department || updatedPersonnel.department,
          status: personnelData.status || updatedPersonnel.status
        });
      }
      
      return updatedPersonnel;
    } catch (err) {
      console.error('Error updating personnel:', err);
      throw err;
    }
  }, [updateItem]);

  const deletePersonnel = useCallback(async (id: string) => {
    try {
      // Get personnel details before deletion for audit log
      const person = personnel.find(p => p.id === id);
      
      await deleteItem(id);
      
      // Log the personnel deletion in audit logs
      if (person) {
        await AuditService.logPersonnel('personnel_deleted', id, { 
          personnel_name: person.name,
          employee_id: person.employee_id,
          deleted_at: new Date().toISOString()
        });
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting personnel:', err);
      throw err;
    }
  }, [personnel, deleteItem]);

  return {
    personnel,
    loading,
    error,
    fetchPersonnel,
    addPersonnel,
    updatePersonnel,
    deletePersonnel,
    logAuditEvent: AuditService.logPersonnel // Keep for backward compatibility
  };
}