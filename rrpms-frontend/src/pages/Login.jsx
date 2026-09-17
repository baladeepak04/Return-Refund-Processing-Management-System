import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { ROLE_LABEL, ROLE_PORTAL_PATH } from '../lib/enums.js';
import { DEMO_USERS } from '../data/seed.js';
import { login as loginApi, register as registerApi } from '../lib/api.js';
import Button from '../components/ui/Button.jsx';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState('admin');
  const [email, setEmail] = useState('admin@returnflow.io');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  async function handleRoleSelect(r) {
    setRole(r.role);
    setEmail(r.email);
    setPassword('Password123!');
    setError('');
    setSubmitting(true);
    try {
      const res = await loginApi({ email: r.email, password: 'Password123!' });
      const { token, id, name, email: userEmail, role: userRole } = res.data;
      signIn({ id, name, email: userEmail, role: userRole.toLowerCase() }, token);
      navigate(ROLE_PORTAL_PATH[userRole.toLowerCase()] || '/login');
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          'Could not sign in with demo role — check the backend is running.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      // Authenticate user credentials and receive JWT token
      const res = await loginApi({ email, password });
      const { token, id, name, email: userEmail, role: userRole } = res.data;
      signIn({ id, name, email: userEmail, role: userRole.toLowerCase() }, token);
      navigate(ROLE_PORTAL_PATH[userRole.toLowerCase()] || '/login');
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          'Could not sign in — check the backend is running and credentials are correct.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();
    setError('');
    const cleanEmail = regEmail.trim().toLowerCase();
    if (cleanEmail.endsWith('@returnflow.io')) {
      setError(
        'Public registration is for customers only. @returnflow.io addresses are reserved for internal staff. Please sign in under the Sign In tab.'
      );
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await registerApi({
        name: regName.trim(),
        email: cleanEmail,
        password: regPassword,
      });
      const { token, id, name, email: userEmail, role: userRole } = res.data;
      signIn({ id, name, email: userEmail, role: userRole.toLowerCase() }, token);
      navigate(ROLE_PORTAL_PATH[userRole.toLowerCase()] || '/home');
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          'Could not complete registration. Please check your details and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-bg">
      {/* Left Branding Hero Showcase */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-indigo-950 to-primary-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Ambient background glow accents */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-indigo-400 flex items-center justify-center shadow-lg shadow-primary/30">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M12 2l2.9 6.3L22 9.3l-5 4.9 1.2 7.1L12 17.8l-6.2 3.5L7 14.2 2 9.3l7.1-1z" />
            </svg>
          </div>
          <div>
            <span className="font-heading font-extrabold text-xl tracking-tight text-white block">
              ReturnFlow
            </span>
            <span className="text-[11px] text-indigo-200/80 font-medium tracking-wide">
              Enterprise Reverse Logistics & Refunds
            </span>
          </div>
        </div>

        {/* Center Pitch & Stats */}
        <div className="relative z-10 space-y-6 my-auto max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-indigo-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Enterprise Reverse Logistics & Settlement Suite
          </div>

          <h1 className="text-4xl sm:text-5xl font-heading font-extrabold leading-tight tracking-tight text-white">
            Reverse logistics <br />
            <span className="bg-gradient-to-r from-indigo-200 via-sky-200 to-white bg-clip-text text-transparent">
              orchestration.
            </span>
          </h1>

          <p className="text-sm text-indigo-100/80 leading-relaxed max-w-md">
            Streamline the end-to-end return lifecycle — from customer doorstep
            pickup and automated QC grading to instant SLA refunds and supplier RTM batches.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <StatCard value="12,480" label="Returns Processed" trend="+14% this month" />
            <StatCard value="98.2%" label="Refund SLA Rate" trend="RBI Compliant" />
            <StatCard value="2.3 days" label="Avg Resolution" trend="SLA: < 3 days" />
            <StatCard value="₹4.2Cr" label="Refunds Settled" trend="Zero Discrepancy" />
          </div>
        </div>

        {/* Bottom Compliance Badge */}
        <div className="relative z-10 flex items-center justify-between text-xs text-indigo-200/60 pt-6 border-t border-white/10">
          <span>Enterprise-Grade Security · RBAC</span>
          <span>SOC-2 & ISO 27001 Ready</span>
        </div>
      </div>

      {/* Right Login / Register Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white border border-border/80 rounded-2xl shadow-xl p-8 sm:p-10 transition-all">
          
          {/* Sign In vs Create Account Toggle Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6 border border-border/60">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                !isRegister
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                isRegister
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="mb-5">
            <h2 className="text-2xl font-heading font-extrabold text-text tracking-tight">
              {isRegister ? 'Create Customer Account' : 'Sign In to ReturnFlow'}
            </h2>
            <p className="text-xs text-text-muted mt-1">
              {isRegister
                ? 'Sign up to initiate returns, schedule pickups, and track instant refunds.'
                : 'Select a demo role below or enter your credentials to access the portal'}
            </p>
          </div>

          {!isRegister ? (
            <>
              {/* Demo Role Selector Pills */}
              <div className="bg-slate-50 border border-border/80 rounded-xl p-3.5 mb-6">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Select Portal Role
                  </span>
                </div>
                <div
                  className="grid grid-cols-2 gap-2"
                  role="group"
                  aria-label="Select demo role"
                >
                  {DEMO_USERS.map((r) => (
                    <button
                      type="button"
                      key={r.role}
                      onClick={() => handleRoleSelect(r)}
                      aria-pressed={role === r.role}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-left transition-all duration-150 ${
                        role === r.role
                          ? 'border border-primary bg-white shadow-xs text-primary ring-2 ring-primary/10'
                          : 'border border-transparent bg-white/70 hover:bg-white text-slate-600'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          role === r.role ? 'bg-primary' : 'bg-slate-300'
                        }`}
                      />
                      <span className="truncate">{ROLE_LABEL[r.role]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1.5">
                    Email address
                  </label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                    autoComplete="email"
                    className="w-full bg-white border border-border rounded-lg px-3.5 py-2 text-sm text-text placeholder:text-slate-400 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-text">
                      Password
                    </label>
                    <a
                      href="#"
                      className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      className="w-full bg-white border border-border rounded-lg pl-3.5 pr-12 py-2 text-sm text-text placeholder:text-slate-400 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-pressed={showPassword}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text text-xs font-semibold p-1"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full mt-2 font-semibold text-sm py-2.5 shadow-sm"
                  loading={submitting}
                  disabled={submitting}
                >
                  {submitting ? 'Authenticating…' : 'Sign In to Portal →'}
                </Button>

                {error && (
                  <div
                    role="alert"
                    className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium text-center"
                  >
                    {error}
                  </div>
                )}
              </form>

              <div className="mt-5 text-center border-t border-border pt-4">
                <p className="text-xs text-text-muted">
                  New customer?{' '}
                  <button
                    type="button"
                    onClick={() => { setIsRegister(true); setError(''); }}
                    className="font-semibold text-primary hover:underline"
                  >
                    Create an account →
                  </button>
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Role: Customer Pill Badge */}
              <div className="bg-primary-50/70 border border-primary-200/60 rounded-xl p-3 mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 animate-pulse" />
                  <span className="text-xs font-bold text-primary-900">
                    Role: Customer
                  </span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                  Customer Portal
                </span>
              </div>

              {/* Customer Registration Form */}
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1.5">
                    Full Name
                  </label>
                  <input
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    autoComplete="name"
                    className="w-full bg-white border border-border rounded-lg px-3.5 py-2 text-sm text-text placeholder:text-slate-400 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1.5">
                    Email address
                  </label>
                  <input
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    type="email"
                    required
                    placeholder="e.g. yourname@gmail.com"
                    autoComplete="email"
                    className="w-full bg-white border border-border rounded-lg px-3.5 py-2 text-sm text-text placeholder:text-slate-400 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                  />
                  <p className="text-[11px] text-text-muted mt-1.5 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>For personal customer returns only. Internal staff sign in via employee email.</span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1.5">
                    Password (minimum 6 characters)
                  </label>
                  <input
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full bg-white border border-border rounded-lg px-3.5 py-2 text-sm text-text placeholder:text-slate-400 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full bg-white border border-border rounded-lg px-3.5 py-2 text-sm text-text placeholder:text-slate-400 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                  />
                </div>

                <div className="bg-indigo-50/60 border border-indigo-100 rounded-lg p-3 text-[11px] text-indigo-900 leading-snug">
                  ✓ Instant access to customer self-service returns, OTP pickups, and refund tracking.
                </div>

                <Button
                  type="submit"
                  className="w-full mt-2 font-semibold text-sm py-2.5 shadow-sm"
                  loading={submitting}
                  disabled={submitting}
                >
                  {submitting ? 'Creating Account…' : 'Create Account & Sign In →'}
                </Button>

                {error && (
                  <div
                    role="alert"
                    className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium text-center"
                  >
                    {error}
                  </div>
                )}
              </form>

              <div className="mt-5 text-center border-t border-border pt-4">
                <p className="text-xs text-text-muted">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setIsRegister(false); setError(''); }}
                    className="font-semibold text-primary hover:underline"
                  >
                    Sign in instead →
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ value, label, trend }) {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10 shadow-xs">
      <p className="text-xl font-heading font-extrabold text-white tracking-tight">
        {value}
      </p>
      <p className="text-xs font-medium text-indigo-200/90 mt-0.5">{label}</p>
      {trend && (
        <p className="text-[10px] text-emerald-300 font-semibold mt-1">
          ✓ {trend}
        </p>
      )}
    </div>
  );
}
