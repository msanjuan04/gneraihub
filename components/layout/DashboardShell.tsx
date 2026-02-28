"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Settings, X, Zap } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import {
  DASHBOARD_NAV_ITEMS,
  MOBILE_PRIMARY_NAV_PATHS,
} from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const primaryMobileItems = useMemo(
    () => DASHBOARD_NAV_ITEMS.filter((item) => MOBILE_PRIMARY_NAV_PATHS.includes(item.href)),
    []
  );

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setMobileMenuOpen(false);
    router.push("/login");
    router.refresh();
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="lg:pl-60">
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        <main className="animate-fade-in px-4 py-4 pb-24 sm:px-6 sm:py-6 lg:pb-6">
          {children}
        </main>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/55 transition-opacity duration-200 lg:hidden",
          mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setMobileMenuOpen(false)}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 h-dvh w-[85vw] max-w-xs border-r border-border/70 bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-2xl backdrop-blur-xl transition-transform duration-200 lg:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl gnerai-gradient shadow-lg shadow-blue-500/35">
              <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold gnerai-gradient-text">GneraiHub</span>
              <span className="text-[10px] text-muted-foreground">Control Operativo</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Cerrar menú</span>
          </Button>
        </div>

        <div className="flex h-[calc(100%-4rem)] flex-col">
          <nav className="flex-1 overflow-y-auto px-2 py-4">
            <ul className="space-y-1">
              {DASHBOARD_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, item.exact);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150",
                        "hover:bg-accent hover:text-accent-foreground",
                        active
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "text-muted-foreground"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                      <span>{item.label}</span>
                      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="space-y-1 border-t border-border p-2">
            <Link
              href="/ajustes"
              onClick={() => setMobileMenuOpen(false)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Settings className="h-4 w-4" />
              <span>Ajustes</span>
            </Link>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <ul className="grid grid-cols-5">
          {primaryMobileItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-16 w-full flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Menu className="h-4 w-4" />
              <span>Menú</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
