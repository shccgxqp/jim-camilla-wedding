import { useEffect, useRef } from 'react';

export default function Venue() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
      { threshold: 0.12 }
    );
    sectionRef.current?.querySelectorAll('.w-fade').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="venue" className="w-section" ref={sectionRef}>
      <div className="w-container">
        <div className="w-section-head w-fade">
          <span className="w-kicker">The Place</span>
          <h2>地點與交通</h2>
          <p className="sub">有冷氣 · 有甜點 · 有停車場 · 步行 5 分到捷運</p>
          <div className="w-rule-line"><span className="orn">❦</span></div>
        </div>
        <div className="w-venue-grid w-fade">
          <div className="w-venue-map">
            <svg viewBox="0 0 500 400" preserveAspectRatio="xMidYMid slice">
              <defs>
                <pattern id="wgrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M40 0 L0 0 0 40" fill="none" stroke="rgba(122,90,38,.18)" strokeWidth=".5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#wgrid)"/>
              <path d="M250 0 L 250 400" stroke="rgba(122,90,38,.4)" strokeWidth="18" fill="none"/>
              <path d="M250 0 L 250 400" stroke="rgba(255,250,236,.5)" strokeWidth="1" fill="none" strokeDasharray="6 8"/>
              <text x="262" y="56" fontFamily="Cormorant Garamond" fontStyle="italic" fontSize="13" fill="#6e521f">敦化北路</text>
              <path d="M0 130 L 500 140" stroke="rgba(122,90,38,.32)" strokeWidth="12" fill="none"/>
              <text x="40" y="124" fontFamily="Cormorant Garamond" fontStyle="italic" fontSize="12" fill="#6e521f">民生東路</text>
              <path d="M0 280 L 500 270" stroke="rgba(122,90,38,.32)" strokeWidth="10" fill="none"/>
              <text x="380" y="296" fontFamily="Cormorant Garamond" fontStyle="italic" fontSize="12" fill="#6e521f">民權東路</text>
              <path d="M380 0 L 380 400" stroke="rgba(122,90,38,.2)" strokeWidth="5" fill="none"/>
              <path d="M120 0 L 120 400" stroke="rgba(122,90,38,.2)" strokeWidth="5" fill="none"/>
              <rect x="60" y="310" width="100" height="70" rx="6" fill="rgba(122,150,50,.22)"/>
              <text x="76" y="350" fontFamily="Cormorant Garamond" fontStyle="italic" fontSize="13" fill="#6e521f">敦北公園</text>
              <g transform="translate(250,90)">
                <circle cx="0" cy="0" r="42" fill="rgba(200,165,103,.22)"/>
                <circle cx="0" cy="0" r="22" fill="#c8a567" stroke="#1a1813" strokeWidth="1.5"/>
                <circle cx="0" cy="0" r="8" fill="#f7f2e8"/>
                <text x="0" y="-52" textAnchor="middle" fontFamily="Playfair Display" fontStyle="italic" fontSize="20" fill="#1a1813">翡麗詩莊園</text>
                <text x="0" y="-36" textAnchor="middle" fontFamily="DM Mono" fontSize="9" letterSpacing="2" fill="#8a6a30">LE CIEL · 天翼廳</text>
              </g>
              <g transform="translate(250,360)">
                <circle r="9" fill="#1a1813"/>
                <circle r="4" fill="#f7f2e8"/>
                <text x="14" y="4" fontFamily="Cormorant Garamond" fontStyle="italic" fontSize="13" fill="#1a1813">捷運南京復興 7 號出口</text>
              </g>
              <g transform="translate(450,52)">
                <circle r="20" fill="rgba(247,242,232,.85)" stroke="rgba(122,90,38,.5)"/>
                <path d="M0 -14 L 4 0 L 0 14 L -4 0 Z" fill="#8a6a30"/>
                <text x="0" y="-24" textAnchor="middle" fontSize="10" fill="#6e521f" fontFamily="DM Mono" letterSpacing="1">N</text>
              </g>
            </svg>
            <a className="open-map" href="https://maps.app.goo.gl/HDP6SMh3Dde81yBT9" target="_blank" rel="noopener">
              在 Google 地圖開啟 ↗
            </a>
          </div>
          <div className="w-venue-info">
            <span className="en">The Venue</span>
            <h3>翡麗詩莊園</h3>
            <p className="addr">
              天翼廳 Le Ciel<br />
              <a href="https://maps.app.goo.gl/HDP6SMh3Dde81yBT9" target="_blank" rel="noopener">
                105 台北市松山區民有里敦化北路 232 號
              </a>
            </p>
            <dl>
              {[
                { dt: '抵達時間', dd: '11:30 入席', sm: '請務必準時 · 我們會等你 · 但拉麵不會' },
                { dt: '儀式', dd: '12:00 開始', sm: '大約 25 分鐘 · 含一場可控制長度的演講' },
                { dt: '午宴', dd: '12:30 – 15:00', sm: '共九道菜 · 包含一道彩蛋甜點 · 香檳塔開放' },
                { dt: '停車', dd: '免費 B2 車位', sm: '飯店前提供代客泊車 · 報「J&C 婚禮」' },
                { dt: '捷運', dd: '南京復興 7 號出口', sm: '步行約 5 分鐘 · 沿敦化北路往北' },
              ].map(({ dt, dd, sm }) => (
                <div key={dt} className="w-venue-row">
                  <dt>{dt}</dt>
                  <dd>{dd}<small>{sm}</small></dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
