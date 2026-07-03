import { useEffect, useRef } from 'react';

const CHAPTERS = [
  { ch: 'Chapter One · 2018', title: '她以為他是來面試的', body: '咖啡店,下午三點,誤會程度相當高。兩個人都點了拿鐵,半小時後才發現 — 我們是同一場聯誼,而且', em: '坐錯桌了。', side: 'right', img: '/wedding/images/story-1-2018-coffee.jpg', cap: '2018 · the coffee shop', alt: '2018 咖啡店初遇' },
  { ch: 'Chapter Two · 2019', title: '京都的雨', body: '第一次一起出國。Camilla 忘了帶傘,Jim 忘了訂飯店。我們在鴨川旁邊吃了一碗很貴的拉麵,然後決定:', em: '再也不分開旅行。', side: 'right', img: '/wedding/images/story-2-2019-kyoto.jpg', cap: '2019 · 京都的雨', alt: '2019 京都的雨' },
  { ch: 'Chapter Three · 2021', title: '三位董事報到', body: '我們以為一隻就夠了。事實證明 — ', em: '人類遠遠不夠數。', body2: '本婚禮謹獻給:豆漿、芝麻、和飯糰。', side: 'left', img: '/wedding/images/story-3-2021-cats.jpg', cap: '2021 · 三位董事', alt: '2021 三位董事' },
  { ch: 'Chapter Four · 2024', title: '23 分鐘的求婚演講', body: 'Jim 準備了 23 分鐘的求婚演講,Camilla 在第 4 分鐘就說好,但他堅持要把剩下的 ', em: '19 分鐘講完', body2: ',因為「練很久」。', side: 'left', img: '/wedding/images/story-4-2024-proposal.jpg', cap: '2024 · the proposal', alt: '2024 求婚那天' },
  { ch: 'Chapter Five · 2026', title: '就是今天', body: '八年後 — 一頓很長的午餐。歡迎你來見證我們從', em: '「不是,你才走錯」', body2: '走到「我願意」。', side: 'right', img: '/wedding/images/story-5-2026-today.jpg', cap: '2026 · today', alt: '2026 就是今天' },
];

const TILTS = [-3.2, 2.4, -1.8, 3.0, -2.2];
const STACK_GAP = 28;
const ENTER_LEN = 1.0;
const DWELL_LEN = 0.7;

function buildSegs(n) {
  const segs = [];
  let p = 0, cp = 0;
  for (let i = 0; i < n; i++) {
    segs.push({ s: p, e: p + ENTER_LEN, cpS: cp, cpE: cp + 1 });
    p += ENTER_LEN; cp += 1;
    if (i < n - 1) { segs.push({ s: p, e: p + DWELL_LEN, cpS: cp, cpE: cp }); p += DWELL_LEN; }
  }
  return { segs, totalU: p, totalCp: cp };
}

function rawToCardP(eff, segs, totalU, totalCp) {
  const u = eff * totalU;
  for (const seg of segs) {
    if (u <= seg.e) {
      const t = (u - seg.s) / Math.max(0.0001, seg.e - seg.s);
      return seg.cpS + t * (seg.cpE - seg.cpS);
    }
  }
  return totalCp;
}

function easeOut(t) { return 1 - Math.pow(1 - t, 2.2); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export default function Story() {
  const trackRef = useRef(null);
  const cardRefs = useRef([]);
  const txtRefs = useRef([]);
  const dotRefs = useRef([]);
  const N = CHAPTERS.length;
  const { segs, totalU } = buildSegs(N);

  useEffect(() => {
    let ticking = false;
    function update() {
      ticking = false;
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const trackH = track.offsetHeight;
      const vh = window.innerHeight;
      const total = trackH - vh;
      const scrolled = clamp(-rect.top, 0, total);
      const p = total > 0 ? scrolled / total : 0;
      const dwell = 0.16;
      const eff = clamp(p / (1 - dwell), 0, 1);
      const cardP = rawToCardP(eff, segs, totalU, N);

      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        if (cardP < i) {
          card.style.opacity = '0';
          card.style.transform = `translate(-50%, 120vh) rotate(0deg)`;
          card.style.zIndex = String(i + 1);
          return;
        }
        card.style.opacity = '1';
        card.style.zIndex = String(i + 1);
        const local = cardP - i;
        if (local < 1) {
          const e = easeOut(local);
          const startY = vh * 0.95;
          const y = startY * (1 - e);
          const rot = TILTS[i] * (1 - e) * 0.25;
          card.style.transform = `translate(-50%, ${y}px) rotate(${rot.toFixed(2)}deg)`;
        } else {
          const pushed = Math.max(0, local - 1);
          const maxPush = N - 1 - i;
          const capped = Math.min(pushed, maxPush);
          const y = -capped * STACK_GAP;
          const tiltP = Math.min(1, capped);
          const rot = TILTS[i] * tiltP;
          card.style.transform = `translate(-50%, ${y}px) rotate(${rot.toFixed(2)}deg)`;
        }
      });

      const activeIdx = clamp(Math.floor(cardP), 0, N - 1);
      const localActive = cardP - activeIdx;

      txtRefs.current.forEach((t, j) => {
        if (!t) return;
        let op = 0, dxFactor = 0;
        if (j === activeIdx) {
          op = clamp((localActive - 0.45) / 0.45, 0, 1);
          dxFactor = 1 - op;
        } else if (j === activeIdx - 1) {
          op = clamp(1 - (localActive - 0.40) / 0.50, 0, 1);
        }
        const on = op > 0.02;
        t.classList.toggle('on', on);
        t.style.opacity = op.toFixed(3);
        if (on) {
          const isLeft = t.classList.contains('left');
          const dx = (isLeft ? -12 : 12) * dxFactor;
          t.style.transform = `translate(${dx}px, -50%)`;
        } else {
          t.style.transform = '';
        }
      });

      dotRefs.current.forEach((d, j) => {
        if (d) d.classList.toggle('on', j === activeIdx);
      });
    }

    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <section className="w-story w-section">
      <div className="w-story-track" ref={trackRef}>
        <div className="w-story-sticky">
          <h2 className="w-story-bigtitle">our story</h2>

          {CHAPTERS.map((c, i) => (
            <div
              key={i}
              className={`w-txt ${c.side}`}
              ref={el => { txtRefs.current[i] = el; }}
            >
              <h3><span className="ch">{c.ch}</span>{c.title}</h3>
              <p>
                {c.body}
                {c.em && <em>{c.em}</em>}
                {c.body2}
              </p>
            </div>
          ))}

          <div className="w-stack">
            {CHAPTERS.map((c, i) => (
              <div
                key={i}
                className="w-card"
                data-i={i}
                ref={el => { cardRefs.current[i] = el; }}
              >
                <div className="photo">
                  <img alt={c.alt} src={c.img} />
                </div>
                <div className="cap">{c.cap}</div>
              </div>
            ))}
          </div>

          <div className="w-dots">
            {CHAPTERS.map((_, i) => (
              <b key={i} ref={el => { dotRefs.current[i] = el; }} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
