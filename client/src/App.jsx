import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
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
      setDevices(devicesData.devices || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  // Poll stats every 8 seconds if logged in
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(loadDashboardData, 8000);
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
    return <Login onLoginSuccess={(u) => { setUser(u); loadDashboardData(); }} />;
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
      />

      <main style={{ flex: 1 }}>
        {activeTab === 'controls' && (
          <Dashboard
            stats={stats}
            devices={devices}
            selectedRoomId={selectedRoomId}
            onSelectRoom={setSelectedRoomId}
            onRefreshStats={loadDashboardData}
          />
        )}
        {activeTab === 'logs' && (
          <Logs
            selectedRoomId={selectedRoomId}
            onSelectRoom={setSelectedRoomId}
          />
        )}
        {activeTab === 'users' && (
          <Users
            selectedRoomId={selectedRoomId}
            onSelectRoom={setSelectedRoomId}
          />
        )}
        {activeTab === 'devices' && (
          <Devices
            onDevicesUpdated={loadDashboardData}
          />
        )}
      </main>
    </div>
  );
}
