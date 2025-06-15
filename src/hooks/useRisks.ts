import { useState, useEffect, useCallback } from 'react';
import { supabase, Database } from '../lib/supabase';
import { useAuth } from './useAuth';

type Risk = Database['public']['Tables']['risks']['Row'];
type RiskInsert = Database['public']['Tables']['risks']['Insert'];
type RiskUpdate = Database['public']['Tables']['risks']['Update'];

export function useRisks() {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();

  const fetchRisks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('risks')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setRisks(data || []);
    } catch (err) {
      console.error('Error fetching risks:', err);
      setError('Failed to load risk data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRisks();
  }, [fetchRisks]);

  const addRisk = async (riskData: RiskInsert) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('risks')
        .insert([riskData])
        .select();

      if (error) {
        throw error;
      }

      setRisks(prev => [...(data || []), ...prev]);
      return data?.[0] || null;
    } catch (err) {
      console.error('Error adding risk:', err);
      setError(err instanceof Error ? err.message : 'Failed to add risk');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateRisk = async (id: string, riskData: RiskUpdate) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('risks')
        .update(riskData)
        .eq('id', id)
        .select();

      if (error) {
        throw error;
      }

      setRisks(prev => prev.map(risk => risk.id === id ? (data?.[0] || risk) : risk));
      return data?.[0] || null;
    } catch (err) {
      console.error('Error updating risk:', err);
      setError(err instanceof Error ? err.message : 'Failed to update risk');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteRisk = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('risks')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setRisks(prev => prev.filter(risk => risk.id !== id));
    } catch (err) {
      console.error('Error deleting risk:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete risk');
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
        resource_type: 'risk',
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
    risks,
    loading,
    error,
    fetchRisks,
    addRisk,
    updateRisk,
    deleteRisk,
    logAuditEvent
  };
}