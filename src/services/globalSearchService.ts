import { supabase } from '../lib/supabase';

export interface SearchResult {
  id: string;
  type: 'asset' | 'personnel' | 'incident' | 'risk' | 'travel';
  title: string;
  subtitle: string;
  description?: string;
  status?: string;
  severity?: string;
  location?: string;
  date?: string;
  score?: number;
  icon?: string;
}

export async function globalSearch(searchTerm: string, limit: number = 20): Promise<SearchResult[]> {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }

  try {
    const searchTermLower = searchTerm.toLowerCase();
    const results: SearchResult[] = [];

    // Search assets
    const { data: assets } = await supabase
      .from('assets')
      .select('id, name, type, status, location, ai_risk_score')
      .or(`name.ilike.%${searchTermLower}%, type::text.ilike.%${searchTermLower}%`)
      .limit(limit);

    if (assets) {
      assets.forEach(asset => {
        results.push({
          id: asset.id,
          type: 'asset',
          title: asset.name,
          subtitle: `${asset.type.replace('-', ' ')} • ${(asset.location as any)?.city || 'Unknown location'}`,
          status: asset.status,
          location: (asset.location as any)?.city ? `${(asset.location as any).city}, ${(asset.location as any).country}` : undefined,
          score: (asset.ai_risk_score as any)?.overall || 0
        });
      });
    }

    // Search personnel
    const { data: personnel } = await supabase
      .from('personnel_details')
      .select('id, name, employee_id, department, status, current_location, ai_risk_score')
      .or(`name.ilike.%${searchTermLower}%, employee_id.ilike.%${searchTermLower}%, department.ilike.%${searchTermLower}%`)
      .limit(limit);

    if (personnel) {
      personnel.forEach(person => {
        results.push({
          id: person.id,
          type: 'personnel',
          title: person.name,
          subtitle: `${person.employee_id} • ${person.department}`,
          status: person.status,
          location: (person.current_location as any)?.city ? `${(person.current_location as any).city}, ${(person.current_location as any).country}` : undefined,
          score: (person.ai_risk_score as any)?.overall || 0
        });
      });
    }

    // Search incidents
    const { data: incidents } = await supabase
      .from('incident_reports')
      .select('id, title, description, severity, status, location, date_time, department')
      .or(`title.ilike.%${searchTermLower}%, description.ilike.%${searchTermLower}%, location.ilike.%${searchTermLower}%, department.ilike.%${searchTermLower}%`)
      .limit(limit);

    if (incidents) {
      incidents.forEach(incident => {
        results.push({
          id: incident.id,
          type: 'incident',
          title: incident.title,
          subtitle: `${incident.severity} Incident • ${incident.department}`,
          description: incident.description.length > 100 ? incident.description.substring(0, 100) + '...' : incident.description,
          status: incident.status,
          severity: incident.severity,
          location: incident.location,
          date: new Date(incident.date_time).toLocaleDateString()
        });
      });
    }

    // Search risks
    const { data: risks } = await supabase
      .from('risks')
      .select('id, title, description, category, status, impact, likelihood, risk_score, department')
      .or(`title.ilike.%${searchTermLower}%, description.ilike.%${searchTermLower}%, department.ilike.%${searchTermLower}%`)
      .limit(limit);

    if (risks) {
      risks.forEach(risk => {
        results.push({
          id: risk.id,
          type: 'risk',
          title: risk.title,
          subtitle: `${risk.category.replace(/_/g, ' ')} • ${risk.department || 'No department'}`,
          description: risk.description.length > 100 ? risk.description.substring(0, 100) + '...' : risk.description,
          status: risk.status,
          severity: `${risk.impact}/${risk.likelihood}`,
          score: risk.risk_score
        });
      });
    }

    // Search travel plans
    const { data: travelPlans } = await supabase
      .from('travel_plans')
      .select('id, traveler_name, traveler_department, destination, departure_date, return_date, purpose, status, risk_assessment')
      .or(`traveler_name.ilike.%${searchTermLower}%, purpose.ilike.%${searchTermLower}%, traveler_department.ilike.%${searchTermLower}%`)
      .limit(limit);

    if (travelPlans) {
      travelPlans.forEach(plan => {
        results.push({
          id: plan.id,
          type: 'travel',
          title: `${plan.traveler_name} - ${(plan.destination as any)?.city || 'Unknown destination'}`,
          subtitle: `${plan.traveler_department} • ${plan.status}`,
          description: plan.purpose.length > 100 ? plan.purpose.substring(0, 100) + '...' : plan.purpose,
          status: plan.status,
          location: (plan.destination as any)?.city ? `${(plan.destination as any).city}, ${(plan.destination as any).country}` : undefined,
          date: `${new Date(plan.departure_date).toLocaleDateString()} - ${new Date(plan.return_date).toLocaleDateString()}`,
          score: (plan.risk_assessment as any)?.overall || 0
        });
      });
    }

    // Sort results by relevance (for now, just prioritize exact matches in title)
    return results.sort((a, b) => {
      const aExactMatch = a.title.toLowerCase().includes(searchTermLower);
      const bExactMatch = b.title.toLowerCase().includes(searchTermLower);
      
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;
      return 0;
    });
  } catch (error) {
    console.error('Error performing global search:', error);
    return [];
  }
}