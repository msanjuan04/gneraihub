import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";
import { planMrr } from "@/lib/utils/saas";
import { PlusCircle, FolderKanban, ExternalLink, Zap } from "lucide-react";
import type { SaasPlan } from "@/types";
import { DeleteProjectButton } from "@/components/proyectos/DeleteProjectButton";

const statusConfig = {
  active: { label: "Activo", variant: "success" as const },
  paused: { label: "Pausado", variant: "warning" as const },
  completed: { label: "Completado", variant: "info" as const },
  cancelled: { label: "Cancelado", variant: "error" as const },
};

export default async function ProyectosPage() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id,name,status,type,budget,currency,start_date,end_date,is_saas,client:clients(name)")
    .order("created_at", { ascending: false });
  const projectRows = (projects ?? []) as any[];

  const projectIds = projectRows.map((p) => p.id);

  const [incomeResult, subsResult] = await Promise.all([
    projectIds.length > 0
      ? supabase.from("income_transactions").select("project_id, amount").in("project_id", projectIds)
      : Promise.resolve({ data: [] }),
    projectIds.length > 0
      ? supabase
          .from("saas_subscriptions")
          .select("project_id, status, is_free, plan:saas_plans(billing_type, fee, setup_fee, currency)")
          .in("project_id", projectIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Agrupar ingresos por proyecto
  const incomeRows = ((incomeResult as any).data ?? []) as Array<{ project_id: string | null; amount: number }>;
  const incomeByProject = incomeRows.reduce(
    (acc: Record<string, number>, t) => {
      if (t.project_id) acc[t.project_id] = (acc[t.project_id] ?? 0) + t.amount;
      return acc;
    },
    {}
  );

  // Agrupar suscripciones por proyecto — MRR normalizado a mensual
  const subsRows = ((subsResult as any).data ?? []) as any[];
  const subsByProject = subsRows.reduce((acc: Record<string, { active: number; mrr: number; currency: string }>, s: any) => {
    if (!acc[s.project_id]) acc[s.project_id] = { active: 0, mrr: 0, currency: "EUR" };
    if (s.status === "active") {
      acc[s.project_id].active += 1;
      // Calcular MRR según billing_type del plan
      if (!s.is_free && s.plan) acc[s.project_id].mrr += planMrr(s.plan as SaasPlan);
      if (s.plan?.currency) acc[s.project_id].currency = s.plan.currency;
    }
    return acc;
  }, {});

  const activeProjects = projectRows.filter((p) => p.status === "active");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {activeProjects.length} proyecto{activeProjects.length !== 1 ? "s" : ""} activo{activeProjects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="gnerai" size="sm" className="w-full sm:w-auto" asChild>
          <Link href="/proyectos/nuevo">
            <PlusCircle className="h-4 w-4" />
            Nuevo proyecto
          </Link>
        </Button>
      </div>

      {/* Grid de proyectos */}
      {projectRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-lg">
          <FolderKanban className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-sm font-medium text-muted-foreground mb-1">
            No hay proyectos todavía
          </p>
          <p className="text-xs text-muted-foreground/60 mb-4">
            Crea tu primer proyecto para empezar a gestionar tu cartera
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/proyectos/nuevo">
              <PlusCircle className="h-4 w-4 mr-2" />
              Crear primer proyecto
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projectRows.map((project) => {
            const realIncome = incomeByProject[project.id] ?? 0;
            const budget = project.budget ?? 0;
            const progress = budget > 0 ? (realIncome / budget) * 100 : 0;
            const statusConf = statusConfig[project.status as keyof typeof statusConfig];
            const saasInfo = subsByProject[project.id];

            return (
              <Card
                key={project.id}
                className="hover:border-primary/40 transition-colors group"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <CardTitle className="text-base truncate">
                          {project.name}
                        </CardTitle>
                        {project.is_saas && (
                          <Zap className="h-3.5 w-3.5 shrink-0 text-primary" />
                        )}
                      </div>
                      {project.client?.name && !project.is_saas && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {project.client.name}
                        </p>
                      )}
                      {project.is_saas && saasInfo && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {saasInfo.active} suscriptor{saasInfo.active !== 1 ? "es" : ""}
                          {saasInfo.mrr > 0 && (
                            <> · <span className="text-income">{formatCurrency(saasInfo.mrr, saasInfo.currency as any)}/mes</span></>
                          )}
                        </p>
                      )}
                    </div>
                    <Badge variant={statusConf?.variant ?? "outline"}>
                      {statusConf?.label ?? project.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Tipo de proyecto */}
                  {project.type && (
                    <Badge variant="outline" className="text-xs font-normal capitalize">
                      {project.type}
                    </Badge>
                  )}

                  {/* Progreso presupuesto — solo proyectos no-SaaS */}
                  {!project.is_saas && budget > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Ingresos reales</span>
                        <span>
                          {formatCurrency(realIncome, project.currency)} / {formatCurrency(budget, project.currency)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Fechas */}
                  {project.start_date && (
                    <p className="text-xs text-muted-foreground">
                      {formatDate(project.start_date)}
                      {project.end_date && ` → ${formatDate(project.end_date)}`}
                    </p>
                  )}

                  {/* Acción */}
                  <div className="flex items-center justify-between pt-1">
                    <Link
                      href={`/proyectos/${project.id}`}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Ver detalle <ExternalLink className="h-3 w-3" />
                    </Link>
                    <DeleteProjectButton projectId={project.id} compact />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
