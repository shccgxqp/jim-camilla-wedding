import { useCallback, useEffect, useState } from 'react';

export default function RsvpModal({ onClose }) {
  const [attend, setAttend] = useState(null);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState({});

  const handleKey = useCallback((e) => { if (e.key === 'Escape') onClose(); }, [onClose]);
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [handleKey]);

  function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = String(fd.get('name') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const emailGood = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const errs = {};
    if (!name) errs.name = '請告訴我們你是誰';
    if (!emailGood) errs.email = '需要正確 Email · 才能寄座位卡';
    if (!attend) errs.attend = '請選擇';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setDone(true);
  }

  return (
    <div
      className="w-modal-bg open"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-modal">
        <button className="close-btn" onClick={onClose}>×</button>
        {done ? (
          <div className="ok">
            <div className="seal">❦</div>
            <h4>Received</h4>
            <p>我們已將你的回覆封進信封 (數位的)<br />11 月 7 日見</p>
          </div>
        ) : (
          <>
            <h3>R.S.V.P.</h3>
            <p className="sub">敬請於 2026.10.10 前回覆</p>
            <form onSubmit={handleSubmit} noValidate>
              <label>Full Name · 姓名</label>
              <input type="text" name="name" required />
              {errors.name && <div className="field-err">{errors.name}</div>}

              <label>Email</label>
              <input type="email" name="email" required />
              {errors.email && <div className="field-err">{errors.email}</div>}

              <label>Attendance · 出席</label>
              <div className="seg">
                <button type="button" className={attend === 'yes' ? 'on' : ''} onClick={() => setAttend('yes')}>
                  會 · I&apos;ll be there
                </button>
                <button type="button" className={attend === 'no' ? 'on' : ''} onClick={() => setAttend('no')}>
                  不行 · Sadly no
                </button>
              </div>
              {errors.attend && <div className="field-err">{errors.attend}</div>}

              <label>Party Size · 人數</label>
              <select name="count">
                <option value="1">1 人 · Solo</option>
                <option value="2">2 人 · +1</option>
                <option value="3">3 人 · 含小孩</option>
                <option value="4">4 人</option>
              </select>

              <label>Dietary · 飲食</label>
              <select name="diet">
                <option value="">無</option>
                <option value="veg">素食</option>
                <option value="allergy">過敏 (請備註)</option>
                <option value="halal">清真</option>
              </select>

              <label>Note · 想說的話</label>
              <textarea name="msg" rows="3" placeholder="例如:祝賀詞 · 或拉麵店推薦" />

              <button className="submit" type="submit">Send · 送出回覆</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
