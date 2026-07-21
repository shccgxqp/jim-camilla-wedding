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
    <section className="wv2-countdown">
      <div className="wv2-countdown-kicker">[ 倒數計時 · WE  LOOK FORWARD TO SEEING YOU ]</div>
      <div className="wv2-countdown-row">
        <div className="wv2-countdown-unit"><span className="num" ref={dRef}>000</span><span className="lbl">Days</span></div>
        <div className="wv2-countdown-unit"><span className="num" ref={hRef}>00</span><span className="lbl">Hours</span></div>
        <div className="wv2-countdown-unit"><span className="num" ref={mRef}>00</span><span className="lbl">Min</span></div>
        <div className="wv2-countdown-unit"><span className="num" ref={sRef}>00</span><span className="lbl">Sec</span></div>
      </div>
      <p className="wv2-countdown-quip">這一年，這一天，希望您與我們相聚如初</p>
    </section>
  );
}
