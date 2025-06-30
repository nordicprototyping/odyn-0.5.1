import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { organizationId, aggregateData } = await req.json()

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'Organization ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Helper function to log token usage
    async function logTokenUsage(organizationId: string, userId: string | null, operationType: string, tokensUsed: number) {
      try {
        // First, get the current token usage
        const { data: currentUsage, error: fetchError } = await supabase
          .from('ai_token_usage')
          .select('total_tokens')
          .eq('organization_id', organizationId)
          .maybeSingle();
        
        // Calculate the new total
        const currentTotal = currentUsage?.total_tokens || 0;
        const newTotal = currentTotal + tokensUsed;
        
        // Update total token usage
        const { error: updateError } = await supabase
          .from('ai_token_usage')
          .upsert({
            organization_id: organizationId,
            total_tokens: newTotal,
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

    // Simulate AI risk detection (replace with actual AI service call)
    const mockDetectedRisks = [
      {
        title: "Outdated Security Systems",
        description: "Several assets have security systems that haven't been updated in over 12 months, creating potential vulnerabilities.",
        category: "physical_security_vulnerabilities",
        impact: "medium",
        likelihood: "high",
        confidence: 85,
        source_type: "asset",
        source_id: aggregateData.assets?.[0]?.id || null,
        department: "Security",
        recommendations: [
          "Schedule immediate security system updates",
          "Implement regular maintenance schedules",
          "Conduct security audits quarterly"
        ],
        explanation: "Analysis of asset data shows multiple security systems with outdated firmware and configurations."
      },
      {
        title: "High-Risk Travel Destinations",
        description: "Multiple travel plans to regions with elevated security threats without adequate risk mitigation measures.",
        category: "personnel_safety_security",
        impact: "high",
        likelihood: "medium",
        confidence: 92,
        source_type: "travel",
        source_id: aggregateData.travelPlans?.[0]?.id || null,
        department: "Operations",
        recommendations: [
          "Enhance pre-travel security briefings",
          "Implement real-time location tracking",
          "Establish emergency communication protocols"
        ],
        explanation: "Travel pattern analysis indicates insufficient risk assessment for high-threat destinations."
      }
    ];

    // Calculate summary statistics
    const summary = {
      total_risks_detected: mockDetectedRisks.length,
      high_priority_risks: mockDetectedRisks.filter(r => r.impact === 'high' || r.impact === 'very_high').length,
      confidence_score: Math.round(mockDetectedRisks.reduce((sum, r) => sum + r.confidence, 0) / mockDetectedRisks.length)
    };

    // Log token usage (simulated - 500 tokens for this operation)
    await logTokenUsage(organizationId, null, 'risk_detection', 500);

    return new Response(
      JSON.stringify({
        risks: mockDetectedRisks,
        summary: summary
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in risk-scoring function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})