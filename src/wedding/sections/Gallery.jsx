import { useEffect, useRef, useState } from 'react';

export default function Gallery({ onLightbox }) {
  const sectionRef = useRef(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
      { threshold: 0.12 }
    );
    sectionRef.current?.querySelectorAll('.w-fade:not(.in)').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items.length]);

  useEffect(() => {
    let active = true;
    fetch('/api/wedding-media/photo-wall', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : { media: [] }))
      .then((data) => {
        if (!active) return;
        setItems((data.media || []).filter((item) => item.content_type.startsWith('image/')).map((item, index) => ({
          src: item.url,
          alt: item.caption || item.filename,
          lbl: item.caption || '',
          cls: `g${(index % 11) + 1}`,
        })));
      })
      .catch(() => { if (active) setItems([]); });
    return () => { active = false; };
  }, []);

  return (
    <section id="gallery" className="w-gallery" ref={sectionRef}>
      <div className="w-container">
        <div className="w-section-head w-fade">
          <span className="w-kicker">Souvenirs</span>
          <h2>相片牆</h2>
          <p className="w-gallery-quote">finding you was like<br />coming home.</p>
          <div className="w-rule-line"><span className="orn">❀</span></div>
        </div>
        <div className="w-bot-grid" data-count={items.length}>
          {items.map((item) => (
            <div
              key={item.src}
              className={`item ${item.cls} w-fade in`}
              onClick={() => onLightbox(item.src)}
            >
              <img alt={item.alt} src={item.src} />
              <div className="lbl">{item.lbl}</div>
            </div>
          ))}
          {!items.length && <p className="w-gallery-empty">相片牆正在整理回憶。</p>}
        </div>
      </div>
    </section>
  );
}
