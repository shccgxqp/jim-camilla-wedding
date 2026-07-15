import { useEffect, useMemo, useState } from 'react';
import './photo-library.css';

function isJson(response) {
  return (response.headers.get('content-type') || '').includes('application/json');
}

function formatSize(size) {
  if (!size) return '';
  return `${(size / 1024 / 1024).toFixed(size > 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function PhotoLibraryPage() {
  const [pin, setPin] = useState(() => sessionStorage.getItem('photo_library_pin') || '');
  const [pinRequired, setPinRequired] = useState(true);
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [media, setMedia] = useState([]);
  const [files, setFiles] = useState([]);
  const [collection, setCollection] = useState('wedding');
  const [liveWall, setLiveWall] = useState(true);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const liveWallCount = useMemo(() => media.filter((item) => item.live_wall).length, [media]);

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(pin ? { 'X-Admin-Pin': pin } : {}),
        ...(options.headers || {}),
      },
    });
    if (!isJson(response)) throw new Error('API 沒有回傳 JSON，請確認 Cloudflare Worker 是否已啟動。');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '操作失敗。');
    return data;
  }

  async function loadLibrary(candidate = pin) {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/library', {
        headers: candidate ? { 'X-Admin-Pin': candidate } : {},
        cache: 'no-store',
      });
      if (!isJson(response)) throw new Error('API 沒有回傳 JSON，請確認 Cloudflare Worker 是否已啟動。');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '無法讀取照片庫。');
      if (candidate) sessionStorage.setItem('photo_library_pin', candidate);
      setMedia(data.media || []);
      setUnlocked(true);
    } catch (error) {
      setUnlocked(false);
      setMessage(error.message || '無法讀取照片庫。');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const stored = sessionStorage.getItem('photo_library_pin') || '';
    fetch('/api/gallery-config', { cache: 'no-store' })
      .then((response) => (isJson(response) ? response.json() : { pinRequired: true }))
      .then((data) => {
        const required = data.pinRequired !== false;
        setPinRequired(required);
        setReady(true);
        if (!required) loadLibrary('');
        else if (stored) loadLibrary(stored);
      })
      .catch(() => setReady(true));
  }, []);

  function collectFiles(fileList) {
    const selected = [...fileList].filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'));
    setFiles(selected);
    setMessage(selected.length ? `已選擇 ${selected.length} 個檔案。` : '沒有可上傳的圖片或影片。');
  }

  async function uploadSelected(event) {
    event.preventDefault();
    if (!files.length) {
      setMessage('請先拖拉或選擇照片。');
      return;
    }
    setBusy(true);
    setMessage('正在上傳照片庫…');
    let uploaded = 0;
    try {
      for (const file of files) {
        const form = new FormData();
        form.set('file', file);
        form.set('collection', collection);
        form.set('live_wall', liveWall ? 'true' : 'false');
        await requestJson('/api/library', { method: 'POST', body: form });
        uploaded += 1;
      }
      setFiles([]);
      setMessage(`已上傳 ${uploaded} 個檔案。`);
      await loadLibrary(pin);
    } catch (error) {
      setMessage(`${uploaded ? `已上傳 ${uploaded} 個，` : ''}${error.message || '上傳失敗。'}`);
    } finally {
      setBusy(false);
    }
  }

  async function updateItem(item, patch) {
    try {
      const next = {
        collection: item.collection,
        caption: item.caption || '',
        live_wall: Boolean(item.live_wall),
        sort_order: item.sort_order || 0,
        ...patch,
      };
      await requestJson(`/api/library/${encodeURIComponent(item.token)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(next),
      });
      setMedia((current) => current.map((entry) => (entry.token === item.token ? { ...entry, ...next, live_wall: next.live_wall ? 1 : 0 } : entry)));
    } catch (error) {
      setMessage(error.message || '更新失敗。');
    }
  }

  async function removeItem(item) {
    if (!window.confirm(`確定刪除「${item.filename}」？R2 檔案也會一起刪除。`)) return;
    try {
      await requestJson(`/api/media/${encodeURIComponent(item.token)}`, { method: 'DELETE' });
      setMedia((current) => current.filter((entry) => entry.token !== item.token));
      setMessage('已刪除照片。');
    } catch (error) {
      setMessage(error.message || '刪除失敗。');
    }
  }

  return (
    <main className="library-page">
      <header className="library-header">
        <div>
          <p>R2 PHOTO LIBRARY</p>
          <h1>照片庫管理</h1>
        </div>
        <a href="/live-wall">投影牆</a>
      </header>

      {!ready ? (
        <section className="library-panel">正在讀取設定…</section>
      ) : !unlocked ? (
        <form className="library-panel library-lock" onSubmit={(event) => { event.preventDefault(); loadLibrary(pin); }}>
          <h2>{pinRequired ? '管理員驗證' : '開發模式'}</h2>
          <p>照片會上傳到 Cloudflare R2，GitHub 只保留程式碼與固定素材。</p>
          {pinRequired && <input value={pin} onChange={(event) => setPin(event.target.value)} type="password" inputMode="numeric" placeholder="管理 PIN" required />}
          <button disabled={busy}>{busy ? '讀取中…' : '開啟照片庫'}</button>
          {message && <div className="library-message">{message}</div>}
        </form>
      ) : (
        <>
          <section className="library-summary">
            <div><b>{media.length}</b><span>照片庫檔案</span></div>
            <div><b>{liveWallCount}</b><span>加入投影牆</span></div>
            <button type="button" onClick={() => loadLibrary()} disabled={busy}>{busy ? '更新中…' : '重新整理'}</button>
          </section>

          <form className="library-upload" onSubmit={uploadSelected}>
            <label
              className="library-drop"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => { event.preventDefault(); collectFiles(event.dataTransfer.files); }}
            >
              <input type="file" accept="image/*,video/*" multiple onChange={(event) => collectFiles(event.target.files)} />
              <span>拖拉照片到這裡，或點選選擇檔案</span>
              <small>{files.length ? files.map((file) => file.name).join('、') : '支援 JPG、PNG、WebP、GIF、MP4；單檔 25MB 內。'}</small>
            </label>
            <div className="library-upload-options">
              <label>分類
                <select value={collection} onChange={(event) => setCollection(event.target.value)}>
                  <option value="wedding">婚紗庫存照</option>
                  <option value="story">故事照片</option>
                  <option value="dinner">晚宴投影照</option>
                </select>
              </label>
              <label className="library-check">
                <input type="checkbox" checked={liveWall} onChange={(event) => setLiveWall(event.target.checked)} />
                加入投影牆輪播
              </label>
              <button disabled={busy || !files.length}>{busy ? '處理中…' : '上傳到 R2'}</button>
            </div>
          </form>

          {message && <div className="library-message">{message}</div>}

          <section className="library-grid">
            {media.length === 0 ? (
              <div className="library-empty">照片庫目前是空的。上傳後，投影牆會優先使用這裡的照片。</div>
            ) : media.map((item) => {
              const source = `/photos/${encodeURIComponent(item.token)}`;
              const isVideo = item.content_type.startsWith('video/');
              return (
                <article className="library-card" key={item.token}>
                  {isVideo ? <video src={source} controls preload="metadata" /> : <img src={source} alt={item.filename} loading="lazy" />}
                  <div className="library-card-body">
                    <h2>{item.filename}</h2>
                    <p>{item.collection} · {formatSize(item.size)} · {formatDate(item.created_at)}</p>
                    <label className="library-check">
                      <input type="checkbox" checked={Boolean(item.live_wall)} onChange={(event) => updateItem(item, { live_wall: event.target.checked })} />
                      投影牆顯示
                    </label>
                    <label>排序
                      <input type="number" defaultValue={item.sort_order || 0} onBlur={(event) => updateItem(item, { sort_order: Number(event.target.value) || 0 })} />
                    </label>
                    <label>備註
                      <input defaultValue={item.caption || ''} onBlur={(event) => updateItem(item, { caption: event.target.value })} maxLength={120} />
                    </label>
                    <div className="library-actions">
                      <a href={source} target="_blank" rel="noreferrer">開啟</a>
                      <button type="button" onClick={() => removeItem(item)}>刪除</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}
    </main>
  );
}
