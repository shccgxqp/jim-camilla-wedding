import { useEffect, useState } from 'react';

export default function useWeddingMedia(collection) {
  const [media, setMedia] = useState([]);

  useEffect(() => {
    let active = true;
    fetch(`/api/wedding-media/${encodeURIComponent(collection)}`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : { media: [] }))
      .then((data) => { if (active) setMedia(data.media || []); })
      .catch(() => { if (active) setMedia([]); });
    return () => { active = false; };
  }, [collection]);

  return media;
}
