import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { monthKey, monthLabel } from "@/lib/domain";

export const ALL_MONTHS = "all";

/** True when an ISO date falls in the month key (or month is "all"). */
export const inMonth = (date: string, month: string) => month === ALL_MONTHS || date.slice(0, 7) === month;

export const currentMonth = () => monthKey(new Date());

export function prevMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  return monthKey(new Date(y ?? 2000, (m ?? 1) - 2, 1));
}

/** First and last ISO day of a month key. */
export function monthRange(key: string) {
  const [y, m] = key.split("-").map(Number);
  const last = new Date(y ?? 2000, m ?? 1, 0).getDate();
  return { from: `${key}-01`, to: `${key}-${String(last).padStart(2, "0")}` };
}

export function MonthFilter({
  value,
  onChange,
  allowAll = true,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  allowAll?: boolean;
  className?: string;
}) {
  const now = new Date();
  const months = Array.from({ length: 24 }, (_, i) => monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className ?? "h-9 w-[150px]"} aria-label="Month">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value={ALL_MONTHS}>All time</SelectItem>}
        {months.map((m) => (
          <SelectItem key={m} value={m}>
            {monthLabel(m)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export type DateRange = { from: string; to: string };

/** True when an ISO date falls inside the range; empty ends are open. */
export const inRange = (date: string, r: DateRange) => (!r.from || date >= r.from) && (!r.to || date <= r.to);

export const thisMonthRange = (): DateRange => monthRange(currentMonth());

/** The period of equal length immediately before the range. */
export function prevRange(r: DateRange): DateRange {
  const a = new Date(r.from + "T00:00:00");
  const b = new Date(r.to + "T00:00:00");
  const days = Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
  const to = new Date(a.getTime() - 86400000);
  const from = new Date(to.getTime() - (days - 1) * 86400000);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: iso(from), to: iso(to) };
}

export function rangeLabel(r: DateRange) {
  if (!r.from && !r.to) return "All time";
  return `${r.from || "start"} to ${r.to || "today"}`;
}

export function RangeFilter({
  value,
  onChange,
  clearable = true,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
  clearable?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="grid gap-1 text-xs text-muted-foreground">
        From
        <input
          type="date"
          aria-label="From"
          value={value.from}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
        />
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">
        To
        <input
          type="date"
          aria-label="To"
          value={value.to}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
        />
      </label>
      {clearable && (value.from || value.to) && (
        <button
          type="button"
          onClick={() => onChange({ from: "", to: "" })}
          className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
      )}
    </div>
  );
}
