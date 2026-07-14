import { useEffect, useRef } from "react";

const CHAPTERS = [
  {
    ch: "Chapter One",
    title: "大學的相遇",
    body: "迎新宿營的晚上,燈光昏黃、營火搖曳。不自覺在人群裡多看了一眼,就這樣",
    em: "記住了彼此。",
    side: "right",
    img: "/wedding/images/story-1-camp.jpg",
    cap: "the day we met",
    alt: "大學宿營相遇",
  },
  {
    ch: "Chapter Two",
    title: "第一次一起露營",
    body: "手忙腳亂地搭帳篷、烤肉、看星星、篝火前談心。從那一夜起,我們決定",
    em: "往後的風景都要一起看。",
    side: "right",
    img: "/wedding/images/story-2-camping.jpg",
    cap: "our first camp",
    alt: "第一次一起露營",
  },
  {
    ch: "Chapter Three",
    title: "四十天的歐洲",
    body: "背著行囊,橫越了整個歐洲,四十天沒有回頭路。每一段火車、每一座城市,都成了",
    em: "只屬於我們的地圖。",
    side: "left",
    img: "/wedding/images/story-3-europe.jpg",
    cap: "forty days across europe",
    alt: "四十天歐洲旅行",
  },
  {
    ch: "Chapter Four",
    title: "走過的每一段路",
    body: "這些年,我們一起去了好多好多地方。陌生的城市因為有彼此陪伴,平凡都變成了",
    em: "不平凡。",
    side: "left",
    img: "/wedding/images/story-4-travels.jpg",
    cap: "everywhere, together",
    alt: "一起去過的各種地方",
  },
  {
    ch: "Chapter Five",
    title: "宜蘭南山上的驚喜",
    body: "山嵐繚繞的帳篷外,綿綿細雨。那一刻他單膝跪下,而她只來得及說出",
    em: "「我願意」",
    body2: "三個字,眼淚就先掉了下來。",
    side: "right",
    img: "/wedding/images/story-5-alishan-proposal.jpg",
    cap: "the proposal",
    alt: "宜蘭南山驚喜求婚",
  },
  {
    ch: "Chapter Six",
    title: "笑到肚子痛的日常",
    body: "沒有什麼特別的理由,就是一句無聊的玩笑,就能笑得",
    em: "東倒西歪。",
    body2: "這大概就是最喜歡的,平凡的幸福。",
    side: "left",
    img: "/wedding/images/story-6-laughing.jpg",
    cap: "just us, laughing",
    alt: "笑嘻嘻的日常",
  },
  {
    ch: "Chapter Seven",
    title: "敬我們，敬餘生",
    body: "愛是日常，但這一天想把它變得不一樣。現在,",
    em: "誠摯得邀請您的到來",
    body2: ",來見證我們攜手說出「我願意」的這一天。",
    side: "right",
    img: "/wedding/images/story-7-today.jpg",
    cap: "cheers to us !",
    alt: "婚禮邀請",
  },
];

const TILTS = [-3.2, 2.4, -1.8, 3.0, -2.2, 2.8, -1.5];
const STACK_GAP = 28;
const ENTER_LEN = 1.0;
const DWELL_LEN = 0.7;
const RELEASE_DWELL = 0.16;

function buildSegs(n) {
  const segs = [];
  let p = 0,
    cp = 0;
  for (let i = 0; i < n; i++) {
    segs.push({ s: p, e: p + ENTER_LEN, cpS: cp, cpE: cp + 1 });
    p += ENTER_LEN;
    cp += 1;
    if (i < n - 1) {
      segs.push({ s: p, e: p + DWELL_LEN, cpS: cp, cpE: cp });
      p += DWELL_LEN;
    }
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

function easeOut(t) {
  return 1 - Math.pow(1 - t, 2.2);
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export default function Story() {
  const trackRef = useRef(null);
  const cardRefs = useRef([]);
  const txtRefs = useRef([]);
  const dotRefs = useRef([]);
  const N = CHAPTERS.length;
  const { segs, totalU } = buildSegs(N);
  const settlePoints = segs.filter((s) => s.cpS === s.cpE).map((s) => s.s);
  settlePoints.push(totalU);

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
      const eff = clamp(p / (1 - RELEASE_DWELL), 0, 1);
      const cardP = rawToCardP(eff, segs, totalU, N);

      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        if (cardP < i) {
          card.style.opacity = "0";
          card.style.transform = `translate(-50%, 120vh) rotate(0deg)`;
          card.style.zIndex = String(i + 1);
          return;
        }
        card.style.opacity = "1";
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
        let op = 0,
          dxFactor = 0;
        if (j === activeIdx) {
          op = clamp((localActive - 0.45) / 0.45, 0, 1);
          dxFactor = 1 - op;
        } else if (j === activeIdx - 1) {
          op = clamp(1 - (localActive - 0.4) / 0.5, 0, 1);
        }
        const on = op > 0.02;
        t.classList.toggle("on", on);
        t.style.opacity = op.toFixed(3);
        if (on) {
          const isLeft = t.classList.contains("left");
          const dx = (isLeft ? -12 : 12) * dxFactor;
          t.style.transform = `translate(${dx}px, -50%)`;
        } else {
          t.style.transform = "";
        }
      });

      dotRefs.current.forEach((d, j) => {
        if (d) d.classList.toggle("on", j === activeIdx);
      });
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section className="w-story w-section">
      <div
        className="w-story-track"
        ref={trackRef}
        style={{ "--story-track-h": `${N * 192}vh` }}
      >
        {settlePoints.map((u, i) => (
          <i
            key={i}
            className="w-snap"
            style={{
              top: `calc(${(u / totalU).toFixed(4)} * ${(1 - RELEASE_DWELL).toFixed(2)} * (var(--story-track-h) - 100vh))`,
            }}
          />
        ))}
        <div className="w-story-sticky">
          <h2 className="w-story-bigtitle">our story</h2>

          {CHAPTERS.map((c, i) => (
            <div
              key={i}
              className={`w-txt ${c.side}`}
              ref={(el) => {
                txtRefs.current[i] = el;
              }}
            >
              <h3>
                <span className="ch">{c.ch}</span>
                {c.title}
              </h3>
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
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
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
              <b
                key={i}
                ref={(el) => {
                  dotRefs.current[i] = el;
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
