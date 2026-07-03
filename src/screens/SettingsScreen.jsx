import { useEffect, useState } from 'react';
import qrcode from 'qrcode-generator';
import { useApp } from '../context/AppContext.jsx';
import { getBooth } from '../remote/booth.js';

const STATUS_LABEL = {
  disconnected: { text: '未連線', color: '#E0584B' },
  waiting: { text: '等待 iPhone 加入...', color: '#E8B33C' },
  connected: { text: '已連線', color: '#39D46E' },
};

export default function SettingsScreen({ onBack }) {
  const { cameraSource, setCameraSource } = useApp();
  const [status, setStatus] = useState(getBooth().status);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [showRaw, setShowRaw] = useState(() => localStorage.getItem('pb_show_raw') === '1');

  function toggleRaw() {
    const next = !showRaw;
    setShowRaw(next);
    localStorage.setItem('pb_show_raw', next ? '1' : '0');
  }

  const pairCode = getBooth().pairCode;
  const cameraUrl = `${location.origin}/photo-booth/camera?pair=${pairCode}`;

  useEffect(() => {
    const qr = qrcode(0, 'M');
    qr.addData(cameraUrl);
    qr.make();
    setQrDataUrl(qr.createDataURL(6, 4));
  }, [cameraUrl]);

  useEffect(() => {
    const booth = getBooth();
    if (cameraSource === 'remote') {
      booth.connect();
      setStatus(booth.status);
      return booth.onStatus(setStatus);
    }
    booth.disconnect();
    setStatus('disconnected');
  }, [cameraSource]);

  const st = STATUS_LABEL[status] ?? STATUS_LABEL.disconnected;

  return (
    <section className="stage">
      <div className="camera-screen-bg">
        <div className="camera-screen-overlay" />
      </div>

      <div style={{
        position: 'relative', zIndex: 1, height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '44px 24px', overflowY: 'auto',
      }}>
        {/* Back */}
        <button
          className="camera-back-btn"
          type="button"
          onClick={onBack}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>

        <h1 style={{
          fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 400,
          fontSize: 'clamp(2rem, 4.5vw, 3rem)', color: '#FBF4E6',
          textShadow: '0 2px 18px rgba(0,0,0,0.5)', marginBottom: 32,
        }}>
          Settings
        </h1>

        {/* Camera source card */}
        <div style={{
          width: 'min(560px, 100%)',
          background: 'rgba(0,0,0,0.35)', borderRadius: 18,
          border: '1px solid rgba(228,201,126,0.3)',
          padding: '26px 28px', color: '#F4EAD6',
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 18, color: '#E4C97E' }}>
            攝影機來源
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
            {[
              { id: 'local', label: '此裝置（iPad）', desc: '使用本機鏡頭拍照' },
              { id: 'remote', label: 'iPhone 遠端相機', desc: '配對 iPhone 當作鏡頭' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCameraSource(opt.id)}
                style={{
                  flex: 1, padding: '16px 14px', borderRadius: 12, cursor: 'pointer',
                  border: cameraSource === opt.id
                    ? '2px solid #E4C97E'
                    : '1.5px solid rgba(228,201,126,0.3)',
                  background: cameraSource === opt.id
                    ? 'rgba(228,201,126,0.16)'
                    : 'rgba(255,255,255,0.05)',
                  color: '#F4EAD6', textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{opt.label}</div>
                <div style={{ fontSize: 12.5, opacity: 0.75 }}>{opt.desc}</div>
              </button>
            ))}
          </div>

          {/* Remote pairing panel */}
          {cameraSource === 'remote' && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(228,201,126,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: st.color }} />
                <span style={{ fontSize: 14.5, fontWeight: 600 }}>{st.text}</span>
              </div>

              {status !== 'connected' && (
                <>
                  <div style={{ fontSize: 13.5, lineHeight: 1.7, opacity: 0.85, marginBottom: 14 }}>
                    用 iPhone 掃描 QR code（或開啟網址後輸入配對碼），允許相機權限後自動配對：
                  </div>
                  <div style={{
                    display: 'inline-block', marginBottom: 14, padding: '8px 20px',
                    borderRadius: 10, background: 'rgba(228,201,126,0.14)',
                    border: '1.5px solid rgba(228,201,126,0.5)',
                    fontSize: 26, fontWeight: 800, letterSpacing: '0.35em',
                    color: '#E4C97E', fontFamily: 'monospace',
                  }}>
                    {pairCode}
                  </div>
                  <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
                    {qrDataUrl && (
                      <img
                        src={qrDataUrl}
                        alt="iPhone camera URL QR"
                        style={{ width: 148, height: 148, borderRadius: 10, background: '#fff', padding: 6 }}
                      />
                    )}
                    <code style={{
                      fontSize: 12.5, wordBreak: 'break-all', flex: 1, minWidth: 180,
                      background: 'rgba(255,255,255,0.08)', padding: '10px 12px', borderRadius: 8,
                    }}>
                      {cameraUrl}
                    </code>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.6, marginTop: 14, lineHeight: 1.6 }}>
                    提示：iPhone 設定 → 螢幕顯示與亮度 → 自動鎖定改「永不」，避免拍攝中途鎖屏。
                  </div>
                </>
              )}

              {status === 'connected' && (
                <div style={{ fontSize: 13.5, opacity: 0.85, lineHeight: 1.7 }}>
                  iPhone 相機已就緒。回到主畫面選擇版型即可開拍 — 拍照頁會顯示 iPhone 的即時畫面。
                </div>
              )}
            </div>
          )}

          {/* Debug section */}
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(228,201,126,0.2)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13.5 }}>
              <input type="checkbox" checked={showRaw} onChange={toggleRaw} style={{ width: 18, height: 18 }} />
              顯示「RAW 測試」診斷版型（開發用，賓客模式請關閉）
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
