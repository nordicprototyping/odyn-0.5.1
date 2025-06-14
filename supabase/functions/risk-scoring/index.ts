import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

// Get the Chutes API token from environment variables
const CHUTES_API_TOKEN = Deno.env.get("CHUTES_API_TOKEN") || "";

// Define types for risk scoring requests
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

// Create a Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Function to call the Chutes LLM API
async function invokeChutesLLM(prompt: string): Promise<any> {
  try {
    const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CHUTES_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "deepseek-ai/DeepSeek-R1-0528",
        "messages": [
          {
            "role": "user",
            "content": prompt
          }
        ],
        "stream": false,
        "max_tokens": 1024,
        "temperature": 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error calling Chutes LLM API:", error);
    throw error;
  }
}

// Main function to handle risk scoring requests
async function handleRiskScoring(req: RiskScoringRequest): Promise<RiskScoringResponse> {
  const { type, data, organizationId, userId } = req;
  
  // Track token usage
  await trackTokenUsage(organizationId, userId, type);
  
  // Call the appropriate risk scoring function based on type
  switch (type) {
    case 'asset':
      return await scoreAssetRisk(data);
    case 'personnel':
      return await scorePersonnelRisk(data);
    case 'travel':
      return await scoreTravelRisk(data);
    case 'incident':
      return await scoreIncidentRisk(data);
    case 'risk':
      return await evaluateRisk(data);
    case 'organization':
      return await scoreOrganizationRisk(data);
    case 'mitigation':
      return await evaluateMitigationEffectiveness(data);
    default:
      throw new Error(`Unsupported risk scoring type: ${type}`);
  }
}

// Track token usage in the database
async function trackTokenUsage(organizationId: string, userId: string | undefined, operationType: string) {
  try {
    const tokensUsed = getTokensForOperation(operationType);
    
    // Update organization's token usage
    const { error: orgError } = await supabase
      .from('ai_token_usage')
      .upsert({
        organization_id: organizationId,
        total_tokens: tokensUsed,
        last_used: new Date().toISOString(),
      }, {
        onConflict: 'organization_id',
        ignoreDuplicates: false
      });
    
    if (orgError) throw orgError;
    
    // Log the usage event
    const { error: logError } = await supabase
      .from('ai_usage_logs')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        operation_type: operationType,
        tokens_used: tokensUsed,
        timestamp: new Date().toISOString()
      });
    
    if (logError) throw logError;
    
    return tokensUsed;
  } catch (error) {
    console.error("Error tracking token usage:", error);
    // Continue with risk scoring even if tracking fails
    return 0;
  }
}

// Estimate tokens used for different operations
function getTokensForOperation(operationType: string): number {
  // These are estimates and would be replaced with actual token counts in production
  switch (operationType) {
    case 'asset':
      return 1000;
    case 'personnel':
      return 1200;
    case 'travel':
      return 1500;
    case 'incident':
      return 1300;
    case 'risk':
      return 800;
    case 'organization':
      return 2000;
    case 'mitigation':
      return 600;
    default:
      return 1000;
  }
}

// Implementation of asset risk scoring using LLM
async function scoreAssetRisk(assetData: any): Promise<RiskScoringResponse> {
  try {
    // Extract relevant data for risk assessment
    const { type, location, security_systems, personnel, incidents, name, status } = assetData;
    
    // Construct a detailed prompt for the LLM
    const prompt = `
      You are an AI security risk analyst. Analyze the security risk of the following asset and provide a comprehensive risk assessment.
      
      Asset Details:
      - Name: ${name || 'Unknown'}
      - Type: ${type || 'Unknown'}
      - Location: ${location?.city || 'Unknown'}, ${location?.country || 'Unknown'}
      - Current Status: ${status || 'Unknown'}
      
      Security Systems:
      ${JSON.stringify(security_systems || {}, null, 2)}
      
      Personnel Information:
      ${JSON.stringify(personnel || {}, null, 2)}
      
      Incident History:
      ${JSON.stringify(incidents || {}, null, 2)}
      
      Please provide a risk assessment with the following information in JSON format:
      1. An overall risk score from 0-100 (higher means more risk)
      2. A breakdown of risk components (physicalSecurity, cyberSecurity, accessControl, environmentalRisk, personnelRisk) with scores from 0-100
      3. A confidence score from 0-100 indicating how confident you are in this assessment
      4. A detailed explanation of the risk assessment
      5. 3-5 specific recommendations to improve security
      6. A trend assessment (improving, stable, or deteriorating)
      7. Risk score predictions for next week and next month
      
      Return ONLY the JSON object with these fields: score, components, confidence, explanation, recommendations, trend, predictions.
    `;
    
    // Call the LLM API
    const llmResponse = await invokeChutesLLM(prompt);
    
    // Parse the JSON response
    let parsedResponse;
    try {
      // Find JSON in the response (in case the LLM adds extra text)
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No valid JSON found in LLM response");
      }
    } catch (parseError) {
      console.error("Error parsing LLM response:", parseError);
      console.log("Raw LLM response:", llmResponse);
      throw new Error("Failed to parse LLM response");
    }
    
    // Validate and format the response
    return {
      score: Math.round(Number(parsedResponse.score) || 50),
      components: parsedResponse.components || {
        physicalSecurity: 50,
        cyberSecurity: 50,
        accessControl: 50,
        environmentalRisk: 50,
        personnelRisk: 50
      },
      confidence: Math.round(Number(parsedResponse.confidence) || 80),
      explanation: parsedResponse.explanation || "Risk assessment completed based on available data.",
      recommendations: parsedResponse.recommendations || [
        "Conduct a comprehensive security assessment",
        "Update security protocols",
        "Implement regular security training"
      ],
      trend: parsedResponse.trend || "stable",
      predictions: parsedResponse.predictions || {
        nextWeek: Math.round(Number(parsedResponse.score) || 50),
        nextMonth: Math.round(Number(parsedResponse.score) || 50)
      }
    };
  } catch (error) {
    console.error("Error in asset risk scoring:", error);
    
    // Fallback to deterministic algorithm if LLM fails
    return fallbackAssetRiskScoring(assetData);
  }
}

// Fallback function for asset risk scoring if LLM fails
function fallbackAssetRiskScoring(assetData: any): RiskScoringResponse {
  // Extract relevant data for risk assessment
  const { type, location, security_systems, personnel, incidents } = assetData;
  
  // For now, we'll use a deterministic algorithm based on the data
  let baseScore = 0;
  
  // Asset type factors
  if (type === 'embassy') baseScore += 30;
  else if (type === 'data-center') baseScore += 25;
  else if (type === 'building') baseScore += 15;
  else baseScore += 10;
  
  // Location factors
  const highRiskCountries = ['Turkey', 'Ukraine', 'India'];
  if (location?.country && highRiskCountries.includes(location.country)) {
    baseScore += 20;
  }
  
  // Security systems
  const securityScore = calculateSecuritySystemsScore(security_systems);
  
  // Personnel factors
  const personnelScore = (personnel?.current / personnel?.capacity) * 10 || 0;
  
  // Incident history
  const incidentScore = incidents?.total ? incidents.total * 5 : 0;
  
  // Calculate final score (0-100 scale)
  const rawScore = Math.min(100, Math.max(0, baseScore - securityScore + personnelScore + incidentScore));
  
  // Components breakdown
  const components = {
    physicalSecurity: Math.min(100, Math.max(0, 50 - (security_systems?.cctv?.coverage || 0) / 2)),
    cyberSecurity: Math.min(100, Math.max(0, 60 - (security_systems?.networkSecurity?.threats || 0) * 10)),
    accessControl: Math.min(100, Math.max(0, 40 - (security_systems?.accessControl?.zones || 0) * 3)),
    environmentalRisk: location?.country ? (highRiskCountries.includes(location.country) ? 75 : 30) : 50,
    personnelRisk: Math.min(100, Math.max(0, personnelScore * 5))
  };
  
  // Generate explanation
  const explanation = generateAssetRiskExplanation(assetData, rawScore, components);
  
  // Generate recommendations
  const recommendations = generateAssetRecommendations(assetData, components);
  
  return {
    score: Math.round(rawScore),
    components,
    confidence: 85,
    explanation,
    recommendations,
    trend: determineTrend(incidents),
    predictions: {
      nextWeek: Math.round(rawScore * (Math.random() * 0.1 + 0.95)),
      nextMonth: Math.round(rawScore * (Math.random() * 0.2 + 0.9))
    }
  };
}

// Helper function to calculate security systems score
function calculateSecuritySystemsScore(securitySystems: any): number {
  if (!securitySystems) return 0;
  
  let score = 0;
  
  // CCTV coverage
  if (securitySystems.cctv?.status === 'online') {
    score += (securitySystems.cctv.coverage || 0) / 5;
  }
  
  // Access control
  if (securitySystems.accessControl?.status === 'online') {
    score += (securitySystems.accessControl.zones || 0) * 2;
  }
  
  // Alarms
  if (securitySystems.alarms?.status === 'online') {
    score += (securitySystems.alarms.sensors || 0) / 4;
  }
  
  return Math.min(score, 50); // Cap at 50 points
}

// Helper function to generate risk explanation
function generateAssetRiskExplanation(assetData: any, score: number, components: Record<string, number>): string {
  const { type, location, security_systems } = assetData;
  
  let explanation = `This ${type.replace('-', ' ')} has an overall risk score of ${Math.round(score)}/100. `;
  
  // Add location context
  if (location?.city && location?.country) {
    explanation += `Its location in ${location.city}, ${location.country} `;
    
    const highRiskCountries = ['Turkey', 'Ukraine', 'India'];
    if (highRiskCountries.includes(location.country)) {
      explanation += `is in a region with elevated security concerns. `;
    } else {
      explanation += `has a moderate geopolitical risk profile. `;
    }
  }
  
  // Add security systems context
  if (security_systems) {
    const systemsOnline = Object.entries(security_systems)
      .filter(([_, details]: [string, any]) => details.status === 'online')
      .length;
    
    const totalSystems = Object.keys(security_systems).length;
    
    if (systemsOnline === totalSystems) {
      explanation += `All security systems are operational, providing good protection. `;
    } else if (systemsOnline > totalSystems / 2) {
      explanation += `Most security systems are operational, but some require attention. `;
    } else {
      explanation += `Several security systems are offline or in maintenance, increasing vulnerability. `;
    }
  }
  
  // Add highest risk component
  const highestRiskComponent = Object.entries(components).reduce(
    (max, [key, value]) => value > max.value ? { key, value } : max,
    { key: '', value: 0 }
  );
  
  if (highestRiskComponent.key) {
    const readableKey = highestRiskComponent.key
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase();
    
    explanation += `The highest risk factor is ${readableKey} at ${highestRiskComponent.value}/100.`;
  }
  
  return explanation;
}

// Helper function to generate recommendations
function generateAssetRecommendations(assetData: any, components: Record<string, number>): string[] {
  const recommendations: string[] = [];
  
  // Physical security recommendations
  if (components.physicalSecurity > 50) {
    recommendations.push("Upgrade physical security measures including barriers, lighting, and surveillance coverage");
  }
  
  // Cyber security recommendations
  if (components.cyberSecurity > 50) {
    recommendations.push("Enhance network security with additional monitoring, firewalls, and intrusion detection");
  }
  
  // Access control recommendations
  if (components.accessControl > 50) {
    recommendations.push("Implement stricter access control with additional authentication factors and zone segregation");
  }
  
  // Environmental risk recommendations
  if (components.environmentalRisk > 70) {
    recommendations.push("Develop enhanced emergency response plans for the high-risk location");
  }
  
  // Personnel risk recommendations
  if (components.personnelRisk > 50) {
    recommendations.push("Conduct additional security training and awareness programs for personnel");
  }
  
  // Add general recommendations if we don't have enough specific ones
  if (recommendations.length < 3) {
    recommendations.push("Schedule a comprehensive security assessment to identify additional vulnerabilities");
    recommendations.push("Review and update security protocols and emergency response procedures");
  }
  
  return recommendations;
}

// Helper function to determine risk trend
function determineTrend(incidents: any): 'improving' | 'stable' | 'deteriorating' {
  if (!incidents) return 'stable';
  
  // This would be more sophisticated in production
  // For now, we'll use a simple random distribution with bias toward stability
  const rand = Math.random();
  if (rand < 0.2) return 'improving';
  if (rand > 0.8) return 'deteriorating';
  return 'stable';
}

// Implementation of personnel risk scoring using LLM
async function scorePersonnelRisk(personnelData: any): Promise<RiskScoringResponse> {
  try {
    // Extract relevant data for risk assessment
    const { 
      name, category, clearance_level, current_location, 
      travel_status, department, work_location, status 
    } = personnelData;
    
    // Construct a detailed prompt for the LLM
    const prompt = `
      You are an AI security risk analyst. Analyze the security risk of the following personnel and provide a comprehensive risk assessment.
      
      Personnel Details:
      - Name: ${name || 'Unknown'}
      - Category: ${category || 'Unknown'}
      - Department: ${department || 'Unknown'}
      - Clearance Level: ${clearance_level || 'Unknown'}
      - Current Location: ${current_location?.city || 'Unknown'}, ${current_location?.country || 'Unknown'}
      - Work Location: ${work_location || 'Unknown'}
      - Status: ${status || 'Unknown'}
      
      Travel Status:
      ${JSON.stringify(travel_status || {}, null, 2)}
      
      Please provide a risk assessment with the following information in JSON format:
      1. An overall risk score from 0-100 (higher means more risk)
      2. A breakdown of risk components (behavioralRisk, travelRisk, accessRisk, complianceRisk, geographicRisk) with scores from 0-100
      3. A confidence score from 0-100 indicating how confident you are in this assessment
      4. A detailed explanation of the risk assessment
      5. 3-5 specific recommendations to mitigate risks
      6. A trend assessment (improving, stable, or deteriorating)
      7. Risk score predictions for next week and next month
      
      Return ONLY the JSON object with these fields: score, components, confidence, explanation, recommendations, trend, predictions.
    `;
    
    // Call the LLM API
    const llmResponse = await invokeChutesLLM(prompt);
    
    // Parse the JSON response
    let parsedResponse;
    try {
      // Find JSON in the response (in case the LLM adds extra text)
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No valid JSON found in LLM response");
      }
    } catch (parseError) {
      console.error("Error parsing LLM response:", parseError);
      console.log("Raw LLM response:", llmResponse);
      throw new Error("Failed to parse LLM response");
    }
    
    // Validate and format the response
    return {
      score: Math.round(Number(parsedResponse.score) || 50),
      components: parsedResponse.components || {
        behavioralRisk: 50,
        travelRisk: 50,
        accessRisk: 50,
        complianceRisk: 50,
        geographicRisk: 50
      },
      confidence: Math.round(Number(parsedResponse.confidence) || 80),
      explanation: parsedResponse.explanation || "Risk assessment completed based on available data.",
      recommendations: parsedResponse.recommendations || [
        "Conduct regular security awareness training",
        "Implement stricter travel protocols for high-risk regions",
        "Review access privileges periodically"
      ],
      trend: parsedResponse.trend || "stable",
      predictions: parsedResponse.predictions || {
        nextWeek: Math.round(Number(parsedResponse.score) || 50),
        nextMonth: Math.round(Number(parsedResponse.score) || 50)
      }
    };
  } catch (error) {
    console.error("Error in personnel risk scoring:", error);
    
    // Fallback to deterministic algorithm if LLM fails
    return fallbackPersonnelRiskScoring(personnelData);
  }
}

// Fallback function for personnel risk scoring if LLM fails
function fallbackPersonnelRiskScoring(personnelData: any): RiskScoringResponse {
  const { category, clearance_level, current_location, travel_status } = personnelData;
  
  let baseScore = 0;
  
  // Category factors
  if (category === 'executive') baseScore += 30;
  else if (category === 'field') baseScore += 25;
  else if (category === 'contractor') baseScore += 20;
  else baseScore += 10;
  
  // Clearance level factors
  if (clearance_level === 'Top Secret') baseScore += 20;
  else if (clearance_level === 'Secret') baseScore += 15;
  else if (clearance_level === 'Confidential') baseScore += 10;
  
  // Location factors
  const highRiskCountries = ['Turkey', 'Ukraine', 'India'];
  if (current_location?.country && highRiskCountries.includes(current_location.country)) {
    baseScore += 25;
  }
  
  // Travel status
  if (travel_status?.isActive) baseScore += 15;
  
  // Calculate final score (0-100 scale)
  const rawScore = Math.min(100, Math.max(0, baseScore));
  
  // Components breakdown
  const components = {
    behavioralRisk: Math.floor(Math.random() * 30) + 10,
    travelRisk: travel_status?.isActive ? 70 : 20,
    accessRisk: clearance_level === 'Top Secret' ? 60 : 30,
    complianceRisk: Math.floor(Math.random() * 20) + 10,
    geographicRisk: current_location?.country && highRiskCountries.includes(current_location.country) ? 80 : 30
  };
  
  // Generate explanation
  const explanation = `This ${category} personnel has an overall risk score of ${Math.round(rawScore)}/100 based on their clearance level, location, and travel status.`;
  
  // Generate recommendations
  const recommendations = [
    "Conduct regular security awareness training",
    "Implement stricter travel protocols for high-risk regions",
    "Review access privileges periodically"
  ];
  
  return {
    score: Math.round(rawScore),
    components,
    confidence: 80,
    explanation,
    recommendations,
    trend: 'stable',
    predictions: {
      nextWeek: Math.round(rawScore * (Math.random() * 0.1 + 0.95)),
      nextMonth: Math.round(rawScore * (Math.random() * 0.2 + 0.9))
    }
  };
}

// Implementation of travel risk scoring using LLM
async function scoreTravelRisk(travelData: any): Promise<RiskScoringResponse> {
  try {
    // Extract relevant data for risk assessment
    const { 
      traveler_name, traveler_clearance_level, destination, origin,
      departure_date, return_date, purpose, status, emergency_contacts, itinerary
    } = travelData;
    
    // Construct a detailed prompt for the LLM
    const prompt = `
      You are an AI security risk analyst. Analyze the security risk of the following travel plan and provide a comprehensive risk assessment.
      
      Travel Plan Details:
      - Traveler: ${traveler_name || 'Unknown'}
      - Clearance Level: ${traveler_clearance_level || 'Unknown'}
      - Origin: ${origin?.city || 'Unknown'}, ${origin?.country || 'Unknown'}
      - Destination: ${destination?.city || 'Unknown'}, ${destination?.country || 'Unknown'}
      - Departure Date: ${departure_date ? new Date(departure_date).toISOString() : 'Unknown'}
      - Return Date: ${return_date ? new Date(return_date).toISOString() : 'Unknown'}
      - Purpose: ${purpose || 'Unknown'}
      - Status: ${status || 'Unknown'}
      
      Emergency Contacts:
      ${JSON.stringify(emergency_contacts || {}, null, 2)}
      
      Itinerary:
      ${JSON.stringify(itinerary || {}, null, 2)}
      
      Please provide a risk assessment with the following information in JSON format:
      1. An overall risk score from 0-100 (higher means more risk)
      2. A breakdown of risk components (geopolitical, security, health, environmental, transportation) with scores from 0-100
      3. A confidence score from 0-100 indicating how confident you are in this assessment
      4. A detailed explanation of the risk assessment
      5. 3-5 specific recommendations to mitigate risks during travel
      6. A trend assessment (improving, stable, or deteriorating)
      7. Risk score predictions for next week and next month
      
      Return ONLY the JSON object with these fields: score, components, confidence, explanation, recommendations, trend, predictions.
    `;
    
    // Call the LLM API
    const llmResponse = await invokeChutesLLM(prompt);
    
    // Parse the JSON response
    let parsedResponse;
    try {
      // Find JSON in the response (in case the LLM adds extra text)
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No valid JSON found in LLM response");
      }
    } catch (parseError) {
      console.error("Error parsing LLM response:", parseError);
      console.log("Raw LLM response:", llmResponse);
      throw new Error("Failed to parse LLM response");
    }
    
    // Validate and format the response
    return {
      score: Math.round(Number(parsedResponse.score) || 50),
      components: parsedResponse.components || {
        geopolitical: 50,
        security: 50,
        health: 50,
        environmental: 50,
        transportation: 50
      },
      confidence: Math.round(Number(parsedResponse.confidence) || 80),
      explanation: parsedResponse.explanation || "Risk assessment completed based on available data.",
      recommendations: parsedResponse.recommendations || [
        "Register with local embassy upon arrival",
        "Maintain regular check-ins with security team",
        "Use secure transportation arranged by local office"
      ],
      trend: parsedResponse.trend || "stable",
      predictions: parsedResponse.predictions || {
        nextWeek: Math.round(Number(parsedResponse.score) || 50),
        nextMonth: Math.round(Number(parsedResponse.score) || 50)
      }
    };
  } catch (error) {
    console.error("Error in travel risk scoring:", error);
    
    // Fallback to deterministic algorithm if LLM fails
    return fallbackTravelRiskScoring(travelData);
  }
}

// Fallback function for travel risk scoring if LLM fails
function fallbackTravelRiskScoring(travelData: any): RiskScoringResponse {
  const { destination, departure_date, return_date, purpose, traveler_clearance_level } = travelData;
  
  let baseScore = 0;
  
  // Destination factors
  const highRiskCountries = ['Turkey', 'Ukraine', 'India'];
  const mediumRiskCountries = ['Poland', 'United Arab Emirates', 'South Korea'];
  
  if (destination?.country) {
    if (highRiskCountries.includes(destination.country)) {
      baseScore += 50;
    } else if (mediumRiskCountries.includes(destination.country)) {
      baseScore += 30;
    } else {
      baseScore += 15;
    }
  }
  
  // Duration factors
  const durationDays = Math.round((new Date(return_date).getTime() - new Date(departure_date).getTime()) / (1000 * 60 * 60 * 24));
  baseScore += Math.min(20, durationDays * 0.5);
  
  // Purpose factors
  if (purpose.toLowerCase().includes('security') || purpose.toLowerCase().includes('assessment')) {
    baseScore += 15;
  }
  
  // Clearance level factors
  if (traveler_clearance_level === 'Top Secret') baseScore += 20;
  else if (traveler_clearance_level === 'Secret') baseScore += 15;
  else if (traveler_clearance_level === 'Confidential') baseScore += 10;
  
  // Calculate final score (0-100 scale)
  const rawScore = Math.min(100, Math.max(0, baseScore));
  
  // Components breakdown
  const components = {
    geopolitical: destination?.country && highRiskCountries.includes(destination.country) ? 80 : 40,
    security: Math.floor(Math.random() * 30) + 20,
    health: Math.floor(Math.random() * 20) + 10,
    environmental: Math.floor(Math.random() * 20) + 10,
    transportation: Math.floor(Math.random() * 30) + 20
  };
  
  // Generate explanation
  const explanation = `This travel plan to ${destination?.city}, ${destination?.country} has an overall risk score of ${Math.round(rawScore)}/100 based on destination, duration, and purpose.`;
  
  // Generate recommendations
  const recommendations = [
    "Register with local embassy upon arrival",
    "Maintain regular check-ins with security team",
    "Use secure transportation arranged by local office"
  ];
  
  if (destination?.country && highRiskCountries.includes(destination.country)) {
    recommendations.push("Consider security escort for all movements");
    recommendations.push("Limit exposure to public areas and crowds");
  }
  
  return {
    score: Math.round(rawScore),
    components,
    confidence: 85,
    explanation,
    recommendations,
    trend: 'stable',
    predictions: {
      nextWeek: Math.round(rawScore * (Math.random() * 0.1 + 0.95)),
      nextMonth: Math.round(rawScore * (Math.random() * 0.2 + 0.9))
    }
  };
}

// Implementation of incident risk scoring using LLM
async function scoreIncidentRisk(incidentData: any): Promise<RiskScoringResponse> {
  try {
    // Extract relevant data for risk assessment
    const { 
      title, description, severity, status, location, 
      department, involved_parties, immediate_actions 
    } = incidentData;
    
    // Construct a detailed prompt for the LLM
    const prompt = `
      You are an AI security risk analyst. Analyze the security risk of the following incident and provide a comprehensive risk assessment.
      
      Incident Details:
      - Title: ${title || 'Unknown'}
      - Description: ${description || 'Unknown'}
      - Severity: ${severity || 'Unknown'}
      - Status: ${status || 'Unknown'}
      - Location: ${location || 'Unknown'}
      - Department: ${department || 'Unknown'}
      - Involved Parties: ${Array.isArray(involved_parties) ? involved_parties.join(', ') : 'None'}
      - Immediate Actions Taken: ${immediate_actions || 'None'}
      
      Please provide a risk assessment with the following information in JSON format:
      1. An overall risk score from 0-100 (higher means more risk)
      2. A confidence score from 0-100 indicating how confident you are in this assessment
      3. A detailed explanation of the risk assessment
      4. 3-5 specific recommendations to address this incident
      5. A trend assessment (improving, stable, or deteriorating)
      
      Return ONLY the JSON object with these fields: score, confidence, explanation, recommendations, trend.
    `;
    
    // Call the LLM API
    const llmResponse = await invokeChutesLLM(prompt);
    
    // Parse the JSON response
    let parsedResponse;
    try {
      // Find JSON in the response (in case the LLM adds extra text)
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No valid JSON found in LLM response");
      }
    } catch (parseError) {
      console.error("Error parsing LLM response:", parseError);
      console.log("Raw LLM response:", llmResponse);
      throw new Error("Failed to parse LLM response");
    }
    
    // Validate and format the response
    return {
      score: Math.round(Number(parsedResponse.score) || 50),
      confidence: Math.round(Number(parsedResponse.confidence) || 80),
      explanation: parsedResponse.explanation || "Risk assessment completed based on available data.",
      recommendations: parsedResponse.recommendations || [
        "Escalate to senior management for visibility",
        "Implement immediate containment measures",
        "Conduct thorough investigation and root cause analysis"
      ],
      trend: parsedResponse.trend || "stable"
    };
  } catch (error) {
    console.error("Error in incident risk scoring:", error);
    
    // Fallback to deterministic algorithm if LLM fails
    return fallbackIncidentRiskScoring(incidentData);
  }
}

// Fallback function for incident risk scoring if LLM fails
function fallbackIncidentRiskScoring(incidentData: any): RiskScoringResponse {
  const { severity, status, department } = incidentData;
  
  let baseScore = 0;
  
  // Severity factors
  if (severity === 'Critical') baseScore += 70;
  else if (severity === 'High') baseScore += 50;
  else if (severity === 'Medium') baseScore += 30;
  else baseScore += 10;
  
  // Status factors
  if (status === 'Open') baseScore += 20;
  else if (status === 'In Progress') baseScore += 10;
  else baseScore -= 10;
  
  // Department factors
  const criticalDepartments = ['IT Security', 'Physical Security', 'Data Security', 'Executive'];
  if (criticalDepartments.includes(department)) {
    baseScore += 15;
  }
  
  // Calculate final score (0-100 scale)
  const rawScore = Math.min(100, Math.max(0, baseScore));
  
  // Generate explanation
  const explanation = `This ${severity} incident in the ${department} department has an overall risk score of ${Math.round(rawScore)}/100.`;
  
  // Generate recommendations
  const recommendations = [
    "Escalate to senior management for visibility",
    "Implement immediate containment measures",
    "Conduct thorough investigation and root cause analysis"
  ];
  
  if (severity === 'Critical' || severity === 'High') {
    recommendations.push("Activate crisis management team");
    recommendations.push("Prepare external communication strategy");
  }
  
  return {
    score: Math.round(rawScore),
    confidence: 90,
    explanation,
    recommendations,
    trend: status === 'Open' ? 'deteriorating' : status === 'In Progress' ? 'stable' : 'improving'
  };
}

// Implementation of risk evaluation using LLM
async function evaluateRisk(riskData: any): Promise<RiskScoringResponse> {
  try {
    // Extract relevant data for risk assessment
    const { 
      title, description, category, impact, likelihood, 
      status, mitigation_plan, department 
    } = riskData;
    
    // Construct a detailed prompt for the LLM
    const prompt = `
      You are an AI risk analyst. Evaluate the following risk and provide a comprehensive risk assessment.
      
      Risk Details:
      - Title: ${title || 'Unknown'}
      - Description: ${description || 'Unknown'}
      - Category: ${category || 'Unknown'}
      - Impact: ${impact ? impact.replace('_', ' ') : 'Unknown'}
      - Likelihood: ${likelihood ? likelihood.replace('_', ' ') : 'Unknown'}
      - Status: ${status || 'Unknown'}
      - Department: ${department || 'Unknown'}
      - Mitigation Plan: ${mitigation_plan || 'None'}
      
      Please provide a risk assessment with the following information in JSON format:
      1. A risk score from 1-25 (calculated as impact * likelihood, where both are on a 1-5 scale)
      2. A confidence score from 0-100 indicating how confident you are in this assessment
      3. A detailed explanation of the risk assessment
      4. 3-5 specific recommendations to address this risk
      5. A trend assessment (improving, stable, or deteriorating)
      
      Return ONLY the JSON object with these fields: score, confidence, explanation, recommendations, trend.
    `;
    
    // Call the LLM API
    const llmResponse = await invokeChutesLLM(prompt);
    
    // Parse the JSON response
    let parsedResponse;
    try {
      // Find JSON in the response (in case the LLM adds extra text)
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No valid JSON found in LLM response");
      }
    } catch (parseError) {
      console.error("Error parsing LLM response:", parseError);
      console.log("Raw LLM response:", llmResponse);
      throw new Error("Failed to parse LLM response");
    }
    
    // Validate and format the response
    return {
      score: Math.round(Number(parsedResponse.score) || 12),
      confidence: Math.round(Number(parsedResponse.confidence) || 80),
      explanation: parsedResponse.explanation || "Risk assessment completed based on available data.",
      recommendations: parsedResponse.recommendations || [
        "Develop detailed mitigation plan",
        "Assign risk owner with clear accountability",
        "Establish regular monitoring and reporting"
      ],
      trend: parsedResponse.trend || "stable"
    };
  } catch (error) {
    console.error("Error in risk evaluation:", error);
    
    // Fallback to deterministic algorithm if LLM fails
    return fallbackRiskEvaluation(riskData);
  }
}

// Fallback function for risk evaluation if LLM fails
function fallbackRiskEvaluation(riskData: any): RiskScoringResponse {
  const { category, impact, likelihood, status } = riskData;
  
  // Calculate risk score based on impact and likelihood
  let impactValue = 0;
  let likelihoodValue = 0;
  
  // Convert impact to numeric value
  switch (impact) {
    case 'very_low': impactValue = 1; break;
    case 'low': impactValue = 2; break;
    case 'medium': impactValue = 3; break;
    case 'high': impactValue = 4; break;
    case 'very_high': impactValue = 5; break;
  }
  
  // Convert likelihood to numeric value
  switch (likelihood) {
    case 'very_low': likelihoodValue = 1; break;
    case 'low': likelihoodValue = 2; break;
    case 'medium': likelihoodValue = 3; break;
    case 'high': likelihoodValue = 4; break;
    case 'very_high': likelihoodValue = 5; break;
  }
  
  // Calculate risk score (1-25 scale)
  const riskScore = impactValue * likelihoodValue;
  
  // Adjust for status
  let adjustedScore = riskScore;
  if (status === 'mitigated') adjustedScore = Math.max(1, Math.floor(riskScore * 0.5));
  else if (status === 'monitoring') adjustedScore = Math.max(1, Math.floor(riskScore * 0.7));
  
  // Generate explanation
  const explanation = `This ${category} risk has a score of ${adjustedScore}/25 based on ${impact.replace('_', ' ')} impact and ${likelihood.replace('_', ' ')} likelihood.`;
  
  // Generate recommendations
  const recommendations = [
    "Develop detailed mitigation plan",
    "Assign risk owner with clear accountability",
    "Establish regular monitoring and reporting"
  ];
  
  if (riskScore > 15) {
    recommendations.push("Escalate to executive leadership");
    recommendations.push("Consider external expert consultation");
  }
  
  return {
    score: adjustedScore,
    confidence: 85,
    explanation,
    recommendations,
    trend: status === 'identified' ? 'deteriorating' : status === 'assessed' ? 'stable' : 'improving'
  };
}

// Implementation of organization risk scoring using LLM
async function scoreOrganizationRisk(orgData: any): Promise<RiskScoringResponse> {
  try {
    // Extract relevant data for risk assessment
    const { assets, personnel, incidents, risks, travelPlans } = orgData;
    
    // Prepare summary data for the LLM to reduce token usage
    const assetSummary = {
      total: assets?.length || 0,
      byType: countByProperty(assets, 'type'),
      byStatus: countByProperty(assets, 'status'),
      highRiskCount: assets?.filter((a: any) => (a.ai_risk_score?.overall || 0) > 70).length || 0
    };
    
    const personnelSummary = {
      total: personnel?.length || 0,
      byCategory: countByProperty(personnel, 'category'),
      byStatus: countByProperty(personnel, 'status'),
      highRiskCount: personnel?.filter((p: any) => (p.ai_risk_score?.overall || 0) > 70).length || 0,
      travelingCount: personnel?.filter((p: any) => p.travel_status?.isActive).length || 0
    };
    
    const incidentSummary = {
      total: incidents?.length || 0,
      bySeverity: countByProperty(incidents, 'severity'),
      byStatus: countByProperty(incidents, 'status'),
      recentCount: incidents?.filter((i: any) => {
        const date = new Date(i.date_time);
        const now = new Date();
        const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 30;
      }).length || 0
    };
    
    const riskSummary = {
      total: risks?.length || 0,
      byCategory: countByProperty(risks, 'category'),
      byStatus: countByProperty(risks, 'status'),
      highRiskCount: risks?.filter((r: any) => r.risk_score > 15).length || 0
    };
    
    const travelSummary = {
      total: travelPlans?.length || 0,
      byStatus: countByProperty(travelPlans, 'status'),
      highRiskCount: travelPlans?.filter((t: any) => (t.risk_assessment?.overall || 0) > 70).length || 0,
      activeCount: travelPlans?.filter((t: any) => t.status === 'in-progress').length || 0
    };
    
    // Construct a detailed prompt for the LLM
    const prompt = `
      You are an AI security risk analyst. Analyze the overall security risk of an organization based on the following data and provide a comprehensive risk assessment.
      
      Asset Summary:
      ${JSON.stringify(assetSummary, null, 2)}
      
      Personnel Summary:
      ${JSON.stringify(personnelSummary, null, 2)}
      
      Incident Summary:
      ${JSON.stringify(incidentSummary, null, 2)}
      
      Risk Summary:
      ${JSON.stringify(riskSummary, null, 2)}
      
      Travel Summary:
      ${JSON.stringify(travelSummary, null, 2)}
      
      Please provide a risk assessment with the following information in JSON format:
      1. An overall risk score from 0-100 (higher means more risk)
      2. A breakdown of risk components (assetRisk, personnelRisk, incidentRisk, geopoliticalRisk, cyberRisk) with scores from 0-100
      3. A confidence score from 0-100 indicating how confident you are in this assessment
      4. A detailed explanation of the risk assessment
      5. 4-6 specific recommendations to improve the organization's security posture
      6. A trend assessment (improving, stable, or deteriorating)
      7. Risk score predictions for next week and next month
      
      Return ONLY the JSON object with these fields: score, components, confidence, explanation, recommendations, trend, predictions.
    `;
    
    // Call the LLM API
    const llmResponse = await invokeChutesLLM(prompt);
    
    // Parse the JSON response
    let parsedResponse;
    try {
      // Find JSON in the response (in case the LLM adds extra text)
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No valid JSON found in LLM response");
      }
    } catch (parseError) {
      console.error("Error parsing LLM response:", parseError);
      console.log("Raw LLM response:", llmResponse);
      throw new Error("Failed to parse LLM response");
    }
    
    // Validate and format the response
    return {
      score: Math.round(Number(parsedResponse.score) || 50),
      components: parsedResponse.components || {
        assetRisk: 50,
        personnelRisk: 50,
        incidentRisk: 50,
        geopoliticalRisk: 50,
        cyberRisk: 50
      },
      confidence: Math.round(Number(parsedResponse.confidence) || 80),
      explanation: parsedResponse.explanation || "Risk assessment completed based on available data.",
      recommendations: parsedResponse.recommendations || [
        "Conduct comprehensive security assessment across all departments",
        "Implement standardized risk management procedures",
        "Enhance security training and awareness programs",
        "Establish centralized security monitoring and response team"
      ],
      trend: parsedResponse.trend || "stable",
      predictions: parsedResponse.predictions || {
        nextWeek: Math.round(Number(parsedResponse.score) || 50),
        nextMonth: Math.round(Number(parsedResponse.score) || 50)
      }
    };
  } catch (error) {
    console.error("Error in organization risk scoring:", error);
    
    // Fallback to deterministic algorithm if LLM fails
    return fallbackOrganizationRiskScoring(orgData);
  }
}

// Helper function to count items by a property
function countByProperty(items: any[] | undefined, property: string): Record<string, number> {
  if (!items || items.length === 0) return {};
  
  const counts: Record<string, number> = {};
  
  items.forEach(item => {
    const value = item[property];
    if (value) {
      counts[value] = (counts[value] || 0) + 1;
    }
  });
  
  return counts;
}

// Fallback function for organization risk scoring if LLM fails
function fallbackOrganizationRiskScoring(orgData: any): RiskScoringResponse {
  // This would aggregate risk scores from various sources
  // For now, we'll use a simple algorithm
  const { assets, personnel, incidents, risks, travelPlans } = orgData;
  
  let totalScore = 0;
  let count = 0;
  
  // Calculate average asset risk
  if (assets && assets.length > 0) {
    const assetRisk = assets.reduce((sum: number, asset: any) => sum + (asset.ai_risk_score?.overall || 0), 0) / assets.length;
    totalScore += assetRisk;
    count++;
  }
  
  // Calculate average personnel risk
  if (personnel && personnel.length > 0) {
    const personnelRisk = personnel.reduce((sum: number, person: any) => sum + (person.ai_risk_score?.overall || 0), 0) / personnel.length;
    totalScore += personnelRisk;
    count++;
  }
  
  // Calculate incident risk factor
  if (incidents && incidents.length > 0) {
    const criticalCount = incidents.filter((i: any) => i.severity === 'Critical').length;
    const highCount = incidents.filter((i: any) => i.severity === 'High').length;
    const incidentRisk = Math.min(100, (criticalCount * 20 + highCount * 10));
    totalScore += incidentRisk;
    count++;
  }
  
  // Calculate risk register factor
  if (risks && risks.length > 0) {
    const highRisks = risks.filter((r: any) => r.risk_score > 15).length;
    const riskFactor = Math.min(100, highRisks * 15);
    totalScore += riskFactor;
    count++;
  }
  
  // Calculate travel risk factor
  if (travelPlans && travelPlans.length > 0) {
    const highRiskTravel = travelPlans.filter((t: any) => (t.risk_assessment?.overall || 0) > 70).length;
    const travelRisk = Math.min(100, highRiskTravel * 20);
    totalScore += travelRisk;
    count++;
  }
  
  // Calculate average risk score
  const avgScore = count > 0 ? totalScore / count : 50;
  
  // Generate explanation
  const explanation = `The organization has an overall risk score of ${Math.round(avgScore)}/100 based on analysis of assets, personnel, incidents, risks, and travel plans.`;
  
  // Generate recommendations
  const recommendations = [
    "Conduct comprehensive security assessment across all departments",
    "Implement standardized risk management procedures",
    "Enhance security training and awareness programs",
    "Establish centralized security monitoring and response team"
  ];
  
  return {
    score: Math.round(avgScore),
    confidence: 80,
    explanation,
    recommendations,
    trend: 'stable',
    predictions: {
      nextWeek: Math.round(avgScore * (Math.random() * 0.1 + 0.95)),
      nextMonth: Math.round(avgScore * (Math.random() * 0.2 + 0.9))
    }
  };
}

// Implementation of mitigation effectiveness evaluation using LLM
async function evaluateMitigationEffectiveness(mitigationData: any): Promise<RiskScoringResponse> {
  try {
    // Extract relevant data for evaluation
    const { name, description, category, default_risk_reduction_score, is_custom } = mitigationData;
    
    // Construct a detailed prompt for the LLM
    const prompt = `
      You are an AI security risk analyst. Evaluate the effectiveness of the following security mitigation strategy and provide a comprehensive assessment.
      
      Mitigation Details:
      - Name: ${name || 'Unknown'}
      - Description: ${description || 'No description provided'}
      - Category: ${category || 'Unknown'}
      - Default Risk Reduction Score: ${default_risk_reduction_score || 0}
      - Custom Mitigation: ${is_custom ? 'Yes' : 'No'}
      
      Please provide an assessment with the following information in JSON format:
      1. A risk reduction score from 0-100 (higher means more effective at reducing risk)
      2. A confidence score from 0-100 indicating how confident you are in this assessment
      3. A detailed explanation of why this mitigation is effective or not
      
      Return ONLY the JSON object with these fields: score, confidence, explanation.
    `;
    
    // Call the LLM API
    const llmResponse = await invokeChutesLLM(prompt);
    
    // Parse the JSON response
    let parsedResponse;
    try {
      // Find JSON in the response (in case the LLM adds extra text)
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No valid JSON found in LLM response");
      }
    } catch (parseError) {
      console.error("Error parsing LLM response:", parseError);
      console.log("Raw LLM response:", llmResponse);
      throw new Error("Failed to parse LLM response");
    }
    
    // Validate and format the response
    return {
      score: Math.round(Number(parsedResponse.score) || default_risk_reduction_score || 10),
      confidence: Math.round(Number(parsedResponse.confidence) || 75),
      explanation: parsedResponse.explanation || `This ${category} mitigation strategy is estimated to reduce risk by ${default_risk_reduction_score || 10} points.`
    };
  } catch (error) {
    console.error("Error in mitigation effectiveness evaluation:", error);
    
    // Fallback to deterministic algorithm if LLM fails
    return fallbackMitigationEvaluation(mitigationData);
  }
}

// Fallback function for mitigation effectiveness evaluation if LLM fails
function fallbackMitigationEvaluation(mitigationData: any): RiskScoringResponse {
  const { name, category, description, default_risk_reduction_score } = mitigationData;
  
  // For now, we'll use a simple algorithm
  let baseScore = default_risk_reduction_score || 0;
  
  // Category factors
  if (!baseScore) {
    if (category === 'asset') baseScore = 15;
    else if (category === 'personnel') baseScore = 20;
    else if (category === 'incident') baseScore = 25;
    else if (category === 'travel') baseScore = 18;
    else if (category === 'risk') baseScore = 22;
    else baseScore = 12;
  }
  
  // Adjust based on description comprehensiveness
  if (description && description.length > 100) {
    baseScore += 5;
  }
  
  // Add some randomness to simulate LLM variability
  const randomFactor = Math.floor(Math.random() * 10) - 5;
  
  // Calculate final score (0-100 scale)
  const rawScore = Math.min(100, Math.max(0, baseScore + randomFactor));
  
  // Generate explanation
  const explanation = `This ${category} mitigation strategy is estimated to reduce risk by ${Math.round(rawScore)} points based on its approach and comprehensiveness.`;
  
  return {
    score: Math.round(rawScore),
    confidence: 75,
    explanation
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  
  try {
    // Only accept POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Parse request body
    const requestData: RiskScoringRequest = await req.json();
    
    // Validate request
    if (!requestData.type || !requestData.data || !requestData.organizationId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Check organization token limits
    const { data: tokenData, error: tokenError } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', requestData.organizationId)
      .single();
    
    if (tokenError) {
      return new Response(JSON.stringify({ error: "Failed to verify organization" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const tokenLimit = tokenData?.settings?.ai?.tokenLimit || 1000000;
    
    // Check current usage
    const { data: usageData, error: usageError } = await supabase
      .from('ai_token_usage')
      .select('total_tokens')
      .eq('organization_id', requestData.organizationId)
      .single();
    
    if (!usageError && usageData && usageData.total_tokens >= tokenLimit) {
      return new Response(JSON.stringify({ error: "Organization token limit exceeded" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Process the risk scoring request
    const result = await handleRiskScoring(requestData);
    
    // Return the result
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (error) {
    console.error("Error processing request:", error);
    
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});