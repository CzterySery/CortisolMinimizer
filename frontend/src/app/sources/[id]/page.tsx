import { readFile } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import manifest from "../../../../../Documents/legal/manifest.json";

export function generateStaticParams() { return manifest.map(({ id }) => ({ id })); }
export const dynamicParams = false;

export default async function SourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const source = manifest.find((item) => item.id === id);
  if (!source) notFound();
  const text = await readFile(path.join(process.cwd(), "public/legal", `${source.id}.md`), "utf8");
  const sections = [...text.matchAll(/<a id="([^"]+)"><\/a>([\s\S]*?)(?=<a id="|$)/g)];
  const extension = source.pdf_pages ? "pdf" : "docx";
  return <main className="page legal-page">
    <PageHeader eyebrow="Biblioteka źródeł · materiały ZUS" title={source.title}>
      Transkrypcja dostarczonego dokumentu. Numer strony odnosi się do pliku PDF; indeksy górne mogą być zapisane w jednym wierszu.
    </PageHeader>
    <div className="actions"><a className="button" href={`/legal/${source.id}.${extension}`} target="_blank" rel="noreferrer">Otwórz oryginalny dokument ↗</a><Link className="button" href="/">Wróć do talii</Link></div>
    {sections.map(([ , anchor, body]) => <section key={anchor} id={anchor} className="legal-section">
      <pre>{body.replace(/^## /gm, "").trim()}</pre>
    </section>)}
  </main>;
}
