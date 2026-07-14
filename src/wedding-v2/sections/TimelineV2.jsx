// 草稿時間，待確認：依 12:30–15:00 午宴推算的細項流程
const EVENTS = [
  { time: '11:30 AM', label: '迎賓簽到' },
  { time: '12:00 PM', label: '證婚儀式' },
  { time: '12:30 PM', label: '午宴開席' },
  { time: '2:30 PM', label: '甜點時光 · 拋捧花' },
];

export default function TimelineV2() {
  return (
    <section className="wv2-timeline">
      <div className="wv2-timeline-grid">
        <div className="wv2-timeline-head">
          <h2>The Day's
            <br />Events</h2>
          <div className="date">NOVEMBER 7, 2026</div>
        </div>
        <div className="wv2-timeline-list">
          <dl>
            {EVENTS.map((e) => (
              <div className="wv2-timeline-row" key={e.time}>
                <dt>{e.time}</dt>
                <dd>{e.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
