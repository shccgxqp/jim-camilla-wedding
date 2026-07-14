const RIBBON = (
  <svg className="wv2-ribbon" viewBox="0 0 120 60" fill="none" aria-hidden="true">
    <path
      d="M4 4 C 24 4, 24 24, 44 24 C 64 24, 64 4, 84 4 C 104 4, 104 24, 116 20"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
    />
  </svg>
);

const STORY_COPY =
  '相戀快12年了，是彼此的初戀，對最純的那種，中間沒有吵架鬧分手過，因為認識他我才知道原來被一個人呵護後，是可以這麼安心與踏實的存在。在他的世界裡，我一直被溫柔對待，也被認真珍惜，我們不需要什麼昂貴的禮物，打卡式的約會，而是很小但重要，每天晚上的抱抱晚安，手牽手的約會，不嫌辛苦的幫我準備午餐便當，下雨天一手撐傘另一隻手護著我的肩，這份被穩穩接住的幸福，讓我更確定未來想一直走下去的人是他。';

export default function PromiseV2() {
  return (
    <section className="wv2-promise">
      <div className="wv2-promise-photo">
        <img src="/wedding/images/gallery-4-carry.jpg" alt="Jim 與 Camilla" />
      </div>
      <div className="wv2-promise-copy">
        {RIBBON}
        <h2>A Promise<br />For Life</h2>
        <p>{STORY_COPY}</p>
      </div>
    </section>
  );
}
