import { useEffect, useRef } from "react";

const FAQS = [
  {
    q: "婚禮有Dress code嗎?",
    a: "白、藍、灰色系通通都可以,輕鬆穿搭即可,不用太拘束。",
    open: true,
  },
  {
    q: "會場有提供停車場嗎?停車費如何折抵?",
    a: "會場有提供代客停車,手續費 200 元(不含停車費)。但現場空間較小,建議大家走路前往,或先在附近停車場停好車再過來。",
  },
  {
    q: "喝酒需要注意什麼?",
    a: "提請大家飲酒適量。若因飲酒過量嘔吐需要清潔費,將由各自「豪傑」自行付款喔。",
  },
];

export default function Faq() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12 },
    );
    sectionRef.current
      ?.querySelectorAll(".w-fade")
      .forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="faq" className="w-section w-faq-section" ref={sectionRef}>
      <div className="w-container">
        <div className="w-section-head w-fade">
          <span className="w-kicker">Frequently Asked</span>
          <h2>FAQ</h2>
          <p className="sub">不要不好意思問 · 我們已經被問過幾百次了</p>
          <div className="w-rule-line">
            <span className="orn">❦</span>
          </div>
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
