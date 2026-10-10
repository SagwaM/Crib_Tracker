import { useCribs } from "@/lib/units";
import { Link, useRouter } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarRange,
  Receipt,
  Building2,
  BarChart3,
  CalendarDays,
  LogOut,
  Menu,
  Bell,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/bookings", label: "Bookings", icon: CalendarRange },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/balances", label: "Unit balances", icon: BarChart3 },
  { to: "/reminders", label: "Upcoming payments", icon: Bell },
  { to: "/units", label: "Manage units", icon: Building2 },
] as const;

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const CRIBS = useCribs();
  return (
    <nav className="flex flex-col gap-1 p-3">
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
        Manage
      </p>
      {links.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium" }}
        >
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
      <p className="px-3 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
        Units
      </p>
      {CRIBS.map((c) => (
        <Link
          key={c.id}
          to="/crib/$cribId"
          params={{ cribId: c.id }}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium" }}
        >
          <Building2 className="size-4" />
          <span>
            {c.name}
            <span className="ml-1 text-xs text-sidebar-foreground/50">{c.floor}</span>
          </span>
        </Link>
      ))}
    </nav>
  );
}

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar md:flex">
        <div className="px-5 py-5">
          <p className="text-sm font-semibold tracking-tight text-sidebar-foreground">Cribs Manager</p>
          <p className="text-xs text-sidebar-foreground/50">Bookings &amp; expenses</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Nav />
        </div>
        <div className="p-3">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur md:px-8">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-0">
              <SheetTitle className="px-5 py-5 text-sm text-sidebar-foreground">Cribs Manager</SheetTitle>
              <Nav onNavigate={() => setOpen(false)} />
              <div className="p-3">
                <button
                  onClick={signOut}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70"
                >
                  <LogOut className="size-4" /> Sign out
                </button>
              </div>
            </SheetContent>
          </Sheet>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold tracking-tight md:text-lg">{title}</h1>
            {description && (
              <p className="truncate text-xs text-muted-foreground md:text-sm">{description}</p>
            )}
          </div>
          <div className={cn("flex max-w-full flex-wrap items-center gap-2")}>{actions}</div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
