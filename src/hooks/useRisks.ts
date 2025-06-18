import { useCallback } from 'react';
import { Database } from '../lib/supabase';
import { useSupabaseCRUD } from './useSupabaseCRUD';
import { AuditService } from '../services/auditService';

type Risk = Database['public']['Tables']['risks']['Row'];
type RiskInsert = Database['public']['Tables']['risks']['Insert'];
type RiskUpdate = Database['public']['Tables']['risks']['Update'];

export function useRisks() {
  const {
    data: risks,
    loading,
    error,
    fetchData,
    addItem,
    updateItem,
    deleteItem
  } = useSupabaseCRUD<Risk, RiskInsert, RiskUpdate>('risks', {
    defaultQueryOptions: {
      columns: 'id, title, description, category, status, impact, likelihood, risk_score, owner_user_id, identified_by_user_id, department, due_date, last_reviewed_at, mitigation_plan, mitigations',
      order: { column: 'created_at', ascending: false }
    }
  });

  const fetchRisks = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const addRisk = useCallback(async (riskData: RiskInsert) => {
    try {
      const newRisk = await addItem(riskData);
      
      // Log the risk creation in audit logs
      if (newRisk) {
        await AuditService.logRisk('risk_created', newRisk.id, { 
          risk_title: riskData.title,
          risk_category: riskData.category,
          risk_score: newRisk.risk_score
        });
      }
      
      return newRisk;
    } catch (err) {
      console.error('Error adding risk:', err);
      throw err;
    }
  }, [addItem]);

  const updateRisk = useCallback(async (id: string, riskData: RiskUpdate) => {
    try {
      const updatedRisk = await updateItem(id, riskData);
      
      // Log the risk update in audit logs
      if (updatedRisk) {
        await AuditService.logRisk('risk_updated', updatedRisk.id, { 
          risk_title: riskData.title || updatedRisk.title,
          risk_category: riskData.category || updatedRisk.category,
          risk_score: updatedRisk.risk_score,
          risk_status: riskData.status || updatedRisk.status
        });
      }
      
      return updatedRisk;
    } catch (err) {
      console.error('Error updating risk:', err);
      throw err;
    }
  }, [updateItem]);

  const deleteRisk = useCallback(async (id: string) => {
    try {
      // Get risk details before deletion for audit log
      const risk = risks.find(r => r.id === id);
      
      await deleteItem(id);
      
      // Log the risk deletion in audit logs
      if (risk) {
        await AuditService.logRisk('risk_deleted', id, { 
          risk_title: risk.title,
          risk_category: risk.category,
          risk_score: risk.risk_score,
          deleted_at: new Date().toISOString()
        });
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting risk:', err);
      throw err;
    }
  }, [risks, deleteItem]);

  return {
    risks,
    loading,
    error,
    fetchRisks,
    addRisk,
    updateRisk,
    deleteRisk,
    logAuditEvent: AuditService.logRisk // Keep for backward compatibility
  };
}