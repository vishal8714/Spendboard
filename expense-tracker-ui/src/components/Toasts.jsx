import { IconCheck, IconX } from './Icons.jsx';

export default function Toasts({ toasts, onDismiss }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">{t.type === 'error' ? <IconX /> : <IconCheck />}</span>
          <span className="toast-text">{t.message}</span>
          <button className="toast-close" onClick={() => onDismiss(t.id)} aria-label="Dismiss">
            <IconX width={14} height={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
