import { useEffect, useCallback } from 'react';

export default function Lightbox({ src, onClose }) {
  const handleKey = useCallback((e) => { if (e.key === 'Escape') onClose(); }, [onClose]);
  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  if (!src) return null;
  return (
    <div className={`w-lightbox open`} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <button className="close" onClick={onClose}>CLOSE</button>
      <img src={src} alt="" />
    </div>
  );
}
