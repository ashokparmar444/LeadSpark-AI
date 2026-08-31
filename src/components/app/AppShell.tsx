import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Radar as RadarIcon,
  Users,
  Gauge,
  ListOrdered,
  Blocks,
  Send,
  Megaphone,
  BarChart3,
  Settings,
  CreditCard,
  Shield,
  Menu,
  X,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/hooks/useApp";
import { Radar } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/lead-finder", label: "Lead Finder", icon: RadarIcon },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/audits", label: "Audits", icon: Gauge },
  { to: "/rankings", label: "Rankings", icon: ListOrdered },
  { to: "/builder", label: "Website Builder", icon: Blocks },
  { to: "/outreach", label: "Outreach", icon: Send },
  { to: "/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
] as const;

const FOOT_NAV = [
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/admin", label: "Admin", icon: Shield },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, workspace, workspaces, setWorkspaceId, signOut } = useApp();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const NavList = () => (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
      {NAV.map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-accent/10 text-accent ring-1 ring-accent/25"
                : "text-muted-foreground hover:bg-panel2/70 hover:text-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
      <div className="mt-4 border-t border-border/70 pt-4">
        {FOOT_NAV.map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-accent/10 text-accent ring-1 ring-accent/25"
                  : "text-muted-foreground hover:bg-panel2/70 hover:text-foreground",
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );

  const Brand = () => (
    <div className="flex items-center gap-2.5 border-b border-border/70 px-4 py-4">
      <Radar size={28} />
      <span className="text-sm font-semibold tracking-tight">
        LeadPilot<span className="text-accent"> AI</span>
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border/70 bg-panel/40 backdrop-blur-xl lg:flex">
        <Brand />
        <NavList />
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-border/70 bg-panel">
            <div className="flex items-center justify-between border-b border-border/70 pr-2">
              <Brand />
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-2 text-muted-foreground">
                <X className="size-4" />
              </button>
            </div>
            <NavList />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <button
              className="rounded-md p-2 text-muted-foreground hover:text-foreground lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-4" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <span className="size-2 rounded-full bg-accent" />
                  <span className="max-w-[10rem] truncate">{workspace?.name ?? "Workspace"}</span>
                  <ChevronDown className="size-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="label-mono">Workspaces</DropdownMenuLabel>
                {workspaces.map((w) => (
                  <DropdownMenuItem key={w.workspace.id} onSelect={() => setWorkspaceId(w.workspace.id)}>
                    <span className="truncate">{w.workspace.name}</span>
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground">{w.role}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings">Workspace settings</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-accent/15 font-mono text-[10px] text-accent">
                  {(user?.email ?? "?").slice(0, 2).toUpperCase()}
                </span>
                <span className="hidden max-w-[12rem] truncate sm:inline">{user?.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem asChild>
                <Link to="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/billing">Billing</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void signOut()}>
                <LogOut className="mr-2 size-3.5" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
