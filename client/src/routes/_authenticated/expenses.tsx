import { RangeFilter, inRange, rangeLabel, thisMonthRange, prevRange, type DateRange } from "@/components/MonthFilter";
import { useCribs } from "@/lib/units";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExpenseDialog } from "@/components/ExpenseDialog";
import { useDeleteExpense, type Expense } from "@/lib/data";
import { useExpenses } from "@/lib/data";
import { upcomingRecurring } from "@/lib/derive";
import { cribName, money, nextDueDate } from "@/lib/domain";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses — Cribs Manager" },
      { name: "description", content: "Running costs per crib, recurring bills and category breakdown." },
      { property: "og:title", content: "Expenses — Cribs Manager" },
      { property: "og:description", content: "Running costs per crib, recurring bills and category breakdown." },
    ],
  }),
  component: ExpensesPage,
});

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function ExpensesPage() {
  const CRIBS = useCribs();
  const { data, isLoading } = useExpenses();
  const remove = useDeleteExpense();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [crib, setCrib] = useState("all-filter");
  const [category, setCategory] = useState("all-filter");
  const [range, setRange] = useState<DateRange>({ from: "", to: "" });

  const expenses = data ?? [];
  const categories = useMemo(
    () => Array.from(new Set(expenses.map((e) => e.category))).sort(),
    [expenses],
  );

  const rows = expenses.filter((e) => {
    if (crib !== "all-filter" && e.crib !== crib) return false;
    if (category !== "all-filter" && e.category !== category) return false;
    if (!inRange(e.spent_on, range)) return false;
    return true;
  });

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + e.amount));
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [rows]);

  const recurring = upcomingRecurring(expenses);

  return (
    <AppShell
      title="Expenses"
      description={`${money(rows.reduce((s, e) => s + e.amount, 0))} total in view`}
      actions={
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="size-4" /> Add Expense
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Spend by category</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses logged yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCategory} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={70} />
                  <Tooltip formatter={(v: number) => money(v)} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {byCategory.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <RefreshCw className="size-4" /> Recurring bills
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recurring.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing marked as recurring.</p>
            )}
            {recurring.map(({ expense, due }) => (
              <div key={expense.id} className="rounded-md border border-border px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{expense.category}</span>
                  <span className="numeric">{money(expense.amount)}</span>
                </div>
                <p className="numeric text-xs text-muted-foreground">
                  {cribName(expense.crib)} · {expense.frequency} · next due {due}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[auto_1fr_1fr]">
          <div className="space-y-1.5">
            <Label className="text-xs">Period</Label>
            <RangeFilter value={range} onChange={setRange} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Crib</Label>
            <Select value={crib} onValueChange={setCrib}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-filter">All</SelectItem>
                <SelectItem value="all">Shared (All Cribs)</SelectItem>
                {CRIBS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-filter">All</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="mt-4 overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Crib</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Recurring</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No expenses match these filters.
                  </td>
                </tr>
              )}
              {rows.map((e) => (
                <tr key={e.id} className="border-t border-border hover:bg-muted/40">
                  <td className="numeric px-4 py-3 text-muted-foreground">{e.spent_on}</td>
                  <td className="px-4 py-3">{cribName(e.crib)}</td>
                  <td className="px-4 py-3 font-medium">{e.category}</td>
                  <td className="numeric px-4 py-3 text-right">{money(e.amount)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {e.is_recurring ? `${e.frequency} · next ${nextDueDate(e.spent_on, e.frequency)}` : "—"}
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-muted-foreground">{e.notes || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Edit expense"
                        onClick={() => {
                          setEditing(e);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Delete expense"
                        onClick={async () => {
                          await remove.mutateAsync(e.id);
                          toast.success("Expense deleted");
                        }}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <ExpenseDialog open={open} onOpenChange={setOpen} expense={editing} />
    </AppShell>
  );
}
