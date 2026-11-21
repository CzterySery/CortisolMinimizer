"use client";

import { STRATEGIES } from "@/lib/decision-tree";

const STEPS = [
  {
    num: "01",
    title: "Określ sytuację rodziny",
    desc: "W pierwszym kroku wybierasz Waszą sytuację (narodziny dziecka, adopcja lub rodzina zastępcza), co dopasowuje kolejne pytania i przepisy ZUS.",
  },
  {
    num: "02",
    title: "Wybieraj karty według strategii",
    desc: "W kolejnych rundach każda karta jest oznaczona jedną z 3 strategii poniżej — wybierasz jedną kartę na rundę, budując swój plan.",
  },
  {
    num: "03",
    title: "Dopasuj kwoty w kalkulatorze",
    desc: "Po 5 krokach przenosisz ułożony scenariusz do kalkulatora, gdzie możesz wprowadzić ostatnie poprawki i obliczyć dokładne świadczenia ZUS.",
  },
];

export function LandingFeatures() {
  return (
    <section className="landing-features-container" aria-label="Jak to działa i strategie">
      <div className="landing-steps-box">
        <div className="steps-header">
          <span className="eyebrow">Jak to działa</span>
          <h2 className="steps-title">3 kroki i 3 strategie planowania</h2>
        </div>

        <div className="landing-steps-grid">
          {STEPS.map((s) => (
            <div key={s.num} className="landing-step-item">
              <div className="step-num">{s.num}</div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="steps-strategies-divider">
          <span className="eyebrow">Oznaczenia strategii na kartach (od 2. rundy)</span>
          <div className="strategies-upfront-grid">
            {STRATEGIES.map((s) => (
              <div key={s.id} className={`strategy-upfront-card strategy-upfront-${s.id}`}>
                <strong className="strategy-upfront-badge">{s.badge}</strong>
                <p className="strategy-upfront-desc">{s.shortDesc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
