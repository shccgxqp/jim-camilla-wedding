import FeatureQuickLinks from '../../components/FeatureQuickLinks.jsx';
import useWeddingMedia from '../../wedding/useWeddingMedia.js';

const DOVES = (
  <svg className="wv2-closing-dove" viewBox="0 0 100 50" fill="none" aria-hidden="true">
    <path
      d="M10 30 C 18 14, 32 14, 38 26 C 44 14, 58 14, 66 26"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <path
      d="M62 30 C 70 14, 84 14, 90 26"
      stroke="currentColor"
      strokeWidth="1.6"
    />
  </svg>
);

export default function ClosingV2() {
  const photos = useWeddingMedia('site-top');
  return (
    <section className="wv2-closing">
      {DOVES}
      <h2>We Can't Wait</h2>
      <p className="sub">to hear from you</p>
      <div className="wv2-closing-photo">
        {photos[2]?.url && <img src={photos[2].url} alt={photos[2].caption || '緊握彼此的手與捧花'} />}
      </div>
      <FeatureQuickLinks tone="dark" />
    </section>
  );
}
