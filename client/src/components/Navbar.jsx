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
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '0 24px',
      transition: 'background-color 0.25s ease',
    }}>
      <div style={{
        maxWidth: 1300,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 70,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(56, 189, 248, 0.4)',
          }}>
            <Shield size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
                GATEKEEPER
              </span>
              <span className="mono-tag" style={{ fontSize: 10, padding: '1px 6px' }}>MULTI-ROOM BIO-LOCK</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className={`status-dot ${stats?.online_devices > 0 ? 'online' : 'offline'}`} />
              <span>{stats?.online_devices || 0} / {stats?.total_devices || 0} Units Connected</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setActiveTab('controls')}
            className="btn"
            style={{
              background: activeTab === 'controls' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeTab === 'controls' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              borderColor: activeTab === 'controls' ? 'var(--border-glow)' : 'transparent',
            }}
          >
            <Cpu size={16} />
            <span>Lock Controls</span>
          </button>

          <button
            onClick={() => {
              if (activeTab !== 'logs' && activeTab !== 'users') {
                setActiveTab('logs');
              }
            }}
            className="btn"
            style={{
              background: (activeTab === 'logs' || activeTab === 'users') ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: (activeTab === 'logs' || activeTab === 'users') ? 'var(--accent-indigo)' : 'var(--text-muted)',
              borderColor: (activeTab === 'logs' || activeTab === 'users') ? 'rgba(99, 102, 241, 0.4)' : 'transparent',
            }}
          >
            <Layers size={16} />
            <span>Room Workspaces</span>
            <span className="room-user-count-badge">{devices.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('devices')}
            className="btn"
            style={{
              background: activeTab === 'devices' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeTab === 'devices' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              borderColor: activeTab === 'devices' ? 'var(--border-glow)' : 'transparent',
            }}
          >
            <Shield size={16} />
            <span>Door Units</span>
          </button>
        </nav>

        {/* Actions: Theme Toggle + Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Day / Night Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="btn btn-secondary btn-sm"
            style={{
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              fontSize: 12,
              fontWeight: 700,
            }}
            title={`Switch to ${theme === 'dark' ? 'Day (Light)' : 'Night (Dark)'} Theme`}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={15} color="var(--accent-amber)" />
                <span>Day</span>
              </>
            ) : (
              <>
                <Moon size={15} color="var(--accent-indigo)" />
                <span>Night</span>
              </>
            )}
          </button>

          <button
            onClick={onLogout}
            className="btn btn-secondary btn-sm"
            title="Sign out of Admin Session"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
