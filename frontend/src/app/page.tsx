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
        <PreviewGame preview={getGamePreview()} />
      </section>
    </div>
  );
}
