import { useEffect, useRef, useState } from 'react';
import {
  IconBell,
  IconChevronLeft,
  IconDownload,
  IconHelp,
  IconLock,
  IconLogout,
  IconRefresh,
  IconSliders,
  IconTrash,
  IconUser,
  IconX,
} from './Icons.jsx';
import ChangePasswordForm from './ChangePasswordForm.jsx';
import PreferencesPanel from './PreferencesPanel.jsx';
import EditProfileForm from './EditProfileForm.jsx';
import { avatarOf } from '../avatar.js';

// Items without an action yet show a "Soon" badge and a toast when clicked
const MENU = [
  {
    heading: 'Account',
    items: [
      { label: 'Edit profile', icon: IconUser, action: 'profile' },
      { label: 'Change password', icon: IconLock, action: 'password' },
    ],
  },
  {
    heading: 'Settings',
    items: [
      { label: 'Preferences', icon: IconSliders, action: 'preferences' },
      { label: 'Notifications', icon: IconBell },
    ],
  },
  {
    heading: 'Data',
    items: [
      { label: 'Reload data', icon: IconRefresh, action: 'reload' },
      { label: 'Export expenses', icon: IconDownload },
    ],
  },
  {
    heading: 'Support',
    items: [{ label: 'Help & feedback', icon: IconHelp }],
  },
];

// Slide-in panel from the right, opened from the toolbar avatar.
export default function ProfileDrawer({
  open,
  onClose,
  user,
  onReload,
  onComingSoon,
  onLogout,
  onDeleteAccount,
  onPasswordChanged,
  onProfileUpdated,
}) {
  const panelRef = useRef(null);
  const [view, setView] = useState('menu'); // 'menu' | 'profile' | 'password' | 'preferences'
  const [confirming, setConfirming] = useState(null); // null | 'logout' | 'delete'
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Esc closes; move focus into the panel when it opens
  useEffect(() => {
    if (!open) {
      setConfirming(null); // start fresh next time the drawer opens
      setDeleteError('');
      setView('menu');
      return;
    }
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const avatar = avatarOf(user);
  const passwordLabel =user.hasPassword ? 'Change password' : 'Set password';
  const viewTitle = { profile: 'Edit profile', password: passwordLabel, preferences: 'Preferences' }[view];

  async function handleDelete() {
    setDeleting(true);
    setDeleteError('');
    try {
      await onDeleteAccount();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={`drawer-root ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside
        ref={panelRef}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Profile"
        tabIndex={-1}
      >
        <div className="panel-title">
          {view === 'menu' ? (
            <span>Profile</span>
          ) : (
            <span className="drawer-title-back">
              <button className="icon-btn" onClick={() => setView('menu')} aria-label="Back">
                <IconChevronLeft width={16} height={16} />
              </button>
              {viewTitle}
            </span>
          )}
          <button className="icon-btn" onClick={onClose} aria-label="Close" tabIndex={open ? 0 : -1}>
            <IconX width={16} height={16} />
          </button>
        </div>

        {view === 'password' ? (
          <ChangePasswordForm
            key={user.hasPassword ? 'change' : 'set'}
            hasPassword={user.hasPassword}
            onCancel={() => setView('menu')}
            onDone={(updated) => {
              onPasswordChanged(updated, user.hasPassword);
              setView('menu');
            }}
          />
        ) : view === 'profile' ? (
          <EditProfileForm
            user={user}
            onCancel={() => setView('menu')}
            onDone={(updated) => {
              onProfileUpdated(updated);
              setView('menu');
            }}
          />
        ) : view === 'preferences' ? (
          <PreferencesPanel />
        ) : (
        <>
        <div className="drawer-user">
          <span className="avatar avatar-lg" style={{ '--avatar': avatar.color }}>{avatar.text}</span>
          <div className="sidebar-user-text">
            <span className="drawer-user-name">{user.name}</span>
            <span className="sidebar-user-email">{user.email}</span>
          </div>
        </div>

        {MENU.map((group) => (
          <div key={group.heading} className="panel-section">
            <div className="panel-heading">{group.heading}</div>
            {group.items.map((item) => (
              <button
                key={item.label}
                className="layer"
                onClick={() => {
                  if (item.action === 'reload') onReload();
                  else if (item.action) setView(item.action);
                  else onComingSoon(item.label);
                }}
                tabIndex={open ? 0 : -1}
              >
                <item.icon width={14} height={14} />
                {item.action === 'password' ? passwordLabel : item.label}
                {!item.action && <span className="soon-badge">Soon</span>}
              </button>
            ))}
          </div>
        ))}

        <div className="drawer-footer">
          {confirming === 'logout' && (
            <div className="logout-confirm" role="alertdialog" aria-label="Confirm log out">
              <p className="logout-confirm-text">Do you really want to log out?</p>
              <div className="logout-confirm-actions">
                <button className="btn btn-ghost" onClick={() => setConfirming(null)} autoFocus>
                  No
                </button>
                <button className="btn btn-danger" onClick={onLogout}>
                  Yes, log out
                </button>
              </div>
            </div>
          )}

          {confirming === 'delete' && (
            <div className="logout-confirm" role="alertdialog" aria-label="Confirm account deletion">
              <p className="logout-confirm-text">Delete your account permanently?</p>
              <p className="delete-confirm-note">
                All your expenses and categories will be erased. This cannot be undone.
              </p>
              {deleteError && <p className="form-error delete-error">{deleteError}</p>}
              <div className="logout-confirm-actions">
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setConfirming(null);
                    setDeleteError('');
                  }}
                  disabled={deleting}
                  autoFocus
                >
                  No, keep it
                </button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
              </div>
            </div>
          )}

          {!confirming && (
            <>
              <button
                className="btn btn-ghost btn-block btn-logout"
                onClick={() => setConfirming('logout')}
                tabIndex={open ? 0 : -1}
              >
                <IconLogout width={15} height={15} />
                Log out
              </button>
              <button
                className="btn-delete-account"
                onClick={() => setConfirming('delete')}
                tabIndex={open ? 0 : -1}
              >
                <IconTrash width={13} height={13} />
                Delete my account
              </button>
            </>
          )}
        </div>
        </>
        )}
      </aside>
    </div>
  );
}
