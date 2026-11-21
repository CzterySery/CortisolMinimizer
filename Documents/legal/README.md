# Źródła prawne kart

Ten katalog zawiera techniczne transkrypcje sześciu publicznych materiałów przekazanych przez ZUS oraz [rejestr reguł używanych w kartach](rules.md). [Projekt 30 kart](../../cards-30.md) odsyła do reguły, reguła do jednostki prawnej, a jednostka do oryginalnego pliku. Nie przetwarzamy tu przykładowych spraw uczestników.

| Dokument | Rodzaj | Nawigacja |
| --- | --- | --- |
| [Kodeks pracy](labour-code.md) | Wyciąg aktu prawnego | `#article-180`, `#article-1821a`, `#article-183` itd. |
| [Ustawa zasiłkowa](benefits-act.md) | Wyciąg aktu prawnego | `#article-30a`, `#article-31`, `#article-61` itd. |
| [Dokumenty do zasiłków](benefit-documents.md) | Rozporządzenie z 27.09.2026, Dz.U. 2026 poz. 1316 | `#section-13` itd. |
| [Wnioski o urlopy](leave-applications.md) | Rozporządzenie z 11.03.2025, Dz.U. 2025 poz. 322 | `#section-14`, `#section-15` itd. |
| [Poradnik rodziców](parents-guide.md) | Objaśnienia ZUS, stan prawny 01.04.2026 | `#page-38` itd.; strona PDF i drukowana różnią się |
| [Tabela świadczeń](benefits-table.md) | Załącznik pomocniczy DOCX | `#content`; komórki zostały odczytane kolejno, bez rekonstrukcji tabeli |

## Jak czytać odnośniki

Kotwica `article-1821a` odpowiada art. 182¹a, a nie art. 1821a bez indeksu. Kotwice zachowują techniczny zapis ekstrakcji; pełne oznaczenie prawne, z §, ustępem i punktem, znajduje się w rejestrze reguł. `section-15` oznacza § 15 danego rozporządzenia. `page-N` oznacza stronę pliku PDF liczoną od 1.

Transkrypcja zachowuje treść, przypisy i kolejność stron. Nie poprawiamy automatycznie spłaszczonych indeksów ani wyrazów dzielonych na końcu wiersza. Cytaty w rejestrze są porównywane z tekstem odpowiedniej jednostki po normalizacji odstępów i łączeniu wyrazów dzielonych przez PDF. Oryginał rozstrzyga przy wątpliwościach. Zmiana oryginału jest wykrywana przez SHA-256 w [manifeście](manifest.json).

## Wersje i ustalenia

- To odwzorowanie dostarczonego pakietu konkursowego, nie aktualizowany na bieżąco system informacji prawnej. Puste `effective_from` i `effective_to` w [rejestrze JSON](../../shared/legal-rules.json) oznaczają brak zatwierdzonego zakresu czasowego, nie obowiązywanie bez ograniczeń.
- Wyciąg ustawy zawiera również przepisy z przypisem o wejściu w życie 01.01.2027, m.in. art. 9 ust. 4 i art. 17 ust. 1d–1e. Nie wolno stosować ich automatycznie w 2026 r. Do produkcyjnego silnika potrzebna jest wersja reguł właściwa dla daty zdarzenia.
- Poradnik jest starszy od rozporządzenia o dokumentach. Nazwy formularzy i wymagania dokumentowe ustalamy na podstawie nowszego materiału. ZAM zastąpił ZAM/ZUR/ZAO od 24.10.2026; Z-3b wycofano. Potwierdza to [komunikat ZUS o uproszczeniach](https://bip.zus.pl/pl/web/guest/o-zus/aktualnosci/-/asset_publisher/aktualnosci/content/id/14583298).
- W § 13 ust. 2–4 nowszego rozporządzenia ZUS co do zasady pobiera akt urodzenia z rejestru na podstawie danych. Nie wymagamy od każdego rodzica automatycznie papierowego odpisu. Inny odbiorca lub wezwanie ZUS może oznaczać inny zestaw dokumentów.
- Art. 32–35 nie występują w przekazanym wyciągu ustawy. Karty opiekuńczego mają więc lokalne odnośniki do poradnika i dodatkowo zweryfikowane jednostki w [oficjalnym tekście Sejmu](https://api.sejm.gov.pl/eli/acts/DU/2026/854/text/U/D20260854Lj.pdf), strony PDF 19–22. Tekst ten pokazuje także przyszłe brzmienie art. 32 od 2028 r.; nie stosujemy go wcześniej.
- W tabeli pomocniczej są skróty mogące wprowadzać w błąd przy krótkim zatrudnieniu. Do obliczeń pierwszeństwo mają art. 36–38, 43, 48–50 i właściwe fakty, nie uproszczona tabela.
- Pełny tekst ustawy i rozporządzeń jest źródłem reguły; poradnik i tabela są pomocnicze. `checked_against_supplied_file` oznacza sprawdzony cytat i lokalizację, a nie audyt prawniczy.

## Odtworzenie

Z katalogu głównego, w wybranym środowisku Pythona:

```sh
pip install -r scripts/requirements-legal.txt
python scripts/extract_legal_sources.py
python scripts/build_deck_design.py
python scripts/build_deck_design.py --check
```

Skrypt ekstrakcji czyta wyłącznie katalog publicznych materiałów dla uczestników. Nie skanuje katalogów przykładowych spraw. Reguły i karty są autorskimi danymi w skrypcie budującym; wygenerowanych plików nie edytujemy ręcznie.
