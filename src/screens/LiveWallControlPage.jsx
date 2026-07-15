import { useEffect, useMemo, useState } from 'react';
import './live-wall-control.css';

const EMPTY_CARD = {
  mode: 'card',
  cardType: 'notice',
  kicker: 'NOTICE',
  title: '請回到座位',
  subtitle: '晚宴流程即將繼續，謝謝大家。',
  cta: '',
  tone: 'gold',
};

const QUICK_ACTIONS = [
  { label: '回到照片牆', state: { mode: 'photo' } },
  { label: '請回座位', state: { ...EMPTY_CARD, kicker: 'NOTICE', title: '請回到座位', subtitle: '晚宴流程即將繼續，謝謝大家。', cta: 'PLEASE BE SEATED', tone: 'gold' } },
  { label: '拍貼任務', state: { ...EMPTY_CARD, cardType: 'task', kicker: 'MISSION CARD', title: '找朋友去拍貼', subtitle: '留下今晚最好笑、最好看的那一張。', cta: 'PHOTO BOOTH IS OPEN', tone: 'rose' } },
  { label: '自由任務卡', state: { ...EMPTY_CARD, cardType: 'task', kicker: 'MISSION CARD', title: '', subtitle: '', cta: 'MISSION START', tone: 'rose' }, editOnly: true },
  { label: '活動準備', state: { ...EMPTY_CARD, cardType: 'countdown', kicker: 'COMING UP', title: '活動即將開始', subtitle: '請準備好掌聲與手機，下一段流程馬上開始。', cta: 'STAY TUNED', tone: 'green' } },
  { label: '敬酒提醒', state: { ...EMPTY_CARD, kicker: 'NOTICE', title: '敬酒準備', subtitle: '新人即將到各桌敬酒，請大家先留在座位附近。', cta: 'CHEERS TOGETHER', tone: 'gold' } },
];

function isJson(response) {
  return (response.headers.get('content-type') || '').includes('application/json');
}

function formatTime(value) {
  if (!value) return '尚未更新';
  return new Intl.DateTimeFormat('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(value));
}

export default function LiveWallControlPage() {
  const [pin, setPin] = useState(() => sessionStorage.getItem('live_wall_control_pin') || '');
  const [pinRequired, setPinRequired] = useState(true);
  const [ready, setReady] = useState(false);
  const [current, setCurrent] = useState({ mode: 'photo' });
  const [draft, setDraft] = useState(EMPTY_CARD);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const currentLabel = useMemo(() => {
    if (current.mode !== 'card') return '照片牆輪播中';
    return `${current.title || '提示卡'} · ${current.cardType === 'task' ? '任務卡' : current.cardType === 'countdown' ? '流程提示' : '提示卡'}`;
  }, [current]);

  async function loadState() {
    try {
      const response = await fetch('/api/live-wall-state', { cache: 'no-store' });
      if (!isJson(response)) throw new Error('本機預覽尚未提供投影控制 API。');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '無法讀取目前投影狀態。');
      setCurrent(data.state || { mode: 'photo' });
    } catch (error) {
      setMessage(error.message || '無法讀取目前投影狀態。');
    }
  }

  useEffect(() => {
    let alive = true;
    fetch('/api/gallery-config', { cache: 'no-store' })
      .then((response) => (isJson(response) ? response.json() : { pinRequired: true }))
      .then((data) => {
        if (!alive) return;
        setPinRequired(data.pinRequired !== false);
        setReady(true);
        loadState();
      })
      .catch(() => {
        if (!alive) return;
        setReady(true);
        loadState();
      });
    return () => { alive = false; };
  }, []);

  async function publish(nextState) {
    if (pinRequired && !pin) {
      setMessage('請先輸入管理 PIN。');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/live-wall-state', {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          ...(pin ? { 'X-Admin-Pin': pin } : {}),
        },
        body: JSON.stringify(nextState),
      });
      if (!isJson(response)) throw new Error('本機預覽尚未提供投影控制 API。');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '無法更新投影狀態。');
      if (pin) sessionStorage.setItem('live_wall_control_pin', pin);
      setCurrent(data.state || nextState);
      if ((data.state || nextState).mode === 'card') setDraft(data.state || nextState);
      setMessage('已更新投影畫面。');
    } catch (error) {
      setMessage(error.message || '無法更新投影狀態。');
    } finally {
      setSaving(false);
    }
  }

  function updateDraft(field, value) {
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }));
  }

  return (
    <main className="wall-control">
      <header className="wall-control-header">
        <div>
          <p>LIVE WALL CONTROL</p>
          <h1>晚宴投影控制</h1>
        </div>
        <a href="/live-wall">投影頁</a>
      </header>

      <section className="wall-control-status">
        <p>目前畫面</p>
        <h2>{currentLabel}</h2>
        <span>更新時間：{formatTime(current.updatedAt)}</span>
      </section>

      {pinRequired && (
        <label className="wall-control-pin">
          管理 PIN
          <input value={pin} onChange={(event) => setPin(event.target.value)} type="password" inputMode="numeric" autoComplete="current-password" placeholder="輸入後即可控制投影" />
        </label>
      )}

      <section className="wall-control-actions" aria-label="快速控制">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            className={action.editOnly ? 'wall-control-edit-action' : ''}
            onClick={() => (action.editOnly ? setDraft(action.state) : publish(action.state))}
            disabled={saving || !ready}
          >
            {action.label}
          </button>
        ))}
      </section>

      <form className="wall-control-editor" onSubmit={(event) => { event.preventDefault(); publish(draft); }}>
        <h2>自訂卡片</h2>
        <label>
          類型
          <select value={draft.cardType} onChange={(event) => updateDraft('cardType', event.target.value)}>
            <option value="notice">提示卡</option>
            <option value="task">任務卡</option>
            <option value="countdown">流程提示</option>
          </select>
        </label>
        <label>
          小標
          <input value={draft.kicker} onChange={(event) => updateDraft('kicker', event.target.value)} maxLength={28} />
        </label>
        <label>
          主標
          <input value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} maxLength={48} required />
        </label>
        <label>
          說明
          <textarea value={draft.subtitle} onChange={(event) => updateDraft('subtitle', event.target.value)} maxLength={120} rows={3} />
        </label>
        <label>
          底部短句
          <input value={draft.cta} onChange={(event) => updateDraft('cta', event.target.value)} maxLength={42} />
        </label>
        <label>
          色調
          <select value={draft.tone} onChange={(event) => updateDraft('tone', event.target.value)}>
            <option value="gold">金色</option>
            <option value="rose">玫瑰</option>
            <option value="green">綠色</option>
          </select>
        </label>
        <button type="submit" disabled={saving || !ready}>{saving ? '更新中…' : '送出自訂卡片'}</button>
      </form>

      {message && <div className="wall-control-message">{message}</div>}
    </main>
  );
}
