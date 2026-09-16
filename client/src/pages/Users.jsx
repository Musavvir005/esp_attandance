import React, { useState, useEffect } from 'react';
import { 
  Users as UsersIcon, 
  UserPlus, 
  Fingerprint, 
  Filter, 
  Cpu,
  Pencil
} from 'lucide-react';
import { api } from '../api';
import UserModal from '../components/UserModal';

export default function Users({ selectedRoomId = '', onSelectRoom }) {
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(selectedRoomId || '');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

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

  // Format enrolled date + time with seconds
  const formatEnrolled = (dateStr) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { date: 'â€”', time: '' };
    const date = d.toLocaleDateString('en-GB'); // DD/MM/YYYY
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return { date, time };
  };

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1300, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
            <UsersIcon size={24} color="var(--accent-indigo)" />
            Biometric User Directory
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Map sensor hardware fingerprint IDs (1â€“127) to human identities and permissions.
            <br />
            <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>
              ðŸ’¡ Click any row to edit that person's name, role or ID. The ESP32 only sends a slot number â€” you assign the name here.
            </span>
          </p>
        </div>

        {/* "Add Fingerprint Mapping" = link a new slot number to a person's name */}
        <button
          onClick={() => { setEditingUser(null); setModalOpen(true); }}
          className="btn btn-primary"
          style={{ padding: '10px 18px', flexShrink: 0, marginTop: 4 }}
          title="Link a fingerprint slot number (1-127 from the sensor) to a person's name and role"
        >
          <UserPlus size={16} />
          <span>Add Fingerprint Mapping</span>
        </button>
      </div>

      {/* Filter and Hardware Summary Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Filter size={16} color="var(--text-dim)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Room Filter:</span>
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
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: 'var(--text-dim)' }}>
          <div>
            Total Assigned: <strong style={{ color: '#fff' }}>{users.length}</strong>
          </div>
          <div>
            R307/AS608 Capacity: <strong style={{ color: 'var(--accent-cyan)' }}>127 Slots/Unit</strong>
          </div>
        </div>
      </div>

      {/* Users Table â€” click any row to edit */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Slot (ID)</th>
                <th>Full Name</th>
                <th>Associated Room Unit</th>
                <th>Role</th>
                <th>Enrolled Date &amp; Time</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const enrolled = formatEnrolled(user.created_at);
                return (
                  <tr
                    key={user.id}
                    onClick={() => { setEditingUser(user); setModalOpen(true); }}
                    title="Click to edit name, role or fingerprint ID"
                    style={{ cursor: 'pointer' }}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>
                          {user.name}
                        </span>
                        <Pencil size={12} color="var(--text-dim)" style={{ opacity: 0.45, flexShrink: 0 }} />
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Cpu size={14} color="var(--text-dim)" />
                        <strong style={{ color: 'var(--text-muted)' }}>{user.device_name || `Unit #${user.device_id}`}</strong>
                      </div>
                    </td>

                    <td>
                      {user.role === 'admin' ? (
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
                  </tr>
                );
              })}

              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: 48, color: 'var(--text-dim)' }}>
                    No users enrolled for this device yet. Click "Add Fingerprint Mapping" to link a slot ID to a person.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <UserModal
          user={editingUser}
          devices={devices}
          onClose={() => { setModalOpen(false); setEditingUser(null); }}
          onSave={handleSaveUser}
        />
      )}
    </div>
  );
}
