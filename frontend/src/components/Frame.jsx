import { IconFrame } from './Icons.jsx';

// A "frame" on the canvas: small label above, white board below.
export default function Frame({ label, meta, actions, children, className = '' }) {
  return (
    <section className={`frame ${className}`}>
      <header className="frame-label">
        <span className="frame-name">
          <IconFrame width={12} height={12} />
          {label}
        </span>
        {meta && <span className="frame-meta">{meta}</span>}
        {actions && <span className="frame-actions">{actions}</span>}
      </header>
      <div className="frame-body">{children}</div>
    </section>
  );
}
