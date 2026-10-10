import { useCribs } from "@/lib/units";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { EXPENSE_CATEGORIES, todayISO } from "@/lib/domain";
import { useSaveExpense, type Expense } from "@/lib/data";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  expense?: Expense | null;
  defaultCrib?: string;
};

export function ExpenseDialog({ open, onOpenChange, expense, defaultCrib }: Props) {
  const CRIBS = useCribs();
  const save = useSaveExpense();
  const [crib, setCrib] = useState(defaultCrib ?? "all");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]!);
  const [customCategory, setCustomCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState("monthly");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setCrib(expense?.crib ?? defaultCrib ?? "all");
    const known = expense && EXPENSE_CATEGORIES.includes(expense.category);
    setCategory(expense ? (known ? expense.category : "Other") : EXPENSE_CATEGORIES[0]!);
    setCustomCategory(expense && !known ? expense.category : "");
    setAmount(expense ? String(expense.amount) : "");
    setDate(expense?.spent_on ?? todayISO());
    setRecurring(expense?.is_recurring ?? false);
    setFrequency(expense?.frequency ?? "monthly");
    setNotes(expense?.notes ?? "");
  }, [open, expense, defaultCrib]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await save.mutateAsync({
        ...(expense?.id ? { id: expense.id } : {}),
        crib,
        category: category === "Other" && customCategory.trim() ? customCategory.trim() : category,
        amount: Number(amount || 0),
        spent_on: date,
        is_recurring: recurring,
        frequency: recurring ? frequency : null,
        notes: notes.trim() || null,
      });
      toast.success(expense ? "Expense updated" : "Expense added");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save expense");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{expense ? "Edit expense" : "Add expense"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Crib</Label>
              <Select value={crib} onValueChange={setCrib}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cribs (shared)</SelectItem>
                  {CRIBS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {category === "Other" && (
            <div className="space-y-1.5">
              <Label htmlFor="custom">Custom category</Label>
              <Input
                id="custom"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="e.g. Security"
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount (KES)</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Recurring cost</p>
              <p className="text-xs text-muted-foreground">Repeats automatically, e.g. wifi</p>
            </div>
            <Switch checked={recurring} onCheckedChange={setRecurring} />
          </div>

          {recurring && (
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="enotes">Notes</Label>
            <Textarea id="enotes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {expense ? "Save changes" : "Add expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
