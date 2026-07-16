import { useEffect, useMemo, useRef, useState } from 'react';
import './photo-library.css';

const COLLECTIONS = [
  ['site-top', '網站封面'],
  ['story', '網站 STORY'],
  ['photo-wall', '網站相片牆'],
  ['lunch-live', '午宴直播'],
];

const collectionLabel = (value) => COLLECTIONS.find(([key]) => key === value)?.[1] || value;
const formatSize = (size) => size ? `${(size / 1024 / 1024).toFixed(size > 10 * 1024 * 1024 ? 0 : 1)} MB` : '';
const isJson = (response) => (response.headers.get('content-type') || '').includes('application/json');

function normalizePositions(media) {
  return COLLECTIONS.flatMap(([collection]) => media.filter((item) => item.collection === collection)
    .slice().sort((a, b) => a.sort_order - b.sort_order || new Date(a.created_at) - new Date(b.created_at))
    .map((item, index) => ({ ...item, sort_order: index + 1 })));
}

function sameEditableItem(left, right) {
  return left?.collection === right?.collection && left?.caption === right?.caption && left?.sort_order === right?.sort_order;
}

export default function PhotoLibraryPage() {
  const [pin, setPin] = useState(() => sessionStorage.getItem('photo_library_pin') || '');
  const [pinRequired, setPinRequired] = useState(true);
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [savedMedia, setSavedMedia] = useState([]);
  const [draftMedia, setDraftMedia] = useState([]);
  const [files, setFiles] = useState([]);
  const [collection, setCollection] = useState('photo-wall');
  const [activeCollection, setActiveCollection] = useState('photo-wall');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const dragTokenRef = useRef(null);
  const fileInputRef = useRef(null);

  const collectionCounts = useMemo(() => Object.fromEntries(COLLECTIONS.map(([key]) => [key, draftMedia.filter((item) => item.collection === key).length])), [draftMedia]);
  const visibleMedia = useMemo(() => draftMedia.filter((item) => item.collection === activeCollection).slice().sort((a, b) => a.sort_order - b.sort_order), [activeCollection, draftMedia]);
  const savedByToken = useMemo(() => new Map(savedMedia.map((item) => [item.token, item])), [savedMedia]);
  const dirty = useMemo(() => draftMedia.length !== savedMedia.length || draftMedia.some((item) => !sameEditableItem(item, savedByToken.get(item.token))), [draftMedia, savedByToken, savedMedia.length]);

  async function requestJson(url, options = {}) {
    const response = await fetch(url, { ...options, headers: { ...(pin ? { 'X-Admin-Pin': pin } : {}), ...(options.headers || {}) } });
    if (!isJson(response)) throw new Error('API 沒有回傳 JSON，請確認 Cloudflare Worker 是否已啟動。');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '操作失敗。');
    return data;
  }

  async function loadLibrary(candidate = pin) {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/library', { headers: candidate ? { 'X-Admin-Pin': candidate } : {}, cache: 'no-store' });
      if (!isJson(response)) throw new Error('API 沒有回傳 JSON，請確認 Cloudflare Worker 是否已啟動。');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '無法讀取照片庫。');
      const normalized = normalizePositions(data.media || []);
      if (candidate) sessionStorage.setItem('photo_library_pin', candidate);
      setSavedMedia(normalized); setDraftMedia(normalized); setUnlocked(true);
    } catch (error) {
      setUnlocked(false); setMessage(error.message || '無法讀取照片庫。');
    } finally { setBusy(false); }
  }

  useEffect(() => {
    const stored = sessionStorage.getItem('photo_library_pin') || '';
    fetch('/api/gallery-config', { cache: 'no-store' })
      .then((response) => (isJson(response) ? response.json() : { pinRequired: true }))
      .then((data) => { const required = data.pinRequired !== false; setPinRequired(required); setReady(true); if (!required) loadLibrary(''); else if (stored) loadLibrary(stored); })
      .catch(() => setReady(true));
  }, []);

  function collectFiles(fileList) {
    const selected = [...fileList].filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'));
    setFiles(selected); setMessage(selected.length ? `已選擇 ${selected.length} 個檔案，會加到「${collectionLabel(collection)}」最後。` : '沒有可上傳的圖片或影片。');
  }

  async function uploadSelected(event) {
    event.preventDefault();
    if (!files.length) return setMessage('請先拖拉或選擇照片。');
    setBusy(true); setMessage('正在上傳到 R2…'); let uploaded = 0;
    try {
      for (const file of files) {
        const form = new FormData(); form.set('file', file); form.set('collection', collection); form.set('sort_order', String((collectionCounts[collection] + uploaded + 1) * 10));
        await requestJson('/api/library', { method: 'POST', body: form }); uploaded += 1;
      }
      setFiles([]); if (fileInputRef.current) fileInputRef.current.value = '';
      setActiveCollection(collection); await loadLibrary(pin); setMessage(`已上傳 ${uploaded} 個檔案，排在「${collectionLabel(collection)}」最後。`);
    } catch (error) { setMessage(`${uploaded ? `已上傳 ${uploaded} 個，` : ''}${error.message || '上傳失敗。'}`); } finally { setBusy(false); }
  }

  function updateDraft(token, patch) {
    setDraftMedia((current) => {
      const item = current.find((entry) => entry.token === token);
      if (!item) return current;
      const next = { ...item, ...patch };
      let updated = current.map((entry) => entry.token === token ? next : entry);
      if (patch.collection && patch.collection !== item.collection) {
        const target = updated.filter((entry) => entry.collection === patch.collection).sort((a, b) => a.sort_order - b.sort_order);
        updated = updated.map((entry) => entry.token === token ? { ...entry, sort_order: target.length } : entry);
      }
      return updated;
    });
  }

  function reorder(sourceToken, targetToken) {
    if (!sourceToken || sourceToken === targetToken) return;
    setDraftMedia((current) => {
      const group = current.filter((item) => item.collection === activeCollection).slice().sort((a, b) => a.sort_order - b.sort_order);
      const from = group.findIndex((item) => item.token === sourceToken); const to = group.findIndex((item) => item.token === targetToken);
      if (from < 0 || to < 0) return current;
      const [moved] = group.splice(from, 1); group.splice(to, 0, moved);
      const positions = new Map(group.map((item, index) => [item.token, index + 1]));
      return current.map((item) => positions.has(item.token) ? { ...item, sort_order: positions.get(item.token) } : item);
    });
  }

  function nudgeItem(item, direction) {
    const index = visibleMedia.findIndex((entry) => entry.token === item.token);
    const target = visibleMedia[index + direction];
    if (target) reorder(item.token, target.token);
  }

  async function saveChanges() {
    const changed = draftMedia.filter((item) => !sameEditableItem(item, savedByToken.get(item.token)));
    if (!changed.length) return;
    setBusy(true); setMessage('正在儲存修改…');
    try {
      await Promise.all(changed.map((item) => requestJson(`/api/library/${encodeURIComponent(item.token)}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ collection: item.collection, caption: item.caption || '', sort_order: item.sort_order * 10 }),
      })));
      await loadLibrary(pin); setMessage(`已儲存 ${changed.length} 項修改。`);
    } catch (error) { setMessage(error.message || '儲存失敗，尚未完成的變更仍保留在畫面上。'); } finally { setBusy(false); }
  }

  async function removeItem(item) {
    if (!window.confirm(`確定刪除「${item.filename}」？R2 檔案也會一起刪除。`)) return;
    setBusy(true);
    try { await requestJson(`/api/media/${encodeURIComponent(item.token)}`, { method: 'DELETE' }); await loadLibrary(pin); setMessage('已刪除照片。'); }
    catch (error) { setMessage(error.message || '刪除失敗。'); } finally { setBusy(false); }
  }

  return <main className="library-page">
    <header className="library-header"><div><p>R2 PHOTO LIBRARY</p><h1>照片庫管理</h1></div><a href="/live-wall">午宴直播牆</a></header>
    {!ready ? <section className="library-panel">正在讀取設定…</section> : !unlocked ? <form className="library-panel library-lock" onSubmit={(event) => { event.preventDefault(); loadLibrary(pin); }}>
      <h2>{pinRequired ? '管理員驗證' : '開發模式'}</h2><p>照片會上傳到 Cloudflare R2，GitHub 不作為網站照片來源。</p>
      {pinRequired && <input value={pin} onChange={(event) => setPin(event.target.value)} type="password" inputMode="numeric" placeholder="管理 PIN" required />}
      <button disabled={busy}>{busy ? '讀取中…' : '開啟照片庫'}</button>{message && <div className="library-message">{message}</div>}
    </form> : <>
      <section className="library-summary"><div><b>{draftMedia.length}</b><span>全部 R2 照片</span></div><div><b>{collectionCounts['photo-wall']}</b><span>相片牆照片</span></div><div><b>{collectionCounts['lunch-live']}</b><span>午宴直播照片</span></div><button type="button" onClick={() => loadLibrary()} disabled={busy || dirty}>{busy ? '更新中…' : dirty ? '請先儲存或取消變更' : '重新整理'}</button></section>
      <form className="library-upload" onSubmit={uploadSelected}><label className="library-drop" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); collectFiles(event.dataTransfer.files); }}>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={(event) => collectFiles(event.target.files)} /><span>拖拉照片到這裡，或點選選擇檔案</span><small>{files.length ? files.map((file) => file.name).join('、') : '支援 JPG、PNG、WebP、GIF、MP4；單檔 25MB 內。'}</small>
      </label><div className="library-upload-options"><label>上傳到<select value={collection} onChange={(event) => setCollection(event.target.value)}>{COLLECTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button disabled={busy || !files.length}>{busy ? '處理中…' : '上傳到 R2'}</button></div></form>
      {message && <div className="library-message">{message}</div>}
      <nav className="library-tabs" aria-label="照片庫分類">{COLLECTIONS.map(([value, label]) => <button key={value} type="button" className={activeCollection === value ? 'active' : ''} onClick={() => setActiveCollection(value)}>{label}<b>{collectionCounts[value]}</b></button>)}</nav>
      <section className="library-workbench">
        <div className="library-workbench-head"><div><p>拖曳照片即可改變前台順序</p><h2>{collectionLabel(activeCollection)}預覽</h2></div><div className="library-save-actions"><button type="button" disabled={!dirty || busy} onClick={saveChanges}>{busy ? '儲存中…' : '儲存修改'}</button><button type="button" disabled={!dirty || busy} onClick={() => { setDraftMedia(savedMedia); setMessage('已取消尚未儲存的修改。'); }}>取消變更</button></div></div>
        {visibleMedia.length === 0 ? <div className="library-empty">這個照片庫目前是空的。上傳後會直接顯示在這裡。</div> : <div className={`library-preview library-preview-${activeCollection}`}>
          {visibleMedia.map((item, index) => { const source = `/photos/${encodeURIComponent(item.token)}`; const isVideo = item.content_type.startsWith('video/'); return <article className="library-preview-card" key={item.token} draggable onDragStart={() => { dragTokenRef.current = item.token; }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); reorder(dragTokenRef.current, item.token); dragTokenRef.current = null; }}>
            <div className="library-preview-media">{isVideo ? <video src={source} muted playsInline preload="metadata" /> : <img src={source} alt={item.caption || item.filename} loading="lazy" />}<span className="library-position">{index + 1}</span><span className="library-drag-handle">⠿ 拖移</span></div>
            <div className="library-preview-editor"><label>備註<input value={item.caption || ''} onChange={(event) => updateDraft(item.token, { caption: event.target.value })} maxLength={120} placeholder="可選填照片說明" /></label><label>用途<select value={item.collection} onChange={(event) => updateDraft(item.token, { collection: event.target.value })}>{COLLECTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><div className="library-actions"><button type="button" disabled={busy || index === 0} onClick={() => nudgeItem(item, -1)}>往前</button><button type="button" disabled={busy || index === visibleMedia.length - 1} onClick={() => nudgeItem(item, 1)}>往後</button><a href={source} target="_blank" rel="noreferrer">開啟</a><button type="button" disabled={busy} onClick={() => removeItem(item)}>刪除</button></div></div>
          </article>; })}
        </div>}
      </section>
    </>}
  </main>;
}
