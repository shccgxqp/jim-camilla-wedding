import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import {
  startCamera, stopCamera, runCountdown,
  captureFrame, triggerFlash, wait,
} from '../camera.js';
import { ZONES as F01_ZONES } from '../frames/frame01.js';
import { ZONES as F02_ZONES } from '../frames/frame02.js';
import { ZONES as F03_ZONES } from '../frames/frame03.js';
import { ZONES as F04_ZONES } from '../frames/frame04.js';
import { ZONES as F05_ZONES } from '../frames/frame05.js';
import { ZONES as F06_ZONES } from '../frames/frame06.js';
import { startClipRecorder, encodeClipGif, startClipRecorderHQ, encodeFramesAsJpegs, RECORD_MS, composeGifInBrowser } from '../gif.js';
import { uploadClipGif, requestGifCompose, uploadJpegFrameBatch, requestGifComposeJpeg, uploadGif } from '../upload.js';
import { startVideoClipRecorder, composeMultiZoneVideo, VIDEO_DURATION_MS, getBestVideoMime, isIgCompatible } from '../video.js';
import { filters } from '../data/constants.js';
import { getBooth } from '../remote/booth.js';

const FRAME_GUIDE = {
  frame01: { zones: F01_ZONES, w: 779,  h: 1172, url: '/frames/frame01.png' },
  frame02: { zones: F02_ZONES, w: 784,  h: 1176, url: '/frames/frame02.png' },
  frame03: { zones: F03_ZONES, w: 858,  h: 2532, url: '/frames/frame03.png' },
  frame04: { zones: F04_ZONES, w: 2090, h: 3135, url: '/frames/frame04.png' },
  frame05: { zones: F05_ZONES, w: 960,  h: 1707, url: '/frames/frame05.png' },
  frame06: { zones: F06_ZONES, w: 1080, h: 1440, url: null },
};

export default function CameraScreen({ onAllShotsTaken, onGifTaken, onGifComposing, onVideoReady, onVideoComposing, onBackToLayouts }) {
  const {
    config,
    activeLayout,
    activeFilter, setActiveFilter,
    shots, setShots,
    facingMode,
    busy, setBusy,
    streamRef,
    filters,
    cameraSource,
  } = useApp();

  const isRemote = cameraSource === 'remote';

  const videoRef = useRef(null);
  const flashRef = useRef(null);
  const wrapRef = useRef(null);
  const previewRef = useRef(null);
  const canvasPreviewRef = useRef(null);
  const rafRef = useRef(null);
  const iPadRestartedRef = useRef(false);

  const [countdown, setCountdown] = useState(null);
  const [status, setStatus] = useState('看鏡頭，倒數後會自動拍下。');
  const [shotCount, setShotCount] = useState(0);
  const [previewPx, setPreviewPx] = useState(0);
  const [camInfo, setCamInfo] = useState({});
  const [captureLog, setCaptureLog] = useState([]);
  const [captureMode, setCaptureMode] = useState('photo'); // 'photo' | 'video' | 'gif'
  const [aspectRatio, setAspectRatio] = useState('3:4'); // iPad only: '3:4' | '9:16'
  const aspectRatioRef = useRef('3:4');

  const isIPad = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  useEffect(() => {
    if (isRemote) {
      // Remote iPhone camera: attach WebRTC stream instead of local getUserMedia
      const booth = getBooth();
      booth.connect();
      const attach = (stream) => {
        if (stream && videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      };
      attach(booth.stream);
      if (!booth.stream) setStatus('等待 iPhone 相機連線...（可到設定頁配對）');
      const offStream = booth.onStream(attach);
      const offStatus = booth.onStatus((s) => {
        if (s === 'connected') setStatus('看鏡頭，倒數後會自動拍下。');
        else setStatus('iPhone 相機連線中斷，等待重連...');
      });
      return () => { offStream(); offStatus(); };
    }
    if (videoRef.current) {
      if (!streamRef.current || !streamRef.current.active) {
        startCamera(streamRef, videoRef.current, facingMode, () => {
          setStatus('無法啟用相機。請確認使用 HTTPS、允許相機權限，並重新整理頁面。');
        });
      } else {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
    }
    // Stream stays alive across screen transitions — no stopCamera on unmount
  }, []);

  // iPad: if iOS gave landscape despite portrait constraints, restart once to get portrait.
  // Runs only on mount, not between shots — avoids the inter-shot hot-restart bug.
  useEffect(() => {
    if (isRemote) return;
    const isIPad = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!isIPad) return;
    const v = videoRef.current;
    if (!v) return;
    const check = setInterval(() => {
      if (v.videoWidth > 0) {
        clearInterval(check);
        if (v.videoWidth > v.videoHeight && !iPadRestartedRef.current) {
          iPadRestartedRef.current = true;
          startCamera(streamRef, v, facingMode, () => {});
        }
      }
    }, 300);
    return () => clearInterval(check);
  }, []);

  useEffect(() => {
    function updateRatio() {
      const wrap = wrapRef.current;
      const preview = previewRef.current;
      if (!wrap || !preview) return;
      const [rw, rh] = activeLayout.shotRatio.split('/').map(Number);
      const wrapW = wrap.clientWidth;
      const wrapH = wrap.clientHeight;
      let pw, ph;
      if (wrapW / wrapH > rw / rh) {
        ph = wrapH;
        pw = ph * rw / rh;
      } else {
        pw = wrapW;
        ph = pw * rh / rw;
      }
      const rpw = Math.round(pw);
      const rph = Math.round(ph);
      preview.style.width = `${rpw}px`;
      preview.style.height = `${rph}px`;
      setPreviewPx(rpw);
      if (canvasPreviewRef.current) {
        canvasPreviewRef.current.width = rpw;
        canvasPreviewRef.current.height = rph;
      }
    }
    const rafId = requestAnimationFrame(() => requestAnimationFrame(updateRatio));
    window.addEventListener('resize', updateRatio);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateRatio);
    };
  }, [activeLayout]);

  useEffect(() => {
    const filterObj = filters.find((f) => f.id === activeFilter);
    const cssFilter = filterObj?.filter && filterObj.filter !== 'none' ? filterObj.filter : '';
    // Apply CSS filter directly to preview canvas — ctx.filter is unreliable on iOS Safari
    if (canvasPreviewRef.current) canvasPreviewRef.current.style.filter = cssFilter;
  }, [activeFilter]);

  useEffect(() => { aspectRatioRef.current = aspectRatio; }, [aspectRatio]);

  // iPad: restart camera with taller constraints when switching to 9:16
  const arMountedRef = useRef(false);
  useEffect(() => {
    if (isRemote) return;
    if (!isIPad) return;
    if (!arMountedRef.current) { arMountedRef.current = true; return; }
    if (!videoRef.current) return;
    startCamera(streamRef, videoRef.current, facingMode, () => {
      setStatus('無法啟用相機。請確認使用 HTTPS、允許相機權限，並重新整理頁面。');
    }, aspectRatio);
  }, [aspectRatio]);

  useEffect(() => {
    const id = setInterval(() => {
      const v = videoRef.current;
      const track = streamRef.current?.getVideoTracks?.()[0];
      const s = track?.getSettings?.() ?? {};
      const vW = v?.videoWidth ?? 0;
      const vH = v?.videoHeight ?? 0;
      const devPortrait = window.screen.height > window.screen.width;
      setCamInfo({
        videoWidth: vW || '?',
        videoHeight: vH || '?',
        orientation: devPortrait ? 'portrait' : 'landscape',
        trackW: s.width ?? '?',
        trackH: s.height ?? '?',
        frameRate: s.frameRate ? s.frameRate.toFixed(1) : '?',
        resizeMode: s.resizeMode ?? '?',
        facingMode: s.facingMode ?? facingMode,
        trackState: track?.readyState ?? '?',
      });
    }, 800);
    return () => clearInterval(id);
  }, [facingMode]);



  useEffect(() => {
    function drawLoop() {
      const v = videoRef.current;
      const c = canvasPreviewRef.current;
      if (!v || !c || v.readyState < 2) {
        rafRef.current = requestAnimationFrame(drawLoop);
        return;
      }
      // Sync canvas buffer to CSS display size every frame — prevents stretch on mount/resize
      if (c.offsetWidth && c.offsetHeight) {
        if (c.width !== c.offsetWidth) c.width = c.offsetWidth;
        if (c.height !== c.offsetHeight) c.height = c.offsetHeight;
      }
      const vW = v.videoWidth, vH = v.videoHeight;
      const cw = c.width, ch = c.height;
      if (!cw || !ch) { rafRef.current = requestAnimationFrame(drawLoop); return; }
      const ctx = c.getContext('2d');
      ctx.save();
      ctx.filter = v.style.filter || 'none';
      ctx.clearRect(0, 0, cw, ch);
      const isIPadPreview = !isRemote && (/iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
      if (vW < vH) {
        if (isIPadPreview) {
          {
            // Contain: show full stream, no crop, letterbox if ratios differ.
            const srcRatio = vW / vH;
            const dstRatio = cw / ch;
            let drawW, drawH, dx = 0, dy = 0;
            if (srcRatio < dstRatio) {
              drawH = ch; drawW = ch * srcRatio; dx = (cw - drawW) / 2;
            } else {
              drawW = cw; drawH = cw / srcRatio; dy = (ch - drawH) / 2;
            }
            ctx.clearRect(0, 0, cw, ch);
            ctx.setTransform(-1, 0, 0, 1, cw, 0);
            ctx.drawImage(v, 0, 0, vW, vH, dx, dy, drawW, drawH);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
          }
        } else {
          // iPhone: center-crop to preview canvas ratio + mirror
          const srcRatio = vW / vH, dstRatio = cw / ch;
          let sx = 0, sy = 0, sW = vW, sH = vH;
          if (srcRatio > dstRatio) { sW = vH * dstRatio; sx = (vW - sW) / 2; }
          else { sH = vW / dstRatio; sy = (vH - sH) / 2; }
          ctx.setTransform(-1, 0, 0, 1, cw, 0);
          ctx.drawImage(v, sx, sy, sW, sH, 0, 0, cw, ch);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
      } else {
        const isIPad = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const dstRatio = cw / ch;
        let sx = 0, sy = 0, sW = vW, sH = vH;
        if (isIPad) {
          const validSize = vH;
          const validX = (vW - validSize) / 2;
          if (1.0 > dstRatio) { sW = validSize * dstRatio; sx = validX + (validSize - sW) / 2; sH = validSize; }
          else { sH = validSize / dstRatio; sy = (validSize - sH) / 2; sx = validX; sW = validSize; }
        } else {
          const srcRatio = vW / vH;
          if (srcRatio > dstRatio) { sW = vH * dstRatio; sx = (vW - sW) / 2; }
          else { sH = vW / dstRatio; sy = (vH - sH) / 2; }
        }
        ctx.setTransform(-1, 0, 0, 1, cw, 0);
        ctx.drawImage(v, sx, sy, sW, sH, 0, 0, cw, ch);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      ctx.restore();
      rafRef.current = requestAnimationFrame(drawLoop);
    }
    rafRef.current = requestAnimationFrame(drawLoop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  async function handleCapture() {
    if (busy || (!isRemote && !streamRef.current)) return;
    if (isRemote && getBooth().status !== 'connected') {
      setStatus('iPhone 相機未連線，請至設定頁配對。');
      return;
    }
    setBusy(true);

    const required = activeLayout.requiredShots;
    const workCanvas = document.querySelector('#workCanvas');
    let currentShots = [];

    try {
      while (currentShots.length < required) {
        const shotNum = currentShots.length + 1;
        setStatus(`第 ${shotNum} 張，準備好了嗎？`);
        await runCountdown(config.countdownSeconds, setCountdown);
        const v = videoRef.current;
        const track = streamRef.current?.getVideoTracks?.()[0];
        const ts = track?.getSettings?.() ?? {};
        const logEntry = {
          shot: shotNum,
          vW: v?.videoWidth, vH: v?.videoHeight,
          tW: ts.width, tH: ts.height,
          fps: ts.frameRate?.toFixed(1),
          resize: ts.resizeMode,
          rs: v?.readyState,
          aspectRatio,
          src: isRemote ? 'iphone-remote' : 'local',
        };
        setCaptureLog(prev => [...prev.slice(-5), logEntry]);
        // Flash fires at countdown end — runs in parallel with the (possibly slow)
        // remote transfer so the shot feels instant.
        const flashPromise = triggerFlash(flashRef.current);
        let dataUrl;
        if (isRemote) {
          setStatus('照片傳輸中...');
          const res = await getBooth().requestCapture({
            shotNum,
            shotRatio: activeLayout.shotRatio,
            filterId: activeFilter,
            layoutId: activeLayout.id,
          });
          dataUrl = res.dataUrl;
        } else {
          dataUrl = captureFrame(videoRef.current, workCanvas, activeLayout, activeFilter, shotNum, aspectRatio);
        }
        await flashPromise;
        currentShots = [...currentShots, dataUrl];
        setShots(currentShots);
        setShotCount(currentShots.length);
        if (currentShots.length < required) {
          await wait(1200);
        }
      }
      onAllShotsTaken(currentShots);
    } catch (err) {
      console.error('Capture error:', err);
      const shotNum = currentShots.length + 1;
      setStatus(`第 ${shotNum} 張失敗：${err.message || '未知錯誤'}。請重試。`);
    } finally {
      setBusy(false);
    }
  }

  async function handleVideoCapture() {
    if (busy || !streamRef.current) return;
    setBusy(true);

    const required = activeLayout.requiredShots;
    const fg = FRAME_GUIDE[activeLayout.id];
    const clips = [];

    try {
      for (let i = 0; i < required; i++) {
        setStatus(`影片第 ${i + 1} 格，準備好了嗎？`);
        setShotCount(i);
        await runCountdown(config.countdownSeconds, setCountdown);
        setCountdown('rec');

        const clipRec = startVideoClipRecorder(streamRef.current, VIDEO_DURATION_MS);
        await triggerFlash(flashRef.current);

        setStatus(`錄製中...`);
        const blob = await clipRec.blobPromise;
        clips.push(blob);
        setCountdown(null);

        if (i < required - 1) {
          setStatus(`第 ${i + 1} 格完成，繼續下一格...`);
          await wait(600);
        }
      }

      setStatus('合成影片中...');
      setCountdown(null);
      onVideoComposing();

      const videoBlob = await composeMultiZoneVideo(
        clips,
        fg ? fg.zones : [],
        activeLayout.width,
        activeLayout.height,
        fg ? fg.url : '',
        VIDEO_DURATION_MS,
      );

      onVideoReady(videoBlob);
    } catch (err) {
      console.error('Video capture error:', err);
      setStatus('影片錄製失敗，請重試。');
      setBusy(false);
    }
  }

  async function handleGifCapture() {
    if (busy || (!isRemote && !streamRef.current)) return;
    if (isRemote && getBooth().status !== 'connected') {
      setStatus('iPhone 相機未連線，請至設定頁配對。');
      return;
    }
    setBusy(true);

    const required = activeLayout.requiredShots;
    const fg = FRAME_GUIDE[activeLayout.id];
    const sessionId = crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(36).slice(2) + Date.now().toString(36);

    const uploadPromises = [];

    try {
      for (let i = 0; i < required; i++) {
        setStatus(`動態第 ${i + 1} 格，準備好了嗎？`);
        setShotCount(i);
        const recorder = startClipRecorder(videoRef.current, activeFilter);
        await runCountdown(config.countdownSeconds, setCountdown);
        const frames = recorder.stop();
        await triggerFlash(flashRef.current);

        // encode + upload in background — don't block next shot
        const clipGif = encodeClipGif(frames);
        uploadPromises.push(uploadClipGif(clipGif, sessionId, i));

        if (i < required - 1) {
          setStatus(`第 ${i + 1} 格完成，繼續下一格...`);
          await wait(600);
        }
      }

      // Enter the composing screen immediately — uploads finish while it shows
      setCountdown(null);
      onGifComposing();
      await Promise.all(uploadPromises);

      let result;
      try {
        result = await requestGifCompose(
          sessionId,
          activeLayout.id,
          activeLayout.width,
          activeLayout.height,
          fg ? fg.zones : [],
        );
      } catch (composeErr) {
        console.error('GIF compose error:', composeErr);
        result = { downloadUrl: null, filename: null };
      }
      onGifTaken(result);
    } catch (err) {
      console.error('GIF capture error:', err);
      setStatus('錄製失敗，請重試。');
      setBusy(false);
    }
  }

  async function handleGifCaptureHQ() {
    if (busy || (!isRemote && !streamRef.current)) return;
    if (isRemote && getBooth().status !== 'connected') {
      setStatus('iPhone 相機未連線，請至設定頁配對。');
      return;
    }
    setBusy(true);

    const required = activeLayout.requiredShots;
    const fg = FRAME_GUIDE[activeLayout.id];
    const sessionId = crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(36).slice(2) + Date.now().toString(36);

    // smile duration inside runCountdown (700ms) already counts as recording time
    const SMILE_HOLD_MS = 700;

    const clips = [];

    try {
      for (let i = 0; i < required; i++) {
        setStatus(`動態第 ${i + 1} 格，準備好了嗎？`);
        setShotCount(i);

        let recorder = null;

        // Intercept 'smile' tick to start recording + flash
        const smileTick = (value) => {
          setCountdown(value);
          if (value === 'smile') {
            recorder = startClipRecorderHQ(videoRef.current, activeFilter);
            // Initial shutter flash then pulse during recording
            triggerFlash(flashRef.current).then(() => {
              flashRef.current?.classList.add('recording-pulse');
            });
          }
        };

        await runCountdown(config.countdownSeconds, smileTick);
        // runCountdown resolves after smile shown SMILE_HOLD_MS then set null
        // recording started at smile → already SMILE_HOLD_MS elapsed

        const remaining = RECORD_MS - SMILE_HOLD_MS;
        if (remaining > 0) await wait(remaining);

        // Stop recording flash
        flashRef.current?.classList.remove('recording-pulse');

        const frames = recorder ? recorder.stop() : [];

        clips.push(frames);

        if (i < required - 1) {
          setStatus(`第 ${i + 1} 格完成，繼續下一格...`);
          await wait(600);
        }
      }

      // Enter the composing screen immediately — uploads finish while it shows
      setCountdown(null);
      onGifComposing();
      const gifBlob = await composeGifInBrowser({
        clips,
        zones: fg ? fg.zones : [],
        layoutW: activeLayout.width,
        layoutH: activeLayout.height,
        overlayUrl: fg?.url,
      });
      const result = await uploadGif(gifBlob, activeLayout.id);
      onGifTaken(result);
    } catch (err) {
      console.error('GIF HQ capture error:', err);
      setStatus('錄製失敗，請重試。');
      setBusy(false);
    }
  }

  const required = activeLayout.requiredShots;
  const nextShot = Math.min(shotCount + 1, required);
  const isSmile = countdown === 'smile';
  const isRec = countdown === 'rec';

  const heartGuideStyle = (() => {
    const fg = FRAME_GUIDE[activeLayout.id];
    if (!fg || previewPx === 0) return null;
    const zone = fg.zones[Math.min(shotCount, fg.zones.length - 1)];
    const scale = previewPx / zone.w;
    return {
      backgroundImage: `url(${fg.url})`,
      backgroundSize: `${Math.round(fg.w * scale)}px ${Math.round(fg.h * scale)}px`,
      backgroundPosition: `${-Math.round(zone.x * scale)}px ${-Math.round(zone.y * scale)}px`,
      backgroundRepeat: 'no-repeat',
    };
  })();

  const handleShutter = captureMode === 'photo'
    ? handleCapture
    : captureMode === 'video'
      ? handleVideoCapture
      : handleGifCaptureHQ;

  // Remote v1: photo + GIF (GIF records the WebRTC preview element — works remotely).
  // Video needs a raw local MediaStream — local only.
  const captureModes = isRemote
    ? [{ id: 'photo', label: '拍 照' }, { id: 'gif', label: 'GIF' }]
    : [{ id: 'photo', label: '拍 照' }, { id: 'video', label: '影 片' }, { id: 'gif', label: 'GIF' }];

  return (
    <section className="stage">
      {/* Backgrounds */}
      <div className="camera-screen-bg">
        <div className="camera-screen-overlay" />
      </div>

      <div className="camera-shoot-wrap">

        {/* Back button */}
        <button
          className="camera-back-btn"
          type="button"
          disabled={busy}
          onClick={onBackToLayouts}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>

        {/* Header */}
        <div className="camera-shoot-header">
          <div className="camera-shot-title-row">
            <div className="camera-shot-title">
              Photo <em>{nextShot}</em> of {required}
            </div>
            {isIPad && !isRemote && (
              <div className="camera-ratio-toggle">
                {['3:4', '9:16'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={busy}
                    onClick={() => setAspectRatio(r)}
                    className={`camera-ratio-btn${aspectRatio === r ? ' active' : ''}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Progress bars */}
          <div className="camera-progress-bars">
            {Array.from({ length: required }).map((_, i) => (
              <div key={i} style={{
                width: i + 1 === nextShot ? 38 : 20,
                height: 5,
                borderRadius: 999,
                background: i + 1 < nextShot
                  ? '#BD9A4E'
                  : i + 1 === nextShot
                    ? '#E4C97E'
                    : 'rgba(228,201,126,0.26)',
                transition: 'width 220ms ease, background 220ms ease',
              }} />
            ))}
          </div>
        </div>

        {/* Camera frame card */}
        <div className="camera-frame-card">
          {/* Brass corners */}
          {[
            { top: 4, left: 4 },
            { top: 4, right: 4, transform: 'scaleX(-1)' },
            { bottom: 4, left: 4, transform: 'scaleY(-1)' },
            { bottom: 4, right: 4, transform: 'scale(-1,-1)' },
          ].map((s, i) => (
            <div key={i} className="camera-brass-corner" style={s}>
              <svg width="26" height="26" viewBox="0 0 30 30" fill="none">
                <path d="M2 28 L2 8 Q 2 2 8 2 L 28 2" stroke="#BD9A4E" strokeWidth="1.4" fill="none" />
              </svg>
            </div>
          ))}

          {/* Camera preview area */}
          <div className="camera-frame-inner" ref={wrapRef}>
            <div
              className="camera-preview"
              ref={previewRef}
              style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'none' }}
              />
              <canvas
                ref={canvasPreviewRef}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
              />
              {heartGuideStyle && (
                <div className="camera-heart-guide" style={heartGuideStyle} aria-hidden="true" />
              )}
              {countdown !== null && (
                <div className={`countdown${isSmile ? ' countdown--smile' : ''}${isRec ? ' countdown--rec' : ''}`}>
                  {isSmile ? 'smile' : isRec ? '●REC' : countdown}
                </div>
              )}
              <div className="flash-overlay" ref={flashRef} />
            </div>

            {/* Viewfinder corners */}
            <div className="camera-viewfinder-corner" style={{ top: 14, left: 14, borderTopWidth: 2, borderLeftWidth: 2 }} />
            <div className="camera-viewfinder-corner" style={{ top: 14, right: 14, borderTopWidth: 2, borderRightWidth: 2 }} />
            <div className="camera-viewfinder-corner" style={{ bottom: 14, left: 14, borderBottomWidth: 2, borderLeftWidth: 2 }} />
            <div className="camera-viewfinder-corner" style={{ bottom: 14, right: 14, borderBottomWidth: 2, borderRightWidth: 2 }} />

          </div>
        </div>

        {/* Filter selector */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '6px 12px', flexWrap: 'wrap' }}>
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              disabled={busy}
              onClick={() => setActiveFilter(f.id)}
              style={{
                padding: '4px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13,
                background: activeFilter === f.id ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.18)',
                color: activeFilter === f.id ? '#333' : '#eee',
                fontWeight: activeFilter === f.id ? 700 : 400,
                transition: 'background 0.15s',
              }}
            >
              {f.name}
            </button>
          ))}
        </div>

        {/* Mode toggle + shutter */}
        <div className="camera-controls">
          <div className="camera-mode-toggle">
            {captureModes.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`camera-mode-btn${captureMode === m.id ? ' active' : ''}`}
                onClick={() => setCaptureMode(m.id)}
                disabled={busy}
              >
                {m.label}
              </button>
            ))}
          </div>

          <button
            className="camera-shutter-btn"
            type="button"
            disabled={busy}
            onClick={handleShutter}
          >
            {captureMode === 'video' ? (
              <span style={{ width: 40, height: 40, borderRadius: 10, background: '#E0584B', display: 'block' }} />
            ) : captureMode === 'gif' ? (
              <span style={{
                width: 86, height: 86, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(180deg, #F2DCA6, #E4C97E)',
                fontWeight: 800, fontSize: 22, letterSpacing: '0.06em', color: '#5A431B',
              }}>
                GIF
              </span>
            ) : (
              <span style={{
                width: 86, height: 86, borderRadius: '50%', display: 'block',
                background: 'linear-gradient(180deg, #fdf6e8, #F4EAD6)',
              }} />
            )}
          </button>
        </div>

      </div>
    </section>
  );
}
