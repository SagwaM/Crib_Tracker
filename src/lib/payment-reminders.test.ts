import { describe, expect, test } from "bun:test";
import { monthlyPaymentReminders } from "./payment-reminders";
import { unitFinances } from "./unit-finances";

const booking = {
  id: "b1", crib: "crib-1", tenant_name: "Tenant", tenant_contact: null,
  check_in: "2026-01-31", check_out: "2026-06-30", amount_due: 60000, notes: null,
  remaining: 45000, payments: [{ id: "p1", booking_id: "b1", amount: 15000, paid_on: "2026-02-28", notes: null }],
};

describe("monthly long-term reminders", () => {
  test("monthly due dates use the check-in anniversary without month-end drift", () => {
    expect(monthlyPaymentReminders([booking], "2026-03-07")[0]?.nextDue).toBe("2026-03-31");
  });
  test("shows the whole booking unpaid balance", () => {
    expect(monthlyPaymentReminders([booking], "2026-03-07")[0]?.row.remaining).toBe(45000);
  });
  test("unpaid bookings keep the first due date overdue", () => {
    expect(monthlyPaymentReminders([{ ...booking, payments: [] }], "2026-03-07")[0]?.nextDue).toBe("2026-01-31");
  });
  test("short stays are excluded", () => {
    expect(monthlyPaymentReminders([{ ...booking, check_in: "2026-03-01", check_out: "2026-03-15" }], "2026-03-07")).toHaveLength(0);
  });
  test("30-night stays qualify as long-term", () => {
    expect(monthlyPaymentReminders([{ ...booking, check_in: "2026-03-01", check_out: "2026-03-31", payments: [] }], "2026-03-07")).toHaveLength(1);
  });
  test("paid bookings are excluded", () => {
    expect(monthlyPaymentReminders([{ ...booking, remaining: 0 }], "2026-03-07")).toHaveLength(0);
  });
  test("ended bookings are excluded", () => {
    expect(monthlyPaymentReminders([booking], "2026-06-30")).toHaveLength(0);
  });
  test("does not schedule payments on or after checkout", () => {
    expect(monthlyPaymentReminders([{ ...booking, check_out: "2026-03-31" }], "2026-03-07")).toHaveLength(0);
  });
});

describe("unit financial details", () => {
  const expenses = [
    { id: "e1", crib: "crib-1", category: "Wifi", amount: 1000, spent_on: "2026-02-10", is_recurring: false, frequency: null, notes: null },
    { id: "e2", crib: "all", category: "Water", amount: 4000, spent_on: "2026-02-10", is_recurring: false, frequency: null, notes: null },
    { id: "e3", crib: "crib-2", category: "Wifi", amount: 9999, spent_on: "2026-02-10", is_recurring: false, frequency: null, notes: null },
  ];
  test("balance equals received income minus direct and equally shared expenses", () => {
    const result = unitFinances("crib-1", 4, [booking], booking.payments, expenses, { from: "2026-02-01", to: "2026-02-28" });
    expect(result.income).toBe(15000);
    expect(result.byCat).toEqual({ Wifi: 1000, Water: 1000 });
    expect(result.spend).toBe(2000);
    expect(result.balance).toBe(13000);
  });
  test("details exclude entries outside the selected dates", () => {
    const result = unitFinances("crib-1", 4, [booking], booking.payments, expenses, { from: "2026-03-01", to: "2026-03-31" });
    expect(result.incomeEntries).toHaveLength(0);
    expect(result.expenseEntries).toHaveLength(0);
  });
});