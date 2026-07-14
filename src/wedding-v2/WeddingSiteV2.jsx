import { useState } from 'react';
import '../wedding/wedding.css';
import './wedding-v2.css';
import Story from '../wedding/sections/Story.jsx';
import Gallery from '../wedding/sections/Gallery.jsx';
import Lightbox from '../wedding/modals/Lightbox.jsx';
import CoverV2 from './sections/CoverV2.jsx';
import PromiseV2 from './sections/PromiseV2.jsx';
import VenueInfoV2 from './sections/VenueInfoV2.jsx';
import TimelineV2 from './sections/TimelineV2.jsx';
import ClosingV2 from './sections/ClosingV2.jsx';

export default function WeddingSiteV2() {
  const [lightboxSrc, setLightboxSrc] = useState(null);

  return (
    <div className="wedding-v2">
      <CoverV2 />
      <PromiseV2 />
      <Story />
      <VenueInfoV2 />
      <TimelineV2 />
      <Gallery onLightbox={setLightboxSrc} />
      <ClosingV2 />
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
