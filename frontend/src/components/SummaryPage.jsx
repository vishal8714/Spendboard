import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { categoryColor, currentMonth, formatMoney, monthLabel, shiftMonth } from '../utils.js';
import Frame from './Frame.jsx';
import { IconChevronLeft, IconChevronRight } from './Icons.jsx';

export default function SummaryPage() {
  const [month, setMonth] = useState(currentMonth);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!month) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .monthlySummary(month)
      .then((data) => !cancelled && setSummary(data))
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setSummary(null);
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [month]);

  const total = Number(summary?.total ?? 0);
  const rows = summary?.byCategory ?? [];
  const top = rows[0];

  return (
    <div className="canvas">
      <div className="canvas-inner">
        <div className="month-bar">
          <button className="icon-btn icon-btn-lg" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Previous month">
            <IconChevronLeft />
          </button>
          <h1 className="month-title">{monthLabel(month)}</h1>
          <button className="icon-btn icon-btn-lg" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="Next month">
            <IconChevronRight />
          </button>
          <input
            className="month-input"
            type="month"
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
          />
        </div>

        {error ? (
          <Frame label="Summary">
            <div className="empty empty-error">{error}</div>
          </Frame>
        ) : (
          <>
            <div className="stat-row">
              <Frame label="Total spent" className="frame-stat">
                <div className="stat-value">{loading ? '…' : formatMoney(total)}</div>
              </Frame>
              <Frame label="Categories" className="frame-stat">
                <div className="stat-value">{loading ? '…' : rows.length}</div>
              </Frame>
              <Frame label="Biggest" className="frame-stat">
                <div className="stat-value stat-value-sm">
                  {loading ? '…' : top ? top.categoryName : '—'}
                </div>
                {!loading && top && <div className="stat-sub mono">{formatMoney(top.total)}</div>}
              </Frame>
            </div>

            <Frame label="By category" meta={summary?.month}>
              {loading ? (
                <div className="empty">Loading…</div>
              ) : rows.length === 0 ? (
                <div className="empty">No expenses in {monthLabel(month)}.</div>
              ) : (
                <>
                  <div className="stacked" aria-hidden="true">
                    {rows.map((r) => (
                      <span
                        key={r.categoryId}
                        style={{
                          width: `${(Number(r.total) / total) * 100}%`,
                          background: categoryColor(r.categoryId),
                        }}
                        title={`${r.categoryName}: ${formatMoney(r.total)}`}
                      />
                    ))}
                  </div>
                  <ul className="bars">
                    {rows.map((r) => {
                      const pct = total ? (Number(r.total) / total) * 100 : 0;
                      return (
                        <li key={r.categoryId} className="bar-row" style={{ '--chip': categoryColor(r.categoryId) }}>
                          <div className="bar-head">
                            <span className="bar-name">
                              <span className="chip-dot" />
                              {r.categoryName}
                            </span>
                            <span className="bar-figures">
                              <span className="mono strong">{formatMoney(r.total)}</span>
                              <span className="muted mono">{pct.toFixed(1)}%</span>
                            </span>
                          </div>
                          <div className="bar-track">
                            <div className="bar-fill" style={{ width: `${Math.max(pct, 0.5)}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </Frame>
          </>
        )}
      </div>
    </div>
  );
}
