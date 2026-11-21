import { PreviewGame } from "@/components/game/preview-game";
import { getGamePreview } from "@/lib/game";

export default async function Home() {
  return <PreviewGame preview={await getGamePreview()} />;
}
