import { useState } from 'react';
import './shared.css';
import './wedding.css';
import Story from './sections/Story.jsx';
import Gallery from './sections/Gallery.jsx';
import Lightbox from './components/Lightbox.jsx';
import Cover from './sections/Cover.jsx';
import Promise from './sections/Promise.jsx';
import Countdown from './sections/Countdown.jsx';
import VenueInfo from './sections/VenueInfo.jsx';
import Timeline from './sections/Timeline.jsx';
import Closing from './sections/Closing.jsx';

export default function WeddingSite() {
  const [lightboxSrc, setLightboxSrc] = useState(null);

  return (
    <div className="wedding-v2">
      <Cover />
      <Promise />
      <Story />
      <Countdown />
      <VenueInfo />
      <Timeline />
      <Gallery onLightbox={setLightboxSrc} />
      <Closing />
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
