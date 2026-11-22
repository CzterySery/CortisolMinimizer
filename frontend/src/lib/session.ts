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

// A full browser refresh should discard the cached calculator checklist so /me cannot
// resurrect an outdated plan. SPA navigation keeps the freshly prepared plan available.
function clearPlanCacheAfterReload() {
  if (typeof window === "undefined") return;
  const navigation = window.performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (navigation?.type !== "reload") return;
  try { window.sessionStorage.removeItem("otwartekarty.myplan"); } catch { /* storage may be unavailable */ }
}

clearPlanCacheAfterReload();

const slot = (key: string) => ({ get: () => read(key), set: (v?: string) => write(key, v) });

export const userToken = slot("otwartekarty.user");
export const adminToken = slot("otwartekarty.admin");
export const savedGame = slot("otwartekarty.game.v1");
export const applicationReceipts = slot("otwartekarty.receipts.v1");

// The plan the user built in the calculator, read by /me (their own case, never a game result).
export const myPlan = {
  put: (plan: unknown) => write("otwartekarty.myplan", JSON.stringify(plan)),
  clear: () => write("otwartekarty.myplan"),
  get: (): unknown => {
    try { return JSON.parse(read("otwartekarty.myplan") ?? "null") ?? undefined; } catch { return undefined; }
  },
};

// "Otwórz w kalkulatorze": the finished game's sample plan travels to /calculator once.
export const planHandoff = {
  put: (plan: unknown) => write("otwartekarty.plan", JSON.stringify(plan)),
  take: (): unknown => {
    const raw = read("otwartekarty.plan");
    write("otwartekarty.plan");
    return raw ? JSON.parse(raw) : undefined;
  },
};

export const adminHeaders = () => ({ Authorization: `Bearer ${adminToken.get() ?? ""}` });
