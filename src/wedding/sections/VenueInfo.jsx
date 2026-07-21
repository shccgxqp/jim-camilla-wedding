const GUEST_LINES = [
  '今日所邀，皆是我們人生裡最想並肩同行的人。',
  '感謝你們願意撥出這個中午，陪我們把日子過成故事。',
  '您的到來，就是這場婚禮最好的禮物。',
];

const ROWS = [
  { en: 'Wedding Time', zh: '婚禮時間', value: '2026 年 11 月 7 日・中午 11:30 入席' },
  {
    en: 'Wedding Address',
    zh: '婚禮地點',
    value: (
      <>
        <span className="wv2-venue-name">翡麗詩莊園</span>
        <span className="wv2-venue-hall">2F 天翼廳（Le Ciel）</span>
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
  {
    en: 'Dress Code',
    zh: '著裝建議',
    value: (
      <div className="wv2-dress-code">
        <p>低飽和上衣／裙子　色系參考</p>
        <div className="wv2-dress-swatches" aria-label="白、藍、灰色系參考">
          <span className="wv2-dress-swatch is-white" title="暖白色" />
          <span className="wv2-dress-swatch is-blue" title="灰藍色" />
          <span className="wv2-dress-swatch is-gray" title="深灰色" />
        </div>
      </div>
    ),
  },
  {
    en: 'Transportation',
    zh: '交通資訊',
    value: (
      <details className="wv2-transport-details">
        <summary>捷運文湖線 松山機場站 3 號出口步行約 7 分鐘；提供代客泊車與周邊停車場（詳情請點開看更多）</summary>
        <div className="wv2-transport-content">
          <p><strong>代客泊車</strong>200 元／次 (已包含停車費)，停滿為限。</p>
          <p><strong>停車</strong>Times 24h（步行 2 分鐘／130 公尺）；民有市場地下停車場（步行 5 分鐘／400 公尺）。</p>
          <p><strong>捷運</strong>松山機場站 3 號出口（7 分鐘）；中山國中站（8 分鐘）；南京復興站 7 號出口（12 分鐘）。</p>
          <p><strong>公車</strong>民生敦化路口步行 2 分鐘；長庚醫院步行 5 分鐘；民權敦化路口步行 6 分鐘。</p>
        </div>
      </details>
    ),
  },
];

export default function VenueInfo() {
  return (
    <section className="wv2-info">
      <div className="wv2-info-grid">
        <div className="wv2-info-guest">
          <p>{GUEST_LINES.map((line) => <span className="wv2-guest-line" key={line}>{line}</span>)}</p>
          <img className="wv2-info-gift" src="/wedding/S__60874756.png" alt="禮物邀請函" />
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
