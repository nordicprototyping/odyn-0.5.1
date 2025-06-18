import { ComponentType } from 'react';
import OrganizationRiskWidget from './OrganizationRiskWidget';
import ThreatLevelWidget from './ThreatLevelWidget';
import GlobalThreatMapWidget from './GlobalThreatMapWidget';
import HighRiskAssetsWidget from './HighRiskAssetsWidget';
import HighRiskPersonnelWidget from './HighRiskPersonnelWidget';
import HighRiskTravelWidget from './HighRiskTravelWidget';
import RecentIncidentsWidget from './RecentIncidentsWidget';
import RiskMatrixWidget from './RiskMatrixWidget';
import SecurityStatusWidget from './SecurityStatusWidget';
import PersonnelStatusWidget from './PersonnelStatusWidget';
import ExternalEventsWidget from './ExternalEventsWidget';

// Define the props that all widgets must accept
export interface WidgetProps {
  onRemove?: () => void;
  onCollapse?: () => void;
  isCollapsed?: boolean;
  className?: string;
  dragHandleProps?: any;
}

// Create a registry of widget components
const widgetRegistry: Record<string, ComponentType<WidgetProps>> = {
  organizationRisk: OrganizationRiskWidget,
  threatLevel: ThreatLevelWidget,
  globalThreatMap: GlobalThreatMapWidget,
  highRiskAssets: HighRiskAssetsWidget,
  highRiskPersonnel: HighRiskPersonnelWidget,
  highRiskTravel: HighRiskTravelWidget,
  recentIncidents: RecentIncidentsWidget,
  riskMatrix: RiskMatrixWidget,
  securityStatus: SecurityStatusWidget,
  personnelStatus: PersonnelStatusWidget,
  externalEvents: ExternalEventsWidget
};

export default widgetRegistry;