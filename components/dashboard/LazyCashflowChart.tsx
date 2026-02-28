"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CashflowMonth } from "@/types";

const CashflowChart = dynamic(
  () => import("@/components/dashboard/CashflowChart").then((mod) => mod.CashflowChart),
  {
    ssr: false,
    loading: () => (
      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[260px] w-full" />
        </CardContent>
      </Card>
    ),
  }
);

interface LazyCashflowChartProps {
  data: CashflowMonth[];
}

export function LazyCashflowChart({ data }: LazyCashflowChartProps) {
  return <CashflowChart data={data} />;
}
