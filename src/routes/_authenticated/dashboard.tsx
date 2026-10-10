import { RangeFilter, inRange, rangeLabel, thisMonthRange, prevRange, type DateRange } from "@/components/MonthFilter";
import { useCribs } from "@/lib/units";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingDialog } from "@/components/BookingDialog";
import { ExpenseDialog } from "@/components/ExpenseDialog";
import { OccupancyTag, StatusTag } from "@/components/StatusTag";
import { useLedger, cribOfPayment, paymentReminders } from "@/lib/derive";
import { cribName, money, monthKey, monthLabel, todayISO } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Cribs Manager" },
      { name: "description", content: "Income, expenses and occupancy across the four cribs at a glance." },
      { property: "og:title", content: "Dashboard — Cribs Manager" },
      { property: "og:description", content: "Income, expenses and occupancy across the four cribs at a glance." },
    ],
  }),
  component: Dashboard,
});

function Stat({
  label,
  value,
  previous,
  tone = "neutral",
}: {
  label: string;
  value: number;
  previous?: number;
  tone?: "neutral" | "good" | "bad";
}) {
  const diff = previous === undefined ? null : value - previous;
  const up = (diff ?? 0) >= 0;
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p
          className={`numeric mt-2 text-2xl font-semibold tracking-tight ${
            tone === "good" ? "text-success" : tone === "bad" ? "text-destructive" : ""
          }`}
        >
          {money(value)}
        </p>
        {diff !== null && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            {money(Math.abs(diff))} vs previous period
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const CRIBS = useCribs();
  const { bookings, payments, expenses, isLoading } = useLedger();
  const [addBooking, setAddBooking] = useState(false);
  const [addExpense, setAddExpense] = useState(false);

  const [range, setRange] = useState<DateRange>(thisMonthRange());
  const r = { from: range.from || "2000-01-01", to: range.to || todayISO() };
  const prev = prevRange(r);
  const isCurrent = range.from === thisMonthRange().from && range.to === thisMonthRange().to;
  const suffix = isCurrent ? "this month" : "in period";

  const incomeIn = (m: DateRange) =>
    payments.filter((p) => inRange(p.paid_on, m)).reduce((s, p) => s + p.amount, 0);
  const expenseIn = (m: DateRange) =>
    expenses.filter((e) => inRange(e.spent_on, m)).reduce((s, e) => s + e.amount, 0);

  const income = incomeIn(r);
  const spend = expenseIn(r);

  const perCrib = CRIBS.map((c) => {
    const inc = payments
      .filter((p) => inRange(p.paid_on, r) && cribOfPayment(p, bookings) === c.id)
      .reduce((s, p) => s + p.amount, 0);
    const shared = expenses.filter((e) => e.crib === "all" && inRange(e.spent_on, r)).reduce((s, e) => s + e.amount, 0) / Math.max(1, CRIBS.length);
    const exp = expenses.filter((e) => e.crib === c.id && inRange(e.spent_on, r)).reduce((s, e) => s + e.amount, 0) + shared;
    const current = bookings.find((b) => b.crib === c.id && b.occupiedNow);
    return { ...c, inc, exp, net: inc - exp, current };
  });

  const today = todayISO();
  const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const upcoming = [
    ...bookings
      .filter((b) => b.check_in >= today && b.check_in <= weekAhead)
      .map((b) => ({ b, kind: "Check-in" as const, date: b.check_in })),
    ...bookings
      .filter((b) => b.check_out >= today && b.check_out <= weekAhead)
      .map((b) => ({ b, kind: "Check-out" as const, date: b.check_out })),
  ].sort((a, z) => (a.date < z.date ? -1 : 1));

  const unpaid = bookings.filter((b) => b.remaining > 0 && b.check_out >= today);
  const reminders = paymentReminders(bookings).filter((r) => r.row.stay === "long").slice(0, 5);

  return (
    <AppShell
      title="Dashboard"
      description="Today's position across all four units"
      actions={
        <>
          <RangeFilter value={range} onChange={setRange} clearable={false} />
          <Button variant="outline" size="sm" onClick={() => setAddExpense(true)}>
            <Plus className="size-4" /> Expense
          </Button>
          <Button size="sm" onClick={() => setAddBooking(true)}>
            <Plus className="size-4" /> Booking
          </Button>
        </>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label={`Income ${suffix}`} value={income} previous={incomeIn(prev)} />
            <Stat label={`Expenses ${suffix}`} value={spend} previous={expenseIn(prev)} />
            <Stat
              label={`Net ${suffix}`}
              value={income - spend}
              tone={income - spend >= 0 ? "good" : "bad"}
            />
            <Stat
              label="Outstanding balances"
              value={unpaid.reduce((s, b) => s + b.remaining, 0)}
              tone={unpaid.length ? "bad" : "neutral"}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Occupancy right now</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {perCrib.map((c) => (
                  <Link
                    key={c.id}
                    to="/crib/$cribId"
                    params={{ cribId: c.id }}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 transition-colors hover:bg-muted/60"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {c.name} <span className="text-xs text-muted-foreground">{c.floor}</span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.current ? `${c.current.tenant_name} until ${c.current.check_out}` : "No tenant today"}
                      </p>
                    </div>
                    <OccupancyTag occupied={!!c.current} />
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Next 7 days</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcoming.length === 0 && (
                  <p className="text-sm text-muted-foreground">No check-ins or check-outs coming up.</p>
                )}
                {upcoming.map((u, i) => (
                  <Link
                    key={i}
                    to="/bookings/$bookingId"
                    params={{ bookingId: u.b.id }}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/60"
                  >
                    <span className="min-w-0 truncate">
                      <span className="font-medium">{u.b.tenant_name}</span>
                      <span className="text-muted-foreground"> · {cribName(u.b.crib)}</span>
                    </span>
                    <span className="numeric shrink-0 text-xs text-muted-foreground">
                      {u.kind} {u.date}
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Net profit per crib (all time)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {perCrib.map((c) => (
                <div key={c.id} className="rounded-md border border-border p-3">
                  <p className="text-sm font-medium">{c.name}</p>
                  <p
                    className={`numeric mt-1 text-lg font-semibold ${c.net >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {money(c.net)}
                  </p>
                  <p className="numeric mt-1 text-xs text-muted-foreground">
                    In {money(c.inc)} · Out {money(c.exp)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {reminders.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Next payments due (long-term tenants)</CardTitle>
                <Button asChild variant="link" size="sm" className="h-auto justify-start p-0"><Link to="/reminders">View all upcoming payments</Link></Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {reminders.map(({ row, nextDue }) => (
                  <Link
                    key={row.id}
                    to="/bookings/$bookingId"
                    params={{ bookingId: row.id }}
                    className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/60"
                  >
                    <span className="min-w-0 truncate">
                      <span className="font-medium">{row.tenant_name}</span>
                      <span className="text-muted-foreground"> · {cribName(row.crib)}</span>
                    </span>
                    <span
                      className={`numeric shrink-0 text-xs ${nextDue <= today ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      Due {nextDue} · {money(row.remaining)} unpaid
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {unpaid.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="size-4 text-warning" /> Balances to chase
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {unpaid.map((b) => (
                  <Link
                    key={b.id}
                    to="/bookings/$bookingId"
                    params={{ bookingId: b.id }}
                    className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/60"
                  >
                    <span className="min-w-0 truncate">
                      <span className="font-medium">{b.tenant_name}</span>
                      <span className="text-muted-foreground"> · {cribName(b.crib)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <StatusTag status={b.status} />
                      <span className="numeric text-destructive">{money(b.remaining)}</span>
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <BookingDialog open={addBooking} onOpenChange={setAddBooking} />
      <ExpenseDialog open={addExpense} onOpenChange={setAddExpense} />
    </AppShell>
  );
}
