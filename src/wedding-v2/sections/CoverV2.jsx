import useWeddingMedia from '../../wedding/useWeddingMedia.js';

export default function CoverV2() {
  const photos = useWeddingMedia('site-top');
  return (
    <header className="wv2-cover">
      {photos[0]?.url && <img className="wv2-cover-photo" src={photos[0].url} alt={photos[0].caption || 'Jim 與 Camilla'} />}
      <img className="wv2-cover-monogram" src="/wedding/images/cover-signature.png" alt="J &amp; C" />
      <div className="wv2-cover-title">
        <h1>Jim &amp; Camilla</h1>
        <p className="sub">2026.11.07</p>
      </div>
    </header>
  );
}
