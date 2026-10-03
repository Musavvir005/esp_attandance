import React, { useState } from 'react';
import { X, Fingerprint, Lock, Cpu, Check } from 'lucide-react';

export default function UserModal({ user, devices = [], defaultDeviceId = null, autoDetected = null, onClose, onSave }) {
  const isNew = !user;

  const initialFp = user?.fingerprint_id ?? (autoDetected?.fingerprint_id ?? '');
  const [fingerprintId, setFingerprintId] = useState(initialFp);
  const [deviceId, setDeviceId] = useState(user?.device_id ?? (autoDetected?.device_id ?? defaultDeviceId ?? devices[0]?.id ?? ''));
  const [name, setName] = useState(user?.name ?? '');
  const computeRole = (fp) => (parseInt(fp, 10) <= 3 ? 'admin' : 'member');
  const [role, setRole] = useState(initialFp !== '' ? computeRole(initialFp) : 'member');
  const [active, setActive] = useState(user?.active ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFingerprintChange = (val) => {
    const clean = val.replace(/[^0-9]/g, '');
    setFingerprintId(clean);
    const num = parseInt(clean, 10);
    if (!isNaN(num) && num >= 1) setRole(num <= 3 ? 'admin' : 'member');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fpNum = parseInt(fingerprintId, 10);
    if (isNaN(fpNum) || fpNum < 1 || fpNum > 127) {
      setError('Fingerprint ID must be a number between 1 and 127');
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

  const detectedDeviceName = autoDetected?.device_name
    || devices.find(d => String(d.id) === String(deviceId))?.name || '';

  const isUnknownName = name.toLowerCase().startsWith('unknown');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Fingerprint size={22} color="var(--accent-cyan)" />
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>
                {user ? `Edit User — Slot #${user.fingerprint_id}` : 'Map Fingerprint ID to User'}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                {user ? 'Hardware slot ID is fixed. You can change the name and permissions below.' : 'Assign a name and role to a hardware slot.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ padding: 6 }}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#fecdd3', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* EDIT MODE: Fixed Slot ID and Room Unit */}
          {user ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Fingerprint Slot (Fixed ID)
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  height: 40,
                  padding: '0 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  background: 'rgba(56, 189, 248, 0.08)',
                  fontSize: 14,
                  color: 'var(--accent-cyan)',
                  fontWeight: 700,
                }}>
                  <Lock size={14} color="var(--accent-cyan)" />
                  <span>Slot #{user.fingerprint_id}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-dim)', fontWeight: 400 }}>Fixed</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Assigned Room Unit
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  height: 40,
                  padding: '0 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.04)',
                  fontSize: 13,
                  color: 'var(--text-main)',
                  fontWeight: 600,
                }}>
                  <Cpu size={14} color="var(--text-dim)" />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.device_name || `Unit #${user.device_id}`}
                  </span>
                </div>
              </div>
            </div>
          ) : autoDetected ? (
            /* NEW MODE WITH AUTO-DETECTED SCAN */
            <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
                <span style={{ color: 'var(--text-dim)', marginRight: 6 }}>Detected Slot:</span>
                <strong style={{ color: 'var(--accent-cyan)' }}>#{autoDetected.fingerprint_id}</strong>
              </div>
              <div style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
                <span style={{ color: 'var(--text-dim)', marginRight: 6 }}>Room:</span>
                <strong style={{ color: 'var(--accent-cyan)' }}>{detectedDeviceName || '—'}</strong>
              </div>
            </div>
          ) : (
            /* NEW MODE: Manual slot selection */
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Fingerprint Slot (1-127)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="input"
                  value={fingerprintId}
                  onChange={(e) => handleFingerprintChange(e.target.value)}
                  placeholder="e.g. 1"
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Assigned Unit / Room</label>
                <select className="input" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} required>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} {d.location ? `(${d.location})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Full Name field — always editable */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                Full Name
              </label>
              {isUnknownName && (
                <span style={{ fontSize: 11, color: 'var(--accent-amber, #f59e0b)', fontWeight: 600 }}>
                  Enter real name to replace Unknown
                </span>
              )}
            </div>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Doremon, Nobita, John Doe"
              autoFocus
              onFocus={(e) => {
                if (isUnknownName) e.target.select();
              }}
              required
              style={{
                borderColor: isUnknownName ? 'rgba(245, 158, 11, 0.4)' : undefined,
                boxShadow: isUnknownName ? '0 0 0 1px rgba(245, 158, 11, 0.15)' : undefined,
              }}
            />
          </div>

          {/* Role + Status */}
          <div style={{ display: 'grid', gridTemplateColumns: user ? '1fr 1fr' : '1fr', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Access Role</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 12px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', fontSize: 14, color: role === 'admin' ? '#a78bfa' : 'var(--accent-cyan)', fontWeight: 600 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: role === 'admin' ? '#a78bfa' : 'var(--accent-cyan)', flexShrink: 0 }} />
                {role === 'admin' ? 'Administrator' : 'Member'}
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
                  {parseInt(fingerprintId, 10) <= 3 ? 'Slots 1-3 admin' : 'Member slot'}
                </span>
              </div>
            </div>
            {user && (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Status</label>
                <select className="input" value={active ? 'true' : 'false'} onChange={(e) => setActive(e.target.value === 'true')}>
                  <option value="true">Active (Allowed)</option>
                  <option value="false">Suspended (Blocked)</option>
                </select>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Saving...' : (user ? 'Update User Name' : 'Save Mapping')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
