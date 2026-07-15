const EVENTS = [
  { time: '11:30 AM', label: '迎賓簽到' },
  { time: '12:00 PM', label: '開席' },
  { time: '1:30PM', label: '敬酒' },
  { time: '14:30 PM', label: '送客' },
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
