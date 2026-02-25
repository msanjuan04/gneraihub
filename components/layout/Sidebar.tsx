"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  FolderKanban,
  Users,
  FileText,
  Calendar,
  TrendingUp,
  Settings,
  LogOut,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

// Definición de la navegación principal
const navItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/gastos",
    label: "Gastos",
    icon: Receipt,
  },
  {
    href: "/proyectos",
    label: "Proyectos",
    icon: FolderKanban,
  },
  {
    href: "/clientes",
    label: "Clientes",
    icon: Users,
  },
  {
    href: "/facturas",
    label: "Facturas",
    icon: FileText,
  },
  {
    href: "/calendario",
    label: "Calendario",
    icon: Calendar,
  },
  {
    href: "/cashflow",
    label: "Cashflow",
    icon: TrendingUp,
  },
];

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-border/70 bg-card/85 backdrop-blur-xl flex flex-col transition-all duration-200",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo / Marca */}
        <div className="flex h-16 items-center border-b border-border px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl gnerai-gradient shadow-lg shadow-blue-500/35">
              <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-bold gnerai-gradient-text">GneraiHub</span>
                <span className="text-[10px] text-muted-foreground">Control Operativo</span>
              </div>
            )}
          </div>
        </div>

        {/* Navegación principal */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.href, item.exact);
              const Icon = item.icon;

              const linkContent = (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150",
                    "hover:bg-accent hover:text-accent-foreground",
                    active
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  {!collapsed && <span>{item.label}</span>}
                  {/* Indicador de activo */}
                  {active && !collapsed && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </Link>
              );

              return (
                <li key={item.href}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    linkContent
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer del sidebar */}
        <div className="border-t border-border p-2 space-y-1">
          {collapsed ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/ajustes"
                    className="flex w-full items-center justify-center rounded-md px-2 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Ajustes</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center justify-center rounded-md px-2 py-2.5 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Cerrar sesión</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Link
                href="/ajustes"
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span>Ajustes</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar sesión</span>
              </button>
            </>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
