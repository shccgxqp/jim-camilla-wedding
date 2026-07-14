const GIFT = (
  <svg className="wv2-info-gift" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <rect x="8" y="20" width="32" height="20" rx="1" stroke="currentColor" strokeWidth="1.4" />
    <rect x="8" y="20" width="32" height="7" stroke="currentColor" strokeWidth="1.4" />
    <path d="M24 20 V40 M24 20 C 18 20 15 15 18 12 C 21 9 24 14 24 20 Z M24 20 C 30 20 33 15 30 12 C 27 9 24 14 24 20 Z" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

const GUEST_COPY =
  '今日所邀，皆是我們人生裡最想並肩同行的人。感謝你們願意撥出這個中午，陪我們把日子過成故事。您的到來，就是這場婚禮最好的禮物。';

// Venue details remain draft content until the couple confirms the final information.
const ROWS = [
  { en: 'Wedding Time', zh: '婚禮時間', value: '2026 年 11 月 7 日・中午 12:00' },
  { en: 'Wedding Address', zh: '婚禮地點', value: '婚宴場地資訊將於邀請函確認後公布' },
  { en: 'Wedding Dresscode', zh: '婚禮穿著', value: '敬請以舒適、適合中午婚宴的服裝為主' },
  { en: 'Transportation', zh: '交通資訊', value: '交通與停車資訊將於邀請函確認後公布' },
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
