import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Building2, Download, Eye } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RangeFilter, inRange, rangeLabel, thisMonthRange, type DateRange } from "@/components/MonthFilter";
import { useLedger } from "@/lib/derive";
import { useCribs } from "@/lib/units";
import { downloadCsv, money } from "@/lib/domain";
import { unitFinances } from "@/lib/unit-finances";
import { UnitFinanceDetails } from "@/components/UnitFinanceDetails";

export const Route = createFileRoute("/_authenticated/balances")({
  head: () => ({
    meta: [
      { title: "Unit balances — Cribs Manager" },
      { name: "description", content: "Income, expenses by category and balance for each unit, month by month." },
      { property: "og:title", content: "Unit balances — Cribs Manager" },
      { property: "og:description", content: "Income, expenses by category and balance for each unit, month by month." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BalancesPage,
});

function BalancesPage() {
  const CRIBS = useCribs();
  const { bookings, payments, expenses, isLoading } = useLedger();
  const [range, setRange] = useState<DateRange>(thisMonthRange());
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

  const { categories, rows, totals } = useMemo(() => {
    const exp = expenses.filter((e) => inRange(e.spent_on, range));
    const categories = Array.from(new Set(exp.map((e) => e.category))).sort();
    const n = Math.max(1, CRIBS.length);
    const rows = CRIBS.map((c) => {
      return { id: c.id, name: c.label, ...unitFinances(c.id, n, bookings, payments, expenses, range) };
    });
    const totals = rows.reduce(
      (a, r) => ({ income: a.income + r.income, spend: a.spend + r.spend, balance: a.balance + r.balance }),
      { income: 0, spend: 0, balance: 0 },
    );
    return { categories, rows, totals };
  }, [CRIBS, bookings, payments, expenses, range]);

  const label = rangeLabel(range);
  const selected = rows.find((row) => row.id === selectedUnit);

  const exportCsv = () =>
    downloadCsv(`unit-balances-${range.from || "start"}-${range.to || "today"}.csv`, [
      ["Unit", "Income", ...categories, "Total expenses", "Balance"],
      ...rows.map((r) => [
        r.name,
        Math.round(r.income),
        ...categories.map((c) => Math.round(r.byCat[c] ?? 0)),
        Math.round(r.spend),
        Math.round(r.balance),
      ]),
      ["TOTAL", Math.round(totals.income), ...categories.map(() => ""), Math.round(totals.spend), Math.round(totals.balance)],
    ]);

  return (
    <AppShell
      title="Unit balances"
      description={`Income − expenses per unit · ${label}`}
      actions={
        <>
          <RangeFilter value={range} onChange={setRange} />
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="size-4" /> CSV
          </Button>
        </>
      }
    >
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 text-right font-medium">Income</th>
                {categories.map((c) => (
                  <th key={c} className="px-4 py-3 text-right font-medium">{c}</th>
                ))}
                <th className="px-4 py-3 text-right font-medium">Total expenses</th>
                <th className="px-4 py-3 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={categories.length + 4} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="numeric px-4 py-3 text-right">{money(r.income)}</td>
                  {categories.map((c) => (
                    <td key={c} className="numeric px-4 py-3 text-right text-muted-foreground">
                      {r.byCat[c] ? money(r.byCat[c]) : "—"}
                    </td>
                  ))}
                  <td className="numeric px-4 py-3 text-right">{money(r.spend)}</td>
                  <td className={`numeric px-4 py-3 text-right font-semibold ${r.balance >= 0 ? "text-success" : "text-destructive"}`}>
                    {money(r.balance)}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-border bg-muted/40 font-medium">
                <td className="px-4 py-3">Total</td>
                <td className="numeric px-4 py-3 text-right">{money(totals.income)}</td>
                {categories.map((c) => <td key={c} />)}
                <td className="numeric px-4 py-3 text-right">{money(totals.spend)}</td>
                <td className={`numeric px-4 py-3 text-right ${totals.balance >= 0 ? "text-success" : "text-destructive"}`}>
                  {money(totals.balance)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">
        Shared expenses (logged against "All Cribs") are split equally between units.
      </p>
      {!isLoading && <section className="mt-6">
        <h2 className="mb-4 text-base font-semibold">Unit details</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => <Card key={row.id}>
            <CardContent className="p-5">
              <h3 className="flex items-start gap-2 text-sm font-semibold"><Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />{row.name}</h3>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Income</dt><dd className="numeric">{money(row.income)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Expenses</dt><dd className="numeric">{money(row.spend)}</dd></div>
                <div className="flex justify-between gap-3 border-t border-border pt-2"><dt className="font-medium">Balance</dt><dd className={`numeric font-semibold ${row.balance >= 0 ? "text-success" : "text-destructive"}`}>{money(row.balance)}</dd></div>
              </dl>
              <Button variant="outline" size="sm" className="mt-4 w-full" aria-label={`View ${row.name}`} onClick={() => setSelectedUnit(row.id)}><Eye className="size-4" />View</Button>
            </CardContent>
          </Card>)}
        </div>
      </section>}
      {selected && <UnitFinanceDetails unit={selected} label={label} open={true} onOpenChange={(open) => { if (!open) setSelectedUnit(null); }} />}
    </AppShell>
  );
}
