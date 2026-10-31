import { IconAlert, IconCheck, IconInfo, IconX } from './Icons.jsx';

const TOAST_ICONS = { success: IconCheck, error: IconX, info: IconInfo, warning: IconAlert };

export default function Toasts({ toasts, onDismiss }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => {
        const Icon = TOAST_ICONS[t.type] ?? IconCheck;
        return (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon"><Icon /></span>
          <span className="toast-text">{t.message}</span>
          <button className="toast-close" onClick={() => onDismiss(t.id)} aria-label="Dismiss">
            <IconX width={14} height={14} />
          </button>
        </div>
        );
      })}
    </div>
  );
}
