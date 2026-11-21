# Audyt wpływu 30 kart na pieniądze i czas

Przejrzano warunki, efekty i źródła każdej karty. Kierunek dotyczy wskazanego porównania po spełnieniu warunków prawnych, nie dowolnej rodziny. To audyt porównań jakościowych, nie certyfikacja kalkulatora ani opinia prawna. Dane audytu: [card-impacts.json](../shared/card-impacts.json).

## Najważniejsze korekty

- Odłożony urlop nie jest czasem wolnym teraz. Większy dochód z pracy wymaga, aby wynagrodzenie rzeczywiście przewyższało odpowiedni zasiłek.
- Procent podstawy świadczenia nie jest procentem pensji netto. Bez historii i podstaw nie obiecujemy konkretnego wzrostu lub spadku dochodu.
- Dokumenty, rezerwacje i potwierdzenie dodatkowej puli nie tworzą automatycznie bieżącej wypłaty ani dni wolnych.
- Nie utożsamiamy e-ZLA lub rehabilitacji ze zdolnością do opieki. Złożenie wniosku nie jest przyznaniem świadczenia.
- Wspólne urlopy dają więcej wspólnego czasu w konkretnym bloku, ale zużywają pulę obojga i mogą skrócić pokryty kalendarz. Dzień zapewnionej opieki nie jest liczony dwa razy.
- Praca podczas rodzicielskiego oznacza mniej wolnych godzin teraz, nawet jeśli prawidłowo obliczony okres urlopu jest dłuższy.
- Wiedza w UI to punkty za karty edukacyjne; karty urlopowe jej nie zwiększają. To niezależna mechanika gry, nie punkt z ustawy.

## Źródła i zakres

Podstawą są dostarczone [akty i dokumenty](../Documents/legal/README.md) z [rejestrem dokładnych cytatów](../Documents/legal/rules.md). Dodatkowe sprawdzenie: [wysokość świadczenia — ZUS](https://www.zus.pl/pl/swiadczenia/zasilki/zasilek-macierzynski/wysokosc), [łączenie pracy i urlopu — PIP](https://www.pip.gov.pl/dla-pracodawcow/pytania-i-odpowiedzi/czy-pracownik-moze-laczyc-urlop-rodzicielski-z-wykonywaniem-pracy). Materiały mają różne daty: pierwszeństwo ma właściwy dla zdarzenia przepis. Podwyższenia, podatki i podstawy mogą zmieniać ostateczną różnicę wypłaty.

Kierunki w tym audycie opisują wskazaną alternatywę i okres każdej karty. Nie wolno sumować tych znaków jak dni albo kwot. Paski gry są osobną ilustracją tematów zagranych kart: urlop daje czas, świadczenie symbolizuje wsparcie finansowe, a nauka i formalności dają wiedzę kosztem odrobiny czasu. Praca podczas urlopu ogranicza wolny czas; sama rezerwacja nie daje wypłaty ani wolnego teraz. Te autorskie efekty wizualne nie są kwotami, dniami, punktami ani prognozą kalkulatora. Źródła uzasadniają treść kart, nie siłę pasków. Profil końcowy wskazuje dominujący motyw; remisy pokazują wszystkie profile. Bieżące i przyszłe skutki kart opisano osobno.

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

## 1C · Poznaj zasady chorobowego

**Porównanie:** Poznanie zasad świadczenia chorobowego w ciąży, bez zmiany sytuacji rodziny.

**Okres:** Informacja ogólna.

**Pieniądze — bez zmiany:** Karta edukacyjna nie zmienia ubezpieczenia, podstawy ani prawa do świadczenia.

**Czas — bez zmiany:** Karta nie tworzy zwolnienia ani dni wolnych.

**Później:** W indywidualnej sprawie znaczenie mają potwierdzone ubezpieczenie, e-ZLA i wykorzystany okres.

**Podstawy:** [sick-right](../Documents/legal/rules.md#sick-right), [sick-money](../Documents/legal/rules.md#sick-money).

## 1D · Kto wypłaca świadczenie?

**Porównanie:** Sprawdzenie, kto wypłaca należne świadczenie i jakie dane przygotować, zamiast pozostawienia płatnika nieustalonego.

**Okres:** Przygotowanie przed złożeniem wniosku.

**Pieniądze — bez zmiany:** Ustalenie płatnika nie zmienia podstawy, stawki ani prawa do zasiłku.

**Czas — bez zmiany:** Informacja organizacyjna nie tworzy bloku urlopu ani dni opieki.

**Później:** Dokumenty kieruje się do właściwego płatnika; prawo i wysokość świadczenia wymagają odrębnego sprawdzenia.

**Podstawy:** [payer](../Documents/legal/rules.md#payer), [insured-parent](../Documents/legal/rules.md#insured-parent).

## 1E · Sprawdź podstawę zasiłku

**Porównanie:** Sprawdzenie potwierdzonej podstawy zasiłku zamiast pozostawienia wyliczenia bez weryfikacji.

**Okres:** Przygotowanie do świadczenia.

**Pieniądze — bez zmiany:** Samo sprawdzenie podstawy nie zmienia wynagrodzenia ani należnego zasiłku. Wyliczenie zależy od rzeczywistych wynagrodzeń i właściwego okresu.

**Czas — bez zmiany:** Weryfikacja danych nie jest blokiem urlopu ani zwolnieniem z pracy.

**Później:** Potwierdzona podstawa służy do obliczania świadczeń; nie jest procentem pensji netto.

**Podstawy:** [base](../Documents/legal/rules.md#base).

## 1F · Poznaj płatnika zasiłku

**Porównanie:** Poznanie zasad, kto wypłaca zasiłek, bez zmiany sytuacji rodziny.

**Okres:** Informacja ogólna.

**Pieniądze — bez zmiany:** Informacja o płatniku nie zmienia kwoty świadczenia.

**Czas — bez zmiany:** Karta nie planuje urlopów ani bloków opieki.

**Później:** Płatnik zależy od tytułu ubezpieczenia i ustawowego progu zatrudnienia.

**Podstawy:** [payer](../Documents/legal/rules.md#payer), [insured-parent](../Documents/legal/rules.md#insured-parent).

## 2A · Razem na starcie

**Porównanie:** Cały ojcowski w wybranym wczesnym bloku zamiast pracy ojca w tym bloku.

**Okres:** Wybrany wczesny blok ojcowskiego.

**Pieniądze — zależne od danych:** Kwota zależy od podstawy ojca i jego wynagrodzenia. Stawka świadczenia nie jest gwarancją tej samej pensji netto.

**Czas — wzrost:** Ojciec nie pracuje w wykorzystanym bloku. Jeżeli matka też jest w domu, nie tworzy to drugiego dnia pokrycia tej samej potrzeby opieki.

**Później:** Cała pula ojcowskiego jest wykorzystana; nie pozostaje rezerwa na później.

**Podstawy:** [paternity](../Documents/legal/rules.md#paternity), [standard-rates](../Documents/legal/rules.md#standard-rates), [base](../Documents/legal/rules.md#base).

## 2B · Tydzień teraz, reszta później

**Porównanie:** Pierwsza część ojcowskiego teraz zamiast wykorzystania całej puli w tym wczesnym okresie.

**Okres:** Początek po narodzinach.

**Pieniądze — zależne od danych:** Za wykorzystane dni jest zasiłek, za pozostałe faktycznie przepracowane dni wynagrodzenie. Kierunek dochodu wymaga porównania tych kwot.

**Czas — spadek:** W porównaniu z wykorzystaniem całej puli od razu tata ma teraz krótszy urlop. Pozostałe dni nie przepadają — można je zaplanować później w legalnym terminie.

**Później:** Pozostaje część ojcowskiego do wykorzystania w legalnym terminie; rezerwa nie jest jeszcze opieką ani wypłatą.

**Podstawy:** [paternity](../Documents/legal/rules.md#paternity), [standard-rates](../Documents/legal/rules.md#standard-rates), [base](../Documents/legal/rules.md#base).

## 2C · Ojcowski na później

**Porównanie:** Praca ojca i odłożenie całego ojcowskiego zamiast wykorzystania go we wczesnym bloku.

**Okres:** Wczesny okres po narodzinach.

**Pieniądze — zależne od danych:** Więcej pieniędzy będzie tylko wtedy, gdy dochód z pracy w porównywanych dniach przewyższa zasiłek. Bez podstawy i wynagrodzenia nie wyznaczamy znaku zmiany.

**Czas — spadek:** Ojciec pracuje zamiast korzystać z ojcowskiego. Opieka dziecka musi być obecnie zabezpieczona niezależnie od rezerwy.

**Później:** Pełna niewykorzystana pula może zapewnić czas później, jeżeli termin wykorzystania i wniosku zostanie zachowany.

**Podstawy:** [paternity](../Documents/legal/rules.md#paternity), [standard-rates](../Documents/legal/rules.md#standard-rates), [base](../Documents/legal/rules.md#base).

## 2D · Poznaj dodatkowy urlop po hospitalizacji

**Porównanie:** Poznanie zasad dodatkowego urlopu po kwalifikującej hospitalizacji, bez dodawania dni.

**Okres:** Informacja ogólna.

**Pieniądze — bez zmiany:** Karta informacyjna nie przyznaje zasiłku ani nie zmienia jego wysokości.

**Czas — bez zmiany:** Karta nie dodaje urlopu; wymiar zależy od warunków i udokumentowanej hospitalizacji.

**Później:** Sprawdź przepisy i dokumenty w razie kwalifikującego pobytu dziecka w szpitalu.

**Podstawy:** [supplementary](../Documents/legal/rules.md#supplementary).

## 2E · Poznaj terminy wniosków urlopowych

**Porównanie:** Poznanie terminów wniosków urlopowych, bez zmiany planu rodziny.

**Okres:** Informacja ogólna.

**Pieniądze — bez zmiany:** Poznanie terminów nie zmienia świadczeń ani wynagrodzenia.

**Czas — bez zmiany:** Karta nie planuje ani nie przyznaje urlopu.

**Później:** Termin zależy od rodzaju urlopu i sytuacji rodziny.

**Podstawy:** [paternity](../Documents/legal/rules.md#paternity), [supplementary](../Documents/legal/rules.md#supplementary).

## 2F · Poznaj dokumenty do zasiłku

**Porównanie:** Poznanie dokumentów potrzebnych do zasiłku, bez ich składania.

**Okres:** Informacja ogólna.

**Pieniądze — bez zmiany:** Karta nie składa wniosku ani nie wpływa na wysokość świadczenia.

**Czas — bez zmiany:** Karta nie dodaje urlopu ani dni opieki.

**Później:** Wymagane dokumenty zależą od płatnika i sytuacji rodzinnej.

**Podstawy:** [birth-docs](../Documents/legal/rules.md#birth-docs), [payer](../Documents/legal/rules.md#payer).

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

## 3D · Poznaj listę dokumentów

**Porównanie:** Poznanie formularzy i danych potrzebnych do sprawy, bez składania wniosków.

**Okres:** Informacja ogólna.

**Pieniądze — bez zmiany:** Karta edukacyjna nie składa dokumentów ani nie zmienia kwoty świadczenia.

**Czas — bez zmiany:** Karta nie dodaje urlopu ani dni opieki.

**Później:** Lista wymaganych dokumentów zależy od płatnika i tytułu ubezpieczenia.

**Podstawy:** [birth-docs](../Documents/legal/rules.md#birth-docs), [payer](../Documents/legal/rules.md#payer), [base](../Documents/legal/rules.md#base), [debt](../Documents/legal/rules.md#debt).

## 3E · Poznaj dodatkowe uprawnienia

**Porównanie:** Poznanie zasad dodatkowych uprawnień, bez potwierdzania zaświadczenia.

**Okres:** Informacja ogólna.

**Pieniądze — bez zmiany:** Karta nie przyznaje dodatkowego uprawnienia ani świadczenia.

**Czas — bez zmiany:** Karta nie dodaje urlopu do planu.

**Później:** Wymiar zależy od właściwego zaświadczenia oraz liczby dzieci.

**Podstawy:** [za-zyciem](../Documents/legal/rules.md#za-zyciem), [parental-pool](../Documents/legal/rules.md#parental-pool).

## 3F · Poznaj wybór wariantu wypłaty

**Porównanie:** Poznanie standardowego i uśrednionego wariantu wypłaty, bez zmiany planu.

**Okres:** Informacja ogólna.

**Pieniądze — bez zmiany:** Karta nie wybiera wariantu ani nie zmienia wysokości świadczenia.

**Czas — bez zmiany:** Karta nie dodaje urlopu ani dni opieki.

**Później:** Porównanie wariantów wymaga rzeczywistej podstawy oraz planowanych okresów urlopu.

**Podstawy:** [standard-rates](../Documents/legal/rules.md#standard-rates), [averaged](../Documents/legal/rules.md#averaged), [exclusive-rate](../Documents/legal/rules.md#exclusive-rate).

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
