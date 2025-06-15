import { useState, useEffect, useCallback } from 'react';
import { supabase, Database } from '../lib/supabase';
import { useAuth } from './useAuth';

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

      const { data, error } = await supabase
        .from('assets')
        .update(assetData)
        .eq('id', id)
        .select();

      if (error) {
        throw error;
      }

      setAssets(prev => prev.map(asset => asset.id === id ? (data?.[0] || asset) : asset));
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

      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setAssets(prev => prev.filter(asset => asset.id !== id));
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