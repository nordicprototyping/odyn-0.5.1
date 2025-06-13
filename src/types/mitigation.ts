export type MitigationCategory = 'asset' | 'personnel' | 'incident' | 'travel' | 'risk' | 'general';

export interface Mitigation {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  category: MitigationCategory;
  default_risk_reduction_score: number;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppliedMitigation {
  mitigation_id: string;
  name: string;
  description?: string;
  category: MitigationCategory;
  applied_risk_reduction_score: number;
  notes?: string;
  applied_at: string;
  applied_by?: string;
}

export interface MitigationFormData {
  name: string;
  description: string;
  category: MitigationCategory;
  default_risk_reduction_score: number;
}

export interface MitigationSelectorProps {
  category: MitigationCategory;
  selectedMitigations: AppliedMitigation[];
  onMitigationsChange: (mitigations: AppliedMitigation[]) => void;
  disabled?: boolean;
}

export interface MitigationDisplayProps {
  mitigations: AppliedMitigation[];
  showCategory?: boolean;
  compact?: boolean;
}

export interface AddMitigationFormProps {
  category: MitigationCategory;
  onClose: () => void;
  onSubmit: (mitigation: MitigationFormData) => Promise<void>;
}