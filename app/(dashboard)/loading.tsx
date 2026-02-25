import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6 space-y-3">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardContent className="pt-6 space-y-3">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-4/5" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-3.5 w-14" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
