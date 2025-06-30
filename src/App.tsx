import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import LoginPage from './components/auth/LoginPage';
import TwoFactorSetup from './components/auth/TwoFactorSetup';
import MainLayout from './components/MainLayout';
import DashboardPage from './pages/DashboardPage';
import UserManagement from './components/admin/UserManagement';
import OrganizationSettings from './components/admin/OrganizationSettings';
import OrganizationManagement from './components/admin/OrganizationManagement';
import TravelSecurityManagement from './components/TravelSecurityManagement';
import RiskManagement from './components/RiskManagement';
import PersonnelDashboard from './components/PersonnelDashboard';
import IncidentManagement from './components/IncidentManagement';
import AssetSecurityDashboard from './components/AssetSecurityDashboard';
import MitigationsPage from './pages/MitigationsPage';
import JoinOrganizationPage from './pages/JoinOrganizationPage';
import AuditLogViewer from './components/admin/AuditLogViewer';
import NotificationsPage from './pages/NotificationsPage';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/setup-2fa" element={<TwoFactorSetup />} />
          <Route path="/join-organization" element={<JoinOrganizationPage />} />
          
          {/* Dashboard routes with layout */}
          <Route 
            path="/dashboard" 
            element={
              <MainLayout>
                <DashboardPage />
              </MainLayout>
            }
          />
          <Route 
            path="/dashboard/personnel" 
            element={
              <MainLayout>
                <PersonnelDashboard />
              </MainLayout>
            }
          />
          <Route 
            path="/dashboard/incidents" 
            element={
              <MainLayout>
                <IncidentManagement />
              </MainLayout>
            }
          />
          <Route 
            path="/dashboard/assets" 
            element={
              <MainLayout>
                <AssetSecurityDashboard />
              </MainLayout>
            }
          />
          <Route 
            path="/dashboard/risks" 
            element={
              <MainLayout>
                <RiskManagement />
              </MainLayout>
            }
          />
          <Route 
            path="/dashboard/travel" 
            element={
              <MainLayout>
                <TravelSecurityManagement />
              </MainLayout>
            }
          />
          <Route 
            path="/dashboard/geopolitical" 
            element={
              <MainLayout>
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Geopolitical Risk Dashboard</h2>
                  <p className="text-gray-600">Coming soon...</p>
                </div>
              </MainLayout>
            }
          />
          <Route 
            path="/dashboard/mitigations" 
            element={
              <MainLayout>
                <MitigationsPage />
              </MainLayout>
            }
          />
          
          {/* Notifications Page */}
          <Route 
            path="/notifications" 
            element={
              <MainLayout>
                <NotificationsPage />
              </MainLayout>
            }
          />
          
          {/* Standalone routes with layout */}
          <Route 
            path="/risks" 
            element={
              <MainLayout>
                <RiskManagement />
              </MainLayout>
            }
          />
          <Route 
            path="/travel" 
            element={
              <MainLayout>
                <TravelSecurityManagement />
              </MainLayout>
            }
          />
          
          {/* Admin routes with layout */}
          <Route 
            path="/admin/users" 
            element={
              <MainLayout>
                <UserManagement />
              </MainLayout>
            }
          />
          <Route 
            path="/admin/organization-settings" 
            element={
              <MainLayout>
                <OrganizationSettings />
              </MainLayout>
            }
          />
          <Route 
            path="/admin/organizations" 
            element={
              <MainLayout>
                <OrganizationManagement />
              </MainLayout>
            }
          />
          <Route 
            path="/admin/audit-logs" 
            element={
              <MainLayout>
                <AuditLogViewer />
              </MainLayout>
            }
          />
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;