import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { Database } from '../lib/supabase';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

export function useUserProfile(user: User | null) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = useCallback(async (userId: string, retryCount = 0): Promise<UserProfile | null> => {
    const maxRetries = 5;
    const retryDelay = 500; // 500ms delay between retries

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no profile found and we haven't exceeded max retries, try again
        if (error.code === 'PGRST116' && retryCount < maxRetries) {
          console.log(`Profile not found, retrying... (attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return fetchUserProfile(userId, retryCount + 1);
        }
        
        // If it's a different error or we've exceeded retries, log and return null
        if (error.code !== 'PGRST116') {
          console.error('Error fetching user profile:', error);
        } else {
          console.warn('Profile not found after maximum retries. User may need to complete signup process.');
        }
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Unexpected error fetching user profile:', error);
      
      // Retry on unexpected errors too, but only a few times
      if (retryCount < 3) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return fetchUserProfile(userId, retryCount + 1);
      }
      
      return null;
    }
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      
      try {
        const userProfile = await fetchUserProfile(user.id);
        setProfile(userProfile);
      } catch (err) {
        console.error('Error loading user profile:', err);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };
    
    loadProfile();
  }, [user, fetchUserProfile]);

  const refreshProfile = useCallback(async () => {
    if (!user) return null;
    
    setLoading(true);
    try {
      const userProfile = await fetchUserProfile(user.id);
      setProfile(userProfile);
      return userProfile;
    } catch (err) {
      console.error('Error refreshing user profile:', err);
      setError('Failed to refresh user profile');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, fetchUserProfile]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>): Promise<UserProfile | null> => {
    if (!user || !profile) return null;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      
      setProfile(data);
      return data;
    } catch (err) {
      console.error('Error updating user profile:', err);
      setError('Failed to update user profile');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  return {
    profile,
    loading,
    error,
    refreshProfile,
    updateProfile
  };
}