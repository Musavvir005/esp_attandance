import React, { useState, useEffect } from 'react';
import { 
  Users as UsersIcon, 
  UserPlus, 
  Fingerprint, 
  Filter, 
  Cpu, 
  Pencil,
  Sparkles,
  RefreshCw,
  AlertCircle,
  X
} from 'lucide-react';
import { api } from '../api';
import UserModal from '../components/UserModal';

export default function Users({ selectedRoomId = '', onSelectRoom, onSwitchToLogs }) {
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(selectedRoomId || '');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [autoDetected, setAutoDetected] = useState(null);

  // Pre-fill modal state
  const [prefillModalOpen, setPrefillModalOpen] = useState(false);
  const [prefillCount, setPrefillCount] = useState(10);
  const [prefillDeviceId, setPrefillDeviceId] = useState('');
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [prefillMessage, setPrefillMessage] = useState('');

  useEffect(() => {
    setSelectedDevice(selectedRoomId || '');
  }, [selectedRoomId]);

  const loadData = async () => {
    try {
      const [uRes, dRes] = await Promise.all([
        api.getUsers(selectedDevice || undefined),
        api.getDevices(),
      ]);
      setUsers(uRes.users || []);
      setDevices(dRes.devices || []);
      if (!prefillDeviceId && dRes.devices && dRes.devices.length > 0) {
        setPrefillDeviceId(selectedDevice || dRes.devices[0].id);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDevice]);

  const handleSaveUser = async (data) => {
    if (editingUser) {
      await api.updateUser(editingUser.id, data);
    } else {
      await api.createUser(data);
    }
    loadData();
  };

  const handleOpenAddModal = async () => {
    setEditingUser(null);
    setAutoDetected(null);
    try {
      const res = await api.getLogs({
        limit: 50,
        device_id: selectedDevice || undefined,
      });
      const logs = res.logs || [];
      const unknown = logs.find(l => !l.user_name || l.user_name.toLowerCase().startsWith('unknown'));
      if (unknown) {
        setAutoDetected({
          fingerprint_id: unknown.fingerprint_id,
          device_id: unknown.device_id,
          device_name: unknown.device_name,
        });
      }
    } catch (err) {
      // ignore
    }
    setModalOpen(true);
  };

  const handlePrefillSubmit = async (e) => {
    e.preventDefault();
    const devId = prefillDeviceId || selectedDevice || (devices[0] && devices[0].id);
    if (!devId) return;

    setPrefillLoading(true);
    setPrefillMessage('');
    try {
      const res = await api.prefillUsers({
        device_id: devId,
        count: parseInt(prefillCount, 10) || 10,
        start: 1,
      });
      setPrefillMessage(res.message || 'Slots pre-filled successfully!');
      setTimeout(() => {
        setPrefillModalOpen(false);
        setPrefillMessage('');
      }, 1200);
      await loadData();
    } catch (err) {
      setPrefillMessage(`Error: ${err.message || 'Failed to prefill'}`);
    } finally {
      setPrefillLoading(false);
    }
  };

  // Format enrolled date + time with seconds
  const formatEnrolled = (dateStr) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { date: '-', time: '' };
    const date = d.toLocaleDateString('en-GB'); // DD/MM/YYYY
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return { date, time };
  };

  const currentRoom = devices.find(d => String(d.id) === String(selectedDevice));
  const pendingCount = users.filter(u => u.name.toLowerCase().startsWith('unknown')).length;
  const namedCount = users.length - pendingCount;

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1300, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <UsersIcon size={24} color="var(--accent-indigo)" />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>
              {currentRoom ? `${currentRoom.name} — User Directory` : 'Biometric User Directory'}
            </h1>
            {currentRoom && (
              <span className={`badge ${currentRoom.is_online ? 'badge-active' : 'badge-inactive'}`}>
                {currentRoom.is_online ? 'ONLINE' : 'OFFLINE'}
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {currentRoom 
              ? `Manage fingerprint slots (1-127) and authorized identities for ${currentRoom.name}${currentRoom.location && currentRoom.location.trim() ? ` (${currentRoom.location})` : ''}.`
              : 'Fingerprint hardware IDs (1-127) are fixed. Scanned and enrolled slots automatically appear as Unknown User, ready to be named.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {currentRoom && onSwitchToLogs && (
            <button
              onClick={onSwitchToLogs}
              className="btn btn-secondary btn-sm"
              title={`View access history for ${currentRoom.name}`}
            >
              <span>{currentRoom.name} Access Logs</span>
            </button>
          )}

          <button
            onClick={() => {
              setPrefillDeviceId(selectedDevice || (devices[0]?.id ?? ''));
              setPrefillModalOpen(true);
            }}
            className="btn btn-secondary btn-sm"
            style={{ padding: '8px 14px' }}
            title="Pre-fill a range of slots (e.g. 1 to 10) as Unknown Users"
          >
            <Sparkles size={15} color="var(--accent-cyan)" />
            <span>Pre-fill Slots</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="btn btn-primary btn-sm"
            style={{ padding: '8px 16px' }}
          >
            <UserPlus size={15} />
            <span>{currentRoom ? `Add Slot (${currentRoom.name})` : 'Map Slot'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Hardware Summary Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Filter size={16} color="var(--text-dim)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Room:</span>
          {currentRoom ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="mono-tag" style={{ fontSize: 13, padding: '4px 10px', color: 'var(--text-main)', background: 'rgba(56, 189, 248, 0.15)', borderColor: 'var(--accent-cyan)' }}>
                {currentRoom.name} {currentRoom.location ? `(${currentRoom.location})` : ''}
              </span>
              <button 
                onClick={() => setSelectedDevice('')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: 11, padding: '3px 8px' }}
              >
                View All Rooms
              </button>
            </div>
          ) : (
            <select
              className="input"
              style={{ width: 220, fontSize: 13 }}
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
            >
              <option value="">All Rooms / Door Units</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>{d.name} {d.location ? `(${d.location})` : ''}</option>
              ))}
            </select>
          )}

          <button
            onClick={loadData}
            className="btn btn-secondary btn-sm"
            title="Refresh user directory"
            style={{ padding: '6px 10px' }}
          >
            <RefreshCw size={13} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: 'var(--text-dim)', flexWrap: 'wrap' }}>
          <div>
            Total Slots in {currentRoom ? currentRoom.name : 'System'}: <strong style={{ color: 'var(--text-main)' }}>{users.length}</strong>
          </div>
          {pendingCount > 0 && (
            <div style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#fbbf24' }}></span>
              <span>Pending Names: <strong>{pendingCount}</strong></span>
            </div>
          )}
          {namedCount > 0 && (
            <div style={{ color: 'var(--accent-cyan)' }}>
              Named: <strong>{namedCount}</strong>
            </div>
          )}
          <div>
            Capacity: <strong style={{ color: 'var(--text-muted)' }}>127 Slots/Unit</strong>
          </div>
        </div>
      </div>

      {/* Users Table — click any row to edit */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: 140 }}>Fixed Slot (ID)</th>
                <th>Assigned Name</th>
                <th>Associated Room Unit</th>
                <th>Role</th>
                <th>Enrolled Date &amp; Time</th>
                <th style={{ textAlign: 'right', width: 100 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const enrolled = formatEnrolled(user.created_at);
                const isUnknown = user.name.toLowerCase().startsWith('unknown');

                return (
                  <tr
                    key={user.id}
                    onClick={() => { setEditingUser(user); setModalOpen(true); }}
                    title="Click to change name or settings (Slot ID is fixed)"
                    style={{ 
                      cursor: 'pointer', 
                      userSelect: 'none',
                      backgroundColor: isUnknown ? 'rgba(245, 158, 11, 0.02)' : undefined 
                    }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Fingerprint size={16} color="var(--accent-cyan)" />
                        <span className="mono-tag" style={{ fontSize: 13, fontWeight: 700 }}>
                          #{user.fingerprint_id}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ 
                          fontWeight: 700, 
                          fontSize: 14, 
                          color: isUnknown ? '#fbbf24' : 'var(--text-main)' 
                        }}>
                          {user.name}
                        </span>
                        {isUnknown ? (
                          <span 
                            className="badge" 
                            style={{ 
                              background: 'rgba(245, 158, 11, 0.12)', 
                              color: '#fbbf24', 
                              border: '1px solid rgba(245, 158, 11, 0.3)', 
                              fontSize: 10, 
                              padding: '2px 7px',
                              letterSpacing: 0.5
                            }}
                          >
                            NAME PENDING
                          </span>
                        ) : (
                          <Pencil size={12} color="var(--text-dim)" style={{ opacity: 0.4, flexShrink: 0 }} />
                        )}
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Cpu size={14} color="var(--text-dim)" />
                        <strong style={{ color: 'var(--text-muted)' }}>{user.device_name || `Unit #${user.device_id}`}</strong>
                      </div>
                    </td>

                    <td>
                      {user.role === 'admin' || user.fingerprint_id <= 3 ? (
                        <span className="badge badge-admin">Administrator</span>
                      ) : (
                        <span className="badge badge-member">Member</span>
                      )}
                    </td>

                    <td>
                      <div style={{ lineHeight: 1.6 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block' }}>
                          {enrolled.date}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                          {enrolled.time}
                        </span>
                      </div>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <span 
                        className="btn btn-secondary btn-sm" 
                        style={{ fontSize: 11, padding: '3px 8px' }}
                      >
                        {isUnknown ? 'Set Name' : 'Edit'}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: 48, color: 'var(--text-dim)' }}>
                    <p style={{ marginBottom: 12 }}>No fingerprint slots detected or enrolled yet for this room.</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Slots are created automatically as <strong>Unknown User</strong> as soon as a finger is scanned, or you can click <strong>"Pre-fill Slots"</strong> to generate slots 1 to 10 immediately.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Map User Modal */}
      {modalOpen && (
        <UserModal
          user={editingUser}
          devices={devices}
          defaultDeviceId={selectedDevice}
          autoDetected={!editingUser ? autoDetected : null}
          onClose={() => { setModalOpen(false); setEditingUser(null); setAutoDetected(null); }}
          onSave={handleSaveUser}
        />
      )}

      {/* Pre-fill Slots Modal */}
      {prefillModalOpen && (
        <div className="modal-overlay" onClick={() => setPrefillModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sparkles size={22} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>Pre-fill Unknown User Slots</h3>
              </div>
              <button onClick={() => setPrefillModalOpen(false)} className="btn btn-secondary btn-sm" style={{ padding: 6 }}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Pre-populates hardware slot IDs (e.g. 1 to 10) as <strong>Unknown User #1</strong> ... <strong>Unknown User #10</strong>. Their IDs will remain fixed, and you can assign real names to each person at any time.
            </p>

            {prefillMessage && (
              <div style={{ 
                background: prefillMessage.startsWith('Error') ? 'rgba(244,63,94,0.15)' : 'rgba(16,185,129,0.15)', 
                border: `1px solid ${prefillMessage.startsWith('Error') ? 'rgba(244,63,94,0.3)' : 'rgba(16,185,129,0.3)'}`,
                color: prefillMessage.startsWith('Error') ? '#fecdd3' : '#a7f3d0',
                padding: '10px 14px', 
                borderRadius: 'var(--radius-md)', 
                fontSize: 13, 
                marginBottom: 16 
              }}>
                {prefillMessage}
              </div>
            )}

            <form onSubmit={handlePrefillSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Target Room Unit
                </label>
                <select 
                  className="input" 
                  value={prefillDeviceId} 
                  onChange={(e) => setPrefillDeviceId(e.target.value)}
                  required
                >
                  {devices.map(d => (
                    <option key={d.id} value={d.id}>{d.name} {d.location ? `(${d.location})` : ''}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Number of Slots (e.g. 10 users = slots 1 to 10)
                </label>
                <input 
                  type="number" 
                  min="1" 
                  max="127" 
                  className="input"
                  value={prefillCount} 
                  onChange={(e) => setPrefillCount(e.target.value)}
                  required
                />
                <span style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, display: 'block' }}>
                  Existing slots won't be overwritten. Any new slots will be added as "Unknown User #ID".
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setPrefillModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={prefillLoading} className="btn btn-primary">
                  {prefillLoading ? 'Creating Slots...' : `Generate Slots 1 to ${prefillCount || 10}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
