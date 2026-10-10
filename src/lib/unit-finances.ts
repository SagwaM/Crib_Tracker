import type { Booking, Expense, Payment } from "@/lib/data";

type Period = { from: string; to: string };

export function unitFinances(id: string, count: number, bookings: Booking[], payments: Payment[], expenses: Expense[], range: Period) {
  const inPeriod = (date: string) => (!range.from || date >= range.from) && (!range.to || date <= range.to);
  const unitBookings = bookings.filter((b) => b.crib === id);
  const ids = new Set(unitBookings.map((b) => b.id));
  const incomeEntries = payments.filter((p) => ids.has(p.booking_id) && inPeriod(p.paid_on));
  const expenseEntries = expenses.filter((e) => (e.crib === id || e.crib === "all") && inPeriod(e.spent_on))
    .map((expense) => ({ expense, allocated: expense.crib === "all" ? expense.amount / Math.max(1, count) : expense.amount }));
  const income = incomeEntries.reduce((sum, p) => sum + p.amount, 0);
  const byCat: Record<string, number> = {};
  expenseEntries.forEach(({ expense, allocated }) => { byCat[expense.category] = (byCat[expense.category] ?? 0) + allocated; });
  const spend = expenseEntries.reduce((sum, e) => sum + e.allocated, 0);
  return { unitBookings, incomeEntries, expenseEntries, income, byCat, spend, balance: income - spend };
}