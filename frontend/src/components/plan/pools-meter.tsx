import { Fragment } from "react";
import type { S } from "@/lib/api";

// Remaining leave. Limits are never hardcoded here: they come from admin-editable params on the backend.
export function PoolsMeter({ pools }: { pools: S["Pools"] }) {
  const rows: [string, string][] = [
    ["Urlop macierzyński", `${pools.maternity_days_left} dni`],
    ["Rodzicielski (wspólna pula)", `${pools.parental_days_left} dni`],
    ["Wyłączna część mamy", `${pools.exclusive_days_left.mother ?? 0} dni`],
    ["Wyłączna część taty", `${pools.exclusive_days_left.father ?? 0} dni`],
    ["Urlop ojcowski", `${pools.paternity_days_left} dni`],
    ["Wykorzystane części rodzicielskiego", `${pools.parental_parts_used}`],
    ["Zasiłek opiekuńczy w tym roku", `${pools.care_days_left} dni`],
  ];
  return (
    <dl className="pools">
      {rows.map(([label, value]) => <Fragment key={label}><dt>{label}</dt><dd>{value}</dd></Fragment>)}
    </dl>
  );
}
