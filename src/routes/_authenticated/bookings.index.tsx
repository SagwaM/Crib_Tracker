import { useCribs } from "@/lib/units";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, ArrowUpDown } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookingDialog } from "@/components/BookingDialog";
import { BookingRowActions } from "@/components/BookingRowActions";
import { StatusTag, StayTag } from "@/components/StatusTag";
import { useLedger } from "@/lib/derive";
import { cribName, money } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/bookings/")({
  head: () => ({
    meta: [
      { title: "Bookings — Cribs Manager" },
      { name: "description", content: "All tenant bookings with stay type, payments and balances." },
      { property: "og:title", content: "Bookings — Cribs Manager" },
      { property: "og:description", content: "All tenant bookings with stay type, payments and balances." },
    ],
  }),
  component: BookingsPage,
});

function BookingsPage() {
  const CRIBS = useCribs();
  const { bookings, isLoading } = useLedger();
  const [open, setOpen] = useState(false);
  const [crib, setCrib] = useState("all");
  const [stay, setStay] = useState("all");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<"date" | "amount">("date");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const rows = useMemo(() => {
    const filtered = bookings.filter((b) => {
      if (crib !== "all" && b.crib !== crib) return false;
      if (stay !== "all" && b.stay !== stay) return false;
      if (status !== "all" && b.status !== status) return false;
      if (from && b.check_out < from) return false;
      if (to && b.check_in > to) return false;
      return true;
    });
    const sorted = [...filtered].sort((a, z) =>
      sort === "date" ? (a.check_in < z.check_in ? -1 : 1) : a.paid - z.paid,
    );
    return dir === "asc" ? sorted : sorted.reverse();
  }, [bookings, crib, stay, status, from, to, sort, dir]);

  const toggle = (key: "date" | "amount") => {
    if (sort === key) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(key);
      setDir("desc");
    }
  };

  return (
    <AppShell
      title="Bookings"
      description={`${rows.length} of ${bookings.length} bookings shown`}
      actions={
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Add Booking
        </Button>
      }
    >
      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-1.5">
            <Label className="text-xs">Crib</Label>
            <Select value={crib} onValueChange={setCrib}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cribs</SelectItem>
                {CRIBS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Stay type</Label>
            <Select value={stay} onValueChange={setStay}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                <SelectItem value="short">Short term</SelectItem>
                <SelectItem value="long">Long term</SelectItem>
                <SelectItem value="review">Other / Review</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Payment</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                <SelectItem value="paid">Paid in full</SelectItem>
                <SelectItem value="partial">Partially paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
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

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Tenant</th>
                <th className="px-4 py-3 font-medium">Crib</th>
                <th className="px-4 py-3 font-medium">
                  <button className="inline-flex items-center gap-1" onClick={() => toggle("date")}>
                    Dates <ArrowUpDown className="size-3" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">Stay</th>
                <th className="px-4 py-3 text-right font-medium">
                  <button className="inline-flex items-center gap-1" onClick={() => toggle("amount")}>
                    Paid <ArrowUpDown className="size-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right font-medium">Balance</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-2 py-3 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No bookings match these filters.
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
                    {b.tenant_contact && (
                      <p className="text-xs text-muted-foreground">{b.tenant_contact}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{cribName(b.crib)}</td>
                  <td className="numeric px-4 py-3 text-muted-foreground">
                    {b.check_in} → {b.check_out}
                  </td>
                  <td className="px-4 py-3">
                    <StayTag type={b.stay} />
                  </td>
                  <td className="numeric px-4 py-3 text-right">{money(b.paid)}</td>
                  <td
                    className={`numeric px-4 py-3 text-right ${b.remaining > 0 ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {money(b.remaining)}
                  </td>
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

      <BookingDialog open={open} onOpenChange={setOpen} />
    </AppShell>
  );
}
