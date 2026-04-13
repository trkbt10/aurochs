/**
 * @file Reusable error page component.
 *
 * Renders a centered card with an error icon, title, message, and action button.
 * Previously this markup was duplicated inline in multiple route components.
 */

type ErrorPageProps = {
  readonly title: string;
  readonly message: string;
  readonly buttonLabel: string;
  readonly onAction: () => void;
};
















/** Full-page error display with an optional action button. */
export function ErrorPage({ title, message, buttonLabel, onAction }: ErrorPageProps) {
  return (
    <div className="error-page">
      <div className="error-card">
        <div className="error-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="error-title">{title}</h2>
        <p className="error-message">{message}</p>
        <button className="error-button" onClick={onAction}>
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
