import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookingDialog } from "@/components/BookingDialog";
import { StatusTag, StayTag } from "@/components/StatusTag";
import { useLedger } from "@/lib/derive";
import { useAddPayment, useDeleteBooking, useDeletePayment } from "@/lib/data";
import { cribLabel, money, nightsBetween, todayISO } from "@/lib/domain";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/bookings/$bookingId")({
  head: () => ({
    meta: [
      { title: "Booking detail — Cribs Manager" },
      { name: "description", content: "Full booking detail, payment history and outstanding balance." },
      { property: "og:title", content: "Booking detail — Cribs Manager" },
      { property: "og:description", content: "Full booking detail, payment history and outstanding balance." },
    ],
  }),
  component: BookingDetail,
});

function BookingDetail() {
  const { bookingId } = Route.useParams();
  const router = useRouter();
  const { bookings, isLoading } = useLedger();
  const booking = bookings.find((b) => b.id === bookingId);
  const addPayment = useAddPayment();
  const deletePayment = useDeletePayment();
  const deleteBooking = useDeleteBooking();
  const [edit, setEdit] = useState(false);
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(todayISO());

  if (isLoading) {
    return (
      <AppShell title="Booking">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }

  if (!booking) {
    return (
      <AppShell title="Booking not found">
        <Link to="/bookings" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to bookings
        </Link>
      </AppShell>
    );
  }

  const record = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount || 0);
    if (value <= 0) {
      toast.error("Enter an amount");
      return;
    }
    await addPayment.mutateAsync({ booking_id: booking.id, amount: value, paid_on: paidOn });
    setAmount("");
    toast.success("Payment recorded");
  };

  const remove = async () => {
    await deleteBooking.mutateAsync(booking.id);
    toast.success("Booking deleted");
    router.navigate({ to: "/bookings" });
  };

  return (
    <AppShell
      title={booking.tenant_name}
      description={cribLabel(booking.crib)}
      actions={
        <>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/bookings">
              <ArrowLeft className="size-4" /> Back
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEdit(true)}>
            <Pencil className="size-4" /> Edit
          </Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Booking detail</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Check-in" value={booking.check_in} />
            <Field label="Check-out" value={booking.check_out} />
            <Field
              label="Length of stay"
              value={`${nightsBetween(booking.check_in, booking.check_out)} nights`}
            />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Stay type</p>
              <div className="mt-1 flex gap-2">
                <StayTag type={booking.stay} />
                <StatusTag status={booking.status} />
              </div>
            </div>
            <Field label="Contact" value={booking.tenant_contact || "—"} />
            <Field label="Total agreed" value={money(booking.amount_due)} />
            <Field label="Paid so far" value={money(booking.paid)} />
            <Field
              label="Balance remaining"
              value={money(booking.remaining)}
              tone={booking.remaining > 0 ? "bad" : "good"}
            />
            <div className="sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{booking.notes || "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Record a payment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={record} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="amt">Amount (KES)</Label>
                <Input
                  id="amt"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="on">Date</Label>
                <Input id="on" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={addPayment.isPending}>
                <Plus className="size-4" /> Add payment
              </Button>
            </form>

            <div className="mt-5 space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Payment history</p>
              {booking.payments.length === 0 && (
                <p className="text-sm text-muted-foreground">No payments yet.</p>
              )}
              {[...booking.payments]
                .sort((a, b) => (a.paid_on < b.paid_on ? 1 : -1))
                .map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span className="numeric text-muted-foreground">{p.paid_on}</span>
                    <span className="flex items-center gap-3">
                      <span className="numeric font-medium">{money(p.amount)}</span>
                      <button
                        onClick={() => deletePayment.mutate(p.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Delete payment"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Button variant="ghost" size="sm" className="text-destructive" onClick={remove}>
          <Trash2 className="size-4" /> Delete booking
        </Button>
      </div>

      <BookingDialog open={edit} onOpenChange={setEdit} booking={booking} />
    </AppShell>
  );
}

function Field({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`numeric mt-1 text-sm font-medium ${
          tone === "bad" ? "text-destructive" : tone === "good" ? "text-success" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
