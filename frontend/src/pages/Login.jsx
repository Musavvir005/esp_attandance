import React, { useState } from 'react';
import { Shield, Lock, User, AlertCircle, ArrowRight, Sun, Moon } from 'lucide-react';
import { api } from '../api';

export default function Login({ onLoginSuccess, theme = 'dark', onToggleTheme }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.login(username.trim(), password);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      position: 'relative',
    }}>
      {/* Theme Toggle Button top-right */}
      {onToggleTheme && (
        <button
          onClick={onToggleTheme}
          className="btn-theme-toggle"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
          }}
          title={`Switch to ${theme === 'dark' ? 'Day (Light)' : 'Night (Dark)'} Theme`}
        >
          {theme === 'dark' ? (
            <>
              <Sun size={14} color="#d97706" />
              <span>Day</span>
            </>
          ) : (
            <>
              <Moon size={14} color="#818cf8" />
              <span>Night</span>
            </>
          )}
        </button>
      )}

      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: 420,
        padding: 'clamp(22px, 5vw, 36px)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glow accent */}
        <div style={{
          position: 'absolute',
          top: -60,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 140,
          height: 140,
          background: 'rgba(56, 189, 248, 0.25)',
          borderRadius: '50%',
          filter: 'blur(45px)',
          pointerEvents: 'none',
        }} />

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 50,
            height: 50,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(56, 189, 248, 0.35)',
            marginBottom: 14,
          }}>
            <Shield size={26} color="#fff" />
          </div>
          <h1 style={{ fontSize: 'clamp(19px, 4vw, 22px)', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
            Biometric Gatekeeper
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Hardware Access & Remote Unlock Console
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#fecdd3',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off">
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Admin Username
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="var(--text-dim)" style={{ position: 'absolute', left: 14, top: 12 }} />
              <input
                type="text"
                className="input"
                style={{ paddingLeft: 40 }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Master Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--text-dim)" style={{ position: 'absolute', left: 14, top: 12 }} />
              <input
                type="password"
                className="input"
                style={{ paddingLeft: 40 }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '11px', fontSize: 14 }}
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Console'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 11, color: 'var(--text-dim)' }}>
          Protected by HTTPS & Encrypted Session Cookies
        </div>
      </div>
    </div>
  );
}
