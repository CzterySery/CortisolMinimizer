import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zasiłkowy Poker — plan na nowy rozdział",
  description: "Pięć etapów, trzy karty i Wasz rodzinny plan. Podgląd gry edukacyjnej.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pl"><body>{children}</body></html>;
}
