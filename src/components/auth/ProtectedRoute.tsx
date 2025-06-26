import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: string | string[];
  fallback?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredRole,
  fallback
}) => {
  const { user, profile, loading, hasPermission, hasRole } = useAuth();
  const location = useLocation();

  console.log('🛡️ ProtectedRoute:', { 
    path: location.pathname,
    loading, 
    userExists: !!user, 
    profileExists: !!profile,
    requiredPermission,
    requiredRole,
    userEmail: user?.email,
    profileRole: profile?.role,
    profileOrgId: profile?.organization_id,
    accountLocked: profile?.account_locked_until ? new Date(profile.account_locked_until) > new Date() : false
  });

  if (loading) {
    console.log('⏳ ProtectedRoute: Still loading auth state', {
      userId: user?.id,
      hasProfile: !!profile,
      path: location.pathname
    });
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('🚫 ProtectedRoute: No user, redirecting to login', {
      path: location.pathname,
      redirectState: { from: location }
    });
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!profile) {
    console.log('⚠️ ProtectedRoute: User exists but no profile found', {
      userId: user.id,
      email: user.email,
      path: location.pathname
    });
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Setting up your profile...</p>
        </div>
      </div>
    );
  }

  // Check if account is locked
  if (profile.account_locked_until && new Date(profile.account_locked_until) > new Date()) {
    console.log('🔒 ProtectedRoute: Account is locked until', {
      lockedUntil: profile.account_locked_until,
      userId: user.id,
      path: location.pathname
    });
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Account Locked</h2>
            <p className="text-red-600">
              Your account has been temporarily locked due to multiple failed login attempts.
              Please try again later or contact support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check permission requirements
  if (requiredPermission && !hasPermission(requiredPermission)) {
    console.log('🚫 ProtectedRoute: Missing required permission:', {
      requiredPermission,
      userRole: profile.role,
      userId: user.id,
      path: location.pathname
    });
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">Access Denied</h2>
            <p className="text-yellow-600">
              You don't have permission to access this resource.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check role requirements
  if (requiredRole && !hasRole(requiredRole)) {
    console.log('🚫 ProtectedRoute: Missing required role:', {
      requiredRole,
      userRole: profile.role,
      userId: user.id,
      path: location.pathname
    });
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">Access Denied</h2>
            <p className="text-yellow-600">
              You don't have the required role to access this resource.
            </p>
          </div>
        </div>
      </div>
    );
  }

  console.log('✅ ProtectedRoute: Access granted', {
    userId: user.id,
    role: profile.role,
    path: location.pathname
  });
  return <>{children}</>;
};

export default ProtectedRoute;