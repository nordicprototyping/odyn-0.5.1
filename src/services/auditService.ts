import { supabase } from '../lib/supabase';

/**
 * Service for logging audit events to the audit_logs table
 */
export class AuditService {
  /**
   * Log an audit event
   * @param action The action being performed (e.g., 'asset_created', 'user_updated')
   * @param resourceType The type of resource being acted upon (e.g., 'asset', 'user')
   * @param resourceId The ID of the resource being acted upon (optional)
   * @param details Additional details about the action (optional)
   * @param userId The ID of the user performing the action (optional, defaults to current user)
   * @param organizationId The ID of the organization (optional, defaults to user's organization)
   * @returns Promise that resolves when the audit log is created
   */
  static async log(
    action: string,
    resourceType?: string,
    resourceId?: string,
    details?: Record<string, any>,
    userId?: string | null,
    organizationId?: string
  ): Promise<void> {
    try {
      // Get current user if userId not provided
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id || null;
      }

      // Get organization ID if not provided
      if (!organizationId && userId) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('user_id', userId)
          .single();
        
        organizationId = profile?.organization_id;
      }

      // If we still don't have an organization ID, we can't log the audit event
      if (!organizationId) {
        console.warn('Cannot log audit event: no organization ID available');
        return;
      }

      // Get client IP address (this will only work in a browser environment)
      let ipAddress: string | null = null;
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        ipAddress = data.ip;
      } catch (error) {
        console.warn('Failed to get client IP address:', error);
      }

      // Insert the audit log
      const { error } = await supabase.from('audit_logs').insert({
        user_id: userId,
        organization_id: organizationId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        details,
        ip_address: ipAddress,
        user_agent: navigator.userAgent
      });

      if (error) {
        console.error('Error logging audit event:', error);
      }
    } catch (error) {
      console.error('Unexpected error logging audit event:', error);
    }
  }

  /**
   * Log an authentication-related audit event
   * @param action The authentication action (e.g., 'login', 'logout', 'signup')
   * @param details Additional details about the action
   * @param userId The ID of the user (optional)
   * @param organizationId The ID of the organization (optional)
   */
  static async logAuth(
    action: string,
    details?: Record<string, any>,
    userId?: string | null,
    organizationId?: string
  ): Promise<void> {
    return this.log(action, 'authentication', null, details, userId, organizationId);
  }

  /**
   * Log an asset-related audit event
   * @param action The asset action (e.g., 'asset_created', 'asset_updated')
   * @param resourceId The ID of the asset
   * @param details Additional details about the action
   * @param userId The ID of the user (optional)
   * @param organizationId The ID of the organization (optional)
   */
  static async logAsset(
    action: string,
    resourceId: string,
    details?: Record<string, any>,
    userId?: string | null,
    organizationId?: string
  ): Promise<void> {
    return this.log(action, 'asset', resourceId, details, userId, organizationId);
  }

  /**
   * Log a personnel-related audit event
   * @param action The personnel action (e.g., 'personnel_created', 'personnel_updated')
   * @param resourceId The ID of the personnel
   * @param details Additional details about the action
   * @param userId The ID of the user (optional)
   * @param organizationId The ID of the organization (optional)
   */
  static async logPersonnel(
    action: string,
    resourceId: string,
    details?: Record<string, any>,
    userId?: string | null,
    organizationId?: string
  ): Promise<void> {
    return this.log(action, 'personnel', resourceId, details, userId, organizationId);
  }

  /**
   * Log an incident-related audit event
   * @param action The incident action (e.g., 'incident_created', 'incident_updated')
   * @param resourceId The ID of the incident
   * @param details Additional details about the action
   * @param userId The ID of the user (optional)
   * @param organizationId The ID of the organization (optional)
   */
  static async logIncident(
    action: string,
    resourceId: string,
    details?: Record<string, any>,
    userId?: string | null,
    organizationId?: string
  ): Promise<void> {
    return this.log(action, 'incident', resourceId, details, userId, organizationId);
  }

  /**
   * Log a risk-related audit event
   * @param action The risk action (e.g., 'risk_created', 'risk_updated')
   * @param resourceId The ID of the risk
   * @param details Additional details about the action
   * @param userId The ID of the user (optional)
   * @param organizationId The ID of the organization (optional)
   */
  static async logRisk(
    action: string,
    resourceId: string,
    details?: Record<string, any>,
    userId?: string | null,
    organizationId?: string
  ): Promise<void> {
    return this.log(action, 'risk', resourceId, details, userId, organizationId);
  }

  /**
   * Log a travel-related audit event
   * @param action The travel action (e.g., 'travel_plan_created', 'travel_plan_updated')
   * @param resourceId The ID of the travel plan
   * @param details Additional details about the action
   * @param userId The ID of the user (optional)
   * @param organizationId The ID of the organization (optional)
   */
  static async logTravel(
    action: string,
    resourceId: string,
    details?: Record<string, any>,
    userId?: string | null,
    organizationId?: string
  ): Promise<void> {
    return this.log(action, 'travel_plan', resourceId, details, userId, organizationId);
  }

  /**
   * Log a mitigation-related audit event
   * @param action The mitigation action (e.g., 'mitigation_created', 'mitigation_updated')
   * @param resourceId The ID of the mitigation
   * @param details Additional details about the action
   * @param userId The ID of the user (optional)
   * @param organizationId The ID of the organization (optional)
   */
  static async logMitigation(
    action: string,
    resourceId: string,
    details?: Record<string, any>,
    userId?: string | null,
    organizationId?: string
  ): Promise<void> {
    return this.log(action, 'mitigation', resourceId, details, userId, organizationId);
  }

  /**
   * Log an organization-related audit event
   * @param action The organization action (e.g., 'organization_created', 'organization_updated')
   * @param resourceId The ID of the organization
   * @param details Additional details about the action
   * @param userId The ID of the user (optional)
   */
  static async logOrganization(
    action: string,
    resourceId: string,
    details?: Record<string, any>,
    userId?: string | null
  ): Promise<void> {
    return this.log(action, 'organization', resourceId, details, userId, resourceId);
  }

  /**
   * Log a user-related audit event
   * @param action The user action (e.g., 'user_created', 'user_updated')
   * @param resourceId The ID of the user profile
   * @param details Additional details about the action
   * @param userId The ID of the user performing the action (optional)
   * @param organizationId The ID of the organization (optional)
   */
  static async logUser(
    action: string,
    resourceId: string,
    details?: Record<string, any>,
    userId?: string | null,
    organizationId?: string
  ): Promise<void> {
    return this.log(action, 'user_profile', resourceId, details, userId, organizationId);
  }
}