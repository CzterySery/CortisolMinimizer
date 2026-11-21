import Link from "next/link";

const nav = [
  ["/", "Gra"],
  ["/calculator", "Kalkulator"],
  ["/cases", "Sprawdź sprawę"],
  ["/applications", "Wnioski"],
  ["/help", "Pomoc"],
  ["/me", "Moje dane"],
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Zasiłkowy Poker — strona główna"><span className="brand-mark" aria-hidden="true">z<span>.</span></span><span>Zasiłkowy Poker<small>Małe decyzje. Wasza przyszłość.</small></span></Link>
      <nav className="site-nav" aria-label="Główna nawigacja">
        {nav.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
      </nav>
    </header>
  );
}
