import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/** Route guard — redirects to /login if not authenticated */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
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
  return user ? children : <Navigate to="/login" replace />;
}
