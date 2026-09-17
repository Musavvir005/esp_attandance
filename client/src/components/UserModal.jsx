import React, { useState } from 'react';
import { X, Fingerprint, UserCheck } from 'lucide-react';

export default function UserModal({ user, devices = [], onClose, onSave }) {
  const [fingerprintId, setFingerprintId] = useState(user?.fingerprint_id ?? '');
  const [deviceId, setDeviceId] = useState(user?.device_id ?? (devices[0]?.id || ''));
  const [name, setName] = useState(user?.name ?? '');
  const [role, setRole] = useState(user?.role ?? 'member');
  const [active, setActive] = useState(user?.active ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fpNum = parseInt(fingerprintId, 10);
    if (isNaN(fpNum) || fpNum < 1 || fpNum > 127) {
      setError('Fingerprint ID must be a number between 1 and 127 (sensor capacity)');
      return;
    }

    if (!name.trim()) {
      setError('User name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSave({
        fingerprint_id: fpNum,
        device_id: parseInt(deviceId, 10),
        name: name.trim(),
        role,
        active,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save user mapping');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Fingerprint size={22} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>
              {user ? 'Edit Fingerprint Mapping' : 'Map Fingerprint ID to User'}
            </h3>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ padding: 6 }}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#fecdd3',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                Fingerprint Slot (1-127)
              </label>
              <input
                type="text"
                inputMode="numeric"
                className="input"
                value={fingerprintId}
                onChange={(e) => setFingerprintId(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="e.g. 17"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                Assigned Unit / Room
              </label>
              <select
                className="input"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                required
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.location ? `(${d.location})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
              Full Name
            </label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe, Sarah Connor"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                Access Role
              </label>
              <select
                className="input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="member">Member</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                Status
              </label>
              <select
                className="input"
                value={active ? 'true' : 'false'}
                onChange={(e) => setActive(e.target.value === 'true')}
              >
                <option value="true">Active (Allowed)</option>
                <option value="false">Suspended (Blocked)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Saving...' : (user ? 'Update Mapping' : 'Save Mapping')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
