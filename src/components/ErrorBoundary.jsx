import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100vh', backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)', padding: '2rem', textAlign: 'center'
        }}>
          <AlertTriangle size={64} color="#ef4444" style={{ marginBottom: '1rem' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            An unexpected error occurred.
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '500px', lineHeight: '1.5' }}>
            Auto-save has been paused to protect your data. Please reload the page to safely resume working.
          </p>
          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-surface)', borderRadius: '8px', marginBottom: '2rem', textAlign: 'left', width: '100%', maxWidth: '600px', overflowX: 'auto', color: '#ef4444', fontFamily: 'monospace' }}>
            {this.state.error?.toString()}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              backgroundColor: '#3b82f6', color: 'white', padding: '0.75rem 1.5rem',
              borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold'
            }}
          >
            <RefreshCcw size={18} />
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
