import React, { useState } from 'react';
import { X, Key, Cpu } from 'lucide-react';

export default function DeviceModal({ device, onClose, onSave }) {
  const [name, setName] = useState(device ? device.name : '');
  const [location, setLocation] = useState(device ? device.location || '' : '');
  const [secretKey, setSecretKey] = useState(device ? device.secret_key : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Room Name / Identifier is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSave({
        name: name.trim().toUpperCase().replace(/\s+/g, '_'),
        location: location.trim(),
        secret_key: secretKey.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save device');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Cpu size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>
              {device ? 'Edit Device Room' : 'Register New ESP32 Unit'}
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
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
              Room Identifier (ESP32 "dir" parameter)
            </label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. FUN_LAB, ROBOTICS_BAY, SERVER_RM"
              required
            />
            <span style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, display: 'block' }}>
              Must match the exact <code>dir=...</code> parameter sent by your ESP32.
            </span>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
              Physical Location / Notes
            </label>
            <input
              type="text"
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Building A, Room 204, East Entrance"
            />
          </div>

          {!device && (
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                Custom Secret Key (Optional)
              </label>
              <input
                type="text"
                className="input"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Leave blank to auto-generate a secure key"
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Saving...' : (device ? 'Update Device' : 'Register Device')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
