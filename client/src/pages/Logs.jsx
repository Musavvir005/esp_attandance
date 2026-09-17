import React, { useState, useEffect, useRef } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  ShieldCheck, 
  UserCheck, 
  UserX,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../api';

// Helper to get local YYYY-MM-DD
const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Logs({ selectedRoomId = '', onSelectRoom }) {
  const dateInputRef = useRef(null);
  const [logs, setLogs] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Filters
  const [deviceId, setDeviceId] = useState(selectedRoomId || '');

  // Sync when global room switcher changes
  useEffect(() => {
    setDeviceId(selectedRoomId || '');
    setPage(1);
  }, [selectedRoomId]);
  const [search, setSearch] = useState('');
  const [fingerprintId, setFingerprintId] = useState('');
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());

  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });

  const fetchLogs = async () => {
    try {
      const res = await api.getLogs({
        page,
        limit: 25,
        device_id: deviceId || undefined,
        search: search.trim() || undefined,
        fingerprint_id: fingerprintId ? parseInt(fingerprintId, 10) : undefined,
        date: selectedDate || undefined,
      });

      setLogs(res.logs || []);
      setPagination(res.pagination || { totalPages: 1, total: 0 });
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.getDevices().then((res) => setDevices(res.devices || []));
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [page, deviceId, fingerprintId, selectedDate]);

  // Handle Search submit
  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchLogs();
    }, 3000);
    return () => clearInterval(timer);
  }, [autoRefresh, page, deviceId, fingerprintId, selectedDate, search]);

  const exportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['ID', 'Timestamp', 'Device', 'Location', 'Fingerprint ID', 'User Name', 'Role', 'Status'];
    const rows = logs.map(l => [
      l.id,
      new Date(l.timestamp).toISOString(),
      `"${l.device_name || ''}"`,
      `"${l.device_location || ''}"`,
      l.fingerprint_id,
      `"${l.user_name || 'Unassigned'}"`,
      l.user_role || 'N/A',
      l.user_active ? 'Active' : 'Inactive'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `access_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1300, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
            <History size={24} color="var(--accent-cyan)" />
            Audit & Access History
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Tamper-evident log of all biometric scans and door unlocks across all rooms.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="btn btn-secondary btn-sm"
            style={{
              borderColor: autoRefresh ? 'var(--accent-emerald)' : undefined,
              color: autoRefresh ? 'var(--accent-emerald)' : undefined,
            }}
          >
            <RefreshCw size={14} className={autoRefresh ? 'unlocking-active' : ''} />
            <span>{autoRefresh ? 'Live Polling: ON' : 'Live Polling: Paused'}</span>
          </button>

          <button onClick={exportCSV} className="btn btn-secondary btn-sm">
            <FileSpreadsheet size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="glass-panel" style={{ padding: 18, marginBottom: 20 }}>
        <form onSubmit={handleSearch} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr)) auto',
          gap: 12,
          alignItems: 'end',
        }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 4, textTransform: 'uppercase' }}>
              Search Name / Device
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="var(--text-dim)" style={{ position: 'absolute', left: 12, top: 12 }} />
              <input
                type="text"
                className="input"
                style={{ paddingLeft: 34, fontSize: 13 }}
                placeholder="e.g. John Doe, FUN_LAB"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 4, textTransform: 'uppercase' }}>
              Filter by Room
            </label>
            <select
              className="input"
              style={{ fontSize: 13 }}
              value={deviceId}
              onChange={(e) => { setDeviceId(e.target.value); setPage(1); }}
            >
              <option value="">All Hardware Units</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 4, textTransform: 'uppercase' }}>
              Fingerprint ID
            </label>
            <input
              type="text"
              inputMode="numeric"
              className="input"
              style={{ fontSize: 13 }}
              placeholder="Type slot # (e.g. 17)"
              value={fingerprintId}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setFingerprintId(val);
                setPage(1);
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 4, textTransform: 'uppercase' }}>
              Select Date (Calendar)
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div
                style={{ position: 'relative', width: '100%', cursor: 'pointer' }}
                onClick={() => {
                  try {
                    dateInputRef.current?.showPicker();
                  } catch (err) {}
                }}
              >
                <Calendar
                  size={16}
                  color="var(--accent-cyan)"
                  style={{ position: 'absolute', left: 12, top: 12, pointerEvents: 'none', zIndex: 2 }}
                />
                <input
                  ref={dateInputRef}
                  type="date"
                  className="input"
                  style={{
                    paddingLeft: 38,
                    fontSize: 13,
                    cursor: 'pointer',
                    colorScheme: 'dark',
                  }}
                  value={selectedDate}
                  onChange={(e) => { setSelectedDate(e.target.value); setPage(1); }}
                  onClick={(e) => {
                    try {
                      e.target.showPicker();
                    } catch (err) {}
                  }}
                />
              </div>

              {selectedDate ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDate('');
                    setPage(1);
                  }}
                  className="btn btn-secondary btn-sm"
                  title="Show logs from all dates"
                  style={{ padding: '9px 12px', fontSize: 12, whiteSpace: 'nowrap' }}
                >
                  All Dates
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDate(getTodayDateString());
                    setPage(1);
                  }}
                  className="btn btn-secondary btn-sm"
                  title="Filter to today only"
                  style={{ padding: '9px 12px', fontSize: 12, whiteSpace: 'nowrap', color: 'var(--accent-cyan)', borderColor: 'var(--accent-cyan)' }}
                >
                  Today
                </button>
              )}
            </div>
          </div>

          <div>
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 18px', fontSize: 13 }}>
              <Filter size={14} />
              <span>Apply</span>
            </button>
          </div>
        </form>
      </div>

      {/* Logs Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Room Unit ("dir")</th>
                <th>Enrolled User</th>
                <th>Fingerprint Slot</th>
                <th>Access Privilege</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const isRegistered = Boolean(log.user_name);
                const logDate = log.raw_date || new Date(log.timestamp).toLocaleDateString();
                const logTime = log.raw_time || new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                return (
                  <tr key={log.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#fff' }}>
                        {logDate}
                      </div>
                    </td>

                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent-cyan)', fontWeight: 600 }}>
                        {logTime}
                      </span>
                    </td>

                    <td>
                      <div style={{ fontWeight: 700, color: '#fff' }}>
                        {log.device_name || `Device #${log.device_id}`}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                        {log.device_location || 'Standard entry'}
                      </div>
                    </td>

                    <td>
                      {isRegistered ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, color: '#fff' }}>{log.user_name}</span>
                          {!log.user_active && (
                            <span className="badge badge-inactive">SUSPENDED</span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>
                          Unregistered Fingerprint
                        </span>
                      )}
                    </td>

                    <td>
                      <span className="mono-tag">
                        SLOT #{log.fingerprint_id}
                      </span>
                    </td>

                    <td>
                      {log.user_role === 'admin' ? (
                        <span className="badge badge-admin">Administrator</span>
                      ) : log.user_role === 'member' ? (
                        <span className="badge badge-member">Member</span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Visitor / Unknown</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: 48, color: 'var(--text-dim)' }}>
                    No access log events match your filter criteria for {selectedDate || 'all dates'}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: 13,
          color: 'var(--text-muted)',
        }}>
          <div>
            Showing <strong style={{ color: '#fff' }}>{logs.length}</strong> of{' '}
            <strong style={{ color: '#fff' }}>{pagination.total}</strong> records
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn btn-secondary btn-sm"
              style={{ opacity: page <= 1 ? 0.4 : 1 }}
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>

            <span>
              Page <strong style={{ color: '#fff' }}>{page}</strong> of {pagination.totalPages || 1}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="btn btn-secondary btn-sm"
              style={{ opacity: page >= pagination.totalPages ? 0.4 : 1 }}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
