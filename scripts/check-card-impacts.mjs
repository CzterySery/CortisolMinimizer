// Structural/source checks accompany, but do not replace, the documented legal review.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = async (name) => JSON.parse(await readFile(path.join(root, name), "utf8"));
const [audit, deck, legal] = await Promise.all([read("shared/card-impacts.json"), read("shared/deck-design.json"), read("shared/legal-rules.json")]);
const ids = deck.cards.map((card) => card.id).sort();
assert.deepEqual(audit.cards.map((card) => card.id).sort(), ids);
assert.equal(new Set(ids).size, 30);
const rules = new Set(legal.rules.map((rule) => rule.id));
for (const card of audit.cards) {
  for (const direction of [card.money, card.time]) assert.ok(["up", "down", "same", "depends"].includes(direction));
  for (const field of ["comparison", "period", "money_label", "money_reason", "time_label", "time_reason", "later"]) assert.ok(card[field]?.length > 5, card.id + " " + field);
  assert.ok(card.rule_ids.length > 0);
  for (const rule of card.rule_ids) assert.ok(rules.has(rule), card.id + " missing source " + rule);
}
for (const id of ["1A", "2B", "2C", "4C", "4D", "5C"]) assert.equal(audit.cards.find((card) => card.id === id).time, "down", id + " must not grant present free time");
for (const id of ["1F", "3D", "3E"]) {
  const card = audit.cards.find((item) => item.id === id);
  assert.equal(card.money, "same", id + " must not invent income");
  assert.equal(card.time, "same", id + " must not invent leave");
}
const directions = { up: "wzrost", down: "spadek", same: "bez zmiany", depends: "zależne od danych" };
const lines = ["# Audyt wpływu 30 kart na pieniądze i czas", "",
  "Przejrzano warunki, efekty i źródła każdej karty. Kierunek dotyczy wskazanego porównania po spełnieniu warunków prawnych, nie dowolnej rodziny. To audyt porównań jakościowych, nie certyfikacja kalkulatora ani opinia prawna. Dane audytu: [card-impacts.json](../shared/card-impacts.json).", "",
  "## Najważniejsze korekty", "",
  "- Odłożony urlop nie jest czasem wolnym teraz. Większy dochód z pracy wymaga, aby wynagrodzenie rzeczywiście przewyższało odpowiedni zasiłek.",
  "- Procent podstawy świadczenia nie jest procentem pensji netto. Bez historii i podstaw nie obiecujemy konkretnego wzrostu lub spadku dochodu.",
  "- Dokumenty, rezerwacje i potwierdzenie dodatkowej puli nie tworzą automatycznie bieżącej wypłaty ani dni wolnych.",
  "- Nie utożsamiamy e-ZLA lub rehabilitacji ze zdolnością do opieki. Złożenie wniosku nie jest przyznaniem świadczenia.",
  "- Wspólne urlopy dają więcej wspólnego czasu w konkretnym bloku, ale zużywają pulę obojga i mogą skrócić pokryty kalendarz. Dzień zapewnionej opieki nie jest liczony dwa razy.",
  "- Praca podczas rodzicielskiego oznacza mniej wolnych godzin teraz, nawet jeśli prawidłowo obliczony okres urlopu jest dłuższy.",
  "- Szczęście w UI jest równoważnym bilansem kierunków pieniędzy i czasu. Niepewność jednego wejścia pozostaje niepewnością wyniku. Nie jest miarą zdrowia ani punktem z ustawy.", "",
  "## Źródła i zakres", "",
  "Podstawą są dostarczone [akty i dokumenty](../Documents/legal/README.md) z [rejestrem dokładnych cytatów](../Documents/legal/rules.md). Dodatkowe sprawdzenie: [wysokość świadczenia — ZUS](https://www.zus.pl/pl/swiadczenia/zasilki/zasilek-macierzynski/wysokosc), [łączenie pracy i urlopu — PIP](https://www.pip.gov.pl/dla-pracodawcow/pytania-i-odpowiedzi/czy-pracownik-moze-laczyc-urlop-rodzicielski-z-wykonywaniem-pracy). Materiały mają różne daty: pierwszeństwo ma właściwy dla zdarzenia przepis. Podwyższenia, podatki i podstawy mogą zmieniać ostateczną różnicę wypłaty.", "",
  "Wskaźnik czasu w tym podglądzie opisuje dostępność rodzica w wskazanej alternatywie, nie obliczoną sumę dni opieki rodziny. Każda karta ma własny okres porównania. Nie wolno sumować tych znaków jak dni albo kwot ani traktować wysokości pasków jako rankingu całego planu. Bieżące i przyszłe skutki opisano osobno.", ""];
for (const card of audit.cards) {
  const title = deck.cards.find((item) => item.id === card.id).title;
  lines.push("## " + card.id + " · " + title, "", "**Porównanie:** " + card.comparison, "", "**Okres:** " + card.period + ".", "",
    "**Pieniądze — " + directions[card.money] + ":** " + card.money_reason, "",
    "**Czas — " + directions[card.time] + ":** " + card.time_reason, "", "**Później:** " + card.later, "",
    "**Podstawy:** " + card.rule_ids.map((id) => "[" + id + "](../Documents/legal/rules.md#" + id + ")").join(", ") + ".", "");
}
const document = lines.join("\n");
const target = path.join(root, "docs/card-impact-audit.md");
if (process.argv.includes("--write")) await writeFile(target, document);
else assert.equal(await readFile(target, "utf8"), document, "Regenerate audit with --write");
console.log("Checked 30 comparisons, present/future separation and all legal rule references.");
