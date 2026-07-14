import { useApp } from "../context/AppContext.jsx";

export default function TopBar() {
  const { config } = useApp();
  return (
    <section className="top-bar" aria-label="Wedding photobooth">
      <div>
        <div className="top-bar-tagline">{config.tagline}</div>
        <div className="top-bar-names">{config.coupleName}</div>
      </div>
      <div className="top-bar-actions">
        <a className="gallery-quick-link" href="/photo-booth/gallery">照片管理</a>
        <div className="date-pill">{config.weddingDate}</div>
      </div>
    </section>
  );
}
