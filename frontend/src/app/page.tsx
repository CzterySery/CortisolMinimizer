import { PreviewGame } from "@/components/game/preview-game";
import { ScrollHero3D } from "@/components/landing/scroll-hero-3d";
import { getGamePreview } from "@/lib/game";

export default function Home() {
  return (
    <>
      <ScrollHero3D />
      <div id="gra-otwartekarty" className="home-game-anchor">
        <PreviewGame preview={getGamePreview()} />
      </div>
    </>
  );
}
