import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Unlock, 
  Cpu, 
  Activity, 
  Clock, 
  Code, 
  ShieldCheck, 
  Users, 
  History,
  CheckCircle2, 
  AlertCircle,
  MapPin
} from 'lucide-react';
import { api } from '../api';
import FirmwareModal from '../components/FirmwareModal';

export default function Dashboard({ stats, onRefreshStats, selectedRoomId, onSelectRoom, onNavigateToRoom }) {
  const [devices, setDevices] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFirmwareDevice, setActiveFirmwareDevice] = useState(null);

  // Track unlocking state per device: { [deviceId]: { status: 'idle'|'dispatched'|'unlocked'|'timeout', countdown: 0, commandId: null } }
  const [unlockStates, setUnlockStates] = useState({});

  const loadData = async () => {
    try {
      const [devRes, logsRes] = await Promise.all([
        api.getDevices(),
        api.getLogs({ limit: 6, device_id: selectedRoomId || undefined }),
      ]);
      setDevices(devRes.devices || []);
      setRecentLogs(logsRes.logs || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [selectedRoomId]);

  // Handle remote unlock dispatch & polling
  const handleRemoteUnlock = async (device) => {
    try {
      setUnlockStates((prev) => ({
        ...prev,
        [device.id]: { status: 'dispatched', countdown: 0, commandId: null },
      }));

      const dispatchRes = await api.triggerUnlock(device.id);
      const commandId = dispatchRes.command.id;

      setUnlockStates((prev) => ({
        ...prev,
        [device.id]: { status: 'dispatched', countdown: 0, commandId },
      }));

      if (onRefreshStats) onRefreshStats();

      // Poll until consumed (ESP32 polls every 0.5 - 2s)
      const pollStartTime = Date.now();
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await api.getUnlockStatus(commandId);
          if (statusRes.command.status === 'consumed') {
            clearInterval(pollInterval);

            // Trigger unlocked state with 6s countdown
            setUnlockStates((prev) => ({
              ...prev,
              [device.id]: { status: 'unlocked', countdown: 6, commandId },
            }));

            // Countdown timer
            let cd = 6;
            const cdInterval = setInterval(() => {
              cd -= 1;
              if (cd <= 0) {
                clearInterval(cdInterval);
                setUnlockStates((prev) => ({
                  ...prev,
                  [device.id]: { status: 'idle', countdown: 0, commandId: null },
                }));
              } else {
                setUnlockStates((prev) => ({
                  ...prev,
                  [device.id]: { ...prev[device.id], countdown: cd },
                }));
              }
            }, 1000);
          } else if (Date.now() - pollStartTime > 15000) {
            // Timeout after 15s if ESP32 didn't poll
            clearInterval(pollInterval);
            setUnlockStates((prev) => ({
              ...prev,
              [device.id]: { status: 'timeout', countdown: 0, commandId: null },
            }));
            setTimeout(() => {
              setUnlockStates((prev) => ({
                ...prev,
                [device.id]: { status: 'idle', countdown: 0, commandId: null },
              }));
            }, 3000);
          }
        } catch (err) {
          console.error('Error polling unlock status:', err);
        }
      }, 500);
    } catch (err) {
      alert(`Unlock failed: ${err.message}`);
      setUnlockStates((prev) => ({
        ...prev,
        [device.id]: { status: 'idle', countdown: 0, commandId: null },
      }));
    }
  };

  const visibleDevices = selectedRoomId
    ? devices.filter((d) => String(d.id) === String(selectedRoomId))
    : devices;

  return (
    <div className="page-container">
      {/* Top 2x2 on Mobile / 4-Column on Desktop Stat Cards */}
      <div className="stats-grid">
        <div className="glass-panel" style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Scans Today
            </span>
            <Activity size={15} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: 'clamp(20px, 3.5vw, 26px)', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
            {stats?.today_scans || 0}
          </div>
          <span style={{ fontSize: 10.5, color: 'var(--text-dim)', display: 'block', marginTop: 2 }}>Biometric scans</span>
        </div>

        <div className="glass-panel" style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Units Online
            </span>
            <Cpu size={15} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: 'clamp(20px, 3.5vw, 26px)', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
            {stats?.online_devices || 0}
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-dim)', marginLeft: 4 }}>
              / {stats?.total_devices || 0}
            </span>
          </div>
          <span style={{ fontSize: 10.5, color: 'var(--text-dim)', display: 'block', marginTop: 2 }}>Connected ESP32s</span>
        </div>

        <div className="glass-panel" style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Enrolled Users
            </span>
            <Users size={15} color="var(--accent-indigo)" />
          </div>
          <div style={{ fontSize: 'clamp(20px, 3.5vw, 26px)', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
            {stats?.active_users || 0}
          </div>
          <span style={{ fontSize: 10.5, color: 'var(--text-dim)', display: 'block', marginTop: 2 }}>Registered slots</span>
        </div>

        <div className="glass-panel" style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pending Unlocks
            </span>
            <Lock size={15} color="var(--accent-amber)" />
          </div>
          <div style={{ fontSize: 'clamp(20px, 3.5vw, 26px)', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
            {stats?.pending_unlocks || 0}
          </div>
          <span style={{ fontSize: 10.5, color: 'var(--text-dim)', display: 'block', marginTop: 2 }}>In-flight signals</span>
        </div>
      </div>

      {/* Main Adaptive Grid: Control Station + Activity Stream */}
      <div className="dashboard-main-grid">
        {/* Left Column: Device Control Cards */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-main)' }}>
              <Lock size={16} color="var(--accent-cyan)" />
              {selectedRoomId ? 'Room Door Controls' : 'Door Units & Relay Stations'}
            </h2>
            <span style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>
              ESP32 polling live
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visibleDevices.map((device) => {
              const uState = unlockStates[device.id] || { status: 'idle', countdown: 0 };
              const isDispatched = uState.status === 'dispatched';
              const isUnlocked = uState.status === 'unlocked';
              const isTimeout = uState.status === 'timeout';

              return (
                <div
                  key={device.id}
                  className="glass-panel"
                  style={{
                    padding: '16px clamp(12px, 3vw, 20px)',
                    borderColor: isUnlocked
                      ? 'var(--accent-emerald)'
                      : isDispatched
                      ? 'var(--accent-cyan)'
                      : undefined,
                    boxShadow: isUnlocked
                      ? '0 0 24px rgba(16, 185, 129, 0.25)'
                      : undefined,
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <span className={`status-dot ${device.is_online ? 'online' : 'offline'}`} />
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)' }}>
                          {device.name}
                        </h3>
                        <span className="mono-tag" style={{ fontSize: 10 }}>
                          DIR: {device.name}
                        </span>
                      </div>
                      {device.location && device.location.trim() && (
                        <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <MapPin size={11} color="var(--text-dim)" />
                          <span>{device.location}</span>
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => onNavigateToRoom && onNavigateToRoom(device.id, 'logs')}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px', fontSize: 11 }}
                        title="View access logs"
                      >
                        <History size={12} />
                        <span>Logs</span>
                      </button>
                      <button
                        onClick={() => onNavigateToRoom && onNavigateToRoom(device.id, 'users')}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px', fontSize: 11 }}
                        title="Manage enrolled users"
                      >
                        <Users size={12} />
                        <span>Users ({device.user_count || 0})</span>
                      </button>
                      <button
                        onClick={() => setActiveFirmwareDevice(device)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px', fontSize: 11 }}
                        title="View ESP32 sketch code constants"
                      >
                        <Code size={12} />
                        <span>Code</span>
                      </button>
                    </div>
                  </div>

                  {/* Remote Unlock Trigger Bar */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: isUnlocked
                      ? 'rgba(16, 185, 129, 0.12)'
                      : isDispatched
                      ? 'rgba(56, 189, 248, 0.1)'
                      : isTimeout
                      ? 'rgba(244, 63, 94, 0.1)'
                      : 'rgba(15, 23, 42, 0.4)',
                    border: '1px solid',
                    borderColor: isUnlocked
                      ? 'rgba(16, 185, 129, 0.3)'
                      : isDispatched
                      ? 'rgba(56, 189, 248, 0.3)'
                      : isTimeout
                      ? 'rgba(244, 63, 94, 0.3)'
                      : 'var(--border-subtle)',
                    gap: 10,
                    flexWrap: 'wrap',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 7,
                        background: isUnlocked ? 'var(--accent-emerald)' : isDispatched ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isUnlocked || isDispatched ? '#fff' : 'var(--text-muted)',
                        flexShrink: 0,
                      }}>
                        {isUnlocked ? <Unlock size={16} /> : <Lock size={16} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: isUnlocked ? 'var(--accent-emerald)' : 'var(--text-main)' }}>
                          {isUnlocked ? `UNLOCKED (${uState.countdown}s)` : isDispatched ? 'Signaling ESP32...' : isTimeout ? 'Timed Out' : 'Door Secured'}
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>
                          {device.is_online ? 'Relay ready' : 'Unit offline'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoteUnlock(device)}
                      disabled={isDispatched || isUnlocked}
                      className="btn btn-unlock"
                      style={{ padding: '7px 14px', fontSize: 12.5 }}
                    >
                      {isDispatched ? (
                        <>
                          <Clock size={13} className="unlocking-active" />
                          <span>Signaling...</span>
                        </>
                      ) : isUnlocked ? (
                        <>
                          <CheckCircle2 size={13} />
                          <span>Unlocked ({uState.countdown}s)</span>
                        </>
                      ) : (
                        <>
                          <Unlock size={13} />
                          <span>Unlock Now</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}

            {visibleDevices.length === 0 && (
              <div className="glass-panel" style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                <Cpu size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                <h3 style={{ fontSize: 15 }}>No Door Units Found</h3>
                <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                  Add a room in the "Hardware" tab or click "+ Add" above.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Biometric Scan Stream */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-main)' }}>
              <History size={16} color="var(--accent-indigo)" />
              Recent Scans
            </h2>
            <span style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>
              Live
            </span>
          </div>

          <div className="glass-panel" style={{ padding: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentLogs.map((log) => {
                const isAdmin = (log.user_role || '').toLowerCase() === 'admin';
                const isUnknown = !log.user_name || log.user_name.toLowerCase().startsWith('unknown');

                return (
                  <div
                    key={log.id}
                    style={{
                      padding: '8px 10px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <div style={{
                        width: 26,
                        height: 26,
                        borderRadius: 6,
                        background: isAdmin ? 'rgba(99, 102, 241, 0.2)' : isUnknown ? 'rgba(244, 63, 94, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isAdmin ? 'var(--accent-indigo)' : isUnknown ? 'var(--accent-rose)' : 'var(--accent-cyan)',
                        flexShrink: 0,
                      }}>
                        <ShieldCheck size={14} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.user_name || `Unknown ID #${log.fingerprint_id}`}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="mono-tag" style={{ fontSize: 9, padding: '0 3px' }}>FP #{log.fingerprint_id}</span>
                          <span>•</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.device_name}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0, fontSize: 10.5, color: 'var(--text-dim)' }}>
                      <div>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                );
              })}

              {recentLogs.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
                  No scans recorded recently
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Firmware Modal */}
      {activeFirmwareDevice && (
        <FirmwareModal
          device={activeFirmwareDevice}
          onClose={() => setActiveFirmwareDevice(null)}
        />
      )}
    </div>
  );
}
