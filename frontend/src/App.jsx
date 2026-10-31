import { useCallback, useEffect, useRef, useState } from 'react';
import { api, setUnauthorizedHandler } from './api.js';
import { avatarOf } from './avatar.js';
import ExpensesPage from './components/ExpensesPage.jsx';
import CategoriesPage from './components/CategoriesPage.jsx';
import SummaryPage from './components/SummaryPage.jsx';
import AuthPage from './components/AuthPage.jsx';
import Toasts from './components/Toasts.jsx';
import ProfileDrawer from './components/ProfileDrawer.jsx';
import RecurringPage from './components/RecurringPage.jsx';
import AllExpensesPage from './components/AllExpensesPage.jsx';
import BudgetsPage from './components/BudgetsPage.jsx';
import { IconChevronDown, IconTrendUp } from './components/Icons.jsx';

const PAGES = [
  { id: 'expenses', label: 'Expenses' },
  { id: 'all', label: 'All expenses' },
  { id: 'recurring', label: 'Recurring' },
  { id: 'budgets', label: 'Budgets' },
  { id: 'categories', label: 'Categories' },
  { id: 'summary', label: 'Summary' },
];

// "?loginError=google" is added by the backend when Google sign-in fails
function readLoginError() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('loginError')) return '';
  window.history.replaceState(null, '', window.location.pathname);
  return 'Google sign-in failed. Please try again or use your email and password.';
}

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = checking, null = logged out
  const [loginError] = useState(readLoginError);
  const [page, setPage] = useState('expenses');
  const [categories, setCategories] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const nextToastId = useRef(1);
  const closeProfile = useCallback(() => setProfileOpen(false), []);

  const notify = useCallback((type, message) => {
    const id = nextToastId.current++;
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), type === 'error' || type === 'warning' ? 6000 : 3000);
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

  function reload() {
    loadCategories();
    setRefreshKey((k) => k + 1);
  }

  async function logout() {
    setProfileOpen(false);
    try {
      await api.logout();
    } catch {
      // even if the call fails, show the login screen
    }
    setUser(null);
    setCategories([]);
    setPage('expenses');
  }

  // Throws on failure so the drawer can show the error and stay open
  async function deleteAccount() {
    await api.deleteAccount();
    setProfileOpen(false);
    setUser(null);
    setCategories([]);
    setPage('expenses');
    notify('success', 'Your account has been deleted');
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
  const avatar = avatarOf(user);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-logo" aria-hidden="true">
              <IconTrendUp width={18} height={18} />
            </span>
            <span className="brand-name">Spendboard</span>
          </div>

          <nav className="nav" aria-label="Pages">
            {PAGES.map((p) => (
              <button
                key={p.id}
                className={`nav-link ${page === p.id ? 'is-active' : ''}`}
                aria-current={page === p.id ? 'page' : undefined}
                onClick={() => setPage(p.id)}
              >
                {p.label}
              </button>
            ))}
          </nav>

          <button
            className="profile-btn"
            onClick={() => setProfileOpen(true)}
            aria-label="Open profile menu"
            aria-haspopup="dialog"
            aria-expanded={profileOpen}
            title={`${user.name} · ${user.email}`}
          >
            <span className="avatar avatar-md" style={{ '--avatar': avatar.color }}>
              {avatar.text}
            </span>
            <IconChevronDown width={16} height={16} />
          </button>
        </div>
      </header>

      <ProfileDrawer
        open={profileOpen}
        onClose={closeProfile}
        user={user}
        onComingSoon={(label) => notify('info', `${label} is coming soon`)}
        onDeleteAccount={deleteAccount}
        onProfileUpdated={(updated) => {
          setUser(updated);
          notify('success', 'Your profile has been updated');
        }}
        onPasswordChanged={(updated, hadPassword) => {
          setUser(updated);
          notify('success', hadPassword ? 'Your password has been changed' : 'Your password has been set');
        }}
        onReload={() => {
          reload();
          setProfileOpen(false);
        }}
        onLogout={logout}
      />

      <div className="body">
        <main className="main" key={`${page}-${refreshKey}`} aria-label={current.label}>
          {page === 'expenses' && (
            <ExpensesPage categories={categories} notify={notify} onNavigate={setPage} />
          )}
          {page === 'all' && <AllExpensesPage categories={categories} notify={notify} />}
          {page === 'recurring' && <RecurringPage categories={categories} notify={notify} />}
          {page === 'budgets' && <BudgetsPage notify={notify} />}
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
