import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Calendar,
  ClipboardList,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
  HandCoins,
} from "lucide-react";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
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
    href: "/proveedores",
    label: "Proveedores",
    icon: Building2,
  },
  {
    href: "/facturas",
    label: "Facturas",
    icon: FileText,
  },
  {
    href: "/presupuestos",
    label: "Presupuestos",
    icon: ClipboardList,
  },
  {
    href: "/pagos",
    label: "Pagos",
    icon: Wallet,
  },
  {
    href: "/ingresos",
    label: "Ingresos",
    icon: HandCoins,
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

export const MOBILE_PRIMARY_NAV_PATHS = ["/", "/gastos", "/facturas", "/pagos"];

export const DASHBOARD_PAGE_INFO: Record<string, { title: string; description: string }> = {
  "/": { title: "Dashboard", description: "Resumen financiero y operativo" },
  "/gastos": { title: "Gastos", description: "Gestión de gastos recurrentes y variables" },
  "/proyectos": { title: "Proyectos", description: "Proyectos activos y su rentabilidad" },
  "/clientes": { title: "Clientes", description: "Base de clientes y su historial" },
  "/proveedores": { title: "Proveedores", description: "Gestión de proveedores y gastos asociados" },
  "/facturas": { title: "Facturas", description: "Facturación y cobros pendientes" },
  "/presupuestos": {
    title: "Presupuestos",
    description: "Propuestas comerciales y conversión a factura",
  },
  "/pagos": { title: "Pagos", description: "Cobros realizados y próximos vencimientos" },
  "/ingresos": { title: "Ingresos", description: "Histórico de ingresos de factura y manuales" },
  "/calendario": { title: "Calendario", description: "Vista unificada de cobros y pagos" },
  "/cashflow": { title: "Cashflow", description: "Flujo de caja previsto vs real" },
  "/ajustes": { title: "Ajustes", description: "Configuración general de la aplicación" },
};
