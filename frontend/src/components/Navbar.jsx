import React from 'react';
import { Shield, Key, Users, History, Cpu, LogOut, ChevronDown, Layers, Sun, Moon } from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  onLogout, 
  stats, 
  devices = [], 
  selectedRoomId, 
  onSelectRoom,
  theme = 'dark',
  onToggleTheme
}) {
  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-navbar)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '0 clamp(10px, 3vw, 24px)',
      transition: 'background-color 0.25s ease',
    }}>
      <div style={{
        maxWidth: 1300,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '8px 0',
      }}>
        {/* Main Header Row: Brand & Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          minHeight: 44,
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(56, 189, 248, 0.4)',
              flexShrink: 0,
            }}>
              <Shield size={18} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em', color: 'var(--text-main)', lineHeight: 1.2 }}>
                  GATEKEEPER
                </span>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                <span className={`status-dot ${stats?.online_devices > 0 ? 'online' : 'offline'}`} style={{ width: 6, height: 6 }} />
                <span>{stats?.online_devices || 0}/{stats?.total_devices || 0} Units Connected</span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="navbar-desktop-nav">
            <button
              onClick={() => setActiveTab('controls')}
              className="btn btn-sm"
              style={{
                padding: '6px 12px',
                background: activeTab === 'controls' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                color: activeTab === 'controls' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                borderColor: activeTab === 'controls' ? 'var(--border-glow)' : 'transparent',
              }}
              title="Lock Controls & Overview"
            >
              <Cpu size={14} />
              <span>Lock Controls</span>
            </button>

            <button
              onClick={() => {
                if (activeTab !== 'logs' && activeTab !== 'users') {
                  setActiveTab('logs');
                }
              }}
              className="btn btn-sm"
              style={{
                padding: '6px 12px',
                background: (activeTab === 'logs' || activeTab === 'users') ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                color: (activeTab === 'logs' || activeTab === 'users') ? 'var(--accent-indigo)' : 'var(--text-muted)',
                borderColor: (activeTab === 'logs' || activeTab === 'users') ? 'rgba(99, 102, 241, 0.4)' : 'transparent',
              }}
              title="Room Workspaces (Logs & Users)"
            >
              <Layers size={14} />
              <span>Room Workspaces</span>
              <span className="room-user-count-badge" style={{ fontSize: 9.5 }}>{devices.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('devices')}
              className="btn btn-sm"
              style={{
                padding: '6px 12px',
                background: activeTab === 'devices' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                color: activeTab === 'devices' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                borderColor: activeTab === 'devices' ? 'var(--border-glow)' : 'transparent',
              }}
              title="Hardware Door Units"
            >
              <Shield size={14} />
              <span>Hardware Units</span>
            </button>
          </nav>

          {/* Actions: Theme Toggle + Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {/* Day / Night Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className="btn-theme-toggle"
              title={`Switch to ${theme === 'dark' ? 'Day (Light)' : 'Night (Dark)'} Theme`}
              style={{ padding: '5px 9px', fontSize: 11 }}
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={13} color="#d97706" />
                  <span>Day</span>
                </>
              ) : (
                <>
                  <Moon size={13} color="#818cf8" />
                  <span>Night</span>
                </>
              )}
            </button>

            <button
              onClick={onLogout}
              className="btn btn-secondary btn-sm"
              title="Sign out of Admin Session"
              style={{ padding: '5px 9px', fontSize: 11 }}
            >
              <LogOut size={13} />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs (Row 2 on small screens) */}
        <nav className="navbar-mobile-nav">
          <button
            onClick={() => setActiveTab('controls')}
            className="btn btn-sm"
            style={{
              padding: '6px 4px',
              fontSize: 12,
              background: activeTab === 'controls' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.03)',
              color: activeTab === 'controls' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              borderColor: activeTab === 'controls' ? 'var(--border-glow)' : 'var(--border-subtle)',
            }}
          >
            <Cpu size={13} />
            <span>Controls</span>
          </button>

          <button
            onClick={() => {
              if (activeTab !== 'logs' && activeTab !== 'users') {
                setActiveTab('logs');
              }
            }}
            className="btn btn-sm"
            style={{
              padding: '6px 4px',
              fontSize: 12,
              background: (activeTab === 'logs' || activeTab === 'users') ? 'rgba(99, 102, 241, 0.18)' : 'rgba(255, 255, 255, 0.03)',
              color: (activeTab === 'logs' || activeTab === 'users') ? 'var(--accent-indigo)' : 'var(--text-muted)',
              borderColor: (activeTab === 'logs' || activeTab === 'users') ? 'rgba(99, 102, 241, 0.4)' : 'var(--border-subtle)',
            }}
          >
            <Layers size={13} />
            <span>Rooms ({devices.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('devices')}
            className="btn btn-sm"
            style={{
              padding: '6px 4px',
              fontSize: 12,
              background: activeTab === 'devices' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.03)',
              color: activeTab === 'devices' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              borderColor: activeTab === 'devices' ? 'var(--border-glow)' : 'var(--border-subtle)',
            }}
          >
            <Shield size={13} />
            <span>Hardware</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
