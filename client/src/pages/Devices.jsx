import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Plus, 
  Edit3, 
  Trash2, 
  Code, 
  MapPin, 
  Clock 
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

  const handleDeleteDevice = async (device) => {
    if (!window.confirm(`Delete room unit "${device.name}"? This will remove all associated user mappings.`)) {
      return;
    }

    try {
      await api.deleteDevice(device.id);
      loadDevices();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1300, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Cpu size={24} color="var(--accent-cyan)" />
            Door Units &amp; Rooms
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Manage registered rooms, monitor live ESP32 heartbeat connections, and view firmware configuration.
          </p>
        </div>

        <button
          onClick={() => { setEditingDevice(null); setModalOpen(true); }}
          className="btn btn-primary"
          style={{ padding: '10px 18px' }}
        >
          <Plus size={16} />
          <span>Add Door Unit</span>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
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

            {/* Last Seen & Stats */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-dim)', margin: '18px 0', background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={13} />
                <span>
                  Last Seen: <strong style={{ color: 'var(--text-muted)' }}>{device.last_seen_at ? new Date(device.last_seen_at).toLocaleTimeString() : 'Never'}</strong>
                </span>
              </div>
              <div>
                <strong style={{ color: 'var(--accent-cyan)' }}>{device.user_count || 0}</strong> Registered Users
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
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
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}

        {devices.length === 0 && !loading && (
          <div className="glass-panel" style={{ padding: 40, textAlign: 'center', gridColumn: '1 / -1' }}>
            <Cpu size={40} color="var(--text-dim)" style={{ marginBottom: 12 }} />
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>No Rooms Registered</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Add your first room unit or simply turn on your ESP32 board to auto-register.
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

