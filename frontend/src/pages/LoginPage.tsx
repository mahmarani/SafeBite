import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { PublicLayout } from '../components/layout/PublicLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { validateLoginForm, ValidationErrors } from '../utils/validation';

export function LoginPage() {
  const { login, loginDemo } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = (location.state as { from?: string } | null)?.from || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validation = validateLoginForm(email, password);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    const result = login(email, password);
    if (!result.ok) {
      setFormError(result.error || 'Unable to sign in.');
      return;
    }

    showToast({
      type: 'success',
      title: 'Welcome back',
      description: 'Signed in to your NutriLens workspace.',
    });
    navigate(redirectTo, { replace: true });
  };

  const handleDemoLogin = () => {
    loginDemo();
    showToast({
      type: 'success',
      title: 'Signed in with Demo Account',
      description: 'Exploring as Claire Bennett (claire.bennett@nutrilens.demo).',
    });
    navigate(redirectTo, { replace: true });
  };

  return (
    <PublicLayout>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 flex items-center justify-center">
        <div className="w-full max-w-[440px]">
          <div className="card-surface p-6 sm:p-8">
            <div className="mb-6">
              <h1 className="font-display text-[24px] font-bold tracking-[-0.02em] text-[#1F1A17]">
                Sign in to NutriLens
              </h1>
              <p className="mt-1.5 text-[14px] text-[#5C534A]">
                Access your scanned products, vivid scorecards, and health profile.
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
                  htmlFor="login-email"
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
                    id="login-email"
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
                  htmlFor="login-password"
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
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                    }}
                    placeholder="Enter your password"
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

              <div className="pt-1">
                <Button type="submit" variant="primary" fullWidth>
                  Sign In
                </Button>
              </div>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#E8E1D5]" />
              <span className="text-[12px] text-[#6A6057]">or continue quickly</span>
              <div className="h-px flex-1 bg-[#E8E1D5]" />
            </div>

            <Button type="button" variant="secondary" fullWidth onClick={handleDemoLogin}>
              Sign In with Demo Account
            </Button>

            <div className="mt-5 inset-surface border border-[#E8E1D5] px-3.5 py-2.5 text-[12px] text-[#5C534A] leading-[18px]">
              <span className="font-semibold text-[#1F1A17]">Prototype Notice: </span>
              Authentication uses local browser storage for demonstration only. Demo credentials:
              <span className="font-data font-medium text-[#1F1A17]">
                {' '}
                claire.bennett@nutrilens.demo
              </span>{' '}
              / <span className="font-data font-medium text-[#1F1A17]">demo1234</span>.
            </div>

            <p className="mt-5 text-center text-[13px] text-[#5C534A]">
              New to NutriLens?{' '}
              <Link to="/register" className="font-semibold text-[#1D7A46] hover:text-[#155D35]">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
