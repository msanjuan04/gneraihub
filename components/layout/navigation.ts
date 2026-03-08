import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  ClipboardList,
  FileText,
  FolderKanban,
  Key,
  LayoutDashboard,
  Percent,
  Receipt,
  TrendingUp,
  Users,
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
    href: "/ingresos",
    label: "Ingresos",
    icon: HandCoins,
  },
  {
    href: "/desgloses",
    label: "Desgloses",
    icon: Percent,
  },
  {
    href: "/accesos",
    label: "Accesos",
    icon: Key,
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

export const MOBILE_PRIMARY_NAV_PATHS = ["/", "/gastos", "/facturas", "/ingresos"];

export const DASHBOARD_PAGE_INFO: Record<string, { title: string; description: string }> = {
  "/": { title: "Dashboard", description: "Resumen financiero y operativo" },
  "/gastos": { title: "Gastos", description: "Gestión de gastos recurrentes y variables" },
  "/proyectos": { title: "Proyectos", description: "Proyectos activos y su rentabilidad" },
  "/clientes": { title: "Clientes", description: "Base de clientes y su historial" },
  "/facturas": { title: "Facturas", description: "Facturación y cobros pendientes" },
  "/presupuestos": {
    title: "Presupuestos",
    description: "Propuestas comerciales y conversión a factura",
  },
  "/ingresos": { title: "Ingresos", description: "Histórico de ingresos de factura y manuales" },
  "/desgloses": { title: "Desgloses", description: "A qué subcuenta va cada ingreso (gastos fijos, beneficio, marketing, imprevistos)" },
  "/accesos": { title: "Accesos", description: "Correos y contraseñas por sitio, con nota de para qué sirve cada uno" },
  "/calendario": { title: "Calendario", description: "Vista unificada de cobros y pagos" },
  "/cashflow": { title: "Cashflow", description: "Flujo de caja previsto vs real" },
  "/ajustes": { title: "Ajustes", description: "Configuración general de la aplicación" },
};
