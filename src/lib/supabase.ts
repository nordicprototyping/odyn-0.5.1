import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Database types
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          plan_type: string;
          settings: {
            general?: {
              description?: string;
              website?: string;
              industry?: string;
              size?: string;
              headquarters?: {
                address?: string;
                city?: string;
                country?: string;
                timezone?: string;
              };
              contact?: {
                email?: string;
                phone?: string;
                emergencyPhone?: string;
              };
            };
            security?: {
              passwordPolicy?: {
                minLength?: number;
                requireUppercase?: boolean;
                requireLowercase?: boolean;
                requireNumbers?: boolean;
                requireSpecialChars?: boolean;
                maxAge?: number;
                preventReuse?: number;
              };
              sessionPolicy?: {
                maxDuration?: number;
                idleTimeout?: number;
                maxConcurrentSessions?: number;
                requireReauth?: boolean;
              };
              twoFactorAuth?: {
                required?: boolean;
                allowedMethods?: string[];
                backupCodes?: boolean;
              };
              accessControl?: {
                defaultRole?: string;
                autoLockAccount?: boolean;
                maxFailedAttempts?: number;
                lockoutDuration?: number;
              };
            };
            notifications?: {
              email?: {
                enabled?: boolean;
                smtp?: {
                  host?: string;
                  port?: number;
                  secure?: boolean;
                  username?: string;
                  password?: string;
                };
              };
              alerts?: {
                securityIncidents?: boolean;
                systemMaintenance?: boolean;
                userActivity?: boolean;
                riskAssessments?: boolean;
              };
              thresholds?: {
                highRiskScore?: number;
                criticalRiskScore?: number;
                unusualActivity?: boolean;
                geopoliticalEvents?: boolean;
                travelRisks?: boolean;
              };
            };
            integrations?: {
              googleMaps?: {
                enabled?: boolean;
                apiKey?: string;
              };
              externalSystems?: {
                enabled?: boolean;
                endpoints?: string[];
              };
            };
            departments?: {
              list?: {
                id: string;
                name: string;
                description: string;
                headCount: number;
                securityLevel: string;
              }[];
            };
            ai?: {
              enabled?: boolean;
              model?: string;
              tokensUsed?: number;
              tokenLimit?: number;
              settings?: {
                temperature?: number;
                contextWindow?: number;
                responseLength?: string;
              };
              notifications?: {
                approachingLimit?: boolean;
                limitThreshold?: number;
                weeklyUsageReport?: boolean;
              };
            };
          };
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          plan_type?: string;
          settings?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          plan_type?: string;
          settings?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
      };
      mitigations: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          category: 'asset' | 'personnel' | 'incident' | 'travel' | 'risk' | 'general';
          default_risk_reduction_score: number;
          is_custom: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          category: 'asset' | 'personnel' | 'incident' | 'travel' | 'risk' | 'general';
          default_risk_reduction_score?: number;
          is_custom?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          category?: 'asset' | 'personnel' | 'incident' | 'travel' | 'risk' | 'general';
          default_risk_reduction_score?: number;
          is_custom?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          role: 'super_admin' | 'admin' | 'manager' | 'user';
          full_name: string;
          department: string | null;
          phone: string | null;
          two_factor_enabled: boolean;
          two_factor_secret: string | null;
          backup_codes: string[] | null;
          last_login: string | null;
          failed_login_attempts: number;
          account_locked_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id: string;
          role?: 'super_admin' | 'admin' | 'manager' | 'user';
          full_name: string;
          department?: string | null;
          phone?: string | null;
          two_factor_enabled?: boolean;
          two_factor_secret?: string | null;
          backup_codes?: string[] | null;
          last_login?: string | null;
          failed_login_attempts?: number;
          account_locked_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_id?: string;
          role?: 'super_admin' | 'admin' | 'manager' | 'user';
          full_name?: string;
          department?: string | null;
          phone?: string | null;
          two_factor_enabled?: boolean;
          two_factor_secret?: string | null;
          backup_codes?: string[] | null;
          last_login?: string | null;
          failed_login_attempts?: number;
          account_locked_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          organization_id: string;
          action: string;
          resource_type: string | null;
          resource_id: string | null;
          details: Record<string, any> | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          organization_id: string;
          action: string;
          resource_type?: string | null;
          resource_id?: string | null;
          details?: Record<string, any> | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          organization_id?: string;
          action?: string;
          resource_type?: string | null;
          resource_id?: string | null;
          details?: Record<string, any> | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      personnel_details: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          employee_id: string;
          category: string;
          department: string;
          current_location: Record<string, any>;
          work_location: string;
          clearance_level: string;
          emergency_contact: Record<string, any>;
          travel_status: Record<string, any>;
          ai_risk_score: Record<string, any>;
          status: string;
          last_seen: string;
          mitigations: Record<string, any>[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          employee_id: string;
          category?: string;
          department: string;
          current_location?: Record<string, any>;
          work_location: string;
          clearance_level?: string;
          emergency_contact?: Record<string, any>;
          travel_status?: Record<string, any>;
          ai_risk_score?: Record<string, any>;
          status?: string;
          last_seen?: string;
          mitigations?: Record<string, any>[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          employee_id?: string;
          category?: string;
          department?: string;
          current_location?: Record<string, any>;
          work_location?: string;
          clearance_level?: string;
          emergency_contact?: Record<string, any>;
          travel_status?: Record<string, any>;
          ai_risk_score?: Record<string, any>;
          status?: string;
          last_seen?: string;
          mitigations?: Record<string, any>[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      incident_reports: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          description: string;
          date_time: string;
          severity: 'Low' | 'Medium' | 'High' | 'Critical';
          location: string;
          department: string;
          involved_parties: string[];
          immediate_actions: string | null;
          reporter_user_id: string | null;
          reporter_name: string;
          reporter_email: string;
          reporter_phone: string | null;
          status: 'Open' | 'In Progress' | 'Closed';
          assigned_to: string | null;
          documents: string[];
          timeline: Record<string, any>[];
          mitigations: Record<string, any>[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          description: string;
          date_time: string;
          severity?: 'Low' | 'Medium' | 'High' | 'Critical';
          location: string;
          department: string;
          involved_parties?: string[];
          immediate_actions?: string | null;
          reporter_user_id?: string | null;
          reporter_name: string;
          reporter_email: string;
          reporter_phone?: string | null;
          status?: 'Open' | 'In Progress' | 'Closed';
          assigned_to?: string | null;
          documents?: string[];
          timeline?: Record<string, any>[];
          mitigations?: Record<string, any>[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          title?: string;
          description?: string;
          date_time?: string;
          severity?: 'Low' | 'Medium' | 'High' | 'Critical';
          location?: string;
          department?: string;
          involved_parties?: string[];
          immediate_actions?: string | null;
          reporter_user_id?: string | null;
          reporter_name?: string;
          reporter_email?: string;
          reporter_phone?: string | null;
          status?: 'Open' | 'In Progress' | 'Closed';
          assigned_to?: string | null;
          documents?: string[];
          timeline?: Record<string, any>[];
          mitigations?: Record<string, any>[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      assets: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          type: 'building' | 'facility' | 'vehicle' | 'equipment' | 'data-center' | 'embassy';
          location: Record<string, any>;
          status: 'secure' | 'alert' | 'maintenance' | 'offline' | 'compromised';
          personnel: Record<string, any>;
          ai_risk_score: Record<string, any>;
          security_systems: Record<string, any>;
          compliance: Record<string, any>;
          incidents: Record<string, any>;
          responsible_officer: Record<string, any>;
          mitigations: Record<string, any>[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          type: 'building' | 'facility' | 'vehicle' | 'equipment' | 'data-center' | 'embassy';
          location?: Record<string, any>;
          status?: 'secure' | 'alert' | 'maintenance' | 'offline' | 'compromised';
          personnel?: Record<string, any>;
          ai_risk_score?: Record<string, any>;
          security_systems?: Record<string, any>;
          compliance?: Record<string, any>;
          incidents?: Record<string, any>;
          responsible_officer?: Record<string, any>;
          mitigations?: Record<string, any>[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          type?: 'building' | 'facility' | 'vehicle' | 'equipment' | 'data-center' | 'embassy';
          location?: Record<string, any>;
          status?: 'secure' | 'alert' | 'maintenance' | 'offline' | 'compromised';
          personnel?: Record<string, any>;
          ai_risk_score?: Record<string, any>;
          security_systems?: Record<string, any>;
          compliance?: Record<string, any>;
          incidents?: Record<string, any>;
          responsible_officer?: Record<string, any>;
          mitigations?: Record<string, any>[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      travel_plans: {
        Row: {
          id: string;
          organization_id: string;
          traveler_user_id: string | null;
          traveler_name: string;
          traveler_employee_id: string;
          traveler_department: string;
          traveler_clearance_level: string;
          destination: Record<string, any>;
          origin: Record<string, any>;
          departure_date: string;
          return_date: string;
          purpose: string;
          status: 'pending' | 'approved' | 'denied' | 'in-progress' | 'completed' | 'cancelled';
          risk_assessment: Record<string, any>;
          approver: string | null;
          emergency_contacts: Record<string, any>;
          itinerary: Record<string, any>;
          documents: string[];
          mitigations: Record<string, any>[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          traveler_user_id?: string | null;
          traveler_name: string;
          traveler_employee_id: string;
          traveler_department: string;
          traveler_clearance_level: string;
          destination: Record<string, any>;
          origin: Record<string, any>;
          departure_date: string;
          return_date: string;
          purpose: string;
          status?: 'pending' | 'approved' | 'denied' | 'in-progress' | 'completed' | 'cancelled';
          risk_assessment?: Record<string, any>;
          approver?: string | null;
          emergency_contacts?: Record<string, any>;
          itinerary?: Record<string, any>;
          documents?: string[];
          mitigations?: Record<string, any>[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          traveler_user_id?: string | null;
          traveler_name?: string;
          traveler_employee_id?: string;
          traveler_department?: string;
          traveler_clearance_level?: string;
          destination?: Record<string, any>;
          origin?: Record<string, any>;
          departure_date?: string;
          return_date?: string;
          purpose?: string;
          status?: 'pending' | 'approved' | 'denied' | 'in-progress' | 'completed' | 'cancelled';
          risk_assessment?: Record<string, any>;
          approver?: string | null;
          emergency_contacts?: Record<string, any>;
          itinerary?: Record<string, any>;
          documents?: string[];
          mitigations?: Record<string, any>[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      risks: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          description: string;
          category: 'operational' | 'financial' | 'strategic' | 'compliance' | 'security' | 'technical' | 'environmental' | 'reputational';
          status: 'identified' | 'assessed' | 'mitigated' | 'monitoring' | 'closed';
          impact: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
          likelihood: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
          risk_score: number;
          mitigation_plan: string | null;
          owner_user_id: string | null;
          identified_by_user_id: string | null;
          department: string | null;
          due_date: string | null;
          last_reviewed_at: string | null;
          mitigations: Record<string, any>[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          description: string;
          category: 'operational' | 'financial' | 'strategic' | 'compliance' | 'security' | 'technical' | 'environmental' | 'reputational';
          status?: 'identified' | 'assessed' | 'mitigated' | 'monitoring' | 'closed';
          impact: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
          likelihood: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
          risk_score?: number;
          mitigation_plan?: string | null;
          owner_user_id?: string | null;
          identified_by_user_id?: string | null;
          department?: string | null;
          due_date?: string | null;
          last_reviewed_at?: string | null;
          mitigations?: Record<string, any>[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          title?: string;
          description?: string;
          category?: 'operational' | 'financial' | 'strategic' | 'compliance' | 'security' | 'technical' | 'environmental' | 'reputational';
          status?: 'identified' | 'assessed' | 'mitigated' | 'monitoring' | 'closed';
          impact?: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
          likelihood?: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
          risk_score?: number;
          mitigation_plan?: string | null;
          owner_user_id?: string | null;
          identified_by_user_id?: string | null;
          department?: string | null;
          due_date?: string | null;
          last_reviewed_at?: string | null;
          mitigations?: Record<string, any>[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}