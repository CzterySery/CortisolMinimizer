// Backend sends money as decimal strings so grosze stay exact. Format here, never do money math on the client.
const plnFormat = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });

export const pln = (v: string | number) => plnFormat.format(Number(v));
export const day = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("pl-PL");
export const month = (ym: string) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString("pl-PL", { month: "short", year: "numeric" });
