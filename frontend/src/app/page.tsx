import { PreviewGame } from "@/components/game/preview-game";
import { LandingHero } from "@/components/landing/scroll-hero-3d";
import { LandingFeatures } from "@/components/landing/landing-features";
import { getGamePreview } from "@/lib/game";

export default function Home() {
  return (
    <div className="landing-page-wrapper">
      <LandingHero />
      <LandingFeatures />
      <section id="gra-otwartekarty" className="home-game-anchor" aria-label="Interaktywna gra OtwarteKarty">
        <div className="game-section-header">
          <p className="eyebrow">Interaktywne drzewo decyzji ZUS</p>
          <h2 className="game-section-title">Rozłóż karty i stwórz Wasz plan rodziny</h2>
          <p className="game-section-desc">
            W każdym z 5 kroków wybierz 1 z 3 wykluczających się opcji dopasowanych do Waszej sytuacji
            i priorytetów (czas z dzieckiem, maksymalny budżet lub równowaga).
          </p>
        </div>
        <PreviewGame preview={getGamePreview()} />
      </section>
    </div>
  );
}
