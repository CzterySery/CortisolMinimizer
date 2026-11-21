"use client";

import Link from "next/link";

interface Step {
  num: string;
  title: string;
  desc: string;
}

const STEPS: Step[] = [
  {
    num: "01",
    title: "Odpowiedz na 5 pytań za pomocą kart",
    desc: "W każdej z 5 rund wybierasz jedną z 3 wykluczających się kart, określając Waszą sytuację (narodziny, adopcja, rodzina zastępcza) oraz priorytety (czas z dzieckiem, maksymalny budżet lub równowaga).",
  },
  {
    num: "02",
    title: "Zobacz symulację czasu i budżetu",
    desc: "Drzewo decyzyjne na żywo dobiera kolejne opcje ZUS i przelicza wpływ Twoich wyborów na domowe finanse oraz liczbę dni opieki dla obojga rodziców.",
  },
  {
    num: "03",
    title: "Zgłęb temat i wdróż gotowy plan",
    desc: "Wybierz interesujące Cię zagadnienia z talii wiedzy prawnej, a cały scenariusz przenieś jednym kliknięciem do szczegółowego kalkulatora zasiłków i wniosków ZUS.",
  },
];

export function LandingFeatures() {
  function scrollToGame(e: React.MouseEvent) {
    e.preventDefault();
    const gameSection = document.getElementById("gra-otwartekarty");
    if (gameSection) {
      gameSection.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <section className="landing-features-container" aria-label="Prosta ścieżka — jak to działa">
      <div className="landing-steps-box">
        <div className="steps-header">
          <span className="eyebrow">Prosta ścieżka</span>
          <h2 className="steps-title">Jak to działa w 3 krokach?</h2>
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

        <div className="steps-cta-bar">
          <p className="steps-cta-text">
            Gotowi, by przejść drzewo decyzji i sprawdzić optymalny wariant dla Waszej rodziny?
          </p>
          <div className="steps-cta-buttons">
            <a href="#gra-otwartekarty" className="landing-cta-button primary-cta" onClick={scrollToGame}>
              <span>Rozpocznij grę poniżej</span>
              <span aria-hidden="true">↓</span>
            </a>
            <Link href="/calculator" className="landing-cta-button secondary-cta">
              <span>Szczegółowy kalkulator</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
