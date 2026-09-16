import React from 'react';
import { Shield, Key, Users, History, Cpu, LogOut, ChevronDown, Layers } from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  onLogout, 
  stats, 
  devices = [], 
  selectedRoomId, 
  onSelectRoom 
}) {
  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(10, 14, 26, 0.85)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '0 24px',
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
              <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', color: '#fff' }}>
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

        {/* Global Room Switcher */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(15, 23, 42, 0.9)',
          padding: '4px 10px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}>
          <Layers size={15} color="var(--accent-cyan)" />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Room:
          </span>
          <select
            value={selectedRoomId || ''}
            onChange={(e) => onSelectRoom(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              outline: 'none',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <option value="" style={{ background: '#0f172a', color: '#fff' }}>All Rooms (Overview)</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id} style={{ background: '#0f172a', color: '#fff' }}>
                {d.name} {d.location ? `(${d.location})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: 6 }}>
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
            onClick={() => setActiveTab('logs')}
            className="btn"
            style={{
              background: activeTab === 'logs' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeTab === 'logs' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              borderColor: activeTab === 'logs' ? 'var(--border-glow)' : 'transparent',
            }}
          >
            <History size={16} />
            <span>Access Logs</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className="btn"
            style={{
              background: activeTab === 'users' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeTab === 'users' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              borderColor: activeTab === 'users' ? 'var(--border-glow)' : 'transparent',
            }}
          >
            <Users size={16} />
            <span>User Directory</span>
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
            <Cpu size={16} />
            <span>Door Units</span>
          </button>
        </nav>

        {/* Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
