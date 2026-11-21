import createClient from "openapi-fetch";
import type { components, paths } from "./schema";

// Types come from the backend's /openapi.json: run `npm run gen:api` after changing backend schemas.
export type S = components["schemas"];

// Browser: same-origin /api/v1/* goes through the Next proxy (src/app/api/v1/[...path]/route.ts),
// so the backend address never reaches the client. Server: straight to API_URL.
export const api = createClient<paths>({
  baseUrl: typeof window === "undefined" ? (process.env.API_URL ?? "").replace(/\/$/, "") : "",
});
