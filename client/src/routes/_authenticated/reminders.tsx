import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, Bell, Download } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusTag } from "@/components/StatusTag";
import { paymentReminders, useLedger } from "@/lib/derive";
import { cribLabel, downloadCsv, money, todayISO } from "@/lib/domain";
import { useCribs } from "@/lib/units";

export const Route = createFileRoute("/_authenticated/reminders")({
  head: () => ({ meta: [
    { title: "Upcoming payments — Cribs Manager" },
    { name: "description", content: "Monthly payment due dates and unpaid balances for long-term tenants." },
    { property: "og:title", content: "Upcoming payments — Cribs Manager" },
    { property: "og:description", content: "Monthly payment due dates and unpaid balances for long-term tenants." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: RemindersPage,
});

function RemindersPage() {
  const cribs = useCribs();
  const { bookings, isLoading, error } = useLedger();
  const [unit, setUnit] = useState("all");
  const [status, setStatus] = useState("all");
  const today = todayISO();
  const reminders = paymentReminders(bookings);
  const visible = reminders.filter(({ row, nextDue }) => (unit === "all" || row.crib === unit) &&
    (status === "all" || (status === "overdue" ? nextDue < today : status === "today" ? nextDue === today : nextDue > today)));
  const exportCsv = () => downloadCsv(`upcoming-payments-${today}.csv`, [
    ["Tenant", "Unit", "Check-in", "Check-out", "Due date", "Unpaid booking balance", "Contact"],
    ...visible.map(({ row, nextDue }) => [row.tenant_name, cribLabel(row.crib), row.check_in, row.check_out, nextDue, row.remaining, row.tenant_contact ?? ""]),
  ]);
  return <AppShell title="Upcoming payments" description="Long-term tenants · monthly payment reminders" actions={<Button variant="outline" size="sm" onClick={exportCsv} disabled={isLoading || !!error}><Download className="size-4" />CSV</Button>}>
    <div className="mb-6 flex flex-wrap gap-3">
      <Select value={unit} onValueChange={setUnit}><SelectTrigger className="w-56" aria-label="Unit"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All units</SelectItem>{cribs.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent></Select>
      <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-44" aria-label="Due status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All due dates</SelectItem><SelectItem value="overdue">Overdue</SelectItem><SelectItem value="today">Due today</SelectItem><SelectItem value="upcoming">Upcoming</SelectItem></SelectContent></Select>
    </div>
    {error ? <p role="alert" className="text-sm text-destructive">Payment records could not be loaded. Please refresh and try again.</p> : isLoading ? <p className="text-sm text-muted-foreground">Loading payments…</p> : <>
      <div className="mb-6 flex flex-wrap gap-x-8 gap-y-3 border-y border-border py-4 text-sm">
        <p><span className="font-semibold">{visible.length}</span> bookings</p>
        <p className="text-destructive"><span className="font-semibold">{visible.filter((r) => r.nextDue < today).length}</span> overdue</p>
        <p className="numeric">Unpaid booking balances <span className="font-semibold">{money(visible.reduce((sum, r) => sum + r.row.remaining, 0))}</span></p>
      </div>
      {!visible.length ? <div className="py-12 text-center"><Bell className="mx-auto mb-3 size-6 text-muted-foreground" /><p className="text-sm text-muted-foreground">No unpaid long-term bookings match these filters.</p></div> : <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Tenant / booking</th><th className="px-4 py-3">Unit</th><th className="px-4 py-3">Due date</th><th className="px-4 py-3">Payment status</th><th className="px-4 py-3 text-right">Unpaid balance</th><th className="px-4 py-3"><span className="sr-only">View booking</span></th></tr></thead>
          <tbody>{visible.map(({ row, nextDue }) => <tr key={row.id} className="border-t border-border">
            <td className="px-4 py-4"><Link className="font-medium hover:underline" to="/bookings/$bookingId" params={{ bookingId: row.id }}>{row.tenant_name}</Link><p className="numeric mt-1 text-xs text-muted-foreground">{row.check_in} → {row.check_out}</p>{row.tenant_contact && <p className="mt-1 text-xs text-muted-foreground">{row.tenant_contact}</p>}</td>
            <td className="px-4 py-4">{cribLabel(row.crib)}</td>
            <td className="numeric px-4 py-4"><p>{nextDue}</p><p className={`mt-1 text-xs ${nextDue < today ? "text-destructive" : nextDue === today ? "text-warning" : "text-muted-foreground"}`}>{nextDue < today ? "Overdue" : nextDue === today ? "Due today" : "Upcoming"}</p></td>
            <td className="px-4 py-4"><StatusTag status={row.status} /></td>
            <td className="numeric px-4 py-4 text-right font-semibold">{money(row.remaining)}</td>
            <td className="px-4 py-4"><Button asChild variant="outline" size="sm"><Link to="/bookings/$bookingId" params={{ bookingId: row.id }} aria-label={`View booking for ${row.tenant_name}`}>View<ArrowUpRight className="size-4" /></Link></Button></td>
          </tr>)}</tbody>
        </table>
      </div>}
    </>}
  </AppShell>;
}