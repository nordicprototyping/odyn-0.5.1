import { useState, useEffect, useCallback } from 'react';
import { supabase, Database } from '../lib/supabase';
import { useAuth } from './useAuth';
import { AppliedMitigation } from '../types/mitigation';
import { createEventNotification } from '../services/notificationService';

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
        
        // Create notification for new risk
        const priority = 
          (riskData.impact === 'very_high' || riskData.likelihood === 'very_high') ? 'critical' :
          (riskData.impact === 'high' || riskData.likelihood === 'high') ? 'high' :
          (riskData.impact === 'medium' || riskData.likelihood === 'medium') ? 'medium' : 'low';
        
        await createEventNotification({
          organizationId: profile?.organization_id || '',
          userId: riskData.owner_user_id, // Send to the risk owner if specified
          eventType: riskData.is_ai_generated ? 'alert' : 'created',
          resourceType: 'risk',
          resourceId: data[0].id,
          resourceName: riskData.title,
          details: riskData.is_ai_generated 
            ? `AI detected a new risk with ${riskData.ai_confidence}% confidence.` 
            : `New risk identified with ${riskData.impact}/${riskData.likelihood} impact/likelihood.`,
          priority: priority as any
        });
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

      // Get current risk data for comparison
      const { data: currentRisk } = await supabase
        .from('risks')
        .select('status, impact, likelihood, owner_user_id, title')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('risks')
        .update(sanitizedRiskData)
        .eq('id', id)
        .select();

      if (error) throw error;

      setRisks(prev => prev.map(risk => risk.id === id ? (data?.[0] || risk) : risk));
      
      // Create notification for status change
      if (data?.[0] && currentRisk && riskData.status && currentRisk.status !== riskData.status) {
        const priority = 
          (data[0].impact === 'very_high' || data[0].likelihood === 'very_high') ? 'high' :
          (data[0].impact === 'high' || data[0].likelihood === 'high') ? 'medium' : 'low';
        
        // Notify the risk owner about status change
        if (data[0].owner_user_id) {
          await createEventNotification({
            organizationId: profile?.organization_id || '',
            userId: data[0].owner_user_id,
            eventType: 'updated',
            resourceType: 'risk',
            resourceId: data[0].id,
            resourceName: data[0].title,
            details: `Risk status changed from ${currentRisk.status} to ${riskData.status}.`,
            priority: priority as any
          });
        }
      }
      
      // Create notification for owner change
      if (data?.[0] && currentRisk && riskData.owner_user_id && currentRisk.owner_user_id !== riskData.owner_user_id) {
        const priority = 'medium';
        
        // Notify the new risk owner
        await createEventNotification({
          organizationId: profile?.organization_id || '',
          userId: riskData.owner_user_id,
          eventType: 'updated',
          resourceType: 'risk',
          resourceId: data[0].id,
          resourceName: data[0].title,
          details: `You have been assigned as the owner of this risk.`,
          priority: priority as any
        });
      }
      
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

      // Get risk details before deletion
      const { data: riskToDelete } = await supabase
        .from('risks')
        .select('title, category, impact, likelihood')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('risks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRisks(prev => prev.filter(risk => risk.id !== id));
      
      // Create notification for risk deletion
      if (riskToDelete) {
        const priority = 
          (riskToDelete.impact === 'very_high' || riskToDelete.likelihood === 'very_high') ? 'medium' :
          (riskToDelete.impact === 'high' || riskToDelete.likelihood === 'high') ? 'low' : 'low';
        
        await createEventNotification({
          organizationId: profile?.organization_id || '',
          userId: null, // Send to all users in the organization
          eventType: 'deleted',
          resourceType: 'risk',
          resourceId: id,
          resourceName: riskToDelete.title,
          details: `A ${riskToDelete.category.replace(/_/g, ' ')} risk has been deleted.`,
          priority: priority as any
        });
      }
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