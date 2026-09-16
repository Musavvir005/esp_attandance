import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Unlock, 
  Cpu, 
  Activity, 
  Clock, 
  Key, 
  Code, 
  ShieldCheck, 
  Users, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Layers
} from 'lucide-react';
import { api } from '../api';
import FirmwareModal from '../components/FirmwareModal';

export default function Dashboard({ stats, onRefreshStats, selectedRoomId, onSelectRoom }) {
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

  // Filter devices if a specific room is selected
  const visibleDevices = selectedRoomId
    ? devices.filter((d) => String(d.id) === String(selectedRoomId))
    : devices;

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1300, margin: '0 auto' }}>
      {/* Room Selection Pills */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 24,
        overflowX: 'auto',
        paddingBottom: 4,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginRight: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Layers size={14} color="var(--accent-cyan)" /> Room Scope:
        </span>
        <button
          onClick={() => onSelectRoom('')}
          className="btn btn-sm"
          style={{
            background: !selectedRoomId ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            color: !selectedRoomId ? 'var(--accent-cyan)' : 'var(--text-muted)',
            borderColor: !selectedRoomId ? 'var(--accent-cyan)' : 'var(--border-subtle)',
          }}
        >
          All Units ({devices.length})
        </button>
        {devices.map((d) => (
          <button
            key={d.id}
            onClick={() => onSelectRoom(String(d.id))}
            className="btn btn-sm"
            style={{
              background: String(selectedRoomId) === String(d.id) ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              color: String(selectedRoomId) === String(d.id) ? 'var(--accent-cyan)' : 'var(--text-muted)',
              borderColor: String(selectedRoomId) === String(d.id) ? 'var(--accent-cyan)' : 'var(--border-subtle)',
            }}
          >
            <span className={`status-dot ${d.is_online ? 'online' : 'offline'}`} style={{ width: 6, height: 6 }} />
            <span>{d.name}</span>
          </button>
        ))}
      </div>

      {/* Top Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 32,
      }}>
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Scans Today
            </span>
            <Activity size={18} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#fff' }}>
            {stats?.today_scans || 0}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Multi-room biometric events</span>
        </div>

        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Hardware Units
            </span>
            <Cpu size={18} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#fff' }}>
            {stats?.online_devices || 0}
            <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-dim)', marginLeft: 6 }}>
              / {stats?.total_devices || 0} online
            </span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Isolated ESP32 room controllers</span>
        </div>

        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Enrolled Users
            </span>
            <Users size={18} color="var(--accent-indigo)" />
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#fff' }}>
            {stats?.active_users || 0}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Mapped across all doors</span>
        </div>

        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Pending Unlocks
            </span>
            <Lock size={18} color="var(--accent-amber)" />
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#fff' }}>
            {stats?.pending_unlocks || 0}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Queued in-flight commands</span>
        </div>
      </div>

      {/* Main Grid: Control Station + Activity Stream */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: 24,
      }}>
        {/* Left Column: Device Control Cards */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Lock size={20} color="var(--accent-cyan)" />
              {selectedRoomId ? 'Selected Room Door Control' : 'All Rooms Access & Unlock Station'}
            </h2>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              ESP32 polls every 0.5–2.0s
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                    padding: '24px',
                    borderColor: isUnlocked
                      ? 'var(--accent-emerald)'
                      : isDispatched
                      ? 'var(--accent-cyan)'
                      : undefined,
                    boxShadow: isUnlocked
                      ? '0 0 30px rgba(16, 185, 129, 0.25)'
                      : undefined,
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className={`status-dot ${device.is_online ? 'online' : 'offline'}`} />
                        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>
                          {device.name}
                        </h3>
                        <span className="mono-tag" style={{ fontSize: 11 }}>
                          DIR: {device.name}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                        {device.location || 'Hardware room / entryway'}
                      </p>
                    </div>

                    <button
                      onClick={() => setActiveFirmwareDevice(device)}
                      className="btn btn-secondary btn-sm"
                      title="View Arduino / ESP32 Configuration Code"
                    >
                      <Code size={13} />
                      <span>Firmware Code</span>
                    </button>
                  </div>

                  {/* Device Meta Info */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                    fontSize: 12,
                    color: 'var(--text-dim)',
                    padding: '10px 14px',
                    background: 'rgba(0, 0, 0, 0.25)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 20,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={14} />
                      <span>
                        Last poll:{' '}
                        {device.last_seen_at
                          ? new Date(device.last_seen_at).toLocaleTimeString()
                          : 'Never'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={14} />
                      <span>{device.user_count || 0} Enrolled Fingerprints</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                      <Key size={14} />
                      <span className="mono-tag" style={{ fontSize: 11 }}>
                        {device.secret_key.slice(0, 10)}•••••
                      </span>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      {isUnlocked && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-emerald)', fontWeight: 700 }}>
                          <CheckCircle2 size={18} />
                          <span>DOOR UNLOCKED — RELOCKING IN {uState.countdown}s</span>
                        </div>
                      )}
                      {isDispatched && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-cyan)', fontWeight: 600 }}>
                          <RefreshCw size={16} className="unlocking-active" />
                          <span>DISPATCHED TO QUEUE — WAITING FOR {device.name} TO POLL...</span>
                        </div>
                      )}
                      {isTimeout && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-amber)', fontSize: 13 }}>
                          <AlertCircle size={16} />
                          <span>Unit took longer than 15s to poll. Is {device.name} powered?</span>
                        </div>
                      )}
                      {!isUnlocked && !isDispatched && !isTimeout && (
                        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                          Clicking unlock targets <strong style={{ color: 'var(--accent-cyan)' }}>{device.name} only</strong> and never impacts other rooms.
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleRemoteUnlock(device)}
                      disabled={isDispatched || isUnlocked}
                      className="btn btn-unlock"
                      style={{
                        padding: '12px 28px',
                        fontSize: 15,
                        background: isUnlocked
                          ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                          : undefined,
                      }}
                    >
                      {isUnlocked ? (
                        <>
                          <Unlock size={18} />
                          <span>OPEN ({uState.countdown}s)</span>
                        </>
                      ) : isDispatched ? (
                        <>
                          <RefreshCw size={18} className="unlocking-active" />
                          <span>DISPATCHING...</span>
                        </>
                      ) : (
                        <>
                          <Unlock size={18} />
                          <span>UNLOCK {device.name}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}

            {visibleDevices.length === 0 && !loading && (
              <div className="glass-panel" style={{ padding: 32, textAlign: 'center' }}>
                <Cpu size={36} color="var(--text-dim)" style={{ marginBottom: 12 }} />
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>No Devices Match Selection</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                  Add your first room unit under the Hardware & Keys tab.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Event Stream */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Activity size={20} color="var(--accent-emerald)" />
              {selectedRoomId ? 'Room Scans' : 'Live Multi-Room Scans'}
            </h2>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Auto-updating</span>
          </div>

          <div className="glass-panel" style={{ padding: 16 }}>
            {recentLogs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      padding: '12px',
                      background: 'rgba(0, 0, 0, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>
                        {log.user_name || `Unknown ID #${log.fingerprint_id}`}
                      </span>
                      <span className="mono-tag" style={{ fontSize: 10 }}>
                        FP #{log.fingerprint_id}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)' }}>
                      <span>Room: <strong style={{ color: 'var(--accent-cyan)' }}>{log.device_name || log.dir}</strong></span>
                      <span>
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-dim)', fontSize: 13 }}>
                No scan events recorded for this room yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {activeFirmwareDevice && (
        <FirmwareModal
          device={activeFirmwareDevice}
          onClose={() => setActiveFirmwareDevice(null)}
        />
      )}
    </div>
  );
}
