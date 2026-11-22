import type { CSSProperties, ReactNode } from "react";

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="page-header">
      <h1 style={{ "--heading-length": `${title}`.length } as CSSProperties}>{title}</h1>
      {children && <p className="lead">{children}</p>}
    </header>
  );
}
