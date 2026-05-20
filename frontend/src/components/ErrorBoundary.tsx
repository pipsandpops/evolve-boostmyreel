import { Component, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, message: '' });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f8fafc', padding: 24,
      }}>
        <div style={{
          maxWidth: 480, width: '100%', textAlign: 'center',
          background: 'white', borderRadius: 20, padding: '40px 32px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #fee2e2',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: '#fff1f2',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <AlertTriangle size={26} color="#dc2626" />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px', lineHeight: 1.6 }}>
            {this.props.fallbackMessage ?? 'An unexpected error occurred. Please try again.'}
          </p>
          <button
            onClick={this.reset}
            className="btn-primary"
            style={{ padding: '10px 28px', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <RotateCcw size={15} /> Try again
          </button>
        </div>
      </div>
    );
  }
}
