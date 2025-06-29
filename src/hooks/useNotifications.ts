import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface Notification {
  id: string;
  user_id: string | null;
  organization_id: string;
  type: 'alert' | 'info' | 'success' | 'warning';
  title: string;
  message: string;
  category: 'security' | 'personnel' | 'travel' | 'system' | 'incident' | 'risk' | 'asset' | 'audit';
  priority: 'low' | 'medium' | 'high' | 'critical';
  read: boolean;
  resource_type: string | null;
  resource_id: string | null;
  created_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, profile, organization } = useAuth();

  // Fetch notifications when user or organization changes
  useEffect(() => {
    if (user && profile?.organization_id) {
      fetchNotifications();
      
      // Set up real-time subscription
      const subscription = setupRealtimeSubscription();
      
      // Clean up subscription when component unmounts
      return () => {
        subscription.unsubscribe();
      };
    } else {
      setNotifications([]);
      setLoading(false);
    }
  }, [user, profile?.organization_id]);

  const fetchNotifications = async () => {
    if (!user || !profile?.organization_id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .or(`user_id.is.null,user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      
      if (fetchError) {
        throw fetchError;
      }
      
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!profile?.organization_id) {
      return { unsubscribe: () => {} };
    }
    
    // Subscribe to changes in the notifications table for this organization
    const subscription = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `organization_id=eq.${profile.organization_id}`
        },
        (payload) => {
          console.log('Realtime notification update:', payload);
          
          // Handle different types of changes
          if (payload.eventType === 'INSERT') {
            // Add new notification to the list
            setNotifications(prev => [payload.new as Notification, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            // Update existing notification
            setNotifications(prev => 
              prev.map(notif => 
                notif.id === payload.new.id ? (payload.new as Notification) : notif
              )
            );
          } else if (payload.eventType === 'DELETE') {
            // Remove deleted notification
            setNotifications(prev => 
              prev.filter(notif => notif.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();
    
    return subscription;
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!user || !profile?.organization_id) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('organization_id', profile.organization_id)
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.user_id === user.id ? { ...notif, read: true } : notif
        )
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const createNotification = async (
    notificationData: Omit<Notification, 'id' | 'organization_id' | 'created_at' | 'read'>
  ) => {
    if (!profile?.organization_id) return null;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          ...notificationData,
          organization_id: profile.organization_id,
          read: false
        }])
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (err) {
      console.error('Error creating notification:', err);
      return null;
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      // Update local state
      setNotifications(prev => prev.filter(notif => notif.id !== id));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const getUnreadCount = () => {
    return notifications.filter(n => !n.read).length;
  };

  return {
    notifications,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    createNotification,
    deleteNotification,
    getUnreadCount,
    fetchNotifications
  };
}