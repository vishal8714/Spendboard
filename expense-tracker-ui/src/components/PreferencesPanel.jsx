import { useState } from 'react';
import { getTheme, setTheme } from '../theme.js';

// Shown inside the profile drawer
export default function PreferencesPanel() {
  const [dark, setDark] = useState(() => getTheme() === 'dark');

  function toggleDark() {
    const next = !dark;
    setDark(next);
    setTheme(next ? 'dark' : 'light');
  }

  return (
    <div className="pref-list">
      <div className="pref-row">
        <div className="pref-text">
          <span className="pref-label" id="pref-dark-label">Dark mode</span>
          <span className="pref-hint">Use a dark theme. Saved on this browser.</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={dark}
          aria-labelledby="pref-dark-label"
          className={`switch ${dark ? 'is-on' : ''}`}
          onClick={toggleDark}
        >
          <span className="switch-knob" />
        </button>
      </div>
    </div>
  );
}
