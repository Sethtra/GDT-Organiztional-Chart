import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="notfound-page">
      <div className="notfound-card">
        <div className="notfound-code">404</div>
        <div className="notfound-emblem">🏛️</div>
        <h1 className="notfound-title">Page Not Found</h1>
        <p className="notfound-sub">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
          <Link to="/" className="auth-submit-btn" style={{ textDecoration: 'none', padding: '10px 24px' }}>
            Go to Home
          </Link>
          <Link to="/dashboard" className="tb-btn" style={{ textDecoration: 'none', padding: '10px 24px' }}>
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
