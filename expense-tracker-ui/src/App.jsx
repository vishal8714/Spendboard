import { useCallback, useEffect, useRef, useState } from 'react';
import { api, setUnauthorizedHandler } from './api.js';
import { categoryColor } from './utils.js';
import ExpensesPage from './components/ExpensesPage.jsx';
import CategoriesPage from './components/CategoriesPage.jsx';
import SummaryPage from './components/SummaryPage.jsx';
import AuthPage from './components/AuthPage.jsx';
import Toasts from './components/Toasts.jsx';
import { IconChart, IconList, IconLogout, IconRefresh, IconTag } from './components/Icons.jsx';

const PAGES = [
  { id: 'expenses', label: 'Expenses', icon: IconList },
  { id: 'categories', label: 'Categories', icon: IconTag },
  { id: 'summary', label: 'Summary', icon: IconChart },
];

// "?loginError=google" is added by the backend when Google sign-in fails
function readLoginError() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('loginError')) return '';
  window.history.replaceState(null, '', window.location.pathname);
  return 'Google sign-in failed. Please try again or use your email and password.';
}

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || '?';

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = checking, null = logged out
  const [loginError] = useState(readLoginError);
  const [page, setPage] = useState('expenses');
  const [categories, setCategories] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const nextToastId = useRef(1);

  const notify = useCallback((type, message) => {
    const id = nextToastId.current++;
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), type === 'error' ? 6000 : 3000);
  }, []);

  // Any 401 from the API means the session is gone → show the login screen
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
  }, []);

  // On startup: is there already a valid session cookie?
  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await api.listCategories());
    } catch (err) {
      if (err.status !== 401) notify('error', err.message);
    }
  }, [notify]);

  useEffect(() => {
    if (user) loadCategories();
  }, [user, loadCategories]);

  async function logout() {
    try {
      await api.logout();
    } catch {
      // even if the call fails, show the login screen
    }
    setUser(null);
    setCategories([]);
    setPage('expenses');
  }

  if (user === undefined) {
    return <div className="auth-screen"><div className="empty">Loading…</div></div>;
  }

  if (user === null) {
    return (
      <>
        <AuthPage
          initialError={loginError}
          onLoggedIn={(u) => {
            setUser(u);
            notify('success', `Welcome, ${u.name}`);
          }}
        />
        <Toasts toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
      </>
    );
  }

  const current = PAGES.find((p) => p.id === page);

  return (
    <div className="app">
      <header className="toolbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <i /><i /><i /><i />
          </span>
          <span className="brand-name">Spendboard</span>
        </div>

        <nav className="tabs" aria-label="Pages">
          {PAGES.map((p) => (
            <button
              key={p.id}
              className={`tab ${page === p.id ? 'is-active' : ''}`}
              onClick={() => setPage(p.id)}
            >
              <p.icon width={15} height={15} />
              <span>{p.label}</span>
            </button>
          ))}
        </nav>

        <div className="toolbar-right">
          <button
            className="toolbar-btn"
            onClick={() => {
              loadCategories();
              setRefreshKey((k) => k + 1);
            }}
            aria-label="Reload data"
            title="Reload data"
          >
            <IconRefresh width={15} height={15} />
          </button>
          <span className="avatar" title={`${user.name} · ${user.email}`}>
            {initials(user.name)}
          </span>
          <button className="toolbar-btn" onClick={logout} aria-label="Log out" title="Log out">
            <IconLogout width={15} height={15} />
          </button>
        </div>
      </header>

      <div className="body">
        <aside className="sidebar">
          <div className="panel-section">
            <div className="panel-heading">Pages</div>
            {PAGES.map((p) => (
              <button
                key={p.id}
                className={`layer ${page === p.id ? 'is-active' : ''}`}
                onClick={() => setPage(p.id)}
              >
                <p.icon width={14} height={14} />
                {p.label}
              </button>
            ))}
          </div>

          <div className="panel-section">
            <div className="panel-heading">
              Layers <span className="count">{categories.length}</span>
            </div>
            {categories.map((c) => (
              <div key={c.id} className="layer layer-static">
                <span className="layer-swatch" style={{ background: categoryColor(c.id) }} />
                {c.name}
              </div>
            ))}
          </div>

          <div className="panel-section sidebar-user">
            <span className="avatar avatar-light">{initials(user.name)}</span>
            <div className="sidebar-user-text">
              <span className="sidebar-user-name">{user.name}</span>
              <span className="sidebar-user-email">{user.email}</span>
            </div>
          </div>
        </aside>

        <main className="main" key={`${page}-${refreshKey}`}>
          <div className="breadcrumb">
            <span className="muted">Expense tracker</span>
            <span className="muted">/</span>
            <span>{current.label}</span>
          </div>

          {page === 'expenses' && <ExpensesPage categories={categories} notify={notify} />}
          {page === 'categories' && (
            <CategoriesPage categories={categories} onChanged={loadCategories} notify={notify} />
          )}
          {page === 'summary' && <SummaryPage />}
        </main>
      </div>

      <Toasts toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}
