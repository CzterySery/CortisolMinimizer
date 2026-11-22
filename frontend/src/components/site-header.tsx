import Link from "next/link";

const nav = [
  ["/", "Strona główna"],
  ["/calculator", "Kalkulator zasiłku"],
  ["/cases", "Sprawdź sprawę"],
  ["/applications", "Twoje dokumenty"],
  ["/help", "Asystent AI"],
  ["/me", "Moje dane"],
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="chapter-brand" href="/" aria-label="Otwarte Karty — strona główna"><em>Otwarte Karty</em></Link>
      <nav className="site-nav" aria-label="Główna nawigacja">
        {nav.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
      </nav>
    </header>
  );
}
