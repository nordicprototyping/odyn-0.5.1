import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Shield, Lock, Mail, AlertCircle, CheckCircle, Loader2, Brain } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import zxcvbn from 'zxcvbn';

interface PasswordStrength {
  score: number;
  feedback: string[];
  color: string;
  label: string;
}

const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [searchParams] = useSearchParams();
  const invitationCode = searchParams.get('invitation');

  const { signIn, signUp, resetPassword, verifyTwoFactor, user, getInvitationDetails } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      // If there's an invitation code, redirect to join organization page
      if (invitationCode) {
        navigate(`/join-organization?code=${invitationCode}`);
      } else {
        // Otherwise, redirect to dashboard or the page they were trying to access
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from);
      }
    }
  }, [user, navigate, location, invitationCode]);

  useEffect(() => {
    // If there's an invitation code, fetch the organization details
    if (invitationCode && !isLogin) {
      const fetchInvitationDetails = async () => {
        const result = await getInvitationDetails(invitationCode);
        if (result.organizationName) {
          setOrganizationName(result.organizationName);
        } else if (result.error) {
          setError(result.error);
        }
      };
      fetchInvitationDetails();
    }
  }, [invitationCode, isLogin, getInvitationDetails]);

  useEffect(() => {
    if (!isLogin && password) {
      const result = zxcvbn(password);
      const strengthMap = {
        0: { color: 'bg-red-500', label: 'Very Weak' },
        1: { color: 'bg-red-400', label: 'Weak' },
        2: { color: 'bg-yellow-500', label: 'Fair' },
        3: { color: 'bg-blue-500', label: 'Good' },
        4: { color: 'bg-green-500', label: 'Strong' }
      };

      setPasswordStrength({
        score: result.score,
        feedback: result.feedback.suggestions,
        color: strengthMap[result.score as keyof typeof strengthMap].color,
        label: strengthMap[result.score as keyof typeof strengthMap].label
      });
    } else {
      setPasswordStrength(null);
    }
  }, [password, isLogin]);

  const validatePassword = (password: string): boolean => {
    const minLength = password.length >= 8;
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);

    return minLength && hasSpecialChar && hasNumber && hasUpperCase && hasLowerCase;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isLogin) {
        const result = await signIn(email, password, rememberMe);
        
        if (result.error) {
          setError(result.error);
        } else if (result.requiresTwoFactor) {
          setShowTwoFactor(true);
          setSuccess('Please enter your two-factor authentication code.');
        } else {
          // If there's an invitation code, redirect to join organization page
          if (invitationCode) {
            navigate(`/join-organization?code=${invitationCode}`);
          } else {
            const from = location.state?.from?.pathname || '/dashboard';
            navigate(from);
          }
        }
      } else {
        // Validation for signup
        if (!validatePassword(password)) {
          setError('Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.');
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }

        if (passwordStrength && passwordStrength.score < 2) {
          setError('Password is too weak. Please choose a stronger password.');
          setLoading(false);
          return;
        }

        // Get organization ID if there's an invitation code
        let organizationId: string | undefined;
        if (invitationCode) {
          const invitationDetails = await getInvitationDetails(invitationCode);
          if (invitationDetails.error) {
            setError(invitationDetails.error);
            setLoading(false);
            return;
          }
          organizationId = invitationDetails.organizationId;
        }

        const result = await signUp(email, password, fullName, organizationId);
        
        if (result.error) {
          setError(result.error);
        } else {
          setSuccess('Account created successfully! Please check your email to verify your account.');
          setIsLogin(true);
        }
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Login/Signup error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await verifyTwoFactor(twoFactorCode);
      
      if (result.error) {
        setError(result.error);
      } else {
        // If there's an invitation code, redirect to join organization page
        if (invitationCode) {
          navigate(`/join-organization?code=${invitationCode}`);
        } else {
          const from = location.state?.from?.pathname || '/dashboard';
          navigate(from);
        }
      }
    } catch (error) {
      setError('Invalid two-factor code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await resetPassword(email);
      
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Password reset email sent! Please check your inbox.');
      }
    } catch (error) {
      setError('Failed to send password reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (showTwoFactor) {
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
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Two-Factor Authentication</h1>
              <p className="text-gray-600">Enter the 6-digit code from your authenticator app</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleTwoFactorSubmit} className="space-y-6">
              <div>
                <input
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  maxLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || twoFactorCode.length !== 6}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  'Verify Code'
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowTwoFactor(false)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200"
                >
                  Back to Login
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black opacity-20"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10"></div>
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Odyn</h1>
            <p className="text-gray-600">
              {isLogin ? 'Sign in to your account' : 'Create your account'}
            </p>
            {invitationCode && (
              <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  {organizationName 
                    ? `You've been invited to join ${organizationName}`
                    : 'You\'ve been invited to join an organization'
                  }
                </p>
              </div>
            )}
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {!isLogin && passwordStrength && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.score + 1) * 20}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium text-gray-600">{passwordStrength.label}</span>
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <ul className="text-xs text-gray-600 space-y-1">
                      {passwordStrength.feedback.map((suggestion, index) => (
                        <li key={index}>• {suggestion}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {!isLogin && (
                <div className="mt-2 text-xs text-gray-600">
                  Password must contain:
                  <ul className="mt-1 space-y-1">
                    <li className={`flex items-center space-x-1 ${password.length >= 8 ? 'text-green-600' : 'text-gray-400'}`}>
                      <span>•</span>
                      <span>At least 8 characters</span>
                    </li>
                    <li className={`flex items-center space-x-1 ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
                      <span>•</span>
                      <span>One uppercase letter</span>
                    </li>
                    <li className={`flex items-center space-x-1 ${/[a-z]/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
                      <span>•</span>
                      <span>One lowercase letter</span>
                    </li>
                    <li className={`flex items-center space-x-1 ${/\d/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
                      <span>•</span>
                      <span>One number</span>
                    </li>
                    <li className={`flex items-center space-x-1 ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
                      <span>•</span>
                      <span>One special character</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Confirm your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
                )}
              </div>
            )}

            {isLogin && (
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
                </div>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setSuccess('');
                  setPassword('');
                  setConfirmPassword('');
                  setPasswordStrength(null);
                }}
                className="ml-1 text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center text-white/80 text-sm">
          <p>© 2024 Odyn. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;