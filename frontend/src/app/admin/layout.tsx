"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { adminToken } from "@/lib/session";

// Admin area (brief: change rates/durations/deck without a deploy). Token lives in sessionStorage for this tab.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (input.current) input.current.value = adminToken.get() ?? ""; }, []);

  return (
    <main className="page">
      <div className="admin-bar">
        <nav className="subnav" aria-label="Panel administracyjny">
          <Link href="/admin">Parametry</Link>
          <Link href="/admin/deck">Talia kart</Link>
          <Link href="/admin/submissions">Złożone wnioski</Link>
        </nav>
        <input ref={input} type="password" placeholder="Token admina" aria-label="Token admina"
               onChange={(e) => adminToken.set(e.target.value || undefined)} />
      </div>
      {children}
    </main>
  );
}
