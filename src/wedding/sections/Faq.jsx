import { useEffect, useRef } from 'react';

const FAQS = [
  { q: 'Dress code 是什麼?', a: <><em>Cocktail / Garden Tea。</em>就是看起來像有梳頭髮但不至於要進總統府的程度。請避免全白(那是新娘的工作)、純黑(我們不是去殯儀館)。米色、奶油、暖色調我們最開心。</>, open: true },
  { q: '可以帶小朋友嗎?', a: '當然可以,只要他們可以安靜的吃掉一整盤前菜。如果擔心會哭鬧,我們也準備了一個「兒童休息室」(裡面只有一張椅子和一個 iPad,但效果通常不錯)。' },
  { q: '可以帶 +1 嗎?', a: '如果邀請函上有寫,答案是「請務必」。如果沒有寫,答案是「我們愛你,但桌位有上限」。如果不確定,RSVP 表單上會告訴你。' },
  { q: '紅包?', a: <><span>你的出席就是最好的禮物(真的)。但如果你堅持,我們有準備一張</span><em>蜜月基金</em><span>的 QR code 在現場 — 我們想去冰島看極光,順便逃離婆媳關係。</span></> },
  { q: '會有開放式酒吧嗎?', a: <>會。包含香檳塔、白酒、紅酒、調酒兩款(<em>Jim&apos;s Old Fashioned</em> &amp; <em>Camilla&apos;s Spritz</em>)。請理性飲酒 — 但記得我們有準備代駕車。</> },
  { q: '會拍照嗎?可以拍照嗎?', a: <>儀式中請放下手機(攝影師會很傷心)。儀式後請<em>盡情拍</em>並 tag #JimMeetsCamilla,我們會在蜜月時無聊地一張一張按愛心。</> },
  { q: '會有麥克風時間嗎?', a: <>會的,但限時三分鐘,而且我們會找一位<em>很嚴格</em>的計時員(他就是新郎的弟弟)。請事先擬稿,不要即興 — 上次有人即興,新娘哭了 40 分鐘。</> },
];

export default function Faq() {
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
    <section id="faq" className="w-section w-faq-section" ref={sectionRef}>
      <div className="w-container">
        <div className="w-section-head w-fade">
          <span className="w-kicker">Frequently Asked</span>
          <h2>FAQ</h2>
          <p className="sub">不要不好意思問 · 我們已經被問過幾百次了</p>
          <div className="w-rule-line"><span className="orn">❦</span></div>
        </div>
        <div className="w-faq-list w-fade">
          {FAQS.map(({ q, a, open }) => (
            <details key={q} className="w-faq" open={open || undefined}>
              <summary>{q}</summary>
              <div className="a">{a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
