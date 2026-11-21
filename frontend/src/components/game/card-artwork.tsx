// Stable illustrations belong to a decision, never its position in a shuffled hand.
const drawings: Record<string, string> = {
  "1A": "M12 20h40v34H12z M12 29h40 M22 14v12 M42 14v12 M25 41l5 5 10-12",
  "1B": "M32 16v-6 M15 22l-5-5 M49 22l5-5 M9 38h46 M18 38a14 14 0 0 1 28 0 M14 49h36 M23 56h18",
  "1C": "M32 51S8 37 11 24c3-12 17-12 21-2 4-10 18-10 21 2 3 13-21 27-21 27 M17 33h9l4-8 5 16 4-8h8",
  "1D": "M11 47h42 M16 47V28h32v19 M22 28V16h20v12 M28 20h8 M32 16v8 M22 38h20",
  "1E": "M17 9h23l9 9v37H17z M40 9v11h9 M23 29h10 M23 36h18 M23 44l5 4 11-10",
  "1F": "M10 30l22-18 22 18 M16 27v27h32V27 M27 54V39h10v15 M25 27h14",
  "2A": "M18 26a7 7 0 1 0 0-14 7 7 0 0 0 0 14 M46 26a7 7 0 1 0 0-14 7 7 0 0 0 0 14 M8 52V37q10-14 20 0 M56 52V37q-10-14-20 0 M25 50q7-18 14 0z",
  "2B": "M10 18h44v36H10z M10 28h44 M21 12v12 M43 12v12 M16 35h14v12H16z M36 41h12 M42 35v12",
  "2C": "M32 54a22 22 0 1 0-20-31 M10 12v13h13 M32 18v15l10 6 M26 53h12",
  "2D": "M12 30h40v23H12z M21 30V18h22v12 M32 35v12 M26 41h12 M26 18v-6h12v6",
  "2E": "M14 53V25h36v28 M22 25V13h20v12 M32 30v13 M25 36h14 M22 53V44h20v9",
  "2F": "M10 32l22-20 22 20 M17 29v25h30V29 M32 45s-12-7-9-13q4-6 9 0 5-6 9 0c3 6-9 13-9 13",
  "3A": "M14 53V37h9v16 M28 53V28h9v25 M42 53V17h9v36 M13 27l30-16 M35 10h10v10",
  "3B": "M10 50h44 M14 40h8V24h-8z M28 40h8V24h-8z M42 40h8V24h-8z M10 16h44",
  "3C": "M10 22h39l-9-9 M54 42H15l9 9 M18 33a5 5 0 1 0 0-10 M46 31a5 5 0 1 0 0 10",
  "3D": "M10 21h18l6 6h20v26H10z M15 21v-9h27v15 M24 40l6 6 12-13",
  "3E": "M32 9l8 6 10 1 1 11 5 8-7 8-3 10-14-2-14 2-3-10-7-8 5-8 1-11 10-1z M22 33l7 7 14-16",
  "3F": "M14 11h28v20 M14 11v43h28V43 M25 35h28l-9-9 M53 35l-9 9 M21 20h14",
  "4A": "M15 20h34l-7-7 M49 44H15l7 7 M16 35a6 6 0 1 0 0-12 6 6 0 0 0 0 12 M48 41a6 6 0 1 0 0-12 6 6 0 0 0 0 12",
  "4B": "M22 27a8 8 0 1 0 0-16 8 8 0 0 0 0 16 M42 27a8 8 0 1 0 0-16 8 8 0 0 0 0 16 M8 53V42q14-17 28 0v11 M28 53V42q14-17 28 0v11",
  "4C": "M9 20h46v29H9z M9 40h46 M25 49v6 M39 49v6 M21 55h22 M25 29h14 M32 23v12",
  "4D": "M16 11h32v43H16z M23 11v10h18V11 M23 32h18 M23 41h9 M43 45l11 6-11 6",
  "4E": "M32 10a22 22 0 1 1-21 16 M8 13v14h14 M24 34l6 7 15-18",
  "4F": "M32 27a8 8 0 1 0 0-16 8 8 0 0 0 0 16 M14 54V42q18-19 36 0v12 M24 44h16 M32 36v16",
  "5A": "M10 54V25l22-14 22 14v29 M21 54V34h22v20 M27 21h10 M27 46h10 M32 41v10",
  "5B": "M10 18h19v34H10z M35 18h19v34H35z M16 12v12 M23 12v12 M41 12v12 M48 12v12 M14 33h11 M39 40h11",
  "5C": "M12 50h10V40h10V30h10V20h12 M14 23q8-14 22-6 M31 10l7 7-7 7",
  "5D": "M32 26a7 7 0 1 0 0-14 7 7 0 0 0 0 14 M15 53V40q17-17 34 0v13 M24 42h16 M32 34v16",
  "5E": "M12 24h40v30H12z M22 24V14h20v10 M32 31v16 M24 39h16 M18 54v3 M46 54v3",
  "5F": "M11 21h37l-8-8 M53 43H16l8 8 M24 28h16v8H24z M32 24v16",
};

export function CardArtwork({ id, compact = false }: { id: string; compact?: boolean }) {
  const letter = Math.max(0, id.charCodeAt(1) - 65);
  const tone = ["sage", "ochre", "rose", "sky", "lilac", "clay"][letter % 6];
  return <div className={`card-artwork artwork-${tone} artwork-shape-${letter % 3} ${compact ? "artwork-compact" : ""}`} aria-hidden="true">
    <span className="artwork-orbit" /><span className="artwork-spark" />
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={drawings[id] ?? drawings["1F"]} />
    </svg>
  </div>;
}
