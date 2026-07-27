import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useHrAdmin } from '../hooks/useHrAdmin';

export interface HrAdminRouteProps {
  children: ReactNode;
}

export default function HrAdminRoute({ children }: HrAdminRouteProps) {
  const { isHrAdmin, loading, error } = useHrAdmin();

  if (loading) {
    return (
      <div
        aria-label="Checking HR administrator access"
        role="status"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}
      >
        <div
          className="loading-spinner"
          style={{ width: 40, height: 40, borderWidth: 3 }}
        />
      </div>
    );
  }

  if (!isHrAdmin) {
    return (
      <main
        style={{
          minHeight: '60vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
        }}
      >
        <section
          aria-labelledby="hr-access-denied-title"
          style={{ maxWidth: 520, textAlign: 'center' }}
        >
          <ShieldAlert aria-hidden="true" size={40} />
          <h1 id="hr-access-denied-title">HR administrator access required</h1>
          <p>
            {error ??
              'Your account does not have permission to manage organizational data.'}
          </p>
          <Link to="/dashboard">Return to dashboard</Link>
        </section>
      </main>
    );
  }

  return children;
}
