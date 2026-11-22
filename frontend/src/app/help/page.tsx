import { PageHeader } from "@/components/page-header";
import { HelpChat } from "@/components/help/home-help";

export default function HelpPage() {
  return (
    <main className="page">
      <PageHeader eyebrow="Pomoc prawna" title="Asystent" accent="AI.">
        Zadaj pytanie o urlopy rodzicielskie, zasiłki, formularze ZUS lub składki.
      </PageHeader>
      <HelpChat />
    </main>
  );
}
