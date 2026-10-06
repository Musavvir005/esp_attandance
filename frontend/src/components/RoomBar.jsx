import React, { useState } from 'react';
import { 
  Layers, 
  Plus, 
  History, 
  Users, 
  Unlock, 
  MapPin, 
  Clock, 
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
        {/* Dynamic Rooms Horizontal Strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-dim)', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', flexShrink: 0 }}>
            <Layers size={13} color="var(--accent-cyan)" />
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
                  title={`Open workspace for ${device.name}`}
                >
                  <span className={`status-dot ${device.is_online ? 'online' : 'offline'}`} style={{ width: 6, height: 6 }} />
                  <span>{device.name}</span>
                  <span className="room-user-count-badge">
                    {device.user_count || 0}
                  </span>
                </button>
              );
            })}

            {devices.length === 0 && (
              <span style={{ fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic', padding: '4px 0' }}>
                No rooms registered
              </span>
            )}
          </div>
        </div>

        {/* Quick Add Room Button */}
        <div style={{ flexShrink: 0 }}>
          <button
            onClick={onOpenAddRoom}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: 11, padding: '5px 10px', gap: 4 }}
            title="Register a new room unit"
          >
            <Plus size={13} color="var(--accent-cyan)" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Active Room Sub-Navigation Banner */}
      {isRoomWorkspace && (
        <div style={{
          maxWidth: 1300,
          margin: '8px auto 0 auto',
          paddingTop: 8,
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}>
          {/* Room Context Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className={`status-dot ${currentDevice.is_online ? 'online' : 'offline'}`} />
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)' }}>
                {currentDevice.name}
              </span>
              <span className={`badge ${currentDevice.is_online ? 'badge-active' : 'badge-inactive'}`} style={{ fontSize: 9, padding: '1px 5px' }}>
                {currentDevice.is_online ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>

            {currentDevice.location && currentDevice.location.trim() && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11.5, color: 'var(--text-muted)' }}>
                <MapPin size={11} color="var(--text-dim)" />
                <span>{currentDevice.location}</span>
              </div>
            )}
          </div>

          {/* Sub-Tabs for this Room */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <div className="room-subnav">
              <button
                onClick={() => setActiveTab('logs')}
                className={`room-subnav-btn ${activeTab === 'logs' ? 'active' : ''}`}
                style={{ padding: '5px 10px', fontSize: 11.5 }}
                title={`View access logs for ${currentDevice.name}`}
              >
                <History size={13} />
                <span>Logs</span>
              </button>

              <button
                onClick={() => setActiveTab('users')}
                className={`room-subnav-btn ${activeTab === 'users' ? 'active' : ''}`}
                style={{ padding: '5px 10px', fontSize: 11.5 }}
                title={`View user directory for ${currentDevice.name}`}
              >
                <Users size={13} />
                <span>Users ({currentDevice.user_count || 0})</span>
              </button>
            </div>

            {/* Quick Remote Unlock for Current Room */}
            <button
              onClick={() => handleRoomUnlock(currentDevice)}
              disabled={unlockStatus?.status === 'dispatched' || unlockStatus?.status === 'unlocked'}
              className="btn btn-primary btn-sm"
              style={{
                fontSize: 11.5,
                padding: '5px 10px',
                background: unlockStatus?.status === 'unlocked' ? 'var(--accent-emerald)' : undefined,
                borderColor: unlockStatus?.status === 'unlocked' ? 'var(--accent-emerald)' : undefined,
              }}
              title={`Send remote unlock command to ${currentDevice.name}`}
            >
              {unlockStatus?.status === 'dispatched' ? (
                <>
                  <Clock size={12} className="unlocking-active" />
                  <span>Signaling...</span>
                </>
              ) : unlockStatus?.status === 'unlocked' ? (
                <>
                  <CheckCircle2 size={12} />
                  <span>Unlocked ({unlockStatus.countdown}s)</span>
                </>
              ) : (
                <>
                  <Unlock size={12} />
                  <span>Unlock</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
