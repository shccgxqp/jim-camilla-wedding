import { useEffect, useRef, useState } from 'react';

const ITEMS = [
  { src: '/wedding/images/gallery-1-registration.jpg', alt: '大安户政事務所登記', lbl: '大安户政 · 登記日', cls: 'g1' },
  { src: '/wedding/images/gallery-2-certificate.jpg', alt: '結婚登記證書', lbl: '我們的登記證書', cls: 'g2' },
  { src: '/wedding/images/gallery-3-bouquet.jpg', alt: '捧花與戒指', lbl: '捧花 · 戒指', cls: 'g3' },
  { src: '/wedding/images/gallery-4-carry.jpg', alt: '公園裡的公主抱', lbl: '公園裡的公主抱', cls: 'g4' },
  { src: '/wedding/images/gallery-5-veil.jpg', alt: '樹下的頭紗', lbl: '樹下 · 頭紗', cls: 'g5' },
  { src: '/wedding/images/gallery-6-mirror.jpg', alt: 'Wedding Day 鏡中自拍', lbl: '鏡子裡的 Wedding Day', cls: 'g6' },
  { src: '/wedding/images/gallery-9-sunglasses.jpg', alt: '戴上墨鏡出發', lbl: '戴上墨鏡 · 出發', cls: 'g7' },
  { src: '/wedding/images/gallery-7-bear.jpg', alt: '大熊裝置藝術前比心', lbl: '比心 · 大熊', cls: 'g8' },
  { src: '/wedding/images/gallery-8-dino.jpg', alt: '恐龍溜滑梯前敬禮', lbl: '恐龍前 · 敬禮', cls: 'g9' },
  { src: '/wedding/images/gallery-10-dino2.jpg', alt: '恐龍前宣戰', lbl: '恐龍前 · 宣戰', cls: 'g10' },
  { src: '/wedding/images/gallery-11-dessert.jpg', alt: '旅途中的甜點時光', lbl: '旅途中 · 甜點時光', cls: 'g11' },
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
              key={item.src}
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
