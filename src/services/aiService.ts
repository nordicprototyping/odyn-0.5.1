import { supabase } from '../lib/supabase';

// Define types for risk scoring requests and responses
export interface RiskScoringRequest {
  type: 'asset' | 'personnel' | 'travel' | 'incident' | 'risk' | 'organization' | 'mitigation';
  data: any;
  organizationId: string;
  userId?: string;
}

export interface RiskScoringResponse {
  score: number;
  components?: Record<string, number>;
  confidence: number;
  explanation: string;
  recommendations?: string[];
  trend?: 'improving' | 'stable' | 'deteriorating';
  predictions?: {
    nextWeek?: number;
    nextMonth?: number;
  };
}

export interface TokenUsage {
  total: number;
  limit: number;
  remaining: number;
  usagePercentage: number;
}

class AIService {
  private apiUrl: string;
  
  constructor() {
    this.apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
  }
  
  /**
   * Score the risk of an asset
   */
  async scoreAssetRisk(assetData: any): Promise<RiskScoringResponse> {
    return this.callRiskScoringFunction({
      type: 'asset',
      data: assetData,
      organizationId: assetData.organization_id,
    });
  }
  
  /**
   * Score the risk of personnel
   */
  async scorePersonnelRisk(personnelData: any): Promise<RiskScoringResponse> {
    return this.callRiskScoringFunction({
      type: 'personnel',
      data: personnelData,
      organizationId: personnelData.organization_id,
    });
  }
  
  /**
   * Score the risk of a travel plan
   */
  async scoreTravelRisk(travelData: any): Promise<RiskScoringResponse> {
    return this.callRiskScoringFunction({
      type: 'travel',
      data: travelData,
      organizationId: travelData.organization_id,
    });
  }
  
  /**
   * Score the risk of an incident
   */
  async scoreIncidentRisk(incidentData: any): Promise<RiskScoringResponse> {
    return this.callRiskScoringFunction({
      type: 'incident',
      data: incidentData,
      organizationId: incidentData.organization_id,
    });
  }
  
  /**
   * Evaluate a risk
   */
  async evaluateRisk(riskData: any): Promise<RiskScoringResponse> {
    return this.callRiskScoringFunction({
      type: 'risk',
      data: riskData,
      organizationId: riskData.organization_id,
    });
  }
  
  /**
   * Score the overall risk of an organization
   */
  async scoreOrganizationRisk(orgId: string, aggregateData: any): Promise<RiskScoringResponse> {
    return this.callRiskScoringFunction({
      type: 'organization',
      data: aggregateData,
      organizationId: orgId,
    });
  }
  
  /**
   * Evaluate the effectiveness of a mitigation strategy
   */
  async evaluateMitigationEffectiveness(mitigationData: any): Promise<RiskScoringResponse> {
    return this.callRiskScoringFunction({
      type: 'mitigation',
      data: mitigationData,
      organizationId: mitigationData.organization_id,
    });
  }
  
  /**
   * Get token usage for an organization
   */
  async getTokenUsage(organizationId: string): Promise<TokenUsage> {
    try {
      // Get organization settings to determine token limit
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', organizationId)
        .single();
      
      if (orgError) throw orgError;
      
      const tokenLimit = orgData?.settings?.ai?.tokenLimit || 1000000;
      
      // Get current token usage
      const { data: usageData, error: usageError } = await supabase
        .from('ai_token_usage')
        .select('total_tokens')
        .eq('organization_id', organizationId)
        .single();
      
      if (usageError && usageError.code !== 'PGRST116') throw usageError;
      
      const totalTokens = usageData?.total_tokens || 0;
      const remaining = Math.max(0, tokenLimit - totalTokens);
      const usagePercentage = (totalTokens / tokenLimit) * 100;
      
      return {
        total: totalTokens,
        limit: tokenLimit,
        remaining,
        usagePercentage
      };
    } catch (error) {
      console.error('Error getting token usage:', error);
      throw error;
    }
  }
  
  /**
   * Get token usage history for an organization
   */
  async getTokenUsageHistory(organizationId: string, days: number = 30): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error getting token usage history:', error);
      throw error;
    }
  }
  
  /**
   * Call the risk scoring edge function
   */
  private async callRiskScoringFunction(request: RiskScoringRequest): Promise<RiskScoringResponse> {
    try {
      // Get current user ID if not provided
      if (!request.userId) {
        const { data: { user } } = await supabase.auth.getUser();
        request.userId = user?.id;
      }
      
      // Get the current session and access token
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      if (!accessToken) {
        throw new Error('No access token available');
      }
      
      // Update the prompt for asset risk scoring to include type-specific attributes
      if (request.type === 'asset') {
        // Enhance the data with additional context for the AI
        const assetData = request.data;
        
        // Create a more detailed prompt based on asset type
        let typeSpecificDetails = '';
        
        if (assetData.type_specific_attributes) {
          switch (assetData.type) {
            case 'building':
              typeSpecificDetails = `
                Building Type: ${assetData.type_specific_attributes.building_type || 'Not specified'}
                Primary Function: ${assetData.type_specific_attributes.primary_function || 'Not specified'}
                Floor Count: ${assetData.type_specific_attributes.floor_count || 'Unknown'}
                Year Built: ${assetData.type_specific_attributes.year_built || 'Unknown'}
                Total Area: ${assetData.type_specific_attributes.total_area ? `${assetData.type_specific_attributes.total_area} sq ft/m²` : 'Unknown'}
                Last Renovation: ${assetData.type_specific_attributes.last_renovation || 'Unknown'}
              `;
              break;
            case 'vehicle':
              typeSpecificDetails = `
                Vehicle Type: ${assetData.type_specific_attributes.vehicle_type || 'Not specified'}
                Make: ${assetData.type_specific_attributes.make || 'Unknown'}
                Model: ${assetData.type_specific_attributes.model || 'Unknown'}
                Year: ${assetData.type_specific_attributes.year || 'Unknown'}
                License/Registration: ${assetData.type_specific_attributes.license_plate || 'Unknown'}
                Mileage/Hours: ${assetData.type_specific_attributes.mileage || 'Unknown'}
                Fuel Type: ${assetData.type_specific_attributes.fuel_type || 'Unknown'}
                Security Features: ${assetData.type_specific_attributes.security_features || 'None specified'}
              `;
              break;
            case 'equipment':
              typeSpecificDetails = `
                Equipment Type: ${assetData.type_specific_attributes.equipment_type || 'Not specified'}
                Manufacturer: ${assetData.type_specific_attributes.manufacturer || 'Unknown'}
                Model: ${assetData.type_specific_attributes.model || 'Unknown'}
                Serial Number: ${assetData.type_specific_attributes.serial_number || 'Unknown'}
                Purchase Date: ${assetData.type_specific_attributes.purchase_date || 'Unknown'}
                Last Maintenance: ${assetData.type_specific_attributes.last_maintenance_date || 'Unknown'}
                Next Maintenance Due: ${assetData.type_specific_attributes.next_maintenance_due || 'Unknown'}
                Operational Status: ${assetData.type_specific_attributes.operational_status || 'Unknown'}
              `;
              break;
          }
        }
        
        // Add the type-specific details to the request data
        request.data = {
          ...assetData,
          typeSpecificDetails
        };
      }
      
      // Update the prompt for personnel risk scoring to include new fields
      if (request.type === 'personnel') {
        // Enhance the data with additional context for the AI
        const enhancedData = {
          ...request.data,
          // Add context about work location if work_asset_id is provided
          work_location_context: request.data.work_asset_id 
            ? await this.getAssetContext(request.data.work_asset_id)
            : null
        };
        
        request.data = enhancedData;
      }
      
      const response = await fetch(`${this.apiUrl}/risk-scoring`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(request)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to score risk');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error calling risk scoring function:', error);
      
      // Return a fallback response in case of error
      return {
        score: 50,
        confidence: 60,
        explanation: 'Unable to perform AI risk assessment. Using default risk score.',
        trend: 'stable'
      };
    }
  }

  /**
   * Get context information about an asset for AI risk scoring
   */
  private async getAssetContext(assetId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('name, type, location, status, ai_risk_score, type_specific_attributes')
        .eq('id', assetId)
        .single();
      
      if (error) throw error;
      
      return {
        name: data.name,
        type: data.type,
        type_specific_attributes: data.type_specific_attributes,
        location: data.location,
        status: data.status,
        risk_score: (data.ai_risk_score as any)?.overall || 0
      };
    } catch (error) {
      console.error('Error getting asset context:', error);
      return null;
    }
  }
}

export const aiService = new AIService();