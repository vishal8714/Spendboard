import { useState } from 'react';
import { api } from '../api.js';

// Shown inside the profile drawer. Google-only accounts (hasPassword = false) set their first password.
export default function ChangePasswordForm({ hasPassword, onDone, onCancel }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
    setFormError('');
  };

  function validate() {
    const er = {};
    if (hasPassword && !form.currentPassword) er.currentPassword = 'Enter your current password';
    if (form.newPassword.length < 8 || form.newPassword.length > 72) {
      er.newPassword = 'Password must be 8 to 72 characters';
    }
    if (form.confirm !== form.newPassword) er.confirm = 'Passwords do not match';
    return er;
  }

  async function submit(e) {
    e.preventDefault();
    const er = validate();
    if (Object.keys(er).length) {
      setErrors(er);
      return;
    }
    setBusy(true);
    try {
      const user = await api.changePassword(hasPassword ? form.currentPassword : null, form.newPassword);
      onDone(user);
    } catch (err) {
      if (Object.keys(err.fieldErrors || {}).length) setErrors(err.fieldErrors);
      else setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const field = (key, label, autoComplete, autoFocus = false) => (
    <div className="auth-field">
      <label className="prop-heading" htmlFor={`cp-${key}`}>{label}</label>
      <div className={`field ${errors[key] ? 'has-error' : ''}`}>
        <input
          id={`cp-${key}`}
          type="password"
          autoComplete={autoComplete}
          value={form[key]}
          onChange={set(key)}
          autoFocus={autoFocus}
        />
      </div>
      {errors[key] && <p className="field-error">{errors[key]}</p>}
    </div>
  );

  return (
    <form className="drawer-form" onSubmit={submit} noValidate>
      {!hasPassword && (
        <p className="field-hint drawer-form-intro">
          You signed up with Google. Set a password to also sign in with your email.
        </p>
      )}
      {hasPassword && field('currentPassword', 'Current password', 'current-password', true)}
      {field('newPassword', 'New password', 'new-password', !hasPassword)}
      {field('confirm', 'Confirm new password', 'new-password')}
      {!errors.newPassword && <p className="field-hint">At least 8 characters.</p>}

      {formError && <p className="form-error auth-form-error">{formError}</p>}

      <div className="drawer-form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : hasPassword ? 'Change password' : 'Set password'}
        </button>
      </div>
    </form>
  );
}
