import { useState, useEffect, useCallback } from 'react';
import { supabase, Database } from '../lib/supabase';
import { useAuth } from './useAuth';
import { createEventNotification } from '../services/notificationService';

type Personnel = Database['public']['Tables']['personnel_details']['Row'];
type PersonnelInsert = Database['public']['Tables']['personnel_details']['Insert'];
type PersonnelUpdate = Database['public']['Tables']['personnel_details']['Update'];

export function usePersonnel() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();

  const fetchPersonnel = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Include work_asset_id and date_of_birth in the select
      const { data, error: fetchError } = await supabase
        .from('personnel_details')
        .select('*, assets(name, type, location)')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setPersonnel(data || []);
    } catch (err) {
      console.error('Error fetching personnel:', err);
      setError('Failed to load personnel data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPersonnel();
  }, [fetchPersonnel]);

  const addPersonnel = async (personnelData: PersonnelInsert) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('personnel_details')
        .insert([personnelData])
        .select();

      if (error) {
        throw error;
      }

      setPersonnel(prev => [...(data || []), ...prev]);
      
      // Log the personnel creation in audit logs
      if (data?.[0]) {
        await logAuditEvent('personnel_created', data[0].id, { 
          personnel_name: personnelData.name,
          employee_id: personnelData.employee_id,
          department: personnelData.department
        });
        
        // Create notification for new personnel
        const riskScore = (personnelData.ai_risk_score as any)?.overall || 0;
        const priority = riskScore > 70 ? 'high' : riskScore > 30 ? 'medium' : 'low';
        
        await createEventNotification({
          organizationId: profile?.organization_id || '',
          userId: null, // Send to all users in the organization
          eventType: 'created',
          resourceType: 'personnel',
          resourceId: data[0].id,
          resourceName: personnelData.name,
          details: `New ${personnelData.category} personnel added to ${personnelData.department} department.`,
          priority: priority as any
        });
      }
      
      return data?.[0] || null;
    } catch (err) {
      console.error('Error adding personnel:', err);
      setError(err instanceof Error ? err.message : 'Failed to add personnel');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updatePersonnel = async (id: string, personnelData: PersonnelUpdate) => {
    try {
      setLoading(true);
      setError(null);

      // Get current personnel data for comparison
      const { data: currentPersonnel } = await supabase
        .from('personnel_details')
        .select('status, name, department')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('personnel_details')
        .update(personnelData)
        .eq('id', id)
        .select();

      if (error) {
        throw error;
      }

      setPersonnel(prev => prev.map(person => person.id === id ? (data?.[0] || person) : person));
      
      // Log the personnel update in audit logs
      if (data?.[0]) {
        await logAuditEvent('personnel_updated', data[0].id, { 
          personnel_name: personnelData.name || data[0].name,
          employee_id: personnelData.employee_id || data[0].employee_id,
          department: personnelData.department || data[0].department,
          status: personnelData.status || data[0].status
        });
        
        // Create notification for status change
        if (currentPersonnel && personnelData.status && currentPersonnel.status !== personnelData.status) {
          const priority = 
            personnelData.status === 'unavailable' ? 'high' : 
            personnelData.status === 'on-mission' || personnelData.status === 'in-transit' ? 'medium' : 'low';
          
          await createEventNotification({
            organizationId: profile?.organization_id || '',
            userId: null, // Send to all users in the organization
            eventType: 'updated',
            resourceType: 'personnel',
            resourceId: data[0].id,
            resourceName: data[0].name,
            details: `Personnel status changed from ${currentPersonnel.status} to ${personnelData.status}.`,
            priority: priority as any
          });
        }
        
        // Create notification for high risk score
        if (personnelData.ai_risk_score && (personnelData.ai_risk_score as any).overall > 70) {
          await createEventNotification({
            organizationId: profile?.organization_id || '',
            userId: null, // Send to all users in the organization
            eventType: 'alert',
            resourceType: 'personnel',
            resourceId: data[0].id,
            resourceName: data[0].name,
            details: `High risk score detected for personnel: ${(personnelData.ai_risk_score as any).overall}.`,
            priority: 'high'
          });
        }
      }
      
      return data?.[0] || null;
    } catch (err) {
      console.error('Error updating personnel:', err);
      setError(err instanceof Error ? err.message : 'Failed to update personnel');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deletePersonnel = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get personnel details before deletion for audit log
      const { data: personnelToDelete } = await supabase
        .from('personnel_details')
        .select('name, employee_id, department')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('personnel_details')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setPersonnel(prev => prev.filter(person => person.id !== id));
      
      // Log the personnel deletion in audit logs
      if (personnelToDelete) {
        await logAuditEvent('personnel_deleted', id, { 
          personnel_name: personnelToDelete.name,
          employee_id: personnelToDelete.employee_id,
          department: personnelToDelete.department,
          deleted_at: new Date().toISOString()
        });
        
        // Create notification for personnel deletion
        await createEventNotification({
          organizationId: profile?.organization_id || '',
          userId: null, // Send to all users in the organization
          eventType: 'deleted',
          resourceType: 'personnel',
          resourceId: id,
          resourceName: personnelToDelete.name,
          details: `Personnel from ${personnelToDelete.department} department has been removed.`,
          priority: 'medium'
        });
      }
    } catch (err) {
      console.error('Error deleting personnel:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete personnel');
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
        resource_type: 'personnel',
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
    personnel,
    loading,
    error,
    fetchPersonnel,
    addPersonnel,
    updatePersonnel,
    deletePersonnel,
    logAuditEvent
  };
}