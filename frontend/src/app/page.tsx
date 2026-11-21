import { PreviewGame } from "@/components/game/preview-game";
import { getGamePreview } from "@/lib/game";

export default function Home() {
  return <PreviewGame preview={getGamePreview()} />;
}
