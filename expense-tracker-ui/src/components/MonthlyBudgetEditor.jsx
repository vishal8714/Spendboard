import { useState } from 'react';
import { api } from '../api.js';

// Inline form for the overall monthly budget (all spending, every month).
export default function MonthlyBudgetEditor({ current, notify, onSaved, onCancel }) {
  const [amount, setAmount] = useState(current != null ? String(Number(current)) : '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(action, message) {
    setBusy(true);
    setError('');
    try {
      await action();
      notify('success', message);
      onSaved();
    } catch (err) {
      setError(err.fieldErrors?.amount || err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="mb-editor"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        run(() => api.setOverallBudget(amount === '' ? null : amount), 'Monthly budget saved');
      }}
    >
      <label className={`qa-field mb-input ${error ? 'has-error' : ''}`}>
        <span className="qa-prefix">₹</span>
        <input
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          placeholder="Monthly budget"
          aria-label="Monthly budget"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => e.key === 'Escape' && onCancel()}
          autoFocus
        />
      </label>
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Saving…' : 'Save'}
      </button>
      <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
        Cancel
      </button>
      {current != null && (
        <button
          type="button"
          className="link-btn mb-remove"
          disabled={busy}
          onClick={() => run(() => api.removeOverallBudget(), 'Monthly budget removed')}
        >
          Remove
        </button>
      )}
      {error && <p className="field-error mb-error">{error}</p>}
    </form>
  );
}
