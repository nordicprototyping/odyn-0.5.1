import { useState, useEffect, useCallback } from 'react';
import { supabase, Database } from '../lib/supabase';
import { useAuth } from './useAuth';

type IncidentReport = Database['public']['Tables']['incident_reports']['Row'];
type IncidentInsert = Database['public']['Tables']['incident_reports']['Insert'];
type IncidentUpdate = Database['public']['Tables']['incident_reports']['Update'];

export function useIncidents() {
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();

  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('incident_reports')
        .select('*, assets(id, name, type, location)')
        .order('date_time', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setIncidents(data || []);
    } catch (err) {
      console.error('Error fetching incidents:', err);
      setError('Failed to load incident data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const addIncident = async (incidentData: IncidentInsert) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('incident_reports')
        .insert([incidentData])
        .select();

      if (error) {
        throw error;
      }

      setIncidents(prev => [...(data || []), ...prev]);
      
      // Log the incident creation in audit logs
      if (data?.[0]) {
        await logAuditEvent('incident_created', data[0].id, { 
          incident_title: incidentData.title,
          incident_severity: incidentData.severity,
          incident_location: incidentData.location,
          incident_department: incidentData.department,
          location_asset_id: incidentData.location_asset_id,
          involved_personnel_count: incidentData.involved_personnel_ids?.length || 0
        });
      }
      
      return data?.[0] || null;
    } catch (err) {
      console.error('Error adding incident:', err);
      setError(err instanceof Error ? err.message : 'Failed to add incident');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateIncident = async (id: string, incidentData: IncidentUpdate) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current incident data for comparison
      const { data: currentIncident } = await supabase
        .from('incident_reports')
        .select('status, severity, location_asset_id, involved_personnel_ids')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('incident_reports')
        .update(incidentData)
        .eq('id', id)
        .select();

      if (error) {
        throw error;
      }

      setIncidents(prev => prev.map(incident => incident.id === id ? (data?.[0] || incident) : incident));
      
      // Log the incident update in audit logs
      if (data?.[0]) {
        const statusChanged = currentIncident && currentIncident.status !== incidentData.status;
        const severityChanged = currentIncident && currentIncident.severity !== incidentData.severity;
        const locationAssetChanged = currentIncident && currentIncident.location_asset_id !== incidentData.location_asset_id;
        const personnelChanged = currentIncident && 
          JSON.stringify(currentIncident.involved_personnel_ids) !== JSON.stringify(incidentData.involved_personnel_ids);
        
        await logAuditEvent('incident_updated', data[0].id, { 
          incident_title: incidentData.title || data[0].title,
          incident_severity: incidentData.severity || data[0].severity,
          incident_status: incidentData.status || data[0].status,
          status_changed: statusChanged,
          severity_changed: severityChanged,
          location_asset_changed: locationAssetChanged,
          personnel_changed: personnelChanged,
          previous_status: currentIncident?.status,
          previous_severity: currentIncident?.severity,
          previous_location_asset_id: currentIncident?.location_asset_id,
          previous_personnel_count: currentIncident?.involved_personnel_ids?.length || 0,
          new_personnel_count: incidentData.involved_personnel_ids?.length || 0
        });
      }
      
      return data?.[0] || null;
    } catch (err) {
      console.error('Error updating incident:', err);
      setError(err instanceof Error ? err.message : 'Failed to update incident');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteIncident = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get incident details before deletion for audit log
      const { data: incidentToDelete } = await supabase
        .from('incident_reports')
        .select('title, severity, status, location_asset_id, involved_personnel_ids')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('incident_reports')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setIncidents(prev => prev.filter(incident => incident.id !== id));
      
      // Log the incident deletion in audit logs
      if (incidentToDelete) {
        await logAuditEvent('incident_deleted', id, { 
          incident_title: incidentToDelete.title,
          incident_severity: incidentToDelete.severity,
          incident_status: incidentToDelete.status,
          location_asset_id: incidentToDelete.location_asset_id,
          involved_personnel_count: incidentToDelete.involved_personnel_ids?.length || 0,
          deleted_at: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Error deleting incident:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete incident');
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
        resource_type: 'incident',
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
    incidents,
    loading,
    error,
    fetchIncidents,
    addIncident,
    updateIncident,
    deleteIncident,
    logAuditEvent
  };
}