import type { S } from "@/lib/api";
import { day } from "@/lib/format";
import { kindLabel, whoLabel } from "@/lib/labels";

// One lane per parent on a shared time axis. Next: colour per leave kind + legend + gap markers.
export function CareCalendar({ calendar }: { calendar: S["CalendarEntry"][] }) {
  if (!calendar.length) return <p className="muted">Brak zaplanowanych urlopów.</p>;
  const t = (d: string) => new Date(d).getTime();
  const from = Math.min(...calendar.map((c) => t(c.start)));
  const span = Math.max(1, Math.max(...calendar.map((c) => t(c.end))) - from);

  return (
    <div className="care-lanes">
      {(["mother", "father"] as const).map((who) => (
        <div key={who} className="care-lane">
          <span className="care-lane-label">{whoLabel[who]}</span>
          <div className="care-track">
            {calendar.filter((c) => c.who === who).map((c, i) => (
              <span key={i} className="care-block" title={`${kindLabel[c.kind]}: ${day(c.start)}–${day(c.end)}`}
                    style={{ left: `${((t(c.start) - from) / span) * 100}%`, width: `${((t(c.end) - t(c.start)) / span) * 100}%` }} />
            ))}
          </div>
        </div>
      ))}
      <ul className="sr-only">
        {calendar.map((c, i) => <li key={i}>{whoLabel[c.who]}: {kindLabel[c.kind]} od {day(c.start)} do {day(c.end)}</li>)}
      </ul>
    </div>
  );
}
