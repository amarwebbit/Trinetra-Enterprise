'use client';

import { useState } from 'react';
import { Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Shield, Key } from 'lucide-react';
import { toast } from 'sonner';

export function ChangePassword() {
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    requirements: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false,
    },
  });

  // Check password strength
  const checkPasswordStrength = (password: string) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password),
    };

    const score = Object.values(requirements).filter(Boolean).length;
    setPasswordStrength({ score, requirements });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'newPassword') {
      checkPasswordStrength(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to change password');
        return;
      }

      toast.success('Password changed successfully!');
      setSuccess(true);
      
      // Reset form
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordStrength({
        score: 0,
        requirements: { length: false, uppercase: false, lowercase: false, number: false, special: false }
      });

    } catch (error) {
      console.error('Password change error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStrengthLabel = () => {
    const { score } = passwordStrength;
    if (score <= 1) return { label: 'Weak', color: 'text-red-500', bg: 'bg-red-500' };
    if (score <= 2) return { label: 'Fair', color: 'text-yellow-500', bg: 'bg-yellow-500' };
    if (score <= 3) return { label: 'Good', color: 'text-blue-500', bg: 'bg-blue-500' };
    if (score <= 4) return { label: 'Strong', color: 'text-blue-600', bg: 'bg-blue-600' };
    return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-600' };
  };

  const strength = getStrengthLabel();

  return (
    <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg">
          <Key className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Change Password</h3>
          <p className="text-sm text-muted-foreground">Update your password anytime to keep your account secure</p>
        </div>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-green-700 dark:text-green-300">Password Changed Successfully</p>
            <p className="text-sm text-green-600 dark:text-green-400">Your password has been updated in the system.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Current Password */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Current Password
          </label>
          <div className="relative">
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handlePasswordChange}
              className="w-full px-4 py-2.5 pr-12 bg-background border border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="Enter current password"
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            New Password
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              name="newPassword"
              value={formData.newPassword}
              onChange={handlePasswordChange}
              className="w-full px-4 py-2.5 pr-12 bg-background border border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="Enter new password"
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {formData.newPassword.length > 0 && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${strength.bg}`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  />
                </div>
                <span className={`text-xs font-medium ${strength.color} min-w-[60px]`}>
                  {strength.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1 text-xs">
                {Object.entries(passwordStrength.requirements).map(([key, value]) => (
                  <div 
                    key={key}
                    className={`flex items-center gap-1.5 ${
                      value ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                    }`}
                  >
                    <span className="text-sm font-bold">{value ? '✓' : '○'}</span>
                    <span className="capitalize">
                      {key === 'length' ? 'Min 8 characters' :
                       key === 'uppercase' ? 'Uppercase letter' :
                       key === 'lowercase' ? 'Lowercase letter' :
                       key === 'number' ? 'Number' :
                       'Special character (!@#$%^&*)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handlePasswordChange}
              className={`w-full px-4 py-2.5 pr-12 bg-background border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                formData.confirmPassword && formData.confirmPassword !== formData.newPassword
                  ? 'border-red-500'
                  : formData.confirmPassword && formData.confirmPassword === formData.newPassword
                  ? 'border-green-500'
                  : 'border-input'
              }`}
              placeholder="Confirm new password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {formData.confirmPassword && formData.confirmPassword === formData.newPassword && (
            <p className="mt-1.5 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" />
              Passwords match
            </p>
          )}
          {formData.confirmPassword && formData.confirmPassword !== formData.newPassword && (
            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              Passwords do not match
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || 
            !formData.currentPassword || 
            !formData.newPassword || 
            !formData.confirmPassword ||
            formData.newPassword !== formData.confirmPassword ||
            passwordStrength.score < 3
          }
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Changing Password...
            </>
          ) : (
            <>
              <Shield className="h-5 w-5" />
              Change Password
            </>
          )}
        </button>
      </form>

      <div className="mt-4 text-center">
        <p className="text-xs text-muted-foreground">
          Password must be at least 8 characters with uppercase, lowercase, number, and special character.
        </p>
      </div>
    </div>
  );
}
