import { useCallback, useEffect, useRef, useState } from 'react';
import './live-wall.css';

const DISPLAY_MS = 10_000;
const POLL_MS = 12_000;
const STATE_POLL_MS = 4_000;
const DEFAULT_WALL_STATE = { mode: 'photo' };

const emptyStock = [{ src: '', mediaType: '' }];

export default function LiveWallPage() {
  const [pin, setPin] = useState(() => sessionStorage.getItem('live_wall_pin') || '');
  const [pinRequired, setPinRequired] = useState(true);
  const [ready, setReady] = useState(false);
  const [access, setAccess] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [message, setMessage] = useState('');
  const [stockPhotos, setStockPhotos] = useState(emptyStock);
  const [slide, setSlide] = useState({ kind: 'memory', src: '', key: 0 });
  const [wallState, setWallState] = useState(DEFAULT_WALL_STATE);
  const scheduleRef = useRef({ stockIndex: 1, stockSinceBooth: 0, boothQueue: [], knownTokens: new Set() });
  const pinRef = useRef(pin);

  useEffect(() => { pinRef.current = pin; }, [pin]);

  const startPreview = useCallback(() => {
    const host = window.location.hostname;
    const isLocalPreview = import.meta.env.DEV || host === 'localhost' || host === '127.0.0.1' || host === '::1';
    if (!isLocalPreview) return false;
    setPreviewMode(true);
    setAccess(true);
    setMessage('預覽模式：請連上 Cloudflare Worker，從午宴直播照片庫讀取輪播照片。');
    return true;
  }, []);

  const loadStockLibrary = useCallback(async () => {
    try {
      const response = await fetch('/api/live-wall-library', { cache: 'no-store' });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) throw new Error('尚未提供照片庫 API。');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '無法讀取照片庫。');
      const library = (data.media || []).map((item) => ({ src: item.url, mediaType: item.content_type }));
      if (!library.length) return;
      setStockPhotos(library);
      scheduleRef.current.stockIndex = 1;
      setSlide((current) => current.kind === 'memory'
        ? { kind: 'memory', src: library[0].src, mediaType: library[0].mediaType, key: current.key + 1 }
        : current);
    } catch {
      setStockPhotos((current) => (current.length ? current : emptyStock));
    }
  }, []);

  const loadMedia = useCallback(async (candidate = pinRef.current) => {
    try {
      const response = await fetch('/api/media?kind=booth', {
        headers: candidate ? { 'X-Admin-Pin': candidate } : {},
        cache: 'no-store',
      });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('本機前端預覽尚未提供現場照片 API。');
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '無法取得拍貼機照片。');

      const schedule = scheduleRef.current;
      [...(data.media || [])]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .forEach((item) => {
          if (schedule.knownTokens.has(item.token)) return;
          schedule.knownTokens.add(item.token);
          schedule.boothQueue.push(item);
        });

      sessionStorage.setItem('live_wall_pin', candidate);
      setPreviewMode(false);
      setAccess(true);
      setMessage('');
    } catch (error) {
      if (startPreview()) return;
      setAccess(false);
      setMessage(error.message || '無法取得拍貼機照片。');
    }
  }, [startPreview]);

  const loadWallState = useCallback(async () => {
    try {
      const response = await fetch('/api/live-wall-state', { cache: 'no-store' });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) throw new Error('本機前端預覽尚未提供投影狀態 API。');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '無法讀取投影狀態。');
      setWallState(data.state || DEFAULT_WALL_STATE);
    } catch {
      setWallState(DEFAULT_WALL_STATE);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    fetch('/api/gallery-config', { cache: 'no-store' })
      .then((response) => {
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error('本機前端預覽尚未提供相簿設定 API。');
        }
        return response.json();
      })
      .then((data) => {
        if (!alive) return;
        const required = data.pinRequired !== false;
        setPinRequired(required);
        setReady(true);
        if (!required) loadMedia('');
        else if (pin) loadMedia(pin);
      })
      .catch((error) => {
        if (!alive) return;
        setReady(true);
        if (!startPreview()) setMessage(error.message || '無法讀取現場照片設定。');
      });
    return () => { alive = false; };
  }, [loadMedia, pin, startPreview]);

  useEffect(() => {
    if (!access) return undefined;
    const poll = window.setInterval(() => loadMedia(), POLL_MS);
    return () => window.clearInterval(poll);
  }, [access, loadMedia]);

  useEffect(() => {
    if (!access) return undefined;
    loadStockLibrary();
    const poll = window.setInterval(loadStockLibrary, 60_000);
    return () => window.clearInterval(poll);
  }, [access, loadStockLibrary]);

  useEffect(() => {
    if (!access) return undefined;
    loadWallState();
    const poll = window.setInterval(loadWallState, STATE_POLL_MS);
    return () => window.clearInterval(poll);
  }, [access, loadWallState]);

  useEffect(() => {
    if (!access) return undefined;
    const advance = () => {
      const schedule = scheduleRef.current;
      const booth = schedule.boothQueue.length && schedule.stockSinceBooth >= 2
        ? schedule.boothQueue.shift()
        : null;

      if (booth) {
        schedule.stockSinceBooth = 0;
        setSlide((current) => ({
          kind: 'fresh',
          src: `/photos/${encodeURIComponent(booth.token)}`,
          mediaType: booth.content_type,
          key: current.key + 1,
        }));
        return;
      }

      const stock = stockPhotos.length ? stockPhotos : emptyStock;
      const item = stock[schedule.stockIndex % stock.length];
      schedule.stockIndex += 1;
      schedule.stockSinceBooth += 1;
      setSlide((current) => ({ kind: 'memory', src: item.src, mediaType: item.mediaType, key: current.key + 1 }));
    };
    const timer = window.setInterval(advance, DISPLAY_MS);
    return () => window.clearInterval(timer);
  }, [access, stockPhotos]);

  if (!ready) return <main className="live-wall live-wall-loading">正在準備晚宴記憶牆…</main>;

  if (!access) {
    return (
      <main className="live-wall live-wall-lock">
        <form onSubmit={(event) => { event.preventDefault(); loadMedia(pin); }}>
          <p className="live-wall-eyebrow">JIM &amp; CAMILLA · AFTERGLOW</p>
          <h1>晚宴記憶牆</h1>
          <p>{pinRequired ? '請輸入管理 PIN，開始播放現場拍貼機照片。' : '正在連線至現場照片。'}</p>
          {pinRequired && <input value={pin} onChange={(event) => setPin(event.target.value)} type="password" inputMode="numeric" autoComplete="current-password" placeholder="管理 PIN" required autoFocus />}
          {pinRequired && <button>開始投影</button>}
          {message && <small>{message}</small>}
        </form>
      </main>
    );
  }

  const isVideo = slide.mediaType?.startsWith('video/');
  const cardActive = wallState.mode === 'card';
  const cardTypeLabel = wallState.cardType === 'task' ? 'MISSION CARD' : wallState.cardType === 'countdown' ? 'COMING UP' : 'NOTICE';
  return (
    <main className="live-wall">
      <div className="live-wall-grain" />
      <header className="live-wall-header">
        <p>JIM &amp; CAMILLA</p>
        <span>{previewMode ? 'PREVIEW MODE · 現場照片連線後自動加入' : 'AFTERGLOW · 2026.11.07'}</span>
      </header>
      {previewMode && <div className="live-wall-preview-note">{message}</div>}
      <section className={`live-wall-frame ${cardActive ? `live-wall-card-frame ${wallState.tone || 'gold'}` : slide.kind}`} key={cardActive ? wallState.updatedAt : slide.key} aria-live="polite">
        {cardActive ? (
          <div className="live-wall-card">
            <p>{wallState.kicker || cardTypeLabel}</p>
            <h1>{wallState.title}</h1>
            {wallState.subtitle && <h2>{wallState.subtitle}</h2>}
            {wallState.cta && <div className="live-wall-card-cta">{wallState.cta}</div>}
          </div>
        ) : (
          <>
            <div className="live-wall-photo">
              {!slide.src ? <div className="live-wall-empty">午宴直播照片庫尚未加入照片</div> : isVideo
                ? <video src={slide.src} autoPlay muted loop playsInline />
                : <img src={slide.src} alt={slide.kind === 'fresh' ? '現場拍貼機新照片' : 'Jim 與 Camilla 的回憶'} />}
            </div>
            <div className="live-wall-caption">
              {slide.kind === 'fresh' ? <><b>JUST DEVELOPED</b><span>現場新回憶送達</span></> : <><b>MEMORIES IN MOTION</b><span>我們的故事，持續發生</span></>}
            </div>
          </>
        )}
      </section>
      <footer className="live-wall-footer"><span>✦</span> THANK YOU FOR BEING PART OF OUR STORY <span>✦</span></footer>
    </main>
  );
}
