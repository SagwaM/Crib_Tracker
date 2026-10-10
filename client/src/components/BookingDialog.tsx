import { useCribs } from "@/lib/units";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { STAY_LABEL, money, nightsBetween, stayType, todayISO } from "@/lib/domain";
import { useAddPayment, useSaveBooking, type Booking } from "@/lib/data";
import { StayTag } from "@/components/StatusTag";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  booking?: Booking | null;
  defaultCrib?: string;
};

export function BookingDialog({ open, onOpenChange, booking, defaultCrib }: Props) {
  const CRIBS = useCribs();
  const save = useSaveBooking();
  const addPayment = useAddPayment();

  const [crib, setCrib] = useState<string>(defaultCrib ?? CRIBS[0]?.id ?? "");
  const [tenant, setTenant] = useState("");
  const [contact, setContact] = useState("");
  const [checkIn, setCheckIn] = useState(todayISO());
  const [checkOut, setCheckOut] = useState(todayISO());
  const [due, setDue] = useState("");
  const [rate, setRate] = useState("");
  const [firstPayment, setFirstPayment] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setCrib(booking?.crib ?? defaultCrib ?? CRIBS[0]?.id ?? "");
    setTenant(booking?.tenant_name ?? "");
    setContact(booking?.tenant_contact ?? "");
    setCheckIn(booking?.check_in ?? todayISO());
    setCheckOut(booking?.check_out ?? todayISO());
    setDue(booking ? String(booking.amount_due) : "");
    setRate("");
    setFirstPayment("");
    setNotes(booking?.notes ?? "");
  }, [open, booking, defaultCrib]);

  const nights = nightsBetween(checkIn, checkOut);
  const type = stayType(checkIn, checkOut);
  const rateNum = Number(rate || 0);

  const totalFromRate = (inDate: string, outDate: string, r: number) => {
    const n = nightsBetween(inDate, outDate);
    if (r > 0 && n > 0) setDue(String(n * r));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkOut <= checkIn) {
      toast.error("Check-out must be after check-in");
      return;
    }
    try {
      const id = await save.mutateAsync({
        ...(booking?.id ? { id: booking.id } : {}),
        crib,
        tenant_name: tenant.trim(),
        tenant_contact: contact.trim() || null,
        check_in: checkIn,
        check_out: checkOut,
        amount_due: Number(due || 0),
        notes: notes.trim() || null,
      });
      const amount = Number(firstPayment || 0);
      if (!booking && id && amount > 0) {
        await addPayment.mutateAsync({ booking_id: id, amount, paid_on: todayISO() });
      }
      toast.success(booking ? "Booking updated" : "Booking added");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save booking");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{booking ? "Edit booking" : "Add booking"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Crib</Label>
            <Select value={crib} onValueChange={setCrib}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRIBS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tenant">Tenant name</Label>
              <Input id="tenant" required value={tenant} onChange={(e) => setTenant(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact">Contact (optional)</Label>
              <Input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone or email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="in">Check-in</Label>
              <Input id="in" type="date" required value={checkIn} onChange={(e) => { setCheckIn(e.target.value); totalFromRate(e.target.value, checkOut, rateNum); }} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="out">Check-out</Label>
              <Input id="out" type="date" required value={checkOut} onChange={(e) => { setCheckOut(e.target.value); totalFromRate(checkIn, e.target.value, rateNum); }} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              {nights} night{nights === 1 ? "" : "s"} →
            </span>
            <StayTag type={type} />
            {rateNum > 0 && nights > 0 && (
              <span className="font-medium">
                {nights} × {money(rateNum)} = {money(nights * rateNum)}
              </span>
            )}
            {type === "review" && (
              <span className="text-xs text-muted-foreground">15–29 days needs a look</span>
            )}
            <span className="sr-only">{STAY_LABEL[type]}</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rate">Amount per night (KES)</Label>
              <Input
                id="rate"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                placeholder="Optional"
                value={rate}
                onChange={(e) => {
                  setRate(e.target.value);
                  totalFromRate(checkIn, checkOut, Number(e.target.value || 0));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due">Total agreed (KES)</Label>
              <Input
                id="due"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </div>
            {!booking && (
              <div className="space-y-1.5">
                <Label htmlFor="paid">Paid now (KES)</Label>
                <Input
                  id="paid"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={firstPayment}
                  onChange={(e) => setFirstPayment(e.target.value)}
                />
              </div>
            )}
          </div>

          {!booking && Number(due || 0) > 0 && (
            <p className="text-xs text-muted-foreground">
              Balance after this entry: {money(Math.max(0, Number(due || 0) - Number(firstPayment || 0)))}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {booking ? "Save changes" : "Add booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
