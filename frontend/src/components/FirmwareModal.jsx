import React, { useState } from 'react';
import { X, Copy, Check, Terminal, ShieldAlert } from 'lucide-react';

export default function FirmwareModal({ device, onClose }) {
  const [copied, setCopied] = useState(false);
  const origin = window.location.origin;

  const codeSnippet = `// ==========================================
// ESP32 FIRMWARE CONFIGURATION CONSTANTS
// Room: ${device.name}
// ==========================================

const char* server_url  = "${origin}/log";
const char* unlock_url  = "${origin}/check-unlock";
const char* DIR_NAME    = "${device.name}";

// 1) Fingerprint Log URL (sent on valid scan):
// GET \${server_url}?id=17&date=2026-09-15&time=14:32:07&dir=${device.name}

// 2) Remote Unlock Polling URL (polled in loop):
// GET \${unlock_url}?dir=${device.name}
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 650 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Terminal size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>ESP32 Firmware Constants</h3>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ padding: 6 }}>
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          Copy these constants into your Arduino / PlatformIO sketch for room <strong style={{ color: '#fff' }}>{device.name}</strong>. No firmware HTTP logic changes required.
        </p>

        <div style={{ position: 'relative', marginBottom: 20 }}>
          <pre style={{
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: '#a5f3fc',
            lineHeight: 1.6,
            overflowX: 'auto',
          }}>
            {codeSnippet}
          </pre>
          <button
            onClick={handleCopy}
            className="btn btn-primary btn-sm"
            style={{ position: 'absolute', top: 12, right: 12 }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy Code'}</span>
          </button>
        </div>

        <div style={{
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: 12,
          fontSize: 12,
          color: '#bae6fd',
          display: 'flex',
          gap: 10,
        }}>
          <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Firmware Safety:</strong> <code>/check-unlock</code> returns literal plain text <code>true</code> or <code>false</code>. Your firmware's <code>payload.indexOf("true") &gt;= 0</code> will cleanly catch unlocks and ignore the false responses.
          </div>
        </div>
      </div>
    </div>
  );
}
