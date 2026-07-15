import FeatureQuickLinks from '../../components/FeatureQuickLinks.jsx';

const LEAF = (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M10 2 Q 16 8, 10 18 Q 4 8, 10 2 Z" fill="currentColor"/>
    <path d="M10 4 L 10 16" stroke="rgba(0,0,0,.15)" strokeWidth=".5"/>
  </svg>
);

export default function Footer() {
  return (
    <footer className="w-footer">
      <div className="glyph">{LEAF} J &amp; C {LEAF}</div>
      <p>於 2026 年 11 月 7 日 · 翡麗詩莊園 · 不見不散</p>
      <div className="sig">Made with love · See you there</div>
      <FeatureQuickLinks />
    </footer>
  );
}
