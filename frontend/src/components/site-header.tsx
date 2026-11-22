"use client";

import Link from "next/link";
import { useState } from "react";

const nav = [
  ["/", "Strona główna"],
  ["/help", "Asystent AI"],
  ["/calculator", "Kalkulator zasiłku"],
  ["/cases", "Sprawdź sprawę"],
  ["/me", "Moje dane"],
] as const;

export function SiteHeader() {
  // The header persists across client navigations, so links close the menu themselves.
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header" onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}>
      <Link className="chapter-brand" href="/" aria-label="Otwarte Karty — strona główna" onClick={() => setOpen(false)}><em>Otwarte Karty</em></Link>
      <button type="button" className="menu-toggle" aria-label="Menu" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen((o) => !o)}>
        <span aria-hidden="true" />
      </button>
      <nav id="site-nav" className="site-nav" data-open={open} aria-label="Główna nawigacja">
        {nav.map(([href, label]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}
      </nav>
    </header>
  );
}
