import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

type QueryOptions = {
  columns?: string;
  filters?: Record<string, any>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  range?: [number, number];
  foreignTables?: string[];
};

export function useSupabaseCRUD<T extends Record<string, any>, I = T, U = Partial<T>>(
  tableName: string,
  options: {
    idField?: string;
    defaultQueryOptions?: QueryOptions;
    onError?: (error: Error) => void;
  } = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  const {
    idField = 'id',
    defaultQueryOptions = {},
    onError = (err: Error) => console.error(`Error in ${tableName} CRUD operation:`, err)
  } = options;

  const buildQuery = useCallback((queryOptions: QueryOptions = {}) => {
    const mergedOptions = { ...defaultQueryOptions, ...queryOptions };
    const { columns, filters, order, limit, range, foreignTables } = mergedOptions;

    // Start with the base query
    let query = supabase.from(tableName).select(
      columns || 
      (foreignTables && foreignTables.length > 0 
        ? `*, ${foreignTables.join(', ')}` 
        : '*')
    );

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else if (typeof value === 'object' && value !== null) {
            // Handle special operators like gt, lt, gte, lte, etc.
            Object.entries(value).forEach(([operator, operatorValue]) => {
              switch (operator) {
                case 'eq': query = query.eq(key, operatorValue); break;
                case 'neq': query = query.neq(key, operatorValue); break;
                case 'gt': query = query.gt(key, operatorValue); break;
                case 'lt': query = query.lt(key, operatorValue); break;
                case 'gte': query = query.gte(key, operatorValue); break;
                case 'lte': query = query.lte(key, operatorValue); break;
                case 'like': query = query.like(key, operatorValue as string); break;
                case 'ilike': query = query.ilike(key, operatorValue as string); break;
                case 'is': query = query.is(key, operatorValue as boolean | null); break;
                case 'in': query = query.in(key, operatorValue as any[]); break;
                default: break;
              }
            });
          } else {
            query = query.eq(key, value);
          }
        }
      });
    }

    // Apply ordering
    if (order) {
      query = query.order(order.column, { ascending: order.ascending });
    }

    // Apply limit
    if (limit) {
      query = query.limit(limit);
    }

    // Apply range
    if (range) {
      query = query.range(range[0], range[1]);
    }

    return query;
  }, [tableName, defaultQueryOptions]);

  const fetchData = useCallback(async (queryOptions?: QueryOptions) => {
    try {
      setLoading(true);
      setError(null);
      
      const query = buildQuery(queryOptions);
      const { data, error: fetchError, count } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setData(data || []);
      return { data, count };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      onError(err instanceof Error ? err : new Error(errorMessage));
      return { data: [], count: 0 };
    } finally {
      setLoading(false);
    }
  }, [buildQuery, onError]);

  const getById = useCallback(async (id: string | number) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from(tableName)
        .select('*')
        .eq(idField, id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to fetch ${tableName} by ID`;
      setError(errorMessage);
      onError(err instanceof Error ? err : new Error(errorMessage));
      return null;
    } finally {
      setLoading(false);
    }
  }, [tableName, idField, onError]);

  const addItem = useCallback(async (item: I) => {
    try {
      setLoading(true);
      setError(null);

      // If the item doesn't have an organization_id and we have a profile, add it
      const itemWithOrg = profile?.organization_id && !('organization_id' in item) 
        ? { ...item, organization_id: profile.organization_id } 
        : item;

      const { data, error } = await supabase
        .from(tableName)
        .insert([itemWithOrg])
        .select();

      if (error) {
        throw error;
      }

      setData(prev => [...(data || []), ...prev]);
      return data?.[0] || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to add ${tableName}`;
      setError(errorMessage);
      onError(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tableName, profile, onError]);

  const updateItem = useCallback(async (id: string | number, updates: U) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq(idField, id)
        .select();

      if (error) {
        throw error;
      }

      setData(prev => prev.map(item => item[idField] === id ? (data?.[0] || item) : item));
      return data?.[0] || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to update ${tableName}`;
      setError(errorMessage);
      onError(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tableName, idField, onError]);

  const deleteItem = useCallback(async (id: string | number) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq(idField, id);

      if (error) {
        throw error;
      }

      setData(prev => prev.filter(item => item[idField] !== id));
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to delete ${tableName}`;
      setError(errorMessage);
      onError(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tableName, idField, onError]);

  return {
    data,
    loading,
    error,
    fetchData,
    getById,
    addItem,
    updateItem,
    deleteItem,
    setData,
    buildQuery
  };
}