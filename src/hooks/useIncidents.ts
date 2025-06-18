import { useCallback } from 'react';
import { Database } from '../lib/supabase';
import { useSupabaseCRUD } from './useSupabaseCRUD';
import { AuditService } from '../services/auditService';

type IncidentReport = Database['public']['Tables']['incident_reports']['Row'];
type IncidentInsert = Database['public']['Tables']['incident_reports']['Insert'];
type IncidentUpdate = Database['public']['Tables']['incident_reports']['Update'];

export function useIncidents() {
  const {
    data: incidents,
    loading,
    error,
    fetchData,
    addItem,
    updateItem,
    deleteItem
  } = useSupabaseCRUD<IncidentReport, IncidentInsert, IncidentUpdate>('incident_reports', {
    defaultQueryOptions: {
      columns: 'id, title, description, date_time, severity, location, department, reporter_name, status, assigned_to, mitigations',
      order: { column: 'date_time', ascending: false }
    }
  });

  const fetchIncidents = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const addIncident = useCallback(async (incidentData: IncidentInsert) => {
    try {
      const newIncident = await addItem(incidentData);
      
      // Log the incident creation in audit logs
      if (newIncident) {
        await AuditService.logIncident('incident_created', newIncident.id, { 
          incident_title: incidentData.title,
          incident_severity: incidentData.severity,
          incident_location: incidentData.location,
          incident_department: incidentData.department
        });
      }
      
      return newIncident;
    } catch (err) {
      console.error('Error adding incident:', err);
      throw err;
    }
  }, [addItem]);

  const updateIncident = useCallback(async (id: string, incidentData: IncidentUpdate) => {
    try {
      // Get current incident data for comparison
      const currentIncident = incidents.find(i => i.id === id);
      
      const updatedIncident = await updateItem(id, incidentData);
      
      // Log the incident update in audit logs
      if (updatedIncident) {
        const statusChanged = currentIncident && currentIncident.status !== incidentData.status;
        const severityChanged = currentIncident && currentIncident.severity !== incidentData.severity;
        
        await AuditService.logIncident('incident_updated', updatedIncident.id, { 
          incident_title: incidentData.title || updatedIncident.title,
          incident_severity: incidentData.severity || updatedIncident.severity,
          incident_status: incidentData.status || updatedIncident.status,
          status_changed: statusChanged,
          severity_changed: severityChanged,
          previous_status: currentIncident?.status,
          previous_severity: currentIncident?.severity
        });
      }
      
      return updatedIncident;
    } catch (err) {
      console.error('Error updating incident:', err);
      throw err;
    }
  }, [incidents, updateItem]);

  const deleteIncident = useCallback(async (id: string) => {
    try {
      // Get incident details before deletion for audit log
      const incident = incidents.find(i => i.id === id);
      
      await deleteItem(id);
      
      // Log the incident deletion in audit logs
      if (incident) {
        await AuditService.logIncident('incident_deleted', id, { 
          incident_title: incident.title,
          incident_severity: incident.severity,
          incident_status: incident.status,
          deleted_at: new Date().toISOString()
        });
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting incident:', err);
      throw err;
    }
  }, [incidents, deleteItem]);

  return {
    incidents,
    loading,
    error,
    fetchIncidents,
    addIncident,
    updateIncident,
    deleteIncident,
    logAuditEvent: AuditService.logIncident // Keep for backward compatibility
  };
}