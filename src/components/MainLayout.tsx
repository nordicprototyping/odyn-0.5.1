import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Bell,
  Search,
  Menu
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import AppSidebar from './AppSidebar';
import NotificationPanel from './NotificationPanel';

interface MainLayoutProps {
  children: React.ReactNode;
}

// Mock notification data - in a real app, this would come from an API or state management
const mockNotifications = [
  {
    id: '1',
    type: 'alert' as const,
    title: 'High Risk Travel Alert',
    message: 'Marcus Rodriguez travel plan to Istanbul requires immediate review due to elevated security threats in the region.',
    timestamp: '2 minutes ago',
    read: false,
    category: 'travel' as const,
    priority: 'critical' as const
  },
  {
    id: '2',
    type: 'warning' as const,
    title: 'Security System Maintenance',
    message: 'Access control system at London HQ will undergo maintenance tonight from 11 PM to 3 AM.',
    timestamp: '15 minutes ago',
    read: false,
    category: 'security' as const,
    priority: 'medium' as const
  },
  {
    id: '3',
    type: 'info' as const,
    title: 'New Personnel Added',
    message: 'Dr. Elena Volkov has been successfully added to the personnel database with Confidential clearance.',
    timestamp: '1 hour ago',
    read: true,
    category: 'personnel' as const,
    priority: 'low' as const
  },
  {
    id: '4',
    type: 'alert' as const,
    title: 'Incident Report Filed',
    message: 'New security incident reported at Embassy Compound A - unauthorized access attempt detected.',
    timestamp: '2 hours ago',
    read: false,
    category: 'incident' as const,
    priority: 'high' as const
  },
  {
    id: '5',
    type: 'success' as const,
    title: 'Risk Mitigation Complete',
    message: 'Cyber security risk mitigation plan has been successfully implemented and verified.',
    timestamp: '3 hours ago',
    read: true,
    category: 'security' as const,
    priority: 'medium' as const
  }
];

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);

  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Component */}
      <AppSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        showUserMenu={showUserMenu}
        setShowUserMenu={setShowUserMenu}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 lg:px-6 py-4">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              {/* Page title removed from here */}
            </div>
            
            <div className="flex items-center space-x-2 lg:space-x-4">
              <div className="relative hidden sm:block">
                <Search className="w-4 h-4 lg:w-5 lg:h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search threats, locations..."
                  className="pl-8 lg:pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base w-48 lg:w-64"
                />
              </div>
              <div className="relative">
                <button 
                  onClick={handleNotificationClick}
                  className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Bell className="w-5 h-5 lg:w-6 lg:h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
                
                {/* Notification Panel */}
                {showNotifications && (
                  <NotificationPanel
                    notifications={notifications}
                    onClose={() => setShowNotifications(false)}
                    onMarkAsRead={handleMarkAsRead}
                    onMarkAllAsRead={handleMarkAllAsRead}
                  />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 p-4 lg:p-6 relative overflow-auto">
          {children}
        </main>
      </div>

      {/* Overlay to close notifications when clicking outside */}
      {showNotifications && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowNotifications(false)}
        />
      )}
    </div>
  );
};

export default MainLayout;