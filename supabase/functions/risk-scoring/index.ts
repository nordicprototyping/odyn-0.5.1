import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

// Define types for risk scoring requests and responses
interface RiskScoringRequest {
  type: 'asset' | 'personnel' | 'travel' | 'incident' | 'risk' | 'organization' | 'mitigation';
  data: any;
  organizationId: string;
  userId?: string;
}

interface RiskScoringResponse {
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

// Define constants
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const CHUTES_API_TOKEN = Deno.env.get('CHUTES_API_TOKEN') || '';
const CHUTES_API_URL = 'https://llm.chutes.ai/v1/chat/completions';

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Helper function to log token usage
async function logTokenUsage(organizationId: string, userId: string | null, operationType: string, tokensUsed: number) {
  try {
    // Update total token usage
    const { error: updateError } = await supabase
      .from('ai_token_usage')
      .upsert({
        organization_id: organizationId,
        total_tokens: tokensUsed,
        last_used: new Date().toISOString()
      }, {
        onConflict: 'organization_id',
        ignoreDuplicates: false
      });
    
    if (updateError) {
      console.error('Error updating token usage:', updateError);
    }
    
    // Log individual usage
    const { error: logError } = await supabase
      .from('ai_usage_logs')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        operation_type: operationType,
        tokens_used: tokensUsed
      });
    
    if (logError) {
      console.error('Error logging token usage:', logError);
    }
  } catch (error) {
    console.error('Error in logTokenUsage:', error);
  }
}

// Helper function to extract valid JSON from potentially malformed response
function extractJsonFromString(text: string): string {
  try {
    // First, try to find JSON between curly braces
    const jsonRegex = /{[\s\S]*}/;
    const match = text.match(jsonRegex);
    
    if (match && match[0]) {
      // Try to parse it to validate it's actually JSON
      JSON.parse(match[0]);
      return match[0];
    }
    
    throw new Error('No valid JSON object found in the response');
  } catch (error) {
    console.error('Error extracting JSON:', error);
    throw new Error('Failed to extract valid JSON from response');
  }
}

// Helper function to call Chutes AI API
async function callChutesAI(prompt: string, systemPrompt: string): Promise<any> {
  try {
    const response = await fetch(CHUTES_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CHUTES_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-ai/DeepSeek-R1-0528',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: false,
        max_tokens: 1024,
        temperature: 0.3,
        response_format: {
          type: 'json_object'
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: data.usage
    };
  } catch (error) {
    console.error('Error calling Chutes AI:', error);
    throw error;
  }
}

// Function to score asset risk
async function scoreAssetRisk(assetData: any, organizationId: string, userId: string | null): Promise<RiskScoringResponse> {
  const systemPrompt = `
    You are an expert AI security risk analyst specializing in asset security assessment.
    Your task is to analyze the provided asset data and calculate a risk score from 0-100 (where higher means more risk).
    You should also provide component scores for different risk factors, a confidence score (0-100), 
    a trend assessment (improving, stable, or deteriorating), and predictions for future risk.
    
    CRITICAL: You MUST respond with ONLY valid JSON. Do not include any explanatory text, markdown formatting, or code blocks.
    Do not use <think> tags or any other non-JSON content in your response.
    
    Format your response as valid JSON with the following structure:
    {
      "score": number,
      "components": {
        "physicalSecurity": number,
        "cyberSecurity": number,
        "accessControl": number,
        "environmentalRisk": number,
        "personnelRisk": number
      },
      "confidence": number,
      "explanation": "string",
      "recommendations": ["string", "string", ...],
      "trend": "improving" | "stable" | "deteriorating",
      "predictions": {
        "nextWeek": number,
        "nextMonth": number
      }
    }
  `;
  
  const prompt = `
    Please analyze the following asset data and provide a comprehensive risk assessment in JSON format:
    
    Asset Name: ${assetData.name}
    Asset Type: ${assetData.type}
    Location: ${assetData.location.city}, ${assetData.location.country}
    Current Status: ${assetData.status}
    
    Personnel Information:
    - Current Personnel: ${assetData.personnel.current}
    - Capacity: ${assetData.personnel.capacity}
    
    Security Systems:
    - CCTV Coverage: ${assetData.security_systems.cctv.coverage}%
    - Access Control Zones: ${assetData.security_systems.accessControl.zones}
    - Alarm Sensors: ${assetData.security_systems.alarms.sensors}
    
    Compliance:
    - Last Audit: ${assetData.compliance.lastAudit}
    - Next Audit: ${assetData.compliance.nextAudit}
    - Compliance Score: ${assetData.compliance.score}
    
    Responsible Officer Department: ${assetData.responsible_officer.department}
    
    Consider factors such as:
    1. The asset type and its inherent vulnerabilities
    2. The location's geopolitical risk
    3. Security systems coverage and effectiveness
    4. Personnel density and access control
    5. Compliance status and audit frequency
    6. Historical incident data
    
    Provide a detailed risk assessment with specific recommendations for risk mitigation.
    
    REMEMBER: Respond with ONLY valid JSON. No explanatory text, markdown, or code blocks.
  `;
  
  try {
    const result = await callChutesAI(prompt, systemPrompt);
    
    // Log token usage
    if (result.usage && result.usage.total_tokens) {
      await logTokenUsage(organizationId, userId, 'asset', result.usage.total_tokens);
    }
    
    // Extract JSON from the response
    let jsonContent;
    try {
      // First try direct parsing
      jsonContent = JSON.parse(result.content);
    } catch (parseError) {
      console.error('JSON parse error in asset risk assessment:', parseError);
      console.error('Raw content:', result.content);
      
      // If direct parsing fails, try to extract JSON using regex
      const extractedJson = extractJsonFromString(result.content);
      jsonContent = JSON.parse(extractedJson);
      console.log('Successfully extracted JSON from malformed response');
    }
    
    return jsonContent;
  } catch (error) {
    console.error('Error in scoreAssetRisk:', error);
    
    // Return a fallback response
    return {
      score: 50,
      components: {
        physicalSecurity: 45,
        cyberSecurity: 55,
        accessControl: 50,
        environmentalRisk: 40,
        personnelRisk: 60
      },
      confidence: 70,
      explanation: "Unable to perform AI risk assessment due to an error. This is a default risk score based on the asset type and location.",
      recommendations: [
        "Conduct a manual security assessment",
        "Review security systems and access controls",
        "Ensure compliance with security standards"
      ],
      trend: "stable",
      predictions: {
        nextWeek: 50,
        nextMonth: 52
      }
    };
  }
}

// Function to score personnel risk
async function scorePersonnelRisk(personnelData: any, organizationId: string, userId: string | null): Promise<RiskScoringResponse> {
  const systemPrompt = `
    You are an expert AI security risk analyst specializing in personnel security assessment.
    Your task is to analyze the provided personnel data and calculate a risk score from 0-100 (where higher means more risk).
    You should also provide component scores for different risk factors, a confidence score (0-100), 
    a trend assessment (improving, stable, or deteriorating), and predictions for future risk.
    
    CRITICAL: You MUST respond with ONLY valid JSON. Do not include any explanatory text, markdown formatting, or code blocks.
    Do not use <think> tags or any other non-JSON content in your response.
    
    Format your response as valid JSON with the following structure:
    {
      "score": number,
      "components": {
        "behavioralRisk": number,
        "travelRisk": number,
        "accessRisk": number,
        "complianceRisk": number,
        "geographicRisk": number
      },
      "confidence": number,
      "explanation": "string",
      "recommendations": ["string", "string", ...],
      "trend": "improving" | "stable" | "deteriorating",
      "predictions": {
        "nextWeek": number,
        "nextMonth": number
      }
    }
  `;
  
  // Extract work location context if available
  const workLocationContext = personnelData.work_location_context 
    ? `Work Location: ${personnelData.work_location_context.name} (${personnelData.work_location_context.type})
    Work Location Status: ${personnelData.work_location_context.status}
    Work Location Risk Score: ${personnelData.work_location_context.risk_score}`
    : 'Work Location: Not assigned to a specific asset';
  
  // Format date of birth if available
  const dobInfo = personnelData.date_of_birth 
    ? `Date of Birth: ${personnelData.date_of_birth}`
    : 'Date of Birth: Not provided';
  
  // Format emergency contact address if available
  const emergencyContactAddress = personnelData.emergency_contact.address
    ? `Emergency Contact Address: ${personnelData.emergency_contact.address}, ${personnelData.emergency_contact.city || ''}, ${personnelData.emergency_contact.country || ''}`
    : 'Emergency Contact Address: Not provided';
  
  const prompt = `
    Please analyze the following personnel data and provide a comprehensive risk assessment in JSON format:
    
    Name: ${personnelData.name}
    Employee ID: ${personnelData.employee_id}
    ${dobInfo}
    Category: ${personnelData.category}
    Department: ${personnelData.department}
    
    Home Address: ${personnelData.current_location.address || ''}, ${personnelData.current_location.city}, ${personnelData.current_location.country}
    ${workLocationContext}
    
    Clearance Level: ${personnelData.clearance_level}
    Status: ${personnelData.status}
    
    Emergency Contact:
    - Name: ${personnelData.emergency_contact.name}
    - Relationship: ${personnelData.emergency_contact.relationship}
    - Phone: ${personnelData.emergency_contact.phone}
    - ${emergencyContactAddress}
    
    Travel Status:
    - Current: ${personnelData.travel_status.current}
    - Active Travel: ${personnelData.travel_status.isActive ? 'Yes' : 'No'}
    
    Consider factors such as:
    1. The personnel's clearance level and access to sensitive information
    2. Current location and geopolitical risk factors
    3. Travel status and associated risks
    4. Role and responsibilities
    5. Department-specific risk factors
    6. Age and experience level
    7. Work location security status
    
    Provide a detailed risk assessment with specific recommendations for risk mitigation.
    
    REMEMBER: Respond with ONLY valid JSON. No explanatory text, markdown, or code blocks.
  `;
  
  try {
    const result = await callChutesAI(prompt, systemPrompt);
    
    // Log token usage
    if (result.usage && result.usage.total_tokens) {
      await logTokenUsage(organizationId, userId, 'personnel', result.usage.total_tokens);
    }
    
    // Extract JSON from the response
    let jsonContent;
    try {
      // First try direct parsing
      jsonContent = JSON.parse(result.content);
    } catch (parseError) {
      console.error('JSON parse error in personnel risk assessment:', parseError);
      console.error('Raw content:', result.content);
      
      // If direct parsing fails, try to extract JSON using regex
      const extractedJson = extractJsonFromString(result.content);
      jsonContent = JSON.parse(extractedJson);
      console.log('Successfully extracted JSON from malformed response');
    }
    
    return jsonContent;
  } catch (error) {
    console.error('Error in scorePersonnelRisk:', error);
    
    // Return a fallback response
    return {
      score: 45,
      components: {
        behavioralRisk: 30,
        travelRisk: 50,
        accessRisk: 40,
        complianceRisk: 35,
        geographicRisk: 55
      },
      confidence: 75,
      explanation: "Unable to perform AI risk assessment due to an error. This is a default risk score based on the personnel category and location.",
      recommendations: [
        "Review security clearance and access levels",
        "Provide additional security training",
        "Implement regular check-ins during travel"
      ],
      trend: "stable",
      predictions: {
        nextWeek: 45,
        nextMonth: 48
      }
    };
  }
}

// Function to score travel risk
async function scoreTravelRisk(travelData: any, organizationId: string, userId: string | null): Promise<RiskScoringResponse> {
  const systemPrompt = `
    You are an expert AI security risk analyst specializing in travel security assessment.
    Your task is to analyze the provided travel plan data and calculate a risk score from 0-100 (where higher means more risk).
    You should also provide component scores for different risk factors, a confidence score (0-100), 
    a trend assessment (improving, stable, or deteriorating), and specific recommendations.
    
    CRITICAL: You MUST respond with ONLY valid JSON. Do not include any explanatory text, markdown formatting, or code blocks.
    Do not use <think> tags or any other non-JSON content in your response.
    
    Format your response as valid JSON with the following structure:
    {
      "score": number,
      "components": {
        "geopolitical": number,
        "security": number,
        "health": number,
        "environmental": number,
        "transportation": number
      },
      "confidence": number,
      "explanation": "string",
      "recommendations": ["string", "string", ...],
      "trend": "improving" | "stable" | "deteriorating"
    }
  `;
  
  const prompt = `
    Please analyze the following travel plan and provide a comprehensive risk assessment in JSON format:
    
    Traveler: ${travelData.traveler_name}
    Department: ${travelData.traveler_department}
    Clearance Level: ${travelData.traveler_clearance_level}
    
    Origin: ${travelData.origin.city}, ${travelData.origin.country}
    Destination: ${travelData.destination.city}, ${travelData.destination.country}
    
    Departure Date: ${travelData.departure_date}
    Return Date: ${travelData.return_date}
    
    Purpose: ${travelData.purpose}
    
    Consider factors such as:
    1. The destination's geopolitical stability and security situation
    2. The traveler's profile and clearance level
    3. Duration and purpose of travel
    4. Local health and environmental risks
    5. Transportation security concerns
    
    Provide a detailed risk assessment with specific recommendations for risk mitigation.
    
    REMEMBER: Respond with ONLY valid JSON. No explanatory text, markdown, or code blocks.
  `;
  
  try {
    const result = await callChutesAI(prompt, systemPrompt);
    
    // Log token usage
    if (result.usage && result.usage.total_tokens) {
      await logTokenUsage(organizationId, userId, 'travel', result.usage.total_tokens);
    }
    
    // Extract JSON from the response
    let jsonContent;
    try {
      // First try direct parsing
      jsonContent = JSON.parse(result.content);
    } catch (parseError) {
      console.error('JSON parse error in travel risk assessment:', parseError);
      console.error('Raw content:', result.content);
      
      // If direct parsing fails, try to extract JSON using regex
      const extractedJson = extractJsonFromString(result.content);
      jsonContent = JSON.parse(extractedJson);
      console.log('Successfully extracted JSON from malformed response');
    }
    
    return jsonContent;
  } catch (error) {
    console.error('Error in scoreTravelRisk:', error);
    
    // Return a fallback response
    return {
      score: 55,
      components: {
        geopolitical: 60,
        security: 55,
        health: 40,
        environmental: 35,
        transportation: 50
      },
      confidence: 70,
      explanation: "Unable to perform AI risk assessment due to an error. This is a default risk score based on the destination country and travel purpose.",
      recommendations: [
        "Conduct pre-travel security briefing",
        "Register with local embassy or consulate",
        "Establish regular check-in protocol",
        "Prepare emergency evacuation plan"
      ],
      trend: "stable"
    };
  }
}

// Function to score organization risk
async function scoreOrganizationRisk(organizationId: string, userId: string | null, aggregateData: any): Promise<RiskScoringResponse> {
  const systemPrompt = `
    You are an expert AI security risk analyst specializing in organizational security assessment.
    Your task is to analyze the provided organization data and calculate an overall risk score from 0-100 (where higher means more risk).
    You should also provide component scores for different risk factors, a confidence score (0-100), 
    a trend assessment (improving, stable, or deteriorating), and specific recommendations.
    
    CRITICAL: You MUST respond with ONLY valid JSON. Do not include any explanatory text, markdown formatting, or code blocks.
    Do not use <think> tags or any other non-JSON content in your response.
    
    Format your response as valid JSON with the following structure:
    {
      "score": number,
      "components": {
        "assetSecurity": number,
        "personnelSecurity": number,
        "incidentManagement": number,
        "travelSecurity": number,
        "complianceRisk": number,
        "geopoliticalRisk": number
      },
      "confidence": number,
      "explanation": "string",
      "recommendations": ["string", "string", ...],
      "trend": "improving" | "stable" | "deteriorating"
    }
  `;
  
  const prompt = `
    Please analyze the following organization data and provide a comprehensive risk assessment in JSON format:
    
    Assets: ${aggregateData.assets.length} total assets
    - Secure assets: ${aggregateData.assets.filter((a: any) => a.status === 'secure').length}
    - Alert assets: ${aggregateData.assets.filter((a: any) => a.status === 'alert').length}
    - Maintenance assets: ${aggregateData.assets.filter((a: any) => a.status === 'maintenance').length}
    - Offline assets: ${aggregateData.assets.filter((a: any) => a.status === 'offline').length}
    - Compromised assets: ${aggregateData.assets.filter((a: any) => a.status === 'compromised').length}
    
    Personnel: ${aggregateData.personnel.length} total personnel
    - Active personnel: ${aggregateData.personnel.filter((p: any) => p.status === 'active').length}
    - On-mission personnel: ${aggregateData.personnel.filter((p: any) => p.status === 'on-mission').length}
    - In-transit personnel: ${aggregateData.personnel.filter((p: any) => p.status === 'in-transit').length}
    
    Incidents: ${aggregateData.incidents.length} total incidents
    - Open incidents: ${aggregateData.incidents.filter((i: any) => i.status === 'Open').length}
    - In Progress incidents: ${aggregateData.incidents.filter((i: any) => i.status === 'In Progress').length}
    - Closed incidents: ${aggregateData.incidents.filter((i: any) => i.status === 'Closed').length}
    - Critical incidents: ${aggregateData.incidents.filter((i: any) => i.severity === 'Critical').length}
    - High severity incidents: ${aggregateData.incidents.filter((i: any) => i.severity === 'High').length}
    
    Travel Plans: ${aggregateData.travelPlans.length} total travel plans
    - Pending approval: ${aggregateData.travelPlans.filter((t: any) => t.status === 'pending').length}
    - Approved: ${aggregateData.travelPlans.filter((t: any) => t.status === 'approved').length}
    - In-progress: ${aggregateData.travelPlans.filter((t: any) => t.status === 'in-progress').length}
    
    Consider factors such as:
    1. The overall security posture of assets
    2. Personnel security and deployment status
    3. Incident frequency, severity, and resolution status
    4. Travel security and risk levels
    5. Compliance status across the organization
    6. Geopolitical factors affecting organizational risk
    
    Provide a detailed risk assessment with specific recommendations for risk mitigation.
    
    REMEMBER: Respond with ONLY valid JSON. No explanatory text, markdown, or code blocks.
  `;
  
  try {
    const result = await callChutesAI(prompt, systemPrompt);
    
    // Log token usage
    if (result.usage && result.usage.total_tokens) {
      await logTokenUsage(organizationId, userId, 'organization', result.usage.total_tokens);
    }
    
    // Extract JSON from the response
    let jsonContent;
    try {
      // First try direct parsing
      jsonContent = JSON.parse(result.content);
    } catch (parseError) {
      console.error('JSON parse error in organization risk assessment:', parseError);
      console.error('Raw content:', result.content);
      
      // If direct parsing fails, try to extract JSON using regex
      const extractedJson = extractJsonFromString(result.content);
      jsonContent = JSON.parse(extractedJson);
      console.log('Successfully extracted JSON from malformed response');
    }
    
    return jsonContent;
  } catch (error) {
    console.error('Error in scoreOrganizationRisk:', error);
    
    // Return a fallback response
    return {
      score: 42,
      components: {
        assetSecurity: 40,
        personnelSecurity: 45,
        incidentManagement: 38,
        travelSecurity: 50,
        complianceRisk: 35,
        geopoliticalRisk: 48
      },
      confidence: 75,
      explanation: "Unable to perform AI risk assessment due to an error. This is a default risk score based on the available organization data.",
      recommendations: [
        "Conduct a comprehensive security audit",
        "Review incident response procedures",
        "Enhance personnel security training",
        "Update travel security protocols"
      ],
      trend: "stable"
    };
  }
}

// Main handler function
Deno.serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Parse request body
    const requestData: RiskScoringRequest = await req.json();
    
    // Validate request
    if (!requestData.type || !requestData.data || !requestData.organizationId) {
      return new Response(JSON.stringify({ error: 'Invalid request data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Process based on request type
    let response: RiskScoringResponse;
    
    switch (requestData.type) {
      case 'asset':
        response = await scoreAssetRisk(requestData.data, requestData.organizationId, requestData.userId || user.id);
        break;
      case 'personnel':
        response = await scorePersonnelRisk(requestData.data, requestData.organizationId, requestData.userId || user.id);
        break;
      case 'travel':
        response = await scoreTravelRisk(requestData.data, requestData.organizationId, requestData.userId || user.id);
        break;
      case 'organization':
        response = await scoreOrganizationRisk(requestData.organizationId, requestData.userId || user.id, requestData.data);
        break;
      default:
        // For other types, return a placeholder response
        response = {
          score: 50,
          confidence: 70,
          explanation: `AI risk scoring for ${requestData.type} is not yet implemented.`,
          trend: 'stable'
        };
    }
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error processing request:', error);
    
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});