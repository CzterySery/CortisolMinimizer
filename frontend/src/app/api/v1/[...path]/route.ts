// Same-origin proxy to FastAPI. Keeps API_URL server-side (no CORS, no backend address in the bundle)
// and is read at runtime, so one Docker image works against any backend.
const FORWARD_HEADERS = ["accept", "authorization", "content-type"];

async function proxy(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const base = process.env.API_URL?.replace(/\/$/, "");
  if (!base) {
    return Response.json({ detail: "Brak API_URL: frontend działa tylko w trybie podglądu planszy." }, { status: 503 });
  }

  const { path } = await params;
  const target = `${base}/api/v1/${path.map(encodeURIComponent).join("/")}${new URL(request.url).search}`;
  const headers = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    // Only content-type is copied: fetch already decoded the body, so content-encoding/length would lie.
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return Response.json({ detail: "API nie odpowiada." }, { status: 502 });
  }
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE };
