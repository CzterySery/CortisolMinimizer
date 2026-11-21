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
      <Link className="chapter-brand" href="/" aria-label="Nowy rozdział. Wasze zasady. — strona główna"><span>Nowy rozdział. <em>Wasze zasady.</em></span></Link>
      <nav className="site-nav" aria-label="Główna nawigacja">
        {nav.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
      </nav>
    </header>
  );
}
