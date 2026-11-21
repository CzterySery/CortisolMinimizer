"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type S } from "@/lib/api";

// The server owns the game (deals, validation, scoring). This hook mirrors GameState and keeps UI-only bits.
export function useGame(id: string) {
  const [state, setState] = useState<S["GameState"]>();
  const [preview, setPreview] = useState<S["CardPreview"]>();
  const [lastPlay, setLastPlay] = useState<Omit<S["PlayResult"], "state">>();
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    api.GET("/api/v1/game/{game_id}", { params: { path: { game_id: id } } })
      .then(({ data, error }) => (error ? setError(error) : setState(data)));
  }, [id]);

  const previewCard = useCallback(async (card_id: string) => {
    if (preview?.card_id === card_id) return; // pointer re-entering the same card
    const { data } = await api.POST("/api/v1/game/{game_id}/preview", {
      params: { path: { game_id: id } }, body: { card_id },
    });
    setPreview(data);
  }, [id, preview?.card_id]);

  const playCard = useCallback(async (card_id: string) => {
    const { data, error } = await api.POST("/api/v1/game/{game_id}/play", {
      params: { path: { game_id: id } }, body: { card_id },
    });
    if (error) return setError(error);
    const { state, ...play } = data;
    setState(state);
    setLastPlay(play);
    setPreview(undefined);
  }, [id]);

  return { state, preview, lastPlay, error, previewCard, playCard };
}
