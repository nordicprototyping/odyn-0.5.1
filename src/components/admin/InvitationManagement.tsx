import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Copy,
  RefreshCw,
  Send,
  Clipboard,
  Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface Invitation {
  id: string;
  invited_email: string;
  invitation_code: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
}

const InvitationManagement: React.FC = () => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteFormData, setInviteFormData] = useState({
    email: '',
    role: 'user',
    expiresInDays: 7
  });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { profile, organization, hasPermission } = useAuth();

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('organization_invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setInvitations(data || []);
    } catch (err) {
      console.error('Error fetching invitations:', err);
      setError('Failed to load invitation data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError(null);
    setSuccess(null);

    try {
      if (!organization?.id) {
        throw new Error('Organization ID is required');
      }

      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      if (!accessToken) {
        throw new Error('No access token available');
      }

      // Call the create-invitation edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          email: inviteFormData.email,
          organizationId: organization.id,
          role: inviteFormData.role,
          expiresInDays: inviteFormData.expiresInDays
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create invitation');
      }

      // Refresh the invitations list
      await fetchInvitations();
      setShowInviteForm(false);
      setInviteFormData({
        email: '',
        role: 'user',
        expiresInDays: 7
      });
      setSuccess(`Invitation sent to ${inviteFormData.email}`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error creating invitation:', err);
      setInviteError(err instanceof Error ? err.message : 'Failed to create invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase
        .from('organization_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) {
        throw error;
      }

      // Refresh the invitations list
      await fetchInvitations();
      setSuccess('Invitation cancelled successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error cancelling invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvitation = async (invitation: Invitation) => {
    try {
      setLoading(true);
      setError(null);
      
      // Update the expiration date to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      const { error } = await supabase
        .from('organization_invitations')
        .update({ 
          expires_at: expiresAt.toISOString(),
          status: 'pending'
        })
        .eq('id', invitation.id);

      if (error) {
        throw error;
      }

      // Refresh the invitations list
      await fetchInvitations();
      setSuccess(`Invitation to ${invitation.invited_email} resent successfully`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error resending invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to resend invitation');
    } finally {
      setLoading(false);
    }
  };

  const copyInvitationLink = (code: string) => {
    const invitationLink = `${window.location.origin}/join-organization?code=${code}`;
    navigator.clipboard.writeText(invitationLink);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const copyInvitationCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'accepted': return 'bg-green-100 text-green-700';
      case 'expired': return 'bg-gray-100 text-gray-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'accepted': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'expired': return <XCircle className="w-4 h-4 text-gray-500" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'user': return 'bg-blue-100 text-blue-700';
      case 'manager': return 'bg-purple-100 text-purple-700';
      case 'admin': return 'bg-red-100 text-red-700';
      case 'super_admin': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredInvitations = invitations.filter(invitation => {
    return invitation.invited_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
           invitation.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
           invitation.role.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (!hasPermission('users.create')) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to manage invitations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invitation Management</h1>
          <p className="text-gray-600">Invite and manage users for your organization</p>
        </div>
        <button
          onClick={() => setShowInviteForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Invite User</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <span className="text-green-700 text-sm">{success}</span>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search invitations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={fetchInvitations}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Invitations List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading && invitations.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredInvitations.length === 0 ? (
          <div className="p-8 text-center">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No invitations found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'Try adjusting your search' : 'Invite users to join your organization'}
            </p>
            <button
              onClick={() => setShowInviteForm(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Invite User</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invitation Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvitations.map((invitation) => (
                  <tr key={invitation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                          <Mail className="w-5 h-5 text-white" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{invitation.invited_email}</div>
                          <div className="text-sm text-gray-500">Invited {new Date(invitation.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(invitation.role)}`}>
                        {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1).replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(invitation.status)}
                        <span className={`ml-2 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(invitation.status)}`}>
                          {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{invitation.invitation_code}</code>
                        <button
                          onClick={() => copyInvitationCode(invitation.invitation_code)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Copy code"
                        >
                          {copiedCode === invitation.invitation_code ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm">
                        <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                        <span className={new Date(invitation.expires_at) < new Date() ? 'text-red-600' : 'text-gray-900'}>
                          {new Date(invitation.expires_at).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => copyInvitationLink(invitation.invitation_code)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Copy invitation link"
                          disabled={invitation.status !== 'pending'}
                        >
                          <Clipboard className="w-4 h-4" />
                        </button>
                        {invitation.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleResendInvitation(invitation)}
                              className="text-green-600 hover:text-green-900"
                              title="Resend invitation"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleCancelInvitation(invitation.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Cancel invitation"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite User Form Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Invite User</h2>
                    <p className="text-gray-600">Send an invitation to join your organization</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowInviteForm(false);
                    setInviteError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleCreateInvitation} className="p-6 space-y-4">
              {inviteError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-red-700 text-sm">{inviteError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={inviteFormData.email}
                  onChange={(e) => setInviteFormData({...inviteFormData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role *
                </label>
                <select
                  required
                  value={inviteFormData.role}
                  onChange={(e) => setInviteFormData({...inviteFormData, role: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="user">User</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  This determines what permissions the user will have in your organization.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expires In (Days) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="30"
                  value={inviteFormData.expiresInDays}
                  onChange={(e) => setInviteFormData({...inviteFormData, expiresInDays: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  The invitation will expire after this many days.
                </p>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteForm(false);
                    setInviteError(null);
                  }}
                  disabled={inviteLoading}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {inviteLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Invitation</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvitationManagement;