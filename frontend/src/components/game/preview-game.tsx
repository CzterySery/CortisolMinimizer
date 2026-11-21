"use client";

import { useState } from "react";
import type { Card, GamePreview } from "@/types/game";
import { GameBoard } from "./game-board";

// Backend-free walk through the card catalog: no stats, no session, refresh resets. The real game is /game/[id].
export function PreviewGame({ preview }: { preview: GamePreview }) {
  const [played, setPlayed] = useState<Card[]>([]);
  const round = preview.rounds[played.length];

  return (
    <GameBoard
      mode="preview"
      stages={preview.rounds}
      currentRound={round ? round.id : null}
      totalRounds={preview.total_rounds}
      handSize={preview.hand_size}
      statistics={preview.statistics}
      played={played}
      hand={round?.cards ?? []}
      onPlay={(cardId) => {
        const card = round?.cards.find((item) => item.id === cardId);
        // drop and click can both fire for one card: accept only the first play of this round
        if (card) setPlayed((previous) => (previous.length === played.length ? [...previous, card] : previous));
      }}
      onReset={() => setPlayed([])}
    />
  );
}
