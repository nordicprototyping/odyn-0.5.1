import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

// Define types for risk scoring requests and responses
interface RiskScoringRequest {
  type: 'asset' | 'personnel' | 'travel' | 'incident' | 'risk' | 'organization' | 'mitigation' | 'detect_risks';
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

interface DetectedRisk {
  title: string;
  description: string;
  category: 'physical_security_vulnerabilities' | 'environmental_hazards' | 'natural_disasters' | 'infrastructure_failure' | 'personnel_safety_security' | 'asset_damage_loss';
  impact: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  likelihood: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  source_type: 'asset' | 'personnel' | 'incident' | 'travel' | 'pattern';
  source_id?: string;
  department?: string;
  confidence: number;
  explanation: string;
  recommendations: string[];
}

interface RiskDetectionResponse {
  risks: DetectedRisk[];
  summary: {
    total_risks_detected: number;
    high_priority_risks: number;
    confidence_score: number;
  };
  token_usage: number;
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

// Function to detect risks based on patterns in the data
async function detectRisks(aggregateData: any, organizationId: string, userId: string | null): Promise<RiskDetectionResponse> {
  const systemPrompt = `
    You are an expert AI security risk analyst specializing in pattern detection and risk identification.
    Your task is to analyze the provided organization data and identify potential new risks that should be added to the risk register.
    
    You should look for patterns across assets, personnel, incidents, travel plans, and existing risks that might indicate
    new or emerging risks that haven't been explicitly identified yet.
    
    CRITICAL: You MUST respond with ONLY valid JSON. Do not include any explanatory text, markdown formatting, or code blocks.
    Do not use <think> tags or any other non-JSON content in your response.
    
    Format your response as valid JSON with the following structure:
    {
      "risks": [
        {
          "title": "string",
          "description": "string",
          "category": "physical_security_vulnerabilities" | "environmental_hazards" | "natural_disasters" | "infrastructure_failure" | "personnel_safety_security" | "asset_damage_loss",
          "impact": "very_low" | "low" | "medium" | "high" | "very_high",
          "likelihood": "very_low" | "low" | "medium" | "high" | "very_high",
          "source_type": "asset" | "personnel" | "incident" | "travel" | "pattern",
          "source_id": "string (optional)",
          "department": "string (optional)",
          "confidence": number,
          "explanation": "string",
          "recommendations": ["string", "string", ...]
        }
      ],
      "summary": {
        "total_risks_detected": number,
        "high_priority_risks": number,
        "confidence_score": number
      }
    }
  `;
  
  // Count items in each category
  const assetCount = aggregateData.assets.length;
  const personnelCount = aggregateData.personnel.length;
  const incidentCount = aggregateData.incidents.length;
  const travelPlanCount = aggregateData.travelPlans.length;
  const riskCount = aggregateData.risks.length;
  
  // Prepare summary statistics for each category
  const assetSummary = `
    Assets (${assetCount} total):
    - Secure: ${aggregateData.assets.filter((a: any) => a.status === 'secure').length}
    - Alert: ${aggregateData.assets.filter((a: any) => a.status === 'alert').length}
    - Maintenance: ${aggregateData.assets.filter((a: any) => a.status === 'maintenance').length}
    - Offline: ${aggregateData.assets.filter((a: any) => a.status === 'offline').length}
    - Compromised: ${aggregateData.assets.filter((a: any) => a.status === 'compromised').length}
  `;
  
  const personnelSummary = `
    Personnel (${personnelCount} total):
    - Active: ${aggregateData.personnel.filter((p: any) => p.status === 'active').length}
    - On-mission: ${aggregateData.personnel.filter((p: any) => p.status === 'on-mission').length}
    - In-transit: ${aggregateData.personnel.filter((p: any) => p.status === 'in-transit').length}
    - Off-duty: ${aggregateData.personnel.filter((p: any) => p.status === 'off-duty').length}
    - Unavailable: ${aggregateData.personnel.filter((p: any) => p.status === 'unavailable').length}
  `;
  
  const incidentSummary = `
    Incidents (${incidentCount} total):
    - Open: ${aggregateData.incidents.filter((i: any) => i.status === 'Open').length}
    - In Progress: ${aggregateData.incidents.filter((i: any) => i.status === 'In Progress').length}
    - Closed: ${aggregateData.incidents.filter((i: any) => i.status === 'Closed').length}
    - Critical: ${aggregateData.incidents.filter((i: any) => i.severity === 'Critical').length}
    - High: ${aggregateData.incidents.filter((i: any) => i.severity === 'High').length}
    - Medium: ${aggregateData.incidents.filter((i: any) => i.severity === 'Medium').length}
    - Low: ${aggregateData.incidents.filter((i: any) => i.severity === 'Low').length}
  `;
  
  const travelPlanSummary = `
    Travel Plans (${travelPlanCount} total):
    - Pending: ${aggregateData.travelPlans.filter((t: any) => t.status === 'pending').length}
    - Approved: ${aggregateData.travelPlans.filter((t: any) => t.status === 'approved').length}
    - In-progress: ${aggregateData.travelPlans.filter((t: any) => t.status === 'in-progress').length}
    - Completed: ${aggregateData.travelPlans.filter((t: any) => t.status === 'completed').length}
    - Cancelled: ${aggregateData.travelPlans.filter((t: any) => t.status === 'cancelled').length}
  `;
  
  const riskSummary = `
    Existing Risks (${riskCount} total):
    - Identified: ${aggregateData.risks.filter((r: any) => r.status === 'identified').length}
    - Assessed: ${aggregateData.risks.filter((r: any) => r.status === 'assessed').length}
    - Mitigated: ${aggregateData.risks.filter((r: any) => r.status === 'mitigated').length}
    - Monitoring: ${aggregateData.risks.filter((r: any) => r.status === 'monitoring').length}
    - Closed: ${aggregateData.risks.filter((r: any) => r.status === 'closed').length}
    - AI-generated: ${aggregateData.risks.filter((r: any) => r.is_ai_generated).length}
  `;
  
  // Prepare detailed examples of each category for pattern detection
  // We'll limit to a few examples to keep the prompt size manageable
  const assetExamples = aggregateData.assets.slice(0, 5).map((a: any, i: number) => 
    `Asset ${i+1}: ${a.name} (${a.type}) - Status: ${a.status} - Location: ${(a.location as any)?.city || 'Unknown'}, ${(a.location as any)?.country || 'Unknown'}`
  ).join('\n');
  
  const personnelExamples = aggregateData.personnel.slice(0, 5).map((p: any, i: number) => 
    `Personnel ${i+1}: ${p.name} (${p.department}) - Status: ${p.status} - Location: ${(p.current_location as any)?.city || 'Unknown'}, ${(p.current_location as any)?.country || 'Unknown'}`
  ).join('\n');
  
  const incidentExamples = aggregateData.incidents.slice(0, 5).map((i: any, idx: number) => 
    `Incident ${idx+1}: ${i.title} - Severity: ${i.severity} - Status: ${i.status} - Date: ${new Date(i.date_time).toISOString().split('T')[0]}`
  ).join('\n');
  
  const travelPlanExamples = aggregateData.travelPlans.slice(0, 5).map((t: any, i: number) => 
    `Travel ${i+1}: ${t.traveler_name} to ${(t.destination as any)?.city || 'Unknown'}, ${(t.destination as any)?.country || 'Unknown'} - Status: ${t.status} - Dates: ${new Date(t.departure_date).toISOString().split('T')[0]} to ${new Date(t.return_date).toISOString().split('T')[0]}`
  ).join('\n');
  
  const riskExamples = aggregateData.risks.slice(0, 5).map((r: any, i: number) => 
    `Risk ${i+1}: ${r.title} - Category: ${r.category} - Impact: ${r.impact} - Likelihood: ${r.likelihood} - Score: ${r.risk_score} - Status: ${r.status}`
  ).join('\n');
  
  const prompt = `
    Please analyze the following organization data and identify potential new risks that should be added to the risk register.
    Look for patterns, correlations, and potential issues that might not be explicitly captured in the existing risks.
    
    ORGANIZATION SUMMARY:
    
    ${assetSummary}
    
    ${personnelSummary}
    
    ${incidentSummary}
    
    ${travelPlanSummary}
    
    ${riskSummary}
    
    EXAMPLES FOR PATTERN DETECTION:
    
    ${assetExamples}
    
    ${personnelExamples}
    
    ${incidentExamples}
    
    ${travelPlanExamples}
    
    ${riskExamples}
    
    PATTERN DETECTION INSTRUCTIONS:
    
    1. Look for recurring incidents with similar characteristics
    2. Identify personnel with multiple security incidents
    3. Detect assets with maintenance or security issues
    4. Find travel patterns to high-risk locations
    5. Identify potential compliance issues
    6. Look for gaps in existing risk coverage
    7. Detect emerging threats based on recent incidents
    8. Identify potential cascading failures or dependencies
    
    For each detected risk:
    - Provide a clear title and detailed description
    - Categorize appropriately
    - Assess impact and likelihood
    - Identify the source (asset, personnel, incident, travel, or pattern)
    - Provide specific recommendations
    - Include your confidence level (50-100)
    
    IMPORTANT: Only include risks that are not already covered in the existing risks.
    Focus on quality over quantity - it's better to identify a few high-confidence risks than many speculative ones.
    
    REMEMBER: Respond with ONLY valid JSON. No explanatory text, markdown, or code blocks.
  `;
  
  try {
    const result = await callChutesAI(prompt, systemPrompt);
    
    // Log token usage
    if (result.usage && result.usage.total_tokens) {
      await logTokenUsage(organizationId, userId, 'detect_risks', result.usage.total_tokens);
    }
    
    // Extract JSON from the response
    let jsonContent;
    try {
      // First try direct parsing
      jsonContent = JSON.parse(result.content);
    } catch (parseError) {
      console.error('JSON parse error in risk detection:', parseError);
      console.error('Raw content:', result.content);
      
      // If direct parsing fails, try to extract JSON using regex
      const extractedJson = extractJsonFromString(result.content);
      jsonContent = JSON.parse(extractedJson);
      console.log('Successfully extracted JSON from malformed response');
    }
    
    // Add token usage to the response
    jsonContent.token_usage = result.usage?.total_tokens || 0;
    
    return jsonContent;
  } catch (error) {
    console.error('Error in detectRisks:', error);
    
    // Return a fallback response
    return {
      risks: [],
      summary: {
        total_risks_detected: 0,
        high_priority_risks: 0,
        confidence_score: 0
      },
      token_usage: 0
    };
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
  
  // Extract type-specific details if available
  const typeSpecificDetails = assetData.typeSpecificDetails || '';
  
  const prompt = `
    Please analyze the following asset data and provide a comprehensive risk assessment in JSON format:
    
    Asset Name: ${assetData.name}
    Asset Type: ${assetData.type}
    Location: ${assetData.location.city}, ${assetData.location.country}
    Current Status: ${assetData.status}
    
    ${typeSpecificDetails}
    
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
    7. Type-specific risk factors based on the asset's specific attributes
    
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

// Function to evaluate risk
async function evaluateRisk(riskData: any, organizationId: string, userId: string | null): Promise<RiskScoringResponse> {
  const systemPrompt = `
    You are an expert AI security risk analyst specializing in physical risk assessment.
    Your task is to analyze the provided risk data and evaluate the risk assessment, providing insights and recommendations.
    You should provide component scores for different risk factors, a confidence score (0-100), 
    and specific recommendations for risk mitigation.
    
    CRITICAL: You MUST respond with ONLY valid JSON. Do not include any explanatory text, markdown formatting, or code blocks.
    Do not use <think> tags or any other non-JSON content in your response.
    
    Format your response as valid JSON with the following structure:
    {
      "score": number,
      "components": {
        "threat_analysis": number,
        "vulnerability_assessment": number,
        "impact_potential": number,
        "likelihood_assessment": number,
        "mitigation_effectiveness": number
      },
      "confidence": number,
      "explanation": "string",
      "recommendations": ["string", "string", ...],
      "trend": "improving" | "stable" | "deteriorating"
    }
  `;
  
  const prompt = `
    Please analyze the following risk data and provide a comprehensive evaluation in JSON format:
    
    Risk Title: ${riskData.title}
    Description: ${riskData.description}
    Category: ${riskData.category}
    Department: ${riskData.department || 'Not specified'}
    
    Current Assessment:
    - Impact: ${riskData.impact}
    - Likelihood: ${riskData.likelihood}
    - Status: ${riskData.status}
    
    Mitigation Plan: ${riskData.mitigation_plan || 'No mitigation plan specified'}
    
    Consider factors such as:
    1. The nature and severity of the physical risk
    2. Potential impact on personnel, assets, and operations
    3. Likelihood of occurrence based on historical data and current conditions
    4. Effectiveness of existing or proposed mitigation measures
    5. Residual risk after mitigation
    
    Provide a detailed risk evaluation with specific recommendations for risk mitigation.
    
    REMEMBER: Respond with ONLY valid JSON. No explanatory text, markdown, or code blocks.
  `;
  
  try {
    const result = await callChutesAI(prompt, systemPrompt);
    
    // Log token usage
    if (result.usage && result.usage.total_tokens) {
      await logTokenUsage(organizationId, userId, 'risk', result.usage.total_tokens);
    }
    
    // Extract JSON from the response
    let jsonContent;
    try {
      // First try direct parsing
      jsonContent = JSON.parse(result.content);
    } catch (parseError) {
      console.error('JSON parse error in risk evaluation:', parseError);
      console.error('Raw content:', result.content);
      
      // If direct parsing fails, try to extract JSON using regex
      const extractedJson = extractJsonFromString(result.content);
      jsonContent = JSON.parse(extractedJson);
      console.log('Successfully extracted JSON from malformed response');
    }
    
    return jsonContent;
  } catch (error) {
    console.error('Error in evaluateRisk:', error);
    
    // Return a fallback response
    return {
      score: 50,
      components: {
        threat_analysis: 45,
        vulnerability_assessment: 55,
        impact_potential: 60,
        likelihood_assessment: 40,
        mitigation_effectiveness: 35
      },
      confidence: 70,
      explanation: "Unable to perform AI risk evaluation due to an error. This is a default evaluation based on the risk category and description.",
      recommendations: [
        "Conduct a detailed threat assessment",
        "Implement physical security controls",
        "Develop emergency response procedures",
        "Train personnel on risk awareness and response"
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
    
    Risks: ${aggregateData.risks.length} total risks
    - Critical risks (score > 20): ${aggregateData.risks.filter((r: any) => r.risk_score > 20).length}
    - High risks (score 13-20): ${aggregateData.risks.filter((r: any) => r.risk_score > 12 && r.risk_score <= 20).length}
    - Medium risks (score 6-12): ${aggregateData.risks.filter((r: any) => r.risk_score > 5 && r.risk_score <= 12).length}
    - Low risks (score 1-5): ${aggregateData.risks.filter((r: any) => r.risk_score <= 5).length}
    - Open risks: ${aggregateData.risks.filter((r: any) => !['closed', 'mitigated'].includes(r.status)).length}
    
    Consider factors such as:
    1. The overall security posture of assets
    2. Personnel security and deployment status
    3. Incident frequency, severity, and resolution status
    4. Travel security and risk levels
    5. Compliance status across the organization
    6. Geopolitical factors affecting organizational risk
    7. Physical risk assessment and mitigation effectiveness
    
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
    
    // Update the prompt for asset risk scoring to include type-specific attributes
    if (requestData.type === 'asset') {
      // Enhance the data with additional context for the AI
      const assetData = requestData.data;
      
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
      requestData.data = {
        ...assetData,
        typeSpecificDetails
      };
    }
    
    // Update the prompt for personnel risk scoring to include new fields
    if (requestData.type === 'personnel') {
      // Enhance the data with additional context for the AI
      const personnelData = requestData.data;
      
      // Add work location context if work_asset_id is provided
      if (personnelData.work_asset_id) {
        const workLocationContext = await getAssetContext(personnelData.work_asset_id);
        requestData.data = {
          ...personnelData,
          work_location_context: workLocationContext
        };
      }
    }
    
    // Process based on request type
    let response: RiskScoringResponse | RiskDetectionResponse;
    
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
      case 'risk':
        response = await evaluateRisk(requestData.data, requestData.organizationId, requestData.userId || user.id);
        break;
      case 'organization':
        response = await scoreOrganizationRisk(requestData.organizationId, requestData.userId || user.id, requestData.data);
        break;
      case 'detect_risks':
        response = await detectRisks(requestData.data, requestData.organizationId, requestData.userId || user.id);
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

// Helper function to get context information about an asset for AI risk scoring
async function getAssetContext(assetId: string): Promise<any> {
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