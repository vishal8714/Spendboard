import { useState } from 'react';
import { api } from '../api.js';
import { AVATAR_COLORS, DEFAULT_AVATAR_COLOR, autoInitials } from '../avatar.js';
import { IconCheck } from './Icons.jsx';

// Shown inside the profile drawer: name, profile circle (initials + colour), read-only email.
export default function EditProfileForm({ user, onDone, onCancel }) {
  const [name, setName] = useState(user.name);
  const [initials, setInitials] = useState(user.avatarInitials || ''); // '' = automatic
  const [color, setColor] = useState(user.avatarColor || DEFAULT_AVATAR_COLOR);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const trimmed = name.trim();
  const previewText = initials || autoInitials(trimmed);
  // Picking the default colour is stored as "automatic"
  const colorToSave = color === DEFAULT_AVATAR_COLOR ? '' : color;
  const unchanged =
    trimmed === user.name &&
    initials === (user.avatarInitials || '') &&
    colorToSave === (user.avatarColor || '');

  const clearErrors = (key) => {
    setErrors((er) => ({ ...er, [key]: undefined }));
    setFormError('');
  };

  async function submit(e) {
    e.preventDefault();
    if (!trimmed) {
      setErrors({ name: 'Name is required' });
      return;
    }
    if (unchanged) {
      onCancel();
      return;
    }
    setBusy(true);
    try {
      onDone(await api.updateProfile({ name: trimmed, avatarInitials: initials, avatarColor: colorToSave }));
    } catch (err) {
      if (Object.keys(err.fieldErrors || {}).length) setErrors(err.fieldErrors);
      else setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="drawer-form" onSubmit={submit} noValidate>
      <div className="avatar-preview">
        <span className="avatar avatar-xl" style={{ '--avatar': color }} aria-label="Preview">
          {previewText}
        </span>
      </div>

      <div className="auth-field">
        <label className="prop-heading" htmlFor="profile-name">Name</label>
        <div className={`field ${errors.name ? 'has-error' : ''}`}>
          <input
            id="profile-name"
            type="text"
            autoComplete="name"
            maxLength={100}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearErrors('name');
            }}
            autoFocus
          />
        </div>
        {errors.name && <p className="field-error">{errors.name}</p>}
      </div>

      <div className="auth-field">
        <label className="prop-heading" htmlFor="profile-initials">Initials</label>
        <div className={`field ${errors.avatarInitials ? 'has-error' : ''}`}>
          <input
            id="profile-initials"
            type="text"
            maxLength={2}
            placeholder={autoInitials(trimmed)}
            value={initials}
            onChange={(e) => {
              // letters and digits only, shown in capitals
              setInitials(e.target.value.replace(/[^\p{L}\p{N}]/gu, '').toUpperCase().slice(0, 2));
              clearErrors('avatarInitials');
            }}
          />
        </div>
        {errors.avatarInitials ? (
          <p className="field-error">{errors.avatarInitials}</p>
        ) : (
          <p className="field-hint">Up to 2 characters. Leave empty to use your name's initials.</p>
        )}
      </div>

      <div className="auth-field">
        <span className="prop-heading" id="profile-color-label">Circle colour</span>
        <div className="swatch-grid" role="radiogroup" aria-labelledby="profile-color-label">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={color === c.value}
              aria-label={c.label}
              title={c.label}
              className={`swatch ${color === c.value ? 'is-selected' : ''}`}
              style={{ '--avatar': c.value }}
              onClick={() => {
                setColor(c.value);
                clearErrors('avatarColor');
              }}
            >
              {color === c.value && <IconCheck width={14} height={14} />}
            </button>
          ))}
        </div>
        {errors.avatarColor && <p className="field-error">{errors.avatarColor}</p>}
      </div>

      <div className="auth-field">
        <label className="prop-heading" htmlFor="profile-email">Email</label>
        <div className="field field-readonly">
          <input id="profile-email" type="email" value={user.email} readOnly />
        </div>
        <p className="field-hint">Your email can't be changed.</p>
      </div>

      {formError && <p className="form-error auth-form-error">{formError}</p>}

      <div className="drawer-form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy || unchanged}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
