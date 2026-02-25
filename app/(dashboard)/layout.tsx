import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

/**
 * Layout del dashboard — sidebar fijo + área de contenido con header.
 * Todas las rutas del dashboard comparten este layout.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar fijo */}
      <Sidebar />

      {/* Área principal con offset del sidebar */}
      <div className="pl-60">
        {/* Header sticky */}
        <Header />

        {/* Contenido de la página */}
        <main className="p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
