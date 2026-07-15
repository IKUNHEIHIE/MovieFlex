'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  loading?: boolean;
}

export default function AdminButton({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  loading = false,
  disabled,
  style,
  ...props 
}: AdminButtonProps) {
  const baseStyles: React.CSSProperties = {
    border: 'none',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    position: 'relative',
    overflow: 'hidden',
    opacity: disabled ? 0.5 : 1,
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '8px 16px', fontSize: '13px' },
    md: { padding: '12px 24px', fontSize: '14px' },
    lg: { padding: '16px 32px', fontSize: '16px' },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'linear-gradient(135deg, #5267cf 0%, #6b7de2 100%)',
      color: 'white',
      boxShadow: '0 4px 12px rgba(82, 103, 207, 0.3)',
    },
    secondary: {
      background: 'rgba(255, 255, 255, 0.08)',
      color: 'white',
      border: '1px solid rgba(255, 255, 255, 0.15)',
    },
    danger: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: 'white',
      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
    },
    ghost: {
      background: 'transparent',
      color: 'rgba(255, 255, 255, 0.8)',
    },
  };

  const combinedStyle = {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...style,
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !loading) {
      e.currentTarget.style.transform = 'translateY(-2px)';
      if (variant === 'primary') {
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(82, 103, 207, 0.4)';
      } else if (variant === 'secondary') {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
      } else if (variant === 'danger') {
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)';
      } else if (variant === 'ghost') {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
      }
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !loading) {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = variantStyles[variant].boxShadow || 'none';
      if (variant === 'secondary') {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
      } else if (variant === 'ghost') {
        e.currentTarget.style.background = 'transparent';
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !loading) {
      e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !loading) {
      e.currentTarget.style.transform = 'translateY(-2px) scale(1)';
    }
  };

  return (
    <button
      disabled={disabled || loading}
      style={combinedStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      {...props}
    >
      {loading && (
        <span style={{
          width: '16px',
          height: '16px',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          borderTopColor: 'white',
          borderRadius: '50%',
          animation: 'spin 600ms linear infinite',
        }} />
      )}
      {children}
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}
