import { RangeFilter, inRange, rangeLabel, thisMonthRange, prevRange, type DateRange } from "@/components/MonthFilter";
import { useCribs } from "@/lib/units";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingDialog } from "@/components/BookingDialog";
import { BookingRowActions } from "@/components/BookingRowActions";
import { ExpenseDialog } from "@/components/ExpenseDialog";
import { OccupancyTag, StatusTag, StayTag } from "@/components/StatusTag";
import { useLedger, cribOfPayment } from "@/lib/derive";
import { money, monthKey, monthLabel } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/crib/$cribId")({
  head: () => ({
    meta: [
      { title: "Crib overview — Cribs Manager" },
      { name: "description", content: "Booking history, income, expenses and occupancy for a single unit." },
      { property: "og:title", content: "Crib overview — Cribs Manager" },
      { property: "og:description", content: "Booking history, income, expenses and occupancy for a single unit." },
    ],
  }),
  component: CribPage,
});

function CribPage() {
  const CRIBS = useCribs();
  const { cribId } = Route.useParams();
  const { bookings, payments, expenses, isLoading } = useLedger();
  const [addBooking, setAddBooking] = useState(false);
  const [addExpense, setAddExpense] = useState(false);
  const [range, setRange] = useState<DateRange>({ from: "", to: "" });

  const crib = CRIBS.find((c) => c.id === cribId);
  const rows = bookings.filter((b) => b.crib === cribId);
  const income = payments
    .filter((p) => inRange(p.paid_on, range) && cribOfPayment(p, bookings) === cribId)
    .reduce((s, p) => s + p.amount, 0);
  const direct = expenses.filter((e) => e.crib === cribId && inRange(e.spent_on, range)).reduce((s, e) => s + e.amount, 0);
  const shared = expenses.filter((e) => e.crib === "all" && inRange(e.spent_on, range)).reduce((s, e) => s + e.amount, 0) / Math.max(1, CRIBS.length);
  const spend = direct + shared;
  const current = rows.find((b) => b.occupiedNow);

  const months: { key: string; label: string; income: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    months.push({
      key,
      label: monthLabel(key),
      income: payments
        .filter((p) => cribOfPayment(p, bookings) === cribId && monthKey(p.paid_on) === key)
        .reduce((s, p) => s + p.amount, 0),
    });
  }

  if (!crib) {
    return (
      <AppShell title="Unknown crib">
        <Link to="/dashboard" className="text-sm text-primary hover:underline">
          Back to dashboard
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`${crib.name} · ${crib.floor}`}
      description={`Unit history and performance · ${rangeLabel(range)}`}
      actions={
        <>
          <RangeFilter value={range} onChange={setRange} />
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
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Status today</p>
                <div className="mt-2">
                  <OccupancyTag occupied={!!current} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {current ? `${current.tenant_name} until ${current.check_out}` : "Available now"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{!range.from && !range.to ? "Income to date" : "Income in period"}</p>
                <p className="numeric mt-2 text-2xl font-semibold">{money(income)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{!range.from && !range.to ? "Expenses to date" : "Expenses in period"}</p>
                <p className="numeric mt-2 text-2xl font-semibold">{money(spend)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Includes {money(shared)} shared</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Net</p>
                <p
                  className={`numeric mt-2 text-2xl font-semibold ${income - spend >= 0 ? "text-success" : "text-destructive"}`}
                >
                  {money(income - spend)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Monthly income (last 12 months)</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={months} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={70} />
                  <Tooltip formatter={(v: number) => money(v)} />
                  <Bar dataKey="income" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Tenant</th>
                    <th className="px-4 py-3 font-medium">Dates</th>
                    <th className="px-4 py-3 font-medium">Stay</th>
                    <th className="px-4 py-3 text-right font-medium">Paid</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-2 py-3 font-medium"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        No bookings for this unit yet.
                      </td>
                    </tr>
                  )}
                  {rows.map((b) => (
                    <tr key={b.id} className="border-t border-border hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <Link
                          to="/bookings/$bookingId"
                          params={{ bookingId: b.id }}
                          className="font-medium hover:underline"
                        >
                          {b.tenant_name}
                        </Link>
                      </td>
                      <td className="numeric px-4 py-3 text-muted-foreground">
                        {b.check_in} → {b.check_out}
                      </td>
                      <td className="px-4 py-3">
                        <StayTag type={b.stay} />
                      </td>
                      <td className="numeric px-4 py-3 text-right">{money(b.paid)}</td>
                      <td className="px-4 py-3">
                        <StatusTag status={b.status} />
                      </td>
                      <td className="px-2 py-3 text-right">
                        <BookingRowActions booking={b} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      <BookingDialog open={addBooking} onOpenChange={setAddBooking} defaultCrib={cribId} />
      <ExpenseDialog open={addExpense} onOpenChange={setAddExpense} defaultCrib={cribId} />
    </AppShell>
  );
}
