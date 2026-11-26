import React, { useState } from 'react';
import { AlertCircle, Check, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { PublicLayout } from '../components/layout/PublicLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { validateRegisterForm, ValidationErrors } from '../utils/validation';

export function RegisterPage() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validation = validateRegisterForm({
      fullName,
      email,
      password,
      confirmPassword,
      acceptedTerms,
    });
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    const result = register({ fullName, email, password });
    if (!result.ok) {
      setFormError(result.error || 'Could not create account.');
      return;
    }

    showToast({
      type: 'success',
      title: 'Account created',
      description: 'Welcome to NutriLens. You can customize your health profile anytime.',
    });
    navigate('/dashboard', { replace: true });
  };

  return (
    <PublicLayout>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 flex items-center justify-center">
        <div className="w-full max-w-[460px]">
          <div className="card-surface p-6 sm:p-8">
            <div className="mb-6">
              <h1 className="font-display text-[24px] font-bold tracking-[-0.02em] text-[#1F1A17]">
                Create your NutriLens account
              </h1>
              <p className="mt-1.5 text-[14px] text-[#5C534A]">
                Start analyzing food ingredient labels and personalizing nutritional insights.
              </p>
            </div>

            {formError && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2.5 rounded-[9px] bg-[#FDECEC] border border-[#F7BEBC] px-3.5 py-3 text-[13px] text-[#9B1F1B]"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#D43832]" strokeWidth={2} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="reg-name"
                  className="block text-[13px] font-semibold text-[#1F1A17] mb-1.5"
                >
                  Full name
                </label>
                <div className="relative">
                  <User
                    className="w-4 h-4 text-[#8A7F74] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    strokeWidth={1.6}
                  />
                  <input
                    id="reg-name"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
                    }}
                    placeholder="Claire Bennett"
                    className={`input-field h-[42px] w-full pl-10 pr-3.5 text-[14px] ${
                      errors.fullName ? 'input-field-error' : ''
                    }`}
                  />
                </div>
                {errors.fullName && (
                  <p className="mt-1.5 text-[12px] text-[#9B1F1B]">{errors.fullName}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="reg-email"
                  className="block text-[13px] font-semibold text-[#1F1A17] mb-1.5"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail
                    className="w-4 h-4 text-[#8A7F74] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    strokeWidth={1.6}
                  />
                  <input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    placeholder="you@example.com"
                    className={`input-field h-[42px] w-full pl-10 pr-3.5 text-[14px] ${
                      errors.email ? 'input-field-error' : ''
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-[12px] text-[#9B1F1B]">{errors.email}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-[13px] font-semibold text-[#1F1A17] mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="w-4 h-4 text-[#8A7F74] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    strokeWidth={1.6}
                  />
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                    }}
                    placeholder="Minimum 8 characters"
                    className={`input-field h-[42px] w-full pl-10 pr-10 text-[14px] ${
                      errors.password ? 'input-field-error' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded text-[#8A7F74] hover:text-[#1F1A17] cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" strokeWidth={1.6} />
                    ) : (
                      <Eye className="w-4 h-4" strokeWidth={1.6} />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-[12px] text-[#9B1F1B]">{errors.password}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="reg-confirm"
                  className="block text-[13px] font-semibold text-[#1F1A17] mb-1.5"
                >
                  Confirm password
                </label>
                <div className="relative">
                  <Lock
                    className="w-4 h-4 text-[#8A7F74] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    strokeWidth={1.6}
                  />
                  <input
                    id="reg-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) {
                        setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                      }
                    }}
                    placeholder="Re-enter your password"
                    className={`input-field h-[42px] w-full pl-10 pr-10 text-[14px] ${
                      errors.confirmPassword ? 'input-field-error' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded text-[#8A7F74] hover:text-[#1F1A17] cursor-pointer"
                  >
                    {showConfirm ? (
                      <EyeOff className="w-4 h-4" strokeWidth={1.6} />
                    ) : (
                      <Eye className="w-4 h-4" strokeWidth={1.6} />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1.5 text-[12px] text-[#9B1F1B]">{errors.confirmPassword}</p>
                )}
              </div>

              <div>
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={acceptedTerms}
                    onClick={() => {
                      setAcceptedTerms((prev) => !prev);
                      if (errors.acceptedTerms) {
                        setErrors((prev) => ({ ...prev, acceptedTerms: '' }));
                      }
                    }}
                    className={`mt-0.5 w-[18px] h-[18px] rounded-[4px] border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                      acceptedTerms
                        ? 'bg-[#1D7A46] border-[#1D7A46] text-white'
                        : 'bg-white border-[#D5C9B6]'
                    }`}
                  >
                    {acceptedTerms && <Check className="w-3 h-3" strokeWidth={2.5} />}
                  </button>
                  <span className="text-[13px] leading-[19px] text-[#5C534A]">
                    I agree to the NutriLens prototype terms and understand that product scores
                    and insights are informational demonstrations, not medical advice.
                  </span>
                </label>
                {errors.acceptedTerms && (
                  <p className="mt-1.5 text-[12px] text-[#9B1F1B]">{errors.acceptedTerms}</p>
                )}
              </div>

              <div className="pt-1">
                <Button type="submit" variant="primary" fullWidth>
                  Create Account
                </Button>
              </div>
            </form>

            <p className="mt-5 text-center text-[13px] text-[#5C534A]">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-[#1D7A46] hover:text-[#155D35]">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
