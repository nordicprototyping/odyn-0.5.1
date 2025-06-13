import React from 'react';
import { X, AlertTriangle, CheckCircle, Info, Clock, User, MapPin, Shield } from 'lucide-react';

interface Notification {
  id: string;
  type: 'alert' | 'info' | 'success' | 'warning';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  category: 'security' | 'personnel' | 'travel' | 'system' | 'incident';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface NotificationPanelProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead
}) => {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'alert':
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security':
        return <Shield className="w-4 h-4 text-red-500" />;
      case 'personnel':
        return <User className="w-4 h-4 text-blue-500" />;
      case 'travel':
        return <MapPin className="w-4 h-4 text-green-500" />;
      case 'system':
        return <Info className="w-4 h-4 text-gray-500" />;
      case 'incident':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-orange-500 bg-orange-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-l-blue-500 bg-blue-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">No notifications</p>
            <p className="text-gray-400 text-xs mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 ${
                  !notification.read ? getPriorityColor(notification.priority) : 'border-l-gray-200 bg-white'
                }`}
                onClick={() => onMarkAsRead(notification.id)}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-600'}`}>
                        {notification.title}
                      </p>
                      <div className="flex items-center space-x-1">
                        {getCategoryIcon(notification.category)}
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                    <p className={`text-sm ${!notification.read ? 'text-gray-700' : 'text-gray-500'} line-clamp-2`}>
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>{notification.timestamp}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        notification.priority === 'critical' ? 'bg-red-100 text-red-700' :
                        notification.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {notification.priority}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <button className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium">
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;