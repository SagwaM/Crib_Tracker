import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDeleteUnit, useSaveUnit, useUnits, type Unit } from "@/lib/units";
import { useBookings, useExpenses } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/units")({
  head: () => ({
    meta: [
      { title: "Units — Cribs Manager" },
      { name: "description", content: "Add new units and edit names and floors of existing ones." },
      { property: "og:title", content: "Units — Cribs Manager" },
      { property: "og:description", content: "Add new units and edit names and floors of existing ones." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UnitsPage,
});

function UnitsPage() {
  const { data: units = [], isLoading } = useUnits();
  const { data: bookings = [] } = useBookings();
  const { data: expenses = [] } = useExpenses();
  const del = useDeleteUnit();
  const [editing, setEditing] = useState<Unit | null>(null);
  const [open, setOpen] = useState(false);

  const remove = async (u: Unit) => {
    const used = bookings.some((b) => b.crib === u.id) || expenses.some((e) => e.crib === u.id);
    if (used) {
      toast.error("This unit has bookings or expenses — remove those first.");
      return;
    }
    if (!confirm(`Delete ${u.name}?`)) return;
    await del.mutateAsync(u.uuid);
    toast.success("Unit deleted");
  };

  return (
    <AppShell
      title="Units"
      description="Add a new unit or edit an existing one"
      actions={
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="size-4" /> Add unit
        </Button>
      }
    >
      <Card>
        <CardContent className="divide-y divide-border p-0">
          {isLoading && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
          {units.map((u) => {
            const count = bookings.filter((b) => b.crib === u.id).length;
            return (
              <div key={u.uuid} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {u.floor || "No floor set"} · {count} booking{count === 1 ? "" : "s"}
                  </p>
                </div>
                <Button variant="ghost" size="icon" aria-label="Edit unit" onClick={() => { setEditing(u); setOpen(true); }}>
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Delete unit" className="text-destructive" onClick={() => remove(u)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>
      <UnitDialog open={open} onOpenChange={setOpen} unit={editing} nextOrder={units.length + 1} />
    </AppShell>
  );
}

function UnitDialog({
  open,
  onOpenChange,
  unit,
  nextOrder,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  unit: Unit | null;
  nextOrder: number;
}) {
  const save = useSaveUnit();
  const [name, setName] = useState("");
  const [floor, setFloor] = useState("");
  const [order, setOrder] = useState("1");
  const [lastKey, setLastKey] = useState<string | null>(null);

  const key = open ? (unit?.uuid ?? "new") : null;
  if (key !== lastKey) {
    setLastKey(key);
    if (open) {
      setName(unit?.name ?? "");
      setFloor(unit?.floor ?? "");
      setOrder(String(unit?.sort_order ?? nextOrder));
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n || n.length > 60) {
      toast.error("Enter a name (max 60 characters)");
      return;
    }
    try {
      await save.mutateAsync({
        ...(unit ? { uuid: unit.uuid } : {}),
        name: n,
        floor: floor.trim().slice(0, 40),
        sort_order: Number(order) || 0,
      });
      toast.success(unit ? "Unit updated" : "Unit added");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save unit");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{unit ? "Edit unit" : "Add unit"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="uname">Name</Label>
            <Input id="uname" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Crib 5" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ufloor">Floor</Label>
              <Input id="ufloor" value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="e.g. 3rd floor" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uorder">Order in list</Label>
              <Input id="uorder" type="number" min="0" value={order} onChange={(e) => setOrder(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>{unit ? "Save changes" : "Add unit"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
