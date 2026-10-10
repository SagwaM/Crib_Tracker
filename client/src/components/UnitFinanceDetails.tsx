import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { money } from "@/lib/domain";
import type { unitFinances } from "@/lib/unit-finances";

export function UnitFinanceDetails({ unit, label, open, onOpenChange }: {
  unit: ReturnType<typeof unitFinances> & { id: string; name: string };
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{unit.name} — Financial details</DialogTitle>
          <DialogDescription>{label}</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-1 gap-4 border-y border-border py-4 sm:grid-cols-3">
          {[{ label: "Income received", value: unit.income }, { label: "Total expenses", value: unit.spend }, { label: "Balance", value: unit.balance }].map((item) => (
            <div key={item.label}><dt className="text-xs text-muted-foreground">{item.label}</dt><dd className="numeric mt-1 text-xl font-semibold">{money(item.value)}</dd></div>
          ))}
        </dl>
        <section className="min-w-0">
          <h3 className="mb-3 text-sm font-semibold">Income · {unit.incomeEntries.length} payments</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Paid on</th><th>Tenant</th><th>Notes</th><th className="text-right">Amount</th></tr></thead>
              <tbody>{unit.incomeEntries.map((p) => {
                const booking = unit.unitBookings.find((b) => b.id === p.booking_id);
                return <tr key={p.id} className="border-t border-border"><td className="numeric py-3 pr-3">{p.paid_on}</td><td className="pr-3"><Link to="/bookings/$bookingId" params={{ bookingId: p.booking_id }} className="text-primary hover:underline">{booking?.tenant_name ?? "Booking"}</Link></td><td className="max-w-56 break-words pr-3 text-muted-foreground">{p.notes || "—"}</td><td className="numeric text-right">{money(p.amount)}</td></tr>;
              })}</tbody>
              <tfoot><tr className="border-t border-border font-semibold"><td colSpan={3} className="py-3">Total income</td><td className="numeric text-right">{money(unit.income)}</td></tr></tfoot>
            </table>
          </div>
          {!unit.incomeEntries.length && <p className="text-sm text-muted-foreground">No payments in this period.</p>}
        </section>
        <section className="min-w-0">
          <h3 className="mb-3 text-sm font-semibold">Expenses · {unit.expenseEntries.length} entries</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Date</th><th>Category / notes</th><th>Allocation</th><th>Recurring</th><th className="text-right">Unit expense</th></tr></thead>
              <tbody>{unit.expenseEntries.map(({ expense: e, allocated }) => (
                <tr key={e.id} className="border-t border-border"><td className="numeric py-3 pr-3">{e.spent_on}</td><td className="max-w-56 break-words pr-3">{e.category}{e.notes && <p className="text-xs text-muted-foreground">{e.notes}</p>}</td><td className="pr-3 text-xs text-muted-foreground">{e.crib === "all" ? `Shared · ${money(e.amount)} total` : "Direct"}</td><td className="pr-3 text-xs text-muted-foreground">{e.is_recurring ? e.frequency ?? "Recurring" : "—"}</td><td className="numeric text-right">{money(allocated)}</td></tr>
              ))}</tbody>
              <tfoot><tr className="border-t border-border font-semibold"><td colSpan={4} className="py-3">Total expenses</td><td className="numeric text-right">{money(unit.spend)}</td></tr></tfoot>
            </table>
          </div>
          {!unit.expenseEntries.length && <p className="text-sm text-muted-foreground">No expenses in this period.</p>}
        </section>
        <div className="flex justify-end"><Button asChild variant="outline"><Link to="/crib/$cribId" params={{ cribId: unit.id }}>Unit history <ArrowUpRight className="size-4" /></Link></Button></div>
      </DialogContent>
    </Dialog>
  );
}