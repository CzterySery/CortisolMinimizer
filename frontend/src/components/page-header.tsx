import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, accent, children }: { eyebrow: string; title: string; accent?: string; children?: ReactNode }) {
  return (
    <header className="page-header">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}{accent && <> <span>{accent}</span></>}</h1>
      {children && <p className="lead">{children}</p>}
    </header>
  );
}
