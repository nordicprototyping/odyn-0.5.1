import { useState, useEffect, useCallback } from 'react';
import { supabase, Database } from '../lib/supabase';
import { useAuth } from './useAuth';
import { AppliedMitigation } from '../types/mitigation';

type Risk = Database['public']['Tables']['risks']['Row'];
type RiskInsert = Database['public']['Tables']['risks']['Insert'];
type RiskUpdate = Database['public']['Tables']['risks']['Update'];

// Utility function to validate UUID format
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export function useRisks() {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();

  const fetchRisks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First, fetch all risks
      const { data: risksData, error: fetchError } = await supabase
        .from('risks')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setRisks(risksData || []);

      // Collect all unique user IDs from risks, but only valid UUIDs
      const userIds = new Set<string>();
      (risksData || []).forEach(risk => {
        if (risk.owner_user_id && isValidUUID(risk.owner_user_id)) {
          userIds.add(risk.owner_user_id);
        }
        if (risk.identified_by_user_id && isValidUUID(risk.identified_by_user_id)) {
          userIds.add(risk.identified_by_user_id);
        }
      });

      // Fetch user profiles for these user IDs
      if (userIds.size > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('user_profiles')
          .select('user_id, full_name')
          .in('user_id', Array.from(userIds));

        if (profilesError) {
          console.error('Error fetching user profiles:', profilesError);
        } else {
          // Create a map of user_id to full_name
          const profilesMap: Record<string, string> = {};
          (profilesData || []).forEach(profile => {
            profilesMap[profile.user_id] = profile.full_name;
          });
          setUserProfiles(profilesMap);
        }
      }
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

      // Validate and sanitize user IDs before insertion
      const sanitizedRiskData = {
        ...riskData,
        is_ai_generated: riskData.is_ai_generated || false,
        ai_detection_date: riskData.is_ai_generated ? new Date().toISOString() : null,
        owner_user_id: riskData.owner_user_id && isValidUUID(riskData.owner_user_id) ? riskData.owner_user_id : null,
        identified_by_user_id: riskData.identified_by_user_id && isValidUUID(riskData.identified_by_user_id) ? riskData.identified_by_user_id : null,
        source_asset_id: riskData.source_asset_id && isValidUUID(riskData.source_asset_id) ? riskData.source_asset_id : null,
        source_personnel_id: riskData.source_personnel_id && isValidUUID(riskData.source_personnel_id) ? riskData.source_personnel_id : null,
        source_incident_id: riskData.source_incident_id && isValidUUID(riskData.source_incident_id) ? riskData.source_incident_id : null,
        source_travel_plan_id: riskData.source_travel_plan_id && isValidUUID(riskData.source_travel_plan_id) ? riskData.source_travel_plan_id : null
      };

      const { data, error } = await supabase
        .from('risks')
        .insert([sanitizedRiskData])
        .select();

      if (error) throw error;
      
      setRisks(prev => [...(data || []), ...prev]);

      // Log the risk creation in audit logs
      if (data?.[0]) {
        await logAuditEvent(
          riskData.is_ai_generated ? 'ai_risk_detected' : 'risk_created', 
          data[0].id, 
          {
            risk_title: riskData.title,
            risk_category: riskData.category,
            is_ai_generated: riskData.is_ai_generated || false,
            source_type: riskData.source_asset_id ? 'asset' : 
                        riskData.source_personnel_id ? 'personnel' : 
                        riskData.source_incident_id ? 'incident' : 
                        riskData.source_travel_plan_id ? 'travel' : null,
            source_id: riskData.source_asset_id || 
                      riskData.source_personnel_id || 
                      riskData.source_incident_id || 
                      riskData.source_travel_plan_id || null,
            ai_confidence: riskData.ai_confidence
          }
        );
      }
      
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

      // Validate and sanitize user IDs before update
      const sanitizedRiskData = {
        ...riskData,
        owner_user_id: riskData.owner_user_id && isValidUUID(riskData.owner_user_id) ? riskData.owner_user_id : null,
        identified_by_user_id: riskData.identified_by_user_id && isValidUUID(riskData.identified_by_user_id) ? riskData.identified_by_user_id : null,
        source_asset_id: riskData.source_asset_id && isValidUUID(riskData.source_asset_id) ? riskData.source_asset_id : null,
        source_personnel_id: riskData.source_personnel_id && isValidUUID(riskData.source_personnel_id) ? riskData.source_personnel_id : null,
        source_incident_id: riskData.source_incident_id && isValidUUID(riskData.source_incident_id) ? riskData.source_incident_id : null,
        source_travel_plan_id: riskData.source_travel_plan_id && isValidUUID(riskData.source_travel_plan_id) ? riskData.source_travel_plan_id : null
      };

      const { data, error } = await supabase
        .from('risks')
        .update(sanitizedRiskData)
        .eq('id', id)
        .select();

      if (error) throw error;

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

      if (error) throw error;

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
    userProfiles,
    loading,
    error,
    fetchRisks,
    addRisk,
    updateRisk,
    deleteRisk,
    logAuditEvent
  };
}