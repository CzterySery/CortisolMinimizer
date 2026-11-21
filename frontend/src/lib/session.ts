// Simulated mObywatel session, admin token and calculator handoff. sessionStorage can throw
// (private mode, blocked storage), so every access is guarded and the app works without it.
function read(key: string): string | undefined {
  try { return sessionStorage.getItem(key) ?? undefined; } catch { return undefined; }
}

function write(key: string, value?: string) {
  try {
    if (value === undefined) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch { /* storage unavailable: feature degrades to "not remembered" */ }
}

const slot = (key: string) => ({ get: () => read(key), set: (v?: string) => write(key, v) });

export const userToken = slot("zp.user");
export const adminToken = slot("zp.admin");

// "Otwórz w kalkulatorze": the end-of-game plan travels to /calculator once.
export const planHandoff = {
  put: (plan: unknown) => write("zp.plan", JSON.stringify(plan)),
  take: (): unknown => {
    const raw = read("zp.plan");
    write("zp.plan");
    return raw ? JSON.parse(raw) : undefined;
  },
};

export const adminHeaders = () => ({ Authorization: `Bearer ${adminToken.get() ?? ""}` });
