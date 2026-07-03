// Booth (iPad) side of the remote-camera link.
// Owns: WS signaling connection, WebRTC peer (receives iPhone stream),
// and the capture request/response round-trip.
//
// Singleton — survives screen transitions like streamRef does.

let instance = null;

export function getBooth() {
  if (!instance) instance = createBooth();
  return instance;
}

// 4-char code, no ambiguous glyphs (0/O/1/I) — guests type it if QR fails
function getPairCode() {
  let code = localStorage.getItem('pb_pair_code');
  if (!code || !/^[A-HJ-NP-Z2-9]{4}$/.test(code)) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    code = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map((b) => chars[b % chars.length])
      .join('');
    localStorage.setItem('pb_pair_code', code);
  }
  return code;
}

function createBooth() {
  let ws = null;
  let pc = null;
  let dc = null; // DataChannel from camera — captures transfer P2P, skipping the server
  let closed = false;
  let reconnectTimer = null;
  let pingTimer = null;
  let pongDeadline = null;
  const dcBuffers = new Map(); // shotNum -> base64 chunks

  const api = {
    status: 'disconnected', // disconnected | waiting | connected
    stream: null,
    pairCode: getPairCode(),
    connect,
    disconnect,
    requestCapture,
    onStatus,
    onStream,
  };

  const statusListeners = new Set();
  const streamListeners = new Set();
  const pendingCaptures = new Map(); // shotNum -> { resolve, reject, timer }

  function setStatus(s) {
    api.status = s;
    statusListeners.forEach((f) => f(s));
  }

  function onStatus(fn) {
    statusListeners.add(fn);
    return () => statusListeners.delete(fn);
  }

  function onStream(fn) {
    streamListeners.add(fn);
    return () => streamListeners.delete(fn);
  }

  function sendJson(obj) {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
  }

  function sendSignal(data) {
    sendJson({ type: 'signal', data });
  }

  function teardownPc() {
    if (pc) {
      try { pc.close(); } catch {}
      pc = null;
    }
    dc = null;
    dcBuffers.clear();
    api.stream = null;
  }

  function resolveCapture(shotNum, payload) {
    const p = pendingCaptures.get(shotNum);
    if (!p) return;
    clearTimeout(p.timer);
    pendingCaptures.delete(shotNum);
    if (payload.error) p.reject(new Error(payload.error));
    else p.resolve(payload);
  }

  function handleDcMessage(data) {
    if (typeof data !== 'string') return;
    let msg;
    try { msg = JSON.parse(data); } catch { return; }
    if (msg.t === 'cap-start') {
      dcBuffers.set(msg.shotNum, []);
    } else if (msg.t === 'cap-chunk') {
      dcBuffers.get(msg.shotNum)?.push(msg.d);
    } else if (msg.t === 'cap-end') {
      const parts = dcBuffers.get(msg.shotNum);
      dcBuffers.delete(msg.shotNum);
      if (parts) resolveCapture(msg.shotNum, { shotNum: msg.shotNum, dataUrl: parts.join('') });
    }
  }

  function connect() {
    closed = false;
    if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/ws`);
    ws.onopen = () => {
      sendJson({ type: 'hello', role: 'booth', pair: api.pairCode });
      setStatus('waiting');
      // App-level keepalive: detect zombie sockets (TCP half-open after network blip)
      clearInterval(pingTimer);
      pingTimer = setInterval(() => {
        if (pongDeadline && Date.now() > pongDeadline) {
          try { ws.close(); } catch {} // triggers onclose → reconnect
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
      } else if (msg.type === 'replaced') {
        // another booth page took over (e.g. duplicate tab) — stop reconnecting
        closed = true;
        teardownPc();
        setStatus('disconnected');
      } else if (msg.type === 'peer-left') {
        teardownPc();
        setStatus('waiting');
      } else if (msg.type === 'signal') {
        await handleSignal(msg.data);
      } else if (msg.type === 'captured') {
        // WS fallback path (also carries error responses)
        resolveCapture(msg.shotNum, msg);
      }
      // peer-joined: camera initiates the offer; nothing to do here
    };
    ws.onclose = () => {
      clearInterval(pingTimer);
      pongDeadline = null;
      teardownPc();
      setStatus('disconnected');
      if (!closed) reconnectTimer = setTimeout(connect, 2000);
    };
    ws.onerror = () => {};
  }

  function disconnect() {
    closed = true;
    clearTimeout(reconnectTimer);
    clearInterval(pingTimer);
    pongDeadline = null;
    teardownPc();
    if (ws) { try { ws.close(); } catch {} ws = null; }
    setStatus('disconnected');
  }

  async function handleSignal(data) {
    if (data.kind === 'offer') {
      teardownPc();
      pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      pc.ondatachannel = (ev) => {
        dc = ev.channel;
        dc.onmessage = (e) => handleDcMessage(e.data);
      };
      pc.ontrack = (ev) => {
        api.stream = ev.streams[0];
        streamListeners.forEach((f) => f(api.stream));
        setStatus('connected');
      };
      pc.onicecandidate = (ev) => {
        if (ev.candidate) sendSignal({ kind: 'ice', candidate: ev.candidate });
      };
      pc.onconnectionstatechange = () => {
        if (pc && (pc.connectionState === 'failed' || pc.connectionState === 'disconnected')) {
          setStatus('waiting');
        }
      };
      await pc.setRemoteDescription(data.sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendSignal({ kind: 'answer', sdp: pc.localDescription });
    } else if (data.kind === 'ice' && pc) {
      try { await pc.addIceCandidate(data.candidate); } catch {}
    }
  }

  // Ask iPhone to capture one full-res frame. Resolves { dataUrl, debug }.
  function requestCapture({ shotNum, shotRatio, filterId, layoutId }) {
    return new Promise((resolve, reject) => {
      if (!ws || ws.readyState !== 1 || api.status !== 'connected') {
        reject(new Error('iPhone 相機未連線'));
        return;
      }
      const timer = setTimeout(() => {
        pendingCaptures.delete(shotNum);
        reject(new Error('iPhone 拍照逾時'));
      }, 10000);
      pendingCaptures.set(shotNum, { resolve, reject, timer });
      sendJson({ type: 'capture', shotNum, shotRatio, filterId, layoutId });
    });
  }

  return api;
}
