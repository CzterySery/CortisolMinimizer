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
          <p className="eyebrow">Symulator decyzji rodzicielskich</p>
          <h2 className="game-section-title">Rozłóż karty i stwórz Wasz plan rodziny</h2>
          <p className="game-section-desc">
            Wybierz 1 z 3 kart w każdej z 5 rund. Każda decyzja wpływa na podział opieki,
            wysokość świadczeń i wiedzę formalną.
          </p>
        </div>
        <PreviewGame preview={getGamePreview()} />
      </section>
    </div>
  );
}
