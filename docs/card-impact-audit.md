# Audyt wpływu 30 kart na pieniądze i czas

Przejrzano warunki, efekty i źródła każdej karty. Kierunek dotyczy wskazanego porównania po spełnieniu warunków prawnych, nie dowolnej rodziny. To audyt porównań jakościowych, nie certyfikacja kalkulatora ani opinia prawna. Dane audytu: [card-impacts.json](../shared/card-impacts.json).

## Najważniejsze korekty

- Odłożony urlop nie jest czasem wolnym teraz. Większy dochód z pracy wymaga, aby wynagrodzenie rzeczywiście przewyższało odpowiedni zasiłek.
- Procent podstawy świadczenia nie jest procentem pensji netto. Bez historii i podstaw nie obiecujemy konkretnego wzrostu lub spadku dochodu.
- Dokumenty, rezerwacje i potwierdzenie dodatkowej puli nie tworzą automatycznie bieżącej wypłaty ani dni wolnych.
- Nie utożsamiamy e-ZLA lub rehabilitacji ze zdolnością do opieki. Złożenie wniosku nie jest przyznaniem świadczenia.
- Wspólne urlopy dają więcej wspólnego czasu w konkretnym bloku, ale zużywają pulę obojga i mogą skrócić pokryty kalendarz. Dzień zapewnionej opieki nie jest liczony dwa razy.
- Praca podczas rodzicielskiego oznacza mniej wolnych godzin teraz, nawet jeśli prawidłowo obliczony okres urlopu jest dłuższy.
- Szczęście w UI jest równoważnym bilansem kierunków pieniędzy i czasu. Niepewność jednego wejścia pozostaje niepewnością wyniku. Nie jest miarą zdrowia ani punktem z ustawy.

## Źródła i zakres

Podstawą są dostarczone [akty i dokumenty](../Documents/legal/README.md) z [rejestrem dokładnych cytatów](../Documents/legal/rules.md). Dodatkowe sprawdzenie: [wysokość świadczenia — ZUS](https://www.zus.pl/pl/swiadczenia/zasilki/zasilek-macierzynski/wysokosc), [łączenie pracy i urlopu — PIP](https://www.pip.gov.pl/dla-pracodawcow/pytania-i-odpowiedzi/czy-pracownik-moze-laczyc-urlop-rodzicielski-z-wykonywaniem-pracy). Materiały mają różne daty: pierwszeństwo ma właściwy dla zdarzenia przepis. Podwyższenia, podatki i podstawy mogą zmieniać ostateczną różnicę wypłaty.

Wskaźnik czasu w tym podglądzie opisuje dostępność rodzica w wskazanej alternatywie, nie obliczoną sumę dni opieki rodziny. Każda karta ma własny okres porównania. Nie wolno sumować tych znaków jak dni albo kwot ani traktować wysokości pasków jako rankingu całego planu. Bieżące i przyszłe skutki opisano osobno.

## 1A · Macierzyński od narodzin

**Porównanie:** Praca do porodu zamiast rozpoczęcia macierzyńskiego przed porodem; matka jest zdolna do pracy.

**Okres:** Okres przed porodem.

**Pieniądze — zależne od danych:** Dochód zależy od aktualnej pensji, podstawy świadczenia i podatków. Samo pozostanie w pracy nie gwarantuje wyższej kwoty.

**Czas — spadek:** W porównaniu z rozpoczęciem urlopu matka nadal pracuje. Nie oznacza to utraty dni całej puli.

**Później:** Więcej macierzyńskiego pozostaje po porodzie; nie powstaje dodatkowa pula.

**Podstawy:** [maternity-pool](../Documents/legal/rules.md#maternity-pool), [prebirth](../Documents/legal/rules.md#prebirth), [standard-rates](../Documents/legal/rules.md#standard-rates), [base](../Documents/legal/rules.md#base).

## 1B · Chwila przed porodem

**Porównanie:** Rozpoczęcie macierzyńskiego przed porodem zamiast pracy w tych samych dniach.

**Okres:** Wybrane dni przed porodem.

**Pieniądze — zależne od danych:** Świadczenie zastępuje wynagrodzenie; jego podstawą nie jest automatycznie bieżąca pensja netto.

**Czas — wzrost:** W wybranych dniach matka nie pracuje. Te dni zużywają podstawową pulę macierzyńskiego.

**Później:** O tyle mniej macierzyńskiego pozostaje po porodzie. Zmiana faktycznej daty porodu wymaga przeliczenia.

**Podstawy:** [prebirth](../Documents/legal/rules.md#prebirth), [maternity-pool](../Documents/legal/rules.md#maternity-pool), [standard-rates](../Documents/legal/rules.md#standard-rates), [base](../Documents/legal/rules.md#base).

## 1C · Zdrowie na pierwszym miejscu

**Porównanie:** Rozliczenie istniejącej, potwierdzonej niezdolności do pracy; choroba nie jest wyborem gracza.

**Okres:** Okres z e-ZLA.

**Pieniądze — zależne od danych:** Sprawdza się ubezpieczenie, wyczekiwanie i wyjątki, wykorzystany okres oraz podział na wynagrodzenie chorobowe i zasiłek. Nie obiecujemy automatycznej wypłaty ani pełnej pensji netto.

**Czas — bez zmiany:** Karta dokumentuje istniejącą niezdolność. Nie tworzy dodatkowego wolnego ani dowodu zdolności do opieki nad dzieckiem.

**Później:** Okres zasiłkowy jest zużywany; chorobowe nie odejmuje dni macierzyńskiego.

**Podstawy:** [sick-right](../Documents/legal/rules.md#sick-right), [sick-money](../Documents/legal/rules.md#sick-money), [sick-docs](../Documents/legal/rules.md#sick-docs), [base](../Documents/legal/rules.md#base), [debt](../Documents/legal/rules.md#debt).

## 1D · Pomost rehabilitacyjny

**Porównanie:** Złożenie wniosku o rehabilitacyjne zamiast pozostawienia sprawy bez wniosku; decyzji jeszcze nie ma.

**Okres:** Etap wnioskowania.

**Pieniądze — bez zmiany:** Sam wniosek nie zwiększa potwierdzonego dochodu. Świadczenie można uwzględnić dopiero po przyznaniu, z właściwą waloryzacją podstawy.

**Czas — bez zmiany:** Dalsza niezdolność jest faktem medycznym; karta nie oznacza sprawności do osobistej opieki.

**Później:** Po przyznaniu możliwa wypłata za ustalony okres; sam złożony wniosek jej nie gwarantuje.

**Podstawy:** [rehab](../Documents/legal/rules.md#rehab), [base](../Documents/legal/rules.md#base), [debt](../Documents/legal/rules.md#debt).

## 1E · Dochód po likwidacji firmy

**Porównanie:** Przyznane szczególne świadczenie po kwalifikującej utracie pracy zamiast braku tego świadczenia i braku pensji z zakończonej pracy.

**Okres:** Uprawniony okres przed porodem.

**Pieniądze — wzrost:** W tym porównaniu należne, przyznane świadczenie daje dochód względem braku wypłaty. Przesłanki utraty zatrudnienia i prawo muszą być potwierdzone; nie dodajemy dawnej pensji.

**Czas — bez zmiany:** Świadczenie nie tworzy urlopu u byłego pracodawcy. Nie zmienia faktu wcześniejszego zakończenia zatrudnienia.

**Później:** Prawo po porodzie bada się w odrębnej sprawie; nie przedłuża się automatycznie tego świadczenia.

**Podstawy:** [job-loss-before](../Documents/legal/rules.md#job-loss-before), [job-loss-after](../Documents/legal/rules.md#job-loss-after), [payer](../Documents/legal/rules.md#payer), [base](../Documents/legal/rules.md#base).

## 1F · Przygotuj rodzinny start

**Porównanie:** Przygotowanie dokumentów i rezerwacji przed przyjęciem dziecka zamiast braku przygotowanego planu.

**Okres:** Przed przyjęciem dziecka.

**Pieniądze — bez zmiany:** Prognoza po przyszłym przyjęciu nie jest obecnym świadczeniem.

**Czas — bez zmiany:** Przygotowanie planu nie zwalnia jeszcze z pracy i nie zużywa dni urlopu.

**Później:** Uprawnienie zależy od faktycznego przyjęcia, właściwej ścieżki, wieku dziecka, wniosku i ubezpieczenia.

**Podstawy:** [adoption](../Documents/legal/rules.md#adoption), [insured-parent](../Documents/legal/rules.md#insured-parent), [base](../Documents/legal/rules.md#base).

## 2A · Razem na starcie

**Porównanie:** Cały ojcowski w wybranym wczesnym bloku zamiast pracy ojca w tym bloku.

**Okres:** Wybrany wczesny blok ojcowskiego.

**Pieniądze — zależne od danych:** Kwota zależy od podstawy ojca i jego wynagrodzenia. Stawka świadczenia nie jest gwarancją tej samej pensji netto.

**Czas — wzrost:** Ojciec nie pracuje w wykorzystanym bloku. Jeżeli matka też jest w domu, nie tworzy to drugiego dnia pokrycia tej samej potrzeby opieki.

**Później:** Cała pula ojcowskiego jest wykorzystana; nie pozostaje rezerwa na później.

**Podstawy:** [paternity](../Documents/legal/rules.md#paternity), [standard-rates](../Documents/legal/rules.md#standard-rates), [base](../Documents/legal/rules.md#base).

## 2B · Tydzień teraz, reszta później

**Porównanie:** Pierwsza część ojcowskiego teraz zamiast wykorzystania całej puli od razu.

**Okres:** Początek po narodzinach.

**Pieniądze — zależne od danych:** Za wykorzystane dni jest zasiłek, za pozostałe faktycznie przepracowane dni wynagrodzenie. Kierunek dochodu wymaga porównania tych kwot.

**Czas — spadek:** Ojciec ma teraz krótszy urlop niż przy wykorzystaniu całej puli. W dniach pozostawionych na później wraca do pracy.

**Później:** Pozostaje część ojcowskiego do wykorzystania w legalnym terminie; rezerwa nie jest jeszcze opieką ani wypłatą.

**Podstawy:** [paternity](../Documents/legal/rules.md#paternity), [standard-rates](../Documents/legal/rules.md#standard-rates), [base](../Documents/legal/rules.md#base).

## 2C · Ojcowski na później

**Porównanie:** Praca ojca i odłożenie całego ojcowskiego zamiast wykorzystania go we wczesnym bloku.

**Okres:** Wczesny okres po narodzinach.

**Pieniądze — zależne od danych:** Więcej pieniędzy będzie tylko wtedy, gdy dochód z pracy w porównywanych dniach przewyższa zasiłek. Bez podstawy i wynagrodzenia nie wyznaczamy znaku zmiany.

**Czas — spadek:** Ojciec pracuje zamiast korzystać z ojcowskiego. Opieka dziecka musi być obecnie zabezpieczona niezależnie od rezerwy.

**Później:** Pełna niewykorzystana pula może zapewnić czas później, jeżeli termin wykorzystania i wniosku zostanie zachowany.

**Podstawy:** [paternity](../Documents/legal/rules.md#paternity), [standard-rates](../Documents/legal/rules.md#standard-rates), [base](../Documents/legal/rules.md#base).

## 2D · Uzupełniający dla mamy

**Porównanie:** Uprawniony uzupełniający mamy zamiast jej powrotu do pracy po podstawowym macierzyńskim.

**Okres:** Blok bezpośrednio po macierzyńskim.

**Pieniądze — zależne od danych:** Świadczenie zastępuje pracę w tym bloku. Kierunek dochodu wobec wynagrodzenia zależy od indywidualnej podstawy.

**Czas — wzrost:** Dochodzi należny blok wolnego mamy, bez zużywania puli rodzicielskiego. Liczą się kwalifikujące pobyty szpitalne, a nie dowolna hospitalizacja.

**Później:** Kolejne bloki trzeba przesunąć i ponownie sprawdzić terminy; brak drugiego uzupełniającego dla taty za tę samą sprawę.

**Podstawy:** [supplementary](../Documents/legal/rules.md#supplementary), [standard-rates](../Documents/legal/rules.md#standard-rates), [base](../Documents/legal/rules.md#base).

## 2E · Uzupełniający dla taty

**Porównanie:** Uprawniony uzupełniający taty zamiast jego pracy po podstawowym macierzyńskim.

**Okres:** Blok bezpośrednio po macierzyńskim.

**Pieniądze — zależne od danych:** Zastępujemy pracę ojca zasiłkiem od jego podstawy. Nie zakładamy automatycznie powrotu mamy do pracy ani jej wynagrodzenia.

**Czas — wzrost:** Ojciec korzysta z należnego bloku. Wybór rodzica nie powiększa łącznego wymiaru uzupełniającego.

**Później:** Uprawnienie jest realizowane jednorazowo przez jednego rodzica; kolejne okresy muszą uwzględniać nowy kalendarz.

**Podstawy:** [supplementary](../Documents/legal/rules.md#supplementary), [standard-rates](../Documents/legal/rules.md#standard-rates), [insured-parent](../Documents/legal/rules.md#insured-parent), [base](../Documents/legal/rules.md#base).

## 2F · Witaj w rodzinie

**Porównanie:** Rzeczywisty uprawniony blok po przyjęciu dziecka zamiast pracy wybranego rodzica w tym okresie.

**Okres:** Blok po przyjęciu dziecka.

**Pieniądze — zależne od danych:** Kwotę ustala się z podstawy wybranego rodzica i właściwego wariantu; rezerwacja z wcześniejszej rundy nie była wypłatą.

**Czas — wzrost:** Powstaje faktyczny okres korzystania z uprawnienia. Dla niepracownika opisujemy okres świadczenia, nie urlop pracowniczy.

**Później:** Przyjęcie, postępowanie adopcyjne, piecza i granice wieku mają odrębne reguły; nie liczymy ich wszystkich od daty urodzenia.

**Podstawy:** [adoption](../Documents/legal/rules.md#adoption), [insured-parent](../Documents/legal/rules.md#insured-parent), [standard-rates](../Documents/legal/rules.md#standard-rates), [base](../Documents/legal/rules.md#base).

## 3A · Więcej na początku

**Porównanie:** Wariant podstawowy zamiast uśrednionego przy tych samych okresach i podstawie.

**Okres:** Okres podstawowego macierzyńskiego.

**Pieniądze — zależne od danych:** Stawka macierzyńskiego jest wyższa niż uśredniona, lecz ostateczna różnica wypłaty zależy też od podwyższenia niskiego zasiłku i rozliczeń. Nie gwarantujemy większej sumy za cały plan.

**Czas — bez zmiany:** Sam wybór wariantu wypłat nie zmienia długości urlopu.

**Później:** Za rodzicielski stawka podstawowa jest niższa od uśrednionej; porównanie sum wymaga tego samego horyzontu i rzeczywistego wykorzystania.

**Podstawy:** [standard-rates](../Documents/legal/rules.md#standard-rates), [averaged](../Documents/legal/rules.md#averaged), [floor](../Documents/legal/rules.md#floor), [base](../Documents/legal/rules.md#base).

## 3B · Równiej przez miesiące

**Porównanie:** Wariant uśredniony zamiast podstawowego przy tych samych okresach i podstawie.

**Okres:** Okres podstawowego macierzyńskiego.

**Pieniądze — zależne od danych:** Stawka macierzyńskiego jest niższa niż podstawowa. Nie oznacza to automatycznie mniejszej ostatecznej wypłaty przy podwyższeniu niskiego świadczenia ani wyższej sumy całego planu.

**Czas — bez zmiany:** Wniosek o wariant nie tworzy dodatkowej puli ani dni wolnych.

**Później:** Objęty wariantem rodzicielski ma inną stawkę; wyłączny blok drugiego rodzica rozlicza się odrębnie. Brak dnia rodzicielskiego w pierwszym roku może zmienić rozliczenie i wymagać wniosku o wyrównanie.

**Podstawy:** [averaged](../Documents/legal/rules.md#averaged), [exclusive-rate](../Documents/legal/rules.md#exclusive-rate), [top-up](../Documents/legal/rules.md#top-up), [floor](../Documents/legal/rules.md#floor), [base](../Documents/legal/rules.md#base).

## 3C · Zmiana warty

**Porównanie:** Przejęcie pozostałego macierzyńskiego przez tatę zamiast dalszego korzystania przez mamę.

**Okres:** Przekazywany blok po wymaganym okresie mamy.

**Pieniądze — zależne od danych:** Porównujemy pensję mamy i zasiłek taty z pensją taty i zasiłkiem mamy. Nie wystarczy porównać samego procentu świadczenia.

**Czas — bez zmiany:** Przekazujemy pozostałe dni, nie wydłużamy ich łącznej liczby; mama wraca do pracy, a tata przejmuje opiekę.

**Później:** Kolejne odcinki muszą zachować ciągłość i terminy wniosków. Czas przed porodem nie zastępuje wymaganego okresu po porodzie.

**Podstawy:** [transfer](../Documents/legal/rules.md#transfer), [maternity-pool](../Documents/legal/rules.md#maternity-pool), [standard-rates](../Documents/legal/rules.md#standard-rates), [base](../Documents/legal/rules.md#base).

## 3D · Teczka bez braków

**Porównanie:** Skompletowanie dokumentów dla tego samego istniejącego uprawnienia i planu.

**Okres:** Etap formalności.

**Pieniądze — bez zmiany:** Samo uzupełnienie dokumentów nie podwyższa należnej kwoty. Korekta błędnych danych może zmienić wcześniejsze wyliczenie, ale wymaga faktycznej zmiany danych.

**Czas — bez zmiany:** Formalności nie dodają dni wolnych. Nie przypisujemy im umownej liczby dni opieki.

**Później:** Komplet dokumentów pomaga prowadzić sprawę, ale nie jest obietnicą określonego dnia przelewu.

**Podstawy:** [birth-docs](../Documents/legal/rules.md#birth-docs), [payer](../Documents/legal/rules.md#payer), [base](../Documents/legal/rules.md#base), [debt](../Documents/legal/rules.md#debt), [floor](../Documents/legal/rules.md#floor).

## 3E · Uwzględnij dodatkowy wymiar

**Porównanie:** Potwierdzenie dodatkowego wymiaru z istniejącego zaświadczenia bez dopisania nowego bloku urlopu.

**Okres:** Potwierdzenie uprawnienia.

**Pieniądze — bez zmiany:** Większa pula sama nie jest bieżącym dochodem; kwoty zmieniają się po wykorzystaniu zaplanowanych okresów.

**Czas — bez zmiany:** Dostępny wymiar rośnie, ale bieżący czas wolny nie zmienia się, dopóki nowe dni nie zostaną rzeczywiście zaplanowane.

**Później:** Nowe bloki mogą wydłużyć opiekę; nadal obowiązują części wyłączne, właściwa ścieżka przyjęcia i terminy.

**Podstawy:** [za-zyciem](../Documents/legal/rules.md#za-zyciem), [parental-pool](../Documents/legal/rules.md#parental-pool), [parental-parts](../Documents/legal/rules.md#parental-parts), [parental-docs](../Documents/legal/rules.md#parental-docs).

## 3F · Świadczenie po końcu umowy

**Porównanie:** Udokumentowanie ustawowej ścieżki po ustaniu ubezpieczenia; bez założenia, że sprawa została już rozstrzygnięta.

**Okres:** Potwierdzanie prawa po porodzie.

**Pieniądze — zależne od danych:** Po potwierdzeniu przesłanek możliwa jest należna wypłata. Sam koniec umowy ani złożenie dokumentów nie daje automatycznej wypłaty; nie przywracamy pensji z byłej pracy.

**Czas — bez zmiany:** Dokumentowanie prawa do świadczenia nie zmienia samo w sobie czasu pracy ani puli dni już należnych w tym scenariuszu.

**Później:** Świadczenie przed porodem i po porodzie mają odrębne przesłanki oraz okresy.

**Podstawy:** [job-loss-after](../Documents/legal/rules.md#job-loss-after), [insured-parent](../Documents/legal/rules.md#insured-parent), [payer](../Documents/legal/rules.md#payer), [base](../Documents/legal/rules.md#base).

## 4A · Opieka na zmianę

**Porównanie:** Zaplanowane kolejne bloki rodzicielskiego zamiast pracy rodziców w odpowiadających im okresach.

**Okres:** Kolejne bloki opieki w pierwszym roku.

**Pieniądze — zależne od danych:** Za każdy odcinek porównuje się świadczenie opiekuna i wynagrodzenie drugiego rodzica z alternatywnym planem pracy.

**Czas — wzrost:** W blokach rodzic nie pracuje i zapewnia opiekę. Przy tej samej puli naprzemienne wykorzystanie może pokryć dłuższy kalendarz niż nakładanie bloków; nie tworzy dodatkowej puli.

**Później:** Każdy rodzic zużywa własne dni i odpowiednie części, w tym nieprzenoszalne uprawnienia.

**Podstawy:** [parental-pool](../Documents/legal/rules.md#parental-pool), [parental-parts](../Documents/legal/rules.md#parental-parts), [parental-docs](../Documents/legal/rules.md#parental-docs), [averaged](../Documents/legal/rules.md#averaged), [exclusive-rate](../Documents/legal/rules.md#exclusive-rate), [base](../Documents/legal/rules.md#base).

## 4B · Rodzicielski we dwoje

**Porównanie:** Wspólny rodzicielski zamiast urlopu jednego rodzica i pracy drugiego w tym samym bloku.

**Okres:** Wybrany wspólny blok.

**Pieniądze — zależne od danych:** Dwa zasiłki nie oznaczają większego dochodu rodziny: świadczenie drugiego rodzica zastępuje jego pracę i liczy się od jego podstawy.

**Czas — wzrost:** W domu mogą być oboje, ale tego samego dnia opieki nad dzieckiem nie liczymy dwa razy. Pula zużywa się za każdą osobę.

**Później:** Przy tej samej łącznej puli wspólne dni oznaczają krótszy kalendarz opieki niż wykorzystanie tych dni kolejno.

**Podstawy:** [simultaneous](../Documents/legal/rules.md#simultaneous), [parental-pool](../Documents/legal/rules.md#parental-pool), [parental-parts](../Documents/legal/rules.md#parental-parts), [standard-rates](../Documents/legal/rules.md#standard-rates), [averaged](../Documents/legal/rules.md#averaged), [exclusive-rate](../Documents/legal/rules.md#exclusive-rate), [base](../Documents/legal/rules.md#base).

## 4C · Praca i rodzicielski

**Porównanie:** Rodzicielski łączony z pracą zamiast pełnego wolnego na rodzicielskim w tym samym okresie.

**Okres:** Godziny w okresie łączenia pracy i urlopu.

**Pieniądze — zależne od danych:** Dochodzi wynagrodzenie za pracę, lecz zasiłek maleje proporcjonalnie. Czy suma wzrośnie, zależy od relacji wynagrodzenia do świadczenia, podstawy i rozliczeń.

**Czas — spadek:** W godzinach pracy rodzic nie jest jednocześnie osobistym opiekunem. Potrzebne jest pokrycie tych godzin przez inną opiekę.

**Później:** Właściwa część urlopu może się wydłużyć według przepisów; to nie pełna opieka przez wszystkie godziny dłuższego bloku.

**Podstawy:** [part-time](../Documents/legal/rules.md#part-time), [parental-pool](../Documents/legal/rules.md#parental-pool), [parental-parts](../Documents/legal/rules.md#parental-parts), [parental-docs](../Documents/legal/rules.md#parental-docs), [base](../Documents/legal/rules.md#base).

## 4D · Rezerwa na adaptację

**Porównanie:** Zachowanie części rodzicielskiego na adaptację zamiast wykorzystania tej części już w pierwszym roku.

**Okres:** Dni pierwszego roku odłożone na później.

**Pieniądze — zależne od danych:** Jeśli rodzic w tych dniach pracuje, otrzymuje wynagrodzenie zamiast świadczenia. Wyższy dochód wymaga porównania pensji i podstawy; przesunięcie może też zmienić rozliczenie wariantu uśrednionego.

**Czas — spadek:** Odłożone dni nie zapewniają bieżącego wolnego. Opieka w pierwszym roku musi mieć inne wykonalne pokrycie.

**Później:** Rezerwa daje możliwość wykorzystania tych dni przy adaptacji; nie zwiększa łącznej puli i nie jest wypłatą.

**Podstawy:** [parental-pool](../Documents/legal/rules.md#parental-pool), [parental-parts](../Documents/legal/rules.md#parental-parts), [top-up](../Documents/legal/rules.md#top-up), [parental-docs](../Documents/legal/rules.md#parental-docs), [base](../Documents/legal/rules.md#base).

## 4E · Wykorzystaj ojcowski

**Porównanie:** Rzeczywiste wykorzystanie rezerwy ojcowskiego zamiast pracy ojca w wybranym późniejszym bloku.

**Okres:** Późniejszy blok ojcowskiego.

**Pieniądze — zależne od danych:** Liczymy świadczenie raz, od właściwej podstawy. Wcześniejsza rezerwacja nie była wypłatą.

**Czas — wzrost:** Rezerwa staje się rzeczywistym wolnym. Nie ma dwóch zestawów dni za rezerwację i wykorzystanie.

**Później:** Wykorzystana pula maleje; nadal trzeba zmieścić blok i wniosek w terminach właściwych także dla adopcji.

**Podstawy:** [paternity](../Documents/legal/rules.md#paternity), [standard-rates](../Documents/legal/rules.md#standard-rates), [base](../Documents/legal/rules.md#base).

## 4F · Własny blok taty

**Porównanie:** Wykorzystanie własnej pozostałej części rodzicielskiego taty zamiast jego pracy w tym okresie.

**Okres:** Wybrany blok ojca.

**Pieniądze — zależne od danych:** Stosuje się stawkę wyłącznego bloku ojca, a nie automatycznie wariant mamy. Kwota wobec jego pensji wymaga danych.

**Czas — wzrost:** Ojciec wykorzystuje własną część mieszczącą się w puli rodziny; nie dodajemy jej ponad łączny wymiar.

**Później:** Własnych niewykorzystanych dni nie można oddać drugiemu rodzicowi; wykorzystanie zmniejsza pozostałą pulę.

**Podstawy:** [parental-pool](../Documents/legal/rules.md#parental-pool), [exclusive-rate](../Documents/legal/rules.md#exclusive-rate), [parental-parts](../Documents/legal/rules.md#parental-parts), [parental-docs](../Documents/legal/rules.md#parental-docs), [base](../Documents/legal/rules.md#base).

## 5A · Spokojna adaptacja

**Porównanie:** Pozostały rodzicielski na adaptację zamiast pracy wybranego rodzica w tych dniach.

**Okres:** Dni adaptacji.

**Pieniądze — zależne od danych:** Wypłata zależy od podstawy i wariantu. Za wcześniejszą rezerwację nie dodajemy drugiej wypłaty.

**Czas — wzrost:** Dni stają się konkretnym blokiem opieki i zużywają właściwą pulę oraz część.

**Później:** Pozostałe dni i części maleją; plan musi mieścić się w granicach właściwej ścieżki rodzicielstwa.

**Podstawy:** [parental-pool](../Documents/legal/rules.md#parental-pool), [parental-parts](../Documents/legal/rules.md#parental-parts), [parental-docs](../Documents/legal/rules.md#parental-docs), [standard-rates](../Documents/legal/rules.md#standard-rates), [averaged](../Documents/legal/rules.md#averaged), [base](../Documents/legal/rules.md#base).

## 5B · Dwie przerwy na opiekę

**Porównanie:** Ta sama liczba dni rodzicielskiego w dwóch blokach zamiast jednego ciągłego bloku.

**Okres:** Łącznie oba planowane bloki.

**Pieniądze — zależne od danych:** Rozkład na miesiące i podstawy mogą zmieniać dochód. Sam podział nie daje bonusu do zasiłku; bez danych nie gwarantujemy większej sumy.

**Czas — bez zmiany:** Podział nie tworzy dodatkowych dni, ale może lepiej pokryć dwie potrzeby. Zużywa więcej części niż jeden blok.

**Później:** Pozostaje mniej dostępnych części; oba terminy i wnioski muszą być wykonalne.

**Podstawy:** [parental-pool](../Documents/legal/rules.md#parental-pool), [parental-parts](../Documents/legal/rules.md#parental-parts), [parental-docs](../Documents/legal/rules.md#parental-docs), [base](../Documents/legal/rules.md#base).

## 5C · Łagodny powrót do pracy

**Porównanie:** Praca podczas rodzicielskiego na adaptację zamiast pełnego wolnego w odpowiadającym okresie.

**Okres:** Godziny adaptacji przy części etatu.

**Pieniądze — zależne od danych:** Dochód to wynagrodzenie za pracę oraz proporcjonalnie obniżone świadczenie. Dodatnia różnica nie wynika z samego wybrania karty.

**Czas — spadek:** Godziny pracy wymagają innego zabezpieczenia opieki; nie są jednocześnie godzinami wolnymi rodzica.

**Później:** Blok może być dłuższy, ale tylko w dopuszczalnych granicach i z właściwym rozliczeniem części wydłużonej.

**Podstawy:** [part-time](../Documents/legal/rules.md#part-time), [parental-pool](../Documents/legal/rules.md#parental-pool), [parental-parts](../Documents/legal/rules.md#parental-parts), [parental-docs](../Documents/legal/rules.md#parental-docs), [base](../Documents/legal/rules.md#base).

## 5D · Mama przejmuje nagłą opiekę

**Porównanie:** Uprawniony opiekuńczy mamy zamiast jej pracy w dniach tej samej nagłej potrzeby.

**Okres:** Dni nagłej opieki.

**Pieniądze — zależne od danych:** Świadczenie zastępuje dochód z pracy. Nie utożsamiamy procentu podstawy ze spadkiem pensji netto o taki sam procent.

**Czas — wzrost:** Mama sprawuje osobistą opiekę w kwalifikujących dniach. Nie powstaje odrębny pełny limit dla każdego rodzica.

**Później:** Zmniejsza się wspólny limit opiekuńczego w danym roku; za te same dni świadczenie nie przysługuje równocześnie obojgu.

**Podstawy:** [care-right](../Documents/legal/rules.md#care-right), [care-money](../Documents/legal/rules.md#care-money), [care-docs](../Documents/legal/rules.md#care-docs), [base](../Documents/legal/rules.md#base), [debt](../Documents/legal/rules.md#debt).

## 5E · Tata przejmuje nagłą opiekę

**Porównanie:** Uprawniony opiekuńczy taty zamiast jego pracy w dniach tej samej nagłej potrzeby.

**Okres:** Dni nagłej opieki.

**Pieniądze — zależne od danych:** Kwota zależy od podstawy ojca i jego wynagrodzenia; może dać inny budżet rodziny niż wariant mamy za te same dni.

**Czas — wzrost:** Ojciec sprawuje osobistą opiekę. Liczba pokrytych dni dziecka nie rośnie tylko dlatego, że zmienił się opiekun.

**Później:** Wspólny roczny limit rodziny maleje o wykorzystane dni.

**Podstawy:** [care-right](../Documents/legal/rules.md#care-right), [care-money](../Documents/legal/rules.md#care-money), [care-docs](../Documents/legal/rules.md#care-docs), [base](../Documents/legal/rules.md#base), [debt](../Documents/legal/rules.md#debt).

## 5F · Nagła opieka na zmianę

**Porównanie:** Podział tych samych dni nagłej opieki na rodziców zamiast wykorzystania ich wszystkich przez jednego rodzica.

**Okres:** Cały ten sam epizod nagłej opieki.

**Pieniądze — zależne od danych:** Każdy odcinek liczy się od podstawy jego opiekuna. Sam podział nie daje dodatkowego świadczenia za ten sam dzień.

**Czas — bez zmiany:** Dwa rozłączne odcinki pokrywają tę samą potrzebę. Nie zwiększamy liczby dni ani limitu przez zmianę rodzica.

**Później:** Rodzinny limit maleje o rzeczywiste dni, niezależnie od liczby uprawnionych rodziców.

**Podstawy:** [care-right](../Documents/legal/rules.md#care-right), [care-money](../Documents/legal/rules.md#care-money), [care-docs](../Documents/legal/rules.md#care-docs), [base](../Documents/legal/rules.md#base), [debt](../Documents/legal/rules.md#debt).
