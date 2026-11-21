import type { S } from "./api";

// Polish UI labels for backend enums. Keyed by the generated types, so a new enum value fails typecheck here.
export const kindLabel: Record<S["Block-Output"]["kind"], string> = {
  sick: "Zwolnienie lekarskie",
  rehab: "Świadczenie rehabilitacyjne",
  job_loss_benefit: "Zasiłek po utracie pracy",
  maternity: "Urlop macierzyński",
  supplementary: "Uzupełniający urlop macierzyński",
  paternity: "Urlop ojcowski",
  parental: "Urlop rodzicielski",
  care: "Zasiłek opiekuńczy",
  vacation: "Urlop wypoczynkowy",
};

export const whoLabel: Record<S["Block-Output"]["who"], string> = { mother: "Mama", father: "Tata" };

export const employmentLabel: Record<S["Parent-Output"]["employment"], string> = {
  employee: "Umowa o pracę",
  contract: "Umowa zlecenie",
  self_employed: "Działalność gospodarcza",
  none: "Brak tytułu do ubezpieczenia",
};

export const recipientLabel: Record<S["Document"]["recipient"], string> = {
  employer: "Pracodawca",
  zus: "ZUS",
  usc: "Urząd stanu cywilnego",
};
