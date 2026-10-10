import { useCribs, unitCount } from "@/lib/units";
import { monthlyPaymentReminders } from "@/lib/payment-reminders";
import { useMemo } from "react";
import { useBookings, useExpenses, usePayments, type Booking, type Expense, type Payment } from "@/lib/data";
import {
  isOccupied,
  monthKey,
  nextDueDate,
  paymentStatus,
  stayType,
  todayISO,
  type PaymentStatus,
  type StayType,
} from "@/lib/domain";

export type BookingRow = Booking & {
  paid: number;
  remaining: number;
  status: PaymentStatus;
  stay: StayType;
  occupiedNow: boolean;
  payments: Payment[];
};

export function useLedger() {
  useCribs();
  const bookings = useBookings();
  const payments = usePayments();
  const expenses = useExpenses();

  const rows: BookingRow[] = useMemo(() => {
    const byBooking = new Map<string, Payment[]>();
    (payments.data ?? []).forEach((p) => {
      const list = byBooking.get(p.booking_id) ?? [];
      list.push(p);
      byBooking.set(p.booking_id, list);
    });
    return (bookings.data ?? []).map((b) => {
      const ps = byBooking.get(b.id) ?? [];
      const paid = ps.reduce((s, p) => s + p.amount, 0);
      return {
        ...b,
        payments: ps,
        paid,
        remaining: Math.max(0, b.amount_due - paid),
        status: paymentStatus(b.amount_due, paid),
        stay: stayType(b.check_in, b.check_out),
        occupiedNow: isOccupied(b.check_in, b.check_out),
      };
    });
  }, [bookings.data, payments.data]);

  return {
    isLoading: bookings.isLoading || payments.isLoading || expenses.isLoading,
    bookings: rows,
    payments: payments.data ?? [],
    expenses: expenses.data ?? [],
    error: bookings.error ?? payments.error ?? expenses.error,
  };
}

export function cribOfPayment(payment: Payment, bookings: Booking[]) {
  return bookings.find((b) => b.id === payment.booking_id)?.crib ?? "unknown";
}

export function incomeByMonth(payments: Payment[], bookings: Booking[], crib?: string) {
  const map = new Map<string, number>();
  payments.forEach((p) => {
    if (crib && cribOfPayment(p, bookings) !== crib) return;
    const k = monthKey(p.paid_on);
    map.set(k, (map.get(k) ?? 0) + p.amount);
  });
  return map;
}

export function expensesByMonth(expenses: Expense[], crib?: string) {
  const map = new Map<string, number>();
  expenses.forEach((e) => {
    if (crib && e.crib !== crib && e.crib !== "all") return;
    const share = crib && e.crib === "all" ? e.amount / Math.max(1, unitCount()) : e.amount;
    const k = monthKey(e.spent_on);
    map.set(k, (map.get(k) ?? 0) + share);
  });
  return map;
}

export function sumInRange(entries: { date: string; amount: number }[], from: string, to: string) {
  return entries.filter((e) => e.date >= from && e.date <= to).reduce((s, e) => s + e.amount, 0);
}

export function upcomingRecurring(expenses: Expense[]) {
  return expenses
    .filter((e) => e.is_recurring)
    .map((e) => ({ expense: e, due: nextDueDate(e.spent_on, e.frequency) }))
    .filter((x): x is { expense: Expense; due: string } => x.due !== null)
    .sort((a, b) => a.due.localeCompare(b.due));
}

/** Long-term tenants whose next monthly instalment is coming up or overdue. */
export function paymentReminders(rows: BookingRow[]) {
  return monthlyPaymentReminders(rows);
}
