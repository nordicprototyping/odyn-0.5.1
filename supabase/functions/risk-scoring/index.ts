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