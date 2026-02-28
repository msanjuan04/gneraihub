"use client";

import { usePathname } from "next/navigation";
import { Bell, Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DASHBOARD_PAGE_INFO } from "@/components/layout/navigation";
function getPageInfo(pathname: string) {
  // Primero buscar coincidencia exacta
  if (DASHBOARD_PAGE_INFO[pathname]) return DASHBOARD_PAGE_INFO[pathname];

  // Luego buscar por prefijo
  const match = Object.entries(DASHBOARD_PAGE_INFO).find(
    ([route]) => route !== "/" && pathname.startsWith(route)
  );

  return match ? match[1] : { title: "GneraiHub", description: "" };
}

interface HeaderProps {
  onOpenMobileMenu?: () => void;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const pageInfo = getPageInfo(pathname);
  
  const handleNotificationsClick = () => {
    toast.message("No hay notificaciones pendientes");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/95 backdrop-blur-sm px-4 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {onOpenMobileMenu && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 lg:hidden"
            onClick={onOpenMobileMenu}
          >
            <Menu className="h-4 w-4" />
            <span className="sr-only">Abrir menú</span>
          </Button>
        )}

        {/* Título de la página */}
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-foreground truncate">
            {pageInfo.title}
          </h1>
          {pageInfo.description && (
            <p className="text-xs text-muted-foreground truncate hidden sm:block">
              {pageInfo.description}
            </p>
          )}
        </div>
      </div>

      {/* Acciones del header */}
      <div className="flex items-center gap-2">
        {/* Indicador de fecha actual */}
        <div className="hidden md:flex items-center text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-1.5">
          {new Date().toLocaleDateString("es-ES", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </div>

        {/* Toggle de tema */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Cambiar tema</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="mr-2 h-4 w-4" />
              Claro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="mr-2 h-4 w-4" />
              Oscuro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              Sistema
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notificaciones */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 relative"
          onClick={handleNotificationsClick}
        >
          <Bell className="h-4 w-4" />
          {/* Badge de notificaciones */}
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
          <span className="sr-only">Notificaciones</span>
        </Button>
      </div>
    </header>
  );
}
