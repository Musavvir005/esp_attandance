import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Plus, 
  Key, 
  RotateCw, 
  Copy, 
  Check, 
  Edit3, 
  Trash2, 
  Code, 
  MapPin, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';
import { api } from '../api';
import DeviceModal from '../components/DeviceModal';
import FirmwareModal from '../components/FirmwareModal';

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [firmwareDevice, setFirmwareDevice] = useState(null);
  const [copiedKeyId, setCopiedKeyId] = useState(null);

  const loadDevices = async () => {
    try {
      const res = await api.getDevices();
      setDevices(res.devices || []);
    } catch (err) {
      console.error('Failed to load devices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
    const interval = setInterval(loadDevices, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveDevice = async (data) => {
    if (editingDevice) {
      await api.updateDevice(editingDevice.id, data);
    } else {
      await api.createDevice(data);
    }
    loadDevices();
  };

  const handleRotateKey = async (device) => {
    if (!window.confirm(`Rotate secret key for "${device.name}"? The existing firmware will stop authenticating until you update its DEVICE_SECRET constant.`)) {
      return;
    }

    try {
      const res = await api.rotateDeviceKey(device.id);
      alert(`Key rotated successfully! New key:\n${res.device.secret_key}`);
      loadDevices();
    } catch (err) {
      alert(`Rotation failed: ${err.message}`);
    }
  };

  const handleDeleteDevice = async (device) => {
    if (!window.confirm(`Delete device "${device.name}"? This will remove all associated user mappings.`)) {
      return;
    }

    try {
      await api.deleteDevice(device.id);
      loadDevices();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const copyToClipboard = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1300, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Cpu size={24} color="var(--accent-cyan)" />
            Hardware Units & Cryptographic Keys
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Manage room endpoints, view heartbeat signals, and generate firmware constants for each ESP32 unit.
          </p>
        </div>

        <button
          onClick={() => { setEditingDevice(null); setModalOpen(true); }}
          className="btn btn-primary"
          style={{ padding: '10px 18px' }}
        >
          <Plus size={16} />
          <span>Register New Unit</span>
        </button>
      </div>

      {/* Device Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: 20,
      }}>
        {devices.map((device) => (
          <div key={device.id} className="glass-panel" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`status-dot ${device.is_online ? 'online' : 'offline'}`} />
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>
                    {device.name}
                  </h3>
                  <span className={`badge ${device.is_online ? 'badge-active' : 'badge-inactive'}`}>
                    {device.is_online ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  <MapPin size={13} color="var(--text-dim)" />
                  <span>{device.location || 'Location unassigned'}</span>
                </div>
              </div>

              <button
                onClick={() => setFirmwareDevice(device)}
                className="btn btn-secondary btn-sm"
                title="View ESP32 C++ Sketch Constants"
              >
                <Code size={13} />
                <span>Firmware</span>
              </button>
            </div>

            {/* Secret Key Container */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Secret Authentication Key
                </span>
                <button
                  onClick={() => copyToClipboard(device.id, device.secret_key)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '2px 6px', fontSize: 11 }}
                  title="Copy Key to Clipboard"
                >
                  {copiedKeyId === device.id ? <Check size={11} color="var(--accent-emerald)" /> : <Copy size={11} />}
                  <span>{copiedKeyId === device.id ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--accent-cyan)',
                wordBreak: 'break-all',
              }}>
                {device.secret_key}
              </div>
            </div>

            {/* Last Seen & Stats */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} />
                <span>
                  Last Poll: {device.last_seen_at ? new Date(device.last_seen_at).toLocaleTimeString() : 'Never'}
                </span>
              </div>
              <div>
                <strong>{device.user_count || 0}</strong> Registered Users
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
              <button
                onClick={() => handleRotateKey(device)}
                className="btn btn-secondary btn-sm"
                title="Generate new secret key"
              >
                <RotateCw size={12} />
                <span>Rotate Key</span>
              </button>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => { setEditingDevice(device); setModalOpen(true); }}
                  className="btn btn-secondary btn-sm"
                  title="Edit Room Details"
                >
                  <Edit3 size={13} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDeleteDevice(device)}
                  className="btn btn-danger btn-sm"
                  title="Delete Room Unit"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {devices.length === 0 && !loading && (
          <div className="glass-panel" style={{ padding: 40, textAlign: 'center', gridColumn: '1 / -1' }}>
            <Cpu size={40} color="var(--text-dim)" style={{ marginBottom: 12 }} />
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>No Devices Registered</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Register your first ESP32 unit to begin accepting biometric scans.
            </p>
          </div>
        )}
      </div>

      {modalOpen && (
        <DeviceModal
          device={editingDevice}
          onClose={() => { setModalOpen(false); setEditingDevice(null); }}
          onSave={handleSaveDevice}
        />
      )}

      {firmwareDevice && (
        <FirmwareModal
          device={firmwareDevice}
          onClose={() => setFirmwareDevice(null)}
        />
      )}
    </div>
  );
}
