import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import RoomBar from './components/RoomBar';
import DeviceModal from './components/DeviceModal';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Logs from './pages/Logs';
import Users from './pages/Users';
import Devices from './pages/Devices';
import { api } from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('controls');
  const [stats, setStats] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [addRoomModalOpen, setAddRoomModalOpen] = useState(false);

  // Theme state: Day (light) and Night (dark)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('gatekeeper_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gatekeeper_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Check login session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      loadDashboardData();
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const [statsData, devicesData] = await Promise.all([
        api.getStats(),
        api.getDevices(),
      ]);
      setStats(statsData);
      const list = devicesData.devices || [];
      setDevices(list);

      // Keep selectedRoomId valid: if empty or deleted, pick first available room
      setSelectedRoomId((prev) => {
        if (list.length === 0) return '';
        const exists = list.some(d => String(d.id) === String(prev));
        if (exists) return prev;
        return list[0].id;
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  // Poll stats every 6 seconds if logged in
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(loadDashboardData, 6000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    setUser(null);
  };

  const handleNavigateToRoom = (roomId, tab = 'logs') => {
    setSelectedRoomId(roomId);
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--accent-cyan)',
        fontFamily: 'var(--font-mono)',
        fontSize: 14,
      }}>
        INITIALIZING GATEKEEPER MULTI-ROOM CONSOLE...
      </div>
    );
  }

  if (!user) {
    return (
      <Login 
        theme={theme}
        onToggleTheme={toggleTheme}
        onLoginSuccess={(u) => { setUser(u); loadDashboardData(); }} 
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        stats={stats}
        devices={devices}
        selectedRoomId={selectedRoomId}
        onSelectRoom={setSelectedRoomId}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Dynamic Room Bar & Subnav */}
      <RoomBar
        devices={devices}
        selectedRoomId={selectedRoomId}
        onSelectRoom={(id) => setSelectedRoomId(id)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddRoom={() => setAddRoomModalOpen(true)}
        onRefreshStats={loadDashboardData}
      />

      <main style={{ flex: 1 }}>
        {activeTab === 'controls' && (
          <Dashboard
            stats={stats}
            devices={devices}
            selectedRoomId={selectedRoomId}
            onSelectRoom={setSelectedRoomId}
            onRefreshStats={loadDashboardData}
            onNavigateToRoom={handleNavigateToRoom}
          />
        )}
        {activeTab === 'logs' && (
          <Logs
            selectedRoomId={selectedRoomId}
            onSelectRoom={setSelectedRoomId}
            onSwitchToUsers={() => setActiveTab('users')}
          />
        )}
        {activeTab === 'users' && (
          <Users
            selectedRoomId={selectedRoomId}
            onSelectRoom={setSelectedRoomId}
            onSwitchToLogs={() => setActiveTab('logs')}
          />
        )}
        {activeTab === 'devices' && (
          <Devices
            onDevicesUpdated={loadDashboardData}
            onNavigateToRoom={handleNavigateToRoom}
          />
        )}
      </main>

      {/* Global Quick Add Room Modal */}
      {addRoomModalOpen && (
        <DeviceModal
          onClose={() => setAddRoomModalOpen(false)}
          onSave={async (data) => {
            const res = await api.createDevice(data);
            await loadDashboardData();
            if (res?.device?.id) {
              setSelectedRoomId(res.device.id);
              setActiveTab('logs');
            }
          }}
        />
      )}
    </div>
  );
}
