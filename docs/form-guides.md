# OtwarteKarty — demo pól dokumentów

## Zakres

Podgląd wykorzystuje sześć publicznych formularzy pobranych bezpośrednio z ZUS, sprawdzonych 2026-11-21: ZAM, Z-15, ZAS-53, ZNp-7, Z-3 i Z-3a. Obejmuje wszystkie 40 stron (także pouczenia) i 706 pól AcroForm. Nie korzysta ze skanów spraw uczestników, OCR ani AI.

Oryginalne bajty PDF są zachowane w `frontend/public/forms/<id>/original.pdf`. Każda strona ma obraz do wyświetlania w przeglądarce, a pola mają współrzędne procentowe wyprowadzone z rzeczywistych prostokątów widgetów. Obraz nie jest odtworzonym ręcznie wzorem. Nakładka nie modyfikuje oryginalnego PDF-u. W bibliotece jest podglądem edukacyjnym. Od 2026-11-22 w podglądzie otwartym z edytora konkretnego wniosku poprawione pola pozostają w szkicu po zamknięciu okna i są wysyłane jako `official_fields` razem z symulacją. To nie jest generator wypełnionego oficjalnego PDF-u ani pełny walidator wszystkich przesłanek i załączników.

Podgląd treści wysyłanej symulacji pokazuje dane ogólne oraz rzeczywiste wartości pól. Backend sprawdza identyfikator dokumentu (formularz, rodzic, odbiorca, okres), obie daty, zgodność okresu na druku, dozwolone identyfikatory pól, typ zaznaczeń i zakaz wypełniania części płatnika. Polska data z jedno- lub dwucyfrowym dniem jest akceptowana. Wysłana treść jest zapisywana w istniejącym JSON-ie potwierdzenia; konto zwraca ją wraz z dokładnymi datami, a strona pokazuje „Treść złożonych symulacji”. Anonimowe potwierdzenia zachowują się w sesji przeglądarki; zalogowane wracają z konta. Starszy zapis jest dopasowywany do okresu tylko wtedy, gdy zawiera obie poprawne daty. Sam formularz i rodzic nie odhaczają już innych okresów. Nie ma migracji ani rzeczywistej wysyłki do urzędu.

Wnioski urlopowe do pracodawcy mają autorski przykład pisma z polami danych, adresata, okresu, oświadczeń/załączników i podpisu oraz cytatami prawnymi. Są opisane jako przykład, ponieważ nie istnieje jeden obowiązkowy formularz ZUS dla pisma do pracodawcy. Dla e-ZLA jest instrukcja roli lekarza, a dla odpisu USC — przekierowanie do właściwej usługi. Dla pozycji bez objętego biblioteką PDF nie udajemy oficjalnego druku: pokazujemy przykład treści lub instrukcję.

## Źródła i wersje

[zus-form-sources.json](../shared/zus-form-sources.json) przechowuje linki stron wydawcy i bezpośrednie linki pobranych PDF-ów, symbol, rolę wystawcy, wersję i datę sprawdzenia. [zus-form-layouts.json](../shared/zus-form-layouts.json) zawiera SHA-256 oryginałów i obrazów, teksty stron, nazwy/typy/prostokąty pól i ich opisy.

ZUS wskazuje Z-15 jako następcę Z-15A i Z-15B od 2026-10-24: [strona formularza](https://www.zus.pl/-/oswiadczenie-zus-z-15). W silniku planu pozostaje starsza nazwa Z-15A; demo jawnie wyjaśnia alias i wyświetla aktualny Z-15. Zmiana nazewnictwa w historii i ocena terminów zastosowania wzorów wymaga osobnego przeglądu; podgląd nie podmienia danych historycznych w bazie.

## Kontrola opisów

Same opisy techniczne PDF-ów nie zawsze odpowiadają wydrukowanym etykietom. W pobranej wersji wykryto i sprawdzono wizualnie:

- Z-15, strona 2: zamienione opisy nazwiska i stopnia pokrewieństwa;
- ZAM, strona 5: pięć opisów powielonych z innych sekcji — oświadczenie dotyczące ojcowskiego i informacja o urlopie drugiego rodzica.

[zus-form-label-corrections.json](../shared/zus-form-label-corrections.json) zapisuje siedem poprawek z konkretną sumą kontrolną PDF-u i pełną oryginalną nazwą pola. Generator odmówi automatycznego zastosowania poprawki do zmienionego źródła. Podgląd oznacza poprawione opisy, zachowując oryginalny tooltip do audytu. Pozostałe instrukcje pochodzą z metadanych wydawcy; układ i podpisy są stale widoczne na obrazie oryginału. Nie stwierdzamy, że każda instrukcja obejmuje wszystkie indywidualne sytuacje prawne.

## Dane z planu i role

Podpowiedzi okresów korzystają wyłącznie z jawnie powiązanych pól: ZAM dla odpowiedniego rodzaju urlopu, ZAS-53 dla okresu zwolnienia oraz Z-15 dla okresu opieki. [Powiązania okresów](../shared/zus-form-period-bindings.json) sprawdzają pełną natywną nazwę widgetu, jego typ tekstowy i opis — nie indeks pola w kolejności eksportu. Walidacja wykryła początkowe przesunięcie indeksu do sąsiedniej kratki ZAM; poprawiono je, a test sprawdza, że checkbox nie otrzymuje daty. Nie wpisujemy okresu macierzyńskiego do pola rodzicielskiego. Nie zgadujemy PESEL-u, rachunku, adresu, danych dziecka ani odpowiedzi w oświadczeniach.

Z-3 i Z-3a są przeglądem dla rodzica — pola uzupełnia płatnik. Część I ZNp-7 (strony 1–2) wypełnia wnioskodawca, część II (strony 3–4) płatnik. Formularze wystawiane przez lekarza/płatnika nie mają już w UI przycisku samodzielnej wysyłki przez rodzica.

Przegląd stron, wybór pola, zmiana powiększenia oraz zamknięcie Escape są dostępne także na telefonie i klawiaturze. Źródłowe PDF-y ZUS pozostają dostępne do pobrania; pełne wypełnianie i walidacja oryginału odbywają się poza tym demem.

## Utrzymanie

Narzędzia autorskie (nie zależności aplikacji): `pip install -r scripts/requirements-forms.txt`. Generator [prepare_zus_forms.py](../scripts/prepare_zus_forms.py) pobiera tylko allowlistę domeny ZUS, zachowuje TLS, limit rozmiaru i źródła. Na macOS pobieranie korzysta z systemowego `curl`, ponieważ lokalna biblioteka certyfikatów Pythona nie ufała łańcuchowi pośrednika. Do ponownego przetworzenia istniejących plików wystarczy uruchomienie bez flag; `--download` pobiera źródła ponownie, a `--check` działa offline.

Przed `dev/build` [check-zus-forms.mjs](../scripts/check-zus-forms.mjs) weryfikuje sumy PDF-ów i stron, poprawki, prostokąty i powiązania okresów. Build kontenera nie pobiera formularzy z sieci ani nie potrzebuje Pythona/PyMuPDF. Nową wersję źródła trzeba sprawdzić przed zmianą korekt i powiązań.
