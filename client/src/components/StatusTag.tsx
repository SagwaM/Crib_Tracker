import { cn } from "@/lib/utils";
import { STATUS_LABEL, STAY_LABEL, type PaymentStatus, type StayType } from "@/lib/domain";

const base =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

export function StatusTag({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={cn(
        base,
        status === "paid" && "bg-success/12 text-success",
        status === "partial" && "bg-warning/20 text-warning-foreground",
        status === "unpaid" && "bg-destructive/12 text-destructive",
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function StayTag({ type }: { type: StayType }) {
  return (
    <span
      className={cn(
        base,
        type === "short" && "bg-secondary text-secondary-foreground",
        type === "long" && "bg-primary/12 text-primary",
        type === "review" && "bg-warning/20 text-warning-foreground",
      )}
    >
      {STAY_LABEL[type]}
    </span>
  );
}

export function OccupancyTag({ occupied }: { occupied: boolean }) {
  return (
    <span
      className={cn(base, occupied ? "bg-success/12 text-success" : "bg-muted text-muted-foreground")}
    >
      {occupied ? "Occupied" : "Vacant"}
    </span>
  );
}
