"use client";

import Link from "next/link";

interface FeatureCard {
  icon: string;
  tag: string;
  title: string;
  description: string;
  lawBasis: string;
}

const FEATURES: FeatureCard[] = [
  {
    icon: "💰",
    tag: "Wypłata i budżet",
    title: "Zasiłek macierzyński: 100% / 70% czy 81,5%?",
    description:
      "Porównajcie wariant uśredniony 81,5% za cały okres z opcją 100% na starcie (pierwsze 20 tygodni) i 70% później. Sprawdźcie, ile zyskacie i jak rozłoży się budżet.",
    lawBasis: "Art. 31 ustawy zasiłkowej",
  },
  {
    icon: "👨‍👧",
    tag: "Dyrektywa work-life balance",
    title: "9 tygodni rodzicielskiego tylko dla drugiego rodzica",
    description:
      "Nieprzenoszalna część urlopu rodzicielskiego (płatna 70% podstawy) przysługuje wyłącznie tacie. Jeśli jej nie wykorzysta, tygodnie bezpowrotnie przepadają.",
    lawBasis: "Art. 182¹a § 4 Kodeksu pracy",
  },
  {
    icon: "🗓️",
    tag: "Tylko dla taty",
    title: "Urlop ojcowski (14 dni) i nowe dni opiekuńcze",
    description:
      "2 tygodnie 100% płatnego urlopu ojcowskiego (do 1. roku życia dziecka), a także 5 dni urlopu opiekuńczego i 2 dni zwolnienia z powodu siły wyższej.",
    lawBasis: "Art. 182³ oraz 173¹ Kodeksu pracy",
  },
  {
    icon: "📋",
    tag: "Terminy i płatnik",
    title: "Gotowy harmonogram i lista wniosków",
    description:
      "Kiedy złożyć długi wniosek (do 21 dni po porodzie)? Kto wypłaca świadczenie — pracodawca czy bezpośrednio ZUS? System przygotuje dla Was przejrzysty kalendarz formalności.",
    lawBasis: "Art. 30a ustawy zasiłkowej",
  },
];

interface Step {
  num: string;
  title: string;
  desc: string;
}

const STEPS: Step[] = [
  {
    num: "01",
    title: "Rozłóżcie karty w 5 rundach",
    desc: "Przejdźcie drogę od ciąży i porodu, przez pierwszy miesiąc i pierwszy rok, aż po wiek przedszkolny. W każdej rundzie wybierzcie kartę pasującą do Waszych planów.",
  },
  {
    num: "02",
    title: "Zobaczcie wpływ na żywo",
    desc: "Nasz symulator na bieżąco wylicza comiesięczne wpływy na konto, podział opieki między mamą i tatą oraz poziom formalności — bez urzędniczego żargonu.",
  },
  {
    num: "03",
    title: "Wdróżcie gotowy plan w życie",
    desc: "Zapisany plan możecie przenieść jednym kliknięciem do szczegółowego kalkulatora z oficjalną podstawą prawną lub wygenerować gotowy wykaz dokumentów do ZUS.",
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
    <section className="landing-features-container" aria-label="Dlaczego warto skorzystać z OtwarteKarty">
      {/* 4 Feature Value Proposition Cards */}
      <div className="landing-section-intro">
        <span className="eyebrow">Wiedza w pigułce</span>
        <h2 className="landing-section-title">Co odkryjecie w grze OtwarteKarty?</h2>
        <p className="landing-section-desc">
          Złożone przepisy prawa pracy i ubezpieczeń społecznych przekształciliśmy w przejrzyste,
          intuicyjne decyzje, które pomogą Wam świadomie zaplanować pierwsze lata rodzicielstwa.
        </p>
      </div>

      <div className="landing-features-grid">
        {FEATURES.map((item) => (
          <article key={item.title} className="landing-feature-card">
            <div className="feature-icon-badge" aria-hidden="true">
              {item.icon}
            </div>
            <span className="feature-tag">{item.tag}</span>
            <h3 className="feature-title">{item.title}</h3>
            <p className="feature-desc">{item.description}</p>
            <div className="feature-law-pill">
              <span className="feature-law-dot" aria-hidden="true" />
              <span>{item.lawBasis}</span>
            </div>
          </article>
        ))}
      </div>

      {/* 3-Step Guide */}
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
            Gotowi, by sprawdzić optymalny wariant dla Waszej rodziny?
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
