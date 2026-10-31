import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { formatDate, formatMoney } from '../utils.js';
import Frame from './Frame.jsx';
import CategoryChip from './CategoryChip.jsx';
import RecurringInspector from './RecurringInspector.jsx';
import { IconEdit, IconPause, IconPlay, IconTrash } from './Icons.jsx';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// "Every month on the 5th", "Every week on Monday", ...
function describeSchedule({ frequency, startDate }) {
  const [y, m, d] = startDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  switch (frequency) {
    case 'DAILY':
      return 'Every day';
    case 'WEEKLY':
      return `Every week on ${WEEKDAYS[date.getDay()]}`;
    case 'MONTHLY':
      return `Every month on the ${ordinal(d)}`;
    case 'YEARLY':
      return `Every year on ${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
    default:
      return frequency;
  }
}

// Rough monthly cost of the active rules, for the header
const PER_MONTH = { DAILY: 365 / 12, WEEKLY: 52 / 12, MONTHLY: 1, YEARLY: 1 / 12 };

const STATUS_LABEL = { ACTIVE: 'Active', PAUSED: 'Paused', ENDED: 'Ended' };

export default function RecurringPage({ categories, notify }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setRules(await api.listRecurring());
    } catch (err) {
      setLoadError(err.message);
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const monthly = useMemo(
    () =>
      rules
        .filter((r) => r.status === 'ACTIVE')
        .reduce((sum, r) => sum + Number(r.amount) * PER_MONTH[r.frequency], 0),
    [rules]
  );

  async function toggleActive(rule) {
    const resume = rule.status === 'PAUSED';
    try {
      await api.setRecurringActive(rule.id, resume);
      notify('success', resume ? `Resumed “${rule.description}”` : `Paused “${rule.description}”`);
      load();
    } catch (err) {
      notify('error', err.message);
    }
  }

  async function remove(id) {
    try {
      await api.deleteRecurring(id);
      notify('success', 'Recurring expense deleted. Expenses it already added are kept.');
      if (editing?.id === id) setEditing(null);
      setConfirmId(null);
      load();
    } catch (err) {
      notify('error', err.message);
    }
  }

  return (
    <div className="workspace">
      <div className="canvas">
        <div className="canvas-inner">
          <Frame
            label="Recurring expenses"
            meta={`${rules.length} ${rules.length === 1 ? 'rule' : 'rules'}`}
            actions={
              <span className="frame-total" title="Approximate monthly cost of the active rules">
                ≈ {formatMoney(monthly)} / month
              </span>
            }
          >
            {loadError ? (
              <div className="empty empty-error">{loadError}</div>
            ) : loading ? (
              <div className="empty">Loading…</div>
            ) : rules.length === 0 ? (
              <div className="empty">
                No recurring expenses yet. Add rent, subscriptions or bills in the panel on the right, and they’ll
                be added to your expenses automatically on each due date.
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Schedule</th>
                      <th>Next</th>
                      <th className="num">Amount</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map((r) => (
                      <tr
                        key={r.id}
                        className={`${editing?.id === r.id ? 'is-selected' : ''} ${
                          r.status !== 'ACTIVE' ? 'is-dimmed' : ''
                        }`}
                        onClick={() => setEditing(r)}
                      >
                        <td className="desc">{r.description}</td>
                        <td>
                          <CategoryChip category={r.category} />
                        </td>
                        <td className="muted">
                          {describeSchedule(r)}
                          {r.endDate && <div className="sub-line">until {formatDate(r.endDate)}</div>}
                        </td>
                        <td className="mono">
                          {r.status === 'ACTIVE' ? (
                            formatDate(r.nextDate)
                          ) : (
                            <span className={`status-badge status-${r.status.toLowerCase()}`}>
                              {STATUS_LABEL[r.status]}
                            </span>
                          )}
                        </td>
                        <td className="num mono strong">{formatMoney(r.amount)}</td>
                        <td className="row-actions" onClick={(ev) => ev.stopPropagation()}>
                          {confirmId === r.id ? (
                            <span className="confirm">
                              <button className="btn btn-danger btn-sm" onClick={() => remove(r.id)}>
                                Delete
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmId(null)}>
                                Keep
                              </button>
                            </span>
                          ) : (
                            <>
                              {r.status !== 'ENDED' && (
                                <button
                                  className="icon-btn"
                                  onClick={() => toggleActive(r)}
                                  aria-label={r.status === 'PAUSED' ? 'Resume' : 'Pause'}
                                  title={r.status === 'PAUSED' ? 'Resume' : 'Pause'}
                                >
                                  {r.status === 'PAUSED' ? <IconPlay /> : <IconPause />}
                                </button>
                              )}
                              <button className="icon-btn" onClick={() => setEditing(r)} aria-label="Edit">
                                <IconEdit />
                              </button>
                              <button
                                className="icon-btn icon-btn-danger"
                                onClick={() => setConfirmId(r.id)}
                                aria-label="Delete"
                              >
                                <IconTrash />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Frame>
        </div>
      </div>

      <RecurringInspector
        categories={categories}
        editing={editing}
        notify={notify}
        onSaved={() => {
          setEditing(null);
          load();
        }}
        onCancelEdit={() => setEditing(null)}
      />
    </div>
  );
}
