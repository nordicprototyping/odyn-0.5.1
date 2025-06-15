import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { fallbackDepartments } from '../utils/constants';
import { useAuth } from './useAuth';

/**
 * Custom hook to fetch departments from the organization settings
 * @returns An object containing the departments array, loading state, and error state
 */
export function useDepartments() {
  const [departments, setDepartments] = useState<string[]>(fallbackDepartments);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organization } = useAuth();

  useEffect(() => {
    const fetchDepartments = async () => {
      if (!organization?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch organization settings
        const { data, error: fetchError } = await supabase
          .from('organizations')
          .select('settings')
          .eq('id', organization.id)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        // Extract departments from settings
        const departmentsList = data?.settings?.departments?.list || [];
        
        if (departmentsList.length > 0) {
          // If departments exist in settings, use them
          const departmentNames = departmentsList.map((dept: any) => dept.name);
          setDepartments(departmentNames);
        } else {
          // Otherwise, use the fallback departments
          setDepartments(fallbackDepartments);
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
        setError('Failed to load departments');
        // Use fallback departments on error
        setDepartments(fallbackDepartments);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, [organization?.id]);

  return { departments, loading, error };
}