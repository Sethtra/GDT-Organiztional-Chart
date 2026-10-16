import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/**
 * Route guard — redirects to /login if not authenticated, and to /mfa until
 * the session has passed two-step sign-in (required for every account).
 */
export default function ProtectedRoute({ children }) {
  const { user, loading, mfaStatus } = useAuth();
  const location = useLocation();

  if (loading || (user && mfaStatus === 'loading')) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100dvh',
          background: 'var(--bg-app)',
        }}
      >
        <div
          className="loading-spinner"
          style={{ width: 40, height: 40, borderWidth: 3 }}
        />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (mfaStatus !== 'verified') {
    return (
      <Navigate
        to="/mfa"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }
  return children;
}
