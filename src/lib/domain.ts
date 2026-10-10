export type CribId = string;

/** Default units; replaced at runtime by the user's saved units. */
export const CRIBS: { id: CribId; name: string; floor: string; label: string }[] = [
  { id: "crib-1", name: "Crib 1", floor: "6th floor", label: "Crib 1 — 6th floor" },
  { id: "crib-2", name: "Crib 2", floor: "8th floor", label: "Crib 2 — 8th floor" },
  { id: "crib-3", name: "Crib 3", floor: "4th floor", label: "Crib 3 — 4th floor" },
  { id: "crib-4", name: "Crib 4", floor: "4th floor", label: "Crib 4 — 4th floor" },
];

export const cribLabel = (id: string) =>
  id === "all" ? "All Cribs" : (CRIBS.find((c) => c.id === id)?.label ?? id);

export const cribName = (id: string) =>
  id === "all" ? "All Cribs" : (CRIBS.find((c) => c.id === id)?.name ?? id);

export const EXPENSE_CATEGORIES = [
  "Wifi",
  "Electricity",
  "Water",
  "Repairs/Maintenance",
  "Cleaning",
  "Furnishing",
  "Other",
];

export type StayType = "short" | "long" | "review";

export function nightsBetween(checkIn: string, checkOut: string) {
  const a = new Date(checkIn + "T00:00:00");
  const b = new Date(checkOut + "T00:00:00");
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
}

export function stayType(checkIn: string, checkOut: string): StayType {
  const d = nightsBetween(checkIn, checkOut);
  if (d <= 14) return "short";
  if (d >= 30) return "long";
  return "review";
}

export const STAY_LABEL: Record<StayType, string> = {
  short: "Short term",
  long: "Long term",
  review: "Other / Review",
};

export type PaymentStatus = "paid" | "partial" | "unpaid";

export function paymentStatus(due: number, paid: number): PaymentStatus {
  if (paid <= 0) return "unpaid";
  if (paid + 0.001 >= due) return "paid";
  return "partial";
}

export const STATUS_LABEL: Record<PaymentStatus, string> = {
  paid: "Paid in full",
  partial: "Partially paid",
  unpaid: "Unpaid",
};

export const money = (n: number) =>
  "KSh " +
  Math.round(n).toLocaleString("en-KE", {
    maximumFractionDigits: 0,
  });

export const todayISO = () => new Date().toISOString().slice(0, 10);

export function monthKey(d: string | Date) {
  const date = typeof d === "string" ? new Date(d + "T00:00:00") : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string) {
  const parts = key.split("-").map(Number);
  const y = parts[0] ?? 2000;
  const m = parts[1] ?? 1;
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

export function addMonths(date: Date, n: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

/** Next due date for a recurring expense, based on its start date and frequency. */
export function nextDueDate(spentOn: string, frequency: string | null): string | null {
  if (!frequency) return null;
  const step = frequency === "quarterly" ? 3 : 1;
  let d = new Date(spentOn + "T00:00:00");
  const now = new Date(todayISO() + "T00:00:00");
  let guard = 0;
  while (d <= now && guard++ < 400) d = addMonths(d, step);
  return d.toISOString().slice(0, 10);
}

export function isOccupied(checkIn: string, checkOut: string, on = todayISO()) {
  return checkIn <= on && on < checkOut;
}

export function overlaps(aIn: string, aOut: string, bIn: string, bOut: string) {
  return aIn < bOut && bIn < aOut;
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
