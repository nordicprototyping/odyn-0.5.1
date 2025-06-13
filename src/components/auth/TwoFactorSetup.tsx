import React, { useState, useEffect } from 'react';
import { Shield, Copy, Download, CheckCircle, AlertCircle, Loader2, QrCode, Key } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const TwoFactorSetup: React.FC = () => {
  const [step, setStep] = useState<'setup' | 'verify' | 'complete'>('setup');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const { setupTwoFactor, enableTwoFactor, profile, refreshProfile } = useAuth();

  useEffect(() => {
    if (step === 'setup') {
      initializeSetup();
    }
  }, [step]);

  const initializeSetup = async () => {
    setLoading(true);
    try {
      const result = await setupTwoFactor();
      setQrCode(result.qrCode);
      setSecret(result.secret);
      setBackupCodes(result.backupCodes);
    } catch (error) {
      setError('Failed to initialize two-factor authentication setup');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await enableTwoFactor(verificationCode);
      
      if (result.error) {
        setError(result.error);
      } else {
        setBackupCodes(result.backupCodes);
        setStep('complete');
        await refreshProfile();
      }
    } catch (error) {
      setError('Failed to verify two-factor authentication');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const downloadBackupCodes = () => {
    const content = `SecureIntel Two-Factor Authentication Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\nBackup Codes:\n${backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}\n\nIMPORTANT:\n- Keep these codes in a safe place\n- Each code can only be used once\n- Use these codes if you lose access to your authenticator app\n- Generate new codes if you suspect they have been compromised`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'secureintel-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (profile?.two_factor_enabled) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <h2 className="text-lg font-semibold text-green-800">Two-Factor Authentication Enabled</h2>
          </div>
          <p className="text-green-700">
            Your account is protected with two-factor authentication. You'll need to enter a code from your authenticator app when signing in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Enable Two-Factor Authentication</h1>
          <p className="text-gray-600">Add an extra layer of security to your account</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {step === 'setup' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 1: Scan QR Code</h2>
              <p className="text-gray-600 mb-6">
                Use your authenticator app (Google Authenticator, Authy, etc.) to scan this QR code:
              </p>
              
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg border-2 border-dashed border-gray-300 inline-block">
                  {qrCode ? (
                    <img src={qrCode} alt="QR Code" className="w-48 h-48 mx-auto" />
                  ) : (
                    <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                      <QrCode className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Can't scan the QR code?</h3>
              <p className="text-sm text-gray-600 mb-3">
                Manually enter this secret key in your authenticator app:
              </p>
              <div className="flex items-center space-x-2">
                <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono">
                  {secret}
                </code>
                <button
                  onClick={() => copyToClipboard(secret)}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => setStep('verify')}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Continue to Verification
              </button>
            </div>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 2: Verify Setup</h2>
              <p className="text-gray-600 mb-6">
                Enter the 6-digit code from your authenticator app to complete setup:
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-6">
              <div className="text-center">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-48 px-4 py-3 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  maxLength={6}
                  required
                />
              </div>

              <div className="flex justify-center space-x-4">
                <button
                  type="button"
                  onClick={() => setStep('setup')}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || verificationCode.length !== 6}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    'Enable 2FA'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Two-Factor Authentication Enabled!</h2>
              <p className="text-gray-600 mb-6">
                Your account is now protected with two-factor authentication.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Key className="w-6 h-6 text-yellow-600" />
                <h3 className="text-lg font-semibold text-yellow-800">Save Your Backup Codes</h3>
              </div>
              <p className="text-yellow-700 mb-4">
                These backup codes can be used to access your account if you lose your authenticator device. 
                Each code can only be used once.
              </p>
              
              <div className="grid grid-cols-2 gap-2 mb-4">
                {backupCodes.map((code, index) => (
                  <div key={index} className="bg-white px-3 py-2 rounded border font-mono text-sm">
                    {code}
                  </div>
                ))}
              </div>

              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => copyToClipboard(backupCodes.join('\n'))}
                  className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Codes</span>
                </button>
                <button
                  onClick={downloadBackupCodes}
                  className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Codes</span>
                </button>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
              >
                Continue to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TwoFactorSetup;