"""Build the reviewed card-design artifacts; never mutate the live preview catalog.

The definitions below are authoring data, not executable benefit or game rules.
Run with --check to validate evidence, parameter references and generated artifacts.
"""

import argparse
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import quote, unquote

ROOT = Path(__file__).resolve().parents[1]
LEGAL = ROOT / "Documents/legal"


def ref(document, unit, locator, quote_text):
    return {"document_id": document, "unit": unit, "locator": locator, "quote": quote_text}


def kp(unit, locator, excerpt):
    return ref("labour-code", f"article-{unit}", locator, excerpt)


def uz(unit, locator, excerpt):
    return ref("benefits-act", f"article-{unit}", locator, excerpt)


def doc(unit, locator, excerpt):
    return ref("benefit-documents", f"section-{unit}", locator, excerpt)


def leave(unit, locator, excerpt):
    return ref("leave-applications", f"section-{unit}", locator, excerpt)


# Every quote is checked against the selected unit, not merely the whole document.
RULES = {
    "maternity-pool": ("Pula macierzyńskiego zależy od liczby dzieci; okres przed porodem zużywa tę samą pulę.", [
        kp("180", "art. 180 § 1 pkt 1–5, § 2–3", "20 tygodni - w przypadku urodzenia jednego dziecka przy jednym porodzie"),
        kp("1831", "art. 183¹ § 1–2", "pierwszym dniem urlopu macierzyńskiego jest dzień porodu")]),
    "prebirth": ("Pracownica może zaplanować część macierzyńskiego przed przewidywaną datą porodu; potrzebne zaświadczenie.", [
        kp("180", "art. 180 § 2–3", "Przed przewidywaną datą porodu pracownica może wykorzystać niewięcej niż 6 tygodni urlopu macierzyńskiego"),
        doc("13", "§ 13 ust. 1 pkt 1", "zaświadczenie lekarskie wystawione na zwykłym druku określające przewidywaną datę porodu")]),
    "sick-right": ("Niezdolność do pracy stwierdza lekarz. Prawo zależy od ubezpieczenia, wyczekiwania i jego wyjątków; ciąża sama nie jest zwolnieniem.", [
        uz("6", "art. 6 ust. 1", "stał się niezdolny do pracy z powodu choroby w czasie trwania ubezpieczenia chorobowego"),
        uz("4", "art. 4 ust. 1–3", "po upływie 30 dni nieprzerwanego ubezpieczenia chorobowego"),
        uz("53", "art. 53 ust. 1", "zaświadczenia lekarskie")]),
    "sick-money": ("Stawka w ciąży dotyczy podstawy zasiłku. U pracownicy rozdzielamy wynagrodzenie chorobowe i zasiłek, z uwzględnieniem wieku i roku kalendarzowego.", [
        uz("11", "art. 11 ust. 2 pkt 1, ust. 4", "przypada w okresie ciąży"),
        uz("8", "art. 8 ust. 1–2", "niedłużej niż przez 270 dni"),
        kp("92", "art. 92 § 1 pkt 1–2, § 4–5", "pracownik zachowuje prawo do 100% wynagrodzenia")]),
    "sick-docs": ("Dobieramy dokumenty do tytułu ubezpieczenia i odbiorcy; e-ZLA nie zastępuje wszystkich wniosków.", [
        doc("2", "§ 2", "Dokumentami niezbędnymi do przyznania i wypłaty"),
        doc("3", "§ 3 ust. 1–2", "zaświadczenie płatnika")]),
    "rehab": ("Świadczenie rehabilitacyjne wymaga wyczerpania chorobowego, dalszej niezdolności i rokowania; wypłata zależy od decyzji, a podstawa od waloryzacji.", [
        uz("18", "art. 18 ust. 1–3, 6–7", "dalsze leczenie lub rehabilitacja lecznicza rokują odzyskanie zdolności do pracy"),
        uz("19", "art. 19 ust. 1–3", "jeżeli niezdolność do pracy przypada w okresie ciąży - 100% tej podstawy"),
        doc("11", "§ 11 ust. 1–3", "zaświadczenie o stanie zdrowia")]),
    "job-loss-before": ("Szczególne świadczenie przed porodem dotyczy określonej utraty zatrudnienia i braku zapewnionej innej pracy; nie każdej kończącej się umowy.", [
        uz("30", "art. 30 ust. 3", "przysługuje do dnia porodu zasiłek w wysokości zasiłku macierzyńskiego"),
        doc("17", "§ 17 pkt 1–3", "oświadczenie ubezpieczonej, że nie zapewniono jej innego zatrudnienia")]),
    "job-loss-after": ("Prawo po porodzie po ustaniu ubezpieczenia sprawdzamy osobno, według ustawowej przesłanki i dokumentów.", [
        uz("30", "art. 30 ust. 1 pkt 1–2, ust. 4", "ubezpieczenie to ustało w okresie ciąży"),
        kp("177", "art. 177 § 3 i § 3¹", "ulega przedłużeniu do dnia porodu"),
        doc("15", "§ 15 ust. 1–2", "Dokumentami niezbędnymi")]),
    "insured-parent": ("Świadczenie przysługuje uprawnionemu ubezpieczonemu; osoba bez umowy o pracę pobiera je za okres odpowiadający urlopowi, bez udzielania urlopu pracowniczego.", [
        uz("29", "art. 29 ust. 1–2", "w okresie ubezpieczenia chorobowego albo w okresie urlopu wychowawczego"),
        uz("29a", "art. 29a ust. 1", "przez okres ustalony przepisami Kodeksu pracy")]),
    "adoption": ("Adopcja i piecza niezawodowa mają różne przesłanki wieku i dokumenty; początek wynika z przyjęcia oraz, dla adopcji, wystąpienia do sądu.", [
        kp("183", "art. 183 § 1, § 1¹, § 3–6", "Urlop rozpoczyna się w terminie określonym we wniosku pracownika"),
        uz("29", "art. 29 ust. 1 pkt 2–3, ust. 2", "przyjęła na wychowanie dziecko w wieku do 14 roku życia"),
        doc("16", "§ 16 ust. 1–2", "oświadczenie ubezpieczonego o dacie przyjęcia dziecka na wychowanie")]),
    "paternity": ("Ojcowski ma własną pulę, ograniczenie liczby części i terminu. Przy adopcji termin liczony jest od prawomocnego przysposobienia, nie od urodzenia.", [
        kp("1823", "art. 182³ § 1 pkt 1–2, § 1¹, § 2", "żadna nie może być krótsza niż tydzień"),
        leave("17", "§ 17 ust. 1–2", "wskazanie okresu")]),
    "supplementary": ("Jednorazowy blok bezpośrednio po macierzyńskim, według tygodnia ciąży, masy i kwalifikujących pobytów. Okresy sumujemy, niepełny tydzień zaokrąglamy w górę.", [
        kp("1802", "art. 180² § 1 pkt 1–3, § 2–6", "Niepełny tydzień zaokrągla się w górę do pełnego tygodnia"),
        leave("14", "§ 14 ust. 1–4", "zaświadczenie, o którym mowa w art. 1802 § 5 Kodeksu pracy"),
        doc("26", "§ 26 pkt 1–3; dla zmiany rodzica również § 27", "oświadczenie ubezpieczonego o braku zamiaru korzystania przez drugiego z rodziców")]),
    "base": ("Każdy rodzic ma własną podstawę. Pracownik: historia wynagrodzeń i uzupełnienia; pozostali: właściwe zasady przychodu, także przy krótszym ubezpieczeniu.", [
        uz("3", "art. 3 pkt 3–4", "po odliczeniu kwoty odpowiadającej 13,71%"),
        uz("36", "art. 36 ust. 1–4; art. 37–42, 45, 47", "jedna trzydziesta część"),
        uz("47", "art. 47", "stosuje się odpowiednio"),
        uz("48", "art. 48 ust. 1–2; art. 48a–50, 52", "przeciętny miesięczny przychód")]),
    "standard-rates": ("Wariant podstawowy: różne stawki dla macierzyńskiego i rodzicielskiego; procent podstawy nie jest procentem pensji netto.", [
        uz("31", "art. 31 ust. 1–2", "wynosi 100% podstawy wymiaru zasiłku")]),
    "averaged": ("Wniosek o wariant uśredniony ma termin od porodu albo odpowiedniego zdarzenia przyjęcia; wyłączna część drugiego rodzica pozostaje w odrębnej stawce.", [
        uz("30a", "art. 30a ust. 1–4", "niepóźniej niż 21 dni po porodzie"),
        uz("31", "art. 31 ust. 3, 3f–3g, 4", "81,5% podstawy wymiaru zasiłku")]),
    "transfer": ("Przekazanie dotyczy pozostałej części po okresie wykorzystanym po porodzie; wymagane uprawnienie ojca i odpowiednie wnioski obojga rodziców.", [
        kp("180", "art. 180 § 4–5, 8–9, 14", "po wykorzystaniu po porodzie co najmniej 14 tygodni"),
        uz("29", "art. 29 ust. 3–4", "przerwał działalność zarobkową w celu sprawowania osobistej opieki nad dzieckiem"),
        doc("18", "§ 18 ust. 1–2; § 20 ust. 1–2", "o dacie, od której ubezpieczony ojciec dziecka będzie korzystał z uprawnień")]),
    "payer": ("Płatnik świadczenia zależy od tytułu i liczby ubezpieczonych ustalanej na ustawowy dzień; po ustaniu ubezpieczenia wypłaca ZUS.", [
        uz("61", "art. 61 ust. 1 pkt 1–2, ust. 2–4", "według stanu na dzień 30 listopada poprzedniego roku"),
        doc("3", "§ 3 ust. 1–2", "zaświadczenie płatnika")]),
    "birth-docs": ("Dokumenty do zasiłku są zależne od sprawy. Gdy płaci ZUS, zasadniczo przekazuje się dane dziecka do pobrania aktu z rejestru, zamiast odpisu na start.", [
        doc("12", "§ 12", "dane i informacje określone w załączniku nr 6"),
        doc("13", "§ 13 ust. 1–4", "Odpisu skróconego aktu urodzenia dziecka nie przedstawia się, jeżeli płatnikiem zasiłku jest Zakład")]),
    "parental-pool": ("Pula zależy od liczby dzieci i właściwej ścieżki. Każdy rodzic ma wyłączną część wewnątrz puli, nie dodatkowo ponad nią.", [
        kp("1821a", "art. 182¹a § 1, 3–5; przy przyjęciu art. 183 § 4–5", "Prawa tego nie można przenieść"),
        kp("183", "art. 183 § 4–4⁶ i § 5", "38 tygodni")]),
    "za-zyciem": ("Posiadanie wymaganego zaświadczenia zwiększa pulę, ale nie przydziela automatycznie wszystkich tygodni ani nie znosi wyłącznych części.", [
        kp("1821a", "art. 182¹a § 2–4", "65 tygodni"),
        kp("183", "art. 183 § 4³–4⁵", "62 tygodni"),
        leave("15", "§ 15 ust. 2 pkt 3", "kopię zaświadczenia")]),
    "parental-parts": ("Liczymy części i wnioski obojga rodziców łącznie, również okresy odpowiadające urlopom. Przy przyjęciu stosujemy właściwe granice wieku.", [
        kp("1821c", "art. 182¹c", "niewięcej niż w 5 częściach"),
        kp("1821d", "art. 182¹d § 1–2", "niekrótszym niż 21 dni"),
        kp("183", "art. 183 § 4–5", "niedłużej jednak niż do ukończenia przez dziecko 14 roku życia")]),
    "simultaneous": ("Jednoczesny rodzicielski obojga zużywa pulę za każdą osobę; dzień pokrytej opieki w statystyce czasu liczymy raz.", [
        kp("1821a", "art. 182¹a § 6–7", "mogą jednocześnie korzystać oboje"),
        uz("29a", "art. 29a ust. 3–4", "łączny okres zasiłku macierzyńskiego nie może przekraczać")]),
    "part-time": ("Łączenie z pracą u pracodawcy udzielającego urlopu wymaga odpowiedniego wniosku i możliwości organizacyjnych. Świadczenie maleje proporcjonalnie do pracy.", [
        kp("1821e", "art. 182¹e § 1–2", "chyba że nie jest to możliwe ze względu na organizację pracy"),
        kp("1821f", "art. 182¹f § 1–7, w tym § 1¹", "130 tygodni"),
        uz("31", "art. 31 ust. 4a", "zmniejsza się proporcjonalnie do wymiaru czasu pracy"),
        leave("16", "§ 16 pkt 1–4", "określenie wymiaru czasu pracy")]),
    "parental-docs": ("Wniosek i oświadczenia uwzględniają dotychczasowe części, drugiego rodzica, przyjęcie dziecka i ewentualną pracę podczas urlopu.", [
        leave("15", "§ 15 ust. 1–4", "liczby wykorzystanych części"),
        doc("29", "§ 29 pkt 1–4; przy zmianie rodzica § 30", "liczbie części wypłaconego zasiłku")]),
    "exclusive-rate": ("Wyłączny blok drugiego rodzica ma stawkę rodzicielskiego także przy wariancie uśrednionym.", [
        uz("31", "art. 31 ust. 3f", "w części przysługującej drugiemu rodzicowi")]),
    "top-up": ("Brak choćby jednego dnia rodzicielskiego w pierwszym roku zmienia rozliczenie wariantu uśrednionego; wyrównanie wymaga wniosku.", [
        uz("31", "art. 31 ust. 3g i 4", "Jednorazowe wyrównanie zasiłku macierzyńskiego następuje na wniosek")]),
    "care-right": ("Opiekuńczy wymaga kwalifikującego zdarzenia, wieku i osobistej opieki; sprawdzamy też innego dostępnego domownika i wyjątek dla chorego dziecka poniżej dwóch lat.", [
        ref("parents-guide", "page-38", "Poradnik, s. drukowana 37; ustawa zasiłkowa art. 32 ust. 1–3 i art. 34", "nieprzewidziane zamknięcie żłobka"),
        ref("parents-guide", "page-37", "Poradnik, s. drukowana 36; ustawa zasiłkowa art. 34", "chyba że dziecko choruje i ma mniej niż 2 lata")]),
    "care-money": ("Opiekuńczy liczymy od podstawy danego rodzica. Limit roczny jest wspólny dla rodziny, a nie osobny dla każdego rodzica.", [
        ref("parents-guide", "page-39", "Poradnik, s. drukowana 38; ustawa zasiłkowa art. 33 ust. 1–3, art. 35 ust. 1", "Zasiłek opiekuńczy wynosi 80% podstawy wymiaru")]),
    "care-docs": ("Za ten sam okres świadczenie otrzymuje jeden rodzic; do opieki nad dzieckiem potrzebny wniosek i dowód właściwy dla zdarzenia.", [
        ref("parents-guide", "page-37", "Poradnik, s. drukowana 36", "tylko jedno z Was"),
        ref("parents-guide", "page-39", "Poradnik, s. drukowana 38", "formularz Z-15A")]),
    "debt": ("Dla wskazanych płatników własnych składek zadłużenie może blokować świadczenia; spłata i terminy wymagają odrębnego sprawdzenia.", [
        uz("2a", "art. 2a ust. 1–2", "do czasu spłaty całości zadłużenia")]),
    "floor": ("Podwyższenie niskiego zasiłku wymaga uwzględnienia okresu i innych tytułów; nie jest dodatkowym świadczeniem za kartę.", [
        uz("31", "art. 31 ust. 3a i 3c", "ustala się proporcjonalnie do okresu"),
        doc("28", "§ 28 pkt 1–2", "podwyższenie zasiłku macierzyńskiego nie jest pobierane z innego tytułu")]),
}


def effect(op, **values):
    return {"op": op, **values}


def card(card_id, title, description, conditions, effects, money, time, chips, tags,
         rules, parameters=(), combo=None, notes=""):
    return {"id": card_id, "round_id": int(card_id[0]), "title": title,
            "description": description, "conditions": conditions, "effects": effects,
            "stats": {"money": {"kind": "derived", "explanation": money},
                      "time": {"kind": "derived", "explanation": time},
                      "happiness": {"kind": "game_score", "chips": chips,
                                    "explanation": "Punkty za wykonalną decyzję; nie miara zdrowia ani obietnica samopoczucia."}},
            "tags": tags.split(), "legal_rule_ids": rules.split(),
            "parameter_refs": list(parameters), "combo": combo, "notes": notes}


# Legal values are parameter references. Block lengths below come from a scenario need,
# a player choice or a remaining pool, never from a duplicated legal limit.
CARDS = [
    card("1A", "Macierzyński od narodzin",
         "Zachowaj całą dostępną pulę macierzyńskiego na czas po porodzie.",
         "Ścieżka urodzenia; brak rozpoczętego macierzyńskiego. Praca do porodu tylko przy braku stwierdzonej niezdolności; karta nie kasuje e-ZLA.",
         [effect("set_flag", name="maternity_start", value="birth")],
         "Przed porodem pozostaje dochód z faktycznej sytuacji; po porodzie zasiłek według podstawy i wariantu.",
         "Brak dodatkowych dni przed porodem; cała pula pozostaje po narodzinach.", 10, "reserve continuity",
         "maternity-pool insured-parent standard-rates base", ["maternity.weeks_by_children"],
         {"with": ["3C"], "name": "Zmiana warty", "check": "touching", "mult": "0.50"}),
    card("1B", "Chwila przed porodem",
         "Rozpocznij macierzyński wcześniej i przygotuj się na narodziny.",
         "Pracownica, zaświadczenie o przewidywanym terminie, wybrany początek w dopuszczalnym oknie. Nie nakładaj macierzyńskiego na chorobowe tej samej osoby.",
         [effect("add_block", who="mother", kind="maternity", start="choice.prebirth_start", days="until:birth", merge_into="baseline.maternity")],
         "Zasiłek zastępuje wynagrodzenie za wybrane dni; nie zakładamy z góry wzrostu dochodu.",
         "Wcześniejsze wolne zużywa tę samą pulę; mniej macierzyńskiego zostaje po porodzie.", 10, "preparation shared",
         "prebirth maternity-pool standard-rates base", ["maternity.prebirth_max_weeks", "rates.maternity"],
         {"with": ["2A"], "name": "Wspólny start", "check": "overlap", "mult": "0.25"}),
    card("1C", "Zdrowie na pierwszym miejscu",
         "Uporządkuj chorobowe w ciąży na podstawie wystawionego zwolnienia.",
         "Niezdolność jest faktem z e-ZLA; ubezpieczenie, wyczekiwanie albo wyjątek i pozostały okres muszą być potwierdzone. Karta nie pozwala wybrać choroby.",
         [effect("add_block", who="mother", kind="sick", start="facts.ezla.start", days="facts.ezla.days"), effect("mark_docs", bundle="sick", only_if="facts.documents_available")],
         "Przelicz wynagrodzenie chorobowe i zasiłek właściwe dla tytułu; uwzględnij podstawę i wykorzystane dni.",
         "Dni niezdolności nie są automatycznie dniami zdolności do opieki; przed porodem nie zwiększają pokrycia potrzeb dziecka.", 10, "health documents continuity",
         "sick-right sick-money sick-docs base debt", ["rates.sick_pregnancy", "sick.period_days_pregnancy", "sick.waiting_days_mandatory", "sick.waiting_days_voluntary", "sick.employer_days", "sick.employer_days_50plus"],
         {"with": ["3D"], "name": "Kompletna teczka", "check": "docs_complete", "mult": "0.50"}),
    card("1D", "Pomost rehabilitacyjny",
         "Przygotuj sprawę o rehabilitacyjne, gdy chorobowe się wyczerpuje.",
         "Dalsza niezdolność i rokowanie wynikają ze scenariusza; wykluczenia ustawowe sprawdzone. Złożenie wniosku nie oznacza przyznania.",
         [effect("set_flag", name="rehab_application", value="pending"), effect("mark_docs", bundle="rehab", only_if="facts.documents_available"), effect("add_block", who="mother", kind="rehab", start="after:sick:mother", days="facts.rehab.awarded_days", only_if="facts.rehab.decision_granted")],
         "Pokaż prognozę warunkową oddzielnie; do pewnego budżetu wlicz dopiero przyznany okres i właściwie zwaloryzowaną podstawę.",
         "Okres leczenia nie oznacza zdolności do osobistej opieki; brak fikcyjnych dodatkowych dni opieki.", 10, "health documents continuity",
         "rehab base debt", (),
         {"with": ["3D"], "name": "Kompletna teczka", "check": "docs_complete", "mult": "0.50"},
         "Wymaga nowych parametrów rehabilitacyjnego i waloryzacji; blokada uruchomienia do ich dodania."),
    card("1E", "Dochód po likwidacji firmy",
         "Zabezpiecz szczególną ścieżkę świadczenia przed porodem po utracie zatrudnienia.",
         "Stosunek pracy ustał w ciąży wskutek śmierci, upadłości lub likwidacji pracodawcy; nie zapewniono innego zatrudnienia; dokumenty potwierdzają przesłanki.",
         [effect("add_block", who="mother", kind="job_loss_benefit", start="facts.employment_end_next_day", days="until:birth", only_if="facts.job_loss.entitled"), effect("mark_docs", bundle="job_loss_before_birth", only_if="facts.documents_available")],
         "Prognozuj należne świadczenie za okres przed porodem; nie dodawaj równolegle pensji z zakończonej pracy.",
         "Brak zużycia podstawowego macierzyńskiego przed porodem; okres nie zwiększa jeszcze pokrycia opieki po narodzinach.", 10, "security documents continuity",
         "job-loss-before base payer", ["rates.job_loss"],
         {"with": ["3F"], "name": "Ciągłość wypłat", "check": "touching", "mult": "0.50"}),
    card("1F", "Przygotuj rodzinny start",
         "Przygotuj plan i dokumenty na przyjęcie dziecka w adopcji albo pieczy niezawodowej.",
         "Wyłącznie scenariusz przyjęcia. Rozdziel adopcję i pieczę; przyszłe zdarzenie nie tworzy dzisiejszego uprawnienia.",
         [effect("set_flag", name="acceptance_plan", value="prepared"), effect("reserve", pool="on_maternity_terms", who="choice.parent", start="event:acceptance", days="derived.acceptance_entitlement", provisional=True)],
         "Tylko prognoza przyszłego świadczenia po spełnieniu przesłanek; bieżący pewny dochód bez zmiany.",
         "Rezerwacja nie jest wykorzystaniem urlopu ani dniem zapewnionej opieki; pokazuje przyszły plan.", 10, "adoption preparation documents",
         "adoption insured-parent standard-rates base", ["maternity.weeks_by_children", "maternity.adoption_min_weeks"],
         {"with": ["2F"], "name": "Gotowi na przyjęcie", "check": "docs_complete", "mult": "0.25"}),

    card("2A", "Razem na starcie",
         "Zaplanuj cały dostępny ojcowski we wspólnym bloku po narodzinach.",
         "Uprawniony ojciec, dostępna pełna pula, osiągalny termin wniosku i wykorzystania. Początek nie musi być dniem porodu.",
         [effect("add_block", who="father", kind="paternity", start="choice.early_paternity_start", days="params.paternity.days")],
         "Za blok zastąp wynagrodzenie świadczeniem od podstawy ojca; stawka ojcowskiego jest niezależna od wariantu matki.",
         "Zużyj pulę ojcowskiego; wspólne dni licz raz do pokrycia opieki, osobno do wspólnego czasu.", 10, "shared early",
         "paternity standard-rates base payer", ["paternity.days", "paternity.notice_days", "paternity.use_by_child_months", "rates.paternity"],
         {"with": ["1B", "4B"], "name": "Wspólny start", "check": "overlap", "mult": "0.25"}),
    card("2B", "Tydzień teraz, reszta później",
         "Wykorzystaj pierwszą część ojcowskiego i zachowaj drugą na konkretną potrzebę.",
         "Pełna pula i dwie dostępne części; oba terminy mieszczą się w ograniczeniach i mają osiągalne terminy wniosków.",
         [effect("add_block", who="father", kind="paternity", start="choice.first_paternity_start", days="params.paternity.min_part_days"), effect("reserve", who="father", pool="paternity", start="need:paternity_later", days="derived.paternity_remaining")],
         "Teraz rozlicz tylko pierwszą część; za rezerwację brak wypłaty do czasu zaplanowania rzeczywistego bloku.",
         "Wpisz pierwszą część; pozostałe dni pozostają dostępne i nie są jeszcze pokrytą opieką.", 10, "reserve shared flexibility",
         "paternity standard-rates base", ["paternity.min_part_days", "paternity.max_parts", "paternity.notice_days", "rates.paternity"],
         {"with": ["4E"], "name": "Wykorzystana rezerwa", "check": "covers_need", "mult": "0.50"}),
    card("2C", "Ojcowski na później",
         "Zarezerwuj ojcowski na czas, gdy najbardziej przyda się dodatkowa opieka.",
         "Bieżąca opieka zapewniona, ojciec uprawniony i nadal możliwy legalny późniejszy termin. Nie pozwól zarezerwować puli poza limitem wieku.",
         [effect("reserve", who="father", pool="paternity", start="need:paternity_later", days="params.paternity.days")],
         "Do rozpoczęcia bloku dochód z pracy bez dodatkowego zasiłku; pokaż datowaną prognozę rezerwy osobno.",
         "Bez bieżącego zużycia puli i bez dodatkowych pokrytych dni; późniejszy blok musi zostać zrealizowany.", 10, "reserve flexibility",
         "paternity standard-rates base", ["paternity.days", "paternity.use_by_child_months", "paternity.notice_days"],
         {"with": ["4E"], "name": "Wykorzystana rezerwa", "check": "covers_need", "mult": "0.50"}),
    card("2D", "Uzupełniający dla mamy",
         "Po hospitalizacji dziecka zaplanuj należny uzupełniający dla mamy.",
         "Kwalifikująca hospitalizacja jest faktem. Prawo i wymiar obliczone; osiągalny termin, zaświadczenie, drugi rodzic nie korzysta z tego samego uprawnienia.",
         [effect("add_block", who="mother", kind="supplementary", start="after:maternity", days="derived.supplementary_days"), effect("mark_docs", bundle="supplementary", only_if="facts.documents_available")],
         "Przelicz należny blok od podstawy mamy według stawki uzupełniającego; nie stosuj do niego automatycznie stawki uśrednionej.",
         "Dodaj obliczony blok po macierzyńskim; nie odejmuj go z puli rodzicielskiego.", 10, "health continuity documents",
         "supplementary standard-rates base", ["rates.supplementary", "supplementary.extreme.cap_weeks", "supplementary.preterm.cap_weeks", "supplementary.term.cap_weeks", "deadlines.supplementary_notice_days_before_maternity_end"],
         {"with": ["4A"], "name": "Bez luki", "check": "touching", "mult": "0.50"}),
    card("2E", "Uzupełniający dla taty",
         "Po hospitalizacji dziecka zaplanuj należny uzupełniający dla taty.",
         "Jak dla uzupełniającego mamy, ale uprawniony jest ojciec; wybór rodzica nie powiększa wymiaru. Sprawdź dokumenty po drugim rodzicu.",
         [effect("add_block", who="father", kind="supplementary", start="after:maternity", days="derived.supplementary_days"), effect("mark_docs", bundle="supplementary_other_parent", only_if="facts.documents_available")],
         "Zastąp dochód ojca odpowiednim świadczeniem; dochód mamy wynika z jej odrębnego statusu i faktycznego powrotu do pracy.",
         "Jedna wspólna pula uzupełniającego; ten sam okres nie może zostać przyznany obojgu.", 10, "health shared continuity",
         "supplementary standard-rates base insured-parent", ["rates.supplementary", "deadlines.supplementary_notice_days_before_maternity_end"],
         {"with": ["4A"], "name": "Bez luki", "check": "touching", "mult": "0.50"}),
    card("2F", "Witaj w rodzinie",
         "Uruchom plan świadczeń po przyjęciu dziecka na wychowanie.",
         "Potwierdzone przyjęcie; dla adopcji także wystąpienie do sądu, dla pieczy jej niezawodowy charakter. Wiek, liczba dzieci i dokumenty sprawdzone.",
         [effect("add_block", who="choice.parent", kind="maternity", start="choice.acceptance_leave_start", days="derived.acceptance_entitlement", context="on_maternity_terms", merge_into="baseline.acceptance"), effect("mark_docs", bundle="acceptance", only_if="facts.documents_available")],
         "Przelicz zasiłek od podstawy wybranego rodzica i właściwego wariantu; nie wypłacaj ponownie za rezerwację z 1F.",
         "Wpisz rzeczywisty blok i właściwy wymiar dla wieku oraz ścieżki; nie używaj daty urodzenia jako daty przyjęcia.", 10, "adoption continuity documents",
         "adoption insured-parent standard-rates base", ["maternity.weeks_by_children", "maternity.adoption_min_weeks"],
         {"with": ["1F"], "name": "Gotowi na przyjęcie", "check": "docs_complete", "mult": "0.25"}),

    card("3A", "Więcej na początku",
         "Wybierz podstawowy wariant wypłat za macierzyński i rodzicielski.",
         "Prawo potwierdzone, brak wcześniejszego wiążącego wyboru wariantu uśrednionego. To wybór porównywanych planów, nie dowolna zmiana już wypłaconych świadczeń.",
         [effect("set_rate_variant", value="standard")],
         "Przelicz wszystkie planowane okresy według ich stawek; pokaż zmianę między etapami i sumę świadczeń w tym samym horyzoncie.",
         "Wariant stawek sam nie dodaje dni i nie zmienia puli urlopów.", 10, "budget early",
         "standard-rates base floor", ["rates.maternity", "rates.parental", "parental_benefit_floor"],
         {"with": ["4C"], "name": "Budżet dopięty", "check": "budget_ok", "mult": "0.25"}),
    card("3B", "Równiej przez miesiące",
         "Złóż w terminie wniosek o uśredniony wariant wypłat.",
         "Dostępny wariant i osiągalny termin od porodu albo odpowiedniego zdarzenia przyjęcia; uwzględnij wyłączny blok drugiego rodzica.",
         [effect("set_rate_variant", value="averaged"), effect("mark_docs", bundle="averaged_request", only_if="facts.documents_available")],
         "Przelicz plan; wyłączny blok drugiego rodzica rozlicz osobno. Stabilność i suma zależą od podstaw oraz terminów wykorzystania.",
         "Bez dodatkowych tygodni; pilnuj wykorzystania rodzicielskiego w pierwszym roku i ewentualnego wyrównania.", 10, "budget stability documents",
         "averaged exclusive-rate top-up base floor", ["rates.averaged", "rates.parental", "deadlines.averaged_request_days_after_birth"],
         {"with": ["4F"], "name": "Obie pule w grze", "check": "covers_need", "mult": "0.25"}),
    card("3C", "Zmiana warty",
         "Zaplanuj powrót mamy do pracy i przejęcie pozostałego macierzyńskiego przez tatę.",
         "Scenariusz urodzenia, obowiązkowy okres po porodzie wykorzystany przez mamę, dodatnia reszta, uprawniony ojciec i osiągalne terminy wniosków. Przyszły blok nie oznacza powrotu już dziś.",
         [effect("transfer_maternity", from_who="mother", to_who="father", start="after:mother_personal_postbirth_period", days="derived.transferable_maternity_remaining")],
         "Od daty przejęcia uwzględnij pracę mamy i świadczenie od podstawy ojca; nie dopisuj dwóch świadczeń za ten sam przekazany okres.",
         "Przenieś dni, nie twórz nowej puli. Okres przedporodowy nie zastępuje wymaganego okresu po porodzie.", 10, "shared handoff continuity",
         "transfer maternity-pool standard-rates base", ["maternity.mother_personal_weeks"],
         {"with": ["1A"], "name": "Zmiana warty", "check": "touching", "mult": "0.50"}),
    card("3D", "Teczka bez braków",
         "Uzupełnij dokumenty, potwierdź podstawę i sprawdź, kto wypłaci świadczenie.",
         "Otwarta sprawa, dostępne wymagane dokumenty i fakty potwierdzające prawo; brak dokumentu nie może być samą kartą zmieniony w dokument dostępny.",
         [effect("mark_docs", bundle="current_entitlement", only_if="facts.documents_available"), effect("set_flag", name="payer_and_base_checked", value=True)],
         "Nie zwiększa należnego świadczenia. Potwierdzone dane mogą zmienić wcześniejszą prognozę; kompletność nie gwarantuje konkretnego dnia przelewu.",
         "Bez dodatkowych dni urlopu; mniej otwartych formalności w planie.", 10, "documents security",
         "birth-docs payer base insured-parent debt floor", ["payer_threshold_insured", "debt_threshold_pct_min_wage", "contribution_deduction"],
         {"with": ["1C", "1D", "2F"], "name": "Kompletna teczka", "check": "docs_complete", "mult": "0.50"}),
    card("3E", "Uwzględnij dodatkowy wymiar",
         "Zaktualizuj pulę rodzicielskiego na podstawie zaświadczenia „Za życiem”.",
         "Wymagane zaświadczenie istnieje w scenariuszu i nie zostało już uwzględnione. Karta nie przyznaje diagnozy ani nie nagradza choroby.",
         [effect("set_flag", name="za_zyciem_verified", value=True), effect("mark_docs", bundle="za_zyciem", only_if="facts.documents_available")],
         "Samo potwierdzenie nie wypłaca pieniędzy. Prognoza zmienia się po przypisaniu dostępnych okresów konkretnym rodzicom.",
         "Zaktualizuj uprawnioną pulę, osobno zachowaj części wyłączne; przy przyjęciu użyj właściwego wariantu.", 10, "rights reserve documents",
         "za-zyciem parental-pool parental-docs", ["parental.weeks_za_zyciem_single", "parental.weeks_za_zyciem_multiple", "parental.exclusive_weeks"],
         {"with": ["4D"], "name": "Plan na potrzeby", "check": "covers_need", "mult": "0.25"}),
    card("3F", "Świadczenie po końcu umowy",
         "Potwierdź odrębne prawo do macierzyńskiego po ustaniu ubezpieczenia.",
         "Ustawowa przesłanka po ustaniu ubezpieczenia jest udokumentowana; nie zakładaj prawa po dowolnym zakończeniu pracy. Przypadki sporne i orzeczenia są faktami, nie wyborem gracza.",
         [effect("set_flag", name="post_insurance_entitlement_verified", value=True), effect("mark_docs", bundle="post_insurance_maternity", only_if="facts.documents_available")],
         "Po potwierdzeniu przelicz podstawowy blok po porodzie; świadczenie sprzed porodu i po porodzie są odrębnymi okresami.",
         "Pokazuje okres pobierania świadczenia bez fikcyjnego urlopu u byłego pracodawcy.", 10, "security continuity documents",
         "job-loss-after insured-parent base payer", ["maternity.weeks_by_children", "rates.maternity"],
         {"with": ["1E"], "name": "Ciągłość wypłat", "check": "touching", "mult": "0.50"}),

    card("4A", "Opieka na zmianę",
         "Ułóż rodzicielski w następujących po sobie blokach mamy i taty.",
         "Oboje uprawnieni, dostępne pule i części, terminy wniosków osiągalne. Nie przenoś wyłącznej części między rodzicami.",
         [effect("add_block", who="mother", kind="parental", start="need:first_year", days="choice.mother_parental_days"), effect("add_block", who="father", kind="parental", start="after:planned_parental:mother", days="choice.father_parental_days")],
         "W każdym okresie przelicz pensję pracującego rodzica i zasiłek opiekuna od jego podstawy.",
         "Kolejne bloki wydłużają pokryty kalendarz; zużywają odpowiednie pule i części obojga.", 10, "shared handoff continuity",
         "parental-pool parental-parts parental-docs averaged exclusive-rate base", ["parental.exclusive_weeks", "parental.max_parts", "rates.parental"],
         {"with": ["2D", "2E", "3C"], "name": "Bez luki", "check": "touching", "mult": "0.50"}),
    card("4B", "Rodzicielski we dwoje",
         "Zaplanuj wspólny blok rodzicielskiego na okres, gdy potrzebujecie być razem.",
         "Dwa uprawnienia, wystarczające pule każdego rodzica i całej rodziny, dostępne części oraz osiągalne terminy.",
         [effect("add_block", who="mother", kind="parental", start="need:shared", days="choice.shared_parental_days"), effect("add_block", who="father", kind="parental", start="need:shared", days="choice.shared_parental_days")],
         "Za wspólne dni dwa świadczenia od różnych podstaw, bez pensji za czas nieprzepracowany; porównaj z budżetem rodziny.",
         "Każdy rodzic zużywa własne dni; pokrycie tej samej potrzeby dziecka licz raz. Wspólny czas przechowuj osobno.", 10, "shared overlap",
         "simultaneous parental-pool parental-parts parental-docs standard-rates averaged exclusive-rate base", ["parental.max_parts", "rates.parental", "rates.averaged"],
         {"with": ["2A"], "name": "Wspólny start", "check": "overlap", "mult": "0.25"}),
    card("4C", "Praca i rodzicielski",
         "Połącz rodzicielski z uzgodnioną pracą w części etatu.",
         "Pracownik u pracodawcy udzielającego urlopu, osiągalny wniosek i potwierdzona możliwość organizacji pracy. Sprawdź opiekę w godzinach pracy.",
         [effect("add_block", who="choice.parent", kind="parental", start="need:first_year", days="choice.parental_pool_days", work_fraction="choice.work_fraction", duration_semantics="pool_before_extension")],
         "Pensja za pracę plus proporcjonalnie obniżony zasiłek; wylicz także część wydłużoną i wybrany sposób jej wykorzystania.",
         "Wydłuż właściwy blok zgodnie z zasadami; nie uznawaj całego dnia pracy za zapewnioną osobistą opiekę.", 10, "work budget flexibility",
         "part-time parental-pool parental-parts parental-docs base", ["parental.part_time_max_fraction", "parental.part_time_cap_weeks_single", "parental.part_time_cap_weeks_multiple", "deadlines.part_time_notice_days"],
         {"with": ["5C"], "name": "Długi pomost", "check": "budget_ok", "mult": "0.25"}),
    card("4D", "Rezerwa na adaptację",
         "Zabezpiecz bieżącą opiekę i zachowaj konkretny blok rodzicielskiego na później.",
         "Istnieje wykonalny plan pierwszego roku i przyszła potrzeba; pozostają właściwa pula, części i czas. Samo zachowanie urlopu nie zapewnia dzisiejszej opieki.",
         [effect("add_block", who="choice.parent", kind="parental", start="need:first_year", days="choice.first_year_parental_days"), effect("reserve", who="choice.parent", pool="parental", start="need:adaptation", days="choice.adaptation_reserve_days")],
         "Przelicz bieżące bloki i przyszłą prognozę osobno; przy uśrednieniu sprawdź ewentualną zmianę rozliczenia pierwszego roku.",
         "Rezerwa nie zużywa części ani dni i nie zwiększa pokrytej opieki, dopóki nie stanie się blokiem.", 10, "reserve flexibility preparation",
         "parental-pool parental-parts top-up parental-docs base", ["parental.max_parts", "parental.last_child_age_years"],
         {"with": ["5A", "5B"], "name": "Rezerwa na później", "check": "covers_need", "mult": "0.50"}),
    card("4E", "Wykorzystaj ojcowski",
         "Zamień zachowaną pulę ojcowskiego w konkretną opiekę przed upływem terminu.",
         "Po 2B albo 2C została pula; wybrany blok i wniosek mieszczą się w terminie. Przy adopcji użyj odrębnego zegara.",
         [effect("add_block", who="father", kind="paternity", start="need:paternity_later", days="derived.paternity_remaining", consume_reservation="paternity")],
         "Rozlicz wykorzystany blok tylko raz; sama wcześniejsza rezerwacja nie była wypłatą.",
         "Odejmij wykorzystane dni i część; przyznaj pokrycie wyłącznie za rzeczywiście zamkniętą potrzebę.", 10, "reserve handoff continuity",
         "paternity standard-rates base", ["paternity.min_part_days", "paternity.max_parts", "paternity.notice_days", "rates.paternity"],
         {"with": ["2B", "2C"], "name": "Wykorzystana rezerwa", "check": "covers_need", "mult": "0.50"}),
    card("4F", "Własny blok taty",
         "Zaplanuj niewykorzystaną wyłączną część rodzicielskiego taty.",
         "Ojciec uprawniony, jego wyłączna część nadal dostępna, pozostałe limity i terminy zachowane; dotyczy również właściwego scenariusza przyjęcia.",
         [effect("add_block", who="father", kind="parental", start="need:father_solo", days="derived.father_exclusive_remaining")],
         "Zasiłek za wyłączny blok według właściwej stawki od podstawy ojca, także gdy drugi rodzic ma wariant uśredniony.",
         "Odejmij dni z części ojca i całej puli; nie dodawaj ich ponownie ponad pulę rodziny.", 10, "shared rights handoff",
         "parental-pool exclusive-rate parental-parts parental-docs base", ["parental.exclusive_weeks", "rates.parental"],
         {"with": ["3B"], "name": "Obie pule w grze", "check": "covers_need", "mult": "0.25"}),

    card("5A", "Spokojna adaptacja",
         "Przeznacz pozostały rodzicielski na jeden blok adaptacji.",
         "Finał planowany, właściwy rodzic ma dni i część; osiągalny wniosek, właściwy limit wieku oraz rzeczywista potrzeba.",
         [effect("add_block", who="choice.parent", kind="parental", start="need:adaptation", days="needs.adaptation.days", consume_reservation="parental")],
         "Zastąp dochód z pracy świadczeniem za blok i przelicz wariant; nie dodawaj wypłaty drugi raz za rezerwację.",
         "Pokryj konkretne dni, zużyj pulę odpowiedniego rodzica i jedną część.", 10, "reserve adaptation continuity",
         "parental-pool parental-parts parental-docs standard-rates averaged base", ["parental.max_parts", "parental.last_child_age_years", "rates.parental"],
         {"with": ["4D"], "name": "Rezerwa na później", "check": "covers_need", "mult": "0.50"}),
    card("5B", "Dwie przerwy na opiekę",
         "Rozdziel pozostały rodzicielski między dwa okresy potrzebne rodzinie.",
         "Finał planowany, dwie rzeczywiste potrzeby, wystarczające dni i co najmniej dwie wolne części w limicie rodziny; oba wnioski na czas.",
         [effect("add_block", who="choice.parent", kind="parental", start="need:adaptation", days="needs.adaptation.days", consume_reservation="parental"), effect("add_block", who="choice.parent", kind="parental", start="need:later_break", days="needs.later_break.days", consume_reservation="parental")],
         "Rozłóż świadczenie na miesiące obu bloków; oceń najniższy dochód w stałym horyzoncie.",
         "Dwa bloki pokrywają dwie potrzeby i zużywają dwie części; sprawdź sumę wniosków obojga rodziców.", 10, "flexibility adaptation reserve",
         "parental-pool parental-parts parental-docs standard-rates averaged base", ["parental.max_parts", "parental.last_child_age_years"],
         {"with": ["4D"], "name": "Rezerwa na później", "check": "covers_need", "mult": "0.50"}),
    card("5C", "Łagodny powrót do pracy",
         "Wykorzystaj rodzicielski podczas adaptacji, łącząc go z częścią etatu.",
         "Finał planowany; pracownik, dostępna pula i część, potwierdzona organizacja pracy, osiągalny termin. Cały wydłużony okres mieści się w granicach.",
         [effect("add_block", who="choice.parent", kind="parental", start="need:adaptation", days="choice.adaptation_pool_days", work_fraction="choice.work_fraction", duration_semantics="pool_before_extension", consume_reservation="parental")],
         "Przelicz część wynagrodzenia i obniżony zasiłek przez właściwy okres; nie obiecuj automatycznie wyższego łącznego dochodu.",
         "Oblicz wydłużenie i opiekę godzinową; pozostałe godziny wymagają innego opiekuna.", 10, "work adaptation flexibility",
         "part-time parental-pool parental-parts parental-docs base", ["parental.part_time_max_fraction", "deadlines.part_time_notice_days", "parental.part_time_cap_weeks_single", "parental.part_time_cap_weeks_multiple"],
         {"with": ["4C"], "name": "Długi pomost", "check": "budget_ok", "mult": "0.25"}),
    card("5D", "Mama przejmuje nagłą opiekę",
         "W kwalifikującej nagłej sytuacji zaplanuj opiekuńczy mamy.",
         "Finał nagły; zdarzenie, wiek dziecka, ubezpieczenie, osobista opieka, dostępność domowników i wspólny roczny limit sprawdzone. Nie dotyczy dowolnej zaplanowanej przerwy placówki.",
         [effect("add_care", who="mother", start="need:emergency", days="needs.emergency.days"), effect("mark_docs", bundle="care", only_if="facts.documents_available")],
         "Przelicz świadczenie od podstawy mamy i utracone wynagrodzenie; porównaj z wariantem taty.",
         "Pokryj rzeczywiste dni nagłej opieki; odejmij je ze wspólnego limitu rocznego rodziny.", 10, "emergency security handoff",
         "care-right care-money care-docs base debt", ["rates.care", "care.days_per_year_child_under_14"],
         {"with": ["4F"], "name": "Opieka we dwoje", "check": "covers_need", "mult": "0.25"}),
    card("5E", "Tata przejmuje nagłą opiekę",
         "W tej samej nagłej sytuacji zaplanuj opiekuńczy taty.",
         "Jak w wariancie mamy, ale warunki spełnia ojciec. Ta sama potrzeba i te same daty umożliwiają uczciwe porównanie kwot.",
         [effect("add_care", who="father", start="need:emergency", days="needs.emergency.days"), effect("mark_docs", bundle="care", only_if="facts.documents_available")],
         "Przelicz świadczenie od podstawy taty i utracone wynagrodzenie; suma dla rodziny może być inna mimo tej samej liczby dni.",
         "Ta sama opieka i ten sam wspólny limit; drugi rodzic nie dostaje świadczenia za te same dni.", 10, "emergency shared handoff",
         "care-right care-money care-docs base debt", ["rates.care", "care.days_per_year_child_under_14"],
         {"with": ["4A"], "name": "Zmiana warty", "check": "covers_need", "mult": "0.25"}),
    card("5F", "Nagła opieka na zmianę",
         "Podziel kwalifikującą nagłą opiekę na kolejne dni mamy i taty.",
         "Finał nagły, oboje spełniają warunki w swoich dniach; potrzeba pozwala na podział, dni są rozłączne, wspólny limit wystarcza.",
         [effect("add_care", who="mother", start="need:emergency", days="choice.emergency_mother_days"), effect("add_care", who="father", start="after:emergency:mother", days="derived.emergency_remaining_days"), effect("mark_docs", bundle="care_both", only_if="facts.documents_available")],
         "Każdy odcinek licz od podstawy jego opiekuna; bez dwóch świadczeń za ten sam dzień i bez sztucznego bonusu pieniężnego.",
         "Dwa rozłączne odcinki pokrywają jedną potrzebę; łączny limit rodziny maleje o rzeczywistą liczbę dni.", 10, "emergency shared flexibility",
         "care-right care-money care-docs base debt", ["rates.care", "care.days_per_year_child_under_14"],
         {"with": ["4A"], "name": "Drużyna w gotowości", "check": "covers_need", "mult": "0.25"}),
]


def normal(text):
    # Join words split by a PDF line break; keep genuine hyphens and punctuation.
    return re.sub(r"\s+", " ", re.sub(r"-\s*\n\s*", "", text)).strip()


def make_rules():
    manifest = {x["id"]: x for x in json.loads((LEGAL / "manifest.json").read_text())}
    result = []
    for rule_id, (summary, references) in RULES.items():
        evidence = []
        for item in references:
            document = manifest[item["document_id"]]
            assert hashlib.sha256((ROOT / document["source_file"]).read_bytes()).hexdigest() == document["sha256"], document["id"]
            raw = (ROOT / document["markdown"]).read_text()
            marker = f'<a id="{item["unit"]}"></a>'
            assert marker in raw, (rule_id, marker)
            offset = raw.index(marker)
            tail = raw[offset + len(marker):]
            # Page anchors can interrupt an article, so only stop at its next article/section.
            if item["unit"].startswith("page-"):
                segment = re.split(r'<a id="page-', tail, maxsplit=1)[0]
            else:
                segment = re.split(r'<a id="(?:article|section)-', tail, maxsplit=1)[0]
            assert normal(item["quote"]) in normal(segment), (rule_id, item["quote"])
            page_markers = re.findall(r'<a id="page-(\d+)"></a>', raw[:offset + len(marker)])
            page = int(page_markers[-1])
            page_sections = re.split(r'<a id="page-(\d+)"></a>', raw)
            quote_pages = [int(page_sections[i]) for i in range(1, len(page_sections), 2)
                           if int(page_sections[i]) >= page
                           and normal(item["quote"]) in normal(page_sections[i + 1])]
            assert quote_pages, (rule_id, "Quote must resolve to a concrete PDF page")
            evidence.append({**item, "markdown": document["markdown"],
                             "markdown_anchor": item["unit"], "pdf_page": quote_pages[0],
                             "unit_start_pdf_page": page,
                             "source_file": document["source_file"],
                             "source_sha256": document["sha256"],
                             "source_kind": "guidance" if item["document_id"] == "parents-guide" else "legislation",
                             "status": "checked_against_supplied_file"})
        result.append({"id": rule_id, "summary": summary, "evidence": evidence,
                       "version_scope": "supplied_hacknation_2026_materials",
                       "effective_from": None, "effective_to": None,
                       "production_status": "requires_temporal_review"})
        if rule_id.startswith("care-"):
            result[-1]["external_verification"] = {
                "url": "https://api.sejm.gov.pl/eli/acts/DU/2026/854/text/U/D20260854Lj.pdf",
                "checked_on": "2026-11-21", "locator": "art. 32–35, PDF pages 19–22",
                "note": "The supplied extract omits these articles. The guide is secondary evidence. "
                        "The official consolidated text also prints a future wording of art. 32 effective 2028-01-01; do not apply it early."}
    return {"schema_version": 1, "rules": result}


def make_deck(rules):
    params = json.loads((ROOT / "backend/app/data/params.json").read_text())
    rule_ids = {x["id"] for x in rules["rules"]}
    assert len(CARDS) == 30 and len({c["id"] for c in CARDS}) == 30
    assert all(sum(c["round_id"] == stage for c in CARDS) == 6 for stage in range(1, 6))
    ids = {c["id"] for c in CARDS}
    cards_by_id = {c["id"]: c for c in CARDS}
    for c in CARDS:
        assert set(c["legal_rule_ids"]) <= rule_ids
        for path in c["parameter_refs"]:
            node = params
            for key in path.split("."):
                node = node[key]
        if c["combo"]:
            assert set(c["combo"]["with"]) <= ids
            assert all(target[0] != c["id"][0] for target in c["combo"]["with"])
            for target in c["combo"]["with"]:
                partner = cards_by_id[target]["combo"]
                if partner and c["id"] in partner["with"]:
                    for field in ("name", "check", "mult"):
                        assert c["combo"][field] == partner[field], (c["id"], target, field)
        c["claims"] = [
            {"id": f'{c["id"]}.{field}', "field": field,
             "kind": "derived" if field.startswith("stats.") else "legal_interpretation",
             "rule_ids": c["legal_rule_ids"],
             "resolution": "show_relevant_rule_then_exact_unit_and_pdf"}
            for field in ["description", "conditions", "stats.money", "stats.time"]]
        # Values can be highlighted individually without matching offsets in prose.
        parameter_rules = {
            "rates.sick_pregnancy": ["sick-money"], "rates.maternity": ["standard-rates"],
            "rates.parental": ["standard-rates", "exclusive-rate"],
            "rates.averaged": ["averaged"], "rates.care": ["care-money"],
            "rates.paternity": ["standard-rates"], "rates.supplementary": ["standard-rates"],
            "rates.job_loss": ["job-loss-before"], "maternity.prebirth_max_weeks": ["prebirth"],
            "maternity.weeks_by_children": ["maternity-pool", "adoption"],
            "maternity.mother_personal_weeks": ["transfer"],
            "maternity.adoption_min_weeks": ["adoption"],
            "deadlines.averaged_request_days_after_birth": ["averaged"],
            "deadlines.part_time_notice_days": ["part-time"],
            "deadlines.supplementary_notice_days_before_maternity_end": ["supplementary"],
            "payer_threshold_insured": ["payer"], "contribution_deduction": ["base"],
            "debt_threshold_pct_min_wage": ["debt"], "parental_benefit_floor": ["floor"],
        }
        def rules_for_parameter(path, parameter_rules=parameter_rules):
            if path in parameter_rules:
                return parameter_rules[path]
            if path.startswith("paternity."):
                return ["paternity"]
            if path.startswith("supplementary."):
                return ["supplementary"]
            if path.startswith("sick.waiting"):
                return ["sick-right"]
            if path.startswith("sick."):
                return ["sick-money"]
            if path.startswith("care."):
                return ["care-money"]
            if path.startswith("parental.part_time"):
                return ["part-time"]
            if path.startswith("parental.weeks_za"):
                return ["za-zyciem"]
            if path == "parental.exclusive_weeks":
                return ["parental-pool", "exclusive-rate"]
            if path.startswith("parental."):
                return ["parental-parts"]
            raise ValueError(f"No legal mapping for parameter {path}")
        c["claims"] += [{"id": f'{c["id"]}.param.{path}', "field": f"parameter:{path}",
                         "kind": "legal_parameter", "parameter_ref": path,
                         "rule_ids": rules_for_parameter(path)} for path in c["parameter_refs"]]
        c["claims"].append({"id": f'{c["id"]}.happiness', "field": "stats.happiness",
                            "kind": "game_design", "rule_ids": [],
                            "explanation": "Punktacja autorska, bez podstawy prawnej."})
    return {"schema_version": 1, "status": "design_only_not_runtime_deck",
            "hand_size": 3, "rounds": 5, "cards_per_round": 6,
            "legal_rules_file": "shared/legal-rules.json",
            "parameters_file": "backend/app/data/params.json", "cards": CARDS}


def rule_link(rule_id, prefix="Documents/legal/"):
    return f"[{rule_id}]({prefix}rules.md#{rule_id})"


def render_cards(deck):
    lines = ["# Talia 30 kart — projekt mechaniki", "",
             ("Po sześć kart na etap, trzy w ręce, jedna decyzja na rundę. To specyfikacja do wdrożenia silnika; "
             "plansza pozwala przeglądać i rozdawać 30 kart, a backendowy katalog pozostaje na 15 kartach do czasu wdrożenia silnika. Dane projektu: "
             "[deck-design.json](shared/deck-design.json). Zasady wspólne i tryby: "
             "[projekt działania](docs/card-grounding.md)."), "",
             ("Pieniądze i czas są wyliczane z planu, nigdy dodawane jako stały bonus. "
             "Szczęście to punkty gry. Zerowy wpływ decyzji formalnej na pieniądze lub czas jest poprawny. "
             "Wartości ustawowe są odczytywane przez referencje do parametrów, a nie utrzymywane w treści kart."), ""]
    names = ["Ciąża / przygotowanie do przyjęcia", "Poród / przyjęcie", "Pierwszy miesiąc", "Pierwszy rok", "Kolejne lata"]
    for stage, name in enumerate(names, 1):
        lines += [f"## {stage}. {name}", ""]
        for c in [x for x in deck["cards"] if x["round_id"] == stage]:
            lines += [f'<a id="{c["id"].lower()}"></a>', f'### {c["id"]} · {c["title"]}', "",
                      c["description"], "", f'**Kiedy:** {c["conditions"]}', "",
                      f'**Pieniądze:** {c["stats"]["money"]["explanation"]}', "",
                      f'**Czas:** {c["stats"]["time"]["explanation"]}', "",
                      f'**Szczęście:** {c["stats"]["happiness"]["chips"]} bazowych punktów za poprawnie zrealizowaną decyzję. ' +
                      "Punkty są autorską mechaniką gry.", "", "**Zmiana stanu:**", "", "```json",
                      json.dumps(c["effects"], ensure_ascii=False, indent=2), "```", "",
                      "**Podstawy:** " + ", ".join(rule_link(r) for r in c["legal_rule_ids"]) + ".", "",
                      "**Parametry:** " + (", ".join(f'`{p}`' for p in c["parameter_refs"]) or "wymagają uzupełnienia przed wdrożeniem") + ".", ""]
            if c["combo"]:
                combo = c["combo"]
                targets = ", ".join(f'[{x}](#{x.lower()})' for x in combo["with"])
                lines += [(f'**Combo:** {combo["name"]}; partnerzy: {targets}; warunek `{combo["check"]}`; '
                          f'bonus mnożnika `{combo["mult"]}` po sprawdzeniu rzeczywistego planu.'), ""]
            if c["notes"]:
                lines += [f'**Warunek wdrożenia:** {c["notes"]}', ""]
    return "\n".join(lines)


def render_rules(data):
    lines = ["# Reguły prawne użyte w kartach", "",
             ("Rejestr łączy interpretację z dokładnym fragmentem dostarczonego pliku. Cytaty są "
             "sprawdzane automatycznie w odpowiednim artykule, paragrafie lub stronie. "
             "Nie oznacza to zatwierdzenia przez prawnika ani potwierdzenia aktualności na każdy dzień planu. "
             "Zobacz [zakres i wersje](README.md)."), ""]
    for rule in data["rules"]:
        lines += [f'<a id="{rule["id"]}"></a>', f'## {rule["id"]}', "", rule["summary"], ""]
        for e in rule["evidence"]:
            path = Path(e["markdown"]).name
            pdf = quote("../../" + e["source_file"]) + f'#page={e["pdf_page"]}'
            lines += [(f'- **{e["locator"]}** — [pełny fragment]({path}#{e["markdown_anchor"]}), '
                      f'[oryginał, strona PDF {e["pdf_page"]}]({pdf}).'), "",
                      f'> {e["quote"]}', ""]
    return "\n".join(lines)


def check_links(paths):
    count = 0
    for path in paths:
        for href in re.findall(r"\[[^\]]*\]\(([^)]+)\)", path.read_text()):
            if re.match(r"[a-z]+://", href):
                continue
            local, _, anchor = unquote(href).partition("#")
            target = (path.parent / local).resolve() if local else path
            assert target.exists(), (path, href)
            if anchor and target.suffix == ".md":
                assert f'<a id="{anchor}"></a>' in target.read_text(), (path, href)
            count += 1
    return count


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    rules = make_rules()
    deck = make_deck(rules)
    for path in LEGAL.glob("*.md"):
        anchors = re.findall(r'<a id="([^"]+)"></a>', path.read_text())
        assert len(anchors) == len(set(anchors)), f"Duplicate anchors: {path}"
    for c in deck["cards"]:
        for claim in c["claims"]:
            assert set(claim["rule_ids"]) <= {r["id"] for r in rules["rules"]}
    outputs = {
        ROOT / "shared/legal-rules.json": json.dumps(rules, ensure_ascii=False, indent=2) + "\n",
        ROOT / "shared/deck-design.json": json.dumps(deck, ensure_ascii=False, indent=2) + "\n",
        ROOT / "cards-30.md": render_cards(deck),
        LEGAL / "rules.md": render_rules(rules),
    }
    for path, content in outputs.items():
        if args.check:
            assert path.read_text() == content, f"Stale generated artifact: {path}"
        else:
            path.write_text(content, encoding="utf-8")
    links = check_links([ROOT / "cards-30.md", LEGAL / "rules.md", LEGAL / "README.md",
                         ROOT / "docs/card-grounding.md", *[LEGAL / f"{key}.md" for key in
                         ("labour-code", "benefits-act", "benefit-documents", "leave-applications",
                          "parents-guide", "benefits-table")]])
    print(f"Validated {len(CARDS)} cards, six per stage, {len(rules['rules'])} grounded rules, "
          f"{links} local links, parameter paths, evidence excerpts and cross-round combos.")


if __name__ == "__main__":
    main()
