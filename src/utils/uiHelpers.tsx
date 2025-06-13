import React from 'react';
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Eye, 
  AlertTriangle, 
  Car, 
  UserCheck, 
  Crown, 
  Shield, 
  User 
} from 'lucide-react';

// Asset status icon helpers
export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'secure': return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'alert': return <AlertCircle className="w-4 h-4 text-red-500" />;
    case 'maintenance': return <XCircle className="w-4 h-4 text-yellow-500" />;
    case 'offline': return <XCircle className="w-4 h-4 text-gray-500" />;
    case 'compromised': return <AlertTriangle className="w-4 h-4 text-red-600" />;
    default: return <Eye className="w-4 h-4 text-gray-500" />;
  }
};

// Personnel status icon helpers
export const getPersonnelStatusIcon = (status: string) => {
  switch (status) {
    case 'active': return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'on-mission': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    case 'in-transit': return <Car className="w-4 h-4 text-blue-500" />;
    case 'off-duty': return <XCircle className="w-4 h-4 text-gray-500" />;
    case 'unavailable': return <XCircle className="w-4 h-4 text-red-500" />;
    case 'available': return <UserCheck className="w-4 h-4 text-green-500" />;
    default: return <Eye className="w-4 h-4 text-gray-500" />;
  }
};

// AI Risk color helpers
export const getAIRiskColor = (score: number) => {
  if (score <= 30) return 'text-green-600';
  if (score <= 70) return 'text-yellow-600';
  return 'text-red-600';
};

export const getAIRiskColorWithBg = (score: number) => {
  if (score <= 30) return 'text-green-600 bg-green-100 border-green-200';
  if (score <= 70) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
  return 'text-red-600 bg-red-100 border-red-200';
};

export const getAIRiskLevel = (score: number) => {
  if (score <= 30) return 'Low Risk';
  if (score <= 70) return 'Medium Risk';
  return 'High Risk';
};

// Role icon helpers
export const getRoleIcon = (role: string) => {
  switch (role) {
    case 'super_admin': return <Crown className="w-4 h-4 text-purple-500" />;
    case 'admin': return <Shield className="w-4 h-4 text-red-500" />;
    case 'manager': return <UserCheck className="w-4 h-4 text-blue-500" />;
    case 'user': return <User className="w-4 h-4 text-gray-500" />;
    default: return <User className="w-4 h-4 text-gray-500" />;
  }
};

// Status color helpers
export const getStatusColor = (status: string) => {
  switch (status) {
    case 'secure': return 'bg-green-100 text-green-700';
    case 'alert': return 'bg-red-100 text-red-700';
    case 'maintenance': return 'bg-yellow-100 text-yellow-700';
    case 'offline': return 'bg-gray-100 text-gray-700';
    case 'compromised': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-700';
  }
};

export const getPersonnelStatusColor = (status: string) => {
  switch (status) {
    case 'active': 
    case 'available': 
      return 'bg-green-100 text-green-700';
    case 'on-mission': 
      return 'bg-orange-100 text-orange-700';
    case 'in-transit': 
      return 'bg-blue-100 text-blue-700';
    case 'off-duty': 
    case 'unavailable': 
      return 'bg-gray-100 text-gray-700';
    default: 
      return 'bg-gray-100 text-gray-700';
  }
};

// Clearance level color helpers
export const getClearanceColor = (level: string) => {
  switch (level) {
    case 'Top Secret': return 'bg-red-100 text-red-700 border-red-200';
    case 'Secret': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'Confidential': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'Unclassified': return 'bg-gray-100 text-gray-700 border-gray-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

// System status color helpers
export const getSystemStatusColor = (status: string) => {
  switch (status) {
    case 'online': return 'text-green-600';
    case 'offline': return 'text-red-600';
    case 'maintenance': return 'text-yellow-600';
    default: return 'text-gray-600';
  }
};

// Trend icon helpers
export const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'improving': return <div className="w-3 h-3 bg-green-500 rounded-full transform rotate-45"></div>;
    case 'deteriorating': return <div className="w-3 h-3 bg-red-500 rounded-full transform rotate-45"></div>;
    case 'stable': return <div className="w-3 h-3 bg-gray-400 rounded-full"></div>;
    default: return <div className="w-3 h-3 bg-gray-400 rounded-full"></div>;
  }
};