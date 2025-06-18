import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Shield,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Crown,
  UserCheck,
  Settings,
  Inbox
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase, Database } from '../../lib/supabase';
import InvitationManagement from './InvitationManagement';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

interface UserWithAuth extends UserProfile {
  email: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserWithAuth[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserWithAuth | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    role: '',
    department: '',
    phone: ''
  });
  const [activeTab, setActiveTab] = useState<'users' | 'invitations'>('users');
  const [showInviteForm, setShowInviteForm] = useState(false);

  const { hasPermission, profile, user } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // For each profile, get the auth user data
      const usersWithAuth: UserWithAuth[] = [];
      
      for (const profile of profiles || []) {
        // In a real implementation, you'd need admin access to get user auth data
        // For now, we'll simulate the email and auth data
        usersWithAuth.push({
          ...profile,
          email: `user${profile.id.slice(-4)}@example.com`, // Simulated email
          email_confirmed_at: profile.created_at,
          last_sign_in_at: profile.last_login
        });
      }

      setUsers(usersWithAuth);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.department || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return <Crown className="w-4 h-4 text-purple-500" />;
      case 'admin': return <Shield className="w-4 h-4 text-red-500" />;
      case 'manager': return <UserCheck className="w-4 h-4 text-blue-500" />;
      case 'user': return <Users className="w-4 h-4 text-gray-500" />;
      default: return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'admin': return 'bg-red-100 text-red-700 border-red-200';
      case 'manager': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'user': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (user: UserWithAuth) => {
    if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    if (user.email_confirmed_at) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    return <AlertCircle className="w-4 h-4 text-yellow-500" />;
  };

  const handleEditUser = (user: UserWithAuth) => {
    setSelectedUser(user);
    setEditForm({
      role: user.role,
      department: user.department || '',
      phone: user.phone || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      // Get current user data for comparison
      const { data: currentUser } = await supabase
        .from('user_profiles')
        .select('role, department, phone')
        .eq('id', selectedUser.id)
        .single();
      
      const { error } = await supabase
        .from('user_profiles')
        .update({
          role: editForm.role as any,
          department: editForm.department || null,
          phone: editForm.phone || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Log the user profile update in audit logs
      const changes: Record<string, any> = {};
      
      if (currentUser) {
        if (editForm.role !== currentUser.role) {
          changes.role = { from: currentUser.role, to: editForm.role };
        }
        if (editForm.department !== currentUser.department) {
          changes.department = { from: currentUser.department, to: editForm.department };
        }
        if (editForm.phone !== currentUser.phone) {
          changes.phone = { from: currentUser.phone, to: editForm.phone };
        }
      }
      
      await logAuditEvent('user_profile_updated', selectedUser.id, {
        target_user_id: selectedUser.user_id,
        target_user_name: selectedUser.full_name,
        changes: Object.keys(changes).length > 0 ? changes : 'No significant changes'
      });

      await fetchUsers();
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleLockUser = async (userId: string) => {
    try {
      const lockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // Lock for 24 hours
      
      const { error } = await supabase
        .from('user_profiles')
        .update({
          account_locked_until: lockUntil.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      
      // Get user details for audit log
      const { data: lockedUser } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .eq('id', userId)
        .single();
      
      // Log the user account lock in audit logs
      if (lockedUser) {
        await logAuditEvent('user_account_locked', userId, {
          target_user_id: lockedUser.user_id,
          target_user_name: lockedUser.full_name,
          lock_duration: '24 hours',
          lock_until: lockUntil.toISOString()
        });
      }

      await fetchUsers();
    } catch (error) {
      console.error('Error locking user:', error);
    }
  };

  const handleUnlockUser = async (userId: string) => {
    try {
      // Get user details for audit log before update
      const { data: lockedUser } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, account_locked_until')
        .eq('id', userId)
        .single();
      
      const { error } = await supabase
        .from('user_profiles')
        .update({
          account_locked_until: null,
          failed_login_attempts: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      
      // Log the user account unlock in audit logs
      if (lockedUser) {
        await logAuditEvent('user_account_unlocked', userId, {
          target_user_id: lockedUser.user_id,
          target_user_name: lockedUser.full_name,
          previous_lock_until: lockedUser.account_locked_until
        });
      }

      await fetchUsers();
    } catch (error) {
      console.error('Error unlocking user:', error);
    }
  };

  const logAuditEvent = async (action: string, resourceId?: string, details?: Record<string, any>) => {
    if (!profile?.organization_id) {
      console.warn('Cannot log audit event: no organization ID available');
      return;
    }
    
    try {
      const { error } = await supabase.from('audit_logs').insert({
        user_id: user?.id || null,
        organization_id: profile.organization_id,
        action,
        resource_type: 'user_profile',
        resource_id: resourceId,
        details,
        ip_address: null,
        user_agent: navigator.userAgent
      });

      if (error) {
        console.error('Error logging audit event:', error);
      }
    } catch (error) {
      console.error('Unexpected error logging audit event:', error);
    }
  };

  if (!hasPermission('users.read')) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to view user management.</p>
      </div>
    );
  }

  const userStats = {
    total: users.length,
    active: users.filter(u => !u.account_locked_until || new Date(u.account_locked_until) <= new Date()).length,
    locked: users.filter(u => u.account_locked_until && new Date(u.account_locked_until) > new Date()).length,
    admins: users.filter(u => u.role === 'admin' || u.role === 'super_admin').length,
    twoFactorEnabled: users.filter(u => u.two_factor_enabled).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage user accounts, roles, and permissions</p>
        </div>
        {hasPermission('users.create') && (
          <button 
            onClick={() => {
              setActiveTab('invitations');
              setShowInviteForm(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Invite User</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Users</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'invitations'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Inbox className="w-5 h-5" />
              <span>Invitations</span>
            </div>
          </button>
        </nav>
      </div>

      {activeTab === 'users' ? (
        <>
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{userStats.total}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-green-600">{userStats.active}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Locked</p>
                  <p className="text-2xl font-bold text-red-600">{userStats.locked}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Admins</p>
                  <p className="text-2xl font-bold text-purple-600">{userStats.admins}</p>
                </div>
                <Shield className="w-8 h-8 text-purple-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">2FA Enabled</p>
                  <p className="text-2xl font-bold text-blue-600">{userStats.twoFactorEnabled}</p>
                </div>
                <Shield className="w-8 h-8 text-blue-500" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="user">User</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      2FA
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => {
                    const isLocked = user.account_locked_until && new Date(user.account_locked_until) > new Date();
                    
                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {user.full_name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getRoleIcon(user.role)}
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRoleColor(user.role)}`}>
                              {user.role.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.department || 'Not assigned'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(user)}
                            <span className={`text-sm ${
                              isLocked ? 'text-red-600' : 
                              user.email_confirmed_at ? 'text-green-600' : 'text-yellow-600'
                            }`}>
                              {isLocked ? 'Locked' : 
                               user.email_confirmed_at ? 'Active' : 'Pending'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.two_factor_enabled 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {user.two_factor_enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {user.last_sign_in_at 
                              ? new Date(user.last_sign_in_at).toLocaleDateString()
                              : 'Never'
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            {hasPermission('users.update') && (
                              <button
                                onClick={() => handleEditUser(user)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit user"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            
                            {hasPermission('users.update') && user.id !== profile?.id && (
                              <>
                                {isLocked ? (
                                  <button
                                    onClick={() => handleUnlockUser(user.id)}
                                    className="text-green-600 hover:text-green-900"
                                    title="Unlock user"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleLockUser(user.id)}
                                    className="text-red-600 hover:text-red-900"
                                    title="Lock user"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Edit User Modal */}
          {showEditModal && selectedUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">Edit User</h2>
                </div>
                
                <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role
                    </label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="user">User</option>
                      <option value="manager">Manager</option>
                      {hasPermission('roles.assign') && (
                        <>
                          <option value="admin">Admin</option>
                          {profile?.role === 'super_admin' && (
                            <option value="super_admin">Super Admin</option>
                          )}
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department
                    </label>
                    <input
                      type="text"
                      value={editForm.department}
                      onChange={(e) => setEditForm({...editForm, department: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter department"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Update User
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      ) : (
        <InvitationManagement 
          showFormProp={showInviteForm} 
          setShowFormProp={setShowInviteForm} 
        />
      )}
    </div>
  );
};

export default UserManagement;