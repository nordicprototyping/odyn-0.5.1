import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Shield, Brain, Globe, FileText, Users, Plane, AlertCircle, Settings, X, ChevronDown, LogOut, User, Crown, UserCheck, Building, Building2, LayoutDashboard, AlertTriangle as TriangleAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  path: string;
}

interface MenuSection {
  label: string;
  permission?: string;
  items: MenuItem[];
}

type MenuItemOrSection = MenuItem | MenuSection;

interface AppSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  showUserMenu: boolean;
  setShowUserMenu: (show: boolean) => void;
}

const AppSidebar: React.FC<AppSidebarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  showUserMenu,
  setShowUserMenu
}) => {
  const { user, profile, organization, signOut, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Define menu structure with sections
  const menuItems: MenuItemOrSection[] = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'geopolitical', label: 'Geopolitical Risk', icon: Globe, path: '/dashboard/geopolitical' },
    { id: 'risks', label: 'Risks', icon: TriangleAlert, path: '/dashboard/risks' },
    { id: 'assets', label: 'Assets', icon: Building2, path: '/dashboard/assets' },
    { id: 'personnel', label: 'Personnel', icon: Users, path: '/dashboard/personnel' },
    { id: 'travel', label: 'Travel Security', icon: Plane, path: '/dashboard/travel' },
    { id: 'incidents', label: 'Incident Management', icon: AlertCircle, path: '/dashboard/incidents' },
    { id: 'mitigations', label: 'Mitigation Management', icon: Shield, path: '/dashboard/mitigations' },
    // Admin Tools Section
    {
      label: 'Admin Tools',
      permission: 'users.read',
      items: [
        { id: 'admin-users', label: 'User Management', icon: Users, path: '/admin/users' },
        { id: 'admin-org-settings', label: 'Organization Settings', icon: Settings, path: '/admin/organization-settings' }
      ]
    },
    // Super Admin Tools Section
    {
      label: 'Super Admin',
      permission: 'organizations.read',
      items: [
        { id: 'admin-organizations', label: 'Organizations', icon: Building, path: '/admin/organizations' }
      ]
    }
  ];

  // Helper function to check if item is a section
  const isMenuSection = (item: MenuItemOrSection): item is MenuSection => {
    return 'items' in item;
  };

  // Helper function to handle menu item click
  const handleMenuItemClick = (item: MenuItem) => {
    navigate(item.path);
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  // Helper function to check if menu item is active
  const isMenuItemActive = (item: MenuItem) => {
    if (item.path === '/dashboard') {
      // Special case for dashboard - only active if exactly on /dashboard
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(item.path);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return <Crown className="w-4 h-4 text-purple-500" />;
      case 'admin': return <Shield className="w-4 h-4 text-red-500" />;
      case 'manager': return <UserCheck className="w-4 h-4 text-blue-500" />;
      case 'user': return <User className="w-4 h-4 text-gray-500" />;
      default: return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 
        w-64 sm:w-72 lg:w-80 xl:w-64
        bg-white shadow-xl border-r border-gray-200
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:flex lg:flex-col
        flex flex-col
      `}>
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 lg:px-6 bg-gradient-to-r from-blue-900 to-blue-800 flex-shrink-0">
          <div className="flex items-center space-x-2 lg:space-x-3 min-w-0">
            <Shield className="w-6 h-6 lg:w-8 lg:h-8 text-white flex-shrink-0" />
            <span className="text-white font-bold text-base lg:text-lg truncate">Odyn</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Organization Name */}
        {organization && (
          <div className="px-4 py-2 bg-gray-100 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Building className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 truncate">{organization.name}</span>
            </div>
          </div>
        )}
        
        {/* Navigation */}
        <nav className="flex-1 mt-4 lg:mt-8 overflow-y-auto px-3 lg:px-6 pb-4">
          <div className="mb-3 lg:mb-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3">
              Main Menu
            </h3>
          </div>
          
          <div className="space-y-1">
            {menuItems.map((item, index) => {
              if (isMenuSection(item)) {
                // Render section if user has permission
                if (item.permission && !hasPermission(item.permission)) {
                  return null;
                }
                
                return (
                  <div key={index} className="mb-4 lg:mb-6">
                    {/* Section divider */}
                    <div className="px-3 mb-3 lg:mb-4">
                      <div className="border-t border-gray-200 pt-3 lg:pt-4">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {item.label}
                        </h3>
                      </div>
                    </div>
                    
                    {/* Section items */}
                    <div className="space-y-1">
                      {item.items.map((subItem) => {
                        const Icon = subItem.icon;
                        const isActive = isMenuItemActive(subItem);
                        
                        return (
                          <button
                            key={subItem.id}
                            onClick={() => handleMenuItemClick(subItem)}
                            className={`
                              w-full flex items-center px-3 py-2.5 lg:py-3 text-left 
                              transition-all duration-200 rounded-lg group
                              ${isActive
                                ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700 shadow-sm' 
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }
                            `}
                          >
                            <Icon className={`
                              w-4 h-4 lg:w-5 lg:h-5 mr-2 lg:mr-3 flex-shrink-0
                              ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}
                            `} />
                            <span className="text-sm lg:text-base font-medium truncate">
                              {subItem.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              } else {
                // Render regular menu item
                const Icon = item.icon;
                const isActive = isMenuItemActive(item);
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleMenuItemClick(item)}
                    className={`
                      w-full flex items-center px-3 py-2.5 lg:py-3 text-left 
                      transition-all duration-200 rounded-lg group
                      ${isActive
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700 shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className={`
                      w-4 h-4 lg:w-5 lg:h-5 mr-2 lg:mr-3 flex-shrink-0
                      ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}
                    `} />
                    <span className="text-sm lg:text-base font-medium truncate">
                      {item.label}
                    </span>
                  </button>
                );
              }
            })}
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="p-3 lg:p-4 border-t border-gray-200 flex-shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center space-x-2 lg:space-x-3 p-2 lg:p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-xs lg:text-sm">
                  {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm lg:text-base font-medium text-gray-900 truncate">
                  {profile?.full_name || user?.email}
                </p>
                <div className="flex items-center space-x-1">
                  {getRoleIcon(profile?.role || 'user')}
                  <p className="text-xs lg:text-sm text-gray-500 capitalize truncate">
                    {profile?.role?.replace('_', ' ') || 'User'}
                  </p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
            </button>

            {/* User Menu Dropdown */}
            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-3 lg:px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                
                <button
                  onClick={() => {
                    navigate('/setup-2fa');
                    setShowUserMenu(false);
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  className="w-full text-left px-3 lg:px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-colors"
                >
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  <span>Security Settings</span>
                </button>
                
                <button
                  onClick={() => {
                    handleSignOut();
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 lg:px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-colors"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
};

export default AppSidebar;