import { useCribs } from "@/lib/units";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLedger } from "@/lib/derive";
import { todayISO } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Occupancy calendar — Cribs Manager" },
      { name: "description", content: "Month view of which cribs are booked or free, side by side." },
      { property: "og:title", content: "Occupancy calendar — Cribs Manager" },
      { property: "og:description", content: "Month view of which cribs are booked or free, side by side." },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const CRIBS = useCribs();
  const { bookings } = useLedger();
  const [offset, setOffset] = useState(0);
  const base = new Date();
  const month = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(month.getFullYear(), month.getMonth(), i + 1);
    return d.toISOString().slice(0, 10);
  });
  const today = todayISO();

  return (
    <AppShell
      title="Occupancy calendar"
      description={month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
      actions={
        <>
          <Button variant="outline" size="icon" onClick={() => setOffset(offset - 1)} aria-label="Previous month">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setOffset(0)}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => setOffset(offset + 1)} aria-label="Next month">
            <ChevronRight className="size-4" />
          </Button>
        </>
      }
    >
      <Card className="overflow-hidden p-0">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium">Unit</th>
                {days.map((d) => (
                  <th
                    key={d}
                    className={`w-7 px-0 py-2 text-center font-normal text-muted-foreground ${d === today ? "text-primary" : ""}`}
                  >
                    {Number(d.slice(-2))}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CRIBS.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-card px-3 py-2">
                    <Link to="/crib/$cribId" params={{ cribId: c.id }} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                    <span className="ml-1 text-muted-foreground">{c.floor}</span>
                  </td>
                  {days.map((d) => {
                    const b = bookings.find(
                      (x) => x.crib === c.id && x.check_in <= d && d < x.check_out,
                    );
                    return (
                      <td key={d} className="p-0.5">
                        <div
                          title={b ? `${b.tenant_name} (${b.check_in} → ${b.check_out})` : "Free"}
                          className={`h-6 rounded-sm ${
                            b
                              ? b.status === "paid"
                                ? "bg-success/70"
                                : b.status === "partial"
                                  ? "bg-warning/70"
                                  : "bg-destructive/60"
                              : "bg-muted"
                          } ${d === today ? "ring-2 ring-primary" : ""}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <Legend className="bg-success/70" label="Booked · paid" />
        <Legend className="bg-warning/70" label="Booked · part paid" />
        <Legend className="bg-destructive/60" label="Booked · unpaid" />
        <Legend className="bg-muted" label="Free" />
      </div>
    </AppShell>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`inline-block h-3 w-6 rounded-sm ${className}`} />
      {label}
    </span>
  );
}
