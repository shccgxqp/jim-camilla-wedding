import { useEffect, useRef } from 'react';

const TARGET = new Date('2026-11-07T12:00:00+08:00').getTime();
const pad = (n, w = 2) => String(Math.max(0, n)).padStart(w, '0');

export default function Countdown() {
  const dRef = useRef(null);
  const hRef = useRef(null);
  const mRef = useRef(null);
  const sRef = useRef(null);

  useEffect(() => {
    function tick() {
      const diff = TARGET - Date.now();
      if (dRef.current) dRef.current.textContent = pad(Math.floor(diff / 86400000), 3);
      if (hRef.current) hRef.current.textContent = pad(Math.floor((diff % 86400000) / 3600000));
      if (mRef.current) mRef.current.textContent = pad(Math.floor((diff % 3600000) / 60000));
      if (sRef.current) sRef.current.textContent = pad(Math.floor((diff % 60000) / 1000));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="w-countdown-section">
      <span className="w-kicker kicker">Time Until</span>
      <h2 className="head">距離午餐還有</h2>
      <p className="when">
        2026.11.07
        <span className="sep" />
        Saturday
        <span className="sep" />
        Noon 12:00
      </p>
      <div className="w-countdown">
        <div className="unit"><div className="num" ref={dRef}>000</div><div className="lbl">Days</div></div>
        <div className="unit"><div className="num" ref={hRef}>00</div><div className="lbl">Hours</div></div>
        <div className="unit"><div className="num" ref={mRef}>00</div><div className="lbl">Min</div></div>
        <div className="unit"><div className="num" ref={sRef}>00</div><div className="lbl">Sec</div></div>
      </div>
      <p className="quip">他終於開口了 而她剛好沒事</p>
    </section>
  );
}
