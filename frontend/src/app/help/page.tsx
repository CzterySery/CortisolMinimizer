import { PageHeader } from "@/components/page-header";
import { HelpChat } from "@/components/help/home-help";

export default function HelpPage() {
  return (
    <main className="page">
      <PageHeader title="Asystent AI">
        Wyszukiwarka odpowiedzi w przepisach ZUS i Kodeksu pracy z odnośnikami do dokumentów źródłowych.
      </PageHeader>
      <HelpChat />
    </main>
  );
}
