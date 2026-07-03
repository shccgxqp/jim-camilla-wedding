import { useEffect, useState } from 'react';

export default function WeddingNav({ onRsvp }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 40); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function scrollTo(id) {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  const links = [
    { label: 'Story', id: 'story' },
    { label: 'Gallery', id: 'gallery' },
    { label: 'Venue', id: 'venue' },
    { label: 'FAQ', id: 'faq' },
  ];

  return (
    <>
      <nav className={`w-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="left">
          <span className="issue">Issue Nº 01</span>
          <span className="vol">Vol. MMXXVI</span>
        </div>
        <div className="mid">Jim &amp; Camilla</div>
        <div className="right">
          {links.map(({ label, id }) => (
            <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); scrollTo(id); }}>
              {label}
            </a>
          ))}
          <a href="/photo-booth/" className="booth-link">Photo Booth</a>
          <button className="rsvp-btn" onClick={onRsvp}>R.S.V.P.</button>
        </div>
        <button
          className={`hamburger${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="選單"
        >
          <span /><span /><span />
        </button>
      </nav>

      <div className={`w-nav-drawer${menuOpen ? ' open' : ''}`}>
        {links.map(({ label, id }) => (
          <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); scrollTo(id); }}>
            {label}
          </a>
        ))}
        <a href="/photo-booth/">Photo Booth</a>
        <button onClick={() => { setMenuOpen(false); onRsvp(); }}>R.S.V.P.</button>
      </div>
    </>
  );
}
