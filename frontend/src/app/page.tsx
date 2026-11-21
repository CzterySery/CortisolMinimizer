import { GameBoard } from "@/components/game/game-board";
import { getGamePreview } from "@/lib/game";

export default async function Home() {
  return <GameBoard preview={await getGamePreview()} />;
}
