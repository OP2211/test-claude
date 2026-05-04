'use client';

import Logo from './Logo';

interface AuthRequiredModalProps {
  title?: string;
  message?: string;
  onContinue: () => void;
  onClose: () => void;
}

export default function AuthRequiredModal({
  title = 'Login required',
  message = 'Please login or signup to continue.',
  onContinue,
  onClose,
}: AuthRequiredModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 1200,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          background: '#101423',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 14,
          padding: '1rem',
          color: '#fff',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.4rem' }}>
          <Logo size={24} />
          <span style={{ fontSize: '0.88rem', letterSpacing: '0.02em', color: 'rgba(255, 255, 255, 0.78)' }}>
            FanGround
          </span>
        </div>
        <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{title}</h3>
        <p style={{ margin: '0.6rem 0 1rem', color: 'rgba(255, 255, 255, 0.75)' }}>{message}</p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: 8,
              padding: '0.5rem 0.75rem',
            }}
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onContinue}
            style={{
              background: '#2f66ff',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '0.5rem 0.75rem',
              fontWeight: 600,
            }}
          >
            Login / Signup
          </button>
        </div>
      </div>
    </div>
  );
}
