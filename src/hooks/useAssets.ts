import { useCallback } from 'react';
import { Database } from '../lib/supabase';
import { useSupabaseCRUD } from './useSupabaseCRUD';
import { AuditService } from '../services/auditService';

type Asset = Database['public']['Tables']['assets']['Row'];
type AssetInsert = Database['public']['Tables']['assets']['Insert'];
type AssetUpdate = Database['public']['Tables']['assets']['Update'];

export function useAssets() {
  const {
    data: assets,
    loading,
    error,
    fetchData,
    addItem,
    updateItem,
    deleteItem
  } = useSupabaseCRUD<Asset, AssetInsert, AssetUpdate>('assets', {
    defaultQueryOptions: {
      columns: 'id, name, type, location, status, personnel, ai_risk_score, security_systems, compliance, incidents, responsible_officer, mitigations',
      order: { column: 'created_at', ascending: false }
    }
  });

  const fetchAssets = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const addAsset = useCallback(async (assetData: AssetInsert) => {
    try {
      const newAsset = await addItem(assetData);
      
      // Log the asset creation in audit logs
      if (newAsset) {
        await AuditService.logAsset('asset_created', newAsset.id, { 
          asset_name: assetData.name,
          asset_type: assetData.type,
          asset_location: assetData.location
        });
      }
      
      return newAsset;
    } catch (err) {
      console.error('Error adding asset:', err);
      throw err;
    }
  }, [addItem]);

  const updateAsset = useCallback(async (id: string, assetData: AssetUpdate) => {
    try {
      const updatedAsset = await updateItem(id, assetData);
      
      // Log the asset update in audit logs
      if (updatedAsset) {
        await AuditService.logAsset('asset_updated', updatedAsset.id, { 
          asset_name: assetData.name || updatedAsset.name,
          asset_type: assetData.type || updatedAsset.type,
          asset_status: assetData.status || updatedAsset.status,
          asset_location: assetData.location || updatedAsset.location
        });
      }
      
      return updatedAsset;
    } catch (err) {
      console.error('Error updating asset:', err);
      throw err;
    }
  }, [updateItem]);

  const deleteAsset = useCallback(async (id: string) => {
    try {
      // Get asset details before deletion for audit log
      const asset = assets.find(a => a.id === id);
      
      await deleteItem(id);
      
      // Log the asset deletion in audit logs
      if (asset) {
        await AuditService.logAsset('asset_deleted', id, { 
          asset_name: asset.name,
          asset_type: asset.type,
          deleted_at: new Date().toISOString()
        });
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting asset:', err);
      throw err;
    }
  }, [assets, deleteItem]);

  return {
    assets,
    loading,
    error,
    fetchAssets,
    addAsset,
    updateAsset,
    deleteAsset,
    logAuditEvent: AuditService.logAsset // Keep for backward compatibility
  };
}