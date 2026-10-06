import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Plus, 
  Edit3, 
  Trash2, 
  Code, 
  MapPin, 
  Clock, 
  History, 
  Users 
} from 'lucide-react';
import { api } from '../api';
import DeviceModal from '../components/DeviceModal';
import FirmwareModal from '../components/FirmwareModal';

export default function Devices({ onDevicesUpdated, onNavigateToRoom }) {
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
    await loadDevices();
    if (onDevicesUpdated) onDevicesUpdated();
  };

  const handleDeleteDevice = async (device) => {
    if (!window.confirm(`Delete room unit "${device.name}"? This will remove all associated user mappings and logs.`)) {
      return;
    }

    try {
      await api.deleteDevice(device.id);
      await loadDevices();
      if (onDevicesUpdated) onDevicesUpdated();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(18px, 3.5vw, 22px)', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cpu size={22} color="var(--accent-cyan)" />
            Door Units &amp; Rooms
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Manage registered rooms, monitor live ESP32 heartbeat connections, and view firmware configuration.
          </p>
        </div>

        <button
          onClick={() => { setEditingDevice(null); setModalOpen(true); }}
          className="btn btn-primary"
          style={{ padding: '8px 16px', fontSize: 13 }}
        >
          <Plus size={15} />
          <span>Add Door Unit</span>
        </button>
      </div>

      {/* Responsive Device Cards Grid */}
      <div className="devices-grid">
        {devices.map((device) => (
          <div key={device.id} className="glass-panel" style={{ padding: '18px clamp(14px, 3vw, 22px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className={`status-dot ${device.is_online ? 'online' : 'offline'}`} />
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)' }}>
                    {device.name}
                  </h3>
                  <span className={`badge ${device.is_online ? 'badge-active' : 'badge-inactive'}`} style={{ fontSize: 9 }}>
                    {device.is_online ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
                {device.location && device.location.trim() && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    <MapPin size={12} color="var(--text-dim)" />
                    <span>{device.location}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setFirmwareDevice(device)}
                className="btn btn-secondary btn-sm"
                title="View ESP32 C++ Sketch Constants"
                style={{ padding: '5px 8px', fontSize: 11 }}
              >
                <Code size={12} />
                <span>Firmware</span>
              </button>
            </div>

            {/* Last Seen & Stats */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, color: 'var(--text-dim)', margin: '14px 0', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={12} />
                <span>
                  Seen: <strong style={{ color: 'var(--text-muted)' }}>{device.last_seen_at ? new Date(device.last_seen_at).toLocaleTimeString() : 'Never'}</strong>
                </span>
              </div>
              <div>
                <strong style={{ color: 'var(--accent-cyan)' }}>{device.user_count || 0}</strong> Users
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, borderTop: '1px solid var(--border-subtle)', paddingTop: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  onClick={() => onNavigateToRoom && onNavigateToRoom(device.id, 'logs')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: 11, padding: '4px 8px' }}
                  title={`Open Access Logs for ${device.name}`}
                >
                  <History size={12} color="var(--accent-cyan)" />
                  <span>Logs</span>
                </button>
                <button
                  onClick={() => onNavigateToRoom && onNavigateToRoom(device.id, 'users')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: 11, padding: '4px 8px' }}
                  title={`Open User Directory for ${device.name}`}
                >
                  <Users size={12} color="var(--accent-indigo)" />
                  <span>Users ({device.user_count || 0})</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => { setEditingDevice(device); setModalOpen(true); }}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '4px 8px' }}
                  title="Edit Room Details"
                >
                  <Edit3 size={13} />
                </button>
                <button
                  onClick={() => handleDeleteDevice(device)}
                  className="btn btn-danger btn-sm"
                  style={{ padding: '4px 8px' }}
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
            <Cpu size={36} color="var(--text-dim)" style={{ marginBottom: 12 }} />
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>No Rooms Registered</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Add your first room unit or turn on your ESP32 board to auto-register.
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
