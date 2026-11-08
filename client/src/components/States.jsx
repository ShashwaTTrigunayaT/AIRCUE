import { AlertTriangle, Info, Loader2, RefreshCw } from 'lucide-react';

export function SectionHeading({ eyebrow, title, description, action, id }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 id={id}>{title}</h2>
        {description ? <p className="section-description">{description}</p> : null}
      </div>
      {action ? <div className="section-action">{action}</div> : null}
    </div>
  );
}

export function Badge({ children, tone = 'neutral', icon: Icon, className = '' }) {
  return (
    <span className={`badge badge-${tone} ${className}`.trim()}>
      {Icon ? <Icon size={13} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export function LoadingState({ label = 'Loading air-quality data…', rows = 3 }) {
  return (
    <div className="state-block" role="status" aria-live="polite">
      <Loader2 className="spin" size={22} aria-hidden="true" />
      <p>{label}</p>
      <div className="skeleton-stack" aria-hidden="true">
        {Array.from({ length: rows }).map((_, index) => (
          <div className="skeleton" key={index} />
        ))}
      </div>
    </div>
  );
}

export function ErrorState({ title = 'This section could not load', message, hint, onRetry }) {
  return (
    <div className="state-block state-error" role="alert">
      <AlertTriangle size={22} aria-hidden="true" />
      <h3>{title}</h3>
      {message ? <p>{message}</p> : null}
      {hint ? <p className="state-hint">{hint}</p> : null}
      {onRetry ? (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          <RefreshCw size={15} aria-hidden="true" /> Try again
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="state-block state-empty">
      <p className="state-title">{title}</p>
      {message ? <p>{message}</p> : null}
      {action}
    </div>
  );
}

export function InlineNotice({ tone = 'info', title, children, icon: Icon = Info }) {
  return (
    <div className={`inline-notice notice-${tone}`} role={tone === 'warning' ? 'alert' : undefined}>
      <Icon size={17} aria-hidden="true" />
      <div>
        {title ? <strong>{title}</strong> : null}
        <div className="notice-body">{children}</div>
      </div>
    </div>
  );
}

export function DataBadge({ type = 'modelled' }) {
  const tone = type === 'observed' ? 'observed' : type === 'forecast' ? 'forecast' : 'modelled';
  const label = type === 'observed' ? 'Observed' : type === 'forecast' ? 'Forecast' : 'Modelled';
  return <Badge tone={tone}>{label}</Badge>;
}

export function MapLegend({ items }) {
  return (
    <ul className="map-legend">
      {items.map((item) => (
        <li key={item.label}>
          <span className="legend-dot" style={{ background: item.color }} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
