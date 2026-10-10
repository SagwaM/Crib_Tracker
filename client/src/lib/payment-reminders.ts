import { addMonths, format } from "date-fns";
import { stayType, todayISO } from "@/lib/domain";
import type { Booking, Payment } from "@/lib/data";

type ReminderBooking = Booking & { remaining: number; payments: Payment[] };

/** Monthly anniversaries stay anchored to check-in, even in shorter months. */
export function monthlyPaymentReminders<T extends ReminderBooking>(rows: T[], today = todayISO()) {
  return rows.flatMap((row) => {
    if (stayType(row.check_in, row.check_out) !== "long" || row.remaining <= 0 || row.check_out <= today) return [];
    const lastPaid = row.payments.filter((p) => p.amount > 0 && p.paid_on <= today)
      .map((p) => p.paid_on).sort().at(-1);
    const start = new Date(`${row.check_in}T00:00:00`);
    let month = 0;
    let nextDue = row.check_in;
    // Existing records have no monthly rent field: a payment advances to the next
    // check-in anniversary; remaining is the unpaid balance of the whole booking.
    if (lastPaid) {
      const last = new Date(`${lastPaid}T00:00:00`);
      month = Math.max(0, (last.getFullYear() - start.getFullYear()) * 12 + last.getMonth() - start.getMonth());
      nextDue = format(addMonths(start, month), "yyyy-MM-dd");
      if (nextDue <= lastPaid) nextDue = format(addMonths(start, month + 1), "yyyy-MM-dd");
    }
    if (nextDue >= row.check_out) return [];
    return [{ row, nextDue }];
  }).sort((a, b) => a.nextDue.localeCompare(b.nextDue) || a.row.tenant_name.localeCompare(b.row.tenant_name));
}