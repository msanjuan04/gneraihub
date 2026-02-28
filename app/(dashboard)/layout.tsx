import { DashboardShell } from "@/components/layout/DashboardShell";

/**
 * Layout del dashboard — sidebar fijo + área de contenido con header.
 * Todas las rutas del dashboard comparten este layout.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
