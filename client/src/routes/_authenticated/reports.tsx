import { MonthFilter, ALL_MONTHS, currentMonth, inMonth, prevMonth, monthRange } from "@/components/MonthFilter";
import { useCribs } from "@/lib/units";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLedger, cribOfPayment } from "@/lib/derive";
import { downloadCsv, money, todayISO } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Cribs Manager" },
      { name: "description", content: "Income, expenses and profit compared across all four cribs." },
      { property: "og:title", content: "Reports — Cribs Manager" },
      { property: "og:description", content: "Income, expenses and profit compared across all four cribs." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const CRIBS = useCribs();
  const { bookings, payments, expenses } = useLedger();
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  const [from, setFrom] = useState(firstOfMonth.toISOString().slice(0, 10));
  const [to, setTo] = useState(todayISO());

  const perCrib = useMemo(() => {
    const inRange = (d: string) => d >= from && d <= to;
    const sharedTotal = expenses
      .filter((e) => e.crib === "all" && inRange(e.spent_on))
      .reduce((s, e) => s + e.amount, 0);
    return CRIBS.map((c) => {
      const income = payments
        .filter((p) => inRange(p.paid_on) && cribOfPayment(p, bookings) === c.id)
        .reduce((s, p) => s + p.amount, 0);
      const spend =
        expenses
          .filter((e) => e.crib === c.id && inRange(e.spent_on))
          .reduce((s, e) => s + e.amount, 0) + sharedTotal / Math.max(1, CRIBS.length);
      return { crib: c.name, income, expenses: spend, net: income - spend };
    });
  }, [CRIBS, bookings, payments, expenses, from, to]);

  const totals = perCrib.reduce(
    (acc, r) => ({
      income: acc.income + r.income,
      expenses: acc.expenses + r.expenses,
      net: acc.net + r.net,
    }),
    { income: 0, expenses: 0, net: 0 },
  );

  const best = [...perCrib].sort((a, b) => b.net - a.net)[0];
  const costliest = [...perCrib].sort((a, b) => b.expenses - a.expenses)[0];

  const exportCsv = () => {
    downloadCsv(`cribs-report-${from}-to-${to}.csv`, [
      ["Crib", "Income (KES)", "Expenses (KES)", "Net (KES)"],
      ...perCrib.map((r) => [r.crib, Math.round(r.income), Math.round(r.expenses), Math.round(r.net)]),
      ["TOTAL", Math.round(totals.income), Math.round(totals.expenses), Math.round(totals.net)],
    ]);
  };

  return (
    <AppShell
      title="Reports"
      description={`${from} to ${to}`}
      actions={
        <Button size="sm" variant="outline" onClick={exportCsv}>
          <Download className="size-4" /> Export CSV
        </Button>
      }
    >
      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-3 lg:w-3/4">
          <div className="space-y-1.5">
            <Label className="text-xs">Month</Label>
            <MonthFilter
              value={from.slice(0, 7) === to.slice(0, 7) && monthRange(from.slice(0, 7)).from === from ? from.slice(0, 7) : ALL_MONTHS}
              onChange={(m) => {
                if (m === ALL_MONTHS) { setFrom("2000-01-01"); setTo(todayISO()); return; }
                const r = monthRange(m); setFrom(r.from); setTo(r.to);
              }}
              className="w-full"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Income</p>
            <p className="numeric mt-2 text-2xl font-semibold">{money(totals.income)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Expenses</p>
            <p className="numeric mt-2 text-2xl font-semibold">{money(totals.expenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Net profit</p>
            <p
              className={`numeric mt-2 text-2xl font-semibold ${totals.net >= 0 ? "text-success" : "text-destructive"}`}
            >
              {money(totals.net)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Crib comparison</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={perCrib} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="crib" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={70} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" name="Income" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="net" name="Net" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="mt-4 overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Crib</th>
                <th className="px-4 py-3 text-right font-medium">Income</th>
                <th className="px-4 py-3 text-right font-medium">Expenses</th>
                <th className="px-4 py-3 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody>
              {perCrib.map((r) => (
                <tr key={r.crib} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{r.crib}</td>
                  <td className="numeric px-4 py-3 text-right">{money(r.income)}</td>
                  <td className="numeric px-4 py-3 text-right">{money(r.expenses)}</td>
                  <td
                    className={`numeric px-4 py-3 text-right ${r.net >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {money(r.net)}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-border bg-muted/40 font-medium">
                <td className="px-4 py-3">Total</td>
                <td className="numeric px-4 py-3 text-right">{money(totals.income)}</td>
                <td className="numeric px-4 py-3 text-right">{money(totals.expenses)}</td>
                <td className="numeric px-4 py-3 text-right">{money(totals.net)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-4 text-sm text-muted-foreground">
        Most profitable in this range: <span className="font-medium text-foreground">{best?.crib}</span> ·
        Highest expenses: <span className="font-medium text-foreground">{costliest?.crib}</span>
      </p>
    </AppShell>
  );
}
