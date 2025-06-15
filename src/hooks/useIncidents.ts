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
        .select('*')
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

      const { data, error } = await supabase
        .from('incident_reports')
        .update(incidentData)
        .eq('id', id)
        .select();

      if (error) {
        throw error;
      }

      setIncidents(prev => prev.map(incident => incident.id === id ? (data?.[0] || incident) : incident));
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

      const { error } = await supabase
        .from('incident_reports')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setIncidents(prev => prev.filter(incident => incident.id !== id));
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