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

const STORY_COPY = [
  '人生中的第一段感情 也是最後一段',
  '愛情從來不是轟轟烈烈，而是在平凡的日子裡\n依然願意陪伴彼此 理解彼此\n12年一路走來，有快樂回憶，也有差點忍不住想開扁對方的心情(?',
  '但我們總能放下脾氣 逗笑另一方\n今年是很精彩的一年\n我們一起探索未知的世界，偶而重複無聊的日常\n卻因為身邊是彼此，連最普通的事都變得特別',
  '讓我們在手牽手一起走過下一個12年',
];

export default function Promise() {
  const photos = useWeddingMedia('site-top');
  return (
    <section className="wv2-promise">
      <div className="wv2-promise-photo">
        {photos[1]?.url && <img src={photos[1].url} alt={photos[1].caption || 'Jim 與 Camilla'} />}
      </div>
      <div className="wv2-promise-copy">
        {RIBBON}
        <h2>A Promise<br />For Life</h2>
        <div className="wv2-promise-story">
          {STORY_COPY.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </div>
    </section>
  );
}
import useWeddingMedia from '../useWeddingMedia.js';
