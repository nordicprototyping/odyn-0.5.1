import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building, Key, CheckCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

const JoinOrganizationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [invitationCode, setInvitationCode] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [organization, setOrganization] = useState<{ id: string; name: string } | null>(null);
  const [invitationDetails, setInvitationDetails] = useState<any>(null);
  const [isCheckingCode, setIsCheckingCode] = useState(false);

  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Check invitation code from URL when component mounts
  useEffect(() => {
    if (invitationCode) {
      checkInvitationCode(invitationCode);
    }
  }, [invitationCode, user]);

  const checkInvitationCode = async (code: string) => {
    if (!code) return;
    
    try {
      setIsCheckingCode(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('organization_invitations')
        .select('id, organization_id, invited_email, role, status, expires_at, organizations(name)')
        .eq('invitation_code', code)
        .single();

      if (error) {
        throw new Error('Invalid invitation code');
      }

      if (data.status !== 'pending') {
        throw new Error(`This invitation is ${data.status}`);
      }

      if (new Date(data.expires_at) < new Date()) {
        throw new Error('This invitation has expired');
      }

      // If user is logged in, check if email matches
      if (user && user.email !== data.invited_email) {
        throw new Error(`This invitation was sent to ${data.invited_email}. Please log in with that email address.`);
      }

      setInvitationDetails({
        id: data.id,
        organizationId: data.organization_id,
        email: data.invited_email,
        role: data.role,
        expiresAt: data.expires_at,
        organizationName: data.organizations?.name
      });

    } catch (err) {
      console.error('Error checking invitation code:', err);
      setError(err instanceof Error ? err.message : 'Invalid invitation code');
      setInvitationDetails(null);
    } finally {
      setIsCheckingCode(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!user) {
      // Redirect to login page with invitation code in URL
      navigate(`/login?invitation=${invitationCode}`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      if (!accessToken) {
        throw new Error('No access token available');
      }

      // Call the accept-invitation edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          invitationCode
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to accept invitation');
      }

      setOrganization(result.organization);
      setSuccess(`You have successfully joined ${result.organization.name}`);
      
      // Refresh user profile to get updated organization
      await refreshProfile();
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black opacity-20"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10"></div>
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Building className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Join Organization</h1>
            <p className="text-gray-600">Enter your invitation code to join an organization</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span className="text-green-700 text-sm">{success}</span>
            </div>
          )}

          {!organization ? (
            <>
              <div className="mb-6">
                <label htmlFor="invitationCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Invitation Code
                </label>
                <div className="relative">
                  <Key className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    id="invitationCode"
                    type="text"
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter invitation code"
                    disabled={loading || isCheckingCode}
                  />
                </div>
              </div>

              {isCheckingCode ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : invitationDetails ? (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-md font-semibold text-blue-800 mb-2">Invitation Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Organization:</span>
                      <span className="text-sm font-medium text-gray-900">{invitationDetails.organizationName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Email:</span>
                      <span className="text-sm font-medium text-gray-900">{invitationDetails.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Role:</span>
                      <span className="text-sm font-medium text-gray-900 capitalize">{invitationDetails.role.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Expires:</span>
                      <span className="text-sm font-medium text-gray-900">{new Date(invitationDetails.expiresAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ) : null}

              <button
                onClick={() => {
                  if (invitationCode && !isCheckingCode) {
                    if (invitationDetails) {
                      handleAcceptInvitation();
                    } else {
                      checkInvitationCode(invitationCode);
                    }
                  }
                }}
                disabled={!invitationCode || loading || isCheckingCode}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : invitationDetails ? (
                  <>
                    <span>Accept Invitation</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    <span>Verify Code</span>
                    <Key className="w-5 h-5" />
                  </>
                )}
              </button>

              {!user && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">
                    You'll need to log in or create an account to join an organization.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to {organization.name}!</h2>
              <p className="text-gray-600 mb-6">You have successfully joined the organization.</p>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-white/80 text-sm">
          <p>© 2024 Odyn. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default JoinOrganizationPage;