'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          fontSize: '0.9rem',
        }}>
          <p>😵 加载出错了</p>
          <p style={{ fontSize: '0.75rem', marginTop: '8px', color: 'var(--color-danger)' }}>
            {this.state.error?.message || '未知错误'}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              marginTop: '12px',
              padding: '6px 16px',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              background: 'var(--color-bg-card)',
              cursor: 'pointer',
              color: 'var(--color-text-primary)',
            }}
          >
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
