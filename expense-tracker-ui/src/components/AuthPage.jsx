import { useEffect, useState } from 'react';
import { api, ApiError } from '../api.js';
import { IconTrendUp } from './Icons.jsx';

const RESEND_SECONDS = 60;

// Step 2 of sign-up: type the 6-digit code from the email
function VerifyStep({ email, notice, onVerified, onBack }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState(notice);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code');
      return;
    }
    setBusy(true);
    try {
      onVerified(await api.verifyEmail(email, code));
    } catch (err) {
      setError(err.fieldErrors?.code || err.message);
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError('');
    try {
      await api.resendCode(email);
      setInfo(`We've sent a new code to ${email}.`);
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="auth-form">
      <div className="verify-intro">
        <div className="verify-icon" aria-hidden="true">✉</div>
        <p className="verify-title">Check your email</p>
        <p className="verify-text">
          Enter the 6-digit code we sent to <strong>{email}</strong>. It expires in 10 minutes.
        </p>
      </div>

      {info && <p className="form-info">{info}</p>}

      <form onSubmit={submit} noValidate className="auth-form">
        <div className="auth-field">
          <label className="prop-heading" htmlFor="code">Verification code</label>
          <div className={`field field-code ${error ? 'has-error' : ''}`}>
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              autoFocus
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                setError('');
              }}
            />
          </div>
          {error && <p className="field-error">{error}</p>}
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Checking…' : 'Verify and continue'}
        </button>
      </form>

      <div className="verify-links">
        <button className="link-btn" onClick={resend} disabled={cooldown > 0}>
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </button>
        <button className="link-btn" onClick={onBack}>Use a different email</button>
      </div>
    </div>
  );
}

// Forgot password: step 1 asks for the email, step 2 takes the code + new password
function ResetPasswordFlow({ initialEmail, onDone, onBack }) {
  const [step, setStep] = useState('email'); // 'email' | 'reset'
  const [email, setEmail] = useState(initialEmail || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function requestCode(e) {
    e?.preventDefault();
    setErrors({});
    setFormError('');
    setBusy(true);
    try {
      await api.forgotPassword(email);
      setInfo(`If an account exists for ${email.trim()}, we've emailed it a 6-digit code.`);
      setStep('reset');
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      if (Object.keys(err.fieldErrors || {}).length) setErrors(err.fieldErrors);
      else setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function reset(e) {
    e.preventDefault();
    setErrors({});
    setFormError('');
    if (!/^\d{6}$/.test(code)) {
      setErrors({ code: 'Enter the 6-digit code' });
      return;
    }
    setBusy(true);
    try {
      onDone(await api.resetPassword(email, code, password));
    } catch (err) {
      if (Object.keys(err.fieldErrors || {}).length) setErrors(err.fieldErrors);
      else setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-form">
      <div className="verify-intro">
        <div className="verify-icon" aria-hidden="true">🔑</div>
        <p className="verify-title">Reset your password</p>
        <p className="verify-text">
          {step === 'email'
            ? "Enter your account's email and we'll send you a code."
            : 'Enter the code from the email and choose a new password.'}
        </p>
      </div>

      {step === 'email' ? (
        <form onSubmit={requestCode} noValidate className="auth-form">
          <div className="auth-field">
            <label className="prop-heading" htmlFor="reset-email">Email</label>
            <div className={`field ${errors.email ? 'has-error' : ''}`}>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors({});
                }}
              />
            </div>
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>
          {formError && <p className="form-error auth-form-error">{formError}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset code'}
          </button>
        </form>
      ) : (
        <form onSubmit={reset} noValidate className="auth-form">
          {info && <p className="form-info">{info}</p>}
          <div className="auth-field">
            <label className="prop-heading" htmlFor="reset-code">Code</label>
            <div className={`field field-code ${errors.code ? 'has-error' : ''}`}>
              <input
                id="reset-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                autoFocus
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setErrors((er) => ({ ...er, code: undefined }));
                }}
              />
            </div>
            {errors.code && <p className="field-error">{errors.code}</p>}
          </div>
          <div className="auth-field">
            <label className="prop-heading" htmlFor="new-password">New password</label>
            <div className={`field ${errors.newPassword ? 'has-error' : ''}`}>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((er) => ({ ...er, newPassword: undefined }));
                }}
              />
            </div>
            {errors.newPassword ? (
              <p className="field-error">{errors.newPassword}</p>
            ) : (
              <p className="field-hint">At least 8 characters</p>
            )}
          </div>
          {formError && <p className="form-error auth-form-error">{formError}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Saving…' : 'Set new password'}
          </button>
        </form>
      )}

      <div className="verify-links">
        {step === 'reset' ? (
          <button className="link-btn" onClick={() => requestCode()} disabled={cooldown > 0 || busy}>
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </button>
        ) : (
          <span />
        )}
        <button className="link-btn" onClick={onBack}>Back to sign in</button>
      </div>
    </div>
  );
}

export default function AuthPage({ onLoggedIn, initialError }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'verify'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(initialError || '');
  const [busy, setBusy] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [verify, setVerify] = useState(null); // { email, notice }

  useEffect(() => {
    api
      .authConfig()
      .then((cfg) => setGoogleEnabled(Boolean(cfg?.googleEnabled)))
      .catch(() => setGoogleEnabled(false));
  }, []);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  function switchMode(next) {
    setMode(next);
    setErrors({});
    setFormError('');
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError('');
    try {
      if (mode === 'login') {
        onLoggedIn(await api.login(form.email, form.password));
      } else {
        const res = await api.register(form.name, form.email, form.password);
        setVerify({ email: res.email, notice: '' });
        setMode('verify');
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        // Right password, but the email was never verified: the server just sent a code
        setVerify({ email: form.email.trim().toLowerCase(), notice: err.message });
        setMode('verify');
      } else if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
        setErrors(err.fieldErrors);
      } else {
        setFormError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  const isLogin = mode === 'login';
  const label =
    mode === 'verify' ? 'Verify email' : mode === 'forgot' ? 'Reset password' : isLogin ? 'Sign in' : 'Create account';

  return (
    <div className="auth-screen">
      <div className="auth-wrap">
        <div className="auth-brand">
          <span className="brand-logo brand-logo-lg" aria-hidden="true">
            <IconTrendUp width={22} height={22} />
          </span>
          <span className="auth-brand-name">Spendboard</span>
        </div>

        <section className="frame">
          <header className="frame-label">
            <span className="frame-name">{label}</span>
          </header>
          <div className="frame-body auth-card">
            {mode === 'forgot' ? (
              <ResetPasswordFlow
                initialEmail={form.email}
                onDone={onLoggedIn}
                onBack={() => switchMode('login')}
              />
            ) : mode === 'verify' ? (
              <VerifyStep
                email={verify.email}
                notice={verify.notice}
                onVerified={onLoggedIn}
                onBack={() => {
                  setVerify(null);
                  switchMode('register');
                }}
              />
            ) : (
              <>
                <div className="segmented" role="tablist">
                  <button
                    role="tab"
                    aria-selected={isLogin}
                    className={isLogin ? 'is-active' : ''}
                    onClick={() => switchMode('login')}
                  >
                    Sign in
                  </button>
                  <button
                    role="tab"
                    aria-selected={!isLogin}
                    className={!isLogin ? 'is-active' : ''}
                    onClick={() => switchMode('register')}
                  >
                    Create account
                  </button>
                </div>

                {googleEnabled && (
                  <>
                    <a className="btn btn-ghost btn-block btn-google" href={api.googleLoginUrl}>
                      <span className="google-dot" aria-hidden="true">G</span>
                      Continue with Google
                    </a>
                    <div className="divider"><span>or with email</span></div>
                  </>
                )}

                <form onSubmit={submit} noValidate className="auth-form">
                  {!isLogin && (
                    <div className="auth-field">
                      <label className="prop-heading" htmlFor="name">Name</label>
                      <div className={`field ${errors.name ? 'has-error' : ''}`}>
                        <input id="name" autoComplete="name" value={form.name} onChange={set('name')} />
                      </div>
                      {errors.name && <p className="field-error">{errors.name}</p>}
                    </div>
                  )}

                  <div className="auth-field">
                    <label className="prop-heading" htmlFor="email">Email</label>
                    <div className={`field ${errors.email ? 'has-error' : ''}`}>
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={form.email}
                        onChange={set('email')}
                      />
                    </div>
                    {errors.email && <p className="field-error">{errors.email}</p>}
                  </div>

                  <div className="auth-field">
                    <div className="label-row">
                      <label className="prop-heading" htmlFor="password">Password</label>
                      {isLogin && (
                        <button type="button" className="link-btn link-btn-sm" onClick={() => switchMode('forgot')}>
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className={`field ${errors.password ? 'has-error' : ''}`}>
                      <input
                        id="password"
                        type="password"
                        autoComplete={isLogin ? 'current-password' : 'new-password'}
                        value={form.password}
                        onChange={set('password')}
                      />
                    </div>
                    {errors.password ? (
                      <p className="field-error">{errors.password}</p>
                    ) : (
                      !isLogin && <p className="field-hint">At least 8 characters. We'll email you a code to confirm your address.</p>
                    )}
                  </div>

                  {formError && <p className="form-error auth-form-error">{formError}</p>}

                  <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                    {busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
                  </button>
                </form>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}