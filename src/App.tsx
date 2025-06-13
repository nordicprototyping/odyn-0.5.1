import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/auth/ProtectedRoute';
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
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route 
            path="/setup-2fa" 
            element={
              <ProtectedRoute>
                <TwoFactorSetup />
              </ProtectedRoute>
            } 
          />
          
          {/* Dashboard routes with layout */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <DashboardPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route 
            path="/dashboard/personnel" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <PersonnelDashboard />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route 
            path="/dashboard/incidents" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <IncidentManagement />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route 
            path="/dashboard/assets" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <AssetSecurityDashboard />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route 
            path="/dashboard/risks" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <RiskManagement />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route 
            path="/dashboard/travel" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <TravelSecurityManagement />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route 
            path="/dashboard/geopolitical" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Geopolitical Risk Dashboard</h2>
                    <p className="text-gray-600">Coming soon...</p>
                  </div>
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route 
            path="/dashboard/mitigations" 
            element={
              <ProtectedRoute requiredPermission="mitigations.read">
                <MainLayout>
                  <MitigationsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          
          {/* Standalone routes with layout */}
          <Route 
            path="/risks" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <RiskManagement />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route 
            path="/travel" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <TravelSecurityManagement />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          
          {/* Admin routes with layout */}
          <Route 
            path="/admin/users" 
            element={
              <ProtectedRoute requiredPermission="users.read">
                <MainLayout>
                  <UserManagement />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/organization-settings" 
            element={
              <ProtectedRoute requiredPermission="organizations.read">
                <MainLayout>
                  <OrganizationSettings />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/organizations" 
            element={
              <ProtectedRoute requiredPermission="organizations.read">
                <MainLayout>
                  <OrganizationManagement />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;