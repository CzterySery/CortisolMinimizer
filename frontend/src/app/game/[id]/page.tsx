"use client";

import { useParams } from "next/navigation";
import { useGame } from "@/hooks/use-game";
import { ApiResult } from "@/components/api-result";
import { ComboToast } from "@/components/game/combo-toast";
import { GameBoard } from "@/components/game/game-board";

// Server-driven game: the backend deals, validates, computes stats and scores; the board only renders.
export default function GamePage() {
  const { id } = useParams<{ id: string }>();
  const { state, preview, lastPlay, error, previewCard, playCard } = useGame(id);

  if (!state) return <main className="page"><ApiResult error={error} /></main>;
  return (
    <>
      <GameBoard
        mode="game"
        stages={state.stages}
        currentRound={state.finished ? null : state.current_round}
        totalRounds={state.total_rounds}
        handSize={state.hand_size}
        statistics={state.statistics}
        projected={preview?.statistics}
        played={state.table}
        hand={state.hand}
        onPlay={playCard}
        onFocusCard={previewCard}
        summaryHref={`/game/${id}/summary`}
      />
      {preview && preview.new_issues.length > 0 && (
        <ul className="board-issues" aria-live="polite">{preview.new_issues.map((x) => <li key={x.code}>{x.text}</li>)}</ul>
      )}
      {error ? <ApiResult error={error} /> : null}
      <ComboToast combos={lastPlay?.combos ?? []} />
    </>
  );
}
