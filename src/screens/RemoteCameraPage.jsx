import { useEffect, useRef, useState } from 'react';
import { captureFrame } from '../camera.js';

// iPhone-side page: /photo-booth/camera
// Opens front camera, publishes it to the booth (iPad) via WebRTC,
// and answers capture commands with full-resolution frames.
//
// Recovery paths (iOS kills camera tracks aggressively):
// - track.onended / onmute        → re-acquire getUserMedia + re-publish
// - visibilitychange (return)     → re-acquire wake lock + verify track alive
// - WS zombie (no pong in 10s)    → force close → auto reconnect
// - manual「重新連線」button       → full restart (covers iOS needing a user gesture)
export default function RemoteCameraPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const flashRef = useRef(null);
  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const streamRef = useRef(null);
  const wakeLockRef = useRef(null);
  const boothOnlineRef = useRef(false);

  const [status, setStatus] = useState('啟動相機中...');
  const [linked, setLinked] = useState(false);
  const [camDead, setCamDead] = useState(false);
  const [shotsTaken, setShotsTaken] = useState(0);
  const [restartKey, setRestartKey] = useState(0); // bump → full effect restart
  const [pairCode, setPairCode] = useState(
    () => (new URLSearchParams(location.search).get('pair') || '').toUpperCase().slice(0, 8)
  );
  const [codeInput, setCodeInput] = useState('');
  const [pairError, setPairError] = useState('');
  const [wakeLockOk, setWakeLockOk] = useState(true);

  useEffect(() => {
    if (!pairCode) return; // wait for code entry
    let closed = false;
    let reconnectTimer = null;
    let pingTimer = null;
    let pongDeadline = null;

    function sendJson(obj) {
      const ws = wsRef.current;
      if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
    }

    function teardownPc() {
      if (pcRef.current) {
        try { pcRef.current.close(); } catch {}
        pcRef.current = null;
      }
      dcRef.current = null;
    }

    function stopStream() {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }

    async function requestWakeLock() {
      try {
        if (!navigator.wakeLock) { setWakeLockOk(false); return; }
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setWakeLockOk(true);
        // iOS releases the lock when page is backgrounded — flag it so the
        // banner reappears if re-acquire on return fails
        wakeLockRef.current.addEventListener?.('release', () => {
          if (!closed && document.visibilityState === 'visible') setWakeLockOk(false);
        });
      } catch {
        setWakeLockOk(false);
      }
    }

    // Acquire (or re-acquire) the camera. Returns true on success.
    async function acquireStream() {
      stopStream();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (closed) { stream.getTracks().forEach((t) => t.stop()); return false; }
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        // iOS interruption (lock, call, camera app steal) ends the track silently
        track.onended = () => {
          if (closed) return;
          setCamDead(true);
          setLinked(false);
          setStatus('相機被系統中斷，嘗試恢復...');
          recoverCamera();
        };
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCamDead(false);
        return true;
      } catch (err) {
        console.error('getUserMedia failed:', err);
        setCamDead(true);
        setStatus('無法啟用相機。點擊下方按鈕重試。');
        return false;
      }
    }

    async function recoverCamera() {
      if (closed) return;
      const ok = await acquireStream();
      if (!ok) return; // camDead=true → manual button shown
      setStatus('相機已恢復');
      // Re-publish with the fresh track if booth is online
      if (boothOnlineRef.current) await startPublish();
    }

    async function startPublish() {
      if (!streamRef.current) return;
      teardownPc();
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      pcRef.current = pc;
      // P2P channel for capture transfer — skips WS+server relay
      dcRef.current = pc.createDataChannel('capture');
      streamRef.current.getTracks().forEach((t) => pc.addTrack(t, streamRef.current));
      pc.onicecandidate = (ev) => {
        if (ev.candidate) sendJson({ type: 'signal', data: { kind: 'ice', candidate: ev.candidate } });
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') { setLinked(true); setStatus('已連線 — 拍貼機控制中'); }
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setLinked(false); setStatus('視訊連線中斷，重建中...');
          // WS still alive → renegotiate directly
          if (boothOnlineRef.current && !closed) setTimeout(() => startPublish(), 1500);
        }
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendJson({ type: 'signal', data: { kind: 'offer', sdp: pc.localDescription } });
    }

    // Send capture result over DataChannel (P2P, chunked) with WS fallback
    function sendCaptured(shotNum, dataUrl) {
      const dc = dcRef.current;
      if (dc && dc.readyState === 'open') {
        const CHUNK = 60000; // stay well under Safari's DC message size limit
        dc.send(JSON.stringify({ t: 'cap-start', shotNum }));
        for (let i = 0; i < dataUrl.length; i += CHUNK) {
          dc.send(JSON.stringify({ t: 'cap-chunk', shotNum, d: dataUrl.slice(i, i + CHUNK) }));
        }
        dc.send(JSON.stringify({ t: 'cap-end', shotNum }));
      } else {
        sendJson({ type: 'captured', shotNum, dataUrl });
      }
    }

    function handleCaptureCmd(msg) {
      const v = videoRef.current;
      const c = canvasRef.current;
      try {
        const fakeLayout = { id: msg.layoutId || 'remote', shotRatio: msg.shotRatio || '3/4' };
        const dataUrl = captureFrame(v, c, fakeLayout, msg.filterId, msg.shotNum, '3:4', 'jpeg');
        sendCaptured(msg.shotNum, dataUrl);
        setShotsTaken((n) => n + 1);
        const f = flashRef.current;
        if (f) {
          f.style.opacity = '1';
          setTimeout(() => { f.style.opacity = '0'; }, 180);
        }
      } catch (err) {
        console.error('remote capture failed:', err);
        sendJson({ type: 'captured', shotNum: msg.shotNum, error: err.message || '拍照失敗' });
      }
    }

    function connectWs() {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(`${proto}://${location.host}/ws`);
      wsRef.current = ws;
      ws.onopen = () => {
        sendJson({ type: 'hello', role: 'camera', pair: pairCode });
        clearInterval(pingTimer);
        pongDeadline = null;
        pingTimer = setInterval(() => {
          if (pongDeadline && Date.now() > pongDeadline) {
            try { ws.close(); } catch {}
            return;
          }
          if (!pongDeadline) pongDeadline = Date.now() + 10000;
          sendJson({ type: 'ping' });
        }, 15000);
      };
      ws.onmessage = async (e) => {
        let msg;
        try { msg = JSON.parse(e.data); } catch { return; }
        if (msg.type === 'pong') {
          pongDeadline = null;
        } else if (msg.type === 'pair-rejected') {
          closed = true; // stop auto-reconnect — wrong code loops forever otherwise
          setPairError('配對碼錯誤，請確認 iPad 設定頁顯示的代碼。');
          setPairCode('');
          setStatus('配對失敗');
        } else if (msg.type === 'peer-joined') {
          boothOnlineRef.current = true;
          setStatus('拍貼機已上線，建立視訊...');
          await startPublish();
        } else if (msg.type === 'peer-left') {
          boothOnlineRef.current = false;
          setLinked(false);
          setStatus('拍貼機離線，等待重連...');
          teardownPc();
        } else if (msg.type === 'signal') {
          const pc = pcRef.current;
          if (!pc) return;
          if (msg.data.kind === 'answer') await pc.setRemoteDescription(msg.data.sdp);
          else if (msg.data.kind === 'ice') { try { await pc.addIceCandidate(msg.data.candidate); } catch {} }
        } else if (msg.type === 'capture') {
          handleCaptureCmd(msg);
        }
      };
      ws.onclose = () => {
        clearInterval(pingTimer);
        pongDeadline = null;
        boothOnlineRef.current = false;
        setLinked(false);
        setStatus('伺服器連線中斷，重連中...');
        teardownPc();
        if (!closed) reconnectTimer = setTimeout(connectWs, 2000);
      };
      ws.onerror = () => {};
    }

    // Returning from background: wake lock is auto-released; camera track may be dead
    function onVisibility() {
      if (document.hidden || closed) return;
      requestWakeLock();
      const track = streamRef.current?.getVideoTracks?.()[0];
      if (!track || track.readyState !== 'live') {
        setStatus('返回頁面，恢復相機中...');
        recoverCamera();
      } else if (videoRef.current && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    }
    document.addEventListener('visibilitychange', onVisibility);

    (async () => {
      const ok = await acquireStream();
      if (ok) setStatus('等待拍貼機連線...');
      requestWakeLock();
      connectWs();
    })();

    return () => {
      closed = true;
      clearTimeout(reconnectTimer);
      clearInterval(pingTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      teardownPc();
      if (wsRef.current) { try { wsRef.current.close(); } catch {} }
      stopStream();
      wakeLockRef.current?.release?.().catch(() => {});
    };
  }, [restartKey, pairCode]);

  // Pair-code entry — shown when URL has no ?pair= or the code was rejected
  if (!pairCode) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#111',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 18, padding: 24, fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#F4EAD6' }}>輸入配對碼</div>
        <div style={{ fontSize: 14, color: '#aaa', textAlign: 'center', lineHeight: 1.6 }}>
          在 iPad 拍貼機的 ⚙️ 設定頁可以看到 4 位配對碼
        </div>
        {pairError && (
          <div style={{ fontSize: 14, color: '#FF8A7A' }}>{pairError}</div>
        )}
        <input
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 4))}
          placeholder="ABCD"
          autoCapitalize="characters"
          autoComplete="off"
          style={{
            width: 200, padding: '14px 0', textAlign: 'center',
            fontSize: 32, fontWeight: 800, letterSpacing: '0.35em', fontFamily: 'monospace',
            background: 'rgba(255,255,255,0.08)', color: '#E4C97E',
            border: '2px solid rgba(228,201,126,0.5)', borderRadius: 14, outline: 'none',
          }}
        />
        <button
          type="button"
          disabled={codeInput.length !== 4}
          onClick={() => { setPairError(''); setPairCode(codeInput); }}
          style={{
            padding: '14px 48px', borderRadius: 999, border: 'none',
            background: codeInput.length === 4 ? '#E4C97E' : 'rgba(255,255,255,0.12)',
            color: codeInput.length === 4 ? '#3A2B10' : '#777',
            fontSize: 17, fontWeight: 800, cursor: codeInput.length === 4 ? 'pointer' : 'default',
          }}
        >
          連 線
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#111',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', transform: 'scaleX(-1)',
          }}
        />
        <div
          ref={flashRef}
          style={{
            position: 'absolute', inset: 0, background: '#fff',
            opacity: 0, transition: 'opacity 160ms ease', pointerEvents: 'none',
          }}
        />
        {/* Status pill */}
        <div style={{
          position: 'absolute', top: 'max(16px, env(safe-area-inset-top))', left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 18px', borderRadius: 999,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
          color: linked ? '#7CFC9A' : '#FFD37E',
          fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: linked ? '#39D46E' : '#E8B33C',
          }} />
          {status}
        </div>

        {/* Wake lock unavailable — screen will auto-lock and kill the camera */}
        {!wakeLockOk && (
          <div style={{
            position: 'absolute', top: 'calc(max(16px, env(safe-area-inset-top)) + 52px)',
            left: '50%', transform: 'translateX(-50%)',
            width: 'min(340px, 88%)', padding: '10px 16px', borderRadius: 12,
            background: 'rgba(224,88,75,0.92)', color: '#fff',
            fontSize: 13.5, lineHeight: 1.6, fontWeight: 600, textAlign: 'center',
          }}>
            ⚠️ 無法保持螢幕常亮。請到 設定 → 螢幕顯示與亮度 → 自動鎖定 改為「永不」，否則鎖屏會中斷相機。
          </div>
        )}

        {/* Manual restart — needed when iOS requires a user gesture to re-open camera */}
        {(camDead || !linked) && (
          <button
            type="button"
            onClick={() => setRestartKey((k) => k + 1)}
            style={{
              position: 'absolute', bottom: 'max(76px, env(safe-area-inset-bottom))', left: '50%',
              transform: 'translateX(-50%)',
              padding: '14px 32px', borderRadius: 999, border: 'none',
              background: camDead ? '#E0584B' : 'rgba(255,255,255,0.16)',
              color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              backdropFilter: 'blur(8px)',
            }}
          >
            重新連線
          </button>
        )}

        {shotsTaken > 0 && (
          <div style={{
            position: 'absolute', bottom: 'max(20px, env(safe-area-inset-bottom))', left: '50%',
            transform: 'translateX(-50%)',
            padding: '6px 16px', borderRadius: 999,
            background: 'rgba(0,0,0,0.55)', color: '#eee', fontSize: 13,
          }}>
            已拍 {shotsTaken} 張
          </div>
        )}
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
