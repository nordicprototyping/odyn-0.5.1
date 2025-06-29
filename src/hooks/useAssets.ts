import { useState, useEffect, useCallback } from 'react';
import { supabase, Database } from '../lib/supabase';
import { useAuth } from './useAuth';
import { createEventNotification } from '../services/notificationService';

type Asset = Database['public']['Tables']['assets']['Row'];
type AssetInsert = Database['public']['Tables']['assets']['Insert'];
type AssetUpdate = Database['public']['Tables']['assets']['Update'];

export function useAssets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setAssets(data || []);
    } catch (err) {
      console.error('Error fetching assets:', err);
      setError('Failed to load asset data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const addAsset = async (assetData: AssetInsert) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('assets')
        .insert([assetData])
        .select();

      if (error) {
        throw error;
      }

      setAssets(prev => [...(data || []), ...prev]);
      
      // Log the asset creation in audit logs
      if (data?.[0]) {
        await logAuditEvent('asset_created', data[0].id, { 
          asset_name: assetData.name,
          asset_type: assetData.type,
          asset_location: assetData.location
        });
        
        // Create notification for new asset
        const riskScore = (assetData.ai_risk_score as any)?.overall || 0;
        const priority = riskScore > 70 ? 'high' : riskScore > 30 ? 'medium' : 'low';
        
        await createEventNotification({
          organizationId: profile?.organization_id || '',
          userId: null, // Send to all users in the organization
          eventType: 'created',
          resourceType: 'asset',
          resourceId: data[0].id,
          resourceName: assetData.name,
          details: `New ${assetData.type.replace('-', ' ')} asset added in ${(assetData.location as any)?.city || 'unknown location'}.`,
          priority: priority as any
        });
      }
      
      return data?.[0] || null;
    } catch (err) {
      console.error('Error adding asset:', err);
      setError(err instanceof Error ? err.message : 'Failed to add asset');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateAsset = async (id: string, assetData: AssetUpdate) => {
    try {
      setLoading(true);
      setError(null);

      // Get current asset data for comparison
      const { data: currentAsset } = await supabase
        .from('assets')
        .select('name, type, status')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('assets')
        .update(assetData)
        .eq('id', id)
        .select();

      if (error) {
        throw error;
      }

      setAssets(prev => prev.map(asset => asset.id === id ? (data?.[0] || asset) : asset));
      
      // Log the asset update in audit logs
      if (data?.[0]) {
        await logAuditEvent('asset_updated', data[0].id, { 
          asset_name: assetData.name || data[0].name,
          asset_type: assetData.type || data[0].type,
          asset_status: assetData.status || data[0].status,
          asset_location: assetData.location || data[0].location
        });
        
        // Create notification for status change
        if (currentAsset && assetData.status && currentAsset.status !== assetData.status) {
          const priority = assetData.status === 'alert' || assetData.status === 'compromised' 
            ? 'high' 
            : assetData.status === 'maintenance' ? 'medium' : 'low';
          
          await createEventNotification({
            organizationId: profile?.organization_id || '',
            userId: null, // Send to all users in the organization
            eventType: 'updated',
            resourceType: 'asset',
            resourceId: data[0].id,
            resourceName: data[0].name,
            details: `Asset status changed from ${currentAsset.status} to ${assetData.status}.`,
            priority: priority as any
          });
        }
      }
      
      return data?.[0] || null;
    } catch (err) {
      console.error('Error updating asset:', err);
      setError(err instanceof Error ? err.message : 'Failed to update asset');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteAsset = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get asset details before deletion for audit log
      const { data: assetToDelete } = await supabase
        .from('assets')
        .select('name, type, location')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setAssets(prev => prev.filter(asset => asset.id !== id));
      
      // Log the asset deletion in audit logs
      if (assetToDelete) {
        await logAuditEvent('asset_deleted', id, { 
          asset_name: assetToDelete.name,
          asset_type: assetToDelete.type,
          asset_location: assetToDelete.location,
          deleted_at: new Date().toISOString()
        });
        
        // Create notification for asset deletion
        await createEventNotification({
          organizationId: profile?.organization_id || '',
          userId: null, // Send to all users in the organization
          eventType: 'deleted',
          resourceType: 'asset',
          resourceId: id,
          resourceName: assetToDelete.name,
          details: `${assetToDelete.type.replace('-', ' ')} asset in ${(assetToDelete.location as any)?.city || 'unknown location'} has been deleted.`,
          priority: 'medium'
        });
      }
    } catch (err) {
      console.error('Error deleting asset:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete asset');
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
        resource_type: 'asset',
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
    assets,
    loading,
    error,
    fetchAssets,
    addAsset,
    updateAsset,
    deleteAsset,
    logAuditEvent
  };
}