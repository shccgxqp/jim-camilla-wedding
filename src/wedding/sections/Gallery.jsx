import { useEffect, useRef, useState } from 'react';

const ITEMS = [
  { src: '/wedding/images/gallery-1-kyoto.jpg', alt: '2019 京都的雨', lbl: '2019 · 京都的雨', cls: 'g1' },
  { src: '/wedding/images/gallery-2-beach.jpg', alt: '2020 海邊', lbl: '2020 · 海邊', cls: 'g2' },
  { src: '/wedding/images/gallery-3-engagement.jpg', alt: '訂婚那天', lbl: '訂婚那天', cls: 'g3' },
  { src: '/wedding/images/gallery-4-cats.jpg', alt: '三位董事', lbl: '三位董事', cls: 'g4' },
  { src: '/wedding/images/gallery-5-proposal.jpg', alt: '求婚當下', lbl: '求婚當下', cls: 'g5' },
  { src: '/wedding/images/gallery-6-champagne.jpg', alt: '香檳塔練習', lbl: '香檳塔練習', cls: 'g6' },
  { src: '/wedding/images/gallery-7-ring.jpg', alt: '戒指特寫', lbl: '戒指 · 特寫', cls: 'g7' },
  { src: '/wedding/images/gallery-8-rehearsal.jpg', alt: '彩排晚餐', lbl: '彩排晚餐', cls: 'g8' },
];

export default function Gallery({ onLightbox }) {
  const sectionRef = useRef(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
      { threshold: 0.12 }
    );
    sectionRef.current?.querySelectorAll('.w-fade').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="gallery" className="w-gallery" ref={sectionRef}>
      <div className="w-container">
        <div className="w-section-head w-fade">
          <span className="w-kicker">Souvenirs</span>
          <h2>相片牆</h2>
          <p className="sub">為了寫這幾行字 · 我們翻了 4,217 張照片</p>
          <div className="w-rule-line"><span className="orn">❀</span></div>
        </div>
        <div className="w-bot-grid">
          {ITEMS.map((item) => (
            <div
              key={item.cls}
              className={`item ${item.cls} w-fade`}
              onClick={() => onLightbox(item.src)}
            >
              <img alt={item.alt} src={item.src} />
              <div className="lbl">{item.lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
