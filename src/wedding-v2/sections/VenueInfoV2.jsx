const GIFT = (
  <svg className="wv2-info-gift" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <rect x="8" y="20" width="32" height="20" rx="1" stroke="currentColor" strokeWidth="1.4" />
    <rect x="8" y="20" width="32" height="7" stroke="currentColor" strokeWidth="1.4" />
    <path d="M24 20 V40 M24 20 C 18 20 15 15 18 12 C 21 9 24 14 24 20 Z M24 20 C 30 20 33 15 30 12 C 27 9 24 14 24 20 Z" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

const GUEST_COPY =
  '今日所邀，皆是我們人生裡最想並肩同行的人。感謝你們願意撥出這個中午，陪我們把日子過成故事。您的到來，就是這場婚禮最好的禮物。';

const ROWS = [
  { en: 'Wedding Time', zh: '婚禮時間', value: '2026 年 11 月 7 日・中午 12:00' },
  {
    en: 'Wedding Address',
    zh: '婚禮地點',
    value: (
      <>
        <span className="wv2-venue-name">翡麗詩莊園</span>
        <span className="wv2-venue-address">台北市松山區敦化北路 232 號</span>
        <a
          className="wv2-map-link"
          href="https://www.google.com/maps/place/%E7%BF%A1%E9%BA%97%E8%A9%A9%E8%8E%8A%E5%9C%92+/+Chateau+de+Felicite/@25.0595259,121.5486954,17.5z/data=!4m5!3m4!1s0x0:0xc1084ecde0b886db!8m2!3d25.0593069!4d121.549087"
          target="_blank"
          rel="noreferrer"
        >
          開啟地圖 ↗
        </a>
      </>
    ),
  },
  { en: 'Wedding Dresscode', zh: '婚禮穿著', value: '敬請以舒適、適合中午婚宴的服裝為主' },
  {
    en: 'Transportation',
    zh: '交通資訊',
    value: (
      <details className="wv2-transport-details">
        <summary>松山機場站 3 號出口步行約 7 分鐘；提供代客泊車與周邊停車場</summary>
        <div className="wv2-transport-content">
          <p><strong>代客泊車</strong>200 元／次，停滿為限。</p>
          <p><strong>停車</strong>Times 24h（步行 2 分鐘／130 公尺）；民有市場地下停車場（步行 5 分鐘／400 公尺）。</p>
          <p><strong>捷運</strong>松山機場站 3 號出口（7 分鐘）；中山國中站（8 分鐘）；南京復興站 7 號出口（12 分鐘）。</p>
          <p><strong>公車</strong>民生敦化路口步行 2 分鐘；長庚醫院步行 5 分鐘；民權敦化路口步行 6 分鐘。</p>
        </div>
      </details>
    ),
  },
];

export default function VenueInfoV2() {
  return (
    <section className="wv2-info">
      <div className="wv2-info-grid">
        <div className="wv2-info-guest">
          <p>{GUEST_COPY}</p>
          {GIFT}
          <div className="tag">[ 婚禮邀請函 ]</div>
        </div>
        <div className="wv2-info-table">
          <dl>
            {ROWS.map((r) => (
              <div className="wv2-info-row" key={r.en}>
                <dt><span>{r.zh}</span><span className="en">{r.en}</span></dt>
                <dd>{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
