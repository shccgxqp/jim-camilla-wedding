import { useEffect, useMemo, useState } from 'react';
import './photo-gallery.css';

function formatDate(value) {
  return new Intl.DateTimeFormat('zh-TW', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatSize(size) {
  if (!size) return '';
  return `${(size / 1024 / 1024).toFixed(size > 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

export default function PhotoGalleryPage() {
  const [pin, setPin] = useState(() => sessionStorage.getItem('pb_admin_pin') || '');
  const [media, setMedia] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState('newest');
  const [authenticated, setAuthenticated] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [pinRequired, setPinRequired] = useState(true);

  async function loadGallery(candidate = pin) {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/media', { headers: { 'X-Admin-Pin': candidate } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load gallery.');
      sessionStorage.setItem('pb_admin_pin', candidate);
      setMedia(data.media || []);
      setAuthenticated(true);
    } catch (error) {
      sessionStorage.removeItem('pb_admin_pin');
      setAuthenticated(false);
      setMessage(error.message || 'Unable to load gallery.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const stored = sessionStorage.getItem('pb_admin_pin');
    fetch('/api/gallery-config')
      .then((response) => response.json())
      .then((data) => {
        const required = data.pinRequired !== false;
        setPinRequired(required);
        setConfigured(true);
        if (!required) loadGallery('');
        else if (stored) loadGallery(stored);
      })
      .catch(() => setConfigured(true));
  }, []);

  async function remove(item) {
    if (!window.confirm(`確定刪除「${item.filename}」？此操作無法復原。`)) return;
    try {
      const response = await fetch(`/api/media/${encodeURIComponent(item.token)}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Pin': pin },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to delete media.');
      setMedia((current) => current.filter((entry) => entry.token !== item.token));
    } catch (error) {
      setMessage(error.message || 'Unable to delete media.');
    }
  }

  const sorted = useMemo(() => [...media].sort((a, b) => (
    order === 'newest'
      ? new Date(b.created_at) - new Date(a.created_at)
      : new Date(a.created_at) - new Date(b.created_at)
  )), [media, order]);

  const unlocked = authenticated;

  return (
    <main className="gallery-page">
      <header className="gallery-header">
        <div>
          <p>PHOTO BOOTH ADMIN</p>
          <h1>照片管理</h1>
        </div>
        <a className="gallery-back" href="/photo-booth">返回拍貼機</a>
      </header>

      {!configured ? (
        <div className="gallery-empty">正在載入相簿設定…</div>
      ) : !unlocked ? (
        <form className="gallery-lock" onSubmit={(event) => { event.preventDefault(); loadGallery(pin); }}>
          <h2>{pinRequired ? '管理員驗證' : '照片管理'}</h2>
          <p>{pinRequired ? '輸入主辦人 PIN 後，可線上瀏覽及刪除照片與影片。' : '開發模式：PIN 暫時關閉。'}</p>
          {pinRequired && <input
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            placeholder="管理員 PIN"
            required
          />}
          <button disabled={loading}>{loading ? '載入中…' : '開啟相簿'}</button>
          {message && <div className="gallery-message">{message}</div>}
        </form>
      ) : (
        <>
          <div className="gallery-toolbar">
            <span>{media.length} 個檔案</span>
            <label>
              日期排序
              <select value={order} onChange={(event) => setOrder(event.target.value)}>
                <option value="newest">最新優先</option>
                <option value="oldest">最舊優先</option>
              </select>
            </label>
            <button onClick={() => loadGallery()} disabled={loading}>{loading ? '更新中…' : '重新整理'}</button>
          </div>
          {message && <div className="gallery-message">{message}</div>}
          {sorted.length === 0 ? (
            <div className="gallery-empty">目前還沒有照片或影片。</div>
          ) : (
            <section className="gallery-grid">
              {sorted.map((item) => {
                const source = `/photos/${encodeURIComponent(item.token)}`;
                const isVideo = item.content_type.startsWith('video/');
                return (
                  <article className="gallery-card" key={item.token}>
                    {isVideo ? <video controls preload="metadata" src={source} /> : <img src={source} alt={item.filename} loading="lazy" />}
                    <div className="gallery-meta">
                      <time>{formatDate(item.created_at)}</time>
                      <span>{isVideo ? '影片' : item.content_type === 'image/gif' ? 'GIF' : '相片'} · {formatSize(item.size)}</span>
                    </div>
                    <div className="gallery-actions">
                      <a href={`/view/${encodeURIComponent(item.token)}`} target="_blank" rel="noreferrer">開啟</a>
                      <button className="gallery-delete" onClick={() => remove(item)}>刪除</button>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </>
      )}
    </main>
  );
}
