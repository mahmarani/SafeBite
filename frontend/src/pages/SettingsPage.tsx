import React, { useState } from 'react';
import {
  AlertTriangle,
  Bell,
  HeartPulse,
  Lock,
  Shield,
  Trash2,
  User,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { validateEmail, validatePasswordChange, ValidationErrors } from '../utils/validation';

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="py-3.5 flex items-start justify-between gap-4 border-b border-[#EFE9DF] last:border-b-0">
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-[#1F1A17]">{label}</p>
        <p className="text-[12px] text-[#6A6057] mt-0.5 leading-[18px]">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors duration-150 cursor-pointer mt-0.5 ${
          checked
            ? 'bg-[#1D7A46] border-[#1D7A46]'
            : 'bg-[#E8E1D5] border-[#D5C9B6]'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow-xs transform transition-transform duration-150 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export function SettingsPage() {
  const { user, updateAccount, changePassword, deleteAccount } = useAuth();
  const {
    preferences,
    updatePreferences,
    clearAllAnalyses,
    resetHealthProfile,
    stats,
  } = useAppData();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [accountErrors, setAccountErrors] = useState<ValidationErrors>({});

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<ValidationErrors>({});

  const [confirmModal, setConfirmModal] = useState<
    null | 'reset-profile' | 'clear-history' | 'delete-account'
  >(null);

  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: ValidationErrors = {};
    if (!fullName.trim()) errs.fullName = 'Full name is required.';
    const emailErr = validateEmail(email);
    if (emailErr) errs.email = emailErr;
    setAccountErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const result = updateAccount({ fullName, email });
    if (!result.ok) {
      showToast({
        type: 'error',
        title: 'Could not update account',
        description: result.error,
      });
      return;
    }

    showToast({
      type: 'success',
      title: 'Account details updated',
      description: 'Your name and email address have been saved.',
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validatePasswordChange({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    setPasswordErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const result = changePassword(currentPassword, newPassword);
    if (!result.ok) {
      setPasswordErrors({ currentPassword: result.error || 'Incorrect password.' });
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    showToast({
      type: 'success',
      title: 'Password updated',
      description: 'Your local prototype password has been updated.',
    });
  };

  const handleConfirmedAction = () => {
    if (confirmModal === 'reset-profile') {
      resetHealthProfile();
      showToast({
        type: 'info',
        title: 'Health profile cleared',
        description: 'All allergies, conditions, and dietary selections were reset.',
      });
    } else if (confirmModal === 'clear-history') {
      clearAllAnalyses();
      showToast({
        type: 'info',
        title: 'Analysis history cleared',
        description: 'All scanned product records have been removed.',
      });
    } else if (confirmModal === 'delete-account') {
      deleteAccount();
      showToast({
        type: 'info',
        title: 'Account deleted',
        description: 'Your local NutriLens session and stored data have been erased.',
      });
      navigate('/login', { replace: true });
    }
    setConfirmModal(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="font-display text-[26px] sm:text-[30px] leading-[36px] font-extrabold tracking-[-0.02em] text-[#1F1A17]">
            Account &amp; Settings
          </h1>
          <p className="mt-1 text-[14px] text-[#5C534A]">
            Manage your account information, security, notifications, privacy, and stored data.
          </p>
        </div>

        {/* Account Information */}
        <section className="card-surface p-5 sm:p-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#E8E1D5]">
            <User className="w-5 h-5 text-[#1D7A46]" strokeWidth={1.8} />
            <div>
              <h2 className="font-display text-[17px] font-bold text-[#1F1A17]">
                Account Information
              </h2>
              <p className="text-[12px] text-[#6A6057]">
                Update your display name and login email address.
              </p>
            </div>
          </div>

          <form onSubmit={handleAccountSubmit} noValidate className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="settings-name"
                  className="block text-[13px] font-semibold text-[#1F1A17] mb-1.5"
                >
                  Full name
                </label>
                <input
                  id="settings-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (accountErrors.fullName) setAccountErrors((p) => ({ ...p, fullName: '' }));
                  }}
                  className={`input-field h-[42px] w-full px-3.5 text-[14px] ${
                    accountErrors.fullName ? 'input-field-error' : ''
                  }`}
                />
                {accountErrors.fullName && (
                  <p className="mt-1 text-[12px] text-[#9B1F1B]">{accountErrors.fullName}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="settings-email"
                  className="block text-[13px] font-semibold text-[#1F1A17] mb-1.5"
                >
                  Email address
                </label>
                <input
                  id="settings-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (accountErrors.email) setAccountErrors((p) => ({ ...p, email: '' }));
                  }}
                  className={`input-field h-[42px] w-full px-3.5 text-[14px] ${
                    accountErrors.email ? 'input-field-error' : ''
                  }`}
                />
                {accountErrors.email && (
                  <p className="mt-1 text-[12px] text-[#9B1F1B]">{accountErrors.email}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="md">
                Update Account
              </Button>
            </div>
          </form>
        </section>

        {/* Change Password */}
        <section className="card-surface p-5 sm:p-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#E8E1D5]">
            <Lock className="w-5 h-5 text-[#1D7A46]" strokeWidth={1.8} />
            <div>
              <h2 className="font-display text-[17px] font-bold text-[#1F1A17]">
                Change Password
              </h2>
              <p className="text-[12px] text-[#6A6057]">
                Frontend password update simulation (demo account default is demo1234).
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} noValidate className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="settings-cur-pw"
                  className="block text-[13px] font-semibold text-[#1F1A17] mb-1.5"
                >
                  Current password
                </label>
                <input
                  id="settings-cur-pw"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (passwordErrors.currentPassword) {
                      setPasswordErrors((p) => ({ ...p, currentPassword: '' }));
                    }
                  }}
                  className={`input-field h-[42px] w-full px-3.5 text-[14px] ${
                    passwordErrors.currentPassword ? 'input-field-error' : ''
                  }`}
                />
                {passwordErrors.currentPassword && (
                  <p className="mt-1 text-[12px] text-[#9B1F1B]">
                    {passwordErrors.currentPassword}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="settings-new-pw"
                  className="block text-[13px] font-semibold text-[#1F1A17] mb-1.5"
                >
                  New password
                </label>
                <input
                  id="settings-new-pw"
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (passwordErrors.newPassword) {
                      setPasswordErrors((p) => ({ ...p, newPassword: '' }));
                    }
                  }}
                  placeholder="Min 8 characters"
                  className={`input-field h-[42px] w-full px-3.5 text-[14px] ${
                    passwordErrors.newPassword ? 'input-field-error' : ''
                  }`}
                />
                {passwordErrors.newPassword && (
                  <p className="mt-1 text-[12px] text-[#9B1F1B]">{passwordErrors.newPassword}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="settings-confirm-pw"
                  className="block text-[13px] font-semibold text-[#1F1A17] mb-1.5"
                >
                  Confirm new password
                </label>
                <input
                  id="settings-confirm-pw"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (passwordErrors.confirmPassword) {
                      setPasswordErrors((p) => ({ ...p, confirmPassword: '' }));
                    }
                  }}
                  className={`input-field h-[42px] w-full px-3.5 text-[14px] ${
                    passwordErrors.confirmPassword ? 'input-field-error' : ''
                  }`}
                />
                {passwordErrors.confirmPassword && (
                  <p className="mt-1 text-[12px] text-[#9B1F1B]">
                    {passwordErrors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="secondary" size="md">
                Update Password
              </Button>
            </div>
          </form>
        </section>

        {/* Notifications & Privacy */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="card-surface p-5 sm:p-6">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#E8E1D5]">
              <Bell className="w-5 h-5 text-[#1D7A46]" strokeWidth={1.8} />
              <h2 className="font-display text-[17px] font-bold text-[#1F1A17]">
                Notification Preferences
              </h2>
            </div>

            <div className="mt-1">
              <ToggleRow
                label="Allergen conflict alerts"
                description="Highlight high-priority banner warnings when scanned labels match listed allergies."
                checked={preferences.notifications.allergenAlerts}
                onChange={(val) => {
                  updatePreferences({
                    ...preferences,
                    notifications: { ...preferences.notifications, allergenAlerts: val },
                  });
                  showToast({ type: 'success', title: 'Notification preference saved' });
                }}
              />
              <ToggleRow
                label="Weekly nutrition digest"
                description="Summarize average pantry grades and sodium/sugar trends once per week."
                checked={preferences.notifications.weeklySummary}
                onChange={(val) => {
                  updatePreferences({
                    ...preferences,
                    notifications: { ...preferences.notifications, weeklySummary: val },
                  });
                  showToast({ type: 'success', title: 'Notification preference saved' });
                }}
              />
              <ToggleRow
                label="Comparison recommendations"
                description="Suggest healthier alternatives when viewing products in the D–E tier."
                checked={preferences.notifications.comparisonTips}
                onChange={(val) => {
                  updatePreferences({
                    ...preferences,
                    notifications: { ...preferences.notifications, comparisonTips: val },
                  });
                  showToast({ type: 'success', title: 'Notification preference saved' });
                }}
              />
            </div>
          </section>

          <section className="card-surface p-5 sm:p-6">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#E8E1D5]">
              <Shield className="w-5 h-5 text-[#1D7A46]" strokeWidth={1.8} />
              <h2 className="font-display text-[17px] font-bold text-[#1F1A17]">
                Privacy Preferences
              </h2>
            </div>

            <div className="mt-1">
              <ToggleRow
                label="Apply health profile by default"
                description="Pre-check personalized health profile evaluation on the product scanner."
                checked={preferences.privacy.applyProfileByDefault}
                onChange={(val) => {
                  updatePreferences({
                    ...preferences,
                    privacy: { ...preferences.privacy, applyProfileByDefault: val },
                  });
                  showToast({ type: 'success', title: 'Privacy preference saved' });
                }}
              />
              <ToggleRow
                label="Store uploaded label previews locally"
                description="Keep label image thumbnails in browser storage for your analysis history."
                checked={preferences.privacy.saveScanImagesLocally}
                onChange={(val) => {
                  updatePreferences({
                    ...preferences,
                    privacy: { ...preferences.privacy, saveScanImagesLocally: val },
                  });
                  showToast({ type: 'success', title: 'Privacy preference saved' });
                }}
              />
              <ToggleRow
                label="Opt in to anonymized model feedback"
                description="Placeholder preference for future ML accuracy improvements (no data sent now)."
                checked={preferences.privacy.anonymizedTelemetryOptIn}
                onChange={(val) => {
                  updatePreferences({
                    ...preferences,
                    privacy: { ...preferences.privacy, anonymizedTelemetryOptIn: val },
                  });
                  showToast({ type: 'success', title: 'Privacy preference saved' });
                }}
              />
            </div>
          </section>
        </div>

        {/* Data Management & Danger Zone */}
        <section className="card-surface p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E8E1D5]">
            <AlertTriangle className="w-5 h-5 text-[#E59417]" strokeWidth={2} />
            <div>
              <h2 className="font-display text-[17px] font-bold text-[#1F1A17]">
                Data Management
              </h2>
              <p className="text-[12px] text-[#6A6057]">
                Control your health profile data, analysis records, and local account.
              </p>
            </div>
          </div>

          <div className="divide-y divide-[#EFE9DF]">
            <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-[14px] font-semibold text-[#1F1A17]">Manage health profile data</p>
                <p className="text-[12px] text-[#6A6057]">
                  Edit your saved allergies and conditions, or clear all profile entries.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link to="/profile">
                  <Button variant="secondary" size="sm">
                    <HeartPulse className="w-3.5 h-3.5" strokeWidth={1.8} />
                    <span>Edit Profile</span>
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmModal('reset-profile')}
                >
                  Reset Profile
                </Button>
              </div>
            </div>

            <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-[14px] font-semibold text-[#1F1A17]">Clear analysis history</p>
                <p className="text-[12px] text-[#6A6057]">
                  Permanently remove all {stats.totalScanned} scanned product record
                  {stats.totalScanned === 1 ? '' : 's'} from local storage.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={stats.totalScanned === 0}
                onClick={() => setConfirmModal('clear-history')}
                className="text-[#9B1F1B] hover:bg-[#FDECEC] hover:border-[#F7BEBC] shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                <span>Clear History</span>
              </Button>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-[14px] font-bold text-[#9B1F1B]">Delete account</p>
                <p className="text-[12px] text-[#5C534A]">
                  Remove your mock account, health profile, preferences, and analysis history from
                  this browser.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmModal('delete-account')}
                className="shrink-0"
              >
                Delete Account
              </Button>
            </div>
          </div>
        </section>
      </div>

      <Modal
        open={confirmModal === 'reset-profile'}
        title="Reset health profile data?"
        description="This will clear your selected allergies, medical conditions, dietary preferences, and health goals. You can re-enter them at any time."
        confirmLabel="Reset Profile"
        confirmVariant="danger"
        onConfirm={handleConfirmedAction}
        onClose={() => setConfirmModal(null)}
      />

      <Modal
        open={confirmModal === 'clear-history'}
        title="Clear all analysis history?"
        description={`This will delete all ${stats.totalScanned} analyzed product records and bookmarks from your workspace.`}
        confirmLabel="Clear All History"
        confirmVariant="danger"
        onConfirm={handleConfirmedAction}
        onClose={() => setConfirmModal(null)}
      />

      <Modal
        open={confirmModal === 'delete-account'}
        title="Delete your NutriLens account?"
        description="This action permanently deletes your local account credentials, health profile, and product history, and signs you out immediately."
        confirmLabel="Delete Account"
        confirmVariant="danger"
        onConfirm={handleConfirmedAction}
        onClose={() => setConfirmModal(null)}
      />
    </DashboardLayout>
  );
}
