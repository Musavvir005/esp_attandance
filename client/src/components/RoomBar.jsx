import React, { useState } from 'react';
import { 
  Layers, 
  Plus, 
  History, 
  Users, 
  Unlock, 
  MapPin, 
  Clock, 
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../api';

export default function RoomBar({
  devices = [],
  selectedRoomId,
  onSelectRoom,
  activeTab,
  setActiveTab,
  onOpenAddRoom,
  onRefreshStats
}) {
  const [unlockStatus, setUnlockStatus] = useState(null); // { status: 'idle'|'dispatched'|'unlocked', countdown: 0 }

  const currentDevice = devices.find(d => String(d.id) === String(selectedRoomId));

  const handleRoomUnlock = async (device) => {
    if (!device) return;
    try {
      setUnlockStatus({ status: 'dispatched', countdown: 0 });
      const res = await api.triggerUnlock(device.id);
      const commandId = res.command.id;
      if (onRefreshStats) onRefreshStats();

      const startTime = Date.now();
      const interval = setInterval(async () => {
        try {
          const statusRes = await api.getUnlockStatus(commandId);
          if (statusRes.command.status === 'consumed') {
            clearInterval(interval);
            setUnlockStatus({ status: 'unlocked', countdown: 6 });
            let cd = 6;
            const cdTimer = setInterval(() => {
              cd -= 1;
              if (cd <= 0) {
                clearInterval(cdTimer);
                setUnlockStatus(null);
              } else {
                setUnlockStatus({ status: 'unlocked', countdown: cd });
              }
            }, 1000);
          } else if (Date.now() - startTime > 15000) {
            clearInterval(interval);
            setUnlockStatus({ status: 'timeout' });
            setTimeout(() => setUnlockStatus(null), 4000);
          }
        } catch (e) {
          clearInterval(interval);
          setUnlockStatus(null);
        }
      }, 1000);
    } catch (err) {
      alert(`Unlock dispatch failed: ${err.message}`);
      setUnlockStatus(null);
    }
  };

  const isRoomWorkspace = (activeTab === 'logs' || activeTab === 'users') && currentDevice;

  return (
    <div className="room-bar-wrapper">
      <div className="room-bar-content">
        {/* Dynamic Rooms List */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-dim)', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em' }}>
            <Layers size={14} color="var(--accent-cyan)" />
            <span>ROOMS:</span>
          </div>

          <div className="room-pills-list">
            {devices.map((device) => {
              const isSelected = String(device.id) === String(selectedRoomId) && (activeTab === 'logs' || activeTab === 'users');
              return (
                <button
                  key={device.id}
                  onClick={() => {
                    onSelectRoom(device.id);
                    if (activeTab !== 'logs' && activeTab !== 'users') {
                      setActiveTab('logs');
                    }
                  }}
                  className={`room-pill ${isSelected ? 'active' : ''}`}
                  title={`Open dedicated workspace for ${device.name}`}
                >
                  <span className={`status-dot ${device.is_online ? 'online' : 'offline'}`} />
                  <span>{device.name}</span>
                  <span className="room-user-count-badge">
                    {device.user_count || 0} users
                  </span>
                </button>
              );
            })}

            {devices.length === 0 && (
              <span style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic' }}>
                No rooms registered yet
              </span>
            )}
          </div>
        </div>

        {/* Quick Add Room Button */}
        <div>
          <button
            onClick={onOpenAddRoom}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: 12, padding: '6px 12px', gap: 6 }}
            title="Register a new room unit"
          >
            <Plus size={14} color="var(--accent-cyan)" />
            <span>Add Room</span>
          </button>
        </div>
      </div>

      {/* Active Room Sub-Navigation Banner */}
      {isRoomWorkspace && (
        <div style={{
          maxWidth: 1300,
          margin: '12px auto 0 auto',
          paddingTop: 12,
          borderTop: '1px solid rgba(148, 163, 184, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
        }}>
          {/* Room Context Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`status-dot ${currentDevice.is_online ? 'online' : 'offline'}`} />
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                {currentDevice.name}
              </span>
              <span className={`badge ${currentDevice.is_online ? 'badge-active' : 'badge-inactive'}`} style={{ fontSize: 10, padding: '1px 7px' }}>
                {currentDevice.is_online ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>

            {currentDevice.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
                <MapPin size={13} color="var(--text-dim)" />
                <span>{currentDevice.location}</span>
              </div>
            )}

            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              <span>{currentDevice.user_count || 0} Enrolled Identities</span>
            </div>
          </div>

          {/* Sub-Tabs for this Room */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div className="room-subnav">
              <button
                onClick={() => setActiveTab('logs')}
                className={`room-subnav-btn ${activeTab === 'logs' ? 'active' : ''}`}
                title={`View access logs for ${currentDevice.name}`}
              >
                <History size={15} />
                <span>Access Logs</span>
              </button>

              <button
                onClick={() => setActiveTab('users')}
                className={`room-subnav-btn ${activeTab === 'users' ? 'active' : ''}`}
                title={`View user directory for ${currentDevice.name}`}
              >
                <Users size={15} />
                <span>User Directory</span>
              </button>
            </div>

            {/* Quick Remote Unlock for Current Room */}
            <button
              onClick={() => handleRoomUnlock(currentDevice)}
              disabled={unlockStatus?.status === 'dispatched' || unlockStatus?.status === 'unlocked'}
              className="btn btn-primary btn-sm"
              style={{
                fontSize: 12,
                padding: '8px 14px',
                background: unlockStatus?.status === 'unlocked' ? 'var(--accent-emerald)' : undefined,
                borderColor: unlockStatus?.status === 'unlocked' ? 'var(--accent-emerald)' : undefined,
              }}
              title={`Send remote unlock command to ${currentDevice.name}`}
            >
              {unlockStatus?.status === 'dispatched' ? (
                <>
                  <Clock size={14} className="unlocking-active" />
                  <span>Signaling ESP32...</span>
                </>
              ) : unlockStatus?.status === 'unlocked' ? (
                <>
                  <CheckCircle2 size={14} />
                  <span>Unlocked ({unlockStatus.countdown}s)</span>
                </>
              ) : (
                <>
                  <Unlock size={14} />
                  <span>Unlock Door</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
