import { useState, useEffect } from 'react';
import './wedding.css';
import WeddingNav from './WeddingNav.jsx';
import Hero from './sections/Hero.jsx';
import Countdown from './sections/Countdown.jsx';
import Story from './sections/Story.jsx';
import Gallery from './sections/Gallery.jsx';
import Venue from './sections/Venue.jsx';
import Faq from './sections/Faq.jsx';
import Footer from './sections/Footer.jsx';
import RsvpModal from './modals/RsvpModal.jsx';
import Lightbox from './modals/Lightbox.jsx';

export default function WeddingSite() {
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  useEffect(() => {
    document.body.style.background = '';
    document.body.style.color = '';
    return () => { document.body.style.background = ''; };
  }, []);

  return (
    <div className="wedding-site">
      <WeddingNav onRsvp={() => setRsvpOpen(true)} />
      <Hero />
      <Countdown />
      <Story />
      <Gallery onLightbox={setLightboxSrc} />
      <Venue />
      <Faq />
      <Footer />
      {rsvpOpen && <RsvpModal onClose={() => setRsvpOpen(false)} />}
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
