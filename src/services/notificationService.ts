import { supabase } from '../lib/supabase';
import { Notification } from '../hooks/useNotifications';

/**
 * Service for creating and managing notifications
 */

/**
 * Create a new notification
 * @param notification The notification data to create
 * @returns The created notification or null if there was an error
 */
export async function createNotification(
  notification: Omit<Notification, 'id' | 'created_at' | 'read'>
): Promise<Notification | null> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        ...notification,
        read: false
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Unexpected error creating notification:', error);
    return null;
  }
}

/**
 * Create a notification for a specific event
 * @param params Parameters for the notification
 * @returns The created notification or null if there was an error
 */
export async function createEventNotification({
  organizationId,
  userId,
  eventType,
  resourceType,
  resourceId,
  resourceName,
  details,
  priority = 'medium'
}: {
  organizationId: string;
  userId?: string | null;
  eventType: 'created' | 'updated' | 'deleted' | 'approved' | 'rejected' | 'completed' | 'alert';
  resourceType: 'asset' | 'personnel' | 'incident' | 'risk' | 'travel_plan' | 'invitation' | 'organization' | 'user';
  resourceId?: string;
  resourceName: string;
  details?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}): Promise<Notification | null> {
  // Map resource type to notification category
  const categoryMap: Record<string, string> = {
    'asset': 'asset',
    'personnel': 'personnel',
    'incident': 'incident',
    'risk': 'risk',
    'travel_plan': 'travel',
    'invitation': 'system',
    'organization': 'system',
    'user': 'personnel'
  };
  
  // Map event type to notification type
  const typeMap: Record<string, 'info' | 'success' | 'warning' | 'alert'> = {
    'created': 'info',
    'updated': 'info',
    'deleted': 'warning',
    'approved': 'success',
    'rejected': 'warning',
    'completed': 'success',
    'alert': 'alert'
  };
  
  // Generate title based on event and resource type
  let title = '';
  let message = '';
  
  switch (eventType) {
    case 'created':
      title = `New ${resourceType.replace('_', ' ')} created`;
      message = `${resourceName} has been created.`;
      break;
    case 'updated':
      title = `${resourceType.replace('_', ' ')} updated`;
      message = `${resourceName} has been updated.`;
      break;
    case 'deleted':
      title = `${resourceType.replace('_', ' ')} deleted`;
      message = `${resourceName} has been deleted.`;
      break;
    case 'approved':
      title = `${resourceType.replace('_', ' ')} approved`;
      message = `${resourceName} has been approved.`;
      break;
    case 'rejected':
      title = `${resourceType.replace('_', ' ')} rejected`;
      message = `${resourceName} has been rejected.`;
      break;
    case 'completed':
      title = `${resourceType.replace('_', ' ')} completed`;
      message = `${resourceName} has been completed.`;
      break;
    case 'alert':
      title = `${resourceType.replace('_', ' ')} alert`;
      message = `Alert for ${resourceName}.`;
      break;
  }
  
  // Add details if provided
  if (details) {
    message += ` ${details}`;
  }
  
  return createNotification({
    organization_id: organizationId,
    user_id: userId,
    type: typeMap[eventType],
    title,
    message,
    category: categoryMap[resourceType] as any,
    priority,
    resource_type: resourceType,
    resource_id: resourceId || null
  });
}

/**
 * Mark a notification as read
 * @param id The ID of the notification to mark as read
 * @returns true if successful, false otherwise
 */
export async function markNotificationAsRead(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    
    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Unexpected error marking notification as read:', error);
    return false;
  }
}

/**
 * Mark all notifications for a user as read
 * @param userId The ID of the user
 * @param organizationId The ID of the organization
 * @returns true if successful, false otherwise
 */
export async function markAllNotificationsAsRead(userId: string, organizationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('organization_id', organizationId)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Unexpected error marking all notifications as read:', error);
    return false;
  }
}

/**
 * Delete a notification
 * @param id The ID of the notification to delete
 * @returns true if successful, false otherwise
 */
export async function deleteNotification(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Unexpected error deleting notification:', error);
    return false;
  }
}